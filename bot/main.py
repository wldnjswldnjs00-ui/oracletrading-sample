"""
OracleTrading HFT Bot - 메인 진입점
바이낸스 라텐시 아비트라지 × 폴리마켓 단기 예측 계약

실행 방법:
  페이퍼 트레이딩: python main.py
  실거래:         python main.py --live   (CLOB API 키 필요)

[페이퍼 트레이딩 원리]
  - 실폴리마켓 계약이 있으면 그것을 사용 (REAL 거래)
  - 없으면 실제 바이낸스 가격 기반 시뮬레이션 계약 사용 (SIM 거래)
  - 실제 주문은 절대 발생하지 않음
  - SIM 거래도 실바이낸스 가격 + 2.7초 지연 오즈 모델 → 전략 검증에 유효
"""
import asyncio
import logging
import sys
import time
import argparse
from datetime import datetime, timedelta

# 로그는 파일로만 (대시보드 화면 오염 방지)
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)-8s %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.FileHandler("bot.log", encoding="utf-8"),
    ]
)
logger = logging.getLogger(__name__)

import config
from feeds.binance_ws import BinanceFeed
from polymarket.api_client import PolymarketClient
from polymarket.market_scanner import MarketScanner
from polymarket.simulated_contracts import SimulatedMarketScanner
from strategy.signal_engine import SignalEngine
from execution.paper_engine import PaperEngine
from risk.risk_manager import RiskManager, BotState
from utils.database import TradeDB
from utils.dashboard import Dashboard


class HFTBot:
    """
    라텐시 아비트라지 고빈도 매매 봇

    우선순위:
      1. 실폴리마켓 계약 (유동성 충분한 경우)
      2. 시뮬레이션 계약 (실계약 없을 때 → 실바이낸스 가격 기반)

    페이퍼 트레이딩 = 실제 주문 없음, 전략 검증 목적
    """

    def __init__(self, live_mode: bool = False):
        self.live_mode = live_mode
        mode_str = "LIVE" if live_mode else "PAPER"

        logger.info(f"[Bot] OracleTrading HFT Bot 초기화 ({mode_str} 모드)")

        # 컴포넌트 초기화
        self.poly_client   = PolymarketClient()
        self.scanner       = MarketScanner(self.poly_client)   # 실폴리마켓
        self.sim_scanner   = SimulatedMarketScanner()           # 시뮬레이션 (폴백)
        self.sim_scanner.enable()
        self.signal_engine = SignalEngine()
        self.db            = TradeDB()
        restored_capital   = self._restore_capital()
        self.paper_engine  = PaperEngine(restored_capital)
        self.risk_manager  = RiskManager(on_halt=self._on_halt)
        self.dashboard     = Dashboard(mode=mode_str)

        # 가격 정보 (대시보드 표시용)
        self._price_info: dict = {sym: 0 for sym in config.TARGET_SYMBOLS}
        for sym in config.TARGET_SYMBOLS:
            self._price_info[f"{sym}_chg"] = 0

        # 통계
        self._start_time = time.time()
        self._signals_generated = 0
        self._real_trades = 0   # 실폴리마켓 거래 수
        self._sim_trades  = 0   # 시뮬레이션 거래 수

        # 일별 리셋 스케줄
        self._next_daily_reset = self._calc_next_midnight()

    def _restore_capital(self) -> float:
        """DB에서 마지막 자본 복원 (재시작 시 자본 유지)"""
        try:
            recent = self.db.get_recent_trades(1)
            if recent and recent[0].get("capital_after"):
                capital = float(recent[0]["capital_after"])
                if capital > 0:
                    logger.info(f"[Bot] 자본 복원: ${capital:.2f}")
                    return capital
        except Exception:
            pass
        return config.INITIAL_SEED

    # ─────────────────────────────────────────
    # 메인 실행
    # ─────────────────────────────────────────
    async def run(self):
        logger.info("[Bot] 봇 시작")
        async with self.poly_client:
            await asyncio.gather(
                self._price_feed_loop(),
                self._scanner_loop(),
                self._dashboard_loop(),
                self._daily_reset_loop(),
                self._db_save_loop(),
            )

    async def _price_feed_loop(self):
        feed = BinanceFeed(on_price_update=self._on_price_update)
        await feed.start()

    async def _scanner_loop(self):
        await self.scanner.start()

    # ─────────────────────────────────────────
    # 핵심: 가격 업데이트 → 신호 생성 → 진입
    # ─────────────────────────────────────────
    async def _on_price_update(
        self,
        symbol: str,
        price: float,
        change_pct: float,
        timestamp: float,
    ):
        # 대시보드용 가격 업데이트
        self._price_info[symbol] = price
        self._price_info[f"{symbol}_chg"] = change_pct

        # 시뮬레이터에 실시간 가격 전달 (오즈 계산에 사용)
        self.sim_scanner.update_price(symbol, price, timestamp)

        # 리스크 체크
        can_trade, reason = self.risk_manager.can_trade()
        if not can_trade:
            return

        # 가용 자본 체크
        if self.paper_engine.available_capital < 1.0:
            return

        direction = "UP" if change_pct >= 0 else "DOWN"

        # ① 실폴리마켓 계약 우선 시도
        contract = self.scanner.get_best_contract(symbol, direction)
        is_sim = False

        # ② 실계약 없거나 유동성 부족 → 시뮬레이션 계약으로 폴백
        if not contract or contract.liquidity_usd < config.MIN_MARKET_LIQUIDITY_USD:
            contract = self.sim_scanner.get_best_contract(symbol, direction)
            is_sim = True

        if not contract:
            return

        # 신호 생성
        signal = self.signal_engine.generate_signal(
            symbol=symbol,
            price_change_pct=change_pct,
            contract=contract,
            timestamp=timestamp,
        )
        if signal is None:
            return

        self._signals_generated += 1

        # 페이퍼 트레이딩 진입
        position = await self.paper_engine.enter_position(signal)
        if position:
            if is_sim:
                self._sim_trades += 1
            else:
                self._real_trades += 1

            mode_tag = "SIM" if is_sim else "REAL"
            self.db.save_trade({
                "trade_id":       position.trade_id,
                "symbol":         position.symbol,
                "direction":      position.direction,
                "entry_odds":     position.entry_odds,
                "exit_odds":      None,
                "size_usd":       position.size_usd,
                "pnl":            None,
                "pnl_pct":        None,
                "hold_sec":       None,
                "exit_reason":    None,
                "status":         "OPEN",
                "entry_time":     position.entry_time,
                "exit_time":      None,
                "gap_pct_points": signal.gap_pct_points,
                "implied_prob":   signal.implied_prob,
                "capital_after":  self.paper_engine.capital,
                "mode":           mode_tag,
            })

    # ─────────────────────────────────────────
    # 대시보드 루프
    # ─────────────────────────────────────────
    async def _dashboard_loop(self):
        from rich.live import Live
        from rich.console import Console

        console = Console()
        layout = self.dashboard._make_layout()

        with Live(layout, console=console, refresh_per_second=1, screen=True, auto_refresh=True) as live:
            while True:
                try:
                    recent = self.db.get_recent_trades(12)
                    real_summary = self.scanner.summary()
                    sim_summary  = self.sim_scanner.summary()
                    scanner_summary = (
                        f"REAL: {real_summary} | "
                        f"SIM: {sim_summary} | "
                        f"누적: REAL {self._real_trades}회 / SIM {self._sim_trades}회"
                    )
                    engine_stats = self.paper_engine.get_stats()
                    db_stats = self.db.get_total_stats()
                    if db_stats and db_stats.get("total_trades", 0) > 0:
                        engine_stats["total_trades"] = db_stats["total_trades"]
                        engine_stats["win_rate"]     = db_stats["win_rate"]
                        engine_stats["total_pnl"]    = db_stats.get("total_pnl") or 0
                    self.dashboard.update(
                        layout=layout,
                        engine_stats=engine_stats,
                        risk_stats=self.risk_manager.get_stats(),
                        recent_trades=recent,
                        scanner_summary=scanner_summary,
                        price_info=self._price_info,
                    )
                except Exception as e:
                    logger.warning(f"[Dashboard] 갱신 오류: {e}")
                await asyncio.sleep(1)

    # ─────────────────────────────────────────
    # DB 저장 루프 (청산된 포지션 업데이트)
    # ─────────────────────────────────────────
    async def _db_save_loop(self):
        _reported_ids: set = set()
        while True:
            await asyncio.sleep(5)
            try:
                for pos in self.paper_engine.closed_positions[-50:]:
                    if pos.status.value == "CLOSED" and pos.pnl != 0:
                        # mode 결정: market_id에 SIM_ 접두사 있으면 SIM
                        is_sim = pos.contract.market_id.startswith("SIM_")
                        self.db.save_trade({
                            "trade_id":       pos.trade_id,
                            "symbol":         pos.symbol,
                            "direction":      pos.direction,
                            "entry_odds":     pos.entry_odds,
                            "exit_odds":      pos.exit_odds,
                            "size_usd":       pos.size_usd,
                            "pnl":            pos.pnl,
                            "pnl_pct":        pos.pnl / pos.size_usd * 100 if pos.size_usd else 0,
                            "hold_sec":       pos.hold_duration,
                            "exit_reason":    pos.exit_reason,
                            "status":         "CLOSED",
                            "entry_time":     pos.entry_time,
                            "exit_time":      pos.exit_time,
                            "gap_pct_points": None,
                            "implied_prob":   None,
                            "capital_after":  self.paper_engine.total_equity,
                            "mode":           "SIM" if is_sim else "REAL",
                        })
                        if pos.trade_id not in _reported_ids:
                            _reported_ids.add(pos.trade_id)
                            self.risk_manager.report_trade(
                                pnl=pos.pnl,
                                capital=self.paper_engine.total_equity,
                            )
            except Exception as e:
                logger.debug(f"[DB] 저장 오류: {e}")

    # ─────────────────────────────────────────
    # 일별 리셋
    # ─────────────────────────────────────────
    async def _daily_reset_loop(self):
        while True:
            now = time.time()
            if now >= self._next_daily_reset:
                capital = self.paper_engine.capital
                stats = self.paper_engine.get_stats()
                self.db.save_daily_stats({
                    "trades":        stats["total_trades"],
                    "wins":          self.paper_engine.winning_trades,
                    "losses":        stats["total_trades"] - self.paper_engine.winning_trades,
                    "win_rate":      stats["win_rate"],
                    "total_pnl":     stats["daily_pnl"],
                    "start_capital": self.paper_engine.daily_start_capital,
                    "end_capital":   capital,
                    "return_pct":    stats["daily_return_pct"],
                    "mode":          "PAPER",
                })
                self.paper_engine.reset_daily_stats()
                self.risk_manager.reset_daily(capital)
                self._next_daily_reset = self._calc_next_midnight()
                logger.info(f"[Bot] 일별 리셋 | 자본: ${capital:.2f}")
            await asyncio.sleep(60)

    def _calc_next_midnight(self) -> float:
        tomorrow = datetime.now().replace(
            hour=0, minute=0, second=0, microsecond=0
        ) + timedelta(days=1)
        return tomorrow.timestamp()

    async def _on_halt(self):
        logger.critical("[Bot] 거래 중단 - 모든 포지션 청산 시도")
        for trade_id, pos in list(self.paper_engine.open_positions.items()):
            current_odds = pos.contract.target_odds(pos.direction)
            await self.paper_engine._close_position(pos, current_odds, "EMERGENCY_HALT")


# ─────────────────────────────────────────
# 실행 진입점
# ─────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="OracleTrading HFT Bot")
    parser.add_argument("--live", action="store_true", help="실거래 모드")
    args = parser.parse_args()

    if args.live:
        if not config.POLYMARKET_API_KEY or not config.POLYGON_PRIVATE_KEY:
            print("실거래 모드: .env 파일에 POLYMARKET_API_KEY와 POLYGON_PRIVATE_KEY가 필요합니다.")
            sys.exit(1)
        print("실거래 모드로 시작합니다. 실제 자금이 사용됩니다!")
        confirm = input("계속하려면 'YES'를 입력하세요: ")
        if confirm != "YES":
            sys.exit(0)
        config.PAPER_TRADING = False

    bot = HFTBot(live_mode=args.live)
    try:
        asyncio.run(bot.run())
    except KeyboardInterrupt:
        logger.info("[Bot] 사용자 종료 (Ctrl+C)")
    except Exception as e:
        logger.critical(f"[Bot] 치명적 오류: {e}", exc_info=True)
    finally:
        logger.info(
            f"[Bot] 종료 | 총 거래: {bot.paper_engine.total_trades}회 | "
            f"최종 자본: ${bot.paper_engine.capital:.2f}"
        )


if __name__ == "__main__":
    main()

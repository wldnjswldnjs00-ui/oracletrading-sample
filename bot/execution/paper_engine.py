"""
페이퍼 트레이딩 엔진
실제 자금 없이 전략을 실시간 시장 데이터로 시뮬레이션

핵심 로직:
- 풀시드 투입 ($5,000 미만 구간)
- 유동성 체크 → 0.5초 내 체결 가능 여부 판단
- 오즈 수렴 시 즉시 청산 (2~10초 내)
- 수렴 없을 시 강제 청산 (MAX_HOLD_TIME_SEC)
"""
import asyncio
import time
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import config
from strategy.signal_engine import TradeSignal
from polymarket.market_scanner import MarketContract

logger = logging.getLogger(__name__)


class PositionStatus(Enum):
    OPEN   = "OPEN"
    CLOSED = "CLOSED"


@dataclass
class Position:
    """보유 포지션"""
    trade_id: str
    symbol: str
    direction: str            # UP or DOWN
    entry_odds: float         # 진입 시 오즈
    size_usd: float           # 투입 금액 ($)
    shares: float             # 매수한 계약 수량 (size_usd / entry_odds)
    entry_time: float
    contract: MarketContract
    status: PositionStatus = PositionStatus.OPEN

    # 청산 시 채워지는 필드
    exit_odds: float = 0.0
    exit_time: float = 0.0
    pnl: float = 0.0          # 손익 ($)
    exit_reason: str = ""     # "CONVERGENCE" / "TIMEOUT" / "STOP_LOSS" / "RESOLUTION"

    @property
    def hold_duration(self) -> float:
        if self.status == PositionStatus.CLOSED:
            return self.exit_time - self.entry_time
        return time.time() - self.entry_time

    @property
    def unrealized_pnl(self) -> float:
        """현재 미실현 손익 (오즈 변동 기준)"""
        current_odds = self.contract.target_odds(self.direction)
        if current_odds <= 0:
            return 0.0
        # 오즈 상승 = 수익 (오즈가 올라간다 = 더 비싸졌다 = 내가 산 게 가치상승)
        odds_change = current_odds - self.entry_odds
        return self.shares * odds_change

    @property
    def unrealized_pnl_pct(self) -> float:
        if self.size_usd == 0:
            return 0.0
        return self.unrealized_pnl / self.size_usd * 100


class PaperEngine:
    """
    페이퍼 트레이딩 엔진

    자본 흐름:
    초기 $100 → 신호 발생 → 풀시드 진입 → 오즈 수렴 → 청산 → 복리 재투입
    """

    def __init__(self, initial_capital: float = config.INITIAL_SEED):
        self.capital = initial_capital        # 현재 가용 자본
        self.initial_capital = initial_capital
        self.peak_capital = initial_capital   # 최고 자본 (드로다운 계산용)

        self.open_positions: Dict[str, Position] = {}   # trade_id → Position
        self.closed_positions: List[Position] = []

        self._trade_counter = 0
        self._locked_capital = 0.0   # 현재 포지션에 묶인 자본
        self._active_symbols: set = set()  # 현재 포지션 있는 심볼 (중복 방지)

        # 통계
        self.total_trades = 0
        self.winning_trades = 0
        self.total_pnl = 0.0
        self.daily_pnl = 0.0
        self.daily_start_capital = initial_capital
        self._day_start_ts = time.time()

    # ─────────────────────────────────────────
    # 자본 계산
    # ─────────────────────────────────────────
    @property
    def available_capital(self) -> float:
        return max(0.0, self.capital - self._locked_capital)

    @property
    def total_equity(self) -> float:
        """총 자산 = 가용 자본 + 포지션 잠금 자본 + 미실현 손익"""
        unrealized = sum(p.unrealized_pnl for p in self.open_positions.values())
        return self.capital + self._locked_capital + unrealized

    def _calculate_position_size(self, contract: MarketContract) -> float:
        """
        포지션 사이즈 결정 (멀티-심볼 분할 운용)

        총 자산을 MAX_OPEN_POSITIONS 슬롯으로 분할
        각 심볼당 1개 포지션 = 최대 동시 10개 운용
        """
        # 이미 해당 심볼에 포지션 있으면 진입 불가
        if contract.symbol in self._active_symbols:
            return 0.0

        available = self.available_capital
        if available <= 0:
            return 0.0

        # 슬롯 크기 = 총 자산 / 최대 포지션 수
        num_slots = max(1, config.MAX_OPEN_POSITIONS)
        slot_size = self.total_equity / num_slots

        # 가용 자본 초과 불가
        size = min(slot_size, available)

        # 유동성 체크: 계약 유동성의 30% 초과 불가
        if size > contract.liquidity_usd * 0.30:
            size = contract.liquidity_usd * 0.30
            logger.debug(f"[Paper] 유동성 부족으로 사이즈 축소: ${size:.2f}")

        return round(size, 2)

    def _check_liquidity_ok(self, size: float, contract: MarketContract) -> bool:
        """
        유동성 양호 여부 판단
        페이퍼 트레이딩: 체결 시뮬레이션 (실제로는 오더북 깊이로 판단)
        """
        # 투입 금액이 유동성의 30% 이내이면 "즉시 체결 가능" 간주
        return size <= contract.liquidity_usd * 0.30

    # ─────────────────────────────────────────
    # 진입
    # ─────────────────────────────────────────
    async def enter_position(self, signal: TradeSignal) -> Optional[Position]:
        """
        신호를 받아 포지션 진입

        반환: 생성된 Position 또는 None (진입 불가 시)
        """
        contract = signal.contract
        size = self._calculate_position_size(contract)

        if size < 1.0:
            logger.debug(f"[Paper] 진입 불가: 가용 자본 부족 (${size:.2f})")
            return None

        # 유동성 체크
        if not self._check_liquidity_ok(size, contract):
            logger.warning(f"[Paper] 진입 불가: 유동성 미흡")
            return None

        # 진입 오즈 (현재 폴리마켓 오즈)
        entry_odds = contract.target_odds(signal.direction)
        if entry_odds <= 0:
            return None

        # 계약 수량 계산 (1달러 = 1/odds 계약)
        shares = size / entry_odds

        # 포지션 생성
        self._trade_counter += 1
        trade_id = f"T{self._trade_counter:06d}"

        position = Position(
            trade_id=trade_id,
            symbol=signal.symbol,
            direction=signal.direction,
            entry_odds=entry_odds,
            size_usd=size,
            shares=shares,
            entry_time=time.time(),
            contract=contract,
        )

        # 자본 잠금 + 심볼 슬롯 점유
        self._locked_capital += size
        self.capital -= size
        self._active_symbols.add(signal.symbol)
        self.open_positions[trade_id] = position

        logger.info(
            f"[Paper] ▶ 진입 [{trade_id}] {signal.symbol} {signal.direction} | "
            f"${size:.2f} @ {entry_odds:.3f} | "
            f"잔여자본: ${self.available_capital:.2f}"
        )

        # 포지션 모니터링 태스크 시작
        asyncio.create_task(self._monitor_position(position))

        return position

    # ─────────────────────────────────────────
    # 포지션 모니터링 및 청산
    # ─────────────────────────────────────────
    async def _monitor_position(self, position: Position):
        """
        포지션 실시간 모니터링
        매 0.1초마다 오즈 확인 → 청산 조건 충족 시 즉시 청산
        """
        entry_odds = position.entry_odds
        check_interval = 0.1  # 100ms 주기 확인

        while position.status == PositionStatus.OPEN:
            await asyncio.sleep(check_interval)

            contract = position.contract
            current_odds = contract.target_odds(position.direction)

            if current_odds <= 0:
                continue

            hold_time = time.time() - position.entry_time

            # ① 오즈 수렴 청산 (오즈가 올라갔다 = 수익)
            odds_change = current_odds - entry_odds
            if odds_change >= config.ODDS_CONVERGENCE_PCT:
                await self._close_position(
                    position, current_odds, reason="CONVERGENCE"
                )
                break

            # ② 손절 (오즈가 반대로 벌어졌다 = 손실)
            if odds_change <= -config.STOP_LOSS_PCT:
                await self._close_position(
                    position, current_odds, reason="STOP_LOSS"
                )
                break

            # ③ 타임아웃 강제 청산
            if hold_time >= config.MAX_HOLD_TIME_SEC:
                await self._close_position(
                    position, current_odds, reason="TIMEOUT"
                )
                break

            # ④ 계약 만기 (폴리마켓 해결)
            if not contract.is_active:
                # 만기 시 YES = 1.0, NO = 0.0 으로 해결
                resolution_odds = 1.0 if position.direction == "UP" else 0.0
                await self._close_position(
                    position, resolution_odds, reason="RESOLUTION"
                )
                break

    async def _close_position(
        self,
        position: Position,
        exit_odds: float,
        reason: str,
    ):
        """포지션 청산"""
        if position.status == PositionStatus.CLOSED:
            return

        position.status = PositionStatus.CLOSED
        position.exit_odds = exit_odds
        position.exit_time = time.time()
        position.exit_reason = reason

        # 손익 계산
        # 청산 시 받는 금액 = 보유 계약 수 × 청산 오즈
        proceeds = position.shares * exit_odds
        pnl = proceeds - position.size_usd
        position.pnl = pnl

        # 자본 반환
        self._locked_capital -= position.size_usd
        self.capital += proceeds   # 원금 + 손익
        self.peak_capital = max(self.peak_capital, self.capital)

        # 통계 업데이트
        self.total_trades += 1
        if pnl > 0:
            self.winning_trades += 1
        self.total_pnl += pnl
        self.daily_pnl += pnl

        # 심볼 슬롯 해제 + 이동
        self._active_symbols.discard(position.symbol)
        if position.trade_id in self.open_positions:
            del self.open_positions[position.trade_id]
        self.closed_positions.append(position)
        if len(self.closed_positions) > 10000:
            self.closed_positions = self.closed_positions[-5000:]

        pnl_sign = "+" if pnl >= 0 else ""
        logger.info(
            f"[Paper] ◀ 청산 [{position.trade_id}] {reason} | "
            f"{position.symbol} {position.direction} | "
            f"손익: {pnl_sign}${pnl:.4f} ({pnl_sign}{pnl/position.size_usd*100:.2f}%) | "
            f"보유: {position.hold_duration:.1f}초 | "
            f"자본: ${self.capital:.2f}"
        )

    # ─────────────────────────────────────────
    # 일별 리셋
    # ─────────────────────────────────────────
    def reset_daily_stats(self):
        self.daily_pnl = 0.0
        self.daily_start_capital = self.capital
        self._day_start_ts = time.time()

    # ─────────────────────────────────────────
    # 통계 조회
    # ─────────────────────────────────────────
    @property
    def win_rate(self) -> float:
        if self.total_trades == 0:
            return 0.0
        return self.winning_trades / self.total_trades

    @property
    def daily_return_pct(self) -> float:
        if self.daily_start_capital == 0:
            return 0.0
        return self.daily_pnl / self.daily_start_capital * 100

    @property
    def total_return_pct(self) -> float:
        return (self.capital - self.initial_capital) / self.initial_capital * 100

    @property
    def drawdown_pct(self) -> float:
        if self.peak_capital == 0:
            return 0.0
        return (self.peak_capital - self.capital) / self.peak_capital * 100

    def get_stats(self) -> dict:
        return {
            "capital": self.capital,
            "initial_capital": self.initial_capital,
            "total_equity": self.total_equity,
            "available": self.available_capital,
            "locked": self._locked_capital,
            "open_positions": len(self.open_positions),
            "total_trades": self.total_trades,
            "win_rate": self.win_rate,
            "total_pnl": self.total_pnl,
            "total_return_pct": self.total_return_pct,
            "daily_pnl": self.daily_pnl,
            "daily_return_pct": self.daily_return_pct,
            "drawdown_pct": self.drawdown_pct,
        }

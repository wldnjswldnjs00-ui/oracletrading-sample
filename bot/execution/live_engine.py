"""
실거래 엔진 - Polymarket CLOB API 연동
py-clob-client를 사용한 실제 주문 실행

PaperEngine과 동일한 로직이지만 실제 CLOB 주문을 제출함
"""
import asyncio
import time
import logging
from typing import Optional

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import config
from execution.paper_engine import PaperEngine, Position, PositionStatus
from strategy.signal_engine import TradeSignal

logger = logging.getLogger(__name__)


def _build_clob_client():
    """CLOB 클라이언트 초기화"""
    try:
        from py_clob_client.client import ClobClient
        from py_clob_client.clob_types import ApiCreds
        from py_clob_client.constants import POLYGON

        return ClobClient(
            host=config.POLYMARKET_CLOB_URL,
            chain_id=POLYGON,
            key=config.POLYGON_PRIVATE_KEY,
            creds=ApiCreds(
                api_key=config.POLYMARKET_API_KEY,
                api_secret=config.POLYMARKET_API_SECRET,
                api_passphrase=config.POLYMARKET_API_PASSPHRASE,
            ),
            signature_type=2,   # Gnosis Safe proxy wallet (Polymarket web)
        )
    except Exception as e:
        logger.error(f"[Live] CLOB 클라이언트 초기화 실패: {e}")
        raise


class LiveEngine(PaperEngine):
    """
    실거래 엔진

    PaperEngine을 상속 - 포지션 관리/통계/리스크 로직 재사용
    실제로 달라지는 것: 주문 진입/청산 시 CLOB API 호출
    """

    def __init__(self, initial_capital: float = config.INITIAL_SEED):
        super().__init__(initial_capital)
        self._clob = _build_clob_client()
        logger.info("[Live] 실거래 엔진 초기화 완료")

    # ─────────────────────────────────────────
    # CLOB 주문 (동기 → 비동기 래퍼)
    # ─────────────────────────────────────────
    async def _place_order(self, token_id: str, price: float, size: float, side: str) -> Optional[dict]:
        """
        CLOB 주문 제출 (FOK - Fill or Kill)
        체결 안 되면 즉시 취소됨 → 유동성 없으면 진입 포기
        """
        from py_clob_client.clob_types import OrderArgs, OrderType

        loop = asyncio.get_event_loop()

        def _submit():
            try:
                order_args = OrderArgs(
                    token_id=token_id,
                    price=round(price, 4),
                    size=round(size, 2),   # CLOB: maker amount 최대 2자리
                    side=side,
                )
                signed = self._clob.create_order(order_args)
                resp = self._clob.post_order(signed, OrderType.FOK)
                return resp
            except Exception as e:
                logger.error(f"[Live] 주문 오류: {e}")
                return None

        return await loop.run_in_executor(None, _submit)

    # ─────────────────────────────────────────
    # 진입 (실제 CLOB 매수)
    # ─────────────────────────────────────────
    async def enter_position(self, signal: TradeSignal) -> Optional[Position]:
        contract  = signal.contract
        size      = self._calculate_position_size(contract)

        if size < 1.0:
            logger.debug(f"[Live] 진입 불가: 자본 부족 (${size:.2f})")
            return None

        if not self._check_liquidity_ok(size, contract):
            logger.warning("[Live] 진입 불가: 유동성 미흡")
            return None

        # 실거래: mid 오즈(갭계산용) vs 실제 ASK 가격(주문용) 구분
        entry_odds  = contract.target_odds(signal.direction)        # mid (PnL 계산 기준)
        order_price = contract.target_entry_price(signal.direction)  # ASK (실제 BUY 주문가)
        if order_price <= 0:
            return None

        token_id = contract.target_token_id(signal.direction)
        shares   = size / order_price   # ASK 가격 기준 수량

        logger.info(
            f"[Live] 주문 제출: {signal.symbol} {signal.direction} | "
            f"토큰 {token_id[:10]}... | ${size:.2f} @ ask={order_price:.4f} (mid={entry_odds:.4f}) | "
            f"{shares:.2f}주"
        )

        # CLOB 매수 주문 (FOK) - ASK 가격으로 제출해야 체결됨
        resp = await self._place_order(
            token_id=token_id,
            price=order_price,
            size=shares,
            side="BUY",
        )

        if not resp:
            logger.warning("[Live] 주문 실패 - 응답 없음")
            return None

        order_id = resp.get("orderID") or resp.get("id") or ""
        status   = resp.get("status", "")

        logger.info(f"[Live] 주문 응답: {status} | ID: {order_id}")

        # FOK 미체결 처리
        if status not in ("matched", "delayed", "live"):
            logger.warning(f"[Live] 미체결 (status={status}) → 진입 포기")
            return None

        # 체결 확인 후 포지션 생성
        self._trade_counter += 1
        trade_id = f"L{self._trade_counter:06d}"

        position = Position(
            trade_id=trade_id,
            symbol=signal.symbol,
            direction=signal.direction,
            entry_odds=order_price,   # ASK 가격을 기준으로 PnL 계산
            size_usd=size,
            shares=shares,
            entry_time=time.time(),
            contract=contract,
        )

        # 자본 잠금
        self._locked_capital += size
        self.capital -= size
        self._active_symbols.add(signal.symbol)
        self.open_positions[trade_id] = position

        logger.info(
            f"[Live] ▶ 진입 [{trade_id}] {signal.symbol} {signal.direction} | "
            f"${size:.2f} @ {entry_odds:.4f} | "
            f"주문ID: {order_id[:16]}... | "
            f"잔여자본: ${self.available_capital:.2f}"
        )

        # 포지션 모니터링 (청산 조건 감시)
        asyncio.create_task(self._monitor_position_live(position))

        return position

    # ─────────────────────────────────────────
    # 포지션 모니터링 (실거래용)
    # ─────────────────────────────────────────
    async def _monitor_position_live(self, position: Position):
        """
        실거래 포지션 모니터링
        PaperEngine과 동일한 청산 조건 → 실제 SELL 주문 제출
        """
        entry_odds     = position.entry_odds
        check_interval = 0.1

        while position.status == PositionStatus.OPEN:
            await asyncio.sleep(check_interval)

            contract      = position.contract
            # 청산 시 BID 가격(실제 SELL 체결 가격)으로 모니터링
            current_odds  = contract.target_exit_price(position.direction)
            if current_odds <= 0:
                continue

            hold_time  = time.time() - position.entry_time
            odds_change = current_odds - entry_odds

            # ① 수렴 청산
            if odds_change >= config.ODDS_CONVERGENCE_PCT:
                await self._close_position_live(position, current_odds, "CONVERGENCE")
                break

            # ② 손절
            if odds_change <= -config.STOP_LOSS_PCT:
                await self._close_position_live(position, current_odds, "STOP_LOSS")
                break

            # ③ 타임아웃
            if hold_time >= config.MAX_HOLD_TIME_SEC:
                await self._close_position_live(position, current_odds, "TIMEOUT")
                break

            # ④ 계약 만기
            if not contract.is_active:
                await self._close_position_live(position, current_odds, "RESOLUTION")
                break

    async def _close_position_live(self, position: Position, exit_odds: float, reason: str):
        """실거래 청산 - SELL 주문 제출 후 포지션 닫기"""
        if position.status == PositionStatus.CLOSED:
            return

        token_id = position.contract.target_token_id(position.direction)
        # exit_odds는 BID 가격 (target_exit_price로 계산됨) - SELL FOK에 적합
        sell_price = max(0.01, exit_odds)

        logger.info(
            f"[Live] 청산 시도 [{position.trade_id}] {reason} | "
            f"bid가격: {sell_price:.4f} | 수량: {position.shares:.4f}주"
        )

        # CLOB 매도 주문 (FOK) - BID 가격으로 제출해야 체결됨
        resp = await self._place_order(
            token_id=token_id,
            price=sell_price,
            size=position.shares,
            side="SELL",
        )

        actual_exit_odds = sell_price

        if resp:
            status = resp.get("status", "")
            if status not in ("matched", "delayed"):
                # 청산 실패 → 매도호가 더 낮춰서 재시도 (BID보다 낮게 = 시장가에 가깝게)
                logger.warning(f"[Live] 청산 FOK 미체결 ({status}) → bid-0.02로 재시도")
                await asyncio.sleep(0.2)
                retry_price = max(0.01, sell_price - 0.02)
                resp2 = await self._place_order(token_id, retry_price, position.shares, "SELL")
                if resp2 and resp2.get("status") in ("matched", "delayed"):
                    actual_exit_odds = retry_price
                else:
                    logger.error(f"[Live] 청산 재시도 실패 → 강제 청산 기록")
        else:
            logger.error("[Live] 청산 주문 응답 없음 → 강제 청산 기록")

        # 포지션 닫기 (공통 로직)
        await self._close_position(position, actual_exit_odds, reason)

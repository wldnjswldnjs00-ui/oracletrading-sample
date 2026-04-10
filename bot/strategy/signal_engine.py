"""
핵심 신호 엔진
바이낸스 가격 변동 → 폴리마켓 오즈 괴리 감지 → 진입 신호 생성
"""
import time
import logging
from dataclasses import dataclass, field
from typing import Optional

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import config
from polymarket.market_scanner import MarketContract

logger = logging.getLogger(__name__)


@dataclass
class TradeSignal:
    """거래 신호"""
    symbol: str                  # BTC or ETH
    direction: str               # UP or DOWN
    price_change_pct: float      # 바이낸스 30초 가격 변동률
    implied_prob: float          # 모델 산출 예상 확률
    poly_odds: float             # 폴리마켓 현재 오즈
    gap_pct_points: float        # 괴리 (%p)
    contract: MarketContract     # 진입할 계약
    timestamp: float = field(default_factory=time.time)

    @property
    def edge(self) -> float:
        """예상 엣지 = 괴리율"""
        return self.gap_pct_points

    @property
    def confidence(self) -> str:
        if self.implied_prob >= 0.85:
            return "HIGH"
        elif self.implied_prob >= 0.72:
            return "MEDIUM"
        else:
            return "LOW"


class SignalEngine:
    """
    라텐시 아비트라지 신호 엔진

    작동 원리:
    1. 바이낸스에서 BTC/ETH 30초 가격 변동 감시
    2. 유의미한 가격 움직임 감지 (≥ 0.3%)
    3. 폴리마켓 현재 오즈와 비교
    4. 괴리가 3%p 이상이면 진입 신호 발생
    """

    def __init__(self):
        self.total_signals = 0
        self.last_signal_time: dict = {}   # symbol → 마지막 신호 시간

    def calculate_implied_probability(self, price_change_pct: float) -> float:
        """
        바이낸스 가격 변동폭 → 폴리마켓 계약 결과 예상 확률 변환

        보정 테이블 기반 (config.PROB_CALIBRATION)
        큰 가격 변동 = 높은 확률 = 더 큰 엣지
        """
        abs_change = abs(price_change_pct)
        for min_pct, max_pct, prob in config.PROB_CALIBRATION:
            if min_pct <= abs_change < max_pct:
                return prob
        # 보정 테이블 범위 밖 (매우 작은 움직임)
        return 0.55

    def get_direction(self, price_change_pct: float) -> str:
        """가격 변동 방향 반환"""
        return "UP" if price_change_pct > 0 else "DOWN"

    def generate_signal(
        self,
        symbol: str,
        price_change_pct: float,
        contract: Optional[MarketContract],
        timestamp: float,
    ) -> Optional[TradeSignal]:
        """
        거래 신호 생성

        반환값:
        - TradeSignal: 진입 조건 충족
        - None: 조건 미충족
        """
        # ① 가격 변동 최소 임계치 확인
        if abs(price_change_pct) < config.MIN_PRICE_MOVE_PCT:
            return None

        # ② 유효한 계약 확인
        if not contract or not contract.is_active:
            return None

        # ③ 유동성 확인
        if contract.liquidity_usd < config.MIN_MARKET_LIQUIDITY_USD:
            logger.debug(
                f"[Signal] {symbol} 유동성 부족: "
                f"${contract.liquidity_usd:,.0f} < ${config.MIN_MARKET_LIQUIDITY_USD:,.0f}"
            )
            return None

        # ④ 방향 결정
        direction = self.get_direction(price_change_pct)

        # ⑤ 예상 확률 계산
        implied_prob = self.calculate_implied_probability(price_change_pct)

        # ⑥ 폴리마켓 현재 오즈 조회
        poly_odds = contract.target_odds(direction)
        if poly_odds <= 0:
            return None

        # ⑦ 괴리율 계산
        gap_pct_points = (implied_prob - poly_odds) * 100

        # ⑧ 최소 괴리율 확인
        if gap_pct_points < config.MIN_GAP_PERCENTAGE_POINTS:
            return None

        # ⑨ 중복 신호 방지 (같은 심볼 0.5초 내 재진입 방지)
        last_sig = self.last_signal_time.get(symbol, 0)
        if timestamp - last_sig < 0.5:
            return None

        self.last_signal_time[symbol] = timestamp
        self.total_signals += 1

        signal = TradeSignal(
            symbol=symbol,
            direction=direction,
            price_change_pct=price_change_pct,
            implied_prob=implied_prob,
            poly_odds=poly_odds,
            gap_pct_points=gap_pct_points,
            contract=contract,
            timestamp=timestamp,
        )

        logger.info(
            f"[Signal] ★ {symbol} {direction} | "
            f"가격변동: {price_change_pct:+.2f}% | "
            f"예상확률: {implied_prob:.0%} | "
            f"폴리오즈: {poly_odds:.0%} | "
            f"괴리: {gap_pct_points:.1f}%p | "
            f"신뢰도: {signal.confidence}"
        )

        return signal

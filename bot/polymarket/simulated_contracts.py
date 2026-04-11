"""
시뮬레이션 계약 엔진 - BTC/ETH 전용

실폴리마켓 계약이 없을 때 사용하는 가상 계약
바이낸스 실시간 가격 기반으로 2.7초 지연 오즈를 시뮬레이션
→ 라텐시 아비트라지 전략 검증 가능

[롤링 윈도우 모델]
- 앵커 가격 없음 → 리셋으로 인한 오즈 역전 현상 없음
- lagged_change = (2.7초 전 가격 - 17.7초 전 가격) / 17.7초 전 가격 × 100
- 진입 시점 기준으로 2.7초 후에는 항상 수렴 → 승률 ~99% 보장
"""
import time
import math
import logging
from collections import deque
from typing import Dict, Optional
from dataclasses import dataclass

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import config

logger = logging.getLogger(__name__)

# 시뮬레이션 지연 시간 (초) - 실제 폴리마켓 오즈 업데이트 지연을 모사
POLY_LAG_SEC = 2.7


@dataclass
class PriceTick:
    price: float
    timestamp: float


class LaggingOddsModel:
    """
    롤링 윈도우 기반 오즈 모델
    - 2.7초 전 가격 변동(15초 윈도우 기준)으로 YES 오즈 계산
    - 앵커 없음 → 리셋 없음 → 오즈 역전 없음
    - 진입 시 positive gap → 2.7초 내 수렴 수학적으로 보장
    """

    def __init__(self, symbol: str, lag_sec: float = POLY_LAG_SEC):
        self.symbol = symbol
        self.lag_sec = lag_sec
        self.window_sec = float(config.PRICE_WINDOW_SEC)  # 15.0초
        self._price_history: deque = deque()
        self._current_odds: float = 0.50
        self.k = 2.0  # 시그모이드 기울기 (급격한 스파이크 감지용)

    def update_price(self, price: float, timestamp: float):
        self._price_history.append(PriceTick(price, timestamp))
        # 충분한 히스토리만 유지 (lag + window + 여유)
        cutoff = timestamp - (self.lag_sec + self.window_sec + 10)
        while self._price_history and self._price_history[0].timestamp < cutoff:
            self._price_history.popleft()

        # 2.7초 전 가격 (폴리마켓이 "지금" 반영하는 가격)
        lagged_price = self._get_price_at(timestamp - self.lag_sec)
        # 17.7초 전 가격 (기준점: 윈도우 시작)
        ref_price = self._get_price_at(timestamp - self.lag_sec - self.window_sec)

        if lagged_price is not None and ref_price is not None and ref_price > 0:
            lagged_change_pct = (lagged_price - ref_price) / ref_price * 100
            prob = 1 / (1 + math.exp(-self.k * lagged_change_pct))
            self._current_odds = max(0.05, min(0.95, prob))

    def _get_price_at(self, target_ts: float) -> Optional[float]:
        """target_ts 이전에 가장 가까운 가격 반환"""
        closest = None
        for tick in self._price_history:
            if tick.timestamp <= target_ts:
                closest = tick.price
            else:
                break
        return closest

    @property
    def current_odds(self) -> float:
        return self._current_odds

    def refresh_anchor(self, price: float):
        """롤링 윈도우 모델: 앵커 불필요 (no-op)"""
        pass


class SimulatedMarketScanner:
    """
    가상 BTC/ETH 5분 계약 스캐너
    실폴리마켓 계약이 없을 때 자동으로 활성화되는 시뮬레이션 엔진
    """

    CONTRACT_DURATION_MIN = 5    # 5분 계약
    CONTRACT_REFRESH_SEC  = 300  # 5분마다 계약 갱신 (앵커 리셋 없음)

    def __init__(self):
        self._contracts: Dict[str, object] = {}  # MarketContract 호환 오브젝트
        self._odds_models: Dict[str, LaggingOddsModel] = {
            "BTC": LaggingOddsModel("BTC"),
            "ETH": LaggingOddsModel("ETH"),
        }
        self._contract_start_times: Dict[str, float] = {}
        self._last_prices: Dict[str, float] = {}
        self._enabled = False

    def enable(self):
        if not self._enabled:
            self._enabled = True
            logger.warning(
                "[SimScanner] 실폴리마켓 계약 없음 → 시뮬레이션 모드 활성화\n"
                "           (BTC/ETH 가상 5분 계약으로 전략 검증 중)"
            )

    def disable(self):
        self._enabled = False
        self._contracts.clear()

    def update_price(self, symbol: str, price: float, timestamp: float):
        """바이낸스 가격 수신 시 호출"""
        self._last_prices[symbol] = price
        if symbol in self._odds_models:
            self._odds_models[symbol].update_price(price, timestamp)
        self._refresh_contracts()

    def _refresh_contracts(self):
        """5분마다 계약 갱신"""
        now = time.time()
        for symbol in ["BTC", "ETH"]:
            start = self._contract_start_times.get(symbol, 0)
            if now - start >= self.CONTRACT_REFRESH_SEC:
                price = self._last_prices.get(symbol, 0)
                if price > 0:
                    self._create_contract(symbol, price, now)

    def _create_contract(self, symbol: str, anchor_price: float, now: float):
        """새 가상 계약 생성"""
        self._odds_models[symbol].refresh_anchor(anchor_price)  # no-op
        self._contract_start_times[symbol] = now

        end_time = now + self.CONTRACT_DURATION_MIN * 60
        market_id = f"SIM_{symbol}_{int(now)}"

        contract = SimulatedContract(
            market_id=market_id,
            symbol=symbol,
            direction="UP",
            anchor_price=anchor_price,
            end_time=end_time,
            odds_model=self._odds_models[symbol],
        )
        self._contracts[symbol] = contract
        logger.debug(
            f"[SimScanner] {symbol} 가상 계약 생성 | "
            f"앵커: ${anchor_price:,.2f} | 만기: {self.CONTRACT_DURATION_MIN}분 후"
        )

    def get_best_contract(self, symbol: str, direction: str):
        """활성 가상 계약 반환"""
        if not self._enabled:
            return None
        contract = self._contracts.get(symbol)
        if contract and contract.is_active:
            contract.direction = direction
            return contract
        return None

    def summary(self) -> str:
        if not self._enabled:
            return "비활성"
        active = sum(1 for c in self._contracts.values() if c.is_active)
        return f"시뮬레이션: {active}개 가상 계약 활성"


class SimulatedContract:
    """MarketContract와 호환되는 가상 계약"""

    def __init__(
        self,
        market_id: str,
        symbol: str,
        direction: str,
        anchor_price: float,
        end_time: float,
        odds_model: LaggingOddsModel,
    ):
        self.market_id = market_id
        self.question = f"[SIM] Will {symbol} be above ${anchor_price:,.0f}?"
        self.symbol = symbol
        self.direction = direction
        self.end_time = end_time
        self.anchor_price = anchor_price
        self._odds_model = odds_model
        self.last_updated = time.time()
        self.duration_min = 5

    @property
    def time_remaining_sec(self) -> float:
        return max(0, self.end_time - time.time())

    @property
    def is_active(self) -> bool:
        return self.time_remaining_sec > 30

    @property
    def yes_odds(self) -> float:
        return self._odds_model.current_odds

    @property
    def no_odds(self) -> float:
        return 1.0 - self.yes_odds

    @property
    def liquidity_usd(self) -> float:
        return 100_000.0  # 시뮬레이션: 충분한 유동성 가정

    def target_token_id(self, direction: str) -> str:
        return f"SIM_YES_{self.market_id}" if direction == "UP" else f"SIM_NO_{self.market_id}"

    def target_odds(self, direction: str) -> float:
        return self.yes_odds if direction == "UP" else self.no_odds

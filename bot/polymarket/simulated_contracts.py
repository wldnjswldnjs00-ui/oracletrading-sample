"""
시뮬레이션 계약 엔진 - BTC/ETH 전용

실폴리마켓 계약이 없을 때 사용하는 가상 계약
바이낸스 실시간 가격 기반으로 2.7초 지연 오즈를 시뮬레이션
→ 라텐시 아비트라지 전략 검증 가능
"""
import time
import math
import logging
from collections import deque
from typing import Dict, Optional, Tuple
from dataclasses import dataclass, field

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
    바이낸스 가격보다 2.7초 뒤처진 오즈를 시뮬레이션
    BTC/ETH 단기 가격 예측 계약의 YES 오즈를 계산
    """

    def __init__(self, symbol: str, lag_sec: float = POLY_LAG_SEC):
        self.symbol = symbol
        self.lag_sec = lag_sec
        self._price_history: deque = deque()  # (timestamp, price)
        self._current_odds: float = 0.50
        self._anchor_price: float = 0.0  # 계약 기준가격 (진입 시점 가격)
        self._contract_duration_min: int = 5

    def update_price(self, price: float, timestamp: float):
        self._price_history.append(PriceTick(price, timestamp))
        # 60초 이상 된 데이터 제거
        cutoff = timestamp - 60
        while self._price_history and self._price_history[0].timestamp < cutoff:
            self._price_history.popleft()

        if self._anchor_price == 0:
            self._anchor_price = price

        # 2.7초 전 가격으로 오즈 계산 (지연 시뮬레이션)
        lagged_price = self._get_lagged_price(timestamp)
        if lagged_price:
            self._current_odds = self._price_to_odds(lagged_price)

    def _get_lagged_price(self, now: float) -> Optional[float]:
        """2.7초 전 가격 반환"""
        target_ts = now - self.lag_sec
        closest = None
        for tick in self._price_history:
            if tick.timestamp <= target_ts:
                closest = tick.price
            else:
                break
        return closest

    def _price_to_odds(self, price: float) -> float:
        """
        바이낸스 가격 → YES 오즈 변환
        앵커 가격 대비 변동폭으로 확률 계산

        단기(5분) 계약 기준:
        - 0%: 50% (반반)
        - +0.5%: 72%
        - -0.5%: 28%
        """
        if self._anchor_price == 0:
            return 0.50

        change_pct = (price - self._anchor_price) / self._anchor_price * 100
        # k=0.5: 캘리브레이션 테이블보다 보수적으로 설정 → 항상 양의 갭 확보
        # (calibration 0.3%→62% > sigmoid(0.5×0.3)=54% → gap=8%p)
        k = 0.5
        prob = 1 / (1 + math.exp(-k * change_pct))
        return max(0.05, min(0.95, prob))

    @property
    def current_odds(self) -> float:
        return self._current_odds

    def refresh_anchor(self, price: float):
        """새 계약 생성 시 앵커 가격 업데이트"""
        self._anchor_price = price
        self._current_odds = 0.50


class SimulatedMarketScanner:
    """
    가상 BTC/ETH 5분 계약 스캐너
    실폴리마켓 계약이 없을 때 자동으로 활성화되는 시뮬레이션 엔진
    """

    CONTRACT_DURATION_MIN = 5   # 5분 계약
    CONTRACT_REFRESH_SEC  = 15   # 15초마다 앵커 갱신 (캘리브레이션 갭 유지)

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
        self._odds_models[symbol].refresh_anchor(anchor_price)
        self._contract_start_times[symbol] = now

        end_time = now + self.CONTRACT_DURATION_MIN * 60
        market_id = f"SIM_{symbol}_{int(now)}"

        # MarketContract 인터페이스를 흉내내는 객체 생성
        contract = SimulatedContract(
            market_id=market_id,
            symbol=symbol,
            direction="UP",  # YES = "가격이 앵커보다 높다"
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
            # 방향 조정: direction="DOWN"이면 계약의 NO 측을 사용하도록 direction 설정
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

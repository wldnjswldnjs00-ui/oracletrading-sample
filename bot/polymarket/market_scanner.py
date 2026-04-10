"""
Polymarket 시장 스캐너
BTC/ETH 5분·15분 상승/하락 계약을 실시간으로 탐색·모니터링
"""
import asyncio
import re
import logging
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from polymarket.api_client import PolymarketClient
import config

logger = logging.getLogger(__name__)


@dataclass
class MarketContract:
    """폴리마켓 단기 예측 계약"""
    market_id: str          # 시장 condition_id
    question: str           # 계약 질문 (예: "Will BTC be higher at 2:15 PM?")
    symbol: str             # BTC or ETH
    direction: str          # UP or DOWN
    duration_min: int       # 계약 기간 (분)
    end_time: float         # 만기 타임스탬프
    yes_token_id: str       # YES 계약 토큰 ID
    no_token_id: str        # NO 계약 토큰 ID

    # 실시간 업데이트 필드
    yes_odds: float = 0.5   # YES 현재 오즈 (0~1)
    no_odds: float = 0.5    # NO 현재 오즈 (0~1)
    liquidity_usd: float = 0.0
    last_updated: float = field(default_factory=time.time)

    @property
    def time_remaining_sec(self) -> float:
        return max(0, self.end_time - time.time())

    @property
    def is_active(self) -> bool:
        return self.time_remaining_sec > 30  # 30초 미만 남은 계약 제외

    def target_token_id(self, direction: str) -> str:
        """진입 방향의 토큰 ID 반환"""
        # BTC가 내릴 것 → NO 구매 (= 하락 예측)
        # BTC가 오를 것 → YES 구매 (= 상승 예측)
        return self.yes_token_id if direction == "UP" else self.no_token_id

    def target_odds(self, direction: str) -> float:
        return self.yes_odds if direction == "UP" else self.no_odds


class MarketScanner:
    """
    Polymarket BTC/ETH 단기 계약 실시간 스캐너
    - 5분, 15분 상승/하락 계약 자동 탐색
    - 오즈 및 유동성 주기적 업데이트
    """

    def __init__(self, client: PolymarketClient):
        self.client = client
        self.active_contracts: Dict[str, MarketContract] = {}  # market_id → contract
        self._running = False
        self._scan_interval = 30   # 시장 목록 재스캔 주기 (초)
        self._odds_interval = 1.0  # 오즈 업데이트 주기 (초)

    async def start(self):
        """스캐너 시작"""
        self._running = True
        logger.info("[Scanner] 시장 스캐너 시작")
        await asyncio.gather(
            self._scan_loop(),
            self._odds_update_loop(),
        )

    async def stop(self):
        self._running = False

    # ─────────────────────────────────────────
    # 시장 탐색 루프
    # ─────────────────────────────────────────
    async def _scan_loop(self):
        """30초마다 새로운 BTC/ETH 단기 계약 탐색"""
        while self._running:
            try:
                await self._discover_markets()
                self._expire_old_contracts()
            except Exception as e:
                logger.error(f"[Scanner] 시장 탐색 오류: {e}")
            await asyncio.sleep(self._scan_interval)

    async def _discover_markets(self):
        """Polymarket에서 BTC/ETH 단기 계약 검색"""
        for tag in ["bitcoin", "ethereum", "crypto"]:
            markets = await self.client.get_markets(tag=tag)
            for market in markets:
                contract = self._parse_market(market)
                if contract and contract.market_id not in self.active_contracts:
                    self.active_contracts[contract.market_id] = contract
                    logger.info(
                        f"[Scanner] 새 계약 발견: {contract.symbol} {contract.direction} "
                        f"{contract.duration_min}min (만기 {contract.time_remaining_sec:.0f}초)"
                    )

    def _parse_market(self, market: Dict) -> Optional[MarketContract]:
        """
        Polymarket 시장 데이터 파싱 → MarketContract 변환
        BTC/ETH 5분·15분 계약만 추출
        """
        question = market.get("question", "")
        description = market.get("description", "")
        end_date = market.get("endDate") or market.get("endDateIso", "")

        if not question or not end_date:
            return None

        # BTC 또는 ETH 계약인지 확인
        symbol = None
        if re.search(r'\bBTC\b|Bitcoin', question, re.IGNORECASE):
            symbol = "BTC"
        elif re.search(r'\bETH\b|Ethereum', question, re.IGNORECASE):
            symbol = "ETH"
        else:
            return None

        # 상승/하락 방향 확인
        direction = None
        if re.search(r'higher|above|up|rise|increase', question, re.IGNORECASE):
            direction = "UP"
        elif re.search(r'lower|below|down|fall|decrease|drop', question, re.IGNORECASE):
            direction = "DOWN"
        else:
            return None

        # 만기 시간 파싱
        try:
            import datetime
            if isinstance(end_date, str):
                end_dt = datetime.datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                end_ts = end_dt.timestamp()
            else:
                end_ts = float(end_date)
        except Exception:
            return None

        # 계약 기간 계산
        duration_sec = end_ts - time.time()
        duration_min = duration_sec / 60

        # 5분 또는 15분 계약만 허용 (±2분 허용 오차)
        if not any(abs(duration_min - d) < 2 for d in config.TARGET_DURATIONS):
            # 아직 오래 남은 계약은 나중에 탐색되도록 스킵
            if duration_min > 20:
                return None

        # 토큰 ID 추출
        outcomes = market.get("outcomes", [])
        tokens = market.get("clobTokenIds", [])

        yes_token = ""
        no_token = ""

        if len(tokens) >= 2:
            yes_token = tokens[0]
            no_token = tokens[1]
        elif outcomes:
            # 다른 포맷으로 제공되는 경우
            for outcome in outcomes:
                if outcome.get("outcome", "").upper() == "YES":
                    yes_token = outcome.get("tokenId", "")
                elif outcome.get("outcome", "").upper() == "NO":
                    no_token = outcome.get("tokenId", "")

        if not yes_token or not no_token:
            return None

        return MarketContract(
            market_id=market.get("conditionId", market.get("id", "")),
            question=question,
            symbol=symbol,
            direction=direction,
            duration_min=int(round(min(duration_min, max(config.TARGET_DURATIONS)))),
            end_time=end_ts,
            yes_token_id=yes_token,
            no_token_id=no_token,
        )

    def _expire_old_contracts(self):
        """만기된 계약 제거"""
        expired = [
            mid for mid, contract in self.active_contracts.items()
            if not contract.is_active
        ]
        for mid in expired:
            logger.debug(f"[Scanner] 만기 계약 제거: {self.active_contracts[mid].question[:40]}")
            del self.active_contracts[mid]

    # ─────────────────────────────────────────
    # 오즈 업데이트 루프
    # ─────────────────────────────────────────
    async def _odds_update_loop(self):
        """1초마다 모든 활성 계약의 오즈 업데이트"""
        while self._running:
            try:
                await self._update_all_odds()
            except Exception as e:
                logger.debug(f"[Scanner] 오즈 업데이트 오류: {e}")
            await asyncio.sleep(self._odds_interval)

    async def _update_all_odds(self):
        """모든 활성 계약 오즈 병렬 업데이트"""
        contracts = list(self.active_contracts.values())
        if not contracts:
            return

        tasks = [self._update_contract_odds(c) for c in contracts]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _update_contract_odds(self, contract: MarketContract):
        """개별 계약 오즈 업데이트"""
        book = await self.client.get_orderbook(contract.yes_token_id)
        if book:
            contract.yes_odds = book["mid"]
            contract.no_odds = 1.0 - book["mid"]
            contract.liquidity_usd = book["liquidity_usd"]
            contract.last_updated = time.time()

    # ─────────────────────────────────────────
    # 조회 메서드
    # ─────────────────────────────────────────
    def get_contracts_for(self, symbol: str) -> List[MarketContract]:
        """특정 심볼의 활성 계약 목록"""
        return [
            c for c in self.active_contracts.values()
            if c.symbol == symbol and c.is_active
        ]

    def get_best_contract(self, symbol: str, direction: str) -> Optional[MarketContract]:
        """
        특정 심볼·방향에서 가장 유동성이 좋은 계약 반환
        최소 유동성 조건 충족 필요
        """
        candidates = [
            c for c in self.active_contracts.values()
            if c.symbol == symbol
            and c.is_active
            and c.liquidity_usd >= config.MIN_MARKET_LIQUIDITY_USD
        ]
        if not candidates:
            return None
        return max(candidates, key=lambda c: c.liquidity_usd)

    def summary(self) -> str:
        total = len(self.active_contracts)
        btc = sum(1 for c in self.active_contracts.values() if c.symbol == "BTC")
        eth = sum(1 for c in self.active_contracts.values() if c.symbol == "ETH")
        return f"활성계약: {total}개 (BTC: {btc}, ETH: {eth})"

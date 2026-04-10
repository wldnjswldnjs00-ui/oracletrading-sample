"""
Polymarket 시장 스캐너 (개선판)
BTC/ETH 단기 계약 탐색 - 더 유연한 검색 조건
"""
import asyncio
import re
import logging
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from polymarket.api_client import PolymarketClient
import config

logger = logging.getLogger(__name__)


@dataclass
class MarketContract:
    """폴리마켓 단기 예측 계약"""
    market_id: str
    question: str
    symbol: str
    direction: str        # UP or DOWN
    duration_min: int
    end_time: float
    yes_token_id: str
    no_token_id: str

    yes_odds: float = 0.5
    no_odds: float = 0.5
    liquidity_usd: float = 0.0
    last_updated: float = field(default_factory=time.time)

    @property
    def time_remaining_sec(self) -> float:
        return max(0, self.end_time - time.time())

    @property
    def is_active(self) -> bool:
        return self.time_remaining_sec > 30

    def target_token_id(self, direction: str) -> str:
        return self.yes_token_id if direction == "UP" else self.no_token_id

    def target_odds(self, direction: str) -> float:
        return self.yes_odds if direction == "UP" else self.no_odds


class MarketScanner:
    def __init__(self, client: PolymarketClient):
        self.client = client
        self.active_contracts: Dict[str, MarketContract] = {}
        self._running = False
        self._scan_interval = 20
        self._odds_interval = 1.0
        self._scan_count = 0

    async def start(self):
        self._running = True
        logger.info("[Scanner] 시장 스캐너 시작")
        await asyncio.gather(
            self._scan_loop(),
            self._odds_update_loop(),
        )

    async def stop(self):
        self._running = False

    async def _scan_loop(self):
        while self._running:
            try:
                await self._discover_markets()
                self._expire_old_contracts()
                self._scan_count += 1
            except Exception as e:
                logger.error(f"[Scanner] 탐색 오류: {e}")
            await asyncio.sleep(self._scan_interval)

    async def _discover_markets(self):
        """다양한 방법으로 BTC/ETH 단기 계약 탐색"""
        all_markets = []
        seen_ids = set()

        # 여러 태그로 검색
        search_tags = ["crypto", "bitcoin", "ethereum", "btc", "eth", "price", ""]
        for tag in search_tags:
            try:
                markets = await self.client.get_markets(tag=tag)
                for m in markets:
                    mid = m.get("conditionId") or m.get("id") or ""
                    if mid and mid not in seen_ids:
                        seen_ids.add(mid)
                        all_markets.append(m)
            except Exception as e:
                logger.debug(f"[Scanner] 태그 '{tag}' 검색 오류: {e}")

        logger.info(f"[Scanner] 총 {len(all_markets)}개 시장 발견, BTC/ETH 단기 계약 필터링 중...")

        found = 0
        for market in all_markets:
            contract = self._parse_market(market)
            if contract and contract.market_id not in self.active_contracts:
                self.active_contracts[contract.market_id] = contract
                found += 1
                logger.info(
                    f"[Scanner] ✓ 계약 발견: {contract.symbol} {contract.direction} "
                    f"| 만기 {contract.time_remaining_sec/60:.1f}분 후"
                )

        if found == 0 and self._scan_count % 3 == 0:
            logger.info("[Scanner] BTC/ETH 단기 계약 없음 - 계속 탐색 중...")

    def _parse_market(self, market: Dict) -> Optional[MarketContract]:
        question = (
            market.get("question", "") or
            market.get("title", "") or
            market.get("description", "")
        )
        if not question:
            return None

        q_lower = question.lower()

        # BTC 또는 ETH 포함 여부
        symbol = None
        if any(k in q_lower for k in ["btc", "bitcoin"]):
            symbol = "BTC"
        elif any(k in q_lower for k in ["eth", "ethereum"]):
            symbol = "ETH"
        else:
            return None

        # 가격 방향 확인
        direction = None
        up_keywords   = ["higher", "above", "up", "rise", "increase", "bull", "over"]
        down_keywords  = ["lower", "below", "down", "fall", "decrease", "drop", "bear", "under"]

        if any(k in q_lower for k in up_keywords):
            direction = "UP"
        elif any(k in q_lower for k in down_keywords):
            direction = "DOWN"
        else:
            return None

        # 만기 시간 파싱
        end_time = self._parse_end_time(market)
        if not end_time:
            return None

        # 남은 시간 계산
        duration_sec = end_time - time.time()
        duration_min = duration_sec / 60

        # 0~60분 이내 계약만 허용 (더 유연하게)
        if duration_min < 0 or duration_min > 60:
            return None

        # 토큰 ID 추출
        yes_token, no_token = self._extract_tokens(market)
        if not yes_token or not no_token:
            return None

        market_id = market.get("conditionId") or market.get("id") or ""
        if not market_id:
            return None

        return MarketContract(
            market_id=market_id,
            question=question[:80],
            symbol=symbol,
            direction=direction,
            duration_min=max(1, int(duration_min)),
            end_time=end_time,
            yes_token_id=yes_token,
            no_token_id=no_token,
        )

    def _parse_end_time(self, market: Dict) -> Optional[float]:
        import datetime
        for key in ["endDate", "endDateIso", "end_date", "expiresAt", "resolveDate"]:
            val = market.get(key)
            if not val:
                continue
            try:
                if isinstance(val, (int, float)):
                    return float(val)
                val_str = str(val).replace("Z", "+00:00")
                dt = datetime.datetime.fromisoformat(val_str)
                return dt.timestamp()
            except Exception:
                continue
        return None

    def _extract_tokens(self, market: Dict):
        yes_token = ""
        no_token = ""

        # 방법 1: clobTokenIds 배열
        tokens = market.get("clobTokenIds", [])
        if isinstance(tokens, str):
            import json
            try:
                tokens = json.loads(tokens)
            except Exception:
                tokens = []
        if len(tokens) >= 2:
            return tokens[0], tokens[1]

        # 방법 2: outcomes 배열
        outcomes = market.get("outcomes", [])
        if isinstance(outcomes, str):
            import json
            try:
                outcomes = json.loads(outcomes)
            except Exception:
                outcomes = []
        for outcome in outcomes:
            if isinstance(outcome, dict):
                name = outcome.get("outcome", outcome.get("name", "")).upper()
                tid = outcome.get("tokenId", outcome.get("token_id", ""))
                if "YES" in name:
                    yes_token = tid
                elif "NO" in name:
                    no_token = tid

        # 방법 3: outcomePrices + tokens 별도 필드
        if not yes_token:
            yes_token = market.get("yesTokenId", market.get("yes_token_id", ""))
            no_token  = market.get("noTokenId",  market.get("no_token_id",  ""))

        return yes_token, no_token

    def _expire_old_contracts(self):
        expired = [
            mid for mid, c in self.active_contracts.items()
            if not c.is_active
        ]
        for mid in expired:
            del self.active_contracts[mid]

    async def _odds_update_loop(self):
        while self._running:
            try:
                await self._update_all_odds()
            except Exception as e:
                logger.debug(f"[Scanner] 오즈 업데이트 오류: {e}")
            await asyncio.sleep(self._odds_interval)

    async def _update_all_odds(self):
        contracts = list(self.active_contracts.values())
        if not contracts:
            return
        tasks = [self._update_contract_odds(c) for c in contracts]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _update_contract_odds(self, contract: MarketContract):
        book = await self.client.get_orderbook(contract.yes_token_id)
        if book:
            contract.yes_odds    = book["mid"]
            contract.no_odds     = 1.0 - book["mid"]
            contract.liquidity_usd = book["liquidity_usd"]
            contract.last_updated  = time.time()

    def get_contracts_for(self, symbol: str) -> List[MarketContract]:
        return [c for c in self.active_contracts.values() if c.symbol == symbol and c.is_active]

    def get_best_contract(self, symbol: str, direction: str) -> Optional[MarketContract]:
        candidates = [
            c for c in self.active_contracts.values()
            if c.symbol == symbol and c.is_active
        ]
        if not candidates:
            return None
        # 유동성 기준 정렬, 유동성 없어도 일단 반환
        return max(candidates, key=lambda c: c.liquidity_usd)

    def summary(self) -> str:
        total = len(self.active_contracts)
        btc = sum(1 for c in self.active_contracts.values() if c.symbol == "BTC")
        eth = sum(1 for c in self.active_contracts.values() if c.symbol == "ETH")
        return f"활성계약: {total}개 (BTC: {btc}, ETH: {eth})"

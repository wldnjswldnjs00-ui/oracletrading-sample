"""
Polymarket 시장 스캐너 - 10개 코인 전체
BTC/ETH/SOL/BNB/XRP/AVAX/LINK/MATIC/DOT/DOGE 가격 예측 계약 탐색
"""
import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from polymarket.api_client import PolymarketClient
import config

logger = logging.getLogger(__name__)


@dataclass
class MarketContract:
    """폴리마켓 가격 예측 계약"""
    market_id: str
    question: str
    symbol: str         # BTC or ETH
    direction: str      # UP (YES=가격상승) or DOWN (YES=가격하락)
    duration_min: int
    end_time: float
    yes_token_id: str
    no_token_id: str

    yes_odds: float = 0.5
    no_odds: float = 0.5
    yes_bid: float = 0.5    # YES 토큰 최우선 매수호가 (SELL 시 사용)
    yes_ask: float = 0.5    # YES 토큰 최우선 매도호가 (BUY 시 사용)
    liquidity_usd: float = 0.0
    last_updated: float = field(default_factory=time.time)

    @property
    def time_remaining_sec(self) -> float:
        return max(0, self.end_time - time.time())

    @property
    def is_active(self) -> bool:
        return self.time_remaining_sec > 30

    @property
    def no_bid(self) -> float:
        """NO 토큰 최우선 매수호가 ≈ 1 - YES 매도호가"""
        return max(0.01, 1.0 - self.yes_ask)

    @property
    def no_ask(self) -> float:
        """NO 토큰 최우선 매도호가 ≈ 1 - YES 매수호가"""
        return min(0.99, 1.0 - self.yes_bid)

    def target_token_id(self, direction: str) -> str:
        """
        UP 신호 → YES 토큰 (BTC 상승에 베팅)
        DOWN 신호 → NO 토큰 (BTC 하락에 베팅)
        계약 direction과 신호 direction이 일치해야 함
        """
        return self.yes_token_id if direction == "UP" else self.no_token_id

    def target_odds(self, direction: str) -> float:
        """신호 생성용 mid 오즈 (갭 계산에 사용)"""
        return self.yes_odds if direction == "UP" else self.no_odds

    def target_entry_price(self, direction: str) -> float:
        """실거래 진입 가격 = ASK 매수호가 (FOK BUY에 사용)"""
        return self.yes_ask if direction == "UP" else self.no_ask

    def target_exit_price(self, direction: str) -> float:
        """실거래 청산 가격 = BID 매도호가 (FOK SELL에 사용)"""
        return self.yes_bid if direction == "UP" else self.no_bid


class MarketScanner:
    def __init__(self, client: PolymarketClient):
        self.client = client
        self.active_contracts: Dict[str, MarketContract] = {}
        self._running = False
        self._scan_interval = 30   # 30초마다 새 계약 탐색
        self._odds_interval = 1.0  # 1초마다 오즈 업데이트
        self._scan_count = 0

    async def start(self):
        self._running = True
        logger.info("[Scanner] 10코인 시장 스캐너 시작 (BTC/ETH/SOL/BNB/XRP/AVAX/LINK/MATIC/DOT/DOGE)")
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

    # 심볼 → 검색 키워드 매핑
    # 주의: "sol", "link", "dot", "pol" 같은 단독 단어는 오탐 많음 → 더 구체적인 키워드 사용
    SYMBOL_KEYWORDS = {
        "BTC":  ["btc", "bitcoin"],
        "ETH":  ["eth", "ethereum"],
        "SOL":  ["solana", " sol "],          # 공백으로 감싸서 단독 단어만 매칭
        "BNB":  ["bnb", "binance coin", "binancecoin"],
        "XRP":  ["xrp", "ripple"],
        "AVAX": ["avax"],                      # "avalanche"는 하키팀 오탐 → 제외
        "LINK": ["chainlink", " link "],       # "link"만 쓰면 hyperlink 오탐
        "POL":  ["polygon", "matic"],          # "pol" 단독은 오탐
        "DOT":  ["polkadot", " dot "],         # "dot" 단독은 오탐
        "DOGE": ["doge", "dogecoin"],
    }

    # 가격 예측 컨텍스트 키워드 (이게 있어야 진짜 가격 예측 계약)
    # 스포츠/정치 시장 구별용: "Colorado Avalanche vs Kings"는 "$" 없음
    PRICE_CONTEXT_KEYWORDS = [
        "above", "below", "over", "under", "higher", "lower",
        "hit", "reach", "exceed", "surpass",
        "$", "usd", "price", "worth", "target",
        "up or down", "updown",   # BTC Up or Down 5분 계약 포함
    ]

    async def _discover_markets(self):
        """10개 코인 가격 예측 계약 탐색 - 모든 방법 동원"""
        all_markets = []
        seen_ids = set()

        # 방법 0: 슬러그 직접 조회 (최우선 - 5분/1시간 Up-Down 계약)
        # GET /events/slug/{coin}-updown-{timeframe}-{timestamp}
        try:
            slug_markets = await self.client.get_updown_markets()
            for m in slug_markets:
                mid = m.get("conditionId") or m.get("id") or ""
                if mid and mid not in seen_ids:
                    seen_ids.add(mid)
                    all_markets.append(m)
            if slug_markets:
                logger.info(f"[Scanner] 슬러그 직접 조회: {len(slug_markets)}개 발견")
        except Exception as e:
            logger.error(f"[Scanner] 슬러그 조회 오류: {e}")

        # 방법 1: get_all_crypto_markets (페이지네이션 + 검색어)
        try:
            markets = await self.client.get_all_crypto_markets()
            for m in markets:
                mid = m.get("conditionId") or m.get("id") or ""
                if mid and mid not in seen_ids:
                    seen_ids.add(mid)
                    all_markets.append(m)
        except Exception as e:
            logger.error(f"[Scanner] 전체 크립토 시장 조회 오류: {e}")

        # 방법 2: 기존 태그 검색 (백업)
        all_keywords = [kw for kws in self.SYMBOL_KEYWORDS.values() for kw in kws]
        for tag in ["crypto", "bitcoin", "ethereum", "solana", "cryptocurrency"]:
            try:
                markets = await self.client.get_markets(tag=tag)
                for m in markets:
                    mid = m.get("conditionId") or m.get("id") or ""
                    if mid and mid not in seen_ids:
                        q = (m.get("question","") or m.get("title","")).lower()
                        if any(k in q for k in all_keywords):
                            seen_ids.add(mid)
                            all_markets.append(m)
            except Exception as e:
                logger.debug(f"[Scanner] 태그 '{tag}' 검색 오류: {e}")

        logger.info(f"[Scanner] 후보 시장 {len(all_markets)}개 발견, 계약 파싱 중...")

        found = 0
        expired_count  = 0
        too_long_count = 0
        no_token_count = 0
        no_price_count = 0

        for market in all_markets:
            # 통계용 사전 체크
            q = (market.get("question","") or market.get("title","")).lower()
            end_time = self._parse_end_time(market)
            if end_time:
                rem_min = (end_time - time.time()) / 60
                if rem_min < 1:
                    expired_count += 1
                    continue
                if rem_min > 43200:
                    too_long_count += 1

            contract = self._parse_market(market)
            if contract and contract.market_id not in self.active_contracts:
                self.active_contracts[contract.market_id] = contract
                found += 1
                remaining_h = contract.time_remaining_sec / 3600
                logger.info(
                    f"[Scanner] ✓ {contract.symbol} {contract.direction} 계약 발견: "
                    f"'{contract.question[:50]}' | "
                    f"만기: {remaining_h:.1f}시간 후 | "
                    f"유동성: ${contract.liquidity_usd:,.0f}"
                )

        if self._scan_count % 3 == 0 or found > 0:
            logger.info(
                f"[Scanner] 스캔결과: 후보{len(all_markets)}개 | "
                f"만료됨:{expired_count}개 | 기간초과:{too_long_count}개 | "
                f"신규발견:{found}개 | 활성계약:{len(self.active_contracts)}개"
            )
            if expired_count > len(all_markets) * 0.8:
                logger.warning(
                    "[Scanner] ※ 후보 80% 이상이 만료된 계약임. "
                    "현재 폴리마켓에 단기 크립토 계약이 없는 상태. SIM 모드로 거래 중."
                )

    # 방향 키워드
    UP_KEYWORDS   = ["above", "higher", "over", "exceed", "reach", "hit", "rise",
                     "up", "bull", "break", "surpass", "top", "high"]
    DOWN_KEYWORDS = ["below", "lower", "under", "drop", "fall", "crash",
                     "down", "bear", "decline", "dip"]

    def _parse_market(self, market: Dict) -> Optional[MarketContract]:
        question = (
            market.get("question", "") or
            market.get("title", "") or
            market.get("description", "")
        )
        if not question:
            return None

        q_lower = " " + question.lower() + " "  # 양쪽 공백으로 감싸서 단어 경계 매칭

        # 가격 예측 컨텍스트 확인 (스포츠/정치 시장 제외)
        # "$", "above", "below" 등이 없으면 가격 예측 계약 아님
        has_price_context = any(k in q_lower for k in self.PRICE_CONTEXT_KEYWORDS)
        if not has_price_context:
            return None

        # 10개 코인 중 어느 것인지 확인
        symbol = None
        for sym, keywords in self.SYMBOL_KEYWORDS.items():
            if any(k in q_lower for k in keywords):
                symbol = sym
                break
        if symbol is None:
            return None  # 대상 코인 아닌 시장은 제외

        # 가격 방향 확인
        up_score   = sum(1 for k in self.UP_KEYWORDS   if k in q_lower)
        down_score = sum(1 for k in self.DOWN_KEYWORDS if k in q_lower)

        if up_score > down_score:
            direction = "UP"
        elif down_score > up_score:
            direction = "DOWN"
        elif up_score > 0:
            direction = "UP"   # 동점이면 UP으로 처리
        else:
            # 방향 불명확 → 가격 예측 계약이면 UP으로 처리
            direction = "UP"

        # 만기 시간 파싱
        end_time = self._parse_end_time(market)
        if not end_time:
            logger.debug(f"[Scanner] 만기 파싱 실패: '{question[:50]}'")
            return None

        # 남은 시간 계산
        duration_sec = end_time - time.time()
        duration_min = duration_sec / 60

        # 1분 미만 (이미 만료됨) 제외
        if duration_min < 1:
            return None

        # 30일(43200분) 초과는 가격 변동 영향이 너무 작아 제외
        if duration_min > 43200:
            return None

        # 토큰 ID 추출
        yes_token, no_token = self._extract_tokens(market)
        if not yes_token or not no_token:
            logger.debug(f"[Scanner] 토큰 추출 실패: '{question[:50]}'")
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
        for key in ["endDate", "endDateIso", "end_date", "expiresAt",
                    "resolveDate", "endTime", "expiry"]:
            val = market.get(key)
            if not val:
                continue
            try:
                if isinstance(val, (int, float)) and val > 1_000_000_000:
                    return float(val)
                val_str = str(val).replace("Z", "+00:00")
                dt = datetime.datetime.fromisoformat(val_str)
                return dt.timestamp()
            except Exception:
                continue
        return None

    def _extract_tokens(self, market: Dict):
        import json
        yes_token = ""
        no_token = ""

        # 방법 1: clobTokenIds 배열
        tokens = market.get("clobTokenIds", [])
        if isinstance(tokens, str):
            try:
                tokens = json.loads(tokens)
            except Exception:
                tokens = []
        if len(tokens) >= 2:
            return str(tokens[0]), str(tokens[1])

        # 방법 2: outcomes 배열
        outcomes = market.get("outcomes", [])
        if isinstance(outcomes, str):
            try:
                outcomes = json.loads(outcomes)
            except Exception:
                outcomes = []
        for outcome in outcomes:
            if isinstance(outcome, dict):
                name = outcome.get("outcome", outcome.get("name", "")).upper()
                tid = str(outcome.get("tokenId", outcome.get("token_id", "")))
                if "YES" in name:
                    yes_token = tid
                elif "NO" in name:
                    no_token = tid

        # 방법 3: 개별 필드
        if not yes_token:
            yes_token = str(market.get("yesTokenId", market.get("yes_token_id", "")))
            no_token  = str(market.get("noTokenId",  market.get("no_token_id",  "")))

        return yes_token, no_token

    def _expire_old_contracts(self):
        expired = [
            mid for mid, c in self.active_contracts.items()
            if not c.is_active
        ]
        for mid in expired:
            c = self.active_contracts.pop(mid)
            logger.debug(f"[Scanner] 만기 제거: {c.symbol} {c.direction} '{c.question[:40]}'")

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
            contract.yes_odds      = book["mid"]
            contract.no_odds       = 1.0 - book["mid"]
            # bid/ask 저장 → 실거래 주문 가격으로 사용
            contract.yes_bid       = book["best_bid"]   # SELL YES 시 사용
            contract.yes_ask       = book["best_ask"]   # BUY YES 시 사용
            # 스프레드 > 30%p = 미개장 계약 → 유동성 0 처리 (pre-market 필터)
            _spread = contract.yes_ask - contract.yes_bid
            contract.liquidity_usd = book["liquidity_usd"] if _spread <= 0.30 else 0.0
            contract.last_updated  = time.time()

    def get_contracts_for(self, symbol: str) -> List[MarketContract]:
        return [
            c for c in self.active_contracts.values()
            if c.symbol == symbol and c.is_active
        ]

    def get_best_contract(self, symbol: str, direction: str) -> Optional[MarketContract]:
        """
        주어진 심볼/방향에 맞는 최적 계약 반환
        - 방향 일치 필수 (UP 신호 → UP 계약, DOWN 신호 → DOWN 계약)
        - 유동성 기준 정렬 (높을수록 우선)
        - 유동성 없어도 계약이 있으면 반환 (실거래 진입은 유동성 체크 별도)
        """
        candidates = [
            c for c in self.active_contracts.values()
            if c.symbol == symbol
            and c.direction == direction
            and c.is_active
        ]
        if not candidates:
            # 방향 매칭 안 되면 반대 방향 NO 토큰으로 대응 가능한 계약 탐색
            # (예: DOWN 신호인데 UP 계약만 있으면, UP 계약의 NO 토큰 매수)
            candidates = [
                c for c in self.active_contracts.values()
                if c.symbol == symbol and c.is_active
            ]
            if not candidates:
                return None

        # 유동성 높은 순 정렬, 유동성 없으면 만기 짧은 순 (더 민감)
        candidates.sort(
            key=lambda c: (c.liquidity_usd, -c.time_remaining_sec),
            reverse=True
        )
        return candidates[0]

    def summary(self) -> str:
        total = len(self.active_contracts)
        counts = {}
        for c in self.active_contracts.values():
            counts[c.symbol] = counts.get(c.symbol, 0) + 1
        parts = ", ".join(f"{sym}:{cnt}" for sym, cnt in sorted(counts.items()))
        return f"활성계약: {total}개 ({parts})"

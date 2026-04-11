"""
Polymarket 공개 API 클라이언트
페이퍼 트레이딩 단계에서는 공개 API만 사용 (인증 불필요)
실거래 전환 시 CLOB API 인증 추가
"""
import asyncio
import aiohttp
import logging
import time
from typing import Dict, List, Optional

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import config

logger = logging.getLogger(__name__)

TIMEOUT = aiohttp.ClientTimeout(total=15)

# 브라우저처럼 보이도록 헤더 설정 (봇 차단 우회)
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://polymarket.com",
    "Referer": "https://polymarket.com/",
}


class PolymarketClient:
    """Polymarket 공개 API 래퍼"""

    def __init__(self):
        self._session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self._session = aiohttp.ClientSession(timeout=TIMEOUT, headers=HEADERS)
        return self

    async def __aexit__(self, *args):
        if self._session:
            await self._session.close()

    async def get_session(self) -> aiohttp.ClientSession:
        if not self._session or self._session.closed:
            self._session = aiohttp.ClientSession(timeout=TIMEOUT, headers=HEADERS)
        return self._session

    # ─────────────────────────────────────────
    # 시장 목록 조회
    # ─────────────────────────────────────────
    async def get_markets(self, tag: str = "crypto") -> List[Dict]:
        """태그/검색어 기반 시장 조회"""
        results = []
        seen_ids = set()
        session = await self.get_session()

        for param_name in ["tag_slug", "search"]:
            try:
                url = f"{config.POLYMARKET_GAMMA_URL}/markets"
                params = {
                    "active": "true",
                    "closed": "false",
                    param_name: tag,
                    "limit": 100,
                }
                async with session.get(url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        markets = data if isinstance(data, list) else data.get("markets", data.get("data", []))
                        for m in markets:
                            mid = m.get("conditionId") or m.get("id") or ""
                            if mid and mid not in seen_ids:
                                seen_ids.add(mid)
                                results.append(m)
                    else:
                        logger.warning(f"[API] get_markets HTTP {resp.status} ({param_name}={tag})")
            except Exception as e:
                logger.warning(f"[API] get_markets 오류 ({param_name}={tag}): {e}")

        return results

    async def get_all_crypto_markets(self) -> List[Dict]:
        """
        폴리마켓 전체 활성 시장 조회 → 크립토 필터
        1단계: 전체 활성 시장 페이지네이션
        2단계: 크립토 키워드 검색 보완
        3단계: CLOB API 보완
        """
        session = await self.get_session()
        results = []
        seen_ids = set()

        # ── 1단계: Gamma API 페이지네이션 ──────────────────────────────
        url = f"{config.POLYMARKET_GAMMA_URL}/markets"
        offset = 0
        limit  = 100
        page_count = 0

        while page_count < 20:   # 최대 2000개 (무한루프 방지)
            params = {
                "active": "true",
                "closed": "false",
                "limit":  limit,
                "offset": offset,
            }
            try:
                async with session.get(url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if isinstance(data, list):
                            markets = data
                        elif isinstance(data, dict):
                            markets = data.get("markets", data.get("data", []))
                        else:
                            markets = []

                        if not markets:
                            logger.debug(f"[API] 페이지네이션 끝 (offset={offset})")
                            break

                        added = 0
                        for m in markets:
                            mid = m.get("conditionId") or m.get("id") or ""
                            if mid and mid not in seen_ids:
                                seen_ids.add(mid)
                                results.append(m)
                                added += 1

                        logger.debug(f"[API] offset={offset}: {len(markets)}개 수신, {added}개 신규")

                        if len(markets) < limit:
                            break   # 마지막 페이지
                        offset += limit
                        page_count += 1
                    elif resp.status == 403:
                        logger.warning(f"[API] Gamma API 403 Forbidden - 헤더 문제 가능성")
                        break
                    else:
                        logger.warning(f"[API] Gamma API HTTP {resp.status}")
                        break
            except Exception as e:
                logger.warning(f"[API] Gamma 페이지네이션 오류: {e}")
                break
            await asyncio.sleep(0.1)

        logger.info(f"[API] Gamma 페이지네이션: {len(results)}개 수집")

        # ── 2단계: /events 엔드포인트 크립토 시장 탐색 ─────────────────
        event_markets = await self._get_event_markets(seen_ids)
        results.extend(event_markets)
        if event_markets:
            logger.info(f"[API] events 엔드포인트: {len(event_markets)}개 추가")

        # ── 3단계: CLOB API 보완 (1000개 이상 페이지네이션) ──────────
        clob_markets = await self._get_clob_markets()
        clob_added = 0
        for m in clob_markets:
            mid = m.get("condition_id") or m.get("conditionId") or ""
            if mid and mid not in seen_ids:
                seen_ids.add(mid)
                results.append(self._normalize_clob_market(m))
                clob_added += 1

        logger.info(f"[API] 전체 크립토 시장 최종: {len(results)}개 (CLOB {clob_added}개 포함)")
        return results

    async def _get_event_markets(self, seen_ids: set) -> List[Dict]:
        """
        /events 엔드포인트로 크립토 이벤트 그룹 탐색
        각 이벤트 안에 여러 가격 예측 계약이 묶여 있는 경우 포함
        """
        session = await self.get_session()
        results = []
        url = f"{config.POLYMARKET_GAMMA_URL}/events"

        crypto_searches = [
            "bitcoin", "ethereum", "crypto price",
            "btc above", "btc below", "eth above", "eth below",
            "solana price", "xrp price", "doge",
        ]

        for search in crypto_searches:
            try:
                params = {
                    "active":  "true",
                    "closed":  "false",
                    "limit":   20,
                    "search":  search,
                }
                async with session.get(url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        events = data if isinstance(data, list) else data.get("events", data.get("data", []))
                        for event in events:
                            # 이벤트 안에 포함된 markets 배열 파싱
                            for m in event.get("markets", []):
                                mid = m.get("conditionId") or m.get("id") or ""
                                if mid and mid not in seen_ids:
                                    seen_ids.add(mid)
                                    results.append(m)
                    elif resp.status != 404:
                        logger.debug(f"[API] events search HTTP {resp.status}")
            except Exception as e:
                logger.debug(f"[API] events '{search}' 오류: {e}")
            await asyncio.sleep(0.05)

        return results

    async def get_event_by_slug(self, slug: str) -> Optional[Dict]:
        """
        슬러그로 이벤트 조회 (정답 URL: GET /events/slug/{slug})
        예: btc-updown-5m-1748835000
        """
        session = await self.get_session()
        url = f"{config.POLYMARKET_GAMMA_URL}/events/slug/{slug}"
        try:
            async with session.get(url) as resp:
                if resp.status == 200:
                    return await resp.json()
                elif resp.status == 404:
                    return None
                else:
                    logger.debug(f"[API] get_event_by_slug HTTP {resp.status} ({slug})")
                    return None
        except Exception as e:
            logger.debug(f"[API] get_event_by_slug 오류 ({slug}): {e}")
            return None

    async def get_updown_markets(self) -> List[Dict]:
        """
        BTC/ETH/SOL/XRP 5분/1시간 Up-Down 계약을 슬러그로 직접 조회
        슬러그 패턴: {coin}-updown-{timeframe}-{round_start}
        round_start = (now // interval_sec) * interval_sec
        """
        session = await self.get_session()
        results = []
        seen_ids = set()
        now = int(time.time())

        # 코인 × 타임프레임 × 현재/이전/다음 라운드
        coins = ["btc", "eth", "sol", "xrp", "bnb", "doge"]
        timeframes = [
            ("5m",  300),
            ("1h",  3600),
            ("24h", 86400),
        ]

        slugs_to_try = []
        for coin in coins:
            for tf_label, tf_sec in timeframes:
                round_start = (now // tf_sec) * tf_sec
                for offset in [-1, 0, 1, 2]:   # 이전/현재/다음/그다음 라운드
                    ts = round_start + offset * tf_sec
                    slugs_to_try.append(f"{coin}-updown-{tf_label}-{ts}")

        logger.info(f"[API] 슬러그 직접 조회: {len(slugs_to_try)}개 시도")
        found = 0

        for slug in slugs_to_try:
            event = await self.get_event_by_slug(slug)
            if event:
                for m in event.get("markets", []):
                    mid = m.get("conditionId") or m.get("id") or ""
                    if mid and mid not in seen_ids:
                        seen_ids.add(mid)
                        results.append(m)
                        found += 1
                        logger.info(f"[API] ✓ 슬러그 발견: {slug}")
            await asyncio.sleep(0.05)

        if found:
            logger.info(f"[API] 슬러그 직접 조회 완료: {found}개 계약 발견")
        return results

    async def _get_clob_markets(self) -> List[Dict]:
        """CLOB API에서 활성 시장 조회 (페이지네이션)"""
        session = await self.get_session()
        results = []
        next_cursor = ""

        for _ in range(20):   # 최대 2000개
            try:
                url = f"{config.POLYMARKET_CLOB_URL}/markets"
                params: dict = {"active": "true", "limit": 100}
                if next_cursor:
                    params["next_cursor"] = next_cursor

                async with session.get(url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if isinstance(data, list):
                            markets = data
                            next_cursor = ""
                        elif isinstance(data, dict):
                            markets = data.get("data", [])
                            next_cursor = data.get("next_cursor", "")
                        else:
                            break

                        results.extend(markets)
                        logger.debug(f"[API] CLOB {len(markets)}개 수신")

                        if not next_cursor or not markets:
                            break
                    elif resp.status == 403:
                        logger.warning("[API] CLOB API 403 Forbidden")
                        break
                    else:
                        logger.warning(f"[API] CLOB HTTP {resp.status}")
                        break
            except Exception as e:
                logger.debug(f"[API] CLOB 조회 오류: {e}")
                break
            await asyncio.sleep(0.1)

        return results

    def _normalize_clob_market(self, clob_market: Dict) -> Dict:
        """CLOB API 마켓 형식 → Gamma 형식으로 변환"""
        tokens = clob_market.get("tokens", [])
        yes_token = ""
        no_token  = ""
        for t in tokens:
            outcome = t.get("outcome", "").upper()
            if outcome == "YES":
                yes_token = t.get("token_id", "")
            elif outcome == "NO":
                no_token  = t.get("token_id", "")

        return {
            "conditionId":   clob_market.get("condition_id", ""),
            "question":      clob_market.get("question", ""),
            "endDate":       clob_market.get("end_date_iso", clob_market.get("end_date", "")),
            "clobTokenIds":  [yes_token, no_token] if yes_token else [],
            "active":        clob_market.get("active", True),
            "closed":        clob_market.get("closed", False),
            "liquidity":     clob_market.get("liquidity", 0),
        }

    # ─────────────────────────────────────────
    # 오더북 조회 (현재 오즈)
    # ─────────────────────────────────────────
    async def get_orderbook(self, token_id: str) -> Optional[Dict]:
        """특정 계약의 현재 오더북 조회"""
        session = await self.get_session()
        url = f"{config.POLYMARKET_CLOB_URL}/book"
        params = {"token_id": token_id}
        try:
            async with session.get(url, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return self._parse_orderbook(data)
                else:
                    return None
        except Exception as e:
            logger.debug(f"[Polymarket] 오더북 조회 실패 ({token_id[:8]}...): {e}")
            return None

    def _parse_orderbook(self, raw: Dict) -> Dict:
        """오더북 파싱 → 최우선 매수/매도호가 추출"""
        bids = raw.get("bids", [])
        asks = raw.get("asks", [])

        best_bid = float(bids[0]["price"]) if bids else 0.0
        best_ask = float(asks[0]["price"]) if asks else 1.0
        mid = (best_bid + best_ask) / 2 if (best_bid and best_ask) else 0.5

        bid_liquidity = sum(float(b["size"]) for b in bids[:5])
        ask_liquidity = sum(float(a["size"]) for a in asks[:5])
        total_liquidity_usd = (bid_liquidity + ask_liquidity) * mid

        return {
            "best_bid":      best_bid,
            "best_ask":      best_ask,
            "mid":           mid,
            "spread":        best_ask - best_bid,
            "liquidity_usd": total_liquidity_usd,
            "bids":          bids[:10],
            "asks":          asks[:10],
        }

    async def get_market_info(self, condition_id: str) -> Optional[Dict]:
        """특정 시장의 상세 정보 조회"""
        session = await self.get_session()
        url = f"{config.POLYMARKET_CLOB_URL}/markets/{condition_id}"
        try:
            async with session.get(url) as resp:
                if resp.status == 200:
                    return await resp.json()
                return None
        except Exception as e:
            logger.debug(f"[Polymarket] 시장 정보 조회 실패: {e}")
            return None

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()

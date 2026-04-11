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

TIMEOUT = aiohttp.ClientTimeout(total=10)


class PolymarketClient:
    """Polymarket 공개 API 래퍼"""

    def __init__(self):
        self._session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self._session = aiohttp.ClientSession(timeout=TIMEOUT)
        return self

    async def __aexit__(self, *args):
        if self._session:
            await self._session.close()

    async def get_session(self) -> aiohttp.ClientSession:
        if not self._session or self._session.closed:
            self._session = aiohttp.ClientSession(timeout=TIMEOUT)
        return self._session

    # ─────────────────────────────────────────
    # 시장 목록 조회 (여러 방법 시도)
    # ─────────────────────────────────────────
    async def get_markets(self, tag: str = "crypto") -> List[Dict]:
        """활성 예측 시장 목록 조회 - 여러 파라미터 조합 시도"""
        results = []
        seen_ids = set()

        session = await self.get_session()

        # 방법 1: tag_slug 파라미터 (폴리마켓 실제 태그 슬러그)
        for param_name in ["tag_slug", "tag", "tags"]:
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
                        markets = data if isinstance(data, list) else data.get("markets", [])
                        for m in markets:
                            mid = m.get("conditionId") or m.get("id") or ""
                            if mid and mid not in seen_ids:
                                seen_ids.add(mid)
                                results.append(m)
            except Exception as e:
                logger.debug(f"[API] {param_name}={tag} 조회 오류: {e}")

        # 방법 2: 검색어로 직접 조회
        try:
            url = f"{config.POLYMARKET_GAMMA_URL}/markets"
            params = {
                "active": "true",
                "closed": "false",
                "search": tag,
                "limit": 100,
            }
            async with session.get(url, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    markets = data if isinstance(data, list) else data.get("markets", [])
                    for m in markets:
                        mid = m.get("conditionId") or m.get("id") or ""
                        if mid and mid not in seen_ids:
                            seen_ids.add(mid)
                            results.append(m)
        except Exception as e:
            logger.debug(f"[API] search={tag} 조회 오류: {e}")

        return results

    async def get_all_crypto_markets(self) -> List[Dict]:
        """
        폴리마켓 Crypto 섹션 전체 시장 조회
        5Min / 15Min / 1Hour 등 단기 계약 포함
        """
        session = await self.get_session()
        results = []
        seen_ids = set()

        # 폴리마켓 Crypto 카테고리 직접 쿼리
        search_queries = [
            {"tag_slug": "crypto"},
            {"tag_slug": "bitcoin"},
            {"tag_slug": "ethereum"},
            {"tag_slug": "cryptocurrency"},
            {"category": "crypto"},
            {"search": "bitcoin price"},
            {"search": "ethereum price"},
            {"search": "btc above"},
            {"search": "btc below"},
            {"search": "eth above"},
            {"search": "eth below"},
            {"search": "will bitcoin"},
            {"search": "will ethereum"},
            {"search": "sol above"},
            {"search": "xrp above"},
        ]

        url = f"{config.POLYMARKET_GAMMA_URL}/markets"

        for query_params in search_queries:
            try:
                params = {
                    "active": "true",
                    "closed": "false",
                    "limit": 100,
                    **query_params,
                }
                async with session.get(url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        markets = data if isinstance(data, list) else data.get("markets", [])
                        for m in markets:
                            mid = m.get("conditionId") or m.get("id") or ""
                            if mid and mid not in seen_ids:
                                seen_ids.add(mid)
                                results.append(m)
                        if markets:
                            logger.debug(f"[API] {query_params}: {len(markets)}개 발견")
            except Exception as e:
                logger.debug(f"[API] {query_params} 오류: {e}")
            await asyncio.sleep(0.1)  # rate limit

        # CLOB API에서도 시장 목록 조회
        clob_markets = await self._get_clob_markets()
        for m in clob_markets:
            mid = m.get("condition_id") or m.get("conditionId") or ""
            if mid and mid not in seen_ids:
                seen_ids.add(mid)
                # CLOB 형식을 Gamma 형식으로 변환
                results.append(self._normalize_clob_market(m))

        logger.info(f"[API] 전체 크립토 시장 조회: {len(results)}개")
        return results

    async def _get_clob_markets(self) -> List[Dict]:
        """CLOB API에서 활성 시장 조회"""
        session = await self.get_session()
        results = []
        try:
            url = f"{config.POLYMARKET_CLOB_URL}/markets"
            params = {"active": "true", "limit": 100}
            async with session.get(url, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    markets = data if isinstance(data, list) else data.get("data", [])
                    results = markets if isinstance(markets, list) else []
        except Exception as e:
            logger.debug(f"[API] CLOB 시장 조회 오류: {e}")
        return results

    def _normalize_clob_market(self, clob_market: Dict) -> Dict:
        """CLOB API 마켓 형식 → Gamma 형식으로 변환"""
        tokens = clob_market.get("tokens", [])
        yes_token = ""
        no_token = ""
        for t in tokens:
            outcome = t.get("outcome", "").upper()
            if outcome == "YES":
                yes_token = t.get("token_id", "")
            elif outcome == "NO":
                no_token = t.get("token_id", "")

        return {
            "conditionId": clob_market.get("condition_id", ""),
            "question": clob_market.get("question", ""),
            "endDate": clob_market.get("end_date_iso", ""),
            "clobTokenIds": [yes_token, no_token] if yes_token else [],
            "active": clob_market.get("active", True),
            "closed": clob_market.get("closed", False),
            "liquidity": clob_market.get("liquidity", 0),
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
            "best_bid": best_bid,
            "best_ask": best_ask,
            "mid": mid,
            "spread": best_ask - best_bid,
            "liquidity_usd": total_liquidity_usd,
            "bids": bids[:10],
            "asks": asks[:10],
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

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

# 타임아웃 설정
TIMEOUT = aiohttp.ClientTimeout(total=5)


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
    # 시장 목록 조회
    # ─────────────────────────────────────────
    async def get_markets(self, tag: str = "crypto") -> List[Dict]:
        """
        활성 예측 시장 목록 조회
        tag: 필터 태그 ('crypto', 'bitcoin', 'ethereum' 등)
        """
        session = await self.get_session()
        url = f"{config.POLYMARKET_GAMMA_URL}/markets"
        params = {
            "active": "true",
            "closed": "false",
            "tag": tag,
            "limit": 100,
        }
        try:
            async with session.get(url, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data if isinstance(data, list) else data.get("markets", [])
                else:
                    logger.warning(f"[Polymarket] 시장 목록 오류: HTTP {resp.status}")
                    return []
        except Exception as e:
            logger.error(f"[Polymarket] 시장 목록 조회 실패: {e}")
            return []

    # ─────────────────────────────────────────
    # 오더북 조회 (현재 오즈)
    # ─────────────────────────────────────────
    async def get_orderbook(self, token_id: str) -> Optional[Dict]:
        """
        특정 계약의 현재 오더북 조회
        token_id: Polymarket 계약 토큰 ID
        반환: {"best_bid": float, "best_ask": float, "spread": float}
        """
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

        # 유동성 계산 (상위 5레벨 합산)
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

    # ─────────────────────────────────────────
    # 시장 정보 조회
    # ─────────────────────────────────────────
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

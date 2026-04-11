"""
Binance WebSocket 실시간 가격 피드
10개 코인 체결가를 50ms 이내 수신
BTC, ETH, SOL, BNB, XRP, AVAX, LINK, MATIC, DOT, DOGE
"""
import asyncio
import json
import time
import logging
from collections import deque
from typing import Callable, Dict, Optional
import websockets

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import config

logger = logging.getLogger(__name__)


class PriceBar:
    """30초 가격 이력 관리"""
    def __init__(self, window_sec: int = 30):
        self.window_sec = window_sec
        self._data: deque = deque()  # (timestamp, price)

    def add(self, price: float, ts: Optional[float] = None):
        ts = ts or time.time()
        self._data.append((ts, price))
        self._cleanup(ts)

    def _cleanup(self, now: float):
        cutoff = now - self.window_sec
        while self._data and self._data[0][0] < cutoff:
            self._data.popleft()

    @property
    def current_price(self) -> Optional[float]:
        return self._data[-1][1] if self._data else None

    @property
    def oldest_price(self) -> Optional[float]:
        return self._data[0][1] if self._data else None

    def price_change_pct(self) -> Optional[float]:
        """30초 가격 변동률 (%) 반환"""
        if len(self._data) < 2:
            return None
        oldest = self._data[0][1]
        current = self._data[-1][1]
        if oldest == 0:
            return None
        return (current - oldest) / oldest * 100


class BinanceFeed:
    """
    Binance WebSocket 가격 피드
    - BTC/ETH 실시간 체결가 수신
    - 30초 롤링 가격 변동률 계산
    - 연결 끊김 시 자동 재연결
    """

    def __init__(self, on_price_update: Callable):
        """
        on_price_update: 가격 업데이트 콜백
            인자: (symbol: str, price: float, change_pct: float, timestamp: float)
        """
        self.on_price_update = on_price_update
        # 모든 대상 심볼에 대해 PriceBar 생성
        self.bars: Dict[str, PriceBar] = {
            sym: PriceBar(config.PRICE_WINDOW_SEC) for sym in config.TARGET_SYMBOLS
        }
        # 바이낸스 스트림 심볼 → 내부 심볼 매핑
        self._symbol_map: Dict[str, str] = {
            "BTCUSDT": "BTC",  "ETHUSDT": "ETH",  "SOLUSDT": "SOL",
            "BNBUSDT": "BNB",  "XRPUSDT": "XRP",  "AVAXUSDT": "AVAX",
            "LINKUSDT": "LINK","MATICUSDT":"MATIC","DOTUSDT": "DOT",
            "DOGEUSDT": "DOGE",
        }
        self._running = False
        self._ws = None
        self.last_prices: Dict[str, float] = {}

    async def start(self):
        """WebSocket 연결 시작 (자동 재연결 포함)"""
        self._running = True
        retry_delay = 1
        max_retry_delay = 30

        while self._running:
            try:
                await self._connect()
                retry_delay = 1  # 성공 시 딜레이 리셋
            except Exception as e:
                logger.warning(f"[Binance] 연결 오류: {e} → {retry_delay}초 후 재연결")
                await asyncio.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, max_retry_delay)

    async def stop(self):
        self._running = False
        if self._ws:
            await self._ws.close()

    async def _connect(self):
        streams = "/".join(config.BINANCE_STREAMS)
        url = f"{config.BINANCE_WS_URL}?streams={streams}"

        logger.info(f"[Binance] WebSocket 연결: {url}")

        async with websockets.connect(
            url,
            ping_interval=20,
            ping_timeout=10,
            close_timeout=5,
        ) as ws:
            self._ws = ws
            logger.info("[Binance] WebSocket 연결 성공 ✓")

            async for raw in ws:
                if not self._running:
                    break
                try:
                    await self._handle_message(raw)
                except Exception as e:
                    logger.error(f"[Binance] 메시지 처리 오류: {e}")

    async def _handle_message(self, raw: str):
        data = json.loads(raw)

        # 멀티 스트림 포맷: {"stream": "btcusdt@trade", "data": {...}}
        if "stream" in data:
            stream = data["stream"]
            payload = data["data"]
        else:
            payload = data
            stream = ""

        if "@trade" not in stream:
            return

        # 심볼 파싱 (BTCUSDT → BTC)
        symbol_raw = payload.get("s", "").upper()
        symbol = self._symbol_map.get(symbol_raw)
        if not symbol:
            return

        price = float(payload["p"])   # 체결가
        ts = payload.get("T", time.time() * 1000) / 1000  # 타임스탬프(초)

        bar = self.bars[symbol]
        bar.add(price, ts)
        self.last_prices[symbol] = price

        change_pct = bar.price_change_pct()

        if change_pct is not None:
            await self.on_price_update(symbol, price, change_pct, ts)

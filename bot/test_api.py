"""
Polymarket 최신 이벤트 + Series 마켓 탐색
실행: python test_api.py
"""
import asyncio
import aiohttp

GAMMA_URL = "https://gamma-api.polymarket.com"
CLOB_URL  = "https://clob.polymarket.com"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://polymarket.com",
    "Referer": "https://polymarket.com/crypto",
}

COIN  = ["bitcoin","btc","ethereum","eth","solana","xrp","bnb","avax","doge"]
PRICE = ["above","below","hit","reach","$","price","up or down","up","down","range","minute"]


async def main():
    timeout = aiohttp.ClientTimeout(total=20)
    async with aiohttp.ClientSession(timeout=timeout, headers=HEADERS) as session:

        print("=" * 60)
        print("최신 이벤트 + Series 마켓 탐색")
        print("=" * 60)

        # ── 1. Events 최신순 (startDate 내림차순) ─────────────────────
        print("\n[1] Events 최신순 top-100 중 크립토")
        for order_field in ["startDate", "createdAt", "updatedAt"]:
            try:
                url = f"{GAMMA_URL}/events"
                params = {
                    "limit": 100,
                    "order": order_field,
                    "ascending": "false",
                    "active": "true",
                }
                async with session.get(url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        events = data if isinstance(data, list) else data.get("events", data.get("data", []))
                        crypto = [
                            ev for ev in events
                            if any(k in (ev.get("title","") or "").lower() for k in COIN)
                            and any(k in (ev.get("title","") or "").lower() for k in PRICE)
                        ]
                        print(f"\n  order={order_field}: {len(events)}개 → 크립토 가격: {len(crypto)}개")
                        for ev in crypto[:5]:
                            print(f"    [{ev.get('startDate','?')[:10]} ~ {ev.get('endDate','?')[:10]}] {ev.get('title','')[:55]}")
                            ms = ev.get("markets", [])
                            for m in ms[:2]:
                                print(f"      Q: {m.get('question','')[:55]}")
                                print(f"         tokens: {m.get('clobTokenIds',[])[:1]}")
                    else:
                        print(f"  order={order_field}: HTTP {resp.status}")
            except Exception as e:
                print(f"  오류: {e}")

        # ── 2. /markets 최신순 (acceptingOrders, 최신) ───────────────
        print("\n[2] /markets 최신 100개 (acceptingOrders=true, 최신순)")
        for order_field in ["startDate", "createdAt", "updatedAt"]:
            try:
                url = f"{GAMMA_URL}/markets"
                params = {
                    "limit": 100,
                    "order": order_field,
                    "ascending": "false",
                    "accepting_orders": "true",
                }
                async with session.get(url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        markets = data if isinstance(data, list) else data.get("markets", data.get("data", []))
                        crypto = [
                            m for m in markets
                            if any(k in (m.get("question","") or "").lower() for k in COIN)
                            and any(k in (m.get("question","") or "").lower() for k in PRICE)
                        ]
                        print(f"\n  order={order_field}: {len(markets)}개 → 크립토 가격: {len(crypto)}개")
                        for m in crypto[:5]:
                            q = m.get("question","")[:60]
                            end = m.get("endDateIso", m.get("endDate","?"))[:16]
                            print(f"    [{end}] {q}")
                            print(f"      tokens: {m.get('clobTokenIds',[])[:1]}")
            except Exception as e:
                print(f"  오류: {e}")

        # ── 3. Series / GMP 마켓 탐색 ────────────────────────────────
        print("\n[3] Series/GMP 관련 엔드포인트 탐색")
        for path in [
            "/series",
            "/markets/series",
            "/markets?show_gmp_series=true",
            "/markets?series=true",
            "/markets?type=series",
            "/markets?competitive=true",
            "/markets?rfq_enabled=true",
        ]:
            try:
                url = f"{GAMMA_URL}{path}" if not path.startswith("/markets?") else f"{GAMMA_URL}/markets?{path.split('?',1)[1]}"
                params = {}
                if "?" not in path:
                    url = f"{GAMMA_URL}{path}"
                async with session.get(url) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        count = len(data) if isinstance(data, list) else len(data.get("markets", data.get("data", data.get("series", []))))
                        print(f"  {path}: HTTP 200, {count}개")
                        sample = data[:2] if isinstance(data, list) else (data.get("markets", data.get("data", data.get("series", [])))[:2])
                        for m in sample:
                            q = m.get("question", m.get("title", str(m)[:40]))[:55]
                            print(f"    - {q}")
                    else:
                        print(f"  {path}: HTTP {resp.status}")
            except Exception as e:
                print(f"  {path}: 오류 {e}")

        # ── 4. 다른 베이스 URL 시도 ───────────────────────────────────
        print("\n[4] 다른 API 엔드포인트 시도")
        alt_urls = [
            "https://polymarket.com/api/markets?category=crypto&limit=5",
            "https://data-api.polymarket.com/markets?limit=5",
            "https://strapi.polymarket.com/markets?_limit=5",
            f"{GAMMA_URL}/markets?section=crypto&limit=10",
            f"{GAMMA_URL}/markets?show_gmp_outcome=true&limit=10",
        ]
        for alt_url in alt_urls:
            try:
                async with session.get(alt_url) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        print(f"  ✓ {alt_url[:55]}: HTTP 200")
                        sample = data[:1] if isinstance(data, list) else [data]
                        for m in sample:
                            if isinstance(m, dict):
                                print(f"    키: {list(m.keys())[:8]}")
                    elif resp.status != 404:
                        print(f"  {alt_url[:55]}: HTTP {resp.status}")
            except Exception as e:
                print(f"  {alt_url[:55]}: {type(e).__name__}")

        print("\n" + "=" * 60)
        print("만약 위에서 아무것도 안 나왔다면:")
        print("→ 저 마켓들은 공개 API로 접근 불가능한 내부 시스템 사용")
        print("→ 폴리마켓 웹사이트 전용 (봇 거래 불가)")
        print("=" * 60)


asyncio.run(main())

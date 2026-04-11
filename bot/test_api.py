"""
Polymarket 타겟 마켓 직접 검색
실행: python test_api.py
"""
import asyncio
import aiohttp
import json

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
    "Referer": "https://polymarket.com/",
}


async def search_gamma(session, keyword, limit=10, active_filter=True):
    url = f"{GAMMA_URL}/markets"
    params = {"search": keyword, "limit": limit}
    if active_filter:
        params["active"] = "true"
        params["closed"] = "false"
    async with session.get(url, params=params) as resp:
        if resp.status == 200:
            data = await resp.json()
            return data if isinstance(data, list) else data.get("markets", data.get("data", []))
        return []


async def search_gamma_events(session, keyword, limit=20):
    url = f"{GAMMA_URL}/events"
    params = {"search": keyword, "limit": limit}
    async with session.get(url, params=params) as resp:
        if resp.status == 200:
            data = await resp.json()
            return data if isinstance(data, list) else data.get("events", data.get("data", []))
        return []


async def main():
    timeout = aiohttp.ClientTimeout(total=20)
    async with aiohttp.ClientSession(timeout=timeout, headers=HEADERS) as session:

        print("=" * 60)
        print("Polymarket 타겟 마켓 직접 검색")
        print("=" * 60)

        # ── 1. 화면에 보이는 마켓 직접 검색 ─────────────────────────
        print("\n[1] 화면에 보인 마켓 직접 검색")

        targets = [
            "BTC 5 Minute",
            "bitcoin above april",
            "Bitcoin above",
            "bitcoin price april",
            "what price will bitcoin hit",
            "bitcoin hit april",
            "ethereum above april",
        ]

        for kw in targets:
            # active 필터 없이 검색
            markets = await search_gamma(session, kw, limit=5, active_filter=False)
            if markets:
                print(f"\n  '{kw}' → {len(markets)}개 발견:")
                for m in markets[:3]:
                    q = (m.get("question","") or m.get("title",""))[:65]
                    end = m.get("endDateIso", m.get("endDate","?"))[:16]
                    act = m.get("active","?")
                    clo = m.get("closed","?")
                    tok = m.get("clobTokenIds", [])
                    print(f"    [{end}] active={act} closed={clo} | {q}")
                    print(f"      tokens: {tok[:1]}")
            else:
                print(f"  '{kw}' → 0개")

        # ── 2. Events에서 직접 검색 ──────────────────────────────────
        print("\n[2] Events 직접 검색")

        event_targets = [
            "BTC 5 Minute",
            "bitcoin above",
            "bitcoin price april",
            "crypto price",
            "btc above",
        ]

        for kw in event_targets:
            events = await search_gamma_events(session, kw, limit=5)
            if events:
                print(f"\n  events '{kw}' → {len(events)}개:")
                for ev in events[:2]:
                    print(f"    title: {ev.get('title','')[:60]}")
                    print(f"    slug:  {ev.get('slug','')[:50]}")
                    ms = ev.get("markets", [])
                    print(f"    markets 수: {len(ms)}")
                    for m in ms[:3]:
                        q = (m.get("question","") or m.get("title",""))[:60]
                        end = m.get("endDateIso", m.get("endDate","?"))[:16]
                        print(f"      [{end}] {q}")
                        print(f"        tokens: {m.get('clobTokenIds',[])[:1]}")
            else:
                print(f"  events '{kw}' → 0개")

        # ── 3. Gamma API active=false 포함 전체 최신 100개 ────────────
        print("\n[3] Gamma API 최신 100개 (active 필터 없음) - 크립토만")
        try:
            url = f"{GAMMA_URL}/markets"
            params = {"limit": 100, "order": "createdAt", "ascending": "false"}
            async with session.get(url, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    markets = data if isinstance(data, list) else data.get("markets", data.get("data", []))
                    COIN = ["bitcoin","btc","ethereum","eth","solana","xrp","bnb","avax","doge"]
                    PRICE = ["above","below","hit","reach","$","price","up or down"]
                    crypto = [
                        m for m in markets
                        if any(k in (m.get("question","") or "").lower() for k in COIN)
                        and any(k in (m.get("question","") or "").lower() for k in PRICE)
                    ]
                    print(f"  총 {len(markets)}개 중 크립토 가격 관련: {len(crypto)}개")
                    for m in crypto[:10]:
                        q = (m.get("question",""))[:65]
                        end = m.get("endDateIso", m.get("endDate","?"))[:16]
                        act = m.get("active","?")
                        acc = m.get("acceptingOrders","?")
                        print(f"  [{end}] active={act} accepting={acc} | {q}")
                else:
                    print(f"  HTTP {resp.status}")
        except Exception as e:
            print(f"  오류: {e}")

        # ── 4. CLOB에서 accepting_orders=true 마켓만 ────────────────
        print("\n[4] CLOB accepting_orders 마켓 검색")
        COIN = ["bitcoin","btc","ethereum","eth","solana","xrp","bnb","avax","doge"]
        PRICE = ["above","below","hit","reach","$","price","up or down","up","down"]
        found = []
        next_cursor = ""

        for page in range(5):
            try:
                url = f"{CLOB_URL}/markets"
                p: dict = {"limit": 1000}
                if next_cursor:
                    p["next_cursor"] = next_cursor
                async with session.get(url, params=p) as resp:
                    if resp.status != 200:
                        break
                    data = await resp.json()
                    markets = data.get("data", data) if isinstance(data, dict) else data
                    next_cursor = data.get("next_cursor","") if isinstance(data, dict) else ""

                    for m in markets:
                        # accepting_orders 체크
                        if not m.get("accepting_orders", False):
                            continue
                        q = m.get("question","")
                        ql = q.lower()
                        if any(k in ql for k in COIN) and any(k in ql for k in PRICE):
                            found.append(m)

                    if not next_cursor or not markets:
                        break
            except Exception as e:
                print(f"  오류: {e}")
                break

        print(f"  accepting_orders=true 크립토 가격 계약: {len(found)}개")
        for m in found[:10]:
            q = m.get("question","")[:65]
            end = m.get("end_date_iso","?")[:16]
            tkns = m.get("tokens",[])
            print(f"  [{end}] {q}")
            if tkns:
                print(f"    YES token: {tkns[0].get('token_id','')[:25]}...")

        print("\n" + "=" * 60)


asyncio.run(main())

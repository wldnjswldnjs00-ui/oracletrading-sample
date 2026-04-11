"""
Polymarket 스크린샷 마켓 직접 탐색
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


async def main():
    timeout = aiohttp.ClientTimeout(total=20)
    async with aiohttp.ClientSession(timeout=timeout, headers=HEADERS) as session:

        print("=" * 60)
        print("Polymarket 스크린샷 마켓 탐색")
        print("=" * 60)

        # ── 1. 슬러그 직접 접근 ──────────────────────────────────────
        print("\n[1] 이벤트 슬러그 직접 접근")
        candidate_slugs = [
            "btc-5-minute-up-or-down",
            "bitcoin-5-minute",
            "btc-5-min",
            "bitcoin-above-april-12",
            "bitcoin-above-april",
            "bitcoin-price-on-april-12",
            "bitcoin-price-april-12",
            "bitcoin-price-april",
            "what-price-will-bitcoin-hit-on-april-11",
            "what-price-will-bitcoin-hit-april",
            "bitcoin-above",
            "btc-up-or-down-5-minutes",
            "btc-up-down-5-min",
        ]
        for slug in candidate_slugs:
            try:
                url = f"{GAMMA_URL}/events/{slug}"
                async with session.get(url) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        title = data.get("title", data.get("name", "?"))
                        ms = data.get("markets", [])
                        print(f"  ✓ {slug}")
                        print(f"    title: {title}")
                        print(f"    markets: {len(ms)}개")
                        for m in ms[:3]:
                            print(f"      - {m.get('question','')[:60]}")
                            print(f"        tokens: {m.get('clobTokenIds','')[:1]}")
                    # 404면 그냥 패스
            except Exception as e:
                pass

        # ── 2. Events 전체 페이지네이션 (필터 없음) ──────────────────
        print("\n[2] Events 전체 페이지네이션 (active 필터 없음)")
        all_events = []
        for offset in range(0, 500, 20):
            try:
                url = f"{GAMMA_URL}/events"
                params = {"limit": 20, "offset": offset}
                async with session.get(url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        evts = data if isinstance(data, list) else data.get("events", data.get("data", []))
                        all_events.extend(evts)
                        if len(evts) < 20:
                            break
            except:
                break

        COIN = ["bitcoin","btc","ethereum","eth","solana","xrp","bnb","avax","doge","crypto"]
        PRICE = ["above","below","hit","reach","$","price","up or down","up","down","range"]
        crypto_events = [
            ev for ev in all_events
            if any(k in (ev.get("title","") or "").lower() for k in COIN)
            and any(k in (ev.get("title","") or "").lower() for k in PRICE)
        ]
        print(f"  전체 이벤트: {len(all_events)}개 중 크립토 가격: {len(crypto_events)}개")
        for ev in crypto_events[:10]:
            print(f"    [{ev.get('endDate','?')[:10]}] {ev.get('title','')[:60]}")
            print(f"      slug: {ev.get('slug','')}")
            ms = ev.get("markets", [])
            for m in ms[:2]:
                print(f"      - {m.get('question','')[:55]}")
                print(f"        tokens: {m.get('clobTokenIds',[][:1])}")

        # ── 3. Gamma 마켓 acceptingOrders=true 전용 ─────────────────
        print("\n[3] Gamma markets acceptingOrders=true")
        try:
            url = f"{GAMMA_URL}/markets"
            params = {"accepting_orders": "true", "limit": 100}
            async with session.get(url, params=params) as resp:
                print(f"  HTTP: {resp.status}")
                if resp.status == 200:
                    data = await resp.json()
                    markets = data if isinstance(data, list) else data.get("markets", data.get("data", []))
                    crypto = [
                        m for m in markets
                        if any(k in (m.get("question","") or "").lower() for k in COIN)
                        and any(k in (m.get("question","") or "").lower() for k in PRICE)
                    ]
                    print(f"  수신: {len(markets)}개 중 크립토 가격: {len(crypto)}개")
                    for m in crypto[:10]:
                        q = m.get("question","")[:60]
                        end = m.get("endDateIso", m.get("endDate","?"))[:16]
                        acc = m.get("acceptingOrders","?")
                        print(f"    [{end}] acc={acc} | {q}")
                        print(f"      tokens: {m.get('clobTokenIds',[][:1])}")
        except Exception as e:
            print(f"  오류: {e}")

        # ── 4. CLOB accepting_orders=true 마켓 ──────────────────────
        print("\n[4] CLOB accepting_orders=true 크립토 마켓")
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
                        if not m.get("accepting_orders", False):
                            continue
                        q = m.get("question","")
                        ql = q.lower()
                        if any(k in ql for k in ["bitcoin","btc","ethereum","eth","solana","xrp","doge","bnb"]):
                            if any(k in ql for k in ["above","below","hit","reach","$","price","up","down","range"]):
                                found.append(m)
                    if not next_cursor:
                        break
            except Exception as e:
                print(f"  오류: {e}")
                break

        print(f"  accepting_orders 크립토 가격 마켓: {len(found)}개")
        for m in found[:15]:
            q = m.get("question","")[:65]
            end = m.get("end_date_iso","?")[:16]
            tkns = m.get("tokens",[])
            print(f"  [{end}] {q}")
            if tkns:
                yes = next((t for t in tkns if t.get("outcome","").upper()=="YES"), None)
                no  = next((t for t in tkns if t.get("outcome","").upper()=="NO"), None)
                if yes:
                    print(f"    YES token: {yes.get('token_id','')[:30]}...")
                if no:
                    print(f"    NO  token: {no.get('token_id','')[:30]}...")

        # ── 5. CLOB에서 5-minute 직접 검색 ──────────────────────────
        print("\n[5] CLOB에서 '5 minute' / 'up or down' 마켓 검색")
        found5 = []
        next_cursor2 = ""
        for page in range(5):
            try:
                url = f"{CLOB_URL}/markets"
                p2: dict = {"limit": 1000}
                if next_cursor2:
                    p2["next_cursor"] = next_cursor2
                async with session.get(url, params=p2) as resp:
                    if resp.status != 200:
                        break
                    data = await resp.json()
                    markets = data.get("data", data) if isinstance(data, dict) else data
                    next_cursor2 = data.get("next_cursor","") if isinstance(data, dict) else ""
                    for m in markets:
                        q = (m.get("question","") or "").lower()
                        if "minute" in q or "up or down" in q or "5 min" in q:
                            found5.append(m)
                    if not next_cursor2:
                        break
            except Exception as e:
                print(f"  오류: {e}")
                break

        print(f"  '5 minute' / 'up or down' 마켓: {len(found5)}개")
        for m in found5[:10]:
            print(f"  {m.get('question','')[:65]}")
            print(f"    accepting_orders={m.get('accepting_orders')}, active={m.get('active')}")
            print(f"    end_date_iso={m.get('end_date_iso','?')[:16]}")

        print("\n" + "=" * 60)
        print(f"결과 요약:")
        print(f"  이벤트 기반 크립토 가격 마켓: {len(crypto_events)}개")
        print(f"  CLOB accepting 크립토 마켓: {len(found)}개")
        print(f"  5분/UP-DOWN 마켓: {len(found5)}개")
        print("=" * 60)


asyncio.run(main())

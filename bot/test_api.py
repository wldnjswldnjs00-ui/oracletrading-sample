"""
Polymarket 이벤트 내용 상세 진단
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
    "Referer": "https://polymarket.com/",
}


async def main():
    timeout = aiohttp.ClientTimeout(total=20)
    async with aiohttp.ClientSession(timeout=timeout, headers=HEADERS) as session:

        print("=" * 60)
        print("Polymarket 이벤트 상세 진단")
        print("=" * 60)

        # ── 1. bitcoin 이벤트 안에 뭐가 있는지 확인 ─────────────────
        print("\n[1] Events 'bitcoin' 검색 - 이벤트 내용 상세")
        try:
            url = f"{GAMMA_URL}/events"
            params = {"active": "true", "closed": "false", "limit": 5, "search": "bitcoin"}
            async with session.get(url, params=params) as resp:
                print(f"  HTTP: {resp.status}")
                if resp.status == 200:
                    data = await resp.json()
                    events = data if isinstance(data, list) else data.get("events", data.get("data", []))
                    print(f"  이벤트 수: {len(events)}")
                    for i, ev in enumerate(events[:5]):
                        print(f"\n  [이벤트 {i+1}]")
                        print(f"    title: {ev.get('title','')[:60]}")
                        print(f"    slug: {ev.get('slug','')[:40]}")
                        markets = ev.get("markets", [])
                        print(f"    markets 개수: {len(markets)}")
                        for m in markets[:3]:
                            print(f"      - {(m.get('question','') or m.get('title',''))[:60]}")
                            print(f"        endDate: {m.get('endDateIso', m.get('endDate','?'))[:20]}")
                            print(f"        tokens: {m.get('clobTokenIds','')}")
        except Exception as e:
            print(f"  오류: {e}")

        # ── 2. 크립토 카테고리로 이벤트 검색 ───────────────────────
        print("\n[2] Events 카테고리/태그 검색 시도")
        for param, val in [
            ("tag_slug", "crypto"),
            ("category", "crypto"),
            ("tag_slug", "cryptocurrency"),
            ("tag_slug", "bitcoin"),
        ]:
            try:
                url = f"{GAMMA_URL}/events"
                params = {"active": "true", "closed": "false", "limit": 3, param: val}
                async with session.get(url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        events = data if isinstance(data, list) else data.get("events", data.get("data", []))
                        print(f"  {param}={val}: {len(events)}개")
                        for ev in events[:2]:
                            print(f"    - {ev.get('title','')[:50]}")
                    else:
                        print(f"  {param}={val}: HTTP {resp.status}")
            except Exception as e:
                print(f"  오류 ({param}={val}): {e}")

        # ── 3. 현재 활성 CLOB 마켓 중 미래 날짜 크립토만 필터 ────────
        print("\n[3] CLOB 활성 마켓 중 미래 날짜 + 크립토 가격 계약")
        import datetime
        now = datetime.datetime.utcnow()
        found = []
        next_cursor = ""

        COIN = ["bitcoin","btc","ethereum","eth","solana","xrp","bnb","avax","doge","matic","polygon"]
        PRICE = ["above","below","over","under","hit","reach","$","usd","price","higher","lower"]

        for page in range(30):  # 최대 30,000개 조회
            try:
                url = f"{CLOB_URL}/markets"
                p: dict = {"active": "true", "limit": 1000}
                if next_cursor:
                    p["next_cursor"] = next_cursor
                async with session.get(url, params=p) as resp:
                    if resp.status != 200:
                        break
                    data = await resp.json()
                    markets = data.get("data", data) if isinstance(data, dict) else data
                    next_cursor = data.get("next_cursor", "") if isinstance(data, dict) else ""

                    for m in markets:
                        q = m.get("question", "")
                        end_iso = m.get("end_date_iso", "")
                        # 미래 날짜인지 확인
                        if end_iso:
                            try:
                                end_dt = datetime.datetime.fromisoformat(end_iso.replace("Z","+00:00").replace("+00:00",""))
                                if end_dt <= now:
                                    continue  # 만료됨
                            except:
                                continue
                        else:
                            continue
                        # 크립토 + 가격 키워드 확인
                        ql = q.lower()
                        if any(k in ql for k in COIN) and any(k in ql for k in PRICE):
                            found.append(m)

                    if not next_cursor or not markets:
                        print(f"  {page+1}페이지 완료, 총 {(page+1)*1000}개 조회")
                        break
                    if (page+1) % 5 == 0:
                        print(f"  {page+1}페이지... (누적 {len(found)}개 발견)")
            except Exception as e:
                print(f"  오류: {e}")
                break

        print(f"\n  ★ 미래 만기 크립토 가격 계약: {len(found)}개")
        for m in found[:15]:
            q = m.get("question","")[:65]
            end = m.get("end_date_iso","?")[:16]
            tkns = m.get("tokens",[])
            print(f"    [{end}] {q}")
            if tkns:
                print(f"      YES: {tkns[0].get('token_id','')[:30]}...")

        # ── 4. Gamma API에서 negRisk 크립토 마켓 탐색 ───────────────
        print("\n[4] Gamma negRisk 크립토 마켓 탐색")
        try:
            url = f"{GAMMA_URL}/markets"
            params = {"active": "true", "closed": "false", "limit": 100, "neg_risk": "true"}
            async with session.get(url, params=params) as resp:
                print(f"  neg_risk=true HTTP: {resp.status}")
                if resp.status == 200:
                    data = await resp.json()
                    markets = data if isinstance(data, list) else data.get("markets", data.get("data", []))
                    print(f"  수신: {len(markets)}개")
                    crypto = [m for m in markets if any(k in (m.get("question","") or "").lower() for k in COIN)]
                    print(f"  코인 관련: {len(crypto)}개")
                    for m in crypto[:5]:
                        print(f"    - {(m.get('question',''))[:60]}")
        except Exception as e:
            print(f"  오류: {e}")

        print("\n" + "=" * 60)
        print(f"최종: 거래 가능한 미래 크립토 가격 계약 {len(found)}개")
        print("=" * 60)


asyncio.run(main())

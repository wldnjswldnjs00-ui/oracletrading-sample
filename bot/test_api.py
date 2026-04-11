"""
Polymarket API 진단 스크립트 v2
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

# 가격 예측 컨텍스트 (있어야 진짜 가격 계약)
PRICE_CTX = ["above", "below", "over", "under", "hit", "reach", "$", "usd", "price"]

# 코인 키워드 (오탐 줄인 버전)
COIN_KEYS = [
    "bitcoin", "btc", "ethereum", "eth", "solana",
    "bnb", "xrp", "ripple", "avax", "chainlink",
    "polygon", "matic", "polkadot", "doge", "dogecoin",
]


def is_crypto_price(question: str) -> bool:
    q = question.lower()
    has_coin = any(k in q for k in COIN_KEYS)
    has_price = any(k in q for k in PRICE_CTX)
    return has_coin and has_price


async def main():
    timeout = aiohttp.ClientTimeout(total=15)
    async with aiohttp.ClientSession(timeout=timeout, headers=HEADERS) as session:

        print("=" * 60)
        print("Polymarket API 진단 v2")
        print("=" * 60)

        # ── 1: Gamma API 전체 페이지네이션 ──────────────────────────
        print("\n[1] Gamma API 전체 마켓 페이지네이션 (처음 500개)")
        all_gamma = []
        offset = 0
        for page in range(5):
            try:
                url = f"{GAMMA_URL}/markets"
                params = {"active": "true", "closed": "false", "limit": 100, "offset": offset}
                async with session.get(url, params=params) as resp:
                    if resp.status != 200:
                        print(f"  [페이지 {page+1}] HTTP {resp.status}")
                        break
                    data = await resp.json()
                    markets = data if isinstance(data, list) else data.get("markets", data.get("data", []))
                    all_gamma.extend(markets)
                    print(f"  [페이지 {page+1}] {len(markets)}개 수신 (누적 {len(all_gamma)}개)")
                    if len(markets) < 100:
                        break
                    offset += 100
            except Exception as e:
                print(f"  오류: {e}")
                break

        crypto_price = [
            m for m in all_gamma
            if is_crypto_price(m.get("question", "") or m.get("title", ""))
        ]
        print(f"\n  ★ 크립토 가격 예측 계약: {len(crypto_price)}개")
        for m in crypto_price[:10]:
            q = (m.get("question","") or m.get("title",""))[:70]
            end = m.get("endDateIso", m.get("endDate", "?"))[:16]
            tokens = m.get("clobTokenIds", [])
            print(f"    [{end}] {q}")
            print(f"      tokens: {tokens}")

        # ── 2: Events 엔드포인트 ────────────────────────────────────
        print("\n[2] Events 엔드포인트 (bitcoin/ethereum 검색)")
        total_event_markets = []
        for search in ["bitcoin", "ethereum", "btc price", "eth price", "crypto"]:
            try:
                url = f"{GAMMA_URL}/events"
                params = {"active": "true", "search": search, "limit": 10}
                async with session.get(url, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        events = data if isinstance(data, list) else data.get("events", data.get("data", []))
                        for event in events:
                            ms = event.get("markets", [])
                            total_event_markets.extend(ms)
                        print(f"  search='{search}': {len(events)}개 이벤트")
                    else:
                        print(f"  search='{search}': HTTP {resp.status}")
            except Exception as e:
                print(f"  오류 ({search}): {e}")

        event_crypto = [m for m in total_event_markets if is_crypto_price(m.get("question","") or m.get("title",""))]
        print(f"  ★ Events 경로 크립토 가격 계약: {len(event_crypto)}개")
        for m in event_crypto[:5]:
            q = (m.get("question","") or m.get("title",""))[:70]
            print(f"    - {q}")

        # ── 3: CLOB API 전체 조회 ────────────────────────────────────
        print("\n[3] CLOB API 전체 마켓 (처음 1000개 분석)")
        clob_all = []
        next_cursor = ""
        for page in range(10):
            try:
                url = f"{CLOB_URL}/markets"
                params: dict = {"active": "true", "limit": 100}
                if next_cursor:
                    params["next_cursor"] = next_cursor
                async with session.get(url, params=params) as resp:
                    if resp.status != 200:
                        print(f"  [CLOB 페이지 {page+1}] HTTP {resp.status}")
                        break
                    data = await resp.json()
                    if isinstance(data, list):
                        markets = data; next_cursor = ""
                    else:
                        markets = data.get("data", [])
                        next_cursor = data.get("next_cursor", "")
                    clob_all.extend(markets)
                    print(f"  [CLOB 페이지 {page+1}] {len(markets)}개 수신 (누적 {len(clob_all)}개)")
                    if not next_cursor or not markets:
                        break
            except Exception as e:
                print(f"  CLOB 오류: {e}")
                break

        clob_crypto = [m for m in clob_all if is_crypto_price(m.get("question",""))]
        print(f"\n  ★ CLOB 크립토 가격 예측 계약: {len(clob_crypto)}개")
        for m in clob_crypto[:10]:
            q = m.get("question","")[:70]
            end = m.get("end_date_iso", "?")[:16]
            tkns = m.get("tokens", [])
            print(f"    [{end}] {q}")
            if tkns:
                print(f"      YES token: {tkns[0].get('token_id','')[:20]}...")

        print("\n" + "=" * 60)
        total_found = len(crypto_price) + len(event_crypto) + len(clob_crypto)
        print(f"★ 총 발견 크립토 가격 예측 계약: {total_found}개")
        if total_found == 0:
            print("→ 현재 Polymarket에 단기 크립토 가격 예측 계약이 없을 수 있음")
            print("→ 봇은 시뮬레이션(SIM) 모드로 계속 거래함")
        else:
            print("→ 봇 실행하면 실제 폴리마켓 계약으로 거래 가능!")
        print("=" * 60)


asyncio.run(main())

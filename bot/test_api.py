"""
Polymarket API 진단 스크립트
실행: python test_api.py
문제 진단: 왜 스캐너가 0개를 찾는지 확인
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

CRYPTO_KEYWORDS = [
    "btc", "bitcoin", "eth", "ethereum", "sol", "solana",
    "bnb", "xrp", "ripple", "avax", "avalanche",
    "link", "chainlink", "pol", "matic", "dot", "polkadot", "doge"
]


async def main():
    timeout = aiohttp.ClientTimeout(total=15)
    async with aiohttp.ClientSession(timeout=timeout, headers=HEADERS) as session:

        print("=" * 60)
        print("Polymarket API 진단")
        print("=" * 60)

        # ── 테스트 1: Gamma API 기본 조회 ──────────────────────────
        print("\n[1] Gamma API 기본 조회 (active=true, limit=10)")
        try:
            url = f"{GAMMA_URL}/markets"
            params = {"active": "true", "closed": "false", "limit": 10}
            async with session.get(url, params=params) as resp:
                print(f"  HTTP 상태: {resp.status}")
                if resp.status == 200:
                    data = await resp.json()
                    if isinstance(data, list):
                        markets = data
                    elif isinstance(data, dict):
                        markets = data.get("markets", data.get("data", []))
                        print(f"  응답 키: {list(data.keys())}")
                    else:
                        markets = []

                    print(f"  받은 시장 수: {len(markets)}")
                    if markets:
                        m = markets[0]
                        print(f"  첫 번째 시장 필드: {list(m.keys())}")
                        q = m.get('question', m.get('title', '?'))
                        print(f"  첫 번째 질문: {q[:80]}")

                        # 크립토 관련 필터링
                        crypto = [m for m in markets if any(
                            k in (m.get('question','') + m.get('title','')).lower()
                            for k in CRYPTO_KEYWORDS
                        )]
                        print(f"  크립토 관련: {len(crypto)}개")
                        for m in crypto[:3]:
                            print(f"    - {(m.get('question','') or m.get('title',''))[:60]}")
                else:
                    text = await resp.text()
                    print(f"  오류 응답: {text[:200]}")
        except Exception as e:
            print(f"  예외: {e}")

        # ── 테스트 2: 검색어로 조회 ──────────────────────────────
        print("\n[2] 검색어 'bitcoin' 조회")
        try:
            url = f"{GAMMA_URL}/markets"
            params = {"active": "true", "closed": "false", "limit": 10, "search": "bitcoin"}
            async with session.get(url, params=params) as resp:
                print(f"  HTTP 상태: {resp.status}")
                if resp.status == 200:
                    data = await resp.json()
                    markets = data if isinstance(data, list) else data.get("markets", data.get("data", []))
                    print(f"  받은 시장 수: {len(markets)}")
                    for m in markets[:3]:
                        print(f"    - {(m.get('question','') or m.get('title',''))[:60]}")
        except Exception as e:
            print(f"  예외: {e}")

        # ── 테스트 3: CLOB API 조회 ──────────────────────────────
        print("\n[3] CLOB API 시장 조회")
        try:
            url = f"{CLOB_URL}/markets"
            params = {"active": "true", "limit": 10}
            async with session.get(url, params=params) as resp:
                print(f"  HTTP 상태: {resp.status}")
                if resp.status == 200:
                    data = await resp.json()
                    if isinstance(data, list):
                        markets = data
                    elif isinstance(data, dict):
                        markets = data.get("data", [])
                        print(f"  응답 키: {list(data.keys())}")
                    else:
                        markets = []

                    print(f"  받은 시장 수: {len(markets)}")
                    if markets:
                        m = markets[0]
                        print(f"  첫 번째 시장 필드: {list(m.keys())}")
                        q = m.get('question', '?')
                        print(f"  첫 번째 질문: {q[:80]}")

                        # 크립토 필터링
                        crypto = [m for m in markets if any(
                            k in m.get('question','').lower() for k in CRYPTO_KEYWORDS
                        )]
                        print(f"  크립토 관련: {len(crypto)}개")
                        for m in crypto[:3]:
                            print(f"    - {m.get('question','')[:60]}")
                            tkns = m.get('tokens', [])
                            print(f"      tokens: {tkns[:2]}")
        except Exception as e:
            print(f"  예외: {e}")

        # ── 테스트 4: tag_slug 조회 ──────────────────────────────
        print("\n[4] tag_slug='crypto' 조회")
        try:
            url = f"{GAMMA_URL}/markets"
            params = {"active": "true", "closed": "false", "limit": 10, "tag_slug": "crypto"}
            async with session.get(url, params=params) as resp:
                print(f"  HTTP 상태: {resp.status}")
                if resp.status == 200:
                    data = await resp.json()
                    markets = data if isinstance(data, list) else data.get("markets", data.get("data", []))
                    print(f"  받은 시장 수: {len(markets)}")
                    for m in markets[:3]:
                        print(f"    - {(m.get('question','') or m.get('title',''))[:60]}")
        except Exception as e:
            print(f"  예외: {e}")

        print("\n" + "=" * 60)
        print("진단 완료. 위 결과를 확인하세요.")
        print("HTTP 200이 나오면 API 접속 성공.")
        print("크립토 시장이 보이면 스캐너 파싱 문제.")
        print("HTTP 403이면 IP/헤더 차단 문제.")
        print("=" * 60)


asyncio.run(main())

"""
폴리마켓 5분 마켓 슬러그 접근 테스트 v3
실행: python test_setup.py
"""
import asyncio
import aiohttp
import time
import os
from dotenv import load_dotenv

load_dotenv()

GAMMA_URL = "https://gamma-api.polymarket.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://polymarket.com",
    "Referer": "https://polymarket.com/crypto",
}


async def main():
    print("=== 폴리마켓 설정 확인 v3 ===\n")

    # .env 확인
    api_key = os.getenv("POLYMARKET_API_KEY", "")
    print(f"API KEY: {'✓ ' + api_key[:8] + '...' if api_key else '✗ 없음'}")
    print(f"PRIVATE KEY: {'✓ 있음' if os.getenv('POLYGON_PRIVATE_KEY') else '✗ 없음'}")

    now = int(time.time())
    round_start = (now // 300) * 300
    slug = f"btc-updown-5m-{round_start}"
    print(f"\n현재 슬러그: {slug}")
    print(f"(현재 Unix 시간: {now})\n")

    timeout = aiohttp.ClientTimeout(total=10)
    async with aiohttp.ClientSession(timeout=timeout, headers=HEADERS) as session:

        # 6가지 URL 형식 시도
        tests = [
            ("쿼리파라미터 slug=", f"{GAMMA_URL}/events?slug={slug}"),
            ("경로 삽입",          f"{GAMMA_URL}/events/{slug}"),
            ("market_slug=",       f"{GAMMA_URL}/events?market_slug={slug}"),
            ("markets slug=",      f"{GAMMA_URL}/markets?slug={slug}"),
            ("이전 슬러그",         f"{GAMMA_URL}/events?slug=btc-updown-5m-{round_start-300}"),
            ("다음 슬러그",         f"{GAMMA_URL}/events?slug=btc-updown-5m-{round_start+300}"),
        ]

        for label, url in tests:
            try:
                async with session.get(url) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        items = data if isinstance(data, list) else [data]
                        print(f"✓ [{label}] HTTP 200 → {len(items)}개")
                        for item in items[:1]:
                            print(f"  title: {item.get('title','?')[:55]}")
                            ms = item.get("markets", [])
                            print(f"  markets: {len(ms)}개")
                            for m in ms[:2]:
                                q   = m.get("question", "?")[:55]
                                tok = m.get("clobTokenIds", [])
                                print(f"    Q: {q}")
                                if tok:
                                    print(f"    UP  token: {tok[0][:30]}...")
                                    if len(tok) > 1:
                                        print(f"    DOWN token: {tok[1][:30]}...")
                    else:
                        text = await resp.text()
                        print(f"✗ [{label}] HTTP {resp.status}  {text[:60]}")
            except Exception as e:
                print(f"✗ [{label}] 오류: {e}")

        # 원래 유저가 공유한 URL로도 시도
        real_slug = "btc-updown-5m-1775939400"
        print(f"\n실제 확인된 슬러그 테스트: {real_slug}")
        for url in [
            f"{GAMMA_URL}/events?slug={real_slug}",
            f"{GAMMA_URL}/events/{real_slug}",
        ]:
            try:
                async with session.get(url) as resp:
                    mark = "✓" if resp.status == 200 else f"✗ {resp.status}"
                    print(f"  {mark} {url.replace(GAMMA_URL,'')}")
                    if resp.status == 200:
                        data = await resp.json()
                        items = data if isinstance(data, list) else [data]
                        for item in items[:1]:
                            print(f"    {item.get('title','?')[:55]}")
            except Exception as e:
                print(f"  오류: {e}")

    print("\n=== 완료 ===")


asyncio.run(main())

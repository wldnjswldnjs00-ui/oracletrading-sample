"""
폴리마켓 5분 마켓 슬러그 접근 테스트 v4
실행: python test_setup.py
정답 URL 포맷: GET /events/slug/{slug}
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


async def check_slug(session, label, url):
    try:
        async with session.get(url) as resp:
            if resp.status == 200:
                data = await resp.json()
                items = data if isinstance(data, list) else [data]
                print(f"✓ [{label}] HTTP 200 → {len(items)}개")
                for item in items[:1]:
                    print(f"  title: {item.get('title','?')[:60]}")
                    ms = item.get("markets", [])
                    print(f"  markets: {len(ms)}개")
                    for m in ms[:3]:
                        q   = m.get("question", "?")[:60]
                        tok = m.get("clobTokenIds", [])
                        end = m.get("endDate", m.get("endDateIso", "?"))[:19]
                        print(f"    Q: {q}")
                        print(f"    만기: {end}")
                        if tok:
                            print(f"    UP  token: {str(tok[0])[:30]}...")
                            if len(tok) > 1:
                                print(f"    DOWN token: {str(tok[1])[:30]}...")
            else:
                text = await resp.text()
                print(f"✗ [{label}] HTTP {resp.status}  {text[:80]}")
    except Exception as e:
        print(f"✗ [{label}] 오류: {e}")


async def main():
    print("=== 폴리마켓 설정 확인 v4 ===\n")

    api_key = os.getenv("POLYMARKET_API_KEY", "")
    print(f"API KEY: {'✓ ' + api_key[:8] + '...' if api_key else '✗ 없음'}")
    print(f"PRIVATE KEY: {'✓ 있음' if os.getenv('POLYGON_PRIVATE_KEY') else '✗ 없음'}")

    now = int(time.time())
    round_start   = (now // 300) * 300
    round_prev    = round_start - 300
    round_next    = round_start + 300

    print(f"\n현재 Unix: {now}")
    print(f"현재 라운드 시작: {round_start}")
    print(f"이전 라운드: {round_prev}")
    print(f"다음 라운드: {round_next}\n")

    timeout = aiohttp.ClientTimeout(total=15)
    async with aiohttp.ClientSession(timeout=timeout, headers=HEADERS) as session:

        # ── 올바른 URL 포맷: /events/slug/{slug} ──────────────────────────
        print("=== 정답 포맷: /events/slug/{slug} ===")
        coins = ["btc", "eth", "sol", "xrp"]
        for coin in coins:
            for ts in [round_prev, round_start, round_next]:
                slug = f"{coin}-updown-5m-{ts}"
                await check_slug(session, slug, f"{GAMMA_URL}/events/slug/{slug}")

        # ── 1분짜리도 시도 ─────────────────────────────────────────────────
        print("\n=== 1분 마켓 시도 ===")
        round1m_start = (now // 60) * 60
        for coin in ["btc", "eth"]:
            for ts in [round1m_start - 60, round1m_start, round1m_start + 60]:
                slug = f"{coin}-updown-1m-{ts}"
                await check_slug(session, slug, f"{GAMMA_URL}/events/slug/{slug}")

        # ── 하드코딩된 실제 슬러그 (유저가 직접 확인한 것) ─────────────────
        print("\n=== 실제 확인된 슬러그 ===")
        known_slug = "btc-updown-5m-1775939400"
        await check_slug(session, known_slug, f"{GAMMA_URL}/events/slug/{known_slug}")

        # ── 구버전 포맷도 비교용으로 시도 ──────────────────────────────────
        print("\n=== 비교: 구버전 포맷 (HTTP 422 예상) ===")
        await check_slug(session, "query param", f"{GAMMA_URL}/events?slug=btc-updown-5m-{round_start}")
        await check_slug(session, "path only",   f"{GAMMA_URL}/events/btc-updown-5m-{round_start}")

    print("\n=== 완료 ===")


asyncio.run(main())

"""
폴리마켓 설정 및 5분 마켓 슬러그 확인
실행: python test_setup.py
"""
import asyncio
import aiohttp
import time
import os
from dotenv import load_dotenv

load_dotenv()

GAMMA_URL = "https://gamma-api.polymarket.com"
CLOB_URL  = "https://clob.polymarket.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://polymarket.com",
    "Referer": "https://polymarket.com/",
}


async def main():
    print("=" * 55)
    print("폴리마켓 설정 확인")
    print("=" * 55)

    # ── 1. .env 키 확인 ──────────────────────────────────────
    print("\n[1] .env 파일 키 확인")
    api_key        = os.getenv("POLYMARKET_API_KEY", "")
    api_secret     = os.getenv("POLYMARKET_API_SECRET", "")
    api_passphrase = os.getenv("POLYMARKET_API_PASSPHRASE", "")
    private_key    = os.getenv("POLYGON_PRIVATE_KEY", "")

    print(f"  API_KEY:        {'✓ 있음 (' + api_key[:8] + '...)' if api_key else '✗ 없음'}")
    print(f"  API_SECRET:     {'✓ 있음' if api_secret else '✗ 없음'}")
    print(f"  API_PASSPHRASE: {'✓ 있음' if api_passphrase else '✗ 없음'}")
    print(f"  PRIVATE_KEY:    {'✓ 있음' if private_key else '✗ 없음'}")

    # ── 2. CLOB API 인증 확인 ─────────────────────────────────
    print("\n[2] CLOB API 인증 확인 (잔고 조회)")
    try:
        from py_clob_client.client import ClobClient
        from py_clob_client.clob_types import ApiCreds
        from py_clob_client.constants import POLYGON

        if api_key and api_secret and private_key:
            client = ClobClient(
                host=CLOB_URL,
                chain_id=POLYGON,
                key=private_key,
                creds=ApiCreds(
                    api_key=api_key,
                    api_secret=api_secret,
                    api_passphrase=api_passphrase,
                ),
                signature_type=0,
            )
            try:
                bal = client.get_balance()
                print(f"  ✓ 인증 성공! 잔고: ${bal}")
            except Exception as e:
                print(f"  ✗ 인증 실패: {e}")
        else:
            print("  ✗ .env에 키 없음 → 설정 필요")
    except ImportError:
        print("  ✗ py-clob-client 없음")

    # ── 3. 5분 마켓 슬러그 패턴 확인 ─────────────────────────
    print("\n[3] BTC 5분 마켓 슬러그 접근 확인")
    now = int(time.time())

    timeout = aiohttp.ClientTimeout(total=10)
    async with aiohttp.ClientSession(timeout=timeout, headers=HEADERS) as session:

        round_start = (now // 300) * 300
        slug = f"btc-updown-5m-{round_start}"
        print(f"  현재 라운드 슬러그: {slug}")

        # 여러 URL 형식 시도
        url_formats = [
            f"{GAMMA_URL}/events/{slug}",
            f"{GAMMA_URL}/events?slug={slug}",
            f"{GAMMA_URL}/markets?slug={slug}",
            f"{GAMMA_URL}/markets/{slug}",
            f"{GAMMA_URL}/events?market_slug={slug}",
            f"{GAMMA_URL}/events?event_slug={slug}",
        ]

        found_data = None
        for url in url_formats:
            try:
                async with session.get(url) as resp:
                    status = resp.status
                    if status == 200:
                        data = await resp.json()
                        found_data = data
                        print(f"\n  ✓ 성공! URL: {url.replace(GAMMA_URL,'')}")
                        # 데이터 구조 확인
                        if isinstance(data, list):
                            print(f"    리스트 {len(data)}개")
                            if data:
                                item = data[0]
                                print(f"    첫번째 키: {list(item.keys())[:6]}")
                                print(f"    title: {item.get('title','?')[:50]}")
                                ms = item.get("markets", [])
                                print(f"    markets: {len(ms)}개")
                                for m in ms[:3]:
                                    print(f"      Q: {m.get('question','?')[:55]}")
                                    tok = m.get("clobTokenIds", [])
                                    if tok:
                                        print(f"      UP  token: {tok[0][:25]}...")
                                        if len(tok) > 1:
                                            print(f"      DOWN token: {tok[1][:25]}...")
                        elif isinstance(data, dict):
                            print(f"    키: {list(data.keys())[:6]}")
                            print(f"    title: {data.get('title','?')[:50]}")
                            ms = data.get("markets", [])
                            print(f"    markets: {len(ms)}개")
                            for m in ms[:3]:
                                print(f"      Q: {m.get('question','?')[:55]}")
                                tok = m.get("clobTokenIds", [])
                                if tok:
                                    print(f"      UP  token: {tok[0][:25]}...")
                                    if len(tok) > 1:
                                        print(f"      DOWN token: {tok[1][:25]}...")
                        break
                    else:
                        print(f"  {url.replace(GAMMA_URL,'')}: HTTP {status}")
            except Exception as e:
                print(f"  오류: {e}")

        # 다른 코인도 현재 라운드 확인 (성공한 URL 형식 사용)
        if found_data:
            print(f"\n  [ETH, SOL, XRP 현재 라운드]")
            for coin in ["eth", "sol", "xrp"]:
                s = f"{coin}-updown-5m-{round_start}"
                url = f"{GAMMA_URL}/events?slug={s}"
                try:
                    async with session.get(url) as resp:
                        mark = "✓" if resp.status == 200 else f"✗ {resp.status}"
                        print(f"    {coin}: {mark}")
                except:
                    pass
        else:
            print("\n  ↓ 슬러그 접근 실패 - 다른 방법으로 찾아봄")
            # 폴리마켓 내부 API 시도
            for alt in [
                f"https://polymarket.com/api/event/btc-updown-5m-{round_start}",
                f"{GAMMA_URL}/events?slug=btc-updown-5m-{round_start}&active=true",
            ]:
                try:
                    async with session.get(alt) as resp:
                        if resp.status == 200:
                            print(f"  ✓ {alt[:60]}")
                        else:
                            print(f"  HTTP {resp.status}: {alt[:60]}")
                except Exception as e:
                    print(f"  오류: {e}")

    print("\n" + "=" * 55)
    print("완료. 위 결과 보내줘.")
    print("=" * 55)


asyncio.run(main())

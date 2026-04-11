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

        coins = ["btc", "eth", "sol", "xrp", "bnb", "doge"]

        for offset in [0, -1, 1]:  # 현재, 이전, 다음 라운드
            round_start = ((now // 300) + offset) * 300
            slot_label = {0: "현재", -1: "이전", 1: "다음"}[offset]

            slug = f"btc-updown-5m-{round_start}"
            url  = f"{GAMMA_URL}/events/{slug}"

            try:
                async with session.get(url) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        title  = data.get("title", "?")
                        ms     = data.get("markets", [])
                        print(f"\n  ✓ [{slot_label}] {slug}")
                        print(f"    제목: {title}")
                        print(f"    markets: {len(ms)}개")
                        for m in ms[:2]:
                            q = m.get("question","")[:55]
                            tok = m.get("clobTokenIds", [])
                            print(f"      Q: {q}")
                            print(f"      YES token: {tok[0][:20] if tok else '없음'}...")
                            print(f"      NO  token: {tok[1][:20] if len(tok)>1 else '없음'}...")
                    else:
                        print(f"  [{slot_label}] {slug}: HTTP {resp.status}")
            except Exception as e:
                print(f"  [{slot_label}] 오류: {e}")

        # 다른 코인도 현재 라운드 확인
        print(f"\n  [현재 라운드 다른 코인]")
        round_start = (now // 300) * 300
        for coin in ["eth", "sol", "xrp"]:
            slug = f"{coin}-updown-5m-{round_start}"
            url  = f"{GAMMA_URL}/events/{slug}"
            try:
                async with session.get(url) as resp:
                    status = "✓" if resp.status == 200 else f"✗ HTTP {resp.status}"
                    print(f"    {coin}: {status} ({slug})")
            except Exception as e:
                print(f"    {coin}: 오류 {e}")

        # 15분, 1일 마켓도 확인
        print(f"\n  [15분 / 1일 마켓]")
        for tf_name, tf_sec in [("15m", 900), ("1d", 86400)]:
            rs = (now // tf_sec) * tf_sec
            slug = f"btc-updown-{tf_name}-{rs}"
            url  = f"{GAMMA_URL}/events/{slug}"
            try:
                async with session.get(url) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        print(f"    ✓ BTC {tf_name}: {data.get('title','?')[:50]}")
                    else:
                        print(f"    ✗ BTC {tf_name}: HTTP {resp.status}")
            except Exception as e:
                print(f"    BTC {tf_name}: 오류 {e}")

    print("\n" + "=" * 55)
    print("완료. 위 결과 보내줘.")
    print("=" * 55)


asyncio.run(main())

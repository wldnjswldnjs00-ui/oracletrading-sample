"""
폴리마켓 전체 진단 v5
실행: python test_setup.py
"""
import asyncio
import aiohttp
import time
import os
from dotenv import load_dotenv

load_dotenv()

GAMMA_URL    = "https://gamma-api.polymarket.com"
CLOB_URL     = "https://clob.polymarket.com"
DATA_API_URL = "https://data-api.polymarket.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://polymarket.com",
    "Referer": "https://polymarket.com/crypto",
}


# ─────────────────────────────────────────────────
# [1] .env 키 확인
# ─────────────────────────────────────────────────
def check_env():
    print("[1] .env 파일 키 확인")
    keys = {
        "POLYMARKET_API_KEY":        os.getenv("POLYMARKET_API_KEY", ""),
        "POLYMARKET_API_SECRET":     os.getenv("POLYMARKET_API_SECRET", ""),
        "POLYMARKET_API_PASSPHRASE": os.getenv("POLYMARKET_API_PASSPHRASE", ""),
        "POLYGON_PRIVATE_KEY":       os.getenv("POLYGON_PRIVATE_KEY", ""),
    }
    all_ok = True
    for name, val in keys.items():
        short = name.replace("POLYMARKET_", "").replace("POLYGON_", "")
        if val:
            print(f"  {short}: ✓ 있음 ({val[:8]}...)")
        else:
            print(f"  {short}: ✗ 없음!")
            all_ok = False
    return all_ok


# ─────────────────────────────────────────────────
# [2] CLOB 잔고 조회 (정답 메서드)
# ─────────────────────────────────────────────────
def check_balance():
    print("\n[2] CLOB API 잔고 조회")
    try:
        from py_clob_client.client import ClobClient
        from py_clob_client.clob_types import ApiCreds, BalanceAllowanceParams, AssetType
        from py_clob_client.constants import POLYGON

        client = ClobClient(
            host=CLOB_URL,
            chain_id=POLYGON,
            key=os.getenv("POLYGON_PRIVATE_KEY"),
            creds=ApiCreds(
                api_key=os.getenv("POLYMARKET_API_KEY"),
                api_secret=os.getenv("POLYMARKET_API_SECRET"),
                api_passphrase=os.getenv("POLYMARKET_API_PASSPHRASE"),
            ),
            signature_type=0,
        )

        params = BalanceAllowanceParams(asset_type=AssetType.COLLATERAL)
        raw = client.get_balance_allowance(params)
        print(f"  응답 원본: {raw}")

        if isinstance(raw, dict):
            bal_raw = float(raw.get("balance", 0))
            # USDC는 6자리 소수점 (마이크로 단위)
            bal_usdc = bal_raw / 1_000_000
            if bal_usdc < 0.01:
                bal_usdc = bal_raw  # 이미 달러 단위
            print(f"  ✓ USDC 잔고: ${bal_usdc:.2f}")
        else:
            print(f"  응답 형식 미지원: {type(raw)}")

    except AttributeError as e:
        print(f"  ✗ 메서드 없음: {e}")
    except Exception as e:
        print(f"  ✗ 오류: {e}")


# ─────────────────────────────────────────────────
# [3] BTC 5분 슬러그 접근 확인 (모든 포맷)
# ─────────────────────────────────────────────────
async def check_slug(session, label, url):
    try:
        async with session.get(url) as resp:
            text = await resp.text()
            if resp.status == 200:
                import json
                try:
                    data = json.loads(text)
                    items = data if isinstance(data, list) else [data]
                    print(f"  ✓ HTTP 200 [{label}]  {len(items)}개")
                    for item in items[:1]:
                        title = item.get("title", item.get("question", "?"))
                        print(f"    title: {title[:60]}")
                        for m in item.get("markets", [])[:2]:
                            print(f"    Q: {m.get('question','?')[:55]}")
                            tok = m.get("clobTokenIds", [])
                            if tok:
                                print(f"    token[0]: {str(tok[0])[:30]}...")
                except Exception:
                    print(f"  ✓ HTTP 200 [{label}]  (비-JSON: {text[:60]})")
            else:
                print(f"  ✗ HTTP {resp.status} [{label}]  {text[:60]}")
    except Exception as e:
        print(f"  ✗ 오류 [{label}]: {e}")


async def check_slugs():
    print("\n[3] BTC 5분 마켓 슬러그 접근 확인")
    now = int(time.time())
    r5  = (now // 300) * 300
    print(f"  현재 Unix: {now}  5분 라운드: {r5}\n")

    timeout = aiohttp.ClientTimeout(total=15)
    async with aiohttp.ClientSession(timeout=timeout, headers=HEADERS) as session:

        # ── A. 정답 포맷: /events/slug/{slug} ─────────────────────────────
        print("  [A] /events/slug/{slug} 포맷 (공식 문서 정답)")
        for ts in [r5 - 300, r5, r5 + 300]:
            slug = f"btc-updown-5m-{ts}"
            await check_slug(session, slug, f"{GAMMA_URL}/events/slug/{slug}")

        # ── B. 알려진 실제 슬러그 (유저가 직접 확인) ─────────────────────
        print("\n  [B] 알려진 실제 슬러그 (btc-updown-5m-1775939400)")
        await check_slug(session, "known", f"{GAMMA_URL}/events/slug/btc-updown-5m-1775939400")
        await check_slug(session, "query", f"{GAMMA_URL}/events?slug=btc-updown-5m-1775939400")
        await check_slug(session, "path",  f"{GAMMA_URL}/events/btc-updown-5m-1775939400")

        # ── C. Data API 시도 ──────────────────────────────────────────────
        print("\n  [C] data-api.polymarket.com 시도")
        await check_slug(session, "data-api events", f"{DATA_API_URL}/events?slug=btc-updown-5m-{r5}")
        await check_slug(session, "data-api markets", f"{DATA_API_URL}/markets?slug=btc-updown-5m-{r5}")
        await check_slug(session, "data-api known",  f"{DATA_API_URL}/events?slug=btc-updown-5m-1775939400")

        # ── D. CLOB API 마켓 검색 ──────────────────────────────────────────
        print("\n  [D] CLOB API btc 마켓 검색")
        await check_slug(session, "clob btc",        f"{CLOB_URL}/markets?active=true&limit=5")
        await check_slug(session, "clob simplified", f"{CLOB_URL}/simplified-markets?active=true&limit=5")

    print()


# ─────────────────────────────────────────────────
async def main():
    print("=" * 55)
    print("폴리마켓 전체 진단 v5")
    print("=" * 55 + "\n")

    check_env()
    check_balance()
    await check_slugs()

    print("=" * 55)
    print("완료.")
    print("=" * 55)


asyncio.run(main())

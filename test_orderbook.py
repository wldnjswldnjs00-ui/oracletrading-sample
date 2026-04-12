"""
test_orderbook.py
Checks live CLOB orderbooks for current BTC 5-minute contracts.
Run: python test_orderbook.py
"""
import asyncio
import aiohttp
import time


async def main():
    now = int(time.time())
    base = (now // 300) * 300

    print(f"Current time: {now}, checking windows around {base}")
    print("=" * 60)

    async with aiohttp.ClientSession() as s:
        for offset in range(-2, 5):
            ts = base + offset * 300
            slug = f"btc-updown-5m-{ts}"
            url = f"https://gamma-api.polymarket.com/events/slug/{slug}"

            async with s.get(url) as r:
                if r.status != 200:
                    print(f"[offset={offset:+d}] {slug}: not found (HTTP {r.status})")
                    continue

                ev = await r.json()
                markets = ev.get("markets", [])
                print(f"\n[offset={offset:+d}] {slug}: {len(markets)} markets found")

                for m in markets:
                    q = m.get("question", "")[:60]
                    print(f"  Question: {q}")

                    tokens = m.get("clobTokenIds") or []
                    if isinstance(tokens, str):
                        import json
                        tokens = json.loads(tokens)

                    for i, tok in enumerate(tokens[:2]):
                        label = "YES" if i == 0 else "NO"
                        book_url = "https://clob.polymarket.com/book"
                        async with s.get(book_url, params={"token_id": tok}) as rb:
                            if rb.status == 200:
                                b = await rb.json()
                                bids = b.get("bids", [])
                                asks = b.get("asks", [])
                                best_bid = bids[0]["price"] if bids else "NONE"
                                best_ask = asks[0]["price"] if asks else "NONE"
                                print(f"  {label}: bids={len(bids)} asks={len(asks)} | best_bid={best_bid} best_ask={best_ask}")
                            else:
                                print(f"  {label}: CLOB HTTP {rb.status}")

            await asyncio.sleep(0.1)

    print("\n" + "=" * 60)
    print("If all contracts show 'bids=0 asks=0', the market has no liquidity right now.")
    print("If bids/asks > 0, the bot should be trading.")


asyncio.run(main())

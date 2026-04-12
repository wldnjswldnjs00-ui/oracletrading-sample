"""
패치 v2: 주문 수량 소수점 + pre-market 필터
1. live_engine.py: size round 4자리 → 2자리 (CLOB 400 에러 수정)
2. market_scanner.py: 스프레드 > 10%p 계약 유동성 0 처리 (pre-market 필터)
실행: python patch_v2.py
"""
import os

BASE = os.path.dirname(os.path.abspath(__file__))

def patch(path, old, new, label):
    full = os.path.join(BASE, path)
    with open(full, encoding="utf-8") as f:
        src = f.read()
    if old not in src:
        print(f"  ✗ [{label}] 이미 적용됨 또는 텍스트 불일치")
        return False
    with open(full, "w", encoding="utf-8") as f:
        f.write(src.replace(old, new, 1))
    print(f"  ✓ [{label}] 적용 완료")
    return True

print("=" * 55)
print("패치 v2: 주문 수량 + pre-market 필터")
print("=" * 55)

# ── 1. live_engine.py: size round(4) → round(2) ──────────
print("\n[1] live_engine.py - 주문 수량 소수점 2자리로 제한")
patch(
    "bot/execution/live_engine.py",
    """                order_args = OrderArgs(
                    token_id=token_id,
                    price=round(price, 4),
                    size=round(size, 4),
                    side=side,
                )""",
    """                order_args = OrderArgs(
                    token_id=token_id,
                    price=round(price, 4),
                    size=round(size, 2),   # CLOB: maker amount 최대 2자리
                    side=side,
                )""",
    "size round(2)"
)

# ── 2. market_scanner.py: 스프레드 필터 (v1 패치 적용된 버전) ──
print("\n[2] market_scanner.py - pre-market 스프레드 필터 (v1 이후)")
r2 = patch(
    "bot/polymarket/market_scanner.py",
    """            contract.yes_bid       = book["best_bid"]   # SELL YES 시 사용
            contract.yes_ask       = book["best_ask"]   # BUY YES 시 사용
            contract.liquidity_usd = book["liquidity_usd"]
            contract.last_updated  = time.time()""",
    """            contract.yes_bid       = book["best_bid"]   # SELL YES 시 사용
            contract.yes_ask       = book["best_ask"]   # BUY YES 시 사용
            # 스프레드 > 10%p = 미개장 계약 → 유동성 0 처리 (pre-market 필터)
            spread = contract.yes_ask - contract.yes_bid
            contract.liquidity_usd = book["liquidity_usd"] if spread <= 0.10 else 0.0
            contract.last_updated  = time.time()""",
    "spread 필터 (v1 이후)"
)

# v1 미적용 버전도 처리
if not r2:
    print("\n[2b] market_scanner.py - pre-market 스프레드 필터 (v1 미적용 버전)")
    patch(
        "bot/polymarket/market_scanner.py",
        """        if book:
            contract.yes_odds     = book["mid"]
            contract.no_odds      = 1.0 - book["mid"]
            contract.liquidity_usd = book["liquidity_usd"]
            contract.last_updated  = time.time()""",
        """        if book:
            contract.yes_odds = book["mid"]
            contract.no_odds  = 1.0 - book["mid"]
            contract.yes_bid  = book["best_bid"]
            contract.yes_ask  = book["best_ask"]
            # 스프레드 > 10%p = 미개장 계약 → 유동성 0 처리
            spread = contract.yes_ask - contract.yes_bid
            contract.liquidity_usd = book["liquidity_usd"] if spread <= 0.10 else 0.0
            contract.last_updated  = time.time()""",
        "spread 필터 (v1 미적용)"
    )

print("\n" + "=" * 55)
print("완료! 봇 재시작:")
print("  python bot/main.py --live  →  YES")
print("=" * 55)

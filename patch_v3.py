"""
패치 v3: 단순 문자열 치환으로 확실하게 적용
1. round(size, 4) → round(size, 2)  [HTTP 400 수정]
2. 스프레드 > 10%p 계약 유동성 0 처리 [pre-market 필터]
"""
import os

BASE = os.path.dirname(os.path.abspath(__file__))

print("=" * 50)
print("패치 v3")
print("=" * 50)

# ── Fix 1: live_engine.py ─────────────────────────
path1 = os.path.join(BASE, "bot/execution/live_engine.py")
with open(path1, encoding="utf-8") as f:
    src = f.read()

if "round(size, 2)" in src:
    print("\n[1] live_engine.py: 이미 적용됨")
elif "round(size, 4)" in src:
    src = src.replace("round(size, 4)", "round(size, 2)", 1)
    with open(path1, "w", encoding="utf-8") as f:
        f.write(src)
    print("\n[1] live_engine.py: ✓ round(size, 2) 적용")
else:
    print("\n[1] live_engine.py: ✗ round(size,?) 코드 없음 - 수동 확인 필요")

# ── Fix 2: market_scanner.py 스프레드 필터 ────────
path2 = os.path.join(BASE, "bot/polymarket/market_scanner.py")
with open(path2, encoding="utf-8") as f:
    src = f.read()

TARGET = 'contract.liquidity_usd = book["liquidity_usd"]'
SPREAD_FILTER = (
    '# 스프레드 > 10%p = 미개장/비유동 계약 → 거래 차단\n'
    '            _ask = getattr(contract, "yes_ask", 0.5)\n'
    '            _bid = getattr(contract, "yes_bid", 0.5)\n'
    '            _spread = _ask - _bid\n'
    '            contract.liquidity_usd = book["liquidity_usd"] if _spread <= 0.10 else 0.0'
)

if "스프레드 > 10%p" in src:
    print("[2] market_scanner.py: 이미 적용됨")
elif TARGET in src:
    src = src.replace(TARGET, SPREAD_FILTER, 1)
    with open(path2, "w", encoding="utf-8") as f:
        f.write(src)
    print("[2] market_scanner.py: ✓ 스프레드 필터 적용")
else:
    print("[2] market_scanner.py: ✗ 대상 없음 - 수동 확인 필요")

print("\n" + "=" * 50)
print("완료! 봇 재시작:")
print("  python bot/main.py --live  →  YES")
print("=" * 50)

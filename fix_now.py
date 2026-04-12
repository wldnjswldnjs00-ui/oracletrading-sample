"""
직접 라인별 수정 (텍스트 매칭 실패 방지)
"""
import os

BASE = os.path.dirname(os.path.abspath(__file__))

print("=" * 50)

# ── Fix 1: live_engine.py ─────────────────────────
path1 = os.path.join(BASE, "bot/execution/live_engine.py")
with open(path1, encoding="utf-8") as f:
    lines = f.readlines()

fixed1 = False
for i, line in enumerate(lines):
    if "round(size," in line and ("4)" in line) and "order_args" not in line:
        old = line
        lines[i] = line.replace("round(size, 4)", "round(size, 2)")
        print(f"[1] live_engine.py L{i+1} 수정:")
        print(f"    전: {old.strip()}")
        print(f"    후: {lines[i].strip()}")
        fixed1 = True
        break

if not fixed1:
    # 이미 적용됐거나 패턴 다름 - 진단
    for i, line in enumerate(lines):
        if "round(size" in line:
            print(f"[1] live_engine.py L{i+1}: {line.strip()}")
    if any("round(size, 2)" in l for l in lines):
        print("[1] live_engine.py: 이미 적용됨 ✓")
    else:
        print("[1] live_engine.py: ✗ 패턴 없음")

with open(path1, "w", encoding="utf-8") as f:
    f.writelines(lines)

# ── Fix 2: market_scanner.py 스프레드 필터 ────────
path2 = os.path.join(BASE, "bot/polymarket/market_scanner.py")
with open(path2, encoding="utf-8") as f:
    lines2 = f.readlines()

content2 = "".join(lines2)
if "스프레드 > 10%p" in content2 or "_spread <= 0.10" in content2:
    print("[2] market_scanner.py: 이미 적용됨 ✓")
else:
    fixed2 = False
    for i, line in enumerate(lines2):
        if 'contract.liquidity_usd = book["liquidity_usd"]' in line:
            indent = len(line) - len(line.lstrip())
            s = " " * indent
            replacement = (
                f'{s}# 스프레드 > 10%p = 미개장 계약 → 유동성 0 처리\n'
                f'{s}_ask = getattr(contract, "yes_ask", 1.0)\n'
                f'{s}_bid = getattr(contract, "yes_bid", 0.0)\n'
                f'{s}_spread = _ask - _bid\n'
                f'{s}contract.liquidity_usd = book["liquidity_usd"] if _spread <= 0.10 else 0.0\n'
            )
            print(f"[2] market_scanner.py L{i+1} 수정: 스프레드 필터 삽입")
            lines2[i] = replacement
            fixed2 = True
            break

    if not fixed2:
        print("[2] market_scanner.py: ✗ 대상 라인 없음, 관련 라인:")
        for i, line in enumerate(lines2):
            if "liquidity_usd" in line:
                print(f"    L{i+1}: {line.strip()}")
    else:
        with open(path2, "w", encoding="utf-8") as f:
            f.writelines(lines2)

print("\n완료! → python bot/main.py --live → YES")

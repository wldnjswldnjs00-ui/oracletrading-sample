"""
fix_all.py - ASCII only script (no Korean in this file)
Fixes:
1. market_scanner.py encoding corruption (re-encode to UTF-8)
2. live_engine.py: round(size,4) -> round(size,2)
3. market_scanner.py: add spread filter
"""
import os, sys

BASE = os.path.dirname(os.path.abspath(__file__))

def read_any_encoding(path):
    for enc in ['utf-8', 'utf-8-sig', 'cp949', 'euc-kr', 'latin-1']:
        try:
            with open(path, 'r', encoding=enc) as f:
                content = f.read()
            print("  [read] OK with encoding: " + enc)
            return content
        except Exception:
            continue
    raise RuntimeError("Cannot read file: " + path)

# ── Fix 1: Re-encode market_scanner.py to UTF-8 ──────────────
path_scanner = os.path.join(BASE, 'bot', 'polymarket', 'market_scanner.py')
print("\n[1] Fixing market_scanner.py encoding...")
src = read_any_encoding(path_scanner)
with open(path_scanner, 'w', encoding='utf-8') as f:
    f.write(src)
print("  [write] Saved as UTF-8")

# ── Fix 2: Spread filter in market_scanner.py ────────────────
print("\n[2] Adding spread filter to market_scanner.py...")
with open(path_scanner, 'r', encoding='utf-8') as f:
    src = f.read()

OLD_SCANNER = (
    'contract.yes_bid       = book["best_bid"]   # SELL YES \uc2dc \uc0ac\uc6a9\n'
    '            contract.yes_ask       = book["best_ask"]   # BUY YES \uc2dc \uc0ac\uc6a9\n'
    '            contract.liquidity_usd = book["liquidity_usd"]\n'
    '            contract.last_updated  = time.time()'
)
NEW_SCANNER = (
    'contract.yes_bid       = book["best_bid"]   # SELL YES \uc2dc \uc0ac\uc6a9\n'
    '            contract.yes_ask       = book["best_ask"]   # BUY YES \uc2dc \uc0ac\uc6a9\n'
    '            # spread > 10%p = pre-market contract -> block\n'
    '            _spread = contract.yes_ask - contract.yes_bid\n'
    '            contract.liquidity_usd = book["liquidity_usd"] if _spread <= 0.10 else 0.0\n'
    '            contract.last_updated  = time.time()'
)

# Simpler ASCII-safe replacement
TARGET_LINE = 'contract.liquidity_usd = book["liquidity_usd"]'
SPREAD_BLOCK = (
    '# spread > 10%p = pre-market contract -> block\n'
    '            _spread = contract.yes_ask - contract.yes_bid\n'
    '            contract.liquidity_usd = book["liquidity_usd"] if _spread <= 0.10 else 0.0'
)

# Check current state
if '_spread <= 0.10' in src:
    print("  [skip] Spread filter already present")
elif TARGET_LINE in src:
    src = src.replace(TARGET_LINE, SPREAD_BLOCK, 1)
    with open(path_scanner, 'w', encoding='utf-8') as f:
        f.write(src)
    print("  [done] Spread filter added")
else:
    print("  [warn] Target line not found. Current liquidity lines:")
    for i, line in enumerate(src.splitlines(), 1):
        if 'liquidity' in line:
            print("    L" + str(i) + ": " + line.strip())

# ── Fix 3: round(size,4) -> round(size,2) in live_engine.py ──
path_engine = os.path.join(BASE, 'bot', 'execution', 'live_engine.py')
print("\n[3] Fixing live_engine.py size precision...")
with open(path_engine, 'r', encoding='utf-8') as f:
    src = f.read()

if 'round(size, 2)' in src:
    print("  [skip] Already round(size, 2)")
elif 'round(size, 4)' in src:
    src = src.replace('round(size, 4)', 'round(size, 2)', 1)
    with open(path_engine, 'w', encoding='utf-8') as f:
        f.write(src)
    print("  [done] round(size, 2) applied")
else:
    print("  [warn] round(size,?) not found:")
    for i, line in enumerate(src.splitlines(), 1):
        if 'round(size' in line:
            print("    L" + str(i) + ": " + line.strip())

print("\n========================================")
print("Done! Now run: python bot/main.py --live")
print("========================================")

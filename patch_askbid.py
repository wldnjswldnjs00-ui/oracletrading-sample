"""
패치: CLOB FOK 주문 체결 불가 버그 수정
- 진입: MID 가격 → ASK 가격으로 변경 (FOK BUY 체결 조건 충족)
- 청산: MID 가격 → BID 가격으로 변경 (FOK SELL 체결 조건 충족)
- 갭 임계값 0.5%p로 낮춤, INITIAL_SEED=107.05
실행: python patch_askbid.py
"""
import os, re

BASE = os.path.dirname(os.path.abspath(__file__))

def patch(path, old, new, label):
    full = os.path.join(BASE, path)
    with open(full, encoding="utf-8") as f:
        src = f.read()
    if old not in src:
        print(f"  ✗ [{label}] 대상 텍스트 없음 (이미 적용됐거나 파일 다름)")
        return False
    with open(full, "w", encoding="utf-8") as f:
        f.write(src.replace(old, new, 1))
    print(f"  ✓ [{label}] 적용 완료")
    return True

print("=" * 60)
print("CLOB ASK/BID 가격 수정 패치")
print("=" * 60)

# ─── 1. market_scanner.py: MarketContract에 bid/ask 필드 추가 ────
print("\n[1] market_scanner.py - bid/ask 필드 추가")
patch(
    "bot/polymarket/market_scanner.py",
    """    yes_odds: float = 0.5
    no_odds: float = 0.5
    liquidity_usd: float = 0.0""",
    """    yes_odds: float = 0.5
    no_odds: float = 0.5
    yes_bid: float = 0.5    # YES 토큰 최우선 매수호가 (SELL 시 사용)
    yes_ask: float = 0.5    # YES 토큰 최우선 매도호가 (BUY 시 사용)
    liquidity_usd: float = 0.0""",
    "bid/ask 필드"
)

# ─── 2. market_scanner.py: no_bid/no_ask property + 진입/청산 메서드 ────
print("\n[2] market_scanner.py - target_entry_price / target_exit_price 추가")
patch(
    "bot/polymarket/market_scanner.py",
    """    def target_token_id(self, direction: str) -> str:
        \"\"\"
        UP 신호 → YES 토큰 (BTC 상승에 베팅)
        DOWN 신호 → NO 토큰 (BTC 하락에 베팅)
        계약 direction과 신호 direction이 일치해야 함
        \"\"\"
        return self.yes_token_id if direction == "UP" else self.no_token_id

    def target_odds(self, direction: str) -> float:
        return self.yes_odds if direction == "UP" else self.no_odds""",
    """    @property
    def no_bid(self) -> float:
        \"\"\"NO 토큰 최우선 매수호가 ≈ 1 - YES 매도호가\"\"\"
        return max(0.01, 1.0 - self.yes_ask)

    @property
    def no_ask(self) -> float:
        \"\"\"NO 토큰 최우선 매도호가 ≈ 1 - YES 매수호가\"\"\"
        return min(0.99, 1.0 - self.yes_bid)

    def target_token_id(self, direction: str) -> str:
        \"\"\"
        UP 신호 → YES 토큰 (BTC 상승에 베팅)
        DOWN 신호 → NO 토큰 (BTC 하락에 베팅)
        계약 direction과 신호 direction이 일치해야 함
        \"\"\"
        return self.yes_token_id if direction == "UP" else self.no_token_id

    def target_odds(self, direction: str) -> float:
        \"\"\"신호 생성용 mid 오즈 (갭 계산에 사용)\"\"\"
        return self.yes_odds if direction == "UP" else self.no_odds

    def target_entry_price(self, direction: str) -> float:
        \"\"\"실거래 진입 가격 = ASK 매수호가 (FOK BUY에 사용)\"\"\"
        return self.yes_ask if direction == "UP" else self.no_ask

    def target_exit_price(self, direction: str) -> float:
        \"\"\"실거래 청산 가격 = BID 매도호가 (FOK SELL에 사용)\"\"\"
        return self.yes_bid if direction == "UP" else self.no_bid""",
    "entry/exit 메서드"
)

# ─── 3. market_scanner.py: PRICE_CONTEXT_KEYWORDS에 "up or down" 추가 ────
print("\n[3] market_scanner.py - PRICE_CONTEXT_KEYWORDS 업데이트")
patch(
    "bot/polymarket/market_scanner.py",
    '        "$", "usd", "price", "worth", "target",\n    ]',
    '        "$", "usd", "price", "worth", "target",\n        "up or down", "updown",   # BTC Up or Down 5분 계약 포함\n    ]',
    "PRICE_CONTEXT_KEYWORDS"
)

# ─── 4. market_scanner.py: _update_contract_odds에 bid/ask 저장 ────
print("\n[4] market_scanner.py - _update_contract_odds bid/ask 저장")
patch(
    "bot/polymarket/market_scanner.py",
    """        if book:
            contract.yes_odds     = book["mid"]
            contract.no_odds      = 1.0 - book["mid"]
            contract.liquidity_usd = book["liquidity_usd"]
            contract.last_updated  = time.time()""",
    """        if book:
            contract.yes_odds      = book["mid"]
            contract.no_odds       = 1.0 - book["mid"]
            # bid/ask 저장 → 실거래 주문 가격으로 사용
            contract.yes_bid       = book["best_bid"]   # SELL YES 시 사용
            contract.yes_ask       = book["best_ask"]   # BUY YES 시 사용
            contract.liquidity_usd = book["liquidity_usd"]
            contract.last_updated  = time.time()""",
    "_update_contract_odds"
)

# ─── 5. live_engine.py: 진입 ASK 가격 사용 ────
print("\n[5] live_engine.py - 진입 ASK 가격으로 변경")
patch(
    "bot/execution/live_engine.py",
    """        entry_odds = contract.target_odds(signal.direction)
        if entry_odds <= 0:
            return None

        token_id = contract.target_token_id(signal.direction)
        shares   = size / entry_odds   # 매수할 계약 수량

        logger.info(
            f"[Live] 주문 제출: {signal.symbol} {signal.direction} | "
            f"토큰 {token_id[:10]}... | ${size:.2f} @ {entry_odds:.4f} | "
            f"{shares:.2f}주"
        )

        # CLOB 매수 주문 (FOK)
        resp = await self._place_order(
            token_id=token_id,
            price=entry_odds,
            size=shares,
            side="BUY",
        )""",
    """        # 실거래: mid 오즈(갭계산용) vs 실제 ASK 가격(주문용) 구분
        entry_odds  = contract.target_odds(signal.direction)        # mid (PnL 계산 기준)
        order_price = contract.target_entry_price(signal.direction)  # ASK (실제 BUY 주문가)
        if order_price <= 0:
            return None

        token_id = contract.target_token_id(signal.direction)
        shares   = size / order_price   # ASK 가격 기준 수량

        logger.info(
            f"[Live] 주문 제출: {signal.symbol} {signal.direction} | "
            f"토큰 {token_id[:10]}... | ${size:.2f} @ ask={order_price:.4f} (mid={entry_odds:.4f}) | "
            f"{shares:.2f}주"
        )

        # CLOB 매수 주문 (FOK) - ASK 가격으로 제출해야 체결됨
        resp = await self._place_order(
            token_id=token_id,
            price=order_price,
            size=shares,
            side="BUY",
        )""",
    "enter ASK"
)

# ─── 6. live_engine.py: position entry_odds를 order_price로 ────
print("\n[6] live_engine.py - Position entry_odds ASK 기준")
patch(
    "bot/execution/live_engine.py",
    """        position = Position(
            trade_id=trade_id,
            symbol=signal.symbol,
            direction=signal.direction,
            entry_odds=entry_odds,
            size_usd=size,
            shares=shares,
            entry_time=time.time(),
            contract=contract,
        )""",
    """        position = Position(
            trade_id=trade_id,
            symbol=signal.symbol,
            direction=signal.direction,
            entry_odds=order_price,   # ASK 가격을 기준으로 PnL 계산
            size_usd=size,
            shares=shares,
            entry_time=time.time(),
            contract=contract,
        )""",
    "Position entry_odds"
)

# ─── 7. live_engine.py: 모니터링 BID 가격 사용 ────
print("\n[7] live_engine.py - 모니터링 BID 가격으로 변경")
patch(
    "bot/execution/live_engine.py",
    """            contract      = position.contract
            current_odds  = contract.target_odds(position.direction)
            if current_odds <= 0:
                continue""",
    """            contract      = position.contract
            # 청산 시 BID 가격(실제 SELL 체결 가격)으로 모니터링
            current_odds  = contract.target_exit_price(position.direction)
            if current_odds <= 0:
                continue""",
    "monitor BID"
)

# ─── 8. live_engine.py: _close_position_live BID SELL ────
print("\n[8] live_engine.py - 청산 BID 가격으로 변경")
patch(
    "bot/execution/live_engine.py",
    """        token_id = position.contract.target_token_id(position.direction)

        logger.info(
            f"[Live] 청산 시도 [{position.trade_id}] {reason} | "
            f"목표오즈: {exit_odds:.4f} | 수량: {position.shares:.4f}주"
        )

        # CLOB 매도 주문 (FOK)
        resp = await self._place_order(
            token_id=token_id,
            price=exit_odds,
            size=position.shares,
            side="SELL",
        )

        actual_exit_odds = exit_odds

        if resp:
            status = resp.get("status", "")
            if status not in ("matched", "delayed"):
                # 청산 실패 → 최우선가로 재시도
                logger.warning(f"[Live] 청산 FOK 미체결 ({status}) → 재시도")
                await asyncio.sleep(0.2)
                # 오즈를 조금 낮춰서 재시도 (유동성 확보)
                retry_odds = max(0.01, exit_odds - 0.02)
                resp2 = await self._place_order(token_id, retry_odds, position.shares, "SELL")
                if resp2 and resp2.get("status") in ("matched", "delayed"):
                    actual_exit_odds = retry_odds
                else:
                    # 최종 실패 → 현재 오즈로 강제 청산 (손실 감수)
                    logger.error(f"[Live] 청산 재시도 실패 → 강제 청산")
        else:
            logger.error("[Live] 청산 주문 응답 없음 → 강제 청산")""",
    """        token_id = position.contract.target_token_id(position.direction)
        # exit_odds는 BID 가격 (target_exit_price로 계산됨) - SELL FOK에 적합
        sell_price = max(0.01, exit_odds)

        logger.info(
            f"[Live] 청산 시도 [{position.trade_id}] {reason} | "
            f"bid가격: {sell_price:.4f} | 수량: {position.shares:.4f}주"
        )

        # CLOB 매도 주문 (FOK) - BID 가격으로 제출해야 체결됨
        resp = await self._place_order(
            token_id=token_id,
            price=sell_price,
            size=position.shares,
            side="SELL",
        )

        actual_exit_odds = sell_price

        if resp:
            status = resp.get("status", "")
            if status not in ("matched", "delayed"):
                # 청산 실패 → 매도호가 더 낮춰서 재시도 (BID보다 낮게 = 시장가에 가깝게)
                logger.warning(f"[Live] 청산 FOK 미체결 ({status}) → bid-0.02로 재시도")
                await asyncio.sleep(0.2)
                retry_price = max(0.01, sell_price - 0.02)
                resp2 = await self._place_order(token_id, retry_price, position.shares, "SELL")
                if resp2 and resp2.get("status") in ("matched", "delayed"):
                    actual_exit_odds = retry_price
                else:
                    logger.error(f"[Live] 청산 재시도 실패 → 강제 청산 기록")
        else:
            logger.error("[Live] 청산 주문 응답 없음 → 강제 청산 기록")""",
    "close BID"
)

# ─── 9. config.py 업데이트 ────
print("\n[9] config.py - INITIAL_SEED + MIN_GAP 업데이트")
patch(
    "bot/config.py",
    "INITIAL_SEED = 100.0             # 시작 시드 ($)",
    "INITIAL_SEED = 107.05            # 시작 시드 ($)",
    "INITIAL_SEED"
)
patch(
    "bot/config.py",
    "MIN_GAP_PERCENTAGE_POINTS = 1.5    # 폴리마켓 오즈와 실제 확률 괴리 최소 1.5%p 이상",
    "MIN_GAP_PERCENTAGE_POINTS = 0.5    # 폴리마켓 오즈와 실제 확률 괴리 최소 0.5%p 이상 (ASK 가격 기준)",
    "MIN_GAP"
)

print("\n" + "=" * 60)
print("패치 완료! 봇을 재시작하세요:")
print("  python main.py --live")
print("  YES 입력")
print("=" * 60)

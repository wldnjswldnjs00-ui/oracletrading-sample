"""
리스크 관리자
- 일일 최대 손실 -5% Kill Switch
- 연속 손실 감지 → 강제 휴식
- 비상 프로토콜
"""
import asyncio
import time
import logging
from enum import Enum
from typing import Callable, Optional

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import config

logger = logging.getLogger(__name__)


class BotState(Enum):
    RUNNING      = "RUNNING"       # 정상 가동
    COOLDOWN     = "COOLDOWN"      # 연속 손실로 강제 휴식 중
    HALTED       = "HALTED"        # 일일 손실 한도 초과 → 오늘 거래 중단
    EMERGENCY    = "EMERGENCY"     # 비상 중단


class RiskManager:
    """
    리스크 관리자

    규칙:
    1. 일일 손실 -5% 초과 시 오늘 거래 전면 중단
    2. 연속 손실 3회 → 5분 강제 휴식
    3. 연속 손실 5회 → 오늘 거래 중단
    4. 비상 상황(연결 끊김 등) → 즉시 중단 + 알림
    """

    def __init__(self, on_halt: Optional[Callable] = None):
        self.state = BotState.RUNNING
        self.on_halt = on_halt   # 중단 시 콜백 (알림 등)

        # 손실 추적
        self.consecutive_losses = 0
        self.daily_loss_pct = 0.0
        self.daily_start_capital = config.INITIAL_SEED

        # 쿨다운
        self._cooldown_until: float = 0

        # 상태 시작 시간
        self._state_start: float = time.time()

    # ─────────────────────────────────────────
    # 거래 가능 여부 확인
    # ─────────────────────────────────────────
    def can_trade(self) -> tuple[bool, str]:
        """
        거래 허용 여부 반환
        Returns: (가능여부, 이유)
        """
        if self.state == BotState.HALTED:
            return False, "일일 손실 한도 초과 - 오늘 거래 중단"

        if self.state == BotState.EMERGENCY:
            return False, "비상 중단 상태"

        if self.state == BotState.COOLDOWN:
            remaining = self._cooldown_until - time.time()
            if remaining > 0:
                return False, f"쿨다운 중 ({remaining:.0f}초 남음)"
            else:
                # 쿨다운 해제
                self.state = BotState.RUNNING
                self.consecutive_losses = 0
                logger.info("[Risk] 쿨다운 해제 → 거래 재개")

        return True, "OK"

    # ─────────────────────────────────────────
    # 거래 결과 보고
    # ─────────────────────────────────────────
    def report_trade(self, pnl: float, capital: float):
        """
        거래 완료 후 결과 보고 → 리스크 상태 업데이트

        pnl: 이번 거래 손익 ($)
        capital: 현재 총 자본 ($)
        """
        # 손실 연속 카운터 업데이트
        if pnl < 0:
            self.consecutive_losses += 1
            logger.warning(
                f"[Risk] 손실 발생 | 연속 손실: {self.consecutive_losses}회 | "
                f"PnL: ${pnl:.4f}"
            )
        else:
            self.consecutive_losses = 0

        # 일일 손실률 업데이트
        if self.daily_start_capital > 0:
            self.daily_loss_pct = (
                (capital - self.daily_start_capital) / self.daily_start_capital
            )

        # ─ 규칙 적용 ─
        self._apply_rules(capital)

    def _apply_rules(self, capital: float):
        """리스크 규칙 적용"""

        # 규칙 1: 일일 손실 -5% → 오늘 거래 전면 중단
        if self.daily_loss_pct <= -config.DAILY_MAX_LOSS_PCT:
            self._halt(
                f"일일 최대 손실 초과: {self.daily_loss_pct*100:.2f}% "
                f"(한도: -{config.DAILY_MAX_LOSS_PCT*100:.0f}%)"
            )
            return

        # 규칙 2: 연속 손실 8회 → 오늘 중단
        if self.consecutive_losses >= 8:
            self._halt(f"연속 손실 {self.consecutive_losses}회 → 오늘 거래 중단")
            return

        # 규칙 3: 연속 손실 3회 → 5분 쿨다운
        if self.consecutive_losses >= config.CONSECUTIVE_LOSS_LIMIT:
            self._enter_cooldown()

    def _enter_cooldown(self):
        """강제 쿨다운 진입"""
        if self.state == BotState.COOLDOWN:
            return
        self.state = BotState.COOLDOWN
        self._cooldown_until = time.time() + config.COOLDOWN_SEC
        logger.warning(
            f"[Risk] ⚠ 쿨다운 진입: {config.COOLDOWN_SEC}초 후 재개 "
            f"(연속 손실 {self.consecutive_losses}회)"
        )

    def _halt(self, reason: str):
        """거래 중단"""
        if self.state in (BotState.HALTED, BotState.EMERGENCY):
            return
        self.state = BotState.HALTED
        logger.error(f"[Risk] 🔴 거래 중단: {reason}")
        if self.on_halt:
            asyncio.create_task(self._notify_halt(reason))

    async def _notify_halt(self, reason: str):
        """중단 알림 (텔레그램 연동 가능)"""
        msg = f"🔴 봇 거래 중단\n사유: {reason}\n시각: {time.strftime('%H:%M:%S')}"
        logger.critical(f"[Risk] 알림: {msg}")
        # 텔레그램 연동 시 여기에 추가

    # ─────────────────────────────────────────
    # 비상 중단
    # ─────────────────────────────────────────
    def emergency_halt(self, reason: str = "비상 상황"):
        """즉각적인 비상 중단"""
        self.state = BotState.EMERGENCY
        logger.critical(f"[Risk] 🚨 비상 중단: {reason}")
        if self.on_halt:
            asyncio.create_task(self._notify_halt(f"비상: {reason}"))

    # ─────────────────────────────────────────
    # 일별 리셋
    # ─────────────────────────────────────────
    def reset_daily(self, current_capital: float):
        """자정 일별 리셋"""
        if self.state == BotState.EMERGENCY:
            return
        self.state = BotState.RUNNING
        self.consecutive_losses = 0
        self.daily_loss_pct = 0.0
        self.daily_start_capital = current_capital
        logger.info(f"[Risk] 일별 리셋 완료 | 기준 자본: ${current_capital:.2f}")

    # ─────────────────────────────────────────
    # 상태 요약
    # ─────────────────────────────────────────
    def status_str(self) -> str:
        state_emoji = {
            BotState.RUNNING:   "🟢 가동중",
            BotState.COOLDOWN:  "🟡 쿨다운",
            BotState.HALTED:    "🔴 중단",
            BotState.EMERGENCY: "🚨 비상중단",
        }
        base = state_emoji.get(self.state, self.state.value)
        if self.state == BotState.COOLDOWN:
            remaining = max(0, self._cooldown_until - time.time())
            base += f" ({remaining:.0f}초)"
        return base

    def get_stats(self) -> dict:
        return {
            "state": self.state.value,
            "consecutive_losses": self.consecutive_losses,
            "daily_loss_pct": self.daily_loss_pct * 100,
            "daily_limit_pct": config.DAILY_MAX_LOSS_PCT * 100,
            "can_trade": self.can_trade()[0],
        }

"""
터미널 대시보드
Rich 라이브러리로 실시간 봇 상태 표시
"""
import time
from datetime import datetime
from typing import Optional

from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich import box

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import config


console = Console()


def make_header(mode: str, uptime_sec: float) -> Panel:
    """상단 헤더"""
    h = int(uptime_sec // 3600)
    m = int((uptime_sec % 3600) // 60)
    s = int(uptime_sec % 60)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    mode_tag = "PAPER TRADING" if mode == "PAPER" else "LIVE TRADING"
    mode_color = "green" if mode == "PAPER" else "red"
    title = f"  OracleTrading HFT Bot  |  [{mode_color}]{mode_tag}[/{mode_color}]  |  {now}  |  가동시간: {h:02d}:{m:02d}:{s:02d}  "
    return Panel(title, style="bold blue", padding=(0, 1))


def make_capital_panel(stats: dict) -> Panel:
    """자본 현황 패널"""
    capital      = stats.get("capital", 0)
    initial      = stats.get("initial_capital", 0)
    total_equity = stats.get("total_equity", capital)
    available    = stats.get("available", 0)
    locked       = stats.get("locked", 0)
    total_ret    = stats.get("total_return_pct", 0)
    daily_ret    = stats.get("daily_return_pct", 0)
    drawdown     = stats.get("drawdown_pct", 0)

    ret_color  = "green" if total_ret >= 0 else "red"
    dd_color   = "red"   if drawdown  > 2  else "yellow" if drawdown > 0 else "green"

    table = Table(box=box.SIMPLE, show_header=False, padding=(0, 2))
    table.add_column("항목", style="dim")
    table.add_column("값",   justify="right")

    table.add_row("총 자산",      f"[bold white]${total_equity:>10,.2f}[/]")
    table.add_row("가용 자본",    f"[cyan]${available:>10,.2f}[/]")
    table.add_row("포지션 잠금",  f"[yellow]${locked:>10,.2f}[/]")
    table.add_row("─" * 10,       "─" * 12)
    table.add_row("초기 자본",    f"${initial:>10,.2f}")
    table.add_row("총 수익률",    f"[{ret_color}]{total_ret:>+10.2f}%[/]")
    table.add_row("일일 수익률",  f"[{ret_color}]{daily_ret:>+10.2f}%[/]")
    table.add_row("드로다운",     f"[{dd_color}]{drawdown:>10.2f}%[/]")

    return Panel(table, title="[bold]💰 자본 현황[/]", border_style="cyan")


def make_trade_stats_panel(stats: dict) -> Panel:
    """거래 통계 패널"""
    total   = stats.get("total_trades", 0)
    wr      = stats.get("win_rate", 0)
    pnl     = stats.get("total_pnl", 0)
    daily   = stats.get("daily_pnl", 0)
    open_p  = stats.get("open_positions", 0)

    wr_color  = "green" if wr >= 0.7 else "yellow" if wr >= 0.5 else "red"
    pnl_color = "green" if pnl >= 0 else "red"

    table = Table(box=box.SIMPLE, show_header=False, padding=(0, 2))
    table.add_column("항목",  style="dim")
    table.add_column("값",    justify="right")

    table.add_row("총 거래수",     f"[bold white]{total:>8,}회[/]")
    table.add_row("승률",          f"[{wr_color}]{wr:>8.1%}[/]")
    table.add_row("총 손익",       f"[{pnl_color}]{pnl:>+8,.4f}$[/]")
    table.add_row("일일 손익",     f"[{pnl_color}]{daily:>+8,.4f}$[/]")
    table.add_row("─" * 10,        "─" * 10)
    table.add_row("오픈 포지션",   f"[yellow]{open_p:>8}개[/]")

    return Panel(table, title="[bold]📊 거래 통계[/]", border_style="green")


def make_risk_panel(risk_stats: dict) -> Panel:
    """리스크 상태 패널"""
    state          = risk_stats.get("state", "UNKNOWN")
    consec_loss    = risk_stats.get("consecutive_losses", 0)
    daily_loss_pct = risk_stats.get("daily_loss_pct", 0)
    limit_pct      = risk_stats.get("daily_limit_pct", 5)

    state_map = {
        "RUNNING":   "[bold green]🟢 가동중[/]",
        "COOLDOWN":  "[bold yellow]🟡 쿨다운[/]",
        "HALTED":    "[bold red]🔴 중단[/]",
        "EMERGENCY": "[bold red]🚨 비상중단[/]",
    }
    state_str = state_map.get(state, state)

    loss_color = "red" if daily_loss_pct < -3 else "yellow" if daily_loss_pct < 0 else "green"

    table = Table(box=box.SIMPLE, show_header=False, padding=(0, 2))
    table.add_column("항목",  style="dim")
    table.add_column("값",    justify="right")

    table.add_row("봇 상태",       state_str)
    table.add_row("연속 손실",     f"[{'red' if consec_loss >= 3 else 'white'}]{consec_loss}회[/]")
    table.add_row("일일 손실",     f"[{loss_color}]{daily_loss_pct:>+.2f}%[/]")
    table.add_row("손실 한도",     f"-{limit_pct:.0f}%")

    return Panel(table, title="[bold]🛡 리스크 상태[/]", border_style="red")


def make_recent_trades_panel(trades: list) -> Panel:
    """최근 거래 내역 패널"""
    table = Table(box=box.SIMPLE, show_header=True, padding=(0, 1))
    table.add_column("ID",       style="dim",    width=8)
    table.add_column("심볼",     width=5)
    table.add_column("방향",     width=6)
    table.add_column("진입오즈", justify="right", width=8)
    table.add_column("청산오즈", justify="right", width=8)
    table.add_column("손익",     justify="right", width=10)
    table.add_column("보유(초)", justify="right", width=8)
    table.add_column("사유",     width=12)

    for t in trades[:12]:
        pnl = t.get("pnl", 0) or 0
        pnl_color = "green" if pnl >= 0 else "red"
        direction_color = "green" if t.get("direction") == "UP" else "red"
        table.add_row(
            t.get("trade_id", "")[-6:],
            t.get("symbol", ""),
            f"[{direction_color}]{t.get('direction', '')}[/]",
            f"{t.get('entry_odds', 0):.3f}",
            f"{t.get('exit_odds', 0):.3f}",
            f"[{pnl_color}]{pnl:+.4f}$[/]",
            f"{t.get('hold_sec', 0):.1f}",
            t.get("exit_reason", ""),
        )

    return Panel(table, title="[bold]📋 최근 거래[/]", border_style="blue")


def make_market_panel(scanner_summary: str, price_info: dict) -> Panel:
    """시장 현황 패널"""
    btc = price_info.get("BTC", 0)
    eth = price_info.get("ETH", 0)
    btc_chg = price_info.get("BTC_chg", 0)
    eth_chg = price_info.get("ETH_chg", 0)

    btc_color = "green" if btc_chg >= 0 else "red"
    eth_color = "green" if eth_chg >= 0 else "red"

    table = Table(box=box.SIMPLE, show_header=False, padding=(0, 2))
    table.add_column("항목",  style="dim")
    table.add_column("값",    justify="right")

    table.add_row("BTC",  f"[{btc_color}]${btc:>10,.2f}  ({btc_chg:>+.2f}%)[/]")
    table.add_row("ETH",  f"[{eth_color}]${eth:>10,.4f}  ({eth_chg:>+.2f}%)[/]")
    table.add_row("",     "")
    table.add_row("폴리마켓", f"[dim]{scanner_summary}[/]")

    return Panel(table, title="[bold]📈 시장 현황[/]", border_style="magenta")


class Dashboard:
    """실시간 대시보드 컨트롤러"""

    def __init__(self, mode: str = "PAPER"):
        self.mode = mode
        self.start_time = time.time()
        self._live: Optional[Live] = None

    def start(self) -> Live:
        layout = self._make_layout()
        self._live = Live(
            layout,
            console=console,
            refresh_per_second=2,
            screen=True,
        )
        return self._live

    def _make_layout(self) -> Layout:
        layout = Layout()
        layout.split_column(
            Layout(name="header",  size=3),
            Layout(name="body"),
            Layout(name="footer",  size=14),
        )
        layout["body"].split_row(
            Layout(name="capital",  ratio=1),
            Layout(name="trades",   ratio=1),
            Layout(name="risk",     ratio=1),
            Layout(name="market",   ratio=1),
        )
        return layout

    def update(
        self,
        layout: Layout,
        engine_stats: dict,
        risk_stats: dict,
        recent_trades: list,
        scanner_summary: str,
        price_info: dict,
    ):
        """대시보드 갱신"""
        uptime = time.time() - self.start_time
        layout["header"].update(make_header(self.mode, uptime))
        layout["capital"].update(make_capital_panel(engine_stats))
        layout["trades"].update(make_trade_stats_panel(engine_stats))
        layout["risk"].update(make_risk_panel(risk_stats))
        layout["market"].update(make_market_panel(scanner_summary, price_info))
        layout["footer"].update(make_recent_trades_panel(recent_trades))

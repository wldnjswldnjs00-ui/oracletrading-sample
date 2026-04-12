"""
Terminal dashboard - Rich live display
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
    h = int(uptime_sec // 3600)
    m = int((uptime_sec % 3600) // 60)
    s = int(uptime_sec % 60)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    mode_color = "green" if mode == "PAPER" else "red"
    title = (
        f"  OracleTrading HFT Bot  |  "
        f"[{mode_color}]{mode} TRADING[/{mode_color}]  |  "
        f"{now}  |  Uptime: {h:02d}:{m:02d}:{s:02d}  "
    )
    return Panel(title, style="bold blue", padding=(0, 1))


def make_capital_panel(stats: dict) -> Panel:
    capital      = stats.get("capital", 0)
    initial      = stats.get("initial_capital", 0)
    total_equity = stats.get("total_equity", capital)
    available    = stats.get("available", 0)
    locked       = stats.get("locked", 0)
    total_ret    = stats.get("total_return_pct", 0)
    daily_ret    = stats.get("daily_return_pct", 0)
    drawdown     = stats.get("drawdown_pct", 0)

    ret_color = "green" if total_ret >= 0 else "red"
    dd_color  = "red"   if drawdown  > 2  else "yellow" if drawdown > 0 else "green"

    table = Table(box=box.SIMPLE, show_header=False, padding=(0, 2))
    table.add_column("Item", style="dim")
    table.add_column("Value", justify="right")

    table.add_row("Total Equity",   f"[bold white]${total_equity:>10,.2f}[/]")
    table.add_row("Available",      f"[cyan]${available:>10,.2f}[/]")
    table.add_row("Locked",         f"[yellow]${locked:>10,.2f}[/]")
    table.add_row("-" * 10,         "-" * 12)
    table.add_row("Initial",        f"${initial:>10,.2f}")
    table.add_row("Total Return",   f"[{ret_color}]{total_ret:>+10.2f}%[/]")
    table.add_row("Daily Return",   f"[{ret_color}]{daily_ret:>+10.2f}%[/]")
    table.add_row("Drawdown",       f"[{dd_color}]{drawdown:>10.2f}%[/]")

    return Panel(table, title="[bold cyan][ CAPITAL ][/]", border_style="cyan")


def make_trade_stats_panel(stats: dict) -> Panel:
    total  = stats.get("total_trades", 0)
    wr     = stats.get("win_rate", 0)
    pnl    = stats.get("total_pnl", 0)
    daily  = stats.get("daily_pnl", 0)
    open_p = stats.get("open_positions", 0)

    wr_color  = "green" if wr >= 0.7 else "yellow" if wr >= 0.5 else "red"
    pnl_color = "green" if pnl >= 0 else "red"

    table = Table(box=box.SIMPLE, show_header=False, padding=(0, 2))
    table.add_column("Item",  style="dim")
    table.add_column("Value", justify="right")

    table.add_row("Total Trades",  f"[bold white]{total:>8,}[/]")
    table.add_row("Win Rate",      f"[{wr_color}]{wr:>8.1%}[/]")
    table.add_row("Total PnL",     f"[{pnl_color}]{pnl:>+8,.4f}$[/]")
    table.add_row("Daily PnL",     f"[{pnl_color}]{daily:>+8,.4f}$[/]")
    table.add_row("-" * 10,        "-" * 10)
    table.add_row("Open Pos",      f"[yellow]{open_p:>8}[/]")

    return Panel(table, title="[bold green][ TRADES ][/]", border_style="green")


def make_risk_panel(risk_stats: dict) -> Panel:
    state          = risk_stats.get("state", "UNKNOWN")
    consec_loss    = risk_stats.get("consecutive_losses", 0)
    daily_loss_pct = risk_stats.get("daily_loss_pct", 0)
    limit_pct      = risk_stats.get("daily_limit_pct", 5)

    state_map = {
        "RUNNING":   "[bold green]RUNNING[/]",
        "COOLDOWN":  "[bold yellow]COOLDOWN[/]",
        "HALTED":    "[bold red]HALTED[/]",
        "EMERGENCY": "[bold red]EMERGENCY[/]",
    }
    state_str = state_map.get(state, state)
    loss_color = "red" if daily_loss_pct < -3 else "yellow" if daily_loss_pct < 0 else "green"

    table = Table(box=box.SIMPLE, show_header=False, padding=(0, 2))
    table.add_column("Item",  style="dim")
    table.add_column("Value", justify="right")

    table.add_row("Bot State",     state_str)
    table.add_row("Consec Loss",   f"[{'red' if consec_loss >= 3 else 'white'}]{consec_loss}[/]")
    table.add_row("Daily Loss",    f"[{loss_color}]{daily_loss_pct:>+.2f}%[/]")
    table.add_row("Loss Limit",    f"-{limit_pct:.0f}%")

    return Panel(table, title="[bold red][ RISK ][/]", border_style="red")


def make_recent_trades_panel(trades: list) -> Panel:
    table = Table(box=box.SIMPLE, show_header=True, padding=(0, 1))
    table.add_column("ID",      style="dim",    width=8)
    table.add_column("Symbol",  width=6)
    table.add_column("Dir",     width=6)
    table.add_column("Entry",   justify="right", width=8)
    table.add_column("Exit",    justify="right", width=8)
    table.add_column("PnL",     justify="right", width=10)
    table.add_column("Sec",     justify="right", width=6)
    table.add_column("Reason",  width=12)

    for t in trades[:12]:
        if t.get("status") == "OPEN":
            continue
        pnl       = t.get("pnl") or 0
        entry_odds = t.get("entry_odds") or 0
        exit_odds  = t.get("exit_odds") or 0
        hold_sec   = t.get("hold_sec") or 0
        pnl_color = "green" if pnl >= 0 else "red"
        dir_color = "green" if t.get("direction") == "UP" else "red"
        table.add_row(
            (t.get("trade_id") or "")[-6:],
            t.get("symbol", ""),
            f"[{dir_color}]{t.get('direction', '')}[/]",
            f"{entry_odds:.3f}",
            f"{exit_odds:.3f}",
            f"[{pnl_color}]{pnl:+.4f}$[/]",
            f"{hold_sec:.1f}",
            t.get("exit_reason") or "",
        )

    return Panel(table, title="[bold blue][ RECENT TRADES ][/]", border_style="blue")


def make_market_panel(scanner_summary: str, price_info: dict) -> Panel:
    table = Table(box=box.SIMPLE, show_header=False, padding=(0, 1))
    table.add_column("Sym",   style="dim", width=5)
    table.add_column("Price", justify="right", width=14)
    table.add_column("Chg",   justify="right", width=8)

    for sym in config.TARGET_SYMBOLS:
        price = price_info.get(sym, 0)
        chg   = price_info.get(f"{sym}_chg", 0)
        color = "green" if chg >= 0 else "red"
        price_str = f"${price:>10,.2f}" if sym == "BTC" else f"${price:>10,.4f}"
        table.add_row(sym, f"[{color}]{price_str}[/]", f"[{color}]{chg:>+.2f}%[/]")

    table.add_row("", "", "")
    table.add_row("[dim]POLY[/]", f"[dim]{scanner_summary}[/]", "")

    return Panel(table, title="[bold magenta][ MARKET ][/]", border_style="magenta")


class Dashboard:
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
            Layout(name="header", size=3),
            Layout(name="body"),
            Layout(name="footer", size=14),
        )
        layout["body"].split_row(
            Layout(name="capital", ratio=1),
            Layout(name="trades",  ratio=1),
            Layout(name="risk",    ratio=1),
            Layout(name="market",  ratio=1),
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
        uptime = time.time() - self.start_time
        layout["header"].update(make_header(self.mode, uptime))
        layout["capital"].update(make_capital_panel(engine_stats))
        layout["trades"].update(make_trade_stats_panel(engine_stats))
        layout["risk"].update(make_risk_panel(risk_stats))
        layout["market"].update(make_market_panel(scanner_summary, price_info))
        layout["footer"].update(make_recent_trades_panel(recent_trades))

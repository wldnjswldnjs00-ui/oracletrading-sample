"""
SQLite 거래 기록 DB
모든 거래 내역을 영구 저장
"""
import sqlite3
import time
import logging
from typing import List, Dict, Optional

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import config

logger = logging.getLogger(__name__)


class TradeDB:
    """거래 기록 데이터베이스"""

    def __init__(self, db_path: str = config.DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """테이블 생성"""
        with self._get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS trades (
                    trade_id        TEXT PRIMARY KEY,
                    symbol          TEXT NOT NULL,
                    direction       TEXT NOT NULL,
                    entry_odds      REAL NOT NULL,
                    exit_odds       REAL,
                    size_usd        REAL NOT NULL,
                    pnl             REAL,
                    pnl_pct         REAL,
                    hold_sec        REAL,
                    exit_reason     TEXT,
                    status          TEXT NOT NULL,
                    entry_time      REAL NOT NULL,
                    exit_time       REAL,
                    gap_pct_points  REAL,
                    implied_prob    REAL,
                    capital_after   REAL,
                    mode            TEXT DEFAULT 'PAPER'
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS daily_stats (
                    date            TEXT PRIMARY KEY,
                    trades          INTEGER,
                    wins            INTEGER,
                    losses          INTEGER,
                    win_rate        REAL,
                    total_pnl       REAL,
                    start_capital   REAL,
                    end_capital     REAL,
                    return_pct      REAL,
                    mode            TEXT DEFAULT 'PAPER'
                )
            """)
            conn.commit()
        logger.info(f"[DB] 데이터베이스 초기화: {self.db_path}")

    def save_trade(self, trade_data: dict):
        """거래 저장"""
        with self._get_conn() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO trades (
                    trade_id, symbol, direction, entry_odds, exit_odds,
                    size_usd, pnl, pnl_pct, hold_sec, exit_reason,
                    status, entry_time, exit_time,
                    gap_pct_points, implied_prob, capital_after, mode
                ) VALUES (
                    :trade_id, :symbol, :direction, :entry_odds, :exit_odds,
                    :size_usd, :pnl, :pnl_pct, :hold_sec, :exit_reason,
                    :status, :entry_time, :exit_time,
                    :gap_pct_points, :implied_prob, :capital_after, :mode
                )
            """, trade_data)
            conn.commit()

    def save_daily_stats(self, stats: dict):
        """일별 통계 저장"""
        date_str = time.strftime("%Y-%m-%d")
        with self._get_conn() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO daily_stats (
                    date, trades, wins, losses, win_rate,
                    total_pnl, start_capital, end_capital, return_pct, mode
                ) VALUES (
                    :date, :trades, :wins, :losses, :win_rate,
                    :total_pnl, :start_capital, :end_capital, :return_pct, :mode
                )
            """, {"date": date_str, **stats})
            conn.commit()

    def get_recent_trades(self, limit: int = 20) -> List[Dict]:
        """최근 거래 내역 조회"""
        with self._get_conn() as conn:
            rows = conn.execute("""
                SELECT * FROM trades
                ORDER BY entry_time DESC
                LIMIT ?
            """, (limit,)).fetchall()
            return [dict(row) for row in rows]

    def get_daily_stats(self, days: int = 30) -> List[Dict]:
        """일별 통계 조회"""
        with self._get_conn() as conn:
            rows = conn.execute("""
                SELECT * FROM daily_stats
                ORDER BY date DESC
                LIMIT ?
            """, (days,)).fetchall()
            return [dict(row) for row in rows]

    def get_total_stats(self) -> Dict:
        """전체 누적 통계 조회"""
        with self._get_conn() as conn:
            row = conn.execute("""
                SELECT
                    COUNT(*) as total_trades,
                    SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
                    SUM(pnl) as total_pnl,
                    AVG(pnl) as avg_pnl,
                    AVG(hold_sec) as avg_hold_sec,
                    MIN(entry_time) as first_trade_time
                FROM trades
                WHERE status = 'CLOSED'
            """).fetchone()
            if row:
                d = dict(row)
                d["win_rate"] = (d["wins"] or 0) / max(d["total_trades"] or 1, 1)
                return d
            return {}

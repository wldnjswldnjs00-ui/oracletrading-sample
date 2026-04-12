"""
봇 전체 설정 파일
모든 파라미터는 여기서 관리합니다
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ─────────────────────────────────────────
# 모드 설정
# ─────────────────────────────────────────
PAPER_TRADING = True   # True = 시뮬레이션 / False = 실거래

# ─────────────────────────────────────────
# 자본 설정
# ─────────────────────────────────────────
INITIAL_SEED = 107.05            # 시작 시드 ($)
FULL_SEED_THRESHOLD = 5000.0     # 풀시드 유지 한도 ($5,000 미만 = 100% 투입)

# ─────────────────────────────────────────
# 리스크 설정
# ─────────────────────────────────────────
DAILY_MAX_LOSS_PCT    = 0.05   # 일일 최대 손실 -5%
CONSECUTIVE_LOSS_LIMIT = 5     # 연속 손실 N회 → 5분 강제 휴식
COOLDOWN_SEC          = 300    # 강제 휴식 시간 (초)

# ─────────────────────────────────────────
# 전략 파라미터
# ─────────────────────────────────────────
# 진입 조건
MIN_PRICE_MOVE_PCT        = 0.02   # 바이낸스 가격이 N초 내 최소 0.02% 움직여야 신호 발생
MIN_GAP_PERCENTAGE_POINTS = 0.5    # 폴리마켓 오즈와 실제 확률 괴리 최소 0.5%p 이상 (ASK 가격 기준)
PRICE_WINDOW_SEC          = 15     # 가격 변동 감시 시간창 (초) - 빠른 반응

# 청산 조건
MAX_HOLD_TIME_SEC    = 8      # 진입 후 최대 보유 시간 (초) - 수렴 대기 여유
ODDS_CONVERGENCE_PCT = 0.003  # 오즈 수렴 감지 임계치 (0.3%p 수렴 시 청산)
STOP_LOSS_PCT        = 0.03   # 오즈가 역방향으로 3%p 이상 벌어지면 손절

# 유동성 체크
MIN_MARKET_LIQUIDITY_USD = 50       # 최소 시장 유동성 $50 (실거래 기준)
FILL_SPEED_THRESHOLD_SEC = 0.5      # 풀시드 주문 0.5초 내 체결 = 유동성 양호 판단

# ─────────────────────────────────────────
# 대상 시장 (10개 코인 동시 운용)
# ─────────────────────────────────────────
TARGET_SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "AVAX", "LINK", "POL", "DOT", "DOGE"]
MAX_OPEN_POSITIONS = len(TARGET_SYMBOLS)   # 심볼당 1개 = 최대 10개 동시 포지션
TARGET_DURATIONS = [5, 15, 60, 240, 1440]  # 분 단위 (5분~1일 계약 전부)

# ─────────────────────────────────────────
# Binance WebSocket
# ─────────────────────────────────────────
BINANCE_WS_URL = "wss://stream.binance.com:9443/stream"
BINANCE_STREAMS = [
    "btcusdt@trade",
    "ethusdt@trade",
    "solusdt@trade",
    "bnbusdt@trade",
    "xrpusdt@trade",
    "avaxusdt@trade",
    "linkusdt@trade",
    "polusdt@trade",
    "dotusdt@trade",
    "dogeusdt@trade",
]
BINANCE_API_KEY    = os.getenv("BINANCE_API_KEY", "")
BINANCE_API_SECRET = os.getenv("BINANCE_API_SECRET", "")

# ─────────────────────────────────────────
# OKX WebSocket (백업)
# ─────────────────────────────────────────
OKX_WS_URL      = "wss://ws.okx.com:8443/ws/v5/public"
OKX_API_KEY     = os.getenv("OKX_API_KEY", "")
OKX_API_SECRET  = os.getenv("OKX_API_SECRET", "")
OKX_PASSPHRASE  = os.getenv("OKX_PASSPHRASE", "")

# ─────────────────────────────────────────
# Polymarket API
# ─────────────────────────────────────────
POLYMARKET_GAMMA_URL = "https://gamma-api.polymarket.com"
POLYMARKET_CLOB_URL  = "https://clob.polymarket.com"
POLYGON_CHAIN_ID     = 137   # Polygon 메인넷

POLYMARKET_API_KEY        = os.getenv("POLYMARKET_API_KEY", "")
POLYMARKET_API_SECRET     = os.getenv("POLYMARKET_API_SECRET", "")
POLYMARKET_API_PASSPHRASE = os.getenv("POLYMARKET_API_PASSPHRASE", "")
POLYGON_PRIVATE_KEY       = os.getenv("POLYGON_PRIVATE_KEY", "")

# ─────────────────────────────────────────
# 텔레그램 알림
# ─────────────────────────────────────────
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID   = os.getenv("TELEGRAM_CHAT_ID", "")

# ─────────────────────────────────────────
# 데이터베이스
# ─────────────────────────────────────────
DB_PATH = "bot_trades.db"

# ─────────────────────────────────────────
# 확률 모델 보정 테이블
# 바이낸스 30초 가격 변동폭 → 예측 시장 결과 확률
# ─────────────────────────────────────────
PROB_CALIBRATION = [
    # (최소변동%, 최대변동%, 예상확률) - k=2.0 sigmoid 기반 보정
    # 급격한 스파이크(마지막 2.7초에 집중)일 때만 갭이 발생하도록 보정됨
    (0.05, 0.10, 0.54),   # sigmoid(2×0.075)≈0.537 → 보수적으로 0.54
    (0.10, 0.20, 0.57),   # sigmoid(2×0.15)≈0.574 → 0.57
    (0.20, 0.30, 0.60),   # sigmoid(2×0.25)≈0.622 → 0.60
    (0.30, 0.40, 0.65),   # sigmoid(2×0.35)≈0.668 → 0.65
    (0.40, 0.60, 0.71),   # sigmoid(2×0.5)≈0.731 → 0.71
    (0.60, 0.80, 0.77),   # sigmoid(2×0.7)≈0.803 → 0.77
    (0.80, 1.0,  0.83),   # sigmoid(2×0.9)≈0.857 → 0.83
    (1.0,  1.5,  0.88),
    (1.5,  99.0, 0.93),
]

"""
Polymarket CLOB API 키 자동 생성 스크립트

실행 방법:
  python setup_api_key.py

필요한 것:
  .env 파일에 POLYGON_PRIVATE_KEY 입력 완료

결과:
  .env 파일에 POLYMARKET_API_KEY, POLYMARKET_API_SECRET,
  POLYMARKET_API_PASSPHRASE 자동 저장
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv, set_key

load_dotenv()

def main():
    print("\n" + "="*50)
    print("  Polymarket CLOB API 키 생성")
    print("="*50 + "\n")

    private_key = os.getenv("POLYGON_PRIVATE_KEY", "").strip()

    if not private_key:
        print("❌ .env 파일에 POLYGON_PRIVATE_KEY가 없습니다.")
        print()
        print("설정 방법:")
        print("  1. 팬텀 지갑 열기")
        print("  2. 설정 → Security & Privacy → Export Private Key")
        print("  3. .env 파일에 POLYGON_PRIVATE_KEY=개인키 입력")
        print()
        sys.exit(1)

    print(f"✓ 개인키 확인: {private_key[:6]}...{private_key[-4:]}")
    print()
    print("API 키 생성 중...")

    try:
        from py_clob_client.client import ClobClient
        from py_clob_client.constants import POLYGON

        # CLOB 클라이언트 초기화
        client = ClobClient(
            host="https://clob.polymarket.com",
            chain_id=POLYGON,
            key=private_key,
        )

        # API 자격증명 생성 (지갑 서명으로 파생)
        creds = client.create_or_derive_api_creds()

        api_key        = creds.api_key
        api_secret     = creds.api_secret
        api_passphrase = creds.api_passphrase

        print(f"✅ API 키 생성 성공!\n")
        print(f"  API Key:        {api_key[:12]}...")
        print(f"  API Secret:     {api_secret[:12]}...")
        print(f"  API Passphrase: {api_passphrase[:8]}...")
        print()

        # .env 파일에 자동 저장
        env_path = Path(__file__).parent / ".env"
        if not env_path.exists():
            env_path.write_text("")

        set_key(str(env_path), "POLYMARKET_API_KEY",        api_key)
        set_key(str(env_path), "POLYMARKET_API_SECRET",     api_secret)
        set_key(str(env_path), "POLYMARKET_API_PASSPHRASE", api_passphrase)

        print("✅ .env 파일에 자동 저장 완료!")
        print()
        print("다음 단계:")
        print("  페이퍼 트레이딩: python main.py")
        print("  실거래:         python main.py --live")
        print()

    except ImportError:
        print("❌ py-clob-client 미설치")
        print("   → pip install -r requirements.txt 먼저 실행하세요")
        sys.exit(1)
    except Exception as e:
        print(f"❌ API 키 생성 실패: {e}")
        print()
        print("가능한 원인:")
        print("  - 개인키 형식 오류 (0x 접두사 없이 입력)")
        print("  - 네트워크 연결 문제")
        print("  - 팬텀 지갑이 Polygon 네트워크용 키인지 확인")
        print()
        print("팬텀 개인키 형식 예시:")
        print("  POLYGON_PRIVATE_KEY=abcdef1234567890abcdef1234567890abcdef12...")
        print("  (0x 접두사 없이, 64자리 16진수)")
        sys.exit(1)


if __name__ == "__main__":
    main()

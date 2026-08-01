#!/usr/bin/env bash
#
# TypePop WebGL 버전 실행 스크립트
#
# 사용법:
#   ./scripts/serve-web.sh          # 8000 포트로 띄우고 브라우저 열기
#   ./scripts/serve-web.sh 9000     # 포트 지정
#
# web/index.html 은 ES 모듈과 fetch 를 쓰기 때문에 file:// 로는 열리지 않는다.
# 폰트/환경 맵을 typePop/ 에서 그대로 가져다 쓰므로 저장소 루트를 서빙한다.

set -euo pipefail

cd "$(dirname "$0")/.."
PORT="${1:-8000}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 가 필요합니다" >&2
  exit 1
fi

URL="http://localhost:$PORT/web/"
echo "==> $URL"
echo "    (종료: Ctrl-C)"

# 서버가 뜬 뒤에 브라우저를 연다.
( sleep 1; command -v open >/dev/null 2>&1 && open "$URL" ) &

exec python3 -m http.server "$PORT" --bind 127.0.0.1

#!/usr/bin/env bash
#
# TypePop 실행 스크립트
#
# 사용법:
#   ./scripts/run.sh              # Debug 구성으로 빌드 후 실행 (기본)
#   ./scripts/run.sh Release      # Release 구성으로 빌드 후 실행
#
# build.sh 로 .app 을 만든 뒤 `open` 으로 실행합니다.

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

CONFIG="${1:-Debug}"

# 빌드 (의존성 설치 포함)
"$ROOT/scripts/build.sh" "$CONFIG"

# 실행
echo "==> TypePop 실행"
open "$ROOT/TypePop.app"

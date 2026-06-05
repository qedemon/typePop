#!/usr/bin/env bash
#
# TypePop 빌드 스크립트
#
# 사용법:
#   ./scripts/build.sh            # Release 구성으로 .app 빌드 (기본)
#   ./scripts/build.sh Debug      # Debug 구성으로 빌드
#
# 빌드 결과(.app)는 build/Build/Products/<구성>/TypePop.app 에 생성되고,
# 편의를 위해 저장소 루트로도 복사됩니다.

set -euo pipefail

# 저장소 루트로 이동 (스크립트 위치 기준)
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

CONFIG="${1:-Release}"
DERIVED="$ROOT/build"

# 1. 의존성 확인 / 설치 (freetype, freeimage, glm)
if ! command -v brew >/dev/null 2>&1; then
  echo "error: Homebrew가 필요합니다. https://brew.sh 참고" >&2
  exit 1
fi
echo "==> 의존성 확인 (brew bundle)"
brew bundle --file="$ROOT/Brewfile"

# 2. 빌드
echo "==> $CONFIG 구성으로 빌드"
xcodebuild \
  -project typePop.xcodeproj \
  -scheme TypePop \
  -configuration "$CONFIG" \
  -derivedDataPath "$DERIVED" \
  build

# 3. 결과 .app 위치 안내 및 루트로 복사
APP="$DERIVED/Build/Products/$CONFIG/TypePop.app"
if [ -d "$APP" ]; then
  rm -rf "$ROOT/TypePop.app"
  cp -R "$APP" "$ROOT/TypePop.app"
  echo ""
  echo "✅ 빌드 완료"
  echo "   - $APP"
  echo "   - $ROOT/TypePop.app (복사본)"
else
  echo "error: .app 을 찾지 못했습니다: $APP" >&2
  exit 1
fi

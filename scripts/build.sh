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

# 3. 결과 .app 을 루트로 복사
APP="$DERIVED/Build/Products/$CONFIG/TypePop.app"
if [ ! -d "$APP" ]; then
  echo "error: .app 을 찾지 못했습니다: $APP" >&2
  exit 1
fi
rm -rf "$ROOT/TypePop.app"
cp -R "$APP" "$ROOT/TypePop.app"

# 4. Homebrew dylib(freetype/freeimage/libpng 등)을 .app 안에 임베드해서
#    독립 실행형으로 만든다. (install_name 을 @executable_path 로 재작성)
echo "==> 의존 라이브러리를 .app 에 임베드"
dylibbundler -of -cd -b \
  -x "$ROOT/TypePop.app/Contents/MacOS/TypePop" \
  -d "$ROOT/TypePop.app/Contents/Frameworks" \
  -p @executable_path/../Frameworks
# install_name 변경으로 무효화된 서명을 다시 ad-hoc 서명
codesign --force --deep -s - "$ROOT/TypePop.app"

echo ""
echo "✅ 빌드 완료 (독립 실행형)"
echo "   - $ROOT/TypePop.app"
echo "   외부 라이브러리 의존성:"
otool -L "$ROOT/TypePop.app/Contents/MacOS/TypePop" | grep -qE "/opt/homebrew|/usr/local" \
  && echo "   ⚠️  외부 의존성이 남아 있습니다" \
  || echo "   → 없음 (Frameworks/ 에 모두 포함)"

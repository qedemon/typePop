#!/usr/bin/env bash
#
# TypePop WebGL 버전 배포 스크립트
#
# 사용법:
#   ./scripts/deploy-web.sh
#   TARGET=ubuntu@example.com ./scripts/deploy-web.sh
#
# web/ 과 폰트/환경 맵을 하나의 디렉터리로 묶어 서버의 릴리스 디렉터리에 올리고,
# 심볼릭 링크를 새 릴리스로 돌린다(교체가 원자적이라 배포 중 끊기지 않는다).
#
# 서버 쪽 배치:
#   ~/typepop-releases/<타임스탬프>/typePop/   실제 파일
#   ~/typepop-site -> ~/typepop-releases/<타임스탬프>
#
# nginx 는 ~/typepop-site 를 root 로 두고 /typePop/ 경로를 서빙한다.
# (server 블록 설정은 최초 1회만 필요 — README 의 "웹 버전 배포" 참고)

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

TARGET="${TARGET:-ubuntu@qedemon.snuaaa.net}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/qedemon.pem}"
REMOTE_RELEASES="${REMOTE_RELEASES:-typepop-releases}"
REMOTE_LINK="${REMOTE_LINK:-typepop-site}"
KEEP="${KEEP:-3}" # 서버에 남겨 둘 이전 릴리스 개수

SSH=(ssh -o IdentitiesOnly=yes -i "$SSH_KEY" "$TARGET")

# 브라우저가 받아야 하는 것들. 나머지 폰트/이미지는 네이티브 버전 전용이라 뺀다.
ASSETS=(
  ANGMAP11.jpg
  LucidaGrande.ttc
  Wingdings.ttf
  AppleSDGothicNeo.ttc
)

STAMP="$(date +%Y%m%d-%H%M%S)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

echo "==> 배포본 만드는 중 ($STAMP)"
mkdir -p "$STAGE/typePop"
cp -R "$ROOT/web/." "$STAGE/typePop/"

mkdir -p "$STAGE/typePop/assets"
for f in "${ASSETS[@]}"; do
  if [ ! -f "$ROOT/typePop/$f" ]; then
    echo "error: 자산이 없습니다: typePop/$f" >&2
    exit 1
  fi
  cp "$ROOT/typePop/$f" "$STAGE/typePop/assets/"
done

# 배포본은 자기 아래 assets/ 를 본다.
sed -i '' -e 's|<meta name="typepop-assets" content="../typePop/">|<meta name="typepop-assets" content="assets/">|' \
  "$STAGE/typePop/index.html" 2>/dev/null \
  || sed -i -e 's|<meta name="typepop-assets" content="../typePop/">|<meta name="typepop-assets" content="assets/">|' \
       "$STAGE/typePop/index.html"

if ! grep -q 'content="assets/"' "$STAGE/typePop/index.html"; then
  echo "error: index.html 의 자산 경로를 바꾸지 못했습니다" >&2
  exit 1
fi

echo "    크기: $(du -sh "$STAGE/typePop" | cut -f1)"

echo "==> $TARGET 으로 올리는 중"
"${SSH[@]}" "mkdir -p ~/$REMOTE_RELEASES/$STAMP"
rsync -az --delete -e "ssh -o IdentitiesOnly=yes -i $SSH_KEY" \
  "$STAGE/typePop" "$TARGET:~/$REMOTE_RELEASES/$STAMP/"

echo "==> 릴리스 전환"
"${SSH[@]}" bash -s -- "$REMOTE_RELEASES" "$REMOTE_LINK" "$STAMP" "$KEEP" <<'REMOTE'
set -euo pipefail
RELEASES="$1"; LINK="$2"; STAMP="$3"; KEEP="$4"

ln -sfn "$HOME/$RELEASES/$STAMP" "$HOME/$LINK"
echo "    $HOME/$LINK -> $(readlink "$HOME/$LINK")"

# 오래된 릴리스 정리
cd "$HOME/$RELEASES"
ls -1d */ 2>/dev/null | sed 's|/$||' | sort -r | tail -n "+$((KEEP + 1))" | while read -r old; do
  echo "    이전 릴리스 삭제: $old"
  rm -rf "$old"
done
REMOTE

echo ""
echo "✅ 배포 완료 — https://qedemon.snuaaa.net/typePop/"

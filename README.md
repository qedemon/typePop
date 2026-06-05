# TypePop

키보드 입력에 반응하는 OpenGL 타이포그래피 데모 (macOS).

데모 영상: https://youtu.be/00vgNeHed84

## 의존성

서드파티 라이브러리는 더 이상 저장소에 포함(vendor)하지 않고 [Homebrew](https://brew.sh)로 설치합니다.

| 라이브러리 | 용도 |
| --- | --- |
| `freetype` | 폰트 로딩 / 글리프 외곽선 |
| `freeimage` | 이미지 로딩 |
| `glm` | 헤더 전용 OpenGL 수학 라이브러리 |

## 빌드 & 실행

### 스크립트 사용 (권장)

```sh
# 빌드 후 바로 실행 (Debug)
./scripts/run.sh

# .app 만 빌드 (기본 Release) — 결과는 ./TypePop.app 으로 복사됨
./scripts/build.sh            # Release
./scripts/build.sh Debug      # Debug
```

두 스크립트 모두 실행 시 `brew bundle` 로 의존성을 먼저 확인/설치합니다.
`build.sh` 는 `.app` 번들을 만들고, `run.sh` 는 만든 `.app` 을 `open` 으로 실행합니다.

### 수동 빌드

```sh
# 1. 의존성 설치 (최초 1회)
brew bundle

# 2. 빌드 (.app 은 build/Build/Products/<구성>/TypePop.app 에 생성)
xcodebuild -project typePop.xcodeproj -scheme TypePop \
  -configuration Release -derivedDataPath build build

# 또는 Xcode 에서 typePop.xcodeproj 를 열고 TypePop 스킴을 실행
```

빌드 설정의 include / library 검색 경로는 [Dependencies.xcconfig](Dependencies.xcconfig)에 모아 두었습니다.
Apple Silicon(`/opt/homebrew`)과 Intel(`/usr/local`) Homebrew 경로를 모두 포함하므로
별도 수정 없이 두 환경 모두에서 빌드됩니다.

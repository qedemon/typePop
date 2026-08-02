# TypePop

키보드 입력에 반응하는 OpenGL 타이포그래피 데모.

데모 영상: https://youtu.be/00vgNeHed84

두 가지 구현이 있습니다.

| 구현 | 위치 | 설명 |
| --- | --- | --- |
| macOS 네이티브 | 저장소 루트 / [typePop/](typePop/) | Objective-C + OpenGL 4.1 (원본) |
| 웹 | [web/](web/) | WebGL2, 의존성 없음 — [자세히](#webgl-버전) |

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

`build.sh` 는 마지막에 `dylibbundler` 로 FreeType/FreeImage/libpng dylib 을
`TypePop.app/Contents/Frameworks/` 안에 복사하고 링크 경로를 `@executable_path`
기준으로 재작성합니다. 따라서 만들어진 `.app` 은 **Homebrew 가 없는 다른 Mac 으로
복사해도 그대로 실행**되는 독립 실행형 번들입니다.

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

## WebGL 버전

같은 데모를 브라우저에서 돌리는 이식판이 [web/](web/) 에 있습니다.
빌드 단계도, 서드파티 라이브러리도 없습니다.

```sh
./scripts/serve-web.sh          # http://localhost:8000/web/ 로 열림
./scripts/serve-web.sh 9000     # 포트 지정
```

ES 모듈과 `fetch` 를 쓰기 때문에 `file://` 로 직접 열면 동작하지 않습니다.
폰트와 환경 맵은 네이티브 버전이 쓰는 [typePop/](typePop/) 안의 파일을 그대로 가져다 씁니다.

조작은 원본과 같습니다. 아무 키나 누르면 그 키의 키보드 위치에서 글자가 튀어나오고,
누르고 있으면 초당 6개씩 계속 나옵니다. <kbd>Enter</kbd> 로 Wingdings 심볼 폰트와
전환하고, <kbd>Tab</kbd> 으로 두벌식 한글 자판을 켭니다
(한글 폰트는 28MB 라 이때 처음 내려받습니다).

### 배포

```sh
./scripts/deploy-web.sh
```

[web/](web/) 과 브라우저가 필요로 하는 폰트·환경 맵을 한 디렉터리로 묶어
타임스탬프 릴리스로 올리고 심볼릭 링크를 돌립니다(교체가 원자적이라 무중단).
`TARGET` / `SSH_KEY` 환경 변수로 대상 서버를 바꿀 수 있습니다.

배포본에서는 `index.html` 의 `typepop-assets` 메타 태그를 자기 아래 `assets/` 로
바꿔 씁니다. 저장소에서 그냥 열 때는 네이티브 버전이 쓰는 [typePop/](typePop/) 을
그대로 가리키므로 파일이 중복되지 않습니다.

서버 배치와 nginx 설정(최초 1회):

```
~/typepop-releases/<타임스탬프>/typePop/    실제 파일
~/typepop-site -> ~/typepop-releases/<타임스탬프>
```

```nginx
root /home/ubuntu/typepop-site;

location = /typePop  { return 301 /typePop/; }
location /typePop/   { index index.html; try_files $uri $uri/ =404; }
```

nginx 는 `www-data` 로 돌기 때문에 홈 디렉터리를 통과할 수 있어야 합니다
(`chmod o+x /home/ubuntu`).

### 이식하면서 달라진 점

| 원본 (OpenGL 4.1) | 웹 (WebGL2) |
| --- | --- |
| FreeType 으로 글리프 외곽선 추출 | [web/js/sfnt.js](web/js/sfnt.js) — TrueType `glyf` / CFF Type2 파서를 직접 구현 |
| 지오메트리 셰이더가 면 노멀 계산 | WebGL2 에는 지오메트리 셰이더가 없어 CPU 에서 삼각형별 노멀을 미리 만든다 ([glyphmesh.js](web/js/glyphmesh.js)) |
| Uniform Buffer Object | 일반 uniform |
| `glMapBuffer` 로 정점 채우기 | `bufferData` |
| FreeImage 로 환경 맵 로딩 | `Image` + `texImage2D` |

렌더링 방식 자체는 그대로입니다. 글리프 앞/뒷면은 폴리곤 분할 없이 스텐실 even-odd
반전으로 채우고, 옆면을 이어 붙여 두께를 만든 뒤, 각도 맵(angular map) 반사로 색을 칠합니다.

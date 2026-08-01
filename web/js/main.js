//
//  main.js
//  typePop (WebGL)
//
//  원본의 MyOpenGLView / TypePopController 자리 — 리소스 로딩, 입력, 프레임 루프.
//

import { Font } from './sfnt.js';
import { Renderer } from './renderer.js';
import { TypePopScene } from './scene.js';
import { hangulFor } from './keymap.js';

const ASSETS = '../typePop/';
const ENV_MAP = ASSETS + 'ANGMAP11.jpg';
const EN_FONT = ASSETS + 'LucidaGrande.ttc';
const SYMBOL_FONT = ASSETS + 'Wingdings.ttf';
const KO_FONT = ASSETS + 'AppleSDGothicNeo.ttc';

const $ = (id) => document.getElementById(id);
const canvas = $('gl');
const loader = $('loader');
const loaderText = $('loader-text');
const loaderBar = $('loader-bar');
const hud = $('hud');
const fontLabel = $('font-label');
const hangulLabel = $('hangul-label');
const errorBox = $('error');

function status(text, ratio) {
  loaderText.textContent = text;
  loaderBar.style.width = ratio === undefined ? '' : `${Math.round(ratio * 100)}%`;
}

/** 진행률을 알 수 있게 스트리밍으로 받는다(폰트가 커서 체감 차이가 크다). */
async function fetchWithProgress(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} 를 불러오지 못했습니다 (${res.status})`);
  const total = Number(res.headers.get('content-length')) || 0;
  if (!res.body || !total) return res.arrayBuffer();

  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress?.(received / total);
  }
  const out = new Uint8Array(received);
  let p = 0;
  for (const c of chunks) {
    out.set(c, p);
    p += c.length;
  }
  return out.buffer;
}

function loadImage(url, onProgress) {
  return fetchWithProgress(url, onProgress).then(
    (buf) =>
      new Promise((resolve, reject) => {
        const blob = new Blob([buf]);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(img.src);
          resolve(img);
        };
        img.onerror = () => reject(new Error(`이미지 디코드 실패: ${url}`));
        img.src = URL.createObjectURL(blob);
      })
  );
}

async function main() {
  const renderer = new Renderer(canvas);
  const scene = new TypePopScene(renderer);

  status('환경 맵 불러오는 중…', 0);
  const envImage = await loadImage(ENV_MAP, (r) => status('환경 맵 불러오는 중…', r * 0.3));
  renderer.createTexture(envImage);

  status('영문 폰트 불러오는 중…', 0.3);
  const enBuf = await fetchWithProgress(EN_FONT, (r) => status('영문 폰트 불러오는 중…', 0.3 + r * 0.4));
  const enFont = new Font(enBuf);

  status('심볼 폰트 불러오는 중…', 0.7);
  const wdBuf = await fetchWithProgress(SYMBOL_FONT, (r) => status('심볼 폰트 불러오는 중…', 0.7 + r * 0.1));
  const wingdingFont = new Font(wdBuf);

  status('글리프 메시 만드는 중…', 0.85);
  await new Promise((r) => requestAnimationFrame(r));
  scene.loadFonts(enFont, wingdingFont, null);

  status('준비 완료', 1);
  loader.classList.add('hidden');
  hud.classList.remove('hidden');

  // ---- 한글 폰트는 실제로 쓸 때만 받는다(28MB) --------------------------
  let hangulMode = false;
  let koLoading = false;
  let koReady = false;

  async function ensureKoreanFont() {
    if (koReady || koLoading) return;
    koLoading = true;
    loader.classList.remove('hidden');
    try {
      status('한글 폰트 불러오는 중…', 0);
      const buf = await fetchWithProgress(KO_FONT, (r) => status('한글 폰트 불러오는 중…', r));
      status('한글 글리프 만드는 중…', 1);
      await new Promise((r) => requestAnimationFrame(r));
      scene.addKoreanGlyphs(new Font(buf));
      koReady = true;
    } catch (e) {
      showError(e);
    } finally {
      koLoading = false;
      loader.classList.add('hidden');
    }
  }

  function setHangulMode(on) {
    hangulMode = on;
    hangulLabel.textContent = on ? '한글' : '영문';
    hangulLabel.classList.toggle('on', on);
    if (on) ensureKoreanFont();
  }

  // ---- 입력 -------------------------------------------------------------
  // 어떤 물리 키가 어떤 글자를 눌렀는지 기억해 두면, Shift 를 먼저 떼도
  // keyup 에서 같은 글자를 정확히 놓을 수 있다.
  const activeByCode = new Map();

  function charForEvent(e) {
    if (hangulMode) {
      const j = hangulFor(e.code, e.shiftKey);
      if (j) return j;
    }
    if (e.key === ' ' || e.code === 'Space') return ' ';
    return [...e.key].length === 1 ? e.key : null;
  }

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === 'Space' || e.key === '/' || e.key === "'") e.preventDefault();

    if (e.key === 'Enter') {
      if (e.repeat) return;
      fontLabel.textContent = scene.toggleFont() === 'wingdings' ? 'Wingdings' : 'Lucida Grande';
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      setHangulMode(!hangulMode);
      return;
    }
    if (e.repeat) return;

    const ch = charForEvent(e);
    if (!ch) return;
    const code = e.code || ch;
    if (activeByCode.has(code)) return;
    activeByCode.set(code, ch);
    scene.keyDown(ch);
  });

  window.addEventListener('keyup', (e) => {
    const code = e.code || e.key;
    const ch = activeByCode.get(code);
    if (ch !== undefined) {
      activeByCode.delete(code);
      scene.keyUp(ch);
    }
  });

  // 창을 벗어나면 눌린 키가 남아 계속 쏟아지는 걸 막는다.
  window.addEventListener('blur', () => {
    activeByCode.clear();
    scene.releaseAll();
  });

  $('btn-font').addEventListener('click', () => {
    fontLabel.textContent = scene.toggleFont() === 'wingdings' ? 'Wingdings' : 'Lucida Grande';
    canvas.focus();
  });
  $('btn-hangul').addEventListener('click', () => {
    setHangulMode(!hangulMode);
    canvas.focus();
  });

  // ---- 프레임 루프 -------------------------------------------------------
  let last = performance.now();
  let fpsAcc = 0;
  let fpsCount = 0;

  function frame(now) {
    // 탭이 비활성이었다가 돌아왔을 때 한 프레임에 몰려 나오지 않게 제한한다.
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    const { width, height } = renderer.resize();
    scene.setViewport(width, height);
    scene.update(dt);
    scene.draw();

    fpsAcc += dt;
    fpsCount++;
    if (fpsAcc >= 0.5) {
      $('stat').textContent = `${Math.round(fpsCount / fpsAcc)} fps · ${scene.count} glyphs`;
      fpsAcc = 0;
      fpsCount = 0;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function showError(e) {
  console.error(e);
  errorBox.textContent = String(e.message || e);
  errorBox.classList.remove('hidden');
  loader.classList.add('hidden');
}

main().catch(showError);

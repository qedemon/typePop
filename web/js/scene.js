//
//  scene.js
//  typePop (WebGL)
//
//  원본 TypePopScene.mm + GlyphPoint.m + PushKey.m 에 해당한다.
//  키를 누르고 있으면 초당 6개씩 글리프가 튀어나오고, 중력을 받아 떨어지다가
//  화면 아래(y < -1)로 나가면 사라진다.
//

import * as mat4 from './mat4.js';
import { buildGlyphMesh } from './glyphmesh.js';
import { eachKey } from './keymap.js';

const SPAWN_PER_SECOND = 6.0;
const GRAVITY = 2.0;
const GLYPH_SCALE = 1 / 15;
const EYE = [0, 0, 4];

let nextMeshId = 1;

class GlyphPoint {
  constructor(glyph) {
    this.glyph = glyph;
    this.pos = [0, 0, 0];
    this.posV = [0, 0, 0];
    this.axis = [0, 0, 1];
    this.rotation = 0;
    this.rotV = 0;
    this.m = new Float32Array(16);
    this.r = new Float32Array(16);
    this.tmp = new Float32Array(16);
    this.s = mat4.scale(GLYPH_SCALE);
  }

  update(dt) {
    this.posV[1] -= GRAVITY * dt;
    for (let i = 0; i < 3; i++) this.pos[i] += this.posV[i] * dt;
    this.rotation += this.rotV * dt;
  }

  /** 모델 행렬 = T * R * S — 원본 drawGlyphPoint 와 같다. */
  matrices() {
    mat4.rotate(this.rotation, this.axis[0], this.axis[1], this.axis[2], this.r);
    const t = mat4.translate(this.pos[0], this.pos[1], this.pos[2], this.tmp);
    mat4.multiply(t, this.r, this.m);
    mat4.multiply(this.m, this.s, this.m);
    return this;
  }
}

export class TypePopScene {
  constructor(renderer) {
    this.renderer = renderer;
    this.glyphDict = new Map();   // 기본 폰트
    this.wingdingDict = new Map(); // Enter 로 전환하는 심볼 폰트
    this.currentDict = this.glyphDict;
    this.pushedKeys = new Map();
    this.points = [];
    this.pv = new Float32Array(16);
    this.eye = new Float32Array(EYE);
  }

  /**
   * 키보드 배열대로 글리프 메시를 만들어 GPU 에 올린다.
   * koFont 가 없으면 한글 낱자는 건너뛴다(나중에 addKoreanGlyphs 로 추가).
   */
  buildDict(dict, enFont, koFont) {
    const renderer = this.renderer;
    const cache = new Map(); // 같은 폰트/문자는 한 번만 만든다
    eachKey((ch, lang, keyPos) => {
      const font = lang === 'ko' ? koFont : enFont;
      if (!font) return;
      const cacheKey = lang + ch;
      let mesh = cache.get(cacheKey);
      if (!mesh) {
        const gid = font.glyphIndex(ch.codePointAt(0));
        const gpu = renderer.upload(buildGlyphMesh(font.getPath(gid), font.unitsPerEm));
        gpu.id = nextMeshId++;
        mesh = gpu;
        cache.set(cacheKey, mesh);
      }
      // 같은 문자가 여러 세트에 나오면 원본과 같이 나중 것이 이긴다.
      dict.set(ch, { gpu: mesh, keyPos });
    });
    return dict;
  }

  loadFonts(enFont, wingdingFont, koFont) {
    this.buildDict(this.glyphDict, enFont, koFont);
    this.buildDict(this.wingdingDict, wingdingFont, wingdingFont);
  }

  /** 한글 폰트를 나중에 받아왔을 때 기본 사전에 낱자를 채워 넣는다. */
  addKoreanGlyphs(koFont) {
    const renderer = this.renderer;
    const cache = new Map();
    eachKey((ch, lang, keyPos) => {
      if (lang !== 'ko') return;
      let mesh = cache.get(ch);
      if (!mesh) {
        const gid = koFont.glyphIndex(ch.codePointAt(0));
        mesh = renderer.upload(buildGlyphMesh(koFont.getPath(gid), koFont.unitsPerEm));
        mesh.id = nextMeshId++;
        cache.set(ch, mesh);
      }
      this.glyphDict.set(ch, { gpu: mesh, keyPos });
    });
  }

  setViewport(width, height) {
    // 원본과 동일: 가로 반각 0.25, 세로는 화면 비율만큼 좁힌다.
    const aspect = height / width;
    const proj = mat4.frustum(-0.25, 0.25, -0.25 * aspect, 0.25 * aspect, 1.0, 10.0);
    const view = mat4.lookAt(EYE, [0, 0, 0], [0, 1, 0]);
    mat4.multiply(proj, view, this.pv);
  }

  // ---- 입력 --------------------------------------------------------------

  keyDown(key) {
    if (!this.pushedKeys.has(key)) {
      this.pushedKeys.set(key, { time: 1.0 }); // 누르자마자 하나 나오도록
    }
  }

  keyUp(key) {
    this.pushedKeys.delete(key);
  }

  releaseAll() {
    this.pushedKeys.clear();
  }

  toggleFont() {
    this.currentDict = this.currentDict === this.glyphDict ? this.wingdingDict : this.glyphDict;
    return this.currentDict === this.wingdingDict ? 'wingdings' : 'text';
  }

  // ---- 물리 --------------------------------------------------------------

  spawn(key) {
    const entry = this.currentDict.get(key);
    if (!entry) return;

    const u = Math.random();
    const v = Math.random();
    const w = Math.random();
    const theta = Math.PI * 2 * u;
    const phi = Math.acos(2 * v - 1);

    const gp = new GlyphPoint(entry.gpu);
    gp.pos = [entry.keyPos, -0.75, 0];
    gp.posV = [0.1 * (2 * v - 1), 1.8 + 0.5 * u, 0];
    // 원본 TypePopScene.mm 의 축 계산을 그대로 옮겼다(y 성분이 x 와 같은 것도 원본 그대로).
    gp.axis = [Math.cos(theta) * Math.sin(phi), Math.cos(theta) * Math.sin(phi), Math.cos(phi)];
    gp.rotation = 0;
    gp.rotV = (Math.PI / 2) * w + Math.PI * 2 * (1 - w);

    // 같은 글리프끼리 모이도록 정렬해 넣는다(원본은 VAO 번호로 정렬).
    let index = 0;
    while (index < this.points.length && this.points[index].glyph.id < gp.glyph.id) index++;
    this.points.splice(index, 0, gp);
  }

  update(dt) {
    for (const [key, pk] of this.pushedKeys) {
      pk.time += SPAWN_PER_SECOND * dt;
      while (pk.time >= 1.0) {
        pk.time -= 1.0;
        this.spawn(key);
      }
    }
    for (const gp of this.points) gp.update(dt);
    // 화면 아래로 나간 것 제거
    let n = 0;
    for (const gp of this.points) if (gp.pos[1] >= -1.0) this.points[n++] = gp;
    this.points.length = n;
  }

  draw() {
    const r = this.renderer;
    r.beginFrame(this.pv, this.eye);
    for (const gp of this.points) {
      gp.matrices();
      r.drawGlyph(gp.glyph, gp.m, gp.r);
    }
  }

  get count() {
    return this.points.length;
  }
}

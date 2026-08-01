//
//  sfnt.js
//  typePop (WebGL)
//
//  TrueType/OpenType 폰트에서 글리프 외곽선을 뽑아내는 최소 파서.
//  원본 macOS 버전이 FreeType(FT_Outline_Decompose)으로 하던 일을 대신한다.
//
//  지원 범위:
//    - 컨테이너: 단일 sfnt(.ttf/.otf), TTC 컬렉션(.ttc)
//    - 외곽선  : glyf(TrueType, 2차 베지어) / CFF(Type2 charstring, 3차 베지어)
//    - 문자맵  : cmap format 0 / 4 / 6 / 12
//
//  getPath(gid) 는 폰트 유닛 좌표의 명령 배열을 돌려준다.
//    {c:'M',x,y} {c:'L',x,y} {c:'Q',x1,y1,x,y} {c:'C',x1,y1,x2,y2,x,y}
//  FreeType 과 마찬가지로 컨투어는 암묵적으로 닫힌 것으로 본다(닫는 명령 없음).
//

const TTCF = 0x74746366; // 'ttcf'

function readTag(dv, p) {
  return String.fromCharCode(dv.getUint8(p), dv.getUint8(p + 1), dv.getUint8(p + 2), dv.getUint8(p + 3));
}

export class Font {
  constructor(arrayBuffer, fontIndex = 0) {
    this.dv = new DataView(arrayBuffer);
    this.buf = arrayBuffer;
    const dv = this.dv;

    let base = 0;
    if (dv.getUint32(0) === TTCF) {
      const n = dv.getUint32(8);
      if (fontIndex >= n) fontIndex = 0;
      base = dv.getUint32(12 + 4 * fontIndex);
    }

    const numTables = dv.getUint16(base + 4);
    this.tables = {};
    for (let i = 0; i < numTables; i++) {
      const p = base + 12 + 16 * i;
      // 'CFF ' / 'cvt ' 처럼 뒤에 공백이 붙는 태그가 있어 trim 한다.
      this.tables[readTag(dv, p).trim()] = {
        offset: dv.getUint32(p + 8),
        length: dv.getUint32(p + 12),
      };
    }

    const head = this.tables.head;
    if (!head) throw new Error('sfnt: head 테이블 없음');
    this.unitsPerEm = dv.getUint16(head.offset + 18) || 1000;
    this.indexToLocFormat = dv.getInt16(head.offset + 50);
    this.numGlyphs = this.tables.maxp ? dv.getUint16(this.tables.maxp.offset + 4) : 0;

    this.cmap = this._parseCmap();
    this.cff = this.tables.CFF ? parseCFF(dv, this.tables.CFF.offset) : null;
    if (!this.cff && !this.tables.glyf) throw new Error('sfnt: glyf/CFF 외곽선 없음');

    this._pathCache = new Map();
  }

  // ---- cmap ---------------------------------------------------------------

  _parseCmap() {
    const t = this.tables.cmap;
    if (!t) return null;
    const dv = this.dv;
    const base = t.offset;
    const n = dv.getUint16(base + 2);

    // (3,10) UCS-4 > (3,1) BMP > (0,*) Unicode > (1,0) Mac Roman 순으로 고른다.
    let best = null;
    let bestScore = -1;
    for (let i = 0; i < n; i++) {
      const p = base + 4 + 8 * i;
      const platform = dv.getUint16(p);
      const encoding = dv.getUint16(p + 2);
      const offset = dv.getUint32(p + 4);
      let score = -1;
      if (platform === 3 && encoding === 10) score = 4;
      else if (platform === 3 && encoding === 1) score = 3;
      else if (platform === 0) score = 2;
      else if (platform === 1 && encoding === 0) score = 1;
      if (score > bestScore) {
        bestScore = score;
        best = base + offset;
      }
    }
    if (best === null) return null;
    return this._parseCmapSubtable(best);
  }

  _parseCmapSubtable(off) {
    const dv = this.dv;
    const format = dv.getUint16(off);
    const map = new Map();

    if (format === 0) {
      for (let i = 0; i < 256; i++) map.set(i, dv.getUint8(off + 6 + i));
    } else if (format === 4) {
      const segX2 = dv.getUint16(off + 6);
      const seg = segX2 >> 1;
      const endP = off + 14;
      const startP = endP + segX2 + 2;
      const deltaP = startP + segX2;
      const rangeP = deltaP + segX2;
      for (let i = 0; i < seg; i++) {
        const end = dv.getUint16(endP + i * 2);
        const start = dv.getUint16(startP + i * 2);
        const delta = dv.getInt16(deltaP + i * 2);
        const rangeOff = dv.getUint16(rangeP + i * 2);
        if (start === 0xffff) continue;
        for (let c = start; c <= end && c !== 0x10000; c++) {
          let gid;
          if (rangeOff === 0) {
            gid = (c + delta) & 0xffff;
          } else {
            const gp = rangeP + i * 2 + rangeOff + (c - start) * 2;
            gid = dv.getUint16(gp);
            if (gid !== 0) gid = (gid + delta) & 0xffff;
          }
          if (gid) map.set(c, gid);
        }
      }
    } else if (format === 6) {
      const first = dv.getUint16(off + 6);
      const count = dv.getUint16(off + 8);
      for (let i = 0; i < count; i++) map.set(first + i, dv.getUint16(off + 10 + i * 2));
    } else if (format === 12) {
      const nGroups = dv.getUint32(off + 12);
      for (let i = 0; i < nGroups; i++) {
        const p = off + 16 + i * 12;
        const start = dv.getUint32(p);
        const end = dv.getUint32(p + 4);
        const startGid = dv.getUint32(p + 8);
        // 폰트 전체를 도는 걸 막기 위해 비정상적으로 큰 범위는 잘라낸다.
        const last = Math.min(end, start + 0xffff);
        for (let c = start; c <= last; c++) map.set(c, startGid + (c - start));
      }
    }
    return map;
  }

  /** 유니코드 코드포인트 -> 글리프 인덱스. 없으면 0(.notdef). */
  glyphIndex(codePoint) {
    if (!this.cmap) return 0;
    return this.cmap.get(codePoint) || 0;
  }

  hasChar(codePoint) {
    return !!(this.cmap && this.cmap.get(codePoint));
  }

  // ---- 외곽선 -------------------------------------------------------------

  getPath(gid) {
    let p = this._pathCache.get(gid);
    if (!p) {
      p = this.cff ? this.cff.getPath(gid) : this._glyfPath(gid, 0);
      this._pathCache.set(gid, p);
    }
    return p;
  }

  getPathForChar(codePoint) {
    return this.getPath(this.glyphIndex(codePoint));
  }

  _locaRange(gid) {
    const loca = this.tables.loca;
    if (!loca || gid < 0 || gid >= this.numGlyphs) return null;
    const dv = this.dv;
    let start, end;
    if (this.indexToLocFormat === 0) {
      start = dv.getUint16(loca.offset + gid * 2) * 2;
      end = dv.getUint16(loca.offset + gid * 2 + 2) * 2;
    } else {
      start = dv.getUint32(loca.offset + gid * 4);
      end = dv.getUint32(loca.offset + gid * 4 + 4);
    }
    if (end <= start) return null; // 빈 글리프(공백 등)
    return [this.tables.glyf.offset + start, this.tables.glyf.offset + end];
  }

  _glyfPath(gid, depth) {
    const range = this._locaRange(gid);
    if (!range || depth > 5) return [];
    const dv = this.dv;
    const off = range[0];
    const numContours = dv.getInt16(off);
    return numContours >= 0
      ? this._simpleGlyfPath(off, numContours)
      : this._compositeGlyfPath(off, depth);
  }

  _simpleGlyfPath(off, numContours) {
    const dv = this.dv;
    let p = off + 10;
    const endPts = [];
    for (let i = 0; i < numContours; i++) {
      endPts.push(dv.getUint16(p));
      p += 2;
    }
    const nPoints = numContours > 0 ? endPts[numContours - 1] + 1 : 0;
    const insLen = dv.getUint16(p);
    p += 2 + insLen;

    const flags = new Uint8Array(nPoints);
    for (let i = 0; i < nPoints; ) {
      const f = dv.getUint8(p++);
      flags[i++] = f;
      if (f & 8) {
        let r = dv.getUint8(p++);
        while (r-- > 0 && i < nPoints) flags[i++] = f;
      }
    }

    const xs = new Int32Array(nPoints);
    let x = 0;
    for (let i = 0; i < nPoints; i++) {
      const f = flags[i];
      if (f & 2) {
        const d = dv.getUint8(p++);
        x += f & 16 ? d : -d;
      } else if (!(f & 16)) {
        x += dv.getInt16(p);
        p += 2;
      }
      xs[i] = x;
    }
    const ys = new Int32Array(nPoints);
    let y = 0;
    for (let i = 0; i < nPoints; i++) {
      const f = flags[i];
      if (f & 4) {
        const d = dv.getUint8(p++);
        y += f & 32 ? d : -d;
      } else if (!(f & 32)) {
        y += dv.getInt16(p);
        p += 2;
      }
      ys[i] = y;
    }

    const path = [];
    let s = 0;
    for (let c = 0; c < numContours; c++) {
      const e = endPts[c];
      if (e >= s) emitQuadContour(path, xs, ys, flags, s, e);
      s = e + 1;
    }
    return path;
  }

  _compositeGlyfPath(off, depth) {
    const dv = this.dv;
    let p = off + 10;
    const path = [];
    for (;;) {
      const flags = dv.getUint16(p);
      const glyphIndex = dv.getUint16(p + 2);
      p += 4;

      let dx, dy;
      if (flags & 1) {
        dx = dv.getInt16(p);
        dy = dv.getInt16(p + 2);
        p += 4;
      } else {
        dx = dv.getInt8(p);
        dy = dv.getInt8(p + 1);
        p += 2;
      }
      if (!(flags & 2)) {
        // 점 인덱스로 붙이는 방식은 드물어서 지원하지 않는다.
        dx = 0;
        dy = 0;
      }

      let a = 1, b = 0, c = 0, d = 1;
      if (flags & 8) {
        a = d = f2dot14(dv, p);
        p += 2;
      } else if (flags & 0x40) {
        a = f2dot14(dv, p);
        d = f2dot14(dv, p + 2);
        p += 4;
      } else if (flags & 0x80) {
        a = f2dot14(dv, p);
        b = f2dot14(dv, p + 2);
        c = f2dot14(dv, p + 4);
        d = f2dot14(dv, p + 6);
        p += 8;
      }

      const sub = this._glyfPath(glyphIndex, depth + 1);
      for (const cmd of sub) path.push(transformCmd(cmd, a, b, c, d, dx, dy));

      if (!(flags & 0x20)) break;
    }
    return path;
  }
}

function f2dot14(dv, p) {
  return dv.getInt16(p) / 16384;
}

function transformCmd(cmd, a, b, c, d, dx, dy) {
  const tx = (x, y) => a * x + c * y + dx;
  const ty = (x, y) => b * x + d * y + dy;
  const out = { c: cmd.c };
  if (cmd.c === 'Q' || cmd.c === 'C') {
    out.x1 = tx(cmd.x1, cmd.y1);
    out.y1 = ty(cmd.x1, cmd.y1);
  }
  if (cmd.c === 'C') {
    out.x2 = tx(cmd.x2, cmd.y2);
    out.y2 = ty(cmd.x2, cmd.y2);
  }
  out.x = tx(cmd.x, cmd.y);
  out.y = ty(cmd.x, cmd.y);
  return out;
}

/**
 * TrueType 컨투어 하나를 경로 명령으로 바꾼다.
 * 오프커브 점이 연속되면 그 중점을 온커브 점으로 끼워 넣는 표준 규칙을 따른다.
 */
function emitQuadContour(path, xs, ys, flags, s, e) {
  const n = e - s + 1;
  const on = (i) => (flags[s + ((i % n) + n) % n] & 1) !== 0;
  const px = (i) => xs[s + ((i % n) + n) % n];
  const py = (i) => ys[s + ((i % n) + n) % n];

  let startX, startY, first;
  if (on(0)) {
    startX = px(0);
    startY = py(0);
    first = 1;
  } else if (on(n - 1)) {
    startX = px(n - 1);
    startY = py(n - 1);
    first = 0;
  } else {
    startX = (px(0) + px(n - 1)) / 2;
    startY = (py(0) + py(n - 1)) / 2;
    first = 0;
  }

  path.push({ c: 'M', x: startX, y: startY });

  let ctrlX = null, ctrlY = null;
  for (let k = 0; k < n; k++) {
    const i = first + k;
    const cx = px(i), cy = py(i);
    if (on(i)) {
      if (ctrlX === null) path.push({ c: 'L', x: cx, y: cy });
      else path.push({ c: 'Q', x1: ctrlX, y1: ctrlY, x: cx, y: cy });
      ctrlX = null;
    } else {
      if (ctrlX !== null) {
        path.push({ c: 'Q', x1: ctrlX, y1: ctrlY, x: (ctrlX + cx) / 2, y: (ctrlY + cy) / 2 });
      }
      ctrlX = cx;
      ctrlY = cy;
    }
  }
  if (ctrlX !== null) path.push({ c: 'Q', x1: ctrlX, y1: ctrlY, x: startX, y: startY });
}

// ---------------------------------------------------------------------------
//  CFF (Type2 charstring)
// ---------------------------------------------------------------------------

function readIndex(dv, pos) {
  const count = dv.getUint16(pos);
  if (count === 0) return { items: [], end: pos + 2 };
  const offSize = dv.getUint8(pos + 2);
  const offBase = pos + 3;
  const readOff = (i) => {
    let v = 0;
    for (let k = 0; k < offSize; k++) v = (v << 8) | dv.getUint8(offBase + i * offSize + k);
    return v >>> 0;
  };
  const dataBase = offBase + (count + 1) * offSize - 1;
  const items = [];
  for (let i = 0; i < count; i++) items.push([dataBase + readOff(i), dataBase + readOff(i + 1)]);
  return { items, end: dataBase + readOff(count) };
}

function parseDict(dv, start, end) {
  const dict = {};
  let operands = [];
  let p = start;
  while (p < end) {
    let b = dv.getUint8(p);
    if (b <= 21) {
      let op = b;
      p++;
      if (b === 12) {
        op = 1200 + dv.getUint8(p);
        p++;
      }
      dict[op] = operands;
      operands = [];
    } else if (b === 28) {
      operands.push(dv.getInt16(p + 1));
      p += 3;
    } else if (b === 29) {
      operands.push(dv.getInt32(p + 1));
      p += 5;
    } else if (b === 30) {
      // 실수(BCD)
      let str = '';
      p++;
      loop: while (p < end) {
        const v = dv.getUint8(p++);
        for (const nib of [v >> 4, v & 15]) {
          if (nib <= 9) str += nib;
          else if (nib === 10) str += '.';
          else if (nib === 11) str += 'E';
          else if (nib === 12) str += 'E-';
          else if (nib === 14) str += '-';
          else if (nib === 15) break loop;
        }
      }
      operands.push(parseFloat(str) || 0);
    } else if (b >= 32 && b <= 246) {
      operands.push(b - 139);
      p++;
    } else if (b >= 247 && b <= 250) {
      operands.push((b - 247) * 256 + dv.getUint8(p + 1) + 108);
      p += 2;
    } else if (b >= 251 && b <= 254) {
      operands.push(-(b - 251) * 256 - dv.getUint8(p + 1) - 108);
      p += 2;
    } else {
      p++;
    }
  }
  return dict;
}

function subrBias(n) {
  return n < 1240 ? 107 : n < 33900 ? 1131 : 32768;
}

function parseCFF(dv, base) {
  const hdrSize = dv.getUint8(base + 2);
  const nameIndex = readIndex(dv, base + hdrSize);
  const topIndex = readIndex(dv, nameIndex.end);
  const stringIndex = readIndex(dv, topIndex.end);
  const gsubrIndex = readIndex(dv, stringIndex.end);

  const top = parseDict(dv, topIndex.items[0][0], topIndex.items[0][1]);
  const charStrings = readIndex(dv, base + top[17][0]);

  const readPrivate = (d) => {
    if (!d[18]) return { subrs: [], nominalWidthX: 0 };
    const [size, offset] = d[18];
    const pStart = base + offset;
    const priv = parseDict(dv, pStart, pStart + size);
    const subrs = priv[19] ? readIndex(dv, pStart + priv[19][0]).items : [];
    return { subrs, nominalWidthX: priv[21] ? priv[21][0] : 0 };
  };

  const isCID = !!top[1230];
  let fdSelect = null;
  let fdPrivate = null;
  if (isCID && top[1236]) {
    const fdArray = readIndex(dv, base + top[1236][0]);
    fdPrivate = fdArray.items.map(([s, e]) => readPrivate(parseDict(dv, s, e)));
    if (top[1237]) fdSelect = parseFDSelect(dv, base + top[1237][0], charStrings.items.length);
  }
  const defaultPrivate = readPrivate(top);

  const gbias = subrBias(gsubrIndex.items.length);

  return {
    numGlyphs: charStrings.items.length,
    getPath(gid) {
      if (gid < 0 || gid >= charStrings.items.length) return [];
      let priv = defaultPrivate;
      if (fdPrivate) {
        const fd = fdSelect ? fdSelect[gid] || 0 : 0;
        priv = fdPrivate[fd] || defaultPrivate;
      }
      const ctx = {
        dv,
        gsubrs: gsubrIndex.items,
        gbias,
        subrs: priv.subrs,
        bias: subrBias(priv.subrs.length),
        path: [],
        x: 0,
        y: 0,
        nStems: 0,
        widthParsed: false,
        open: false,
        stack: [],
        trans: [],
        depth: 0,
      };
      runCharstring(ctx, charStrings.items[gid][0], charStrings.items[gid][1]);
      return ctx.path;
    },
  };
}

function parseFDSelect(dv, pos, numGlyphs) {
  const fmt = dv.getUint8(pos);
  const out = new Uint8Array(numGlyphs);
  if (fmt === 0) {
    for (let i = 0; i < numGlyphs; i++) out[i] = dv.getUint8(pos + 1 + i);
  } else if (fmt === 3) {
    const nRanges = dv.getUint16(pos + 1);
    let p = pos + 3;
    let first = dv.getUint16(p);
    for (let i = 0; i < nRanges; i++) {
      const fd = dv.getUint8(p + 2);
      const next = dv.getUint16(p + 3);
      for (let g = first; g < next && g < numGlyphs; g++) out[g] = fd;
      first = next;
      p += 3;
    }
  }
  return out;
}

function moveTo(ctx, x, y) {
  ctx.path.push({ c: 'M', x, y });
  ctx.open = true;
}
function lineTo(ctx, x, y) {
  ctx.path.push({ c: 'L', x, y });
}
function curveTo(ctx, x1, y1, x2, y2, x, y) {
  ctx.path.push({ c: 'C', x1, y1, x2, y2, x, y });
}

function runCharstring(ctx, start, end) {
  if (ctx.depth > 10) return;
  ctx.depth++;
  const dv = ctx.dv;
  const st = ctx.stack;
  let p = start;

  const takeWidth = (evenArgs) => {
    if (!ctx.widthParsed) {
      if (st.length % 2 !== evenArgs % 2) st.shift();
      ctx.widthParsed = true;
    }
  };

  while (p < end) {
    const v = dv.getUint8(p++);
    if (v >= 32 || v === 28) {
      if (v === 28) {
        st.push(dv.getInt16(p));
        p += 2;
      } else if (v <= 246) {
        st.push(v - 139);
      } else if (v <= 250) {
        st.push((v - 247) * 256 + dv.getUint8(p++) + 108);
      } else if (v <= 254) {
        st.push(-(v - 251) * 256 - dv.getUint8(p++) - 108);
      } else {
        st.push(dv.getInt32(p) / 65536);
        p += 4;
      }
      continue;
    }

    switch (v) {
      case 1: // hstem
      case 3: // vstem
      case 18: // hstemhm
      case 23: // vstemhm
        takeWidth(0);
        ctx.nStems += st.length >> 1;
        st.length = 0;
        break;

      case 19: // hintmask
      case 20: // cntrmask
        takeWidth(0);
        ctx.nStems += st.length >> 1;
        st.length = 0;
        p += (ctx.nStems + 7) >> 3;
        break;

      case 21: // rmoveto
        takeWidth(2);
        ctx.x += st[0] || 0;
        ctx.y += st[1] || 0;
        moveTo(ctx, ctx.x, ctx.y);
        st.length = 0;
        break;

      case 22: // hmoveto
        takeWidth(1);
        ctx.x += st[0] || 0;
        moveTo(ctx, ctx.x, ctx.y);
        st.length = 0;
        break;

      case 4: // vmoveto
        takeWidth(1);
        ctx.y += st[0] || 0;
        moveTo(ctx, ctx.x, ctx.y);
        st.length = 0;
        break;

      case 5: // rlineto
        for (let i = 0; i + 1 < st.length; i += 2) {
          ctx.x += st[i];
          ctx.y += st[i + 1];
          lineTo(ctx, ctx.x, ctx.y);
        }
        st.length = 0;
        break;

      case 6: // hlineto
      case 7: { // vlineto
        let horiz = v === 6;
        for (let i = 0; i < st.length; i++) {
          if (horiz) ctx.x += st[i];
          else ctx.y += st[i];
          lineTo(ctx, ctx.x, ctx.y);
          horiz = !horiz;
        }
        st.length = 0;
        break;
      }

      case 8: // rrcurveto
        for (let i = 0; i + 5 < st.length; i += 6) rrcurve(ctx, st[i], st[i + 1], st[i + 2], st[i + 3], st[i + 4], st[i + 5]);
        st.length = 0;
        break;

      case 24: { // rcurveline
        let i = 0;
        for (; i + 5 < st.length - 2; i += 6) rrcurve(ctx, st[i], st[i + 1], st[i + 2], st[i + 3], st[i + 4], st[i + 5]);
        ctx.x += st[i] || 0;
        ctx.y += st[i + 1] || 0;
        lineTo(ctx, ctx.x, ctx.y);
        st.length = 0;
        break;
      }

      case 25: { // rlinecurve
        let i = 0;
        for (; i + 1 < st.length - 6; i += 2) {
          ctx.x += st[i];
          ctx.y += st[i + 1];
          lineTo(ctx, ctx.x, ctx.y);
        }
        rrcurve(ctx, st[i], st[i + 1], st[i + 2], st[i + 3], st[i + 4], st[i + 5]);
        st.length = 0;
        break;
      }

      case 26: { // vvcurveto
        let i = 0;
        let dx1 = 0;
        if (st.length & 1) dx1 = st[i++];
        for (; i + 3 < st.length; i += 4) {
          rrcurve(ctx, dx1, st[i], st[i + 1], st[i + 2], 0, st[i + 3]);
          dx1 = 0;
        }
        st.length = 0;
        break;
      }

      case 27: { // hhcurveto
        let i = 0;
        let dy1 = 0;
        if (st.length & 1) dy1 = st[i++];
        for (; i + 3 < st.length; i += 4) {
          rrcurve(ctx, st[i], dy1, st[i + 1], st[i + 2], st[i + 3], 0);
          dy1 = 0;
        }
        st.length = 0;
        break;
      }

      case 30: // vhcurveto
      case 31: { // hvcurveto
        let horiz = v === 31;
        let i = 0;
        while (i + 3 < st.length) {
          // 마지막 묶음에만 인자가 하나 더 붙어 반대축 이동량을 지정할 수 있다.
          const df = st.length - i === 5 ? st[i + 4] : 0;
          if (horiz) rrcurve(ctx, st[i], 0, st[i + 1], st[i + 2], df, st[i + 3]);
          else rrcurve(ctx, 0, st[i], st[i + 1], st[i + 2], st[i + 3], df);
          horiz = !horiz;
          i += 4;
        }
        st.length = 0;
        break;
      }

      case 10: { // callsubr
        const idx = (st.pop() | 0) + ctx.bias;
        const s = ctx.subrs[idx];
        if (s) runCharstring(ctx, s[0], s[1]);
        break;
      }

      case 29: { // callgsubr
        const idx = (st.pop() | 0) + ctx.gbias;
        const s = ctx.gsubrs[idx];
        if (s) runCharstring(ctx, s[0], s[1]);
        break;
      }

      case 11: // return
        ctx.depth--;
        return;

      case 14: // endchar
        takeWidth(0);
        st.length = 0;
        ctx.depth--;
        return;

      case 12: { // escape
        const v2 = dv.getUint8(p++);
        if (v2 === 35) { // flex
          rrcurve(ctx, st[0], st[1], st[2], st[3], st[4], st[5]);
          rrcurve(ctx, st[6], st[7], st[8], st[9], st[10], st[11]);
        } else if (v2 === 34) { // hflex: 두 번째 곡선이 원래 y 로 되돌아온다
          rrcurve(ctx, st[0], 0, st[1], st[2], st[3], 0);
          rrcurve(ctx, st[4], 0, st[5], -st[2], st[6], 0);
        } else if (v2 === 36) { // hflex1
          rrcurve(ctx, st[0], st[1], st[2], st[3], st[4], 0);
          rrcurve(ctx, st[5], 0, st[6], st[7], st[8], -(st[1] + st[3] + st[7]));
        } else if (v2 === 37) { // flex1
          const x0 = ctx.x, y0 = ctx.y;
          let dx = 0, dy = 0;
          for (let i = 0; i < 10; i += 2) {
            dx += st[i];
            dy += st[i + 1];
          }
          rrcurve(ctx, st[0], st[1], st[2], st[3], st[4], st[5]);
          // 마지막 점은 변화량이 작은 축으로 시작점에 되돌아간다.
          const d6 = st[10];
          const dx5 = st[6] + st[8];
          const dy5 = st[7] + st[9];
          if (Math.abs(dx) > Math.abs(dy)) {
            rrcurve(ctx, st[6], st[7], st[8], st[9], d6, y0 - ctx.y - dy5);
          } else {
            rrcurve(ctx, st[6], st[7], st[8], st[9], x0 - ctx.x - dx5, d6);
          }
        }
        st.length = 0;
        break;
      }

      default:
        st.length = 0;
        break;
    }
  }
  ctx.depth--;
}

function rrcurve(ctx, dx1, dy1, dx2, dy2, dx3, dy3) {
  const x1 = ctx.x + (dx1 || 0);
  const y1 = ctx.y + (dy1 || 0);
  const x2 = x1 + (dx2 || 0);
  const y2 = y1 + (dy2 || 0);
  ctx.x = x2 + (dx3 || 0);
  ctx.y = y2 + (dy3 || 0);
  curveTo(ctx, x1, y1, x2, y2, ctx.x, ctx.y);
}

/** URL 에서 폰트를 받아 파싱한다. */
export async function loadFont(url, fontIndex = 0) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`폰트 로드 실패: ${url} (${res.status})`);
  return new Font(await res.arrayBuffer(), fontIndex);
}

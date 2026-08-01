//
//  glyphmesh.js
//  typePop (WebGL)
//
//  글리프 외곽선 -> 압출된 3D 메시.
//  원본 GlyphOutline.m 의 loadVertex 를 그대로 옮긴 것이다.
//
//  구성 요소 세 가지:
//    1. outline : 앞면(z=+d/2) / 뒷면(z=-d/2) 컨투어 점. 스텐실 INVERT 로
//                 even-odd 채우기를 할 때 TRIANGLE_FAN 으로 그린다.
//    2. cap     : 위 스텐실이 1인 곳만 통과시켜 실제 색을 칠할 바운딩 사각형.
//    3. wall    : 앞/뒷면을 잇는 옆면. 삼각형마다 flat normal 을 미리 계산해 둔다
//                 (원본은 지오메트리 셰이더가 하던 일 — WebGL2 에는 없다).
//

const DEPTH = 0.2;
const BEZIER_SEGMENTS = 5; // 원본과 동일하게 곡선 하나를 5등분

/**
 * 폰트 유닛 경로를 점/컨투어 배열로 분해한다.
 * 좌표는 "1 em = 2 유닛" 으로 정규화하고 글리프 바운딩 박스 중심을 원점에 둔다
 * (원본 GlyphOutline addPoint 의 horiBearing / width 보정과 같은 결과).
 */
function decompose(path, unitsPerEm) {
  const raw = [];
  const contours = [];

  const add = (x, y) => raw.push(x, y);

  let cx = 0, cy = 0;
  for (const cmd of path) {
    switch (cmd.c) {
      case 'M':
        if (raw.length > 0) contours.push(raw.length / 2 - 1);
        add(cmd.x, cmd.y);
        cx = cmd.x;
        cy = cmd.y;
        break;
      case 'L':
        add(cmd.x, cmd.y);
        cx = cmd.x;
        cy = cmd.y;
        break;
      case 'Q': {
        for (let i = 1; i < BEZIER_SEGMENTS; i++) {
          const t = i / BEZIER_SEGMENTS;
          const u = 1 - t;
          add(
            u * u * cx + 2 * u * t * cmd.x1 + t * t * cmd.x,
            u * u * cy + 2 * u * t * cmd.y1 + t * t * cmd.y
          );
        }
        add(cmd.x, cmd.y);
        cx = cmd.x;
        cy = cmd.y;
        break;
      }
      case 'C': {
        for (let i = 1; i < BEZIER_SEGMENTS; i++) {
          const t = i / BEZIER_SEGMENTS;
          const u = 1 - t;
          add(
            u * u * u * cx + 3 * u * u * t * cmd.x1 + 3 * u * t * t * cmd.x2 + t * t * t * cmd.x,
            u * u * u * cy + 3 * u * u * t * cmd.y1 + 3 * u * t * t * cmd.y2 + t * t * t * cmd.y
          );
        }
        add(cmd.x, cmd.y);
        cx = cmd.x;
        cy = cmd.y;
        break;
      }
      default:
        break;
    }
  }

  // 외곽선이 없는 글리프(공백 등)는 원본과 마찬가지로 정사각형으로 대체한다.
  if (raw.length === 0) {
    return {
      points: [-1, -1, 1, -1, 1, 1, -1, 1],
      contours: [3],
    };
  }

  contours.push(raw.length / 2 - 1);

  // 바운딩 박스 중심을 원점으로, 1 em == 2 유닛으로 정규화.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < raw.length; i += 2) {
    if (raw[i] < minX) minX = raw[i];
    if (raw[i] > maxX) maxX = raw[i];
    if (raw[i + 1] < minY) minY = raw[i + 1];
    if (raw[i + 1] > maxY) maxY = raw[i + 1];
  }
  const s = 2 / unitsPerEm;
  const ox = (minX + maxX) / 2;
  const oy = (minY + maxY) / 2;
  const points = new Array(raw.length);
  for (let i = 0; i < raw.length; i += 2) {
    points[i] = (raw[i] - ox) * s;
    points[i + 1] = (raw[i + 1] - oy) * s;
  }
  return { points, contours };
}

function pushTriangle(pos, nrm, ax, ay, az, bx, by, bz, cx, cy, cz) {
  // 원본 지오메트리 셰이더와 같은 방식으로 면 노멀을 구한다.
  const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
  const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
  let nx = e1y * e2z - e1z * e2y;
  let ny = e1z * e2x - e1x * e2z;
  let nz = e1x * e2y - e1y * e2x;
  const len = Math.hypot(nx, ny, nz);
  if (len > 1e-12) {
    nx /= len;
    ny /= len;
    nz /= len;
  } else {
    // 겹친 점이 만든 넓이 0 삼각형. 픽셀을 만들지 않으니 값은 아무래도 좋다.
    nx = 0;
    ny = 0;
    nz = 1;
  }
  pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  for (let i = 0; i < 3; i++) nrm.push(nx, ny, nz);
}

/**
 * @param {Array} path        sfnt.getPath 결과(폰트 유닛)
 * @param {number} unitsPerEm
 * @returns {{outline:Float32Array, contours:number[], numPoints:number,
 *            cap:Float32Array, capNormal:Float32Array,
 *            wall:Float32Array, wallNormal:Float32Array, wallCount:number}}
 */
export function buildGlyphMesh(path, unitsPerEm) {
  const { points, contours } = decompose(path, unitsPerEm);
  const n = points.length / 2;
  const half = DEPTH / 2;

  // --- 1. 스텐실용 컨투어 점 (앞면 n개 + 뒷면 n개) ---
  const outline = new Float32Array(n * 2 * 3);
  // 원본과 동일하게 사각형 초기값을 0 으로 두어 원점을 항상 포함시킨다.
  let rx0 = 0, rx1 = 0, ry0 = 0, ry1 = 0;
  for (let i = 0; i < n; i++) {
    const x = points[i * 2];
    const y = points[i * 2 + 1];
    if (x < rx0) rx0 = x;
    if (x > rx1) rx1 = x;
    if (y < ry0) ry0 = y;
    if (y > ry1) ry1 = y;
    outline[i * 3] = x;
    outline[i * 3 + 1] = y;
    outline[i * 3 + 2] = half;
    outline[(n + i) * 3] = x;
    outline[(n + i) * 3 + 1] = y;
    outline[(n + i) * 3 + 2] = -half;
  }

  // --- 2. 앞/뒷면 바운딩 사각형 ---
  const cap = new Float32Array([
    rx0, ry0, half, rx1, ry0, half, rx1, ry1, half, rx0, ry1, half,
    rx0, ry0, -half, rx0, ry1, -half, rx1, ry1, -half, rx1, ry0, -half,
  ]);
  const capNormal = new Float32Array([
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
  ]);

  // --- 3. 옆면 ---
  const wallPos = [];
  const wallNrm = [];
  const at = (i, top) => {
    const b = (top ? i : i + n) * 3;
    return [outline[b], outline[b + 1], outline[b + 2]];
  };
  let si = 0;
  for (let c = 0; c < contours.length; c++) {
    const ei = contours[c];
    const count = ei - si + 1;
    if (count <= 0) {
      continue;
    }
    for (let j = 0; j < count; j++) {
      const i0 = si + j;
      const i1 = si + ((j + 1) % count);
      const [ax, ay, az] = at(i0, true);
      const [bx, by, bz] = at(i1, true);
      const [cx, cy, cz] = at(i0, false);
      const [dx, dy, dz] = at(i1, false);
      pushTriangle(wallPos, wallNrm, ax, ay, az, bx, by, bz, cx, cy, cz);
      pushTriangle(wallPos, wallNrm, cx, cy, cz, bx, by, bz, dx, dy, dz);
    }
    si = ei + 1;
  }

  return {
    outline,
    contours,
    numPoints: n,
    cap,
    capNormal,
    wall: new Float32Array(wallPos),
    wallNormal: new Float32Array(wallNrm),
    wallCount: wallPos.length / 3,
  };
}

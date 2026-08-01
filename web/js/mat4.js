//
//  mat4.js
//  typePop (WebGL)
//
//  원본이 쓰던 GLM 중 필요한 것만 옮긴 열 우선(column-major) 4x4 행렬 유틸.
//

export function identity(out = new Float32Array(16)) {
  out.fill(0);
  out[0] = out[5] = out[10] = out[15] = 1;
  return out;
}

/** out = a * b (GLM 과 같은 열 우선 규약) */
export function multiply(a, b, out = new Float32Array(16)) {
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let v = 0;
      for (let k = 0; k < 4; k++) v += a[k * 4 + r] * b[c * 4 + k];
      out[c * 4 + r] = v;
    }
  }
  return out;
}

export function translate(x, y, z, out = new Float32Array(16)) {
  identity(out);
  out[12] = x;
  out[13] = y;
  out[14] = z;
  return out;
}

export function scale(s, out = new Float32Array(16)) {
  identity(out);
  out[0] = out[5] = out[10] = s;
  return out;
}

/** glm::rotate 와 동일. axis 는 정규화하지 않아도 된다. */
export function rotate(angle, ax, ay, az, out = new Float32Array(16)) {
  const len = Math.hypot(ax, ay, az) || 1;
  const x = ax / len, y = ay / len, z = az / len;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  out[0] = t * x * x + c;
  out[1] = t * x * y + s * z;
  out[2] = t * x * z - s * y;
  out[3] = 0;
  out[4] = t * x * y - s * z;
  out[5] = t * y * y + c;
  out[6] = t * y * z + s * x;
  out[7] = 0;
  out[8] = t * x * z + s * y;
  out[9] = t * y * z - s * x;
  out[10] = t * z * z + c;
  out[11] = 0;
  out[12] = out[13] = out[14] = 0;
  out[15] = 1;
  return out;
}

export function frustum(l, r, b, t, n, f, out = new Float32Array(16)) {
  out.fill(0);
  out[0] = (2 * n) / (r - l);
  out[5] = (2 * n) / (t - b);
  out[8] = (r + l) / (r - l);
  out[9] = (t + b) / (t - b);
  out[10] = -(f + n) / (f - n);
  out[11] = -1;
  out[14] = -(2 * f * n) / (f - n);
  return out;
}

export function lookAt(eye, center, up, out = new Float32Array(16)) {
  const fx = center[0] - eye[0], fy = center[1] - eye[1], fz = center[2] - eye[2];
  const fl = Math.hypot(fx, fy, fz) || 1;
  const f = [fx / fl, fy / fl, fz / fl];
  let sx = f[1] * up[2] - f[2] * up[1];
  let sy = f[2] * up[0] - f[0] * up[2];
  let sz = f[0] * up[1] - f[1] * up[0];
  const sl = Math.hypot(sx, sy, sz) || 1;
  sx /= sl;
  sy /= sl;
  sz /= sl;
  const ux = sy * f[2] - sz * f[1];
  const uy = sz * f[0] - sx * f[2];
  const uz = sx * f[1] - sy * f[0];

  out[0] = sx;  out[4] = sy;  out[8] = sz;   out[12] = -(sx * eye[0] + sy * eye[1] + sz * eye[2]);
  out[1] = ux;  out[5] = uy;  out[9] = uz;   out[13] = -(ux * eye[0] + uy * eye[1] + uz * eye[2]);
  out[2] = -f[0]; out[6] = -f[1]; out[10] = -f[2]; out[14] = f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2];
  out[3] = 0;   out[7] = 0;   out[11] = 0;   out[15] = 1;
  return out;
}

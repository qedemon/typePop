//
//  renderer.js
//  typePop (WebGL)
//
//  원본 TypePopScene.mm 의 drawGlyph 를 WebGL2 로 옮긴 부분.
//
//  글리프 앞/뒷면은 폴리곤 분할 없이 스텐실 even-odd 로 채운다.
//    1) 컨투어마다 TRIANGLE_FAN 을 그리되 스텐실 함수를 NEVER 로 두어
//       색/깊이는 건드리지 않고 스텐실 비트만 INVERT 한다.
//       -> 홀수 번 덮인 곳(= 글리프 내부)만 1 이 된다.
//    2) 바운딩 사각형을 스텐실 EQUAL 1 로 그려 그 부분만 실제로 칠하고,
//       동시에 스텐실을 0 으로 되돌린다.
//
//  옆면은 스텐실 없이 그냥 그린다.
//

const VS_STENCIL = `#version 300 es
layout(location = 0) in vec3 pos;
uniform mat4 m;
uniform mat4 pv;
void main() {
  gl_Position = pv * m * vec4(pos, 1.0);
}`;

const FS_STENCIL = `#version 300 es
precision highp float;
out vec4 fColor;
void main() {
  fColor = vec4(1.0);
}`;

// 원본의 Sphere.vert + Sphere.geometry + Sphere.frag 를 합친 것.
// 지오메트리 셰이더가 하던 면 노멀 계산은 CPU 로 옮겨 normal 속성으로 받는다.
const VS_ENV = `#version 300 es
layout(location = 0) in vec3 pos;
layout(location = 1) in vec3 normal;
uniform mat4 m;
uniform mat4 r;
uniform mat4 pv;
uniform vec3 eye;
out vec3 posFromEye;
flat out vec3 norm;
void main() {
  vec4 world = m * vec4(pos, 1.0);
  gl_Position = pv * world;
  posFromEye = world.xyz - eye;
  norm = (r * vec4(normal, 1.0)).xyz;
}`;

const FS_ENV = `#version 300 es
precision highp float;
in vec3 posFromEye;
flat in vec3 norm;
uniform sampler2D tex;
out vec4 fColor;
void main() {
  // 각도 맵(angular map) 반사 조회 — 원본 Sphere.frag 와 동일.
  vec3 point = reflect(normalize(posFromEye), norm);
  vec2 uv = 0.5 * normalize(point + vec3(0.0, 0.0, 1.0)).xy + vec2(0.5);
  fColor = texture(tex, uv);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error('셰이더 컴파일 실패: ' + gl.getShaderInfoLog(sh));
  }
  return sh;
}

function link(gl, vsSrc, fsSrc) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error('프로그램 링크 실패: ' + gl.getProgramInfoLog(p));
  }
  return p;
}

function uniforms(gl, program, names) {
  const u = {};
  for (const n of names) u[n] = gl.getUniformLocation(program, n);
  return u;
}

export class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      depth: true,
      stencil: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('이 브라우저에서 WebGL2 를 쓸 수 없습니다.');
    this.gl = gl;
    this.canvas = canvas;

    this.stencilProgram = link(gl, VS_STENCIL, FS_STENCIL);
    this.stencilU = uniforms(gl, this.stencilProgram, ['m', 'pv']);

    this.envProgram = link(gl, VS_ENV, FS_ENV);
    this.envU = uniforms(gl, this.envProgram, ['m', 'r', 'pv', 'eye', 'tex']);

    gl.useProgram(this.envProgram);
    gl.uniform1i(this.envU.tex, 0);

    gl.clearColor(0, 0, 0.5, 1);
    gl.clearDepth(1);
    gl.clearStencil(0);
    gl.disable(gl.CULL_FACE);
  }

  /** 환경 맵 텍스처를 만든다. */
  createTexture(image) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.envTexture = tex;
    return tex;
  }

  /** buildGlyphMesh 결과를 GPU 버퍼/VAO 로 올린다. */
  upload(mesh) {
    const gl = this.gl;

    const outlineBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, outlineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.outline, gl.STATIC_DRAW);

    // 앞면/뒷면은 같은 버퍼의 다른 구간을 가리키는 VAO 두 개로 나눈다.
    const outlineVao = [];
    for (let i = 0; i < 2; i++) {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, outlineBuf);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, i * mesh.numPoints * 3 * 4);
      gl.enableVertexAttribArray(0);
      outlineVao.push(vao);
    }

    const capBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, capBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.cap, gl.STATIC_DRAW);
    const capNrmBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, capNrmBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.capNormal, gl.STATIC_DRAW);

    const capVao = [];
    for (let i = 0; i < 2; i++) {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, capBuf);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, i * 4 * 3 * 4);
      gl.enableVertexAttribArray(0);
      gl.bindBuffer(gl.ARRAY_BUFFER, capNrmBuf);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, i * 4 * 3 * 4);
      gl.enableVertexAttribArray(1);
      capVao.push(vao);
    }

    const wallVao = gl.createVertexArray();
    gl.bindVertexArray(wallVao);
    const wallBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wallBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.wall, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    const wallNrmBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wallNrmBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.wallNormal, gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);

    gl.bindVertexArray(null);

    return {
      outlineVao,
      capVao,
      wallVao,
      contours: mesh.contours,
      wallCount: mesh.wallCount,
      buffers: [outlineBuf, capBuf, capNrmBuf, wallBuf, wallNrmBuf],
    };
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
    return { width: w, height: h };
  }

  beginFrame(pv, eye) {
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.envTexture);

    gl.useProgram(this.stencilProgram);
    gl.uniformMatrix4fv(this.stencilU.pv, false, pv);
    gl.useProgram(this.envProgram);
    gl.uniformMatrix4fv(this.envU.pv, false, pv);
    gl.uniform3fv(this.envU.eye, eye);
  }

  /** 글리프 하나를 모델 행렬 m, 회전 r 로 그린다. */
  drawGlyph(gpu, m, r) {
    const gl = this.gl;

    gl.useProgram(this.stencilProgram);
    gl.uniformMatrix4fv(this.stencilU.m, false, m);
    gl.useProgram(this.envProgram);
    gl.uniformMatrix4fv(this.envU.m, false, m);
    gl.uniformMatrix4fv(this.envU.r, false, r);

    gl.enable(gl.STENCIL_TEST);
    for (let i = 0; i < 2; i++) {
      // 1) 컨투어를 스텐실에 INVERT 로 누적 (색/깊이 쓰기 없음)
      gl.useProgram(this.stencilProgram);
      gl.stencilFunc(gl.NEVER, 0, 0);
      gl.stencilOp(gl.INVERT, gl.KEEP, gl.KEEP);
      gl.bindVertexArray(gpu.outlineVao[i]);
      let s = 0;
      for (let j = 0; j < gpu.contours.length; j++) {
        const e = gpu.contours[j];
        const count = e - s + 1;
        if (count > 0) gl.drawArrays(gl.TRIANGLE_FAN, s, count);
        s = e + 1;
      }

      // 2) 채워진 부분만 환경 맵으로 칠하고 스텐실을 되돌린다.
      gl.useProgram(this.envProgram);
      gl.stencilFunc(gl.EQUAL, 1, 1);
      gl.stencilOp(gl.ZERO, gl.ZERO, gl.ZERO);
      gl.bindVertexArray(gpu.capVao[i]);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }
    gl.disable(gl.STENCIL_TEST);

    // 3) 옆면
    gl.bindVertexArray(gpu.wallVao);
    gl.drawArrays(gl.TRIANGLES, 0, gpu.wallCount);
  }
}

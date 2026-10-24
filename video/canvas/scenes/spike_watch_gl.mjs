// Engine spike, raw WebGL2 (no libraries): the shared pocket-watch shot as real geometry. Two-tone N.L cel shading, an
// inverted-hull outline pushed out in screen space (thicker towards the lower right: the taper), a hash-noise grain pass,
// and the flash as a uniform. Drawn offscreen, then copied onto the 2D canvas the renderer reads.
import { rng, prog, easeOut } from "../ink.mjs";
import { SHOT, flashAt, zoomAt, secondAngle } from "../../spikes/watch_shot.mjs";

export const DURATION = SHOT.duration, COVER = 0.5;
export const SCENES = [{ name: "watch", from: 0, to: DURATION }];
export const CAPTIONS = [];
export const END = null;
// The renderer needs a sound; this is the quietest existing bed (rain, no drips). The spike video is not silent.
export const SOUND = { drips: 0, easeFrom: 2, rumble: 99 };

const TAU = Math.PI * 2, RAD = Math.PI / 180;
const rgb = hex => hex.slice(1).match(/../g).map(h => parseInt(h, 16) / 255);

// 4x4 column-major matrices
const mul = (a, b) => { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
const id = () => Float32Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
const trans = (x, y, z) => { const m = id(); m[12] = x; m[13] = y; m[14] = z; return m; };
const rotX = a => { const m = id(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; };
const rotY = a => { const m = id(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; };
const rotZ = a => { const m = id(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; };
const persp = (fov, asp, n, f) => { const m = new Float32Array(16), t = 1 / Math.tan(fov / 2); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = (2 * f * n) / (n - f); return m; };
const apply = (m, [x, y, z]) => [0, 1, 2, 3].map(r => m[r] * x + m[4 + r] * y + m[8 + r] * z + m[12 + r]);

// Meshes are flat triangle lists: x y z nx ny nz per vertex.
const tri = (out, a, b, c, n) => out.push(...a, ...n, ...b, ...n, ...c, ...n);
const fan = (pts, z) => { const o = []; for (let i = 1; i < pts.length - 1; i++) tri(o, [...pts[0], z], [...pts[i], z], [...pts[i + 1], z], [0, 0, 1]); return o; };
const disc = (r, z, seg = 96) => fan(Array.from({ length: seg + 1 }, (_, i) => [Math.cos((i / seg) * TAU) * r, Math.sin((i / seg) * TAU) * r]), z);
function wall(r, z0, z1, seg = 96) {
  const o = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * TAU, b = ((i + 1) / seg) * TAU, na = [Math.cos(a), Math.sin(a), 0], nb = [Math.cos(b), Math.sin(b), 0];
    const A0 = [na[0] * r, na[1] * r, z0], A1 = [na[0] * r, na[1] * r, z1], B0 = [nb[0] * r, nb[1] * r, z0], B1 = [nb[0] * r, nb[1] * r, z1];
    tri(o, A0, B0, B1, na); tri(o, A0, B1, A1, na);
  }
  return o;
}
const box = (x0, y0, x1, y1, z) => fan([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z);
const hand = (len, tail, w, z) => fan([[-w, -tail], [w, -tail], [w * 0.25, len], [-w * 0.25, len]], z);
const ellipse = (x, y, rx, ry, rot = 0, seg = 48) => fan(Array.from({ length: seg + 1 }, (_, i) => {
  const a = (i / seg) * TAU, px = Math.cos(a) * rx, py = Math.sin(a) * ry;
  return [x + px * Math.cos(rot) - py * Math.sin(rot), y + px * Math.sin(rot) + py * Math.cos(rot)];
}), 0);

const VS = `#version 300 es
in vec3 aPos; in vec3 aNrm;
uniform mat4 uMVP, uModel; uniform bool uScreen; uniform vec2 uRes, uOff; uniform float uHull; uniform vec4 uCen;
out vec3 vPos; out vec3 vN;
void main() {
  vec4 p; vPos = aPos;
  if (uScreen) { vec2 q = aPos.xy + uOff; p = vec4(q.x / uRes.x * 2. - 1., 1. - q.y / uRes.y * 2., 0., 1.); vN = vec3(0., 0., 1.); }
  else { p = uMVP * vec4(aPos, 1.); vN = mat3(uModel) * aNrm; }
  if (uHull > 0.) {
    vec2 d = normalize((p.xy / p.w - uCen.xy / uCen.w) * uRes);
    float w = uHull * (0.35 + 0.65 * smoothstep(-1., 1., dot(d, vec2(0.7, -0.7))));
    p.xy += d * w * 2. / uRes * p.w;
  }
  gl_Position = p;
}`;
const FS = `#version 300 es
precision highp float;
in vec3 vPos; in vec3 vN;
uniform vec3 uCol, uShade; uniform int uMode; uniform float uInvert, uAlpha; uniform vec2 uShadowC;
out vec4 o;
void main() {
  vec3 c = uCol;
  if (uMode == 1) c = dot(normalize(vN), normalize(vec3(-0.5, 0.6, 0.65))) > 0.35 ? uCol : uShade;
  else if (uMode == 2) c = length(vPos.xy - uShadowC) > 0.86 ? uShade : uCol;
  o = vec4(mix(c, 1. - c, uInvert), uAlpha);
}`;
const GVS = `#version 300 es
void main() { vec2 p = vec2(gl_VertexID == 1 ? 3. : -1., gl_VertexID == 2 ? 3. : -1.); gl_Position = vec4(p, 0., 1.); }`;
const GFS = `#version 300 es
precision highp float;
uniform float uSeed, uAlpha; out vec4 o;
void main() { float h = fract(sin(dot(gl_FragCoord.xy + uSeed, vec2(12.9898, 78.233))) * 43758.5453); o = vec4(vec3(h > 0.5 ? 1. : 0.), uAlpha * (0.4 + 0.6 * fract(h * 7.))); }`;

function program(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

export function setup(doc, W, H) {
  const cv = doc.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const gl = cv.getContext("webgl2", { preserveDrawingBuffer: true, antialias: true, alpha: false });
  if (!gl) throw new Error("no webgl2");
  const prog3 = program(gl, VS, FS), progG = program(gl, GVS, GFS);
  const u = Object.fromEntries(["uMVP", "uModel", "uScreen", "uRes", "uOff", "uHull", "uCen", "uCol", "uShade", "uMode", "uInvert", "uAlpha", "uShadowC"]
    .map(n => [n, gl.getUniformLocation(prog3, n)]));
  const mesh = verts => {
    const vao = gl.createVertexArray(), buf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    for (const [name, off] of [["aPos", 0], ["aNrm", 12]]) {
      const loc = gl.getAttribLocation(prog3, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 24, off);
    }
    return { vao, n: verts.length / 6 };
  };
  const r = rng(SHOT.grain.seed), lines = Array.from({ length: 28 }, () => ({ a: r() * TAU, w: 0.01 + r() * 0.035, in: 0.5 + r() * 0.3 }));
  const k = W / 1080;
  const rabbit = [[0, 0, 150, 120, 0], [-70, -150, 70, 62, 0], [-95, -300, 22, 90, -0.15], [-45, -305, 22, 95, 0.1]]
    .map(([x, y, rx, ry, rot]) => mesh(ellipse(x * k, y * k, rx * k, ry * k, rot)));
  return {
    gl, cv, prog3, progG, u, lines, rabbit, W, H,
    crown: mesh(box(-0.14, 1.0, 0.14, 1.24, -0.02)), crownCap: mesh(box(-0.14, 1.17, 0.14, 1.24, -0.01)),
    wall: mesh(wall(1, -0.12, 0.12)), cap: mesh(disc(1, 0.12)), face: mesh(disc(0.86, 0.125)),
    ticks: Array.from({ length: 12 }, (_, i) => ({ m: mesh(box(-(i % 3 ? 0.012 : 0.022), i % 3 ? 0.73 : 0.68, i % 3 ? 0.012 : 0.022, 0.8, 0.13)), a: (i * 30) * RAD })),
    hour: mesh(hand(0.45, 0.07, 0.06, 0.14)), minute: mesh(hand(0.7, 0.08, 0.04, 0.145)),
    second: mesh(hand(0.78, 0.18, 0.014, 0.15)), hub: mesh(disc(0.05, 0.155)),
  };
}

export function draw(ctx, t, W, H, st) {
  const { gl, u } = st, flash = flashAt(t) ? 1 : 0, P = SHOT.palette, zoom = zoomAt(t) * (flash ? 1.05 : 1), k = W / 1080;
  const paper = rgb(P.paper).map(v => (flash ? 1 - v : v));
  gl.viewport(0, 0, W, H);
  gl.clearColor(...paper, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(st.prog3);
  gl.uniform2f(u.uRes, W, H);
  gl.uniform1f(u.uInvert, flash);
  gl.uniform2f(u.uShadowC, SHOT.shadow.dx, -SHOT.shadow.dy);

  // 24 degree lens, watch radius 1 spanning 360 px at zoom 1, centred 47% down
  const d = 12.54 / zoom, tilt = mul(rotX(-14 * RAD), rotY(10 * RAD));
  const VP = mul(trans(0, 1 - 2 * 0.47, 0), mul(persp(24 * RAD, W / H, 1, 40), trans(0, 0, -d)));
  const centre = apply(mul(VP, tilt), [0, 0, 0]);

  const drawMesh = (m, { local = id(), off = [0, 0], col, shade = col, mode = 0, hull = 0, alpha = 1, screen = false, cen }) => {
    const model = mul(tilt, local), mvp = mul(VP, model);
    gl.bindVertexArray(m.vao);
    gl.uniformMatrix4fv(u.uMVP, false, mvp);
    gl.uniformMatrix4fv(u.uModel, false, model);
    gl.uniform1i(u.uScreen, screen);
    gl.uniform2f(u.uOff, off[0], off[1]);
    gl.uniform4fv(u.uCen, cen ? apply(mvp, cen) : centre);
    gl.uniform3fv(u.uCol, rgb(col));
    gl.uniform3fv(u.uShade, rgb(shade));
    gl.uniform1i(u.uMode, mode);
    gl.uniform1f(u.uAlpha, alpha);
    const ink = (w, f) => {
      if (!w) return;
      gl.uniform1f(u.uHull, w * k * zoom);
      gl.uniform3fv(u.uCol, rgb(P.ink));
      gl.uniform1i(u.uMode, 0);
      gl.drawArrays(gl.TRIANGLES, 0, m.n);
      gl.uniform1f(u.uHull, 0);
      gl.uniform3fv(u.uCol, rgb(col));
      gl.uniform1i(u.uMode, mode);
    };
    ink(hull);
    gl.uniform1f(u.uHull, 0);
    gl.drawArrays(gl.TRIANGLES, 0, m.n);
  };

  drawMesh(st.crown, { col: P.case, shade: P.shade, mode: 1, hull: 6, cen: [0, 1.12, 0] });
  drawMesh(st.crownCap, { col: P.red });
  drawMesh(st.wall, { col: P.case, shade: P.shade, mode: 1, hull: 22 });
  drawMesh(st.cap, { col: P.case, shade: P.case });
  drawMesh(st.face, { col: P.face, shade: P.shade, mode: 2, hull: 7 });
  for (const tk of st.ticks) drawMesh(tk.m, { local: rotZ(-tk.a), col: P.ink });
  for (const [m, deg, mid] of [[st.hour, SHOT.hands.hour, 0.2], [st.minute, SHOT.hands.minute, 0.3]])
    drawMesh(m, { local: rotZ(-deg * RAD), col: P.case, mode: 0, hull: 5, cen: [0, 0, 0.14], mid });
  const sec = rotZ(-secondAngle(t) * RAD);
  drawMesh(st.second, { local: sec, col: P.red, hull: 4, cen: [0, 0, 0.15] });
  drawMesh(st.hub, { col: P.red });

  gl.uniform1i(u.uScreen, true);
  if (flash) {  // speed lines, in pixels
    const o = [], R = 360 * k * zoom, cx = W / 2, cy = H * 0.47;
    for (const l of st.lines) {
      const r0 = R * l.in * 2;
      tri(o, [cx + Math.cos(l.a - l.w) * r0, cy + Math.sin(l.a - l.w) * r0, 0], [cx + Math.cos(l.a) * H, cy + Math.sin(l.a) * H, 0], [cx + Math.cos(l.a + l.w) * r0, cy + Math.sin(l.a + l.w) * r0, 0], [0, 0, 1]);
    }
    const lm = mesh2(gl, st.prog3, o);
    drawMesh(lm, { col: P.ink, screen: true });
  }
  const a = easeOut(prog(t, SHOT.hold.from, SHOT.hold.from + 0.5));
  if (a > 0) {
    const bx = W * 0.86 + (1 - a) * 80 * k, by = H * 0.93;
    for (const m of st.rabbit) drawMesh(m, { off: [bx, by], col: P.ink, alpha: a, screen: true });
  }

  // grain pass
  gl.useProgram(st.progG);
  gl.uniform1f(gl.getUniformLocation(st.progG, "uSeed"), Math.floor(t * SHOT.fps + 1e-6) * 17.3);
  gl.uniform1f(gl.getUniformLocation(st.progG, "uAlpha"), SHOT.grain.alpha);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  ctx.drawImage(st.cv, 0, 0);
}

// A throwaway mesh for the per-frame speed lines (kept out of setup so the line set can follow the flash).
function mesh2(gl, p, verts) {
  const vao = gl.createVertexArray(), buf = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  for (const [name, off] of [["aPos", 0], ["aNrm", 12]]) {
    const loc = gl.getAttribLocation(p, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 24, off);
  }
  return { vao, n: verts.length / 6 };
}

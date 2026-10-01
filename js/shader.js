/*
  Animated background: a retro dusk highway drawn by a WebGL fragment shader.
  The fragment shader runs once per pixel, every frame, and decides that pixel's color.

  Easy things to tweak (all inside FRAG below):
    - Sky colors ........ the three vec3(...) values in the "sky" section
    - Sun size/colors ... r and sunCol
    - Road speed ........ SPEED (in the JS further down)
    - Grid color ........ gridCol
  Colors are vec3(red, green, blue) with each channel from 0.0 to 1.0.

  Public API (used by app.js):
    BackseatBG.setDim(0..1)  fade the scene back so text stays readable
    BackseatBG.pulse(amount) brief glow burst for celebrations
*/
(function () {
  'use strict';

  var noop = { setDim: function () {}, pulse: function () {} };
  var canvas = document.getElementById('bg');
  var gl = canvas && canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) { if (canvas) canvas.remove(); window.BackseatBG = noop; return; }

  var VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform float uScroll;',
    'uniform float uDim;',
    'uniform float uPulse;',

    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float noise1(float x){',
    '  float i = floor(x); float f = fract(x); f = f*f*(3.0-2.0*f);',
    '  return mix(fract(sin(i*12.9898)*43758.5453), fract(sin((i+1.0)*12.9898)*43758.5453), f);',
    '}',
    'float ridge(float x, float seed){',
    '  return noise1(x+seed)*0.6 + noise1(x*2.3+seed*1.7)*0.3 + noise1(x*5.1+seed*3.1)*0.1;',
    '}',

    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  float aspect = uRes.x / uRes.y;',
    '  float px = (uv.x - 0.5) * aspect;',   // horizontal position, 0 = centre
    '  float aa = 1.5 / uRes.y;',            // ~1 pixel, for smooth edges
    '  const float H = 0.42;',               // horizon height (0 = bottom, 1 = top)
    '  vec3 horizonCol = vec3(1.0, 0.45, 0.42);',
    '  vec3 col;',

    '  if (uv.y >= H) {',
    // ---- sky ----
    '    float t = (uv.y - H) / (1.0 - H);',
    '    col = mix(horizonCol, vec3(0.45, 0.13, 0.42), smoothstep(0.0, 0.35, t));',
    '    col = mix(col, vec3(0.035, 0.025, 0.10), smoothstep(0.3, 1.0, t));',
    // ---- twinkling stars ----
    '    vec2 cell = floor(gl_FragCoord.xy / 3.0);',
    '    float h = hash(cell);',
    '    float tw = 0.55 + 0.45 * sin(uTime * 1.3 + h * 60.0);',
    '    col += step(0.9965, h) * smoothstep(0.35, 0.85, t) * tw;',
    // ---- striped sun ----
    '    float r = 0.13;',
    '    vec2 sp = vec2(px, uv.y - (H + 0.11));',
    '    float d = length(sp);',
    '    vec3 sunCol = mix(vec3(1.0, 0.3, 0.55), vec3(1.0, 0.86, 0.4), smoothstep(-r, r, sp.y));',
    '    float bands = sp.y < 0.0 ? step(0.0, sin(sp.y * 150.0 + uTime * 1.5) + 1.0 + sp.y / r * 1.7) : 1.0;',
    '    float disc = (1.0 - smoothstep(r - aa, r, d)) * bands;',
    '    col = mix(col, sunCol, disc);',
    '    col += vec3(1.0, 0.35, 0.45) * exp(-d * 6.0) * (0.35 + 0.4 * uPulse);',
    // ---- two layers of mountains ----
    '    float m1 = H + 0.015 + 0.075 * ridge(px * 2.6 + 3.0, 1.0);',
    '    float m2 = H + 0.005 + 0.04 * ridge(px * 4.5 + 11.0 + uTime * 0.004, 7.0);',
    '    float k1 = 1.0 - smoothstep(m1 - aa, m1, uv.y);',
    '    float k2 = 1.0 - smoothstep(m2 - aa, m2, uv.y);',
    '    vec3 mc1 = mix(vec3(0.42, 0.14, 0.38), vec3(0.20, 0.06, 0.26), clamp((uv.y - H) / 0.09, 0.0, 1.0));',
    '    vec3 mc2 = mix(vec3(0.22, 0.06, 0.22), vec3(0.10, 0.03, 0.15), clamp((uv.y - H) / 0.05, 0.0, 1.0));',
    '    col = mix(col, mc1, k1);',
    '    col += vec3(1.0, 0.5, 0.5) * exp(-max(m1 - uv.y, 0.0) * 400.0) * k1 * 0.25;',  // rim light
    '    col = mix(col, mc2, k2);',
    '  } else {',
    // ---- ground: perspective grid + road ----
    '    float y = H - uv.y;',
    '    float z = 1.0 / max(y, 1e-3);',            // depth: bigger = further away
    '    float wx = px * z * 6.0;',                 // world x
    '    float wz = z * 2.0 + uScroll;',            // world z, scrolling toward us
    '    float pxW = z * 6.0 * aspect / uRes.x;',   // how wide one pixel is in world units
    '    float pzW = 2.0 / (y * y) / uRes.y;',
    '    float fadeX = 1.0 - smoothstep(0.2, 0.6, pxW);',
    '    float fadeZ = 1.0 - smoothstep(0.15, 0.5, pzW);',

    '    col = mix(vec3(0.09, 0.03, 0.14), vec3(0.03, 0.01, 0.06), smoothstep(0.0, H, y));',

    '    float R = 1.6;',
    '    float road = 1.0 - smoothstep(R - pxW, R + pxW, abs(wx));',
    '    col = mix(col, vec3(0.025, 0.015, 0.05), road);',

    '    float dx = abs(fract(wx / 2.0 + 0.5) - 0.5) * 2.0;',
    '    float wX = max(0.04, pxW * 1.2);',
    '    float lineX = 1.0 - smoothstep(wX * 0.5, wX * 0.5 + pxW, dx);',
    '    float dz = abs(fract(wz + 0.5) - 0.5);',
    '    float wZ = max(0.05, pzW * 1.2);',
    '    float lineZ = 1.0 - smoothstep(wZ * 0.5, wZ * 0.5 + pzW, dz);',
    '    float grid = max(lineX * fadeX, lineZ * fadeZ) * (1.0 - road);',
    '    vec3 gridCol = vec3(1.0, 0.25, 0.7);',
    '    col += gridCol * grid * (0.55 + 0.6 * uPulse);',

    '    float edge = 1.0 - smoothstep(0.03, 0.03 + pxW, abs(abs(wx) - R));',
    '    col += vec3(1.0, 0.55, 0.35) * edge * fadeX * 0.9;',
    '    float dash = (1.0 - smoothstep(0.05, 0.05 + pxW, abs(wx))) * step(fract(wz * 0.5), 0.45);',
    '    col += vec3(1.0, 0.8, 0.4) * dash * fadeZ * 0.9;',

    '    col = mix(col, horizonCol * 0.55, exp(-y * 18.0));',   // haze at the horizon
    '    col += horizonCol * exp(-y * 60.0) * 0.4;',
    '  }',

    '  vec2 q = uv - 0.5;',
    '  col *= 1.0 - dot(q, q) * 0.6;',                                   // vignette
    '  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.02;',     // grain (hides banding)
    '  col = mix(col, col * 0.38, uDim);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader error:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  var prog = gl.createProgram();
  if (vs && fs) { gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); }
  if (!vs || !fs || !gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    canvas.remove(); window.BackseatBG = noop; return;
  }
  gl.useProgram(prog);

  // One big triangle that covers the whole screen.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var u = {
    res: gl.getUniformLocation(prog, 'uRes'),
    time: gl.getUniformLocation(prog, 'uTime'),
    scroll: gl.getUniformLocation(prog, 'uScroll'),
    dim: gl.getUniformLocation(prog, 'uDim'),
    pulse: gl.getUniformLocation(prog, 'uPulse'),
  };

  var SPEED = 1.4;       // how fast the road moves
  var DPR_CAP = 1.5;     // render resolution cap — keeps phones cool
  var STILL_TIME = 12;   // frame shown when the user prefers reduced motion
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var dim = 0, dimTarget = 0, pulse = 0;
  var start = performance.now(), last = start, raf = 0, frameNo = 0;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    var w = Math.round(window.innerWidth * dpr), h = Math.round(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function draw(t) {
    resize();
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform1f(u.time, t % 3600);
    gl.uniform1f(u.scroll, (t * SPEED) % 20);
    gl.uniform1f(u.dim, dim);
    gl.uniform1f(u.pulse, pulse);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    dim += (dimTarget - dim) * Math.min(1, dt * 4);
    pulse *= Math.exp(-dt * 2.5);
    frameNo++;
    // When the scene is dimmed behind content, draw every other frame to save battery.
    if (!(dim > 0.95 && pulse < 0.01 && frameNo % 2)) draw((now - start) / 1000);
    raf = requestAnimationFrame(frame);
  }

  function play() { if (!raf && !reduceMotion) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : play(); });
  window.addEventListener('resize', function () { if (reduceMotion) draw(STILL_TIME); });
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); });

  window.BackseatBG = {
    setDim: function (v) {
      dimTarget = v;
      if (reduceMotion) { dim = v; draw(STILL_TIME); }
    },
    pulse: function (amount) {
      pulse = Math.min(2, pulse + (amount || 1));
    },
  };

  if (reduceMotion) draw(STILL_TIME); else play();
})();

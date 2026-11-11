/* Creative in the Loop: the glow layer.
   A dark nebula behind every page (one small canvas, drawn at half size and 30 frames a second),
   and the ring loop drawn as neon hoops on any canvas marked [data-ring].
   Rings only draw while on screen; nothing draws while the tab is hidden.
   With reduced motion, everything is drawn once and holds still. Without WebGL, the CSS loop shows instead. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  var lowPower = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 || conn.saveData === true;
  var ringDpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5);
  var bgScale = lowPower ? .35 : .5;

  var VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
  var COMMON = [
    'precision highp float;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);',
    '  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }',
    'float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a*noise(p); p = p*2.02 + 13.7; a *= .5; } return v; }'
  ].join('\n');

  /* ---------- Background: deep nebula, a faint light that follows the pointer, grain ---------- */
  var BG = COMMON + [
    'uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse;',
    'void main(){',
    '  vec2 p = (gl_FragCoord.xy - .5*uRes) / uRes.y;',
    '  float t = uTime * .03;',
    '  float f = fbm(p * 1.1 + vec2(t, -t * .6));',
    '  float g = fbm(p * 2.2 - f + vec2(-t * .4, t * .3));',
    '  vec3 col = vec3(.016, .022, .045);',
    '  col = mix(col, vec3(.02, .16, .24), smoothstep(.5, .9, f) * .45);',
    '  col = mix(col, vec3(.16, .09, .32), smoothstep(.55, .92, g) * .4);',
    '  vec2 m = (uMouse - .5*uRes) / uRes.y;',
    '  col += vec3(.05, .09, .16) * exp(-dot(p - m, p - m) * 5.) * .6;',
    '  vec2 sp = gl_FragCoord.xy / uRes.y * 220.; vec2 id = floor(sp);',
    '  float star = step(.996, hash(id)) * smoothstep(.35, 0., length(fract(sp) - .5)) * (.4 + .6 * sin(uTime * 1.5 + hash(id + 2.) * 30.));',
    '  col += vec3(.55, .7, 1.) * star * .35;',
    '  col += (hash(gl_FragCoord.xy + fract(uTime * 7.) * 113.) - .5) * .035;',
    '  gl_FragColor = vec4(col, 1.);',
    '}'
  ].join('\n');

  /* ---------- The loop: seven stepped tiers, each with a neon edge ---------- */
  var RING = COMMON + [
    'uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uHover; uniform float uGap; uniform float uScale; uniform float uSpin; uniform float uBuild; uniform float uFx;',
    'uniform vec3 uCol[7];',
    // Composite one layer over what is already there (premultiplied).
    'vec3 colAt(int i){ if (i == 0) return uCol[0]; if (i == 1) return uCol[1]; if (i == 2) return uCol[2]; if (i == 3) return uCol[3]; if (i == 4) return uCol[4]; if (i == 5) return uCol[5]; return uCol[6]; }',
    'void over(inout vec4 acc, vec3 c, float a){ acc.rgb = c * a + acc.rgb * (1. - a); acc.a = a + acc.a * (1. - a); }',
    'void main(){',
    '  vec2 p = (gl_FragCoord.xy - .5*uRes) / (.5*uRes.y) / uScale;',
    '  p.y += .2;',
    '  float e = radians(22. + uMouse.y * 6.); float se = sin(e), ce = cos(e);',
    '  float H = .055;',
    '  float stp = H + .028 + uGap;',
    '  float px = 2. / uRes.y / uScale;',
    '  float T = uTime;',
    '  vec2 md = normalize(uMouse + vec2(1e-4));',
    '  float boost = 1. + uHover * .5;',
    '  vec4 acc = vec4(0.); vec3 glow = vec3(0.);',
    // Pass 0 draws the far halves (back walls, back of each rim), largest ring first.
    // Pass 1 draws the near halves, smallest ring first, so the big front rings sit on top.
    '  for (int pass = 0; pass < 2; pass++) {',
    '    for (int j = 0; j < 7; j++) {',
    '      int i = pass == 0 ? j : 6 - j;',
    '      float fi = float(i);',
    '      float R = (1. - fi * .12) * (1. + .006 * sin(T * (.7 + fi * .05) + fi * 2.1));',
    '      float kb = clamp(uBuild * 7. - fi, 0., 1.);',
    '      if (kb <= 0.) continue;',
    // Each ring drifts up and down on its own slow cycle, like a jellyfish.
    '      float drift = .022 * sin(T * (.95 + fi * .11) - fi * .9) + .008 * sin(T * (.43 + fi * .07) + fi * 2.7);',
    '      float h0 = fi * stp + drift + (1. - kb) * .6, h1 = h0 + H;',
    '      vec3 c = colAt(i);',
    '      float side = pass == 0 ? -1. : 1.;',
    // wall: a thin glass band
    '      if (abs(p.x) < R) {',
    '        float zf = sqrt(R * R - p.x * p.x) * side;',
    '        float y = (p.y + zf * se) / ce;',
    '        float inBand = smoothstep(-px, px, y - h0) * smoothstep(-px, px, h1 - y);',
    '        if (inBand > 0.) {',
    '          float vy = (y - h0) / H;',
    '          float ang = atan(zf, p.x);',
    '          float catchL = pow(max(0., dot(normalize(vec2(p.x, -zf * se) + 1e-5), md)), 3.) * uHover;',
    '          float tex = noise(vec2(ang * 3. + uSpin * 10. + fi * 4., vy * 2.));',
    '          vec3 wc = c * (.12 + .25 * tex * tex + .5 * pow(abs(vy - .5) * 2., 6.) + catchL * .6);',
    '          wc += c * pow(1. - abs(zf) / R, 4.) * .6;',
    '          float a = (pass == 0 ? .35 : .55) * inBand;',
    '          over(acc, wc * (pass == 0 ? .6 : 1.), a * kb);',
    '        }',
    '      }',
    // rims: neon lines at the top and bottom edge of the band
    '      for (int k = 0; k < 2; k++) {',
    '        float hh = k == 0 ? h0 : h1;',
    '        float z = (hh * ce - p.y) / se;',
    '        if (z * side < 0.) continue;',
    '        vec2 g = vec2(p.x, z);',
    '        float r = length(g);',
    '        float th = atan(g.y, g.x);',
    '        float sf = sqrt(cos(th) * cos(th) + se * se * sin(th) * sin(th));',
    '        float d = abs(r - R) * sf;',
    '        float run = pow(.5 + .5 * sin(th - T * (.5 + fi * .09) + fi * 1.9), 8.);',
    '        float catchL = pow(max(0., dot(normalize(vec2(g.x, -g.y * se) + 1e-5), md)), 4.) * uHover;',
    '        float lit = (k == 1 ? 1. : .7) * (pass == 0 ? .55 : 1.) * (1. + 1.6 * run + 1.5 * catchL) * boost;',
    '        float core = exp(-d / (.003 + px * .7));',
    '        over(acc, mix(c, vec3(1.), .55) * lit, min(1., core * .95) * kb);',
    '        glow += c * (exp(-d / .02) * .3 + exp(-d / .09) * .12) * lit * kb;',
    '      }',
    '    }',
    '  }',
    // Light from the top: shafts that drift, flicker and lean towards the pointer
    '  float topY = (6. * stp + H + .022 * sin(T * 1.61 - 5.4) + .008 * sin(T * .85 + 16.2)) * ce;',
    '  vec2 o = vec2(0., topY - .02);',
    '  vec2 v = p - o;',
    '  float dist = length(v);',
    '  float ang = atan(v.x, v.y);',
    '  float lean = uMouse.x * .55 * (.4 + uHover);',
    '  float a2 = ang - lean;',
    '  float field = pow(noise(vec2(a2 * 5. + T * .25, T * .3)), 3.) * .9 + pow(noise(vec2(a2 * 13. - T * .4, 4. + T * .5)), 5.) * 1.1;',
    '  float shafts = 0.;',
    '  for (int s = 0; s < 5; s++) {',
    '    float fs = float(s);',
    '    float ca = sin(T * (.13 + fs * .05) + fs * 2.4) * .95 + lean * .6;',
    '    float wdt = .035 + .03 * hash(vec2(fs, 3.));',
    '    float fl = .55 + .45 * sin(T * (1.1 + fs * .37) + fs * 5.) * sin(T * .7 + fs);',
    '    shafts += exp(-pow((a2 + lean - ca) / wdt, 2.)) * fl;',
    '  }',
    '  float up = smoothstep(-.05, .6, v.y / (dist + 1e-3));',
    '  float reach = exp(-dist * (1.1 - uHover * .4));',
    '  vec3 beamCol = mix(uCol[6], uCol[3], .5 + .5 * sin(ang * 3. + T * .3));',
    '  vec3 bc = beamCol * (field * .45 + shafts * .5) * up * reach * boost;',
    '  bc += mix(uCol[6], vec3(1.), .6) * exp(-dist * dist * 70.) * (.5 + .2 * sin(T * 2.3)) * boost;',
    // Sparks orbiting the stack, quicker when the pointer is near
    '  vec2 ps = vec2(p.x, (p.y - .2) / .42);',
    '  float pr = length(ps);',
    '  float pa = atan(ps.y, ps.x) + T * (.08 + uHover * .18) / (pr + .25);',
    '  vec3 sc = vec3(0.);',
    '  for (int k = 0; k < 2; k++) {',
    '    float fk = float(k);',
    '    vec2 cell = vec2(pa * (16. + fk * 9.) / 6.2832, pr * (11. + fk * 6.));',
    '    vec2 id = floor(cell); vec2 f = fract(cell) - .5;',
    '    vec2 jj = vec2(hash(id + 3.1 + fk), hash(id + 7.7 + fk)) - .5;',
    '    float sd = length(f - jj * .6);',
    '    float on = step(.8, hash(id + fk * 9.));',
    '    float tw = .4 + .6 * sin(T * 2.5 + hash(id) * 40.);',
    '    float band = smoothstep(.5, .95, pr) * smoothstep(1.75, 1.05, pr);',
    '    sc += mix(uCol[0], uCol[4], hash(id + 1.)) * smoothstep(.09, 0., sd) * on * tw * band * (1.2 - fk * .5);',
    '  }',
    '  float mist = 0.;',
    '  if (pr > .7 && pr < 1.45) mist = fbm(vec2(pa * 2.5, pr * 3.5 - T * .07)) * smoothstep(1.45, 1., pr) * smoothstep(.7, 1.05, pr);',
    '  vec3 mc = mix(uCol[0], uCol[2], .5) * mist * mist * .4;',
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  float vig = smoothstep(0., .1, uv.y) * smoothstep(1., .72, uv.y) * smoothstep(0., .12, uv.x) * smoothstep(1., .88, uv.x);',
    '  vec3 add = (glow + (bc + sc + mc) * uFx * uBuild) * vig;',
    '  vec3 rgb = acc.rgb + add;',
    '  rgb += (hash(gl_FragCoord.xy + fract(T) * 91.) - .5) * .03;',
    '  float a = clamp(acc.a + max(add.r, max(add.g, add.b)), 0., 1.);',
    '  gl_FragColor = vec4(max(rgb, 0.), a);',
    '}'
  ].join('\n');


  function program(gl, frag) {
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    }
    var v = sh(gl.VERTEX_SHADER, VERT), f = sh(gl.FRAGMENT_SHADER, frag);
    if (!v || !f) return null;
    var p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    gl.useProgram(p);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return p;
  }
  function U(gl, p, n) { return gl.getUniformLocation(p, n); }
  function hex(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }

  var test = document.createElement('canvas');
  if (!(test.getContext('webgl') || test.getContext('experimental-webgl'))) return;

  // Bottom ring to top: cyan through blue and violet to lilac.
  var NEON = ['#2ee6f2', '#2fb8ff', '#3c86ff', '#5b63ff', '#8a5cff', '#b77cff', '#e6b8ff'];

  /* Background */
  var bgCanvas = document.getElementById('bgGL'), bg = null;
  if (bgCanvas) {
    var bgl = bgCanvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    var bp = bgl && program(bgl, BG);
    if (bp) {
      bg = { gl: bgl, u: { res: U(bgl, bp, 'uRes'), time: U(bgl, bp, 'uTime'), mouse: U(bgl, bp, 'uMouse') } };
      var bsize = function () { var w = Math.round(innerWidth * bgScale), h = Math.round(innerHeight * bgScale); if (bgCanvas.width !== w || bgCanvas.height !== h) { bgCanvas.width = w; bgCanvas.height = h; bgl.viewport(0, 0, w, h); } };
      bsize(); window.addEventListener('resize', bsize);
      root.classList.add('gl-bg');
    }
  }

  /* Rings */
  var rings = [], byName = {};
  [].forEach.call(document.querySelectorAll('canvas[data-ring]'), function (canvas) {
    var gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: !lowPower });
    if (!gl) return;
    var p = program(gl, RING); if (!p) return;
    var cols = []; NEON.forEach(function (c) { cols = cols.concat(hex(c)); });
    gl.uniform3fv(U(gl, p, 'uCol'), new Float32Array(cols));
    gl.uniform1f(U(gl, p, 'uScale'), .6);
    var build = canvas.dataset.build != null ? Number(canvas.dataset.build) : 1;
    if (reduce) build = 1;
    var r = {
      canvas: canvas, gl: gl,
      u: { res: U(gl, p, 'uRes'), time: U(gl, p, 'uTime'), mouse: U(gl, p, 'uMouse'), hover: U(gl, p, 'uHover'), gap: U(gl, p, 'uGap'), spin: U(gl, p, 'uSpin'), build: U(gl, p, 'uBuild'), fx: U(gl, p, 'uFx') },
      gap: 0, gapT: 0, build: build, buildT: build, fx: canvas.dataset.fx != null ? Number(canvas.dataset.fx) : 1,
      mouse: [0, 0], mouseT: [0, 0], hover: 0, hoverT: 0, visible: false
    };
    r.size = function () {
      var w = Math.round(canvas.clientWidth * ringDpr), h = Math.round(canvas.clientHeight * ringDpr);
      if (w && h && (canvas.width !== w || canvas.height !== h)) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { r.visible = es[0].isIntersecting; if (reduce) draw(); }, { rootMargin: '100px' }).observe(canvas);
    } else { r.visible = true; }
    canvas.closest('.loop') && canvas.closest('.loop').classList.add('has-gl');
    rings.push(r);
    if (canvas.dataset.ring) byName[canvas.dataset.ring] = r;
  });
  if (rings.length) root.classList.add('gl');

  // Pages steer rings from their scroll hooks, for example CITLGL.set('hero', 'gap', .05).
  window.CITLGL = {
    set: function (name, key, value) { var r = byName[name]; if (r) r[key + 'T'] = value; }
  };

  var start = performance.now();
  var mouse = { x: innerWidth / 2, y: innerHeight * .3 }, mouseS = { x: mouse.x, y: mouse.y };
  function now() { return (performance.now() - start) / 1000; }
  if (!reduce) {
    window.addEventListener('pointermove', function (e) {
      mouse.x = e.clientX; mouse.y = e.clientY;
      rings.forEach(function (r) {
        if (!r.visible) return;
        var b = r.canvas.getBoundingClientRect();
        var mx = (e.clientX - (b.left + b.width / 2)) / (b.width / 2), my = (e.clientY - (b.top + b.height / 2)) / (b.height / 2);
        r.mouseT = [Math.max(-1, Math.min(1, mx)), Math.max(-1, Math.min(1, -my))];
        r.hoverT = Math.max(0, 1 - Math.hypot(mx, my));
      });
    }, { passive: true });
  }

  var frameNo = 0;
  function draw() {
    var t = reduce ? 6 : now();
    frameNo++;
    if (bg && (reduce || frameNo % 2 === 0)) {
      mouseS.x += (mouse.x - mouseS.x) * .12; mouseS.y += (mouse.y - mouseS.y) * .12;
      var g = bg.gl;
      g.uniform2f(bg.u.res, bgCanvas.width, bgCanvas.height);
      g.uniform1f(bg.u.time, t);
      g.uniform2f(bg.u.mouse, mouseS.x * bgScale, (innerHeight - mouseS.y) * bgScale);
      g.drawArrays(g.TRIANGLES, 0, 6);
    }
    rings.forEach(function (r) {
      if (!r.visible) return;
      r.size();
      var k = reduce ? 1 : .12;
      r.gap += (r.gapT - r.gap) * k;
      r.build += (r.buildT - r.build) * (reduce ? 1 : .15);
      r.mouse[0] += (r.mouseT[0] - r.mouse[0]) * .05; r.mouse[1] += (r.mouseT[1] - r.mouse[1]) * .05;
      r.hover += (r.hoverT - r.hover) * .05;
      var gl = r.gl;
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(r.u.res, r.canvas.width, r.canvas.height);
      gl.uniform1f(r.u.time, t);
      gl.uniform2f(r.u.mouse, r.mouse[0], r.mouse[1]);
      gl.uniform1f(r.u.hover, r.hover);
      gl.uniform1f(r.u.gap, r.gap);
      gl.uniform1f(r.u.spin, reduce ? 0 : t * .02);
      gl.uniform1f(r.u.build, r.build);
      gl.uniform1f(r.u.fx, r.fx);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
  }
  if (reduce) {
    draw();
    window.addEventListener('resize', draw);
  } else {
    (function loop() { if (!document.hidden) draw(); requestAnimationFrame(loop); })();
  }
})();

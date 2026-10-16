(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js-reveal');

  initReveals(reduce);
  initWaitlist();
  initHeroField(reduce);
  initBrain(reduce);

  function initReveals(still) {
    var fadeNodes = document.querySelectorAll('.reveal');
    var headings = document.querySelectorAll('.display-hero, .display-section');

    Array.prototype.forEach.call(fadeNodes, function (el) {
      var siblings = el.parentElement.querySelectorAll(':scope > .reveal');
      var index = Array.prototype.indexOf.call(siblings, el);
      el.style.setProperty('--reveal-i', String(index < 0 ? 0 : index));
    });

    if (still || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(fadeNodes, function (el) {
        el.classList.add('is-visible');
      });
      return;
    }

    initCharTitles(headings);
    initFadeReveals(fadeNodes);
  }

  function splitHeading(el) {
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', label);
    var visual = document.createElement('span');
    visual.className = 'char-reveal-visual';
    visual.setAttribute('aria-hidden', 'true');
    var ci = 0;

    function walk(node, parent) {
      if (node.nodeType === Node.TEXT_NODE) {
        var t = node.textContent;
        var i = 0;
        while (i < t.length) {
          if (t[i] === '\n') {
            parent.appendChild(document.createElement('br'));
            i++;
            continue;
          }
          if (/\s/.test(t[i])) {
            parent.appendChild(document.createTextNode(' '));
            i++;
            continue;
          }
          var wordWrap = document.createElement('span');
          wordWrap.className = 'char-reveal-word';
          while (i < t.length && !/\s/.test(t[i]) && t[i] !== '\n') {
            var s = document.createElement('span');
            s.className = 'char-reveal';
            s.style.setProperty('--ci', String(ci++));
            s.textContent = t[i];
            wordWrap.appendChild(s);
            i++;
          }
          parent.appendChild(wordWrap);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'BR') {
          parent.appendChild(document.createElement('br'));
          return;
        }
        var wrapper = node.cloneNode(false);
        parent.appendChild(wrapper);
        Array.prototype.forEach.call(node.childNodes, function (child) {
          walk(child, wrapper);
        });
      }
    }

    Array.prototype.forEach.call(el.childNodes, function (child) {
      walk(child, visual);
    });
    el.textContent = '';
    el.classList.add('char-reveal-root');
    el.appendChild(visual);
    el.style.setProperty('--cc', String(ci));
  }

  function initCharTitles(heads) {
    Array.prototype.forEach.call(heads, splitHeading);
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (entry.isIntersecting) {
          el.classList.remove('char-outview');
          el.classList.add('char-inview');
        } else {
          el.classList.remove('char-inview');
          el.classList.add('char-outview');
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -18% 0px'
    });
    Array.prototype.forEach.call(heads, function (heading) {
      obs.observe(heading);
    });
  }

  function initFadeReveals(nodes) {
    if (!nodes.length) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-visible', entry.isIntersecting);
      });
    }, {
      threshold: 0.06,
      rootMargin: '0px 0px -18% 0px'
    });
    Array.prototype.forEach.call(nodes, function (el) {
      obs.observe(el);
    });
  }

  function waitlistConfig() {
    var urlMeta = document.querySelector('meta[name="citl-waitlist-url"]');
    var keyMeta = document.querySelector('meta[name="citl-supabase-key"]');
    if (!urlMeta || !keyMeta) return null;
    var url = (urlMeta.getAttribute('content') || '').trim();
    var key = (keyMeta.getAttribute('content') || '').trim();
    if (!url || !key) return null;
    return { url: url, key: key };
  }

  function initWaitlist() {
    document.querySelectorAll('[data-waitlist]').forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var input = form.querySelector('input[type="email"]');
        var msg = form.querySelector('.msg');
        var button = form.querySelector('button');
        var bot = form.querySelector('.waitlist-bot');
        var email = (input.value || '').trim();

        if (!email || !input.checkValidity()) {
          msg.textContent = 'Enter a valid email address, like you@company.com.';
          input.focus();
          return;
        }

        if (bot && bot.value) {
          msg.textContent = 'You’re on the list. We’ll be in touch.';
          form.reset();
          return;
        }

        var config = waitlistConfig();
        if (!config) {
          msg.textContent = 'The waitlist isn’t connected yet. Email hello@salo.uk and we’ll add you.';
          return;
        }

        var source = form.getAttribute('data-waitlist-source');
        if (source !== 'hero' && source !== 'closer') source = 'hero';

        button.disabled = true;
        msg.textContent = 'Joining…';

        fetch(config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: config.key,
            Authorization: 'Bearer ' + config.key
          },
          body: JSON.stringify({ email: email, source: source })
        }).then(function (res) {
          if (!res.ok) throw new Error('Could not send');
          form.reset();
          msg.textContent = 'You’re on the list. We’ll be in touch.';
        }).catch(function () {
          msg.textContent = 'We couldn’t save that just now. Email hello@salo.uk and we’ll add you.';
        }).then(function () {
          button.disabled = false;
        });
      });
    });
  }

  function compile(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  function link(gl, vert, frag) {
    var vs = compile(gl, gl.VERTEX_SHADER, vert);
    var fs = compile(gl, gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  function fullscreen(gl) {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  function watchVisibility(el, onChange) {
    if (!('IntersectionObserver' in window)) {
      onChange(true);
      return;
    }
    new IntersectionObserver(function (entries) {
      onChange(entries[0].isIntersecting);
    }, { rootMargin: '100px' }).observe(el);
  }

  function initHeroField(still) {
    var canvas = document.getElementById('bg');
    if (!canvas) return;
    var gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, alpha: false });
    if (!gl) {
      canvas.style.background = 'linear-gradient(160deg,#0b1f3a,#0a5a8a 40%,#b892c0 70%,#c9622e)';
      return;
    }

    var vert = 'attribute vec2 a; void main(){ gl_Position = vec4(a,0.,1.); }';
    var frag = [
      'precision highp float;',
      'uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uHover;',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }',
      'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);',
      '  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }',
      'float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p=p*2.03+17.; a*=.5; } return v; }',
      'float sdRoundBox(vec2 p, vec2 b, float r){ vec2 q = abs(p)-b+r; return length(max(q,0.)) + min(max(q.x,q.y),0.) - r; }',
      'vec3 palette(float t){ t = clamp(t, 0., 1.);',
      '  vec3 c0=vec3(.06,.10,.20), c1=vec3(.04,.36,.56), c2=vec3(.84,.82,.75), c3=vec3(.72,.56,.75), c4=vec3(.24,.22,.68), c5=vec3(.80,.40,.20);',
      '  float s = t*5.;',
      '  if(s<1.) return mix(c0,c1,s); if(s<2.) return mix(c1,c2,s-1.); if(s<3.) return mix(c2,c3,s-2.); if(s<4.) return mix(c3,c4,s-3.);',
      '  return mix(c4,c5,s-4.); }',
      'void main(){',
      '  vec2 p = (gl_FragCoord.xy - .5*uRes) / uRes.y;',
      '  float T = uTime;',
      '  float asp = uRes.x/uRes.y;',
      '  vec2 c = vec2(asp > 1. ? asp*.5 - .42 : .20 + .3*(asp - .62), asp > 1. ? -.62 : -.50) + uMouse*.04;',
      '  vec2 q = p - c;',
      '  q += .035*vec2(sin(q.y*3.2 + T*.23), cos(q.x*2.7 - T*.19));',
      '  float d = sdRoundBox(q, vec2(.17, .44), .21);',
      '  float md = length(p - uMouse);',
      '  d -= .05 * uHover * exp(-md*md*10.);',
      '  float w = .036, k = fract(d/w), band = floor(d/w);',
      '  float fluted = 1. - smoothstep(.12, .55, d);',
      '  vec2 n = normalize(q + 1e-4);',
      '  vec2 sp = p + n * (k - .5) * .08 * fluted;',
      '  float g = .42 - sp.y*1.5 + (sp.x - c.x + .2)*.25;',
      '  float f = fbm(sp*1.3 + vec2(T*.025, -T*.018));',
      '  float t = mix(g, f*1.4 - .2, .35) + (k - .5)*.6*fluted + band*.02*fluted + .05*sin(T*.07);',
      '  vec3 col = palette(t);',
      '  col *= mix(1., .85 + .22*smoothstep(0., 1., k), fluted);',
      '  col = mix(col, vec3(.05,.08,.16), smoothstep(.2, .75, p.y + (p.x - c.x + .2)*.6) * .75);',
      '  col += (hash(gl_FragCoord.xy + fract(T)*100.) - .5) * .045;',
      '  gl_FragColor = vec4(col, 1.);',
      '}'
    ].join('\n');

    var prog = link(gl, vert, frag);
    if (!prog) {
      canvas.style.background = 'linear-gradient(160deg,#0b1f3a,#0a5a8a 40%,#b892c0 70%,#c9622e)';
      return;
    }
    gl.useProgram(prog);
    fullscreen(gl);

    var uRes = gl.getUniformLocation(prog, 'uRes');
    var uTime = gl.getUniformLocation(prog, 'uTime');
    var uMouse = gl.getUniformLocation(prog, 'uMouse');
    var uHover = gl.getUniformLocation(prog, 'uHover');

    function resize() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas.parentElement);
    else window.addEventListener('resize', resize);
    resize();

    var target = { x: 0.4, y: -0.2, h: 0 };
    var cur = { x: 0.4, y: -0.2, h: 0 };
    window.addEventListener('pointermove', function (event) {
      var rect = canvas.getBoundingClientRect();
      target.x = (event.clientX - rect.left - rect.width / 2) / rect.height;
      target.y = (rect.height / 2 - (event.clientY - rect.top)) / rect.height;
      target.h = (event.clientY >= rect.top && event.clientY <= rect.bottom) ? 1 : 0;
    });
    document.addEventListener('pointerleave', function () { target.h = 0; });

    var visible = true;
    watchVisibility(canvas, function (isVisible) { visible = isVisible; });
    var start = performance.now();

    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      cur.x += (target.x - cur.x) * 0.04;
      cur.y += (target.y - cur.y) * 0.04;
      cur.h += (target.h - cur.h) * 0.04;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, still ? 12 : (now - start) / 1000);
      gl.uniform2f(uMouse, cur.x, cur.y);
      gl.uniform1f(uHover, cur.h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(frame);
  }

  function initBrain(still) {
    var panel = document.getElementById('connect');
    var field = document.getElementById('brainField');
    var flow = document.getElementById('flow');
    var orb = document.getElementById('orb');
    var card = document.getElementById('llm');
    var chips = Array.prototype.slice.call(document.querySelectorAll('#chips .chip'));
    if (!panel || !field || !flow || !orb || !card) return;

    var gl = field.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    var ctx = flow.getContext('2d');
    var uniforms = {};

    var frag = [
      'precision highp float;',
      'uniform vec2 uRes; uniform float uTime; uniform vec2 uBrain; uniform float uR; uniform vec2 uMouse; uniform float uHover;',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }',
      'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);',
      '  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }',
      'float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p=p*2.03+17.; a*=.5; } return v; }',
      'vec3 palette(float t){ t = clamp(t, 0., 1.);',
      '  vec3 c0=vec3(.06,.10,.20), c1=vec3(.04,.36,.56), c2=vec3(.84,.82,.75), c3=vec3(.72,.56,.75), c4=vec3(.24,.22,.68), c5=vec3(.80,.40,.20);',
      '  float s = t*5.;',
      '  if(s<1.) return mix(c0,c1,s); if(s<2.) return mix(c1,c2,s-1.); if(s<3.) return mix(c2,c3,s-2.); if(s<4.) return mix(c3,c4,s-3.);',
      '  return mix(c4,c5,s-4.); }',
      'void main(){',
      '  vec2 p = (gl_FragCoord.xy - .5*uRes) / uRes.y;',
      '  float T = uTime;',
      '  vec2 q = p - uBrain;',
      '  q += .018*vec2(sin(q.y*7. + T*.45), cos(q.x*7. - T*.38));',
      '  float r = uR * (1. + .025*sin(T*.9));',
      '  float d = length(q) - r;',
      '  float md = length(p - uMouse);',
      '  d -= .04 * uHover * exp(-md*md*14.);',
      '  float w = .03, k = fract(d/w), band = floor(d/w);',
      '  float ring = step(0., d) * (1. - smoothstep(0., .5, d));',
      '  vec2 n = normalize(q + 1e-4);',
      '  vec2 sp = p + n * (k - .5) * .07 * ring;',
      '  float ang = atan(q.y, q.x);',
      '  float g = .55 - (sp.y - uBrain.y)*1.1 + .12*sin(ang*2. + T*.12);',
      '  float f = fbm(sp*1.4 + vec2(T*.03, -T*.02));',
      '  float t = mix(g, f*1.4 - .2, .35) + (k - .5)*.6*ring + band*.025*ring;',
      '  vec3 col = palette(t);',
      '  col *= mix(1., .84 + .24*smoothstep(0., 1., k), ring);',
      '  float inside = 1. - smoothstep(-.004, .004, d);',
      '  float to = .48 + .38*(fbm(q*4. + vec2(T*.06, T*.04)) - .5) - q.y/r*.22 + .1*sin(T*.3);',
      '  vec3 orbCol = palette(to) * (1.05 - .25*length(q)/r);',
      '  orbCol += vec3(1.,.85,.75) * smoothstep(-.02, 0., d) * .22;',
      '  col = mix(col, orbCol, inside);',
      '  vec3 night = vec3(.043,.071,.125);',
      '  col = mix(col, night, smoothstep(.06, .42, d) * .96);',
      '  col += (hash(gl_FragCoord.xy + fract(T)*100.) - .5) * .04;',
      '  gl_FragColor = vec4(col, 1.);',
      '}'
    ].join('\n');

    if (gl) {
      var prog = link(gl, 'attribute vec2 a; void main(){ gl_Position = vec4(a,0.,1.); }', frag);
      if (prog) {
        gl.useProgram(prog);
        fullscreen(gl);
        ['uRes', 'uTime', 'uBrain', 'uR', 'uMouse', 'uHover'].forEach(function (name) {
          uniforms[name] = gl.getUniformLocation(prog, name);
        });
      } else {
        gl = null;
      }
    }
    if (!gl) {
      field.style.background = 'radial-gradient(circle at 25% 50%, #b892c0, #3d38ad 18%, #0b1220 45%)';
    }

    var dpr = 1;
    var width = 0;
    var height = 0;
    var geo = null;

    function measure() {
      var panelRect = panel.getBoundingClientRect();
      var orbRect = orb.getBoundingClientRect();
      var cardRect = card.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = panelRect.width;
      height = panelRect.height;
      field.width = flow.width = Math.max(1, Math.round(width * dpr));
      field.height = flow.height = Math.max(1, Math.round(height * dpr));
      if (gl) gl.viewport(0, 0, field.width, field.height);

      var bx = orbRect.left - panelRect.left + orbRect.width / 2;
      var by = orbRect.top - panelRect.top + orbRect.height / 2;
      var radius = orbRect.width / 2;
      var stacked = cardRect.top > orbRect.bottom;
      var a;
      var b;
      var c1;
      var c2;
      if (stacked) {
        a = { x: bx, y: by + radius + 8 };
        b = { x: cardRect.left - panelRect.left + cardRect.width / 2, y: cardRect.top - panelRect.top - 10 };
        c1 = { x: a.x, y: a.y + (b.y - a.y) * 0.6 };
        c2 = { x: b.x, y: b.y - (b.y - a.y) * 0.6 };
      } else {
        a = { x: bx + radius + 10, y: by };
        b = { x: cardRect.left - panelRect.left - 10, y: cardRect.top - panelRect.top + cardRect.height / 2 };
        c1 = { x: a.x + (b.x - a.x) * 0.5, y: a.y };
        c2 = { x: a.x + (b.x - a.x) * 0.5, y: b.y };
      }
      geo = { bx: bx, by: by, r: radius, a: a, b: b, c1: c1, c2: c2 };
    }

    if (window.ResizeObserver) new ResizeObserver(measure).observe(panel);
    else window.addEventListener('resize', measure);
    measure();

    function bez(u, g) {
      var v = 1 - u;
      return {
        x: v * v * v * g.a.x + 3 * v * v * u * g.c1.x + 3 * v * u * u * g.c2.x + u * u * u * g.b.x,
        y: v * v * v * g.a.y + 3 * v * v * u * g.c1.y + 3 * v * u * u * g.c2.y + u * u * u * g.b.y
      };
    }

    var target = { x: 0, y: 0, h: 0 };
    var cur = { x: 0, y: 0, h: 0 };
    panel.addEventListener('pointermove', function (event) {
      var rect = panel.getBoundingClientRect();
      target.x = (event.clientX - rect.left - rect.width / 2) / rect.height;
      target.y = (rect.height / 2 - (event.clientY - rect.top)) / rect.height;
      target.h = 1;
    });
    panel.addEventListener('pointerleave', function () { target.h = 0; });

    var duration = 2.4;
    var gap = 1.1;
    var pulses = [];
    var nextSpawn = 0;
    var lit = 0;
    var resetAt = 0;

    function arrive(now) {
      card.classList.add('hit');
      window.setTimeout(function () { card.classList.remove('hit'); }, 450);
      if (lit < chips.length) {
        chips[lit].classList.add('on');
        lit += 1;
        if (lit === chips.length) resetAt = now + 3.5;
      }
    }

    function drawFlow(time) {
      if (!ctx || !geo) return;
      var g = geo;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      var grad = ctx.createLinearGradient(g.a.x, g.a.y, g.b.x, g.b.y);
      grad.addColorStop(0, 'rgba(244,241,234,.55)');
      grad.addColorStop(1, 'rgba(244,241,234,.2)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 6]);
      ctx.beginPath();
      ctx.moveTo(g.a.x, g.a.y);
      ctx.bezierCurveTo(g.c1.x, g.c1.y, g.c2.x, g.c2.y, g.b.x, g.b.y);
      ctx.stroke();
      ctx.setLineDash([]);

      pulses.forEach(function (pulse) {
        var u = Math.min(1, (time - pulse.t0) / duration);
        var eased = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        for (var i = 7; i >= 0; i--) {
          var uu = Math.max(0, eased - i * 0.018);
          var pt = bez(uu, g);
          var fade = 1 - i / 8;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, (i ? 2.4 : 4.5) * fade + 0.5, 0, Math.PI * 2);
          ctx.fillStyle = i ? 'rgba(232,160,110,' + (0.45 * fade) + ')' : '#f4f1ea';
          ctx.shadowColor = 'rgba(232,140,90,.9)';
          ctx.shadowBlur = i ? 0 : 18;
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      });

      ctx.beginPath();
      ctx.arc(g.b.x, g.b.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(244,241,234,.6)';
      ctx.fill();
    }

    if (still) chips.forEach(function (chip) { chip.classList.add('on'); });

    var visible = true;
    watchVisibility(panel, function (isVisible) { visible = isVisible; });
    var start = performance.now();

    function frame(now) {
      requestAnimationFrame(frame);
      if (!visible || document.hidden || !geo) return;
      var time = (now - start) / 1000;
      cur.x += (target.x - cur.x) * 0.05;
      cur.y += (target.y - cur.y) * 0.05;
      cur.h += (target.h - cur.h) * 0.05;
      if (gl) {
        gl.uniform2f(uniforms.uRes, field.width, field.height);
        gl.uniform1f(uniforms.uTime, still ? 8 : time);
        gl.uniform2f(uniforms.uBrain, (geo.bx - width / 2) / height, (height / 2 - geo.by) / height);
        gl.uniform1f(uniforms.uR, geo.r / height);
        gl.uniform2f(uniforms.uMouse, cur.x, cur.y);
        gl.uniform1f(uniforms.uHover, cur.h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      if (!still) {
        if (resetAt && time > resetAt) {
          chips.forEach(function (chip) { chip.classList.remove('on'); });
          lit = 0;
          resetAt = 0;
        }
        if (time > nextSpawn && !resetAt) {
          pulses.push({ t0: time });
          nextSpawn = time + gap;
        }
        pulses = pulses.filter(function (pulse) {
          if (time - pulse.t0 >= duration) {
            arrive(time);
            return false;
          }
          return true;
        });
      }
      drawFlow(time);
    }
    requestAnimationFrame(frame);
  }
})();

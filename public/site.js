/* Creative in the Loop: shared page engine.
   Pinned scenes ([data-scene]) get --p from 0 to 1 as they scroll through.
   A page adds behaviour by registering hooks before this file runs:
   window.CITL = { hooks: { sceneName: function (p, el) {} } } */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) root.classList.add('motion');

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var hooks = (window.CITL && window.CITL.hooks) || {};
  var scenes = [].slice.call(document.querySelectorAll('[data-scene]'));
  scenes.forEach(function (s) { s._p = 0; s._t = 0; });

  // Sideways runs: a [data-track] inside a scene slides by its overflow.
  var tracks = [].slice.call(document.querySelectorAll('[data-track]'));
  function measure() {
    tracks.forEach(function (t) {
      var scene = t.closest('[data-scene]');
      if (scene) scene.style.setProperty('--max', Math.max(0, t.scrollWidth - window.innerWidth));
    });
  }
  measure();
  window.addEventListener('resize', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  // Pointer tilt on anything marked [data-tilt].
  var tilts = [].slice.call(document.querySelectorAll('[data-tilt]'));
  if (!reduce && tilts.length) {
    window.addEventListener('pointermove', function (e) {
      var x = (e.clientX / innerWidth - .5) * 14, y = (e.clientY / innerHeight - .5) * -10;
      tilts.forEach(function (t) {
        t.style.setProperty('--tx', x.toFixed(2) + 'deg');
        t.style.setProperty('--ty', y.toFixed(2) + 'deg');
      });
    }, { passive: true });
  }

  // Sections marked .reveal come in once.
  var reveals = [].slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .2 });
    reveals.forEach(function (r) { io.observe(r); });
  } else {
    reveals.forEach(function (r) { r.classList.add('in'); });
  }

  // Floating menu: chapter name and page progress.
  var chapterBox = document.querySelector('.chapter');
  var chapterLabel = document.getElementById('chapterLabel');
  var progRing = document.getElementById('progRing');
  var chapters = [].slice.call(document.querySelectorAll('[data-chapter]'));
  var lastChapter = '';
  if (chapterBox && !chapters.length) chapterBox.hidden = true;

  function dock() {
    if (!chapters.length) return;
    var mid = innerHeight * .5, name = lastChapter;
    for (var i = 0; i < chapters.length; i++) {
      var r = chapters[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) { name = chapters[i].dataset.chapter; break; }
    }
    if (name !== lastChapter && chapterLabel) {
      lastChapter = name;
      chapterLabel.textContent = name;
      if (!reduce) { chapterLabel.classList.remove('swap'); void chapterLabel.offsetWidth; chapterLabel.classList.add('swap'); }
    }
    var max = document.documentElement.scrollHeight - innerHeight;
    if (progRing) progRing.setAttribute('stroke-dashoffset', (100 - clamp(scrollY / (max || 1), 0, 1) * 100).toFixed(1));
  }

  function frame() {
    var vh = innerHeight;
    scenes.forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      var total = r.height - vh;
      s._t = total > 0 ? clamp(-r.top / total, 0, 1) : 1;
      s._p += (s._t - s._p) * .16;
      if (Math.abs(s._t - s._p) < .0005) s._p = s._t;
      s.style.setProperty('--p', s._p.toFixed(4));
      var h = hooks[s.dataset.scene];
      if (h) h(s._p, s);
    });
    dock();
    requestAnimationFrame(frame);
  }

  if (!reduce) {
    requestAnimationFrame(frame);
  } else {
    scenes.forEach(function (s) { var h = hooks[s.dataset.scene]; if (h) h(1, s); });
    dock();
    window.addEventListener('scroll', dock, { passive: true });
  }
})();

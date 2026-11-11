(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) root.classList.add('motion');

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var scenes = [].slice.call(document.querySelectorAll('[data-scene]'));
  scenes.forEach(function (s) { s._p = 0; s._t = 0; });

  // Words in the person scene light up one by one.
  var readLine = document.getElementById('readLine');
  var words = [];
  if (readLine) {
    var text = readLine.textContent.trim().split(/\s+/);
    readLine.textContent = '';
    text.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'w'; s.textContent = w;
      readLine.appendChild(s);
      if (i < text.length - 1) readLine.appendChild(document.createTextNode(' '));
      words.push(s);
    });
  }

  var scoreNum = document.getElementById('scoreNum');
  var howItems = [].slice.call(document.querySelectorAll('#howSteps li'));
  var track = document.getElementById('track');
  var practice = document.querySelector('[data-scene="practice"]');
  var chapterLabel = document.getElementById('chapterLabel');
  var progRing = document.getElementById('progRing');
  var chapters = [].slice.call(document.querySelectorAll('[data-chapter]'));
  var lastChapter = '';

  function measure() {
    if (track && practice) practice.style.setProperty('--max', Math.max(0, track.scrollWidth - window.innerWidth));
  }
  measure();
  window.addEventListener('resize', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  var hooks = {
    score: function (p) {
      var s = clamp((p - .05) / .45, 0, 1);
      if (scoreNum) scoreNum.textContent = Math.round(s * 38);
    },
    how: function (p) {
      var step = p < .34 ? 0 : p < .68 ? 1 : 2;
      howItems.forEach(function (li, i) {
        li.classList.toggle('on', i === step);
        li.classList.toggle('done', i < step);
      });
    },
    person: function (p) {
      var n = words.length, prog = clamp((p - .1) / .7, 0, 1) * n;
      words.forEach(function (w, i) { w.style.setProperty('--o', (.18 + clamp(prog - i, 0, 1) * .82).toFixed(3)); });
    }
  };

  // Pointer tilt on the hero loop.
  var tilt = document.getElementById('heroTilt');
  if (!reduce && tilt) {
    window.addEventListener('pointermove', function (e) {
      var x = (e.clientX / innerWidth - .5) * 14, y = (e.clientY / innerHeight - .5) * -10;
      tilt.style.setProperty('--tx', x.toFixed(2) + 'deg');
      tilt.style.setProperty('--ty', y.toFixed(2) + 'deg');
    }, { passive: true });
  }

  // Judgement rows come in once.
  var judge = document.getElementById('judge');
  if ('IntersectionObserver' in window && judge) {
    new IntersectionObserver(function (es, o) {
      es.forEach(function (e) { if (e.isIntersecting) { judge.classList.add('in'); o.disconnect(); } });
    }, { threshold: .25 }).observe(judge);
  } else if (judge) { judge.classList.add('in'); }

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
      if (h) h(s._p);
    });

    // Dock: chapter name and page progress.
    var mid = vh * .5, name = lastChapter;
    for (var i = 0; i < chapters.length; i++) {
      var r = chapters[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) { name = chapters[i].dataset.chapter; break; }
    }
    if (name !== lastChapter) {
      lastChapter = name;
      chapterLabel.textContent = name;
      chapterLabel.classList.remove('swap'); void chapterLabel.offsetWidth; chapterLabel.classList.add('swap');
    }
    var max = document.documentElement.scrollHeight - vh;
    progRing.setAttribute('stroke-dashoffset', (100 - clamp(scrollY / (max || 1), 0, 1) * 100).toFixed(1));
    requestAnimationFrame(frame);
  }

  if (!reduce) {
    requestAnimationFrame(frame);
  } else {
    scenes.forEach(function (s) { var h = hooks[s.dataset.scene]; if (h) h(1); });
    window.addEventListener('scroll', function () {
      var max = document.documentElement.scrollHeight - innerHeight;
      progRing.setAttribute('stroke-dashoffset', (100 - clamp(scrollY / (max || 1), 0, 1) * 100).toFixed(1));
    }, { passive: true });
  }
})();

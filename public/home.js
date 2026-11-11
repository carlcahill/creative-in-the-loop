/* Home page scenes. Runs before site.js, which drives them. */
(function () {
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

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

  window.CITL = window.CITL || {};
  var glow = function (name, key, value) { if (window.CITLGL) window.CITLGL.set(name, key, value); };

  window.CITL.hooks = {
    hero: function (p) { glow('hero', 'gap', p * .1); },
    score: function (p) {
      if (scoreNum) scoreNum.textContent = Math.round(clamp((p - .05) / .45, 0, 1) * 38);
    },
    how: function (p) {
      glow('how', 'build', clamp(p / .28, 0, 1));
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
})();

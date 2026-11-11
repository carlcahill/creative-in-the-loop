/* Agencies page scenes. Runs before site.js, which drives them. */
(function () {
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var nums = [].slice.call(document.querySelectorAll('[data-score]'));
  window.CITL = window.CITL || {};
  window.CITL.hooks = {
    roster: function (p) {
      var s = clamp((p - .08) / .4, 0, 1);
      nums.forEach(function (n) { n.textContent = Math.round(Number(n.dataset.score) * s); });
    }
  };
})();

// 見どころガイド：番号で切り替え、該当位置に波紋を出す（アプリの挙動のWeb再現デモ）
(function () {
  var ripple = document.getElementById('ripple');
  var panels = document.querySelectorAll('.guide__panel');
  var buttons = document.querySelectorAll('.guide__btn');
  var counter = document.getElementById('guide-no');
  if (!ripple || !panels.length || !buttons.length) return;

  var current = 0;

  function show(i) {
    panels.forEach(function (p, n) {
      var on = n === i;
      p.classList.toggle('is-active', on);
      p.setAttribute('aria-hidden', on ? 'false' : 'true');
      if (on) p.removeAttribute('inert'); else p.setAttribute('inert', '');
    });
    buttons.forEach(function (b, n) {
      var on = n === i;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (counter) counter.textContent = '0' + (i + 1);
    current = i;
  }

  function play(i) {
    ripple.style.left = panels[i].dataset.x + '%';
    ripple.style.top = panels[i].dataset.y + '%';
    // 同じ番号を続けて押しても、波紋を最初から再生し直す
    ripple.classList.remove('is-on');
    void ripple.offsetWidth;
    ripple.classList.add('is-on');
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      var i = Number(b.dataset.i);
      show(i);
      play(i);
    });
  });
})();

// 当時の声：Xの公式埋め込みカルーセル
(function () {
  var root = document.getElementById('voices');
  if (!root) return;
  var track = document.getElementById('voices-track');
  var slides = Array.prototype.slice.call(track.querySelectorAll('.voice'));
  var dots = Array.prototype.slice.call(root.querySelectorAll('.voices__dot'));
  var prev = root.querySelector('.voices__arrow--prev');
  var next = root.querySelector('.voices__arrow--next');

  function step() {
    return slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth;
  }
  function maxScroll() { return track.scrollWidth - track.clientWidth; }

  function update() {
    var left = track.scrollLeft, box = track.getBoundingClientRect();
    prev.disabled = left <= 1;
    next.disabled = left >= maxScroll() - 1;
    // 表示領域に半分以上入っている投稿を「表示中」として示す
    slides.forEach(function (s, i) {
      var r = s.getBoundingClientRect();
      var visible = Math.min(r.right, box.right) - Math.max(r.left, box.left);
      dots[i].classList.toggle('is-active', visible >= r.width * 0.5);
    });
  }

  function go(x) { track.scrollTo({ left: Math.max(0, Math.min(maxScroll(), x)), behavior: 'smooth' }); }
  prev.addEventListener('click', function () { go(track.scrollLeft - step()); });
  next.addEventListener('click', function () { go(track.scrollLeft + step()); });
  dots.forEach(function (d, i) { d.addEventListener('click', function () { go(slides[i].offsetLeft - slides[0].offsetLeft); }); });
  track.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', update);
  update();

  // Xの外部スクリプトは、カルーセルが画面に近づいてから読み込む
  var started = false;
  function loadEmbeds() {
    if (started) return;
    started = true;
    var s = document.createElement('script');
    s.src = 'https://platform.twitter.com/widgets.js';
    s.async = true;
    s.charset = 'utf-8';
    s.onload = function () {
      if (window.twttr && window.twttr.widgets) window.twttr.widgets.load(track).then(function () { window.setTimeout(update, 300); });
    };
    // 読み込めない場合は、元投稿へのリンクと案内だけを詰めて表示する
    function fallback() { if (!track.querySelector('iframe')) root.classList.add('voices--fallback'); }
    s.onerror = fallback;
    window.setTimeout(fallback, 10000);
    document.head.appendChild(s);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); loadEmbeds(); }
    }, { rootMargin: '600px 0px' });
    io.observe(root);
  } else {
    loadEmbeds();
  }
})();

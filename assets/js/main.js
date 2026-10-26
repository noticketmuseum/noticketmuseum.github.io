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
// ・埋め込みの幅は、CSSで決まったスライド幅をそのまま渡す（250〜550px。iframeを拡大縮小・切り取りしない）
// ・どのスライドも左端に揃えて止める（末尾の余白はCSSの ::after）。幅が変わったら埋め込みを作り直し、位置を復元する
(function () {
  var root = document.getElementById('voices');
  if (!root) return;
  var track = document.getElementById('voices-track');
  var slides = Array.prototype.slice.call(track.querySelectorAll('.voice'));
  var dots = Array.prototype.slice.call(root.querySelectorAll('.voices__dot'));
  var prev = root.querySelector('.voices__arrow--prev');
  var next = root.querySelector('.voices__arrow--next');
  // 作り直し用に、元投稿のURLだけを保持する（投稿本文は保存しない）
  var urls = slides.map(function (s) { return s.querySelector('a').getAttribute('href'); });

  var index = 0;          // 現在の位置（左端に揃えるスライドの番号）
  var started = false;    // widgets.js を読み込み始めたか
  var renderedWidth = 0;  // 埋め込みを作った時のスライド幅

  function maxScroll() { return track.scrollWidth - track.clientWidth; }
  function snaps() {   // 左端に揃えて止められるスライドの位置
    var base = slides[0].offsetLeft, max = maxScroll() + 1;
    return slides.map(function (s) { return s.offsetLeft - base; }).filter(function (x) { return x <= max; });
  }
  function nearest() {
    var p = snaps(), left = track.scrollLeft, best = 0;
    p.forEach(function (x, i) { if (Math.abs(x - left) < Math.abs(p[best] - left)) best = i; });
    return best;
  }

  function update() {
    var p = snaps(), box = track.getBoundingClientRect();
    index = nearest();
    prev.disabled = index <= 0;
    next.disabled = index >= p.length - 1;
    // 表示領域に半分以上入っているスライドを「表示中」として示す
    slides.forEach(function (s, i) {
      var r = s.getBoundingClientRect();
      var visible = Math.min(r.right, box.right) - Math.max(r.left, box.left);
      dots[i].classList.toggle('is-active', visible >= r.width * 0.5);
    });
  }

  function goIndex(i, smooth) {
    var p = snaps();
    index = Math.max(0, Math.min(p.length - 1, i));
    track.scrollTo({ left: p[index], behavior: smooth ? 'smooth' : 'instant' });
  }
  function restore() { goIndex(index, false); update(); }

  prev.addEventListener('click', function () { goIndex(nearest() - 1, true); });
  next.addEventListener('click', function () { goIndex(nearest() + 1, true); });
  dots.forEach(function (d, i) { d.addEventListener('click', function () { goIndex(i, true); }); });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); goIndex(nearest() + 1, true); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goIndex(nearest() - 1, true); }
    else if (e.key === 'Home') { e.preventDefault(); goIndex(0, true); }
    else if (e.key === 'End') { e.preventDefault(); goIndex(snaps().length - 1, true); }
  });
  track.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });

  // ---- 埋め込み ----
  function targetWidth() { return Math.max(250, Math.min(550, Math.floor(slides[0].getBoundingClientRect().width))); }

  function render() {
    if (!(window.twttr && window.twttr.widgets)) return;
    var w = targetWidth();
    renderedWidth = w;
    slides.forEach(function (s, i) {   // 毎回まっさらなblockquoteから作る（リンクのみ）
      s.innerHTML = '<blockquote class="twitter-tweet" data-lang="ja" data-dnt="true" data-theme="dark" data-width="' + w + '">' +
        '<a href="' + urls[i] + '" target="_blank" rel="noopener noreferrer">Xで元の投稿を見る</a></blockquote>';
    });
    window.twttr.widgets.load(track).then(function () {
      root.classList.add('voices--ready');
      restore();
      window.setTimeout(restore, 400);
    });
  }

  function loadEmbeds() {
    if (started) return;
    started = true;
    var s = document.createElement('script');
    s.src = 'https://platform.twitter.com/widgets.js';
    s.async = true;
    s.charset = 'utf-8';
    s.onload = render;
    s.onerror = function () { root.classList.add('voices--ready'); };   // 読み込めない場合はリンクだけが残る
    document.head.appendChild(s);
  }

  var timer = 0;
  window.addEventListener('resize', function () {
    update();
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      restore();
      if (started && renderedWidth && Math.abs(targetWidth() - renderedWidth) > 1) render();   // 幅が変わったら作り直す
    }, 250);
  });

  update();
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); loadEmbeds(); }
    }, { rootMargin: '1500px 0px' });
    io.observe(root);
  } else {
    loadEmbeds();
  }
})();

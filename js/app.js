/*
  Backseat — app logic.
  Each screen is one render function that fills #view. The URL hash (#/trivia, #/bingo …)
  decides which screen shows, so the phone's back button works as expected.
*/
(function () {
  'use strict';

  var D = window.BACKSEAT_DATA;
  var view = document.getElementById('view');
  var topbar = document.getElementById('topbar');
  var titleEl = document.getElementById('screen-title');
  var backBtn = document.getElementById('back');

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Saved progress (best scores, bingo card). Fails quietly in private browsing.
  var store = {
    get: function (k, fallback) {
      try { var v = localStorage.getItem('backseat:' + k); return v === null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set: function (k, v) {
      try { localStorage.setItem('backseat:' + k, JSON.stringify(v)); } catch (e) { /* ignore */ }
    },
  };

  function buzz(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* ignore */ } }
  function bg() { return window.BackseatBG || { setDim: function () {}, pulse: function () {} }; }

  // A shuffled deck that deals every card once before reshuffling. Kept for the whole visit.
  var decks = {};
  function getDeck(name, items) {
    if (!decks[name]) {
      var order = shuffle(items), i = 0;
      decks[name] = {
        total: items.length,
        pos: function () { return i; },
        next: function () {
          if (i >= order.length) { order = shuffle(items); i = 0; }
          return order[i++];
        },
      };
    }
    return decks[name];
  }

  var ICONS = {
    riddles: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7"/><circle cx="12" cy="17" r=".4"/>',
    trivia: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.3.3.5.7.5 1.1V16h6v-1c0-.4.2-.8.5-1.1A6 6 0 0 0 12 3z"/>',
    puzzles: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5" class="fill"/>',
    bingo: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
    wyr: '<path d="M12 21v-7L5 7M12 14l7-7M5 12V7h5M19 12V7h-5"/>',
    daily: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  };
  function icon(name) { return '<svg viewBox="0 0 24 24" class="icon" aria-hidden="true">' + ICONS[name] + '</svg>'; }

  /* ---------- screens ---------- */

  var screens = {
    home:          { title: '',                 render: renderHome },
    riddles:       { title: 'Riddles',          accent: '#ffb86b', parent: '',        render: renderRiddles },
    trivia:        { title: 'Trivia',           accent: '#ff5fa2', parent: '',        render: renderTriviaMenu },
    'trivia-play': { title: triviaTitle,        accent: '#ff5fa2', parent: 'trivia',  render: renderTriviaPlay },
    puzzles:       { title: 'Visual puzzles',   accent: '#7cf0ff', parent: '',        render: renderPuzzles },
    rebus:         { title: 'Emoji rebus',      accent: '#7cf0ff', parent: 'puzzles', render: renderRebus },
    shade:         { title: 'Spot the shade',   accent: '#7cf0ff', parent: 'puzzles', render: renderShade },
    bingo:         { title: 'Road bingo',       accent: '#b8ff6b', parent: '',        render: renderBingo },
    wyr:           { title: 'Would you rather', accent: '#c69bff', parent: '',        render: renderWyr },
    daily:         { title: 'Daily games',      accent: '#ffd84d', parent: '',        render: renderDaily },
  };

  /* Home */
  function renderHome(el) {
    var tiles = [
      ['riddles', 'Riddles', 'Read one out, first to crack it wins'],
      ['trivia', 'Trivia', 'Six categories, ten questions a round'],
      ['puzzles', 'Visual puzzles', 'Emoji rebus & spot the shade'],
      ['bingo', 'Road bingo', 'Spot it out the window, tap it'],
      ['wyr', 'Would you rather', 'Impossible choices, loud debates'],
      ['daily', 'Daily games', 'Wordle, Connections & friends'],
    ];
    el.innerHTML =
      '<header class="hero">' +
        '<p class="eyebrow">Road trip companion</p>' +
        '<h1 class="logo">Backseat</h1>' +
        '<p class="lede">Games for the long way round. One person holds the phone, everyone plays.</p>' +
      '</header>' +
      '<nav class="tiles">' +
        tiles.map(function (t, i) {
          return '<a class="tile" href="#/' + t[0] + '" style="--accent:' + screens[t[0]].accent + ';--i:' + i + '">' +
            '<span class="tile-icon">' + icon(t[0]) + '</span>' +
            '<span class="tile-name">' + t[1] + '</span>' +
            '<span class="tile-sub">' + t[2] + '</span>' +
          '</a>';
        }).join('') +
      '</nav>';
  }

  /* Shared "read it out, then reveal" layout used by riddles and the emoji rebus */
  function revealDeck(el, opts) {
    var deck = opts.deck;
    function show() {
      var item = deck.next();
      var revealed = false;
      el.innerHTML =
        '<article class="card stage">' +
          '<p class="kicker">' + opts.kicker(item, deck) + '</p>' +
          opts.body(item) +
          '<div class="answer" aria-live="polite">' +
            '<p class="kicker">Answer</p>' +
            '<p class="answer-text">' + esc(opts.answer(item)) + '</p>' +
          '</div>' +
        '</article>' +
        '<div class="actions">' +
          '<button class="btn" data-act="main">Reveal answer</button>' +
          '<button class="btn ghost" data-act="skip">Skip</button>' +
        '</div>';
      var main = el.querySelector('[data-act=main]');
      var skip = el.querySelector('[data-act=skip]');
      main.onclick = function () {
        if (revealed) return show();
        revealed = true;
        el.querySelector('.answer').classList.add('show');
        main.textContent = opts.nextLabel;
        skip.hidden = true;
        buzz(10);
      };
      skip.onclick = show;
    }
    show();
  }

  /* Riddles */
  function renderRiddles(el) {
    revealDeck(el, {
      deck: getDeck('riddles', D.riddles),
      kicker: function (r, d) { return 'Riddle ' + d.pos() + ' of ' + d.total; },
      body: function (r) { return '<p class="big-text">' + esc(r.q) + '</p>'; },
      answer: function (r) { return r.a; },
      nextLabel: 'Next riddle',
    });
  }

  /* Trivia — category picker */
  function renderTriviaMenu(el) {
    var cats = D.trivia.map(function (c, i) {
      return '<a class="row-card" href="#/trivia-play?cat=' + c.id + '" style="--dot:' + c.color + ';--i:' + i + '">' +
        '<span class="dot"></span>' +
        '<span class="row-text"><span class="row-name">' + esc(c.name) + '</span><span class="row-sub">' + esc(c.blurb) + '</span></span>' +
        '<span class="row-meta">' + c.questions.length + ' Qs</span>' +
      '</a>';
    }).join('');
    el.innerHTML =
      '<p class="lede">Pick a category. One person reads, everyone shouts.</p>' +
      '<div class="row-list">' +
        '<a class="row-card featured" href="#/trivia-play?cat=mixed" style="--dot:var(--accent);--i:0">' +
          '<span class="dot"></span>' +
          '<span class="row-text"><span class="row-name">Mixed bag</span><span class="row-sub">A bit of everything</span></span>' +
          '<span class="row-meta">10 Qs</span>' +
        '</a>' +
        cats +
      '</div>';
  }

  function triviaTitle(params) {
    var cat = D.trivia.filter(function (c) { return c.id === params.get('cat'); })[0];
    return cat ? cat.name : 'Mixed bag';
  }

  /* Trivia — a round of up to 10 questions */
  function renderTriviaPlay(el, params) {
    var cat = D.trivia.filter(function (c) { return c.id === params.get('cat'); })[0];
    var pool = cat
      ? cat.questions.map(function (q) { return Object.assign({ cat: cat.name }, q); })
      : [].concat.apply([], D.trivia.map(function (c) {
          return c.questions.map(function (q) { return Object.assign({ cat: c.name }, q); });
        }));
    var qs = shuffle(pool).slice(0, 10);
    var i = 0, score = 0;

    function showQuestion() {
      var q = qs[i];
      var opts = shuffle([q.a].concat(q.wrong));
      el.innerHTML =
        '<div class="progress"><span style="width:' + (i / qs.length * 100) + '%"></span></div>' +
        '<div class="meta-row"><span>Question ' + (i + 1) + ' / ' + qs.length + '</span><span>Score <b>' + score + '</b></span></div>' +
        '<article class="card"><p class="kicker">' + esc(q.cat) + '</p><p class="big-text">' + esc(q.q) + '</p></article>' +
        '<div class="options">' +
          opts.map(function (o, k) { return '<button class="option" data-k="' + k + '" style="--i:' + k + '">' + esc(o) + '</button>'; }).join('') +
        '</div>' +
        '<div class="actions"><button class="btn" data-act="next" hidden>' + (i === qs.length - 1 ? 'See results' : 'Next question') + '</button></div>';

      var buttons = el.querySelectorAll('.option');
      var next = el.querySelector('[data-act=next]');
      el.querySelector('.options').onclick = function (e) {
        var b = e.target.closest('.option');
        if (!b || b.disabled) return;
        var right = opts[+b.dataset.k] === q.a;
        buttons.forEach(function (x) {
          x.disabled = true;
          if (opts[+x.dataset.k] === q.a) x.classList.add('correct');
          else if (x === b) x.classList.add('wrong');
          else x.classList.add('dim');
        });
        if (right) { score++; bg().pulse(0.8); buzz(15); } else { buzz([30, 40, 30]); }
        el.querySelector('.meta-row b').textContent = score;
        el.querySelector('.progress span').style.width = ((i + 1) / qs.length * 100) + '%';
        next.hidden = false;
        next.focus({ preventScroll: true });
      };
      next.onclick = function () { i++; i < qs.length ? showQuestion() : showResults(); };
    }

    function showResults() {
      var pct = score / qs.length;
      var msg = pct === 1 ? 'Flawless. Frankly insufferable.'
        : pct >= 0.7 ? 'Big brain energy.'
        : pct >= 0.4 ? 'Respectable. Snacks earned.'
        : 'The road is long. Try again.';
      if (pct >= 0.7) bg().pulse(2);
      el.innerHTML =
        '<article class="card stage center">' +
          '<p class="kicker">Round complete</p>' +
          '<p class="score-big">' + score + '<span>/' + qs.length + '</span></p>' +
          '<p class="big-text">' + msg + '</p>' +
        '</article>' +
        '<div class="actions">' +
          '<button class="btn" data-act="again">Play again</button>' +
          '<a class="btn ghost" href="#/trivia">Change category</a>' +
        '</div>';
      el.querySelector('[data-act=again]').onclick = function () { renderTriviaPlay(el, params); };
    }

    showQuestion();
  }

  /* Visual puzzles — menu */
  function renderPuzzles(el) {
    var swatch = '';
    for (var k = 0; k < 9; k++) swatch += '<i style="background:hsl(190,70%,' + (k === 5 ? 62 : 55) + '%)"></i>';
    el.innerHTML =
      '<p class="lede">Hand the phone around. Loser picks the next song.</p>' +
      '<a class="puzzle-card" href="#/rebus" style="--i:0">' +
        '<span class="puzzle-art rebus-art">🌧️ + 🎀</span>' +
        '<span class="row-name">Emoji rebus</span>' +
        '<span class="row-sub">Sound out the emoji to find the word or movie</span>' +
      '</a>' +
      '<a class="puzzle-card" href="#/shade" style="--i:1">' +
        '<span class="puzzle-art swatch-art">' + swatch + '</span>' +
        '<span class="row-name">Spot the shade</span>' +
        '<span class="row-sub">Find the odd tile out. It gets sneaky fast.</span>' +
      '</a>';
  }

  /* Emoji rebus */
  function renderRebus(el) {
    revealDeck(el, {
      deck: getDeck('rebus', D.rebus),
      kicker: function (r) { return 'Guess the ' + r.type.toLowerCase(); },
      body: function (r) { return '<p class="rebus" aria-label="Emoji clue">' + r.e + '</p>'; },
      answer: function (r) { return r.a; },
      nextLabel: 'Next puzzle',
    });
  }

  /* Spot the shade — find the tile that's a slightly different color */
  function renderShade(el) {
    var level, lives, odd, busy = false, timer = 0;
    var best = store.get('shade-best', 0);

    el.innerHTML =
      '<div class="meta-row"><span>Level <b data-level></b></span><span class="lives" data-lives></span><span>Best <b data-best></b></span></div>' +
      '<div class="shade-wrap">' +
        '<div class="shade-grid" data-grid></div>' +
        '<div class="shade-over card" hidden>' +
          '<p class="kicker">Game over</p>' +
          '<p class="score-big" data-final></p>' +
          '<p class="row-sub" data-note></p>' +
          '<button class="btn" data-act="restart">Play again</button>' +
        '</div>' +
      '</div>' +
      '<p class="hint">Tap the tile that\'s a slightly different shade. Three misses and you\'re out.</p>';

    var grid = el.querySelector('[data-grid]');
    var over = el.querySelector('.shade-over');

    function hud() {
      el.querySelector('[data-level]').textContent = level;
      el.querySelector('[data-best]').textContent = best;
      var hearts = '';
      for (var k = 0; k < 3; k++) hearts += '<span class="heart' + (k < lives ? '' : ' lost') + '">' + icon('heart') + '</span>';
      el.querySelector('[data-lives]').innerHTML = hearts;
    }

    function nextLevel() {
      var n = Math.min(2 + Math.floor(level / 3), 7);          // grid grows: 2x2 → 7x7
      var delta = Math.max(3, 20 - level * 1.1);               // colour difference shrinks
      var h = Math.floor(Math.random() * 360);
      var s = 55 + Math.random() * 25;
      var l = 45 + Math.random() * 15;
      var oddL = l + (l > 52 ? -delta : delta);
      odd = Math.floor(Math.random() * n * n);
      grid.style.setProperty('--n', n);
      var html = '';
      for (var k = 0; k < n * n; k++) {
        html += '<button class="shade-tile" data-k="' + k + '" aria-label="Tile ' + (k + 1) + '" style="background:hsl(' +
          h + ',' + s.toFixed(1) + '%,' + (k === odd ? oddL : l).toFixed(1) + '%)"></button>';
      }
      grid.innerHTML = html;
      hud();
    }

    function start() { level = 1; lives = 3; over.hidden = true; grid.classList.remove('done'); nextLevel(); }

    function gameOver() {
      var reached = level - 1;
      var isBest = reached > best;
      if (isBest) { best = reached; store.set('shade-best', best); bg().pulse(2); }
      el.querySelector('[data-final]').innerHTML = reached + '<span> levels</span>';
      el.querySelector('[data-note]').textContent = isBest ? 'New personal best!' : 'Best so far: ' + best;
      grid.classList.add('done');
      over.hidden = false;
      hud();
    }

    grid.onclick = function (e) {
      var t = e.target.closest('.shade-tile');
      if (!t || busy || !over.hidden) return;
      if (+t.dataset.k === odd) {
        level++;
        buzz(12);
        if (level % 5 === 0) bg().pulse(1);
        nextLevel();
      } else {
        lives--;
        buzz([30, 40, 30]);
        t.classList.add('miss');
        grid.children[odd].classList.add('reveal');
        hud();
        busy = true;
        timer = setTimeout(function () { busy = false; lives <= 0 ? gameOver() : nextLevel(); }, 900);
      }
    };
    el.querySelector('[data-act=restart]').onclick = start;

    start();
    return function cleanup() { clearTimeout(timer); };
  }

  /* Road bingo */
  var LINES = (function () {
    var lines = [], r, c;
    for (r = 0; r < 5; r++) { lines.push([0, 1, 2, 3, 4].map(function (x) { return r * 5 + x; })); }
    for (c = 0; c < 5; c++) { lines.push([0, 1, 2, 3, 4].map(function (x) { return x * 5 + c; })); }
    lines.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
    return lines;
  })();

  function renderBingo(el) {
    function newCard() {
      var cells = shuffle(D.bingo).slice(0, 24);
      cells.splice(12, 0, 'Free space');
      return { cells: cells, on: cells.map(function (_, i) { return i === 12; }) };
    }
    var card = store.get('bingo-card', null);
    if (!card || !card.cells || card.cells.length !== 25) card = newCard();
    var confirmTimer = 0, toastTimer = 0;

    function winningLines() {
      return LINES.filter(function (line) { return line.every(function (k) { return card.on[k]; }); });
    }

    function draw() {
      el.innerHTML =
        '<p class="hint">Spot it out the window? Tap it. Five in a row wins.</p>' +
        '<div class="bingo-grid">' +
          card.cells.map(function (txt, k) {
            return '<button class="bingo-cell' + (k === 12 ? ' free' : '') + '" data-k="' + k + '" aria-pressed="' + card.on[k] + '">' +
              '<span>' + esc(txt) + '</span></button>';
          }).join('') +
        '</div>' +
        '<div class="toast" role="status" hidden>BINGO!</div>' +
        '<div class="actions"><button class="btn ghost" data-act="new">New card</button></div>';
      paint();

      el.querySelector('.bingo-grid').onclick = function (e) {
        var b = e.target.closest('.bingo-cell');
        if (!b || b.classList.contains('free')) return;
        var k = +b.dataset.k;
        var before = winningLines().length;
        card.on[k] = !card.on[k];
        store.set('bingo-card', card);
        buzz(8);
        paint();
        if (winningLines().length > before) celebrate();
      };

      var newBtn = el.querySelector('[data-act=new]');
      newBtn.onclick = function () {
        // Two taps to confirm, so nobody wipes a half-finished card by accident.
        if (!newBtn.classList.contains('confirm')) {
          newBtn.classList.add('confirm');
          newBtn.textContent = 'Tap again to clear your card';
          confirmTimer = setTimeout(function () { newBtn.classList.remove('confirm'); newBtn.textContent = 'New card'; }, 2500);
          return;
        }
        clearTimeout(confirmTimer);
        card = newCard();
        store.set('bingo-card', card);
        draw();
      };
    }

    function paint() {
      var win = {};
      winningLines().forEach(function (line) { line.forEach(function (k) { win[k] = true; }); });
      el.querySelectorAll('.bingo-cell').forEach(function (b, k) {
        b.classList.toggle('on', !!card.on[k]);
        b.classList.toggle('win', !!win[k]);
        b.setAttribute('aria-pressed', !!card.on[k]);
      });
    }

    function celebrate() {
      var toast = el.querySelector('.toast');
      toast.hidden = false;
      toast.classList.remove('pop'); void toast.offsetWidth; toast.classList.add('pop');
      bg().pulse(2);
      buzz([40, 60, 40, 60, 120]);
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.hidden = true; }, 2200);
    }

    draw();
    return function cleanup() { clearTimeout(confirmTimer); clearTimeout(toastTimer); };
  }

  /* Would you rather */
  function renderWyr(el) {
    var deck = getDeck('wyr', D.wouldYouRather);
    function show() {
      var pair = deck.next();
      el.innerHTML =
        '<p class="kicker center">Would you rather…</p>' +
        '<div class="wyr">' +
          '<button class="wyr-opt" data-k="0">' + esc(pair[0]) + '</button>' +
          '<span class="wyr-or">or</span>' +
          '<button class="wyr-opt" data-k="1">' + esc(pair[1]) + '</button>' +
        '</div>' +
        '<p class="hint">Everyone picks, then defend your answer.</p>' +
        '<div class="actions"><button class="btn" data-act="next">Next question</button></div>';
      var opts = el.querySelectorAll('.wyr-opt');
      opts.forEach(function (o) {
        o.onclick = function () {
          opts.forEach(function (x) { x.classList.toggle('picked', x === o); x.classList.toggle('unpicked', x !== o); });
          buzz(10);
        };
      });
      el.querySelector('[data-act=next]').onclick = show;
    }
    show();
  }

  /* Daily games */
  function renderDaily(el) {
    el.innerHTML =
      '<p class="lede">New puzzle every day. Play together and compare scores at the next stop.</p>' +
      '<div class="row-list">' +
        D.daily.map(function (g, i) {
          return '<a class="row-card" href="' + esc(g.url) + '" target="_blank" rel="noopener" style="--dot:' + g.color + ';--i:' + i + '">' +
            '<span class="badge">' + esc(g.name.charAt(0)) + '</span>' +
            '<span class="row-text"><span class="row-name">' + esc(g.name) + '</span><span class="row-sub">' + esc(g.desc) + '</span></span>' +
            '<span class="row-meta">' + icon('external') + '</span>' +
          '</a>';
        }).join('') +
      '</div>';
  }

  /* ---------- router ---------- */

  var current = null, cleanup = null;

  function route() {
    if (cleanup) { cleanup(); cleanup = null; }
    var parts = location.hash.replace(/^#\/?/, '').split('?');
    var screen = screens[parts[0]] || screens.home;
    var params = new URLSearchParams(parts[1] || '');
    var isHome = screen === screens.home;
    current = screen;

    topbar.hidden = isHome;
    titleEl.textContent = typeof screen.title === 'function' ? screen.title(params) : screen.title;
    document.documentElement.style.setProperty('--accent', screen.accent || '#ff7a8a');
    document.title = isHome ? 'Backseat — road trip games' : titleEl.textContent + ' · Backseat';

    view.className = 'view' + (isHome ? ' is-home' : '');
    view.style.animation = 'none'; void view.offsetHeight; view.style.animation = '';  // replay entrance animation
    view.innerHTML = '';
    cleanup = screen.render(view, params) || null;

    bg().setDim(isHome ? 0 : 1);
    window.scrollTo(0, 0);
  }

  backBtn.addEventListener('click', function () {
    location.hash = '#/' + (current && current.parent ? current.parent : '');
  });
  window.addEventListener('hashchange', route);
  route();

  // Offline support once hosted (service workers don't run from a double-clicked file).
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();

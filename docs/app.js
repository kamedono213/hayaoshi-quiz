// はやおしクイズ — 問題文が1文字ずつ出てくる。分かったところで「押す」→ 答える(自分で採点 / 4択)。
// 問題は data/questions.json(tools/build-data.js が KoukaQuiz の元データから作る)
const app = document.getElementById('app');
const SHOP = 'https://kentei-drill.booth.pm/items/9034193';
let Q = [];
let S = { screen: 'home' };

const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem('hq:' + k)); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('hq:' + k, JSON.stringify(v)); } catch (e) { /* 保存できなくても遊べる */ } },
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const SPEEDS = [['slow', 'ゆっくり', 5], ['normal', 'ふつう', 9], ['fast', 'はやい', 15]];
let pref = store.get('pref', { cat: 'all', mode: 'self', count: 10, speed: 'normal' });
const savePref = () => store.set('pref', pref);

// ---------- 効果音(Web Audio)
const SE = {
  ctx: null,
  ac() { if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; this.ctx = new C(); } if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; },
  tone(f, at, dur, type = 'sine', vol = 0.15) {
    const c = this.ac(); if (!c) return;
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  play(n) {
    if (store.get('muted', false)) return;
    try {
      if (n === 'push') { this.tone(1320, 0, 0.09, 'square', 0.08); this.tone(1760, 0.08, 0.12, 'square', 0.08); }
      if (n === 'ok') { this.tone(988, 0, 0.12); this.tone(1319, 0.11, 0.25); }
      if (n === 'ng') { this.tone(220, 0, 0.18, 'sawtooth', 0.06); this.tone(196, 0.16, 0.25, 'sawtooth', 0.06); }
      if (n === 'end') [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.1, 0.2, 'triangle'));
    } catch (e) { /* 音が出せなくても遊べる */ }
  },
};

function render() { window.scrollTo(0, 0); ({ home: renderHome, quiz: renderQuiz, done: renderDone })[S.screen](); }
function go(screen, extra = {}) { stopTimer(); S = { ...extra, screen }; render(); }

// ---------- ホーム
function renderHome() {
  const cats = [...new Set(Q.map(q => q.cat))];
  const rec = store.get('rec', { n: 0, ok: 0, posSum: 0, pushed: 0 });
  const chip = (key, val, label, small) => `<button class="chip" data-k="${key}" data-v="${esc(val)}" aria-pressed="${pref[key] === val}">${esc(label)}${small != null ? `<small>${small}</small>` : ''}</button>`;
  app.innerHTML = `
    <header class="mast"><p class="eyebrow">早押しクイズの練習</p><h1>はやおし<span>クイズ</span></h1>
      <p class="muted">問題文が1文字ずつ出てきます。分かった瞬間に「押す」! 早く押せるほど上級者。</p></header>
    <section class="panel"><h2>ジャンル</h2>
      <div class="chips">${chip('cat', 'all', '全ジャンル', Q.length)}${cats.map(c => chip('cat', c, c, Q.filter(q => q.cat === c).length)).join('')}</div></section>
    <section class="panel"><h2>答え方</h2>
      <div class="chips">${chip('mode', 'self', '口で答えて自分で採点')}${chip('mode', 'choice', '4択から選ぶ')}</div>
      <p class="small muted">競技クイズの練習なら「自分で採点」。押したら答えを声に出してから、答えを見て○×をつけます。</p></section>
    <section class="panel"><h2>問題数と文字の速さ</h2>
      <div class="chips">${chip('count', 10, '10問')}${chip('count', 30, '30問')}${chip('count', 0, 'ぜんぶ')}</div>
      <div class="chips">${SPEEDS.map(([k, l, cps]) => chip('speed', k, l, cps + '字/秒')).join('')}</div></section>
    <button class="primary big" id="start">スタート</button>
    ${rec.n ? `<p class="small muted center">これまで: ${rec.n}問 ・ 正解率 ${Math.round(rec.ok / rec.n * 100)}% ・ 押した位置の平均 ${rec.pushed ? Math.round(rec.posSum / rec.pushed) : '-'}%(小さいほど早押し)</p>` : ''}
    <a class="shop" href="${SHOP}" target="_blank" rel="noopener"><b>紙とスプレッドシートで練習したい人へ</b><span>この236問を、印刷できる問題集とCSV(表計算ソフト用)にまとめました(BOOTH「けんていドリル」)</span></a>
    <p class="foot small muted">問題は「効果・現象・法則」の名前を答えるオリジナル問題(236問・12ジャンル)。追試で再現できなかった心理学の効果などは、解説にそう書いています。</p>`;
  app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    const k = b.dataset.k; pref[k] = k === 'count' ? Number(b.dataset.v) : b.dataset.v; savePref(); renderHome();
  });
  app.querySelector('#start').onclick = startGame;
}

function startGame() {
  SE.ac();
  const pool = shuffle(Q.filter(q => pref.cat === 'all' || q.cat === pref.cat));
  const list = pref.count ? pool.slice(0, pref.count) : pool;
  go('quiz', { list, i: 0, ok: 0, posSum: 0, pushed: 0, phase: 'reading', shown: 0 });
}

// ---------- 出題
let timer = null;
const stopTimer = () => { if (timer) { clearInterval(timer); timer = null; } };
function renderQuiz() {
  const q = S.list[S.i];
  const cps = SPEEDS.find(s => s[0] === pref.speed)[2];
  app.innerHTML = `
    <div class="bar"><button class="link" id="quit">✕ やめる</button><span class="small muted num">${S.i + 1} / ${S.list.length} ・ 正解 ${S.ok}</span></div>
    <div class="track"><i style="width:${S.i / S.list.length * 100}%"></i></div>
    <section class="board"><span class="tag">${esc(q.cat)}</span><p class="qtext" id="qtext"></p></section>
    <div id="act"></div>`;
  app.querySelector('#quit').onclick = () => go('home');
  const qt = app.querySelector('#qtext');
  const showText = () => { qt.innerHTML = esc(q.q.slice(0, S.shown)) + (S.shown < q.q.length && S.phase === 'reading' ? '<i class="cur">▍</i>' : ''); };
  const act = app.querySelector('#act');
  const answerUI = () => {
    stopTimer(); showText();
    if (S.phase === 'timeup') { reveal(false, true); return; }
    if (pref.mode === 'choice') {
      const others = shuffle(Q.filter(x => x.cat === q.cat && x.a !== q.a)).slice(0, 3).map(x => x.a);
      const opts = shuffle([q.a, ...others]);
      act.innerHTML = `<p class="small muted center">どれ?</p><div class="choices">${opts.map(o => `<button class="choice" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
      act.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
        const ok = b.dataset.o === q.a;
        act.querySelectorAll('[data-o]').forEach(x => { x.disabled = true; if (x.dataset.o === q.a) x.classList.add('ok'); else if (x === b) x.classList.add('ng'); });
        reveal(ok, false, true);
      });
    } else {
      act.innerHTML = `<p class="center">答えを声に出して言ってから…</p><button class="primary big" id="see">答えを見る</button>`;
      act.querySelector('#see').onclick = () => reveal(null);
    }
  };
  const reveal = (ok, timeup, keepChoices) => {
    S.shown = q.q.length; S.phase = 'answer'; showText();
    const box = `<div class="ans"><p class="small muted">${timeup ? '時間切れ! 答えは' : '答え'}</p><p class="a">${esc(q.a)}</p><p class="small">${esc(q.exp)}</p></div>`;
    const next = `<button class="primary big" id="next">${S.i === S.list.length - 1 ? '結果を見る' : '次の問題'}</button>`;
    if (ok === null) {
      act.innerHTML = box + `<div class="judge"><button class="okb" id="jok">○ 正解</button><button class="ngb" id="jng">× ちがった</button></div>`;
      act.querySelector('#jok').onclick = () => finishQ(true);
      act.querySelector('#jng').onclick = () => finishQ(false);
    } else {
      if (!timeup) SE.play(ok ? 'ok' : 'ng');
      act.innerHTML = (keepChoices ? act.innerHTML : '') + box + next;
      record(ok);
      act.querySelector('#next').onclick = nextQ;
    }
  };
  const finishQ = ok => { SE.play(ok ? 'ok' : 'ng'); record(ok); nextQ(); };
  const record = ok => {
    if (ok) S.ok++;
    const r = store.get('rec', { n: 0, ok: 0, posSum: 0, pushed: 0 });
    r.n++; if (ok) r.ok++;
    if (S.pushPos != null) { r.posSum += S.pushPos; r.pushed++; S.posSum += S.pushPos; S.pushed++; }
    store.set('rec', r);
  };
  const nextQ = () => { if (S.i === S.list.length - 1) { SE.play('end'); go('done', { ok: S.ok, total: S.list.length, posSum: S.posSum, pushed: S.pushed }); } else { S.i++; S.phase = 'reading'; S.shown = 0; S.pushPos = null; renderQuiz(); } };

  act.innerHTML = `<button class="push" id="push">押す!</button><p class="small muted center">スペースキーでも押せます</p>`;
  const push = () => {
    if (S.phase !== 'reading') return;
    SE.play('push'); S.phase = 'pushed'; S.pushPos = Math.round(S.shown / q.q.length * 100); answerUI();
  };
  act.querySelector('#push').onclick = push;
  document.onkeydown = e => { if (e.code === 'Space' && S.screen === 'quiz' && S.phase === 'reading') { e.preventDefault(); push(); } };
  showText();
  let wait = 0;
  timer = setInterval(() => {
    if (S.shown < q.q.length) { S.shown++; showText(); return; }
    if (++wait > cps * 3) { S.phase = 'timeup'; S.pushPos = null; answerUI(); } // 読み終わってから約3秒で時間切れ
  }, 1000 / cps);
}

// ---------- 結果
function renderDone() {
  const avg = S.pushed ? Math.round(S.posSum / S.pushed) : null;
  const rank = avg == null ? '' : avg <= 40 ? '超はやおし! 上級者の押し方です' : avg <= 60 ? 'いい押しどころ!' : avg <= 85 ? '問題文の後半で押せています' : '最後まで聞いてから押すタイプ。慣れたら少しずつ前で押してみよう';
  app.innerHTML = `
    <section class="board center"><p class="small muted">結果</p><p class="score num">${S.ok} / ${S.total}</p>
      ${avg != null ? `<p>押した位置の平均: <b class="num">${avg}%</b></p><p class="small">${rank}</p>` : ''}</section>
    <button class="primary big" id="again">もう1回</button>
    <button class="ghost" id="home">ホームへ</button>
    <a class="shop" href="${SHOP}" target="_blank" rel="noopener"><b>印刷できる問題集とCSVはこちら</b><span>BOOTH「けんていドリル」</span></a>`;
  app.querySelector('#again').onclick = startGame;
  app.querySelector('#home').onclick = () => go('home');
}

fetch('data/questions.json').then(r => r.json()).then(d => { Q = d; render(); })
  .catch(e => { app.innerHTML = `<p>データを読み込めませんでした。再読み込みしてください。(${esc(e.message)})</p>`; });

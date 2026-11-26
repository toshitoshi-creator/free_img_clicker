{
const $ = id => document.getElementById(id);
const fmt = n => Math.floor(n).toLocaleString('ja-JP');
// ステータスバー用の短い表記（1万以上は 万・億・兆・京・垓）
const short = n => { n = Math.floor(n); for (const [v, u] of [[1e20, '垓'], [1e16, '京'], [1e12, '兆'], [1e8, '億'], [1e4, '万']]) if (n >= v) { const x = n / v; return (x < 100 ? x.toFixed(x < 10 ? 2 : 1).replace(/\.?0+$/, '') : x < 1e4 ? fmt(x) : x.toExponential(1)) + u; } return fmt(n); };

// ---- 仮絵の自動生成（id から決まる見た目なので毎回同じ絵になる） ----
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = seed => () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) ^ Math.imul(seed ^ (seed >>> 13), 3266489909)) >>> 0) / 4294967296;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function placeholder(it) {
  const r = rng(hash(it.id)), hue = Math.floor(r() * 360);
  if (it.rank === 'N') { // 左右対称のドット絵
    let s = '';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) if (r() > 0.45) {
      const f = `hsl(${hue},65%,${40 + Math.floor(r() * 25)}%)`;
      s += `<rect x="${x + 1}" y="${y + 1}" width="1.02" height="1.02" fill="${f}"/><rect x="${8 - x}" y="${y + 1}" width="1.02" height="1.02" fill="${f}"/>`;
    }
    return `<svg viewBox="0 0 10 10" shape-rendering="crispEdges">${s}</svg>`;
  }
  const ch = esc([...it.name][0]);
  if (it.rank === 'R') return `<svg viewBox="0 0 100 100"><circle cx="50" cy="52" r="34" fill="hsl(${hue},70%,78%)" stroke="#333" stroke-width="3"/><text x="50" y="64" text-anchor="middle" font-size="34" font-weight="800" fill="#333">${ch}</text></svg>`;
  return `<svg viewBox="0 0 100 100"><defs><radialGradient id="p${it.id}" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="hsl(${hue},40%,85%)"/><stop offset="1" stop-color="hsl(${hue},45%,22%)"/></radialGradient></defs><rect width="100" height="100" fill="url(#p${it.id})"/><text x="50" y="62" text-anchor="middle" font-size="32" font-weight="800" fill="#fff" opacity=".85">${ch}</text></svg>`;
}
// 画像：1枚ずつのファイル（img）か、10×10 にまとめた画像（sp = [まとめ画像の番号, マス]）
const ATL = typeof ATLAS !== 'undefined' ? ATLAS : [];
// まとめ画像は CSS のクラス（.at番号）に1回だけ書く。カードごとに URL を書くと、埋め込み画像（data URI）が
// カードの数だけ複製されて図鑑が数百MBになり、スマホで落ちるため
const atlasStyle = document.createElement('style');
const writeAtlasCss = () => { atlasStyle.textContent = ATL.map((u, i) => `.at${i}{background-image:url("${u}")}`).join('\n'); };
writeAtlasCss(); document.head.appendChild(atlasStyle);
const artOf = it => it.sp && ATL[it.sp[0]] ? `<i class="sp at${it.sp[0]}${it.rank === 'N' ? ' px' : ''}" style="background-position:${(it.sp[1] % 10) * 100 / 9}% ${Math.floor(it.sp[1] / 10) * 100 / 9}%"></i>`
  : it.img ? `<img src="${esc(it.img)}" alt=""${it.rank === 'N' ? ' class="px"' : ''} loading="lazy" decoding="async">` : (it.art || placeholder(it));

// ---- 状態 ----
const freshAI = () => ({ taps: 0, points: 0, draws: 0, own: {}, start: 0, clearedAt: 0, earned: 0, earnedAuto: 0 });
const fresh = () => ({ taps: 0, points: 0, draws: 0, own: {}, start: 0, clearedAt: 0, earned: 0, earnedAuto: 0, ai: freshAI(), mode: 'main' });
let st = fresh();
try { const s = JSON.parse(localStorage.getItem(CONFIG.SAVE_KEY)); if (s && typeof s.points === 'number') st = Object.assign(st, s); } catch (e) {}
st.ai = Object.assign(freshAI(), st.ai);
const AI_LIST = typeof AI_ITEMS !== 'undefined' ? AI_ITEMS : [];
const save = () => { try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(st)); } catch (e) {} };

// ---- モード：表（素材ガチャ）と裏（AIクリッカー）。ガチャ・図鑑・自動クリックは同じしくみで動く ----
const RANKS = ['N', 'R', 'SR', 'SR+', 'UR', 'LR'];
const AI_RANKS_ = typeof AI_RANKS !== 'undefined' ? AI_RANKS : ['C', 'B', 'A', 'S', 'SS'];
const RLBL = { N: 'N ドット', R: 'R イラスト', SR: 'SR 写真', 'SR+': 'SR+ 人気・貴重', UR: 'UR 名所・名画', LR: 'LR 偉人', ...(typeof AI_RLBL !== 'undefined' ? AI_RLBL : {}) };
const AISET = new Set(AI_RANKS_);
const rcls = r => AISET.has(r) ? 'ai' + r : r.replace('+', 'P'); // CSS クラス名（SR+ → SRP、AI の S → aiS）
function mkMode(key, items, ranks, cfg, s, fxFrom) {
  const genres = [...new Set(items.map(i => i.cat))]; // items の並び順
  const cells = ranks.flatMap(r => genres.filter(g => items.some(i => i.rank === r && i.cat === g)).map(g => r + '・' + g)); // ランク×ジャンル（例：N・動物）
  const cellItems = Object.fromEntries(cells.map(k => { const [r, g] = k.split('・'); return [k, items.filter(i => i.rank === r && i.cat === g)]; }));
  const byRank = Object.fromEntries(ranks.map(r => [r, items.filter(i => i.rank === r)]));
  const order = Object.fromEntries(ranks.map((r, i) => [r, i + 1]));
  return { key, items, ranks, cfg, s, genres, cells, cellItems, byRank, order, fxFrom, cnt: null, mc: null, dirtyZ: true, filter: key === 'ai' ? ranks[0] : 'ALL', gfilter: 'ALL' };
}
const MAIN = mkMode('main', ITEMS, RANKS, CONFIG, () => st, 3);
const AIM = mkMode('ai', AI_LIST, AI_RANKS_, CONFIG.AI, () => st.ai, 4);
let M = st.mode === 'ai' && AI_LIST.length ? AIM : MAIN;
const S = () => M.s();
if (st.clearedAt && st.clearedN !== ITEMS.length) { st.prevClear = { at: st.clearedAt - st.start, n: st.clearedN || 45 }; st.clearedAt = 0; } // 素材が増えたらコンプ記録は取り直し
if (st.ai.clearedAt && st.ai.clearedN !== AI_LIST.length) st.ai.clearedAt = 0;

// 種類数はキャッシュ（素材が多いので毎タップ数え直さない）。新しいカードが出たときだけ数え直す
const counts = (m = M) => m.cnt || (m.cnt = (() => {
  const own = m.s().own, c = { all: 0, rank: {}, cell: {}, un: {} };
  for (const r of m.ranks) { c.un[r] = m.byRank[r].filter(i => !own[i.id]); c.rank[r] = m.byRank[r].length - c.un[r].length; }
  for (const k of m.cells) c.cell[k] = m.cellItems[k].filter(i => own[i.id]).length;
  c.all = Object.values(c.rank).reduce((a, b) => a + b, 0);
  return c;
})());
const dirty = (m = M) => { m.cnt = null; m.mc = null; m.dirtyZ = true; };
const uniq = (rank, m = M) => rank ? counts(m).rank[rank] : counts(m).all;
const total = (rank, m = M) => m.byRank[rank].length;
const isComp = (rank, m = M) => uniq(rank, m) === total(rank, m);
const isCellComp = (k, m = M) => counts(m).cell[k] === m.cellItems[k].length;
const lrOpen = () => isComp('UR', MAIN); // LR（偉人）は UR を全種そろえると出るようになる
const aiOpen = () => AI_LIST.length > 0 && lrOpen(); // AIクリッカーは LR の解放と同時に解放
const compBonus = (m = M) => m.ranks.reduce((x, k) => x * (isComp(k, m) ? m.cfg.COMP_BONUS[k] : 1), 1) * m.cfg.GENRE_BONUS ** m.cells.filter(k => isCellComp(k, m)).length;
const mult = (m = M) => m.mc ?? (m.mc = Math.floor(m.ranks.reduce((x, k) => x * (1 + uniq(k, m) * m.cfg.MULT[k]), 1) * compBonus(m)));
const cost = (m = M) => { const c = m.cfg, d = m.s().draws; return Math.floor(c.CAPSULE_BASE * (d + 1) ** c.CAPSULE_POW * (c.CAPSULE_GROW || 1) ** d); };
const autoOn = () => uniq() >= M.cfg.AUTO_UNLOCK;
const autoMs = () => Math.max(M.cfg.AUTO_MIN_MS, Math.round(M.cfg.AUTO_BASE_MS * M.cfg.AUTO_SHRINK ** (uniq() - M.cfg.AUTO_UNLOCK)));

function drawOne() {
  const r = Math.random() * 100, R = M.cfg.RATE;
  let acc = 0, rank = M.ranks[0];
  for (const k of [...M.ranks].reverse()) { if (k === 'LR' && !lrOpen()) continue; acc += R[k] || 0; if (r < acc) { rank = k; break; } } // レアなランクから順に判定（残りは一番下のランク）
  const pool = M.byRank[rank], own = S().own;
  const it = pool[Math.floor(Math.random() * pool.length)];
  if (M.cfg.NEW_BIAS && own[it.id] && Math.random() < M.cfg.NEW_BIAS) { // ダブりはときどき、まだ持っていないカードに引き直す
    const un = counts().un[rank]; if (un.length) return un[Math.floor(Math.random() * un.length)];
  }
  return it;
}

// ---- 1タップ分（手動・自動共通） ----
function tap(isAuto) {
  if (fxPaused) return; // レア演出中はタップも自動クリックも止める
  if (isAuto && (view !== 'gacha' || document.hidden)) return; // ガチャ画面以外・画面が見えていないときは自動タップしない
  const s = S();
  if (!isAuto) s.taps++;
  if (!s.start) s.start = Date.now();
  const gain = mult();
  s.points += gain; s.earned += gain; if (isAuto) s.earnedAuto += gain;
  const got = [], before = M.ranks.filter(k => isComp(k)), beforeCells = new Set(M.cells.filter(k => isCellComp(k)));
  while (s.points >= cost() && got.length < M.cfg.MAX_DRAWS_PER_TICK) {
    s.points -= cost(); s.draws++;
    const it = drawOne(), isNew = !s.own[it.id];
    s.own[it.id] = (s.own[it.id] || 0) + 1;
    if (isNew) dirty();
    got.push({ it, isNew });
    if (isNew) ensureAuto(); // 種類が増えたら自動クリックの間隔を更新
  }
  const comps = got.length ? M.ranks.filter(k => isComp(k) && !before.includes(k)) : [];
  const cellComps = got.some(g => g.isNew) ? M.cells.filter(k => isCellComp(k) && !beforeCells.has(k)) : [];
  if (comps.length && uniq() === M.items.length && !s.clearedAt) { s.clearedAt = Date.now(); s.clearedN = M.items.length; }
  if (got.length) showResult(got, comps, cellComps);
  if (got.some(g => g.isNew) && view !== 'zukan') $('newdot').hidden = false;
  save(); render();
}

// ---- 自動クリック（いま開いているモードだけ） ----
let timer = null, timerMs = 0;
function ensureAuto() {
  if (!autoOn()) { clearInterval(timer); timer = null; timerMs = 0; return; }
  const ms = autoMs();
  if (timer && ms === timerMs) return;
  clearInterval(timer); timerMs = ms;
  timer = setInterval(() => tap(true), ms);
}

// ---- 表示 ----
function card(it, o = {}) {
  const n = M.s().own[it.id] || 0, lock = o.grid && !n && !o.mine, ai = AISET.has(it.rank);
  const tag = o.grid && !lock ? `button type="button" data-id="${it.id}" aria-label="${esc(it.name)}の詳細"` : 'div';
  const ad = it.atk == null ? '' : `<div class="ad"><span class="atk">攻${lock ? '?' : it.atk}</span><span class="def">防${lock ? '?' : it.def}</span></div>`;
  const art = lock && ai ? '' : artOf(it); // AI 図鑑は種類が多いので、持っていないカードの絵は読み込まない
  return `<${tag} class="card ${rcls(it.rank)}${lock ? ' locked' : ''}${o.pop ? ' pop' : ''}"><span class="rk">${it.rank}</span>${o.isNew ? '<span class="new">NEW</span>' : ''}<div class="art">${art}</div><div class="nm">${lock ? '？？？' : esc(it.name)}</div>${ad}<div class="cnt">${o.grid && n ? '×' + n : esc(it.cat)}</div></${tag.split(' ')[0]}>`;
}
const dur = ms => { const t = Math.round(ms / 1000), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, sec = t % 60; return (h ? h + '時間' : '') + (h || m ? m + '分' : '') + sec + '秒'; };
const EMPTY = () => M === AIM ? '<p class="empty">ここは裏のAIクリッカー<br>タップでAI画像のカプセルを集めよう</p>' : '<p class="empty">タップでポイントを貯めると<br>カプセルが出てくるよ</p>';
function showResult(got, comps = [], cellComps = []) {
  // 新規 > ランク高い順で一番いいものを大きく表示
  const order = M.order;
  const best = got.slice().sort((a, b) => (b.isNew - a.isNew) || (order[b.it.rank] - order[a.it.rank]))[0];
  const newCount = got.filter(g => g.isNew).length;
  const msg = got.length > 1 ? `${got.length}個ゲット！${newCount ? `（新規 ${newCount}）` : ''}` : best.isNew ? (M === AIM ? '新しいAI画像をゲット！' : '新しい素材をゲット！') : `ダブり… ×${S().own[best.it.id]}`;
  const lrNew = M === MAIN && comps.includes('UR') ? `<p class="comp all lrnew">✨ LR（偉人）が解放されました！ ガチャから出るようになります</p>${AI_LIST.length ? '<p class="comp all ainew">🤖 裏の「AIクリッカー」も解放！ ガチャ画面のボタンから行けます</p>' : ''}` : '';
  let extra = cellComps.map(k => `<p class="comp">${esc(k)} コンプ！ 倍率 ×${M.cfg.GENRE_BONUS}</p>`).join('') + comps.map(k => `<p class="comp">${RLBL[k]} コンプリート！ 倍率 ×${M.cfg.COMP_BONUS[k]}</p>`).join('');
  const s = S();
  if (comps.length && s.clearedAt) extra = `<p class="comp all">🎉 全${M.items.length}種コンプリート！</p><p class="empty">${dur(s.clearedAt - s.start)}・${fmt(s.taps)}タップ・${fmt(s.draws)}回</p>`;
  const shine = order[best.it.rank] >= M.fxFrom ? ` shine shine-${rcls(best.it.rank)}` : '';
  $('stage').innerHTML = card(best.it, { pop: true, isNew: best.isNew }).replace('class="card ', `class="card${shine} `) + `<p class="empty">${msg}</p>` + lrNew + extra;
  if (lrNew) renderMode();
  // レアなカードを新しく引いたときは全画面の演出（ダブりで毎回止まらないように新規だけ）
  const rare = got.filter(g => order[g.it.rank] >= M.fxFrom && g.isNew && FX[g.it.rank]).sort((a, b) => order[b.it.rank] - order[a.it.rank])[0];
  if (rare) rareFx(rare);
}

// ---- レア演出：カードが回転しながら出てきて、光の筋とキラキラが舞う ----
let fxRank = 0, fxTimer = null, fxPaused = false, fxDone = false;
const FX = { SR: { label: 'SR', sparks: 26, time: 2600 }, 'SR+': { label: 'SR+', sparks: 40, time: 3000 }, UR: { label: 'UR', sparks: 64, time: 3800 }, LR: { label: 'LR', sparks: 90, time: 4600 },
  S: { label: 'S', sparks: 56, time: 3400 }, SS: { label: 'SS', sparks: 90, time: 4400 } };
function rareFx(g) {
  const o = $('rare'), r = M.order[g.it.rank];
  if (!o.hidden && r <= fxRank) return; // 表示中はもっと上のランクだけ差し替える
  fxRank = r;
  const cfg = FX[g.it.rank];
  o.className = `rare rare-${rcls(g.it.rank)}`;
  $('rfront').innerHTML = card(g.it, { isNew: g.isNew });
  $('rlabel').innerHTML = `<b>${cfg.label}</b>${g.isNew ? '<span>NEW!</span>' : ''}`;
  $('rname').textContent = g.it.name;
  // キラキラの粒：中心から四方へ飛び散って瞬く
  $('rsparks').innerHTML = Array.from({ length: cfg.sparks }, (_, i) => {
    const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 170, s = 6 + Math.random() * 14;
    return `<i style="--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--s:${s}px;--t:${(0.9 + Math.random() * 1.2).toFixed(2)}s;--d:${(0.35 + Math.random() * 0.9).toFixed(2)}s"></i>`;
  }).join('');
  o.hidden = false;
  void o.offsetWidth; o.classList.add('go'); // アニメーションを最初から
  try { navigator.vibrate && navigator.vibrate(['LR', 'SS'].includes(g.it.rank) ? [80, 50, 80, 50, 80, 50, 240] : ['UR', 'S'].includes(g.it.rank) ? [60, 40, 60, 40, 160] : [50, 30, 90]); } catch (e) {}
  // 演出が終わるまではタップできない。終わったら「タップで再開」を出す
  fxPaused = true; fxDone = false; o.classList.remove('done'); o.style.setProperty('--done', cfg.time + 'ms');
  clearTimeout(fxTimer); fxTimer = setTimeout(() => { fxDone = true; o.classList.add('done'); }, cfg.time);
}
function closeFx() { clearTimeout(fxTimer); $('rare').hidden = true; fxRank = 0; fxPaused = false; fxDone = false; }
$('rare').addEventListener('pointerdown', e => { e.preventDefault(); if (fxDone) closeFx(); });
$('rare').addEventListener('contextmenu', e => e.preventDefault());
const recordHTML = (s, c) => `<dt>合計ポイント</dt><dd>${fmt(s.earned)} pt</dd><dt>　うちタップ</dt><dd>${fmt(s.earned - s.earnedAuto)} pt</dd><dt>　うち自動</dt><dd>${fmt(s.earnedAuto)} pt</dd><dt>タップ数</dt><dd>${fmt(s.taps)}</dd><dt>ガチャ回数</dt><dd>${fmt(s.draws)}</dd><dt>次の1個</dt><dd>${fmt(c)} pt</dd><dt>プレイ開始</dt><dd>${s.start ? new Date(s.start).toLocaleString('ja-JP') : '—'}</dd>`;
function render() {
  const s = S();
  $('pts').textContent = short(s.points);
  $('mult').textContent = '×' + short(mult());
  $('done').textContent = fmt(uniq());
  $('stat-done').textContent = `${M === AIM ? 'AI図鑑' : '図鑑'} /${fmt(M.items.length)}`;
  const c = cost();
  $('bar').style.width = Math.min(100, s.points / c * 100) + '%';
  $('hint').textContent = `次のカプセルまで ${short(Math.max(0, c - s.points))} pt（1個 ${short(c)} pt）`;
  $('auto').textContent = autoOn() ? `自動 ${(autoMs() / 1000).toFixed(2)}秒ごと` : `自動クリック：あと${M.cfg.AUTO_UNLOCK - uniq()}種で解放`;
  $('auto').classList.toggle('on', autoOn());
  const cb = compBonus();
  $('bonus').textContent = cb > 1 ? `ボーナス ×${cb < 1000 ? +cb.toFixed(2) : short(cb)}` : '';
  $('bonus').hidden = cb === 1;
  $('earned').textContent = short(s.earned);
  if (view === 'menu') renderMenu();
  if (view === 'zukan' && M.dirtyZ) renderZukan();
}
function renderMenu() {
  $('clear').hidden = !st.clearedAt;
  if (st.clearedAt) $('clear').textContent = `🎉 全種コンプ記録：${dur(st.clearedAt - st.start)}（${fmt(st.taps)}タップ・${fmt(st.draws)}回）`;
  $('record').innerHTML = (st.bstats ? `<dt>対戦成績</dt><dd>${st.bstats.win}勝 ${st.bstats.lose}敗</dd>` : '') + recordHTML(st, cost(MAIN));
  const a = st.ai, open = aiOpen();
  $('aiRec').hidden = !open; $('aiRecH').hidden = !open; $('aiRules').hidden = !open;
  if (open && !$('aiRuleList').childElementCount) { const A = CONFIG.AI; $('aiRuleList').innerHTML = [
    'UR を全種そろえると、LR（偉人）と同時に解放される裏のクリッカーです。ガチャ画面の上のボタンで表と裏を切り替えます',
    `AI で作られた画像（パブリックドメインQ のフリーAI画像）${fmt(AI_LIST.length)}種を集めます。ポイント・図鑑・自動クリックは表とは別`,
    '出現率：' + AI_RANKS_.map(k => `${esc(RLBL[k])} ${A.RATE[k]}%`).join(' ／ '),
    `倍率：${AI_RANKS_.map(k => `${k} 1種ごと+${A.MULT[k]}`).join('、')} の掛け算。ランクをコンプすると ${AI_RANKS_.map(k => `${k} ×${A.COMP_BONUS[k]}`).join('・')}、ランク×ジャンルをコンプするたびに ×${A.GENRE_BONUS}`,
    `ダブったときは ${Math.round(A.NEW_BIAS * 100)}% の確率で、まだ持っていないカードに変わります`,
    `${A.AUTO_UNLOCK}種そろうと自動クリックが解放されます（裏の画面を開いているときだけ動きます）`,
    'S・SS を新しく引くと特別な演出が出ます',
  ].map(t => `<li>${t}</li>`).join(''); }
  if (open) $('aiRec').innerHTML = `<dt>AI画像</dt><dd>${esc(atlasState)}</dd><dt>図鑑</dt><dd>${uniq(null, AIM)}/${AI_LIST.length}</dd>${a.clearedAt ? `<dt>全種コンプ</dt><dd>${dur(a.clearedAt - a.start)}</dd>` : ''}` + recordHTML(a, cost(AIM));
}
// 表（素材ガチャ）と裏（AIクリッカー）の切り替えボタンと見た目
function renderMode() {
  const open = aiOpen();
  if (!open && M === AIM) M = MAIN;
  document.querySelector('.app').classList.toggle('aimode', M === AIM);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', M === AIM ? '#3b1d8f' : '#e8433a');
  $('modeBtn').hidden = !open; $('zmode').hidden = !open;
  $('modeBtn').textContent = M === AIM ? '◀ 表の素材ガチャへ' : '🤖 裏：AIクリッカーへ';
  $('zmode').innerHTML = [['main', '素材図鑑'], ['ai', 'AI図鑑']].map(([k, l]) => `<button type="button" data-m="${k}" aria-pressed="${M.key === k}">${l}</button>`).join('');
}
function setMode(key) {
  const next = key === 'ai' && aiOpen() ? AIM : MAIN;
  if (next === M) return;
  M = next; st.mode = M.key; save();
  clearInterval(timer); timer = null; timerMs = 0; ensureAuto();
  $('stage').innerHTML = EMPTY();
  M.dirtyZ = true; renderMode(); render();
  if (view === 'zukan') { renderZukan(); $('v-zukan').scrollTop = 0; }
}
$('modeBtn').addEventListener('click', () => setMode(M === AIM ? 'main' : 'ai'));
$('zmode').addEventListener('click', e => { const b = e.target.closest('button[data-m]'); if (b) setMode(b.dataset.m); });

// ---- 図鑑：ランクタブ × ジャンルチップ、ランク×ジャンルごとに区切って表示 ----
const chip = (attr, k, label, list, on) => { const own = S().own, have = list.filter(i => own[i.id]).length; return `<button type="button" ${attr}="${esc(k)}" aria-pressed="${on}">${list.length && have === list.length ? '★ ' : ''}${esc(label)} ${have}/${list.length}</button>`; };
function renderZukan() {
  M.dirtyZ = false;
  if (M.gfilter !== 'ALL' && !M.genres.includes(M.gfilter)) M.gfilter = 'ALL';
  const f = M.filter, g0 = M.gfilter, own = S().own;
  const inG = i => g0 === 'ALL' || i.cat === g0, inR = i => f === 'ALL' || i.rank === f;
  // AI 図鑑は種類が多いので「すべて」は出さず、ランクごとに表示する
  $('tabs').innerHTML = [...(M === AIM ? [] : ['ALL']), ...M.ranks].map(k => chip('data-k', k, k === 'ALL' ? 'すべて' : RLBL[k], M.items.filter(i => (k === 'ALL' || i.rank === k) && inG(i)), f === k)).join('');
  // 選んだランクに素材がないジャンルは出さない
  $('genres').innerHTML = ['ALL', ...M.genres].map(g => [g, M.items.filter(i => (g === 'ALL' || i.cat === g) && inR(i))]).filter(([g, l]) => g === 'ALL' || l.length || g0 === g)
    .map(([g, l]) => chip('data-g', g, g === 'ALL' ? '全ジャンル' : g, l, g0 === g)).join('');
  $('grid').innerHTML = M.cells.filter(k => M.cellItems[k].some(i => inR(i) && inG(i))).map(k => {
    const list = M.cellItems[k], have = list.filter(i => own[i.id]).length, done = have === list.length;
    const lock = M === MAIN && k.startsWith('LR') && !lrOpen() ? '<em class="lrlock">UR を全種そろえると出るようになります</em>' : '';
    return `<h3 class="sec${done ? ' done' : ''}">${done ? '★ ' : ''}${esc(k)}${lock}<span>${have}/${list.length}</span></h3><div class="grid">${list.map(i => card(i, { grid: true })).join('')}</div>`;
  }).join('');
}

// ---- タップボタン：指を置いた瞬間に反応（連打・複数指OK） ----
const btn = $('btn'), fx = $('fx');
function floatText(x, y) {
  const el = document.createElement('span');
  el.className = 'plus'; el.textContent = '+' + short(mult());
  const r = fx.getBoundingClientRect();
  el.style.left = (x - r.left + (Math.random() * 30 - 15)) + 'px'; el.style.top = (y - r.top - 20) + 'px';
  fx.appendChild(el); setTimeout(() => el.remove(), 700);
  while (fx.childElementCount > 12) fx.firstChild.remove();
}
btn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (fxPaused) return;
  floatText(e.clientX, e.clientY); tap(false);
  btn.classList.add('press');
  // タップした感触：短く振動（対応している端末だけ。メニューでオフにできる）
  if (st.vib !== false) try { navigator.vibrate && navigator.vibrate(12); } catch (err) {}
});
const vibLabel = () => `タップの振動：${st.vib !== false ? 'オン' : 'オフ'}`;
$('vib').textContent = vibLabel();
$('vib').addEventListener('click', () => { st.vib = st.vib === false; save(); $('vib').textContent = vibLabel(); if (st.vib) try { navigator.vibrate && navigator.vibrate(30); } catch (err) {} });
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => btn.addEventListener(t, () => btn.classList.remove('press')));
btn.addEventListener('contextmenu', e => e.preventDefault());

// ---- 画面切り替え（下のタブバー） ----
let view = 'gacha';
document.querySelector('.tabbar').addEventListener('click', e => {
  const b = e.target.closest('button[data-v]'); if (!b) return;
  view = b.dataset.v;
  document.querySelectorAll('.tabbar button').forEach(x => x === b ? x.setAttribute('aria-current', 'page') : x.removeAttribute('aria-current'));
  document.querySelectorAll('.view').forEach(v => { const on = v.id === 'v-' + view; v.hidden = !on; v.classList.toggle('active', on); });
  if (view === 'zukan') { $('newdot').hidden = true; if (M.dirtyZ) renderZukan(); }
  if (view === 'menu') renderMenu();
  document.dispatchEvent(new CustomEvent('sg:view', { detail: view })); // デッキ・対戦画面に通知
});
$('tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { M.filter = b.dataset.k; renderZukan(); $('v-zukan').scrollTop = 0; } });
$('genres').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { M.gfilter = b.dataset.g; renderZukan(); $('v-zukan').scrollTop = 0; } });
// ---- 詳細・クレジット ----
const credit = it => it.credit ? `${it.credit.artist ? '作：' + esc(it.credit.artist) + '<br>' : ''}${esc(it.credit.author)}／${esc(it.credit.license)}${it.credit.note ? '（' + esc(it.credit.note) + '）' : ''} <a href="${esc(it.credit.url)}" target="_blank" rel="noopener">配布元</a>` : 'オリジナル';
const dlg = $('dlg');
function openDlg(html) { $('dlgBody').innerHTML = html; dlg.showModal(); }
function openDetail(id) {
  const it = M.items.find(i => i.id === id); if (!it) return;
  openDlg(card(it) + `<dl class="info"><dt>ランク</dt><dd>${RLBL[it.rank]}</dd><dt>ジャンル</dt><dd>${esc(it.cat)}</dd>${it.atk == null ? '' : `<dt>攻撃</dt><dd>${it.atk}</dd><dt>防御</dt><dd>${it.def}（合計 ${it.atk + it.def}）</dd>`}<dt>所持数</dt><dd>${fmt(S().own[it.id] || 0)}</dd><dt>素材</dt><dd>${credit(it)}</dd></dl>`);
}
$('grid').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b) openDetail(b.dataset.id); });
$('credits').addEventListener('click', () => {
  // 配布元（URL＋ライセンス）ごとにまとめる。スミソニアンは撮影者・所蔵館が複数
  const src = {};
  const isSI = c => /si\.edu|cooperhewitt/.test(c.url) || /Smithsonian/.test(c.author), isOI = c => c.src === 'oi', isGLD = c => c.src === 'gld';
  const ALL = [...ITEMS, ...(aiOpen() ? AI_LIST : [])];
  ALL.forEach(i => { const c = i.credit;
    if (isOI(c)) { // Open Images は写真ごとに撮影者と元ページを表示（CC BY 2.0 の表記）
      (src.oi = src.oi || { c: { author: 'Open Images Dataset（Flickr の各撮影者）', license: 'CC BY 2.0', url: 'https://creativecommons.org/licenses/by/2.0/', note: '正方形に切り抜き・縮小' }, list: [], authors: new Set(), each: [] }).list.push(i.name);
      src.oi.each.push(`${esc(i.name)}：<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.author.replace('（Flickr）', ''))}</a>`); return; }
    if (isGLD(c)) { // 有名な建物は Wikimedia Commons の撮影者ごとに表示
      (src.gld = src.gld || { c: { author: 'Google Landmarks Dataset v2（Wikimedia Commons の各撮影者）', license: 'CC BY / CC0 など（写真ごと）', url: 'https://github.com/cvdfoundation/google-landmark', note: '正方形に切り抜き・縮小' }, list: [], authors: new Set(), each: [] }).list.push(i.name);
      src.gld.each.push(`${esc(i.name)}：<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.author.replace('（Wikimedia Commons）', ''))}</a>（${esc(c.license)}）`); return; }
    if (c.src === 'pdq' || c.src === 'pdqai') { // パブリックドメインQ：作品ごとの元ページへのリンク（数が多いので開いたときに作る）
      const k = c.src, ai = k === 'pdqai';
      (src[k] = src[k] || { c: { author: ai ? 'パブリックドメインQ（AI画像）' : 'パブリックドメインQ', license: ai ? 'CC0・パブリックドメイン' : 'パブリックドメイン', url: 'https://publicdomainq.net/', note: ai ? 'AIで作られた画像。正方形に切り抜き・縮小' : '正方形に加工・縮小（N はドット化）' }, list: [], authors: new Set(), lazy: [], eachLabel: '作品ごとの元ページ' }).list.push(i.name);
      src[k].lazy.push(i); return; }
    const k = isSI(c) ? 'si' : c.url + c.license; (src[k] = src[k] || { c: isSI(c) ? { author: 'Smithsonian Open Access', license: 'CC0', url: 'https://www.si.edu/openaccess', note: '正方形に加工・縮小' } : c, list: [], authors: new Set() }).list.push(i.name); src[k].authors.add(c.author.replace('（Smithsonian Open Access）', '')); });
  const groups = Object.values(src);
  openDlg(`<h3>クレジット</h3><p class="small">このゲームの${ALL.length}種の絵と写真は、すべて実在のフリー素材です。</p><ul class="cr">${groups.map((g, gi) => `<li><b>${esc(g.c.author)}</b><br>${esc(g.c.license)}${g.c.note ? '・' + esc(g.c.note) : ''}・<a href="${esc(g.c.url)}" target="_blank" rel="noopener">配布元</a>${g.each || g.lazy ? `<details data-g="${gi}"><summary class="small">${g.eachLabel || '写真ごとの撮影者'}（${(g.each || g.lazy).length}件）</summary><span class="small">${g.each ? g.each.join('<br>') : ''}</span></details>` : g.authors.size > 1 ? `<details><summary class="small">撮影・所蔵（${g.authors.size}件）</summary><span class="small">${[...g.authors].map(esc).join('<br>')}</span></details>` : ''}<details data-l="${gi}"><summary class="small">使っている素材（${g.list.length}種）</summary><span class="small"></span></details></li>`).join('')}</ul>`
    + `<p class="small">MIT ライセンスの素材の著作権表示と許諾文は LICENSES.md に収録しています。フォント：M PLUS Rounded 1c（SIL Open Font License）</p>`);
  // 一覧は開いたときに作る（数千件あるので）
  $('dlgBody').querySelectorAll('details').forEach(d => d.addEventListener('toggle', () => {
    const sp = d.querySelector('span'); if (!d.open || sp.dataset.done) return; sp.dataset.done = 1;
    if (d.dataset.l) sp.textContent = groups[d.dataset.l].list.join('、');
    else if (d.dataset.g && groups[d.dataset.g].lazy) sp.innerHTML = groups[d.dataset.g].lazy.map(i => `${esc(i.name)}${i.credit.artist ? '（' + esc(i.credit.artist) + '）' : ''}：<a href="${esc(i.credit.url)}" target="_blank" rel="noopener">元ページ</a>`).join('<br>');
  }));
});

$('dlgClose').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

let armed = false;
$('reset').addEventListener('click', () => {
  if (!armed) { armed = true; $('reset').textContent = 'もう一度押すとリセット'; setTimeout(() => { armed = false; $('reset').textContent = 'データをリセット'; }, 3000); return; }
  clearInterval(timer); timer = null; timerMs = 0;
  const vib = st.vib; st = fresh(); st.vib = vib; save(); armed = false; M = MAIN; dirty(MAIN); dirty(AIM);
  $('reset').textContent = 'データをリセット';
  $('stage').innerHTML = EMPTY();
  renderMode(); render(); renderMenu();
});
$('stage').innerHTML = EMPTY();
renderMode(); ensureAuto(); render();

// ---- まとめ画像の読み込み（公開ページ用） ----
// アセットの URL は表示環境によって違うことがあるので、assets.list() が返す「その画面で使える URL」に差し替える。
// それでも読めないときは fetch して blob: URL にする。結果はメニューの記録に出す（原因を調べるため）
let atlasState = '確認中';
async function fixAtlas() {
  const remote = ATL.map((u, i) => [u, i]).filter(([u]) => /\/_blob\//.test(u));
  if (!remote.length) { atlasState = 'ページに埋め込み'; return; }
  try {
    const a = window.claude && window.claude.use ? await window.claude.use('assets') : null;
    if (a) {
      const { assets } = await a.list(), byId = Object.fromEntries(assets.map(x => [x.id, x.url]));
      for (const [u, i] of remote) { const m = /_blob\/([0-9a-f]{32})/.exec(u); if (m && byId[m[1]]) ATL[i] = byId[m[1]]; }
    }
  } catch (e) {}
  const ok = u => new Promise(r => { const im = new Image(); im.onload = () => r(true); im.onerror = () => r(false); im.src = u; setTimeout(() => r(false), 15000); });
  const first = remote[0][1];
  if (await ok(ATL[first])) atlasState = 'OK（' + ATL[first].slice(0, 40) + '）';
  else {
    try { // 画像として読めなくても、fetch なら読めることがある
      await Promise.all(remote.map(async ([, i]) => { const r = await fetch(ATL[i]); if (!r.ok) throw new Error(r.status); ATL[i] = URL.createObjectURL(await r.blob()); }));
      atlasState = 'OK（fetch）';
    } catch (e) { atlasState = '読み込めません（' + String(e.message || e).slice(0, 40) + '／' + ATL[first].slice(0, 40) + '）'; }
  }
  writeAtlasCss();
  MAIN.dirtyZ = AIM.dirtyZ = true;
  if (view === 'zukan') renderZukan();
  if (view === 'menu') renderMenu();
}
fixAtlas();
// デッキ・対戦（battle.js）から使うもの
window.SG = { get st() { return st; }, save, esc, fmt, artOf, openDlg, closeDlg: () => dlg.close(), RANKS, RLBL, rcls, dur };
}

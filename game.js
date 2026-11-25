{
const $ = id => document.getElementById(id);
const fmt = n => Math.floor(n).toLocaleString('ja-JP');

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
const artOf = it => it.img ? `<img src="${esc(it.img)}" alt="" style="width:100%;height:100%;object-fit:cover">` : (it.art || placeholder(it));

// ---- 状態 ----
let st = { taps: 0, points: 0, draws: 0, own: {} };
try { const s = JSON.parse(localStorage.getItem(CONFIG.SAVE_KEY)); if (s && typeof s.points === 'number') st = Object.assign(st, s); } catch (e) {}
const save = () => { try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(st)); } catch (e) {} };

const uniq = rank => ITEMS.filter(i => (!rank || i.rank === rank) && st.own[i.id]).length;
const mult = () => Math.floor((1 + uniq('N') * CONFIG.MULT.N) * (1 + uniq('R') * CONFIG.MULT.R) * (1 + uniq('SR') * CONFIG.MULT.SR));
const cost = () => Math.floor(CONFIG.CAPSULE_BASE * (st.draws + 1) ** CONFIG.CAPSULE_POW);
const autoOn = () => uniq() >= CONFIG.AUTO_UNLOCK;
const autoMs = () => Math.max(CONFIG.AUTO_MIN_MS, Math.round(CONFIG.AUTO_BASE_MS * CONFIG.AUTO_SHRINK ** (uniq() - CONFIG.AUTO_UNLOCK)));

function drawOne() {
  const r = Math.random() * 100, R = CONFIG.RATE;
  const rank = r < R.SR ? 'SR' : r < R.SR + R.R ? 'R' : 'N';
  const pool = ITEMS.filter(i => i.rank === rank);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---- 1タップ分（手動・自動共通） ----
function tap(isAuto) {
  if (!isAuto) st.taps++;
  st.points += mult();
  const got = [];
  while (st.points >= cost() && got.length < CONFIG.MAX_DRAWS_PER_TICK) {
    st.points -= cost(); st.draws++;
    const it = drawOne(), isNew = !st.own[it.id];
    st.own[it.id] = (st.own[it.id] || 0) + 1;
    got.push({ it, isNew });
    if (isNew) ensureAuto(); // 種類が増えたら自動クリックの間隔を更新
  }
  if (got.length) showResult(got);
  save(); render();
}

// ---- 自動クリック ----
let timer = null, timerMs = 0;
function ensureAuto() {
  if (!autoOn()) return;
  const ms = autoMs();
  if (timer && ms === timerMs) return;
  clearInterval(timer); timerMs = ms;
  timer = setInterval(() => tap(true), ms);
}

// ---- 表示 ----
let filter = 'ALL';
function card(it, o = {}) {
  const n = st.own[it.id] || 0, lock = o.grid && !n;
  return `<div class="card ${it.rank}${lock ? ' locked' : ''}${o.pop ? ' pop' : ''}"><span class="rk">${it.rank}</span>${o.isNew ? '<span class="new">NEW</span>' : ''}<div class="art">${artOf(it)}</div><div class="nm">${lock ? '？？？' : esc(it.name)}</div><div class="cnt">${o.grid && !lock ? '×' + n : esc(it.cat)}</div></div>`;
}
function showResult(got) {
  // 新規 > ランク高い順で一番いいものを大きく表示
  const order = { SR: 3, R: 2, N: 1 };
  const best = got.slice().sort((a, b) => (b.isNew - a.isNew) || (order[b.it.rank] - order[a.it.rank]))[0];
  const newCount = got.filter(g => g.isNew).length;
  const msg = got.length > 1 ? `${got.length}個ゲット！${newCount ? `（新規 ${newCount}）` : ''}` : best.isNew ? '新しい素材をゲット！' : `ダブり… ×${st.own[best.it.id]}`;
  $('stage').innerHTML = card(best.it, { pop: true, isNew: best.isNew }) + `<p class="empty">${msg}</p>`;
}
function render() {
  $('pts').textContent = fmt(st.points);
  $('mult').textContent = '×' + fmt(mult());
  $('done').textContent = `${uniq()}/${ITEMS.length}`;
  const c = cost();
  $('bar').style.width = Math.min(100, st.points / c * 100) + '%';
  $('hint').textContent = `次のカプセルまで ${fmt(Math.max(0, c - st.points))} pt（1個 ${fmt(c)} pt）`;
  $('auto').textContent = autoOn() ? `自動クリック ON：${(autoMs() / 1000).toFixed(2)}秒ごと` : `自動クリック：あと${CONFIG.AUTO_UNLOCK - uniq()}種類で解放`;
  $('auto').classList.toggle('on', autoOn());
  const lbl = { ALL: 'すべて', N: 'N ドット', R: 'R イラスト', SR: 'SR 写真' };
  $('tabs').innerHTML = Object.keys(lbl).map(k => {
    const list = k === 'ALL' ? ITEMS : ITEMS.filter(i => i.rank === k);
    return `<button type="button" data-k="${k}" aria-pressed="${filter === k}">${lbl[k]} ${list.filter(i => st.own[i.id]).length}/${list.length}</button>`;
  }).join('');
  $('grid').innerHTML = ITEMS.filter(i => filter === 'ALL' || i.rank === filter).map(i => card(i, { grid: true })).join('');
}

$('btn').addEventListener('click', () => tap(false));
$('tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { filter = b.dataset.k; render(); } });
let armed = false;
$('reset').addEventListener('click', () => {
  if (!armed) { armed = true; $('reset').textContent = 'もう一度押すとリセット'; setTimeout(() => { armed = false; $('reset').textContent = 'データをリセット'; }, 3000); return; }
  clearInterval(timer); timer = null; timerMs = 0;
  st = { taps: 0, points: 0, draws: 0, own: {} }; save(); armed = false;
  $('reset').textContent = 'データをリセット';
  $('stage').innerHTML = '<p class="empty">ここに出てきた素材が表示されます</p>';
  render();
});
ensureAuto(); render();
}

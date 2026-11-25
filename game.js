{
const $ = id => document.getElementById(id);
const fmt = n => Math.floor(n).toLocaleString('ja-JP');
// ステータスバー用の短い表記（1万以上は 万・億・兆）
const short = n => { n = Math.floor(n); for (const [v, u] of [[1e12, '兆'], [1e8, '億'], [1e4, '万']]) if (n >= v) { const x = n / v; return (x < 100 ? x.toFixed(x < 10 ? 2 : 1).replace(/\.?0+$/, '') : fmt(x)) + u; } return fmt(n); };

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
const artOf = it => it.img ? `<img src="${esc(it.img)}" alt="" loading="lazy">` : (it.art || placeholder(it));


// ---- 状態 ----
const fresh = () => ({ taps: 0, points: 0, draws: 0, own: {}, start: 0, clearedAt: 0, earned: 0, earnedAuto: 0 });
let st = fresh();
try { const s = JSON.parse(localStorage.getItem(CONFIG.SAVE_KEY)); if (s && typeof s.points === 'number') st = Object.assign(st, s); } catch (e) {}
const save = () => { try { localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(st)); } catch (e) {} };

const uniq = rank => ITEMS.filter(i => (!rank || i.rank === rank) && st.own[i.id]).length;
const RANKS = ['N', 'R', 'SR'];
const total = rank => ITEMS.filter(i => i.rank === rank).length;
const isComp = rank => uniq(rank) === total(rank);
// ジャンル：items.js の並び順、追加素材の新ジャンルはその後ろ
const genres = () => [...new Set(ITEMS.map(i => i.cat))];
// ランク×ジャンルの区分（例：N・動物）。素材がある区分だけ
const cells = () => RANKS.flatMap(r => genres().filter(g => ITEMS.some(i => i.rank === r && i.cat === g)).map(g => r + '・' + g));
const cellItems = key => { const [r, g] = key.split('・'); return ITEMS.filter(i => i.rank === r && i.cat === g); };
const isCellComp = key => cellItems(key).every(i => st.own[i.id]);
const compBonus = () => RANKS.reduce((m, k) => m * (isComp(k) ? CONFIG.COMP_BONUS[k] : 1), 1)
  * CONFIG.GENRE_BONUS ** cells().filter(isCellComp).length;
const mult = () => Math.floor((1 + uniq('N') * CONFIG.MULT.N) * (1 + uniq('R') * CONFIG.MULT.R) * (1 + uniq('SR') * CONFIG.MULT.SR) * compBonus());
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
  if (!st.start) st.start = Date.now();
  const gain = mult();
  st.points += gain; st.earned += gain; if (isAuto) st.earnedAuto += gain;
  const got = [], before = RANKS.filter(isComp), beforeCells = cells().filter(isCellComp);
  while (st.points >= cost() && got.length < CONFIG.MAX_DRAWS_PER_TICK) {
    st.points -= cost(); st.draws++;
    const it = drawOne(), isNew = !st.own[it.id];
    st.own[it.id] = (st.own[it.id] || 0) + 1;
    got.push({ it, isNew });
    if (isNew) ensureAuto(); // 種類が増えたら自動クリックの間隔を更新
  }
  const comps = RANKS.filter(k => isComp(k) && !before.includes(k));
  const cellComps = got.length ? cells().filter(k => isCellComp(k) && !beforeCells.includes(k)) : [];
  if (comps.length && uniq() === ITEMS.length && !st.clearedAt) st.clearedAt = Date.now();
  if (got.length) showResult(got, comps, cellComps);
  if (got.some(g => g.isNew) && view !== 'zukan') $('newdot').hidden = false;
  save(); render();
}

// ---- 自動クリック ----
let timer = null, timerMs = 0;
function ensureAuto() {
  if (!autoOn()) { clearInterval(timer); timer = null; timerMs = 0; return; }
  const ms = autoMs();
  if (timer && ms === timerMs) return;
  clearInterval(timer); timerMs = ms;
  timer = setInterval(() => tap(true), ms);
}

// ---- 表示 ----
let filter = 'ALL';
function card(it, o = {}) {
  const n = st.own[it.id] || 0, lock = o.grid && !n && !o.mine;
  const tag = o.grid && !lock ? `button type="button" data-id="${it.id}" aria-label="${esc(it.name)}の詳細"` : 'div';
  return `<${tag} class="card ${it.rank}${lock ? ' locked' : ''}${o.pop ? ' pop' : ''}"><span class="rk">${it.rank}</span>${o.isNew ? '<span class="new">NEW</span>' : ''}<div class="art">${artOf(it)}</div><div class="nm">${lock ? '？？？' : esc(it.name)}</div><div class="cnt">${o.grid && n ? '×' + n : esc(it.cat)}</div></${tag.split(' ')[0]}>`;
}
const dur = ms => { const t = Math.round(ms / 1000), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, sec = t % 60; return (h ? h + '時間' : '') + (h || m ? m + '分' : '') + sec + '秒'; };
const RLBL = { N: 'N ドット', R: 'R イラスト', SR: 'SR 写真' };
function showResult(got, comps = [], cellComps = []) {
  // 新規 > ランク高い順で一番いいものを大きく表示
  const order = { SR: 3, R: 2, N: 1 };
  const best = got.slice().sort((a, b) => (b.isNew - a.isNew) || (order[b.it.rank] - order[a.it.rank]))[0];
  const newCount = got.filter(g => g.isNew).length;
  const msg = got.length > 1 ? `${got.length}個ゲット！${newCount ? `（新規 ${newCount}）` : ''}` : best.isNew ? '新しい素材をゲット！' : `ダブり… ×${st.own[best.it.id]}`;
  let extra = cellComps.map(k => `<p class="comp">${esc(k)} コンプ！ 倍率 ×${CONFIG.GENRE_BONUS}</p>`).join('') + comps.map(k => `<p class="comp">${RLBL[k]} コンプリート！ 倍率 ×${CONFIG.COMP_BONUS[k]}</p>`).join('');
  if (comps.length && st.clearedAt) extra = `<p class="comp all">🎉 全${ITEMS.length}種コンプリート！</p><p class="empty">${dur(st.clearedAt - st.start)}・${fmt(st.taps)}タップ・${fmt(st.draws)}回</p>`;
  $('stage').innerHTML = card(best.it, { pop: true, isNew: best.isNew }) + `<p class="empty">${msg}</p>` + extra;
}
function render() {
  $('pts').textContent = short(st.points);
  $('mult').textContent = '×' + short(mult());
  $('done').textContent = `${uniq()}/${ITEMS.length}`;
  const c = cost();
  $('bar').style.width = Math.min(100, st.points / c * 100) + '%';
  $('hint').textContent = `次のカプセルまで ${fmt(Math.max(0, c - st.points))} pt（1個 ${fmt(c)} pt）`;
  $('auto').textContent = autoOn() ? `自動 ${(autoMs() / 1000).toFixed(2)}秒ごと` : `自動クリック：あと${CONFIG.AUTO_UNLOCK - uniq()}種で解放`;
  $('auto').classList.toggle('on', autoOn());
  const cb = compBonus();
  $('bonus').textContent = cb > 1 ? `ボーナス ×${+cb.toFixed(2)}` : '';
  $('bonus').hidden = cb === 1;
  $('clear').hidden = !st.clearedAt;
  $('record').innerHTML = `<dt>合計ポイント</dt><dd>${fmt(st.earned)} pt</dd><dt>　うちタップ</dt><dd>${fmt(st.earned - st.earnedAuto)} pt</dd><dt>　うち自動</dt><dd>${fmt(st.earnedAuto)} pt</dd><dt>タップ数</dt><dd>${fmt(st.taps)}</dd><dt>ガチャ回数</dt><dd>${fmt(st.draws)}</dd><dt>次の1個</dt><dd>${fmt(c)} pt</dd><dt>プレイ開始</dt><dd>${st.start ? new Date(st.start).toLocaleString('ja-JP') : '—'}</dd>`;
  if (st.clearedAt) $('clear').textContent = `🎉 全種コンプ記録：${dur(st.clearedAt - st.start)}（${fmt(st.taps)}タップ・${fmt(st.draws)}回）`;
  $('earned').textContent = short(st.earned);
  renderZukan();
}

// ---- 図鑑：ランクタブ × ジャンルチップ、ランク×ジャンルごとに区切って表示 ----
let gfilter = 'ALL';
const chip = (attr, k, label, list, on) => { const have = list.filter(i => st.own[i.id]).length; return `<button type="button" ${attr}="${esc(k)}" aria-pressed="${on}">${list.length && have === list.length ? '★ ' : ''}${esc(label)} ${have}/${list.length}</button>`; };
function renderZukan() {
  if (gfilter !== 'ALL' && !genres().includes(gfilter)) gfilter = 'ALL';
  const inG = i => gfilter === 'ALL' || i.cat === gfilter, inR = i => filter === 'ALL' || i.rank === filter;
  $('tabs').innerHTML = ['ALL', ...RANKS].map(k => chip('data-k', k, k === 'ALL' ? 'すべて' : RLBL[k], ITEMS.filter(i => (k === 'ALL' || i.rank === k) && inG(i)), filter === k)).join('');
  $('genres').innerHTML = ['ALL', ...genres()].map(g => chip('data-g', g, g === 'ALL' ? '全ジャンル' : g, ITEMS.filter(i => (g === 'ALL' || i.cat === g) && inR(i)), gfilter === g)).join('');
  $('grid').innerHTML = cells().filter(k => cellItems(k).some(i => inR(i) && inG(i))).map(k => {
    const list = cellItems(k), have = list.filter(i => st.own[i.id]).length, done = have === list.length;
    return `<h3 class="sec${done ? ' done' : ''}">${done ? '★ ' : ''}${esc(k)}<span>${have}/${list.length}</span></h3><div class="grid">${list.map(i => card(i, { grid: true })).join('')}</div>`;
  }).join('');
}

// ---- タップボタン：指を置いた瞬間に反応（連打・複数指OK） ----
const btn = $('btn'), fx = $('fx');
function floatText(x, y) {
  const el = document.createElement('span');
  el.className = 'plus'; el.textContent = '+' + fmt(mult());
  const r = fx.getBoundingClientRect();
  el.style.left = (x - r.left + (Math.random() * 30 - 15)) + 'px'; el.style.top = (y - r.top - 20) + 'px';
  fx.appendChild(el); setTimeout(() => el.remove(), 700);
  while (fx.childElementCount > 12) fx.firstChild.remove();
}
btn.addEventListener('pointerdown', e => {
  e.preventDefault();
  floatText(e.clientX, e.clientY); tap(false);
  btn.classList.add('press');
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => btn.addEventListener(t, () => btn.classList.remove('press')));
btn.addEventListener('contextmenu', e => e.preventDefault());

// ---- 画面切り替え（下のタブバー） ----
let view = 'gacha';
document.querySelector('.tabbar').addEventListener('click', e => {
  const b = e.target.closest('button[data-v]'); if (!b) return;
  view = b.dataset.v;
  document.querySelectorAll('.tabbar button').forEach(x => x === b ? x.setAttribute('aria-current', 'page') : x.removeAttribute('aria-current'));
  document.querySelectorAll('.view').forEach(v => { const on = v.id === 'v-' + view; v.hidden = !on; v.classList.toggle('active', on); });
  if (view === 'zukan') $('newdot').hidden = true;
});
$('tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { filter = b.dataset.k; renderZukan(); } });
$('genres').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { gfilter = b.dataset.g; renderZukan(); } });
// ---- 詳細・クレジット ----
const credit = it => it.credit ? `${esc(it.credit.author)}／${esc(it.credit.license)}${it.credit.note ? '（' + esc(it.credit.note) + '）' : ''} <a href="${esc(it.credit.url)}" target="_blank" rel="noopener">配布元</a>` : 'オリジナル';
const dlg = $('dlg');
function openDlg(html) { $('dlgBody').innerHTML = html; dlg.showModal(); }
function openDetail(id) {
  const it = ITEMS.find(i => i.id === id); if (!it) return;
  openDlg(card(it) + `<dl class="info"><dt>ランク</dt><dd>${RLBL[it.rank]}</dd><dt>ジャンル</dt><dd>${esc(it.cat)}</dd><dt>所持数</dt><dd>${fmt(st.own[it.id] || 0)}</dd><dt>素材</dt><dd>${credit(it)}</dd></dl>`
    );
}
$('grid').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b) openDetail(b.dataset.id); });
$('credits').addEventListener('click', () => {
  const groups = {};
  ITEMS.forEach(i => { const k = i.credit ? i.credit.author : 'オリジナル'; (groups[k] = groups[k] || { c: i.credit, list: [] }).list.push(i.name); });
  openDlg(`<h3>クレジット</h3><p class="small">このゲームの絵はすべて、以下のフリー素材を使わせていただいています。</p><ul class="cr">${Object.entries(groups).map(([k, g]) => `<li><b>${esc(k)}</b><br>${g.c ? `${esc(g.c.license)}${g.c.note ? '・' + esc(g.c.note) : ''}・<a href="${esc(g.c.url)}" target="_blank" rel="noopener">配布元</a><br>` : ''}<span class="small">${g.list.map(esc).join('、')}</span></li>`).join('')}</ul>`
    + `<p class="small">MIT ライセンスの素材は著作権表示と許諾文を LICENSES.md に収録しています。フォント：M PLUS Rounded 1c（SIL Open Font License）</p>`);
});
$('dlgClose').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

let armed = false;
$('reset').addEventListener('click', () => {
  if (!armed) { armed = true; $('reset').textContent = 'もう一度押すとリセット'; setTimeout(() => { armed = false; $('reset').textContent = 'データをリセット'; }, 3000); return; }
  clearInterval(timer); timer = null; timerMs = 0;
  st = fresh(); save(); armed = false;
  $('reset').textContent = 'データをリセット';
  $('stage').innerHTML = '<p class="empty">タップでポイントを貯めると<br>カプセルが出てくるよ</p>';
  render();
});
ensureAuto(); render();
}

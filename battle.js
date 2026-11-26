// デッキ作成と対戦（CPU 戦）
{
const $ = id => document.getElementById(id);
const SG = window.SG, esc = SG.esc;
const BY = Object.fromEntries(ITEMS.map(i => [i.id, i]));
const D = CONFIG.DECK;           // 枚数制限
const TRIB = CONFIG.TRIBUTE;     // 出すときに使用不可にする場のカードの枚数
const ORDER = { LR: 6, UR: 5, 'SR+': 4, SR: 3, R: 2, N: 1 };
const sum = it => it.atk + it.def;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isSR = r => r === 'SR' || r === 'SR+';

// ミニカード（手札・デッキ用）
function mini(it, o = {}) {
  return `<button type="button" class="mc ${SG.rcls(it.rank)}${o.cls || ''}" data-id="${it.id}"${o.i != null ? ` data-i="${o.i}"` : ''}${o.disabled ? ' disabled' : ''}>`
    + `<span class="mrk">${it.rank}</span>${o.badge ? `<span class="mb">${o.badge}</span>` : ''}<div class="mart">${SG.artOf(it)}</div>`
    + `<div class="mnm">${esc(it.name)}</div><div class="mad"><span class="atk">${it.atk}</span><span class="def">${it.def}</span></div></button>`;
}

// ================= デッキ =================
// 存在しないカードと、上限をこえる重複は取り除く（前のデッキに同じカードが複数入っていた場合など）
const deck = () => (SG.st.deck = (SG.st.deck || []).filter((id, i, a) => BY[id] && a.slice(0, i).filter(x => x === id).length < D.COPY));
function counts(d) { const c = { N: 0, R: 0, SR: 0, 'SR+': 0, UR: 0, LR: 0 }; d.forEach(id => c[BY[id].rank]++); return c; }
const copies = (d, id) => d.filter(x => x === id).length;
const maxCopies = id => Math.min(D.COPY, SG.st.own[id] || 0);
// 入れられない理由（入れられるなら空文字）
function whyNot(d, id) {
  const it = BY[id], c = counts(d);
  if (d.length >= D.SIZE) return `デッキは${D.SIZE}枚までです`;
  if (copies(d, id) >= maxCopies(id)) return copies(d, id) >= D.COPY ? (D.COPY === 1 ? '同じカードは1枚しか入れられません' : `同じカードは${D.COPY}枚までです`) : '持っている枚数までしか入れられません';
  if (it.rank === 'LR' && c.LR >= D.LR) return `LR は${D.LR}枚までです`;
  if (it.rank === 'UR' && c.UR >= D.UR) return `UR は${D.UR}枚までです`;
  if (isSR(it.rank) && c.SR + c['SR+'] >= D.SR) return `SR と SR+ は合わせて${D.SR}枚までです`;
  if (it.rank === 'R' && c.R >= D.R) return `R は${D.R}枚までです`;
  return '';
}
function deckProblem(d) {
  if (d.length !== D.SIZE) return `デッキは${D.SIZE}枚ちょうどにしてください（いま${d.length}枚）`;
  const c = counts(d);
  if (c.LR > D.LR || c.UR > D.UR || c.SR + c['SR+'] > D.SR || c.R > D.R) return '枚数制限をこえています';
  if ([...new Set(d)].some(id => copies(d, id) > maxCopies(id))) return '持っていないカードが入っています';
  return '';
}
// おまかせ：ランクの上限まで強い順に入れて、残りを N で埋める
function autoDeck() {
  const owned = ITEMS.filter(i => SG.st.own[i.id]).sort((a, b) => sum(b) - sum(a) || ORDER[b.rank] - ORDER[a.rank]);
  const d = [];
  const add = pred => { for (const it of owned) if (pred(it)) while (!whyNot(d, it.id) && d.length < D.SIZE) d.push(it.id); };
  add(i => i.rank === 'LR'); add(i => i.rank === 'UR'); add(i => isSR(i.rank)); add(i => i.rank === 'R'); add(() => true);
  return d;
}
let dfilter = 'ALL';
function renderDeck() {
  const d = deck(), c = counts(d), ok = !deckProblem(d);
  const chip = (lbl, n, max) => `<span class="dc${max != null && n > max ? ' over' : ''}">${lbl} <b>${n}</b>${max != null ? '/' + max : ''}</span>`;
  $('dcount').innerHTML = `<span class="dc big${ok ? ' ok' : ''}">合計 <b>${d.length}</b>/${D.SIZE}</span>` + chip('LR', c.LR, D.LR) + chip('UR', c.UR, D.UR) + chip('SR・SR+', c.SR + c['SR+'], D.SR) + chip('R', c.R, D.R) + chip('N', c.N);
  $('dnum').textContent = ok ? '（対戦できます）' : '';
  const uniq = [...new Set(d)].sort((a, b) => ORDER[BY[b].rank] - ORDER[BY[a].rank] || sum(BY[b]) - sum(BY[a]));
  $('dlist').innerHTML = uniq.length ? uniq.map(id => mini(BY[id], { badge: copies(d, id) > 1 ? '×' + copies(d, id) : '', cls: ' rm' })).join('') : '<p class="note">まだ空です。下のカードを押すか「おまかせ」で作れます</p>';
  $('dtabs').innerHTML = ['ALL', ...SG.RANKS].map(k => `<button type="button" data-k="${k}" aria-pressed="${dfilter === k}">${k === 'ALL' ? 'すべて' : k}</button>`).join('');
  const pool = ITEMS.filter(i => SG.st.own[i.id] && (dfilter === 'ALL' || i.rank === dfilter)).sort((a, b) => ORDER[b.rank] - ORDER[a.rank] || sum(b) - sum(a));
  $('dpool').innerHTML = pool.length ? pool.map(it => { const left = maxCopies(it.id) - copies(d, it.id); return mini(it, { badge: D.COPY > 1 && left > 0 ? '残' + left : '', cls: copies(d, it.id) ? ' in' : '', disabled: !!whyNot(d, it.id) }); }).join('') : '<p class="note">カードがありません。ガチャで集めましょう</p>';
}
const dmsg = t => { $('dmsg').textContent = t; };
$('dpool').addEventListener('click', e => {
  const b = e.target.closest('.mc'); if (!b) return;
  const why = whyNot(deck(), b.dataset.id);
  if (why) return dmsg(why);
  deck().push(b.dataset.id); SG.save(); dmsg(''); renderDeck();
});
// 無効化されたボタンはクリックが届かないので、理由はタップした位置から拾う
$('dpool').addEventListener('pointerup', e => { const b = e.target.closest('.mc'); if (b && b.disabled) dmsg(whyNot(deck(), b.dataset.id)); });
$('dlist').addEventListener('click', e => {
  const b = e.target.closest('.mc'); if (!b) return;
  const d = deck(); d.splice(d.lastIndexOf(b.dataset.id), 1); SG.save(); dmsg(''); renderDeck();
});
$('dtabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { dfilter = b.dataset.k; renderDeck(); } });
$('dAuto').addEventListener('click', () => { SG.st.deck = autoDeck(); SG.save(); const p = deckProblem(SG.st.deck); dmsg(p ? 'カードが足りません。' + p : 'おまかせでデッキを作りました'); renderDeck(); });
$('dClear').addEventListener('click', () => { SG.st.deck = []; SG.save(); dmsg(''); renderDeck(); });

// ================= 対戦 =================
let B = null;
const me = () => B.p[0], cpu = () => B.p[1];
const fieldCount = p => p.field.filter(Boolean).length;
const log = t => { B.log.push(t); if (B.log.length > 40) B.log.shift(); };
const canAttackTurn = () => B.turn > 1; // 先攻の1ターン目は攻撃できない
// CPU のデッキ：あなたのデッキと同じランク構成で、全カードからランダム
function cpuDeck(mine) {
  const c = counts(mine), d = [];
  for (const r of SG.RANKS) d.push(...shuffle(ITEMS.filter(i => i.rank === r)).slice(0, c[r]).map(i => i.id));
  return d;
}
function draw(pi) {
  const p = B.p[pi];
  if (!p.deck.length) { end(1 - pi, `${p.name}の山札がなくなりました`); return false; }
  p.hand.push(p.deck.pop()); return true;
}
function start() {
  const d = deck(), prob = deckProblem(d);
  if (prob) { $('bmsg').textContent = prob + '。デッキ画面で作ってください'; return; }
  const mk = (name, ids) => ({ name, life: CONFIG.BATTLE_LIFE, deck: shuffle([...ids]), hand: [], field: [null, null, null, null], grave: [] });
  B = { p: [mk('あなた', d), mk('CPU', cpuDeck(d))], turn: 0, cur: 0, placed: false, over: false, sel: null, log: [], busy: false };
  for (let i = 0; i < 5; i++) { draw(0); draw(1); }
  B.first = Math.random() < 0.5 ? 0 : 1;
  log(`コイントス：${B.first === 0 ? 'あなたが先攻' : 'CPU が先攻'}です`);
  $('bmsg').textContent = '';
  startTurn(B.first);
}
function startTurn(pi) {
  if (B.over) return;
  B.turn++; B.cur = pi; B.placed = false; B.sel = null;
  B.p[pi].field.forEach(s => { if (s) { s.attacked = false; s.changed = false; } });
  if (!draw(pi)) return render();
  log(`― ${B.turn}ターン目：${B.p[pi].name}のターン（1枚引いた）`);
  render();
  if (pi === 1) cpuTurn();
}
function end(winner, why) {
  if (B.over) return;
  B.over = true; B.winner = winner; log(why); log(winner === 0 ? '🎉 あなたの勝ち！' : '負けてしまった…');
  const bs = SG.st.bstats || (SG.st.bstats = { win: 0, lose: 0 });
  winner === 0 ? bs.win++ : bs.lose++; SG.save();
  render();
  SG.openDlg(`<h3>${winner === 0 ? '🎉 勝ち！' : '負け…'}</h3><p>${esc(why)}</p><p class="small">通算 ${bs.win}勝 ${bs.lose}敗</p><button class="pill primary" type="button" id="bAgain">もう一度対戦</button>`);
  $('bAgain').onclick = () => { SG.closeDlg(); start(); };
}
function checkLife() {
  if (me().life <= 0) end(1, 'あなたのライフが0になりました');
  else if (cpu().life <= 0) end(0, 'CPU のライフが0になりました');
}
// 場に出す（tribs：使用不可にする自分の場の位置）
function place(pi, hi, up, pos, tribs = []) {
  const p = B.p[pi], id = p.hand[hi];
  tribs.forEach(i => { p.grave.push(p.field[i].id); p.field[i] = null; });
  const slot = p.field.indexOf(null);
  p.hand.splice(hi, 1);
  p.field[slot] = { id, up, pos, turn: B.turn, attacked: false, changed: false };
  B.placed = true;
  const it = BY[id];
  log(`${p.name}が${tribs.length ? `${tribs.length}枚を使用不可にして` : ''}${up ? `「${it.name}」` : 'カード'}を${up ? '表' : '裏'}・${pos === 'atk' ? '縦（攻撃）' : '横（守備）'}で出した`);
}
const val = s => s.pos === 'atk' ? BY[s.id].atk : BY[s.id].def;
// 攻撃（ti が null なら直接攻撃）
function attack(pi, ai, ti) {
  const P = B.p[pi], O = B.p[1 - pi], a = P.field[ai], A = BY[a.id];
  a.attacked = true;
  if (!a.up) { a.up = true; log(`${P.name}の裏のカードは「${A.name}」だった`); }
  if (ti == null) { O.life -= A.atk; log(`「${A.name}」の直接攻撃！ ${O.name}に${A.atk}ダメージ`); return checkLife(); }
  const t = O.field[ti], T = BY[t.id];
  if (!t.up) { t.up = true; log(`${O.name}の裏のカードは「${T.name}」だった`); }
  const tv = val(t), diff = A.atk - tv, kill = (pl, i) => { pl.grave.push(pl.field[i].id); pl.field[i] = null; };
  const head = `「${A.name}」攻${A.atk} → 「${T.name}」${t.pos === 'atk' ? '攻' : '防'}${tv}：`;
  if (t.pos === 'atk') {
    if (diff > 0) { kill(O, ti); O.life -= diff; log(head + `勝ち！ ${O.name}に${diff}ダメージ`); }
    else if (diff < 0) { kill(P, ai); P.life += diff; log(head + `負け… ${P.name}に${-diff}ダメージ`); }
    else { kill(O, ti); kill(P, ai); log(head + '相打ちで両方使用不可'); }
  } else {
    if (diff > 0) { kill(O, ti); log(head + '守備を破った（ライフは減らない）'); }
    else if (diff < 0) { kill(P, ai); log(head + '守備に負けて使用不可'); }
    else log(head + '互角（どちらも残る）');
  }
  checkLife();
}
// 縦横の切り替え（裏なら表にする）
function changePos(pi, i) {
  const s = B.p[pi].field[i]; s.pos = s.pos === 'atk' ? 'def' : 'atk'; s.changed = true;
  const wasDown = !s.up; s.up = true;
  log(`${B.p[pi].name}が${wasDown ? `「${BY[s.id].name}」を表にして` : `「${BY[s.id].name}」を`}${s.pos === 'atk' ? '縦（攻撃）' : '横（守備）'}にした`);
}
const canChange = s => s && !s.attacked && !s.changed && s.turn !== B.turn;

// ---------- CPU ----------
const UNKNOWN = 9; // 裏のカードの見込みの数値
const seen = s => s.up ? val(s) : UNKNOWN;
async function cpuTurn() {
  const G = B; // 待っている間に新しい対戦が始まったら、この CPU の手番は打ち切る
  const gone = () => B !== G || G.over;
  G.busy = true; await sleep(700); if (gone()) return;
  const P = cpu(), O = me();
  // 1. 出す：一番得をするカードを選ぶ（使用不可にするのは弱いカードから）
  let best = null;
  P.hand.forEach((id, hi) => {
    const it = BY[id], need = TRIB[it.rank], n = fieldCount(P);
    if (need > n || n - need >= 4) return;
    const weak = P.field.map((s, i) => s && { i, v: sum(BY[s.id]) }).filter(Boolean).sort((a, b) => a.v - b.v).slice(0, need);
    const gain = sum(it) - weak.reduce((t, w) => t + w.v, 0);
    if (gain > 0 && (!best || gain > best.gain)) best = { hi, gain, tribs: weak.map(w => w.i) };
  });
  if (best) {
    const it = BY[P.hand[best.hi]], oppMax = Math.max(0, ...O.field.filter(s => s && s.pos === 'atk').map(seen));
    const atkMode = it.atk >= it.def || it.atk > oppMax;
    place(1, best.hi, atkMode, atkMode ? 'atk' : 'def', best.tribs); render(); await sleep(800); if (gone()) return;
  }
  // 2. 攻撃：勝てる相手だけを狙う。縦の相手を優先し、ダメージの大きい順
  if (canAttackTurn()) {
    const order = P.field.map((s, i) => s && s.pos === 'atk' ? i : -1).filter(i => i >= 0).sort((a, b) => BY[P.field[b].id].atk - BY[P.field[a].id].atk);
    for (const ai of order) {
      if (B.over || !P.field[ai]) continue;
      const A = BY[P.field[ai].id];
      if (!fieldCount(O)) { attack(1, ai, null); render(); await sleep(900); if (gone()) return; continue; }
      let pick = null;
      O.field.forEach((t, ti) => {
        if (!t) return; const v = seen(t); if (A.atk <= v) return;
        const score = (t.pos === 'atk' ? 100 : 0) + (A.atk - v);
        if (!pick || score > pick.score) pick = { ti, score };
      });
      if (pick) { attack(1, ai, pick.ti); render(); await sleep(900); if (gone()) return; }
    }
  }
  // 3. 弱い縦のカードは横にして守る
  if (!B.over) {
    const oppMax = Math.max(0, ...O.field.filter(s => s && s.pos === 'atk').map(seen));
    P.field.forEach((s, i) => { if (canChange(s) && s.pos === 'atk' && BY[s.id].atk < oppMax && BY[s.id].def > BY[s.id].atk) changePos(1, i); });
  }
  G.busy = false;
  if (!G.over) { render(); await sleep(500); if (!gone()) startTurn(0); }
}

// ---------- 表示 ----------
function fcard(s, mine, extra = '') {
  if (!s) return '';
  const it = BY[s.id], h = s.pos === 'def' ? ' h' : '';
  if (!s.up && !mine) return `<div class="fc back${h}"><span>？</span></div>`;
  return `<div class="fc ${SG.rcls(it.rank)}${h}${!s.up ? ' down' : ''}${extra}"><div class="fa">${SG.artOf(it)}</div><div class="fs"><span class="atk">${it.atk}</span><span class="def">${it.def}</span></div>${!s.up ? '<i class="dn">裏</i>' : ''}</div>`;
}
function render() {
  if (!B) return;
  const P = me(), C = cpu(), myTurn = B.cur === 0 && !B.over && !B.busy, sel = B.sel;
  $('board').hidden = false;
  $('bstart').hidden = !B.over;
  $('cLife').textContent = `❤ ${Math.max(0, C.life)}`; $('pLife').textContent = `❤ ${Math.max(0, P.life)}`;
  const info = p => `手札${p.hand.length}・山札${p.deck.length}・使用不可${p.grave.length}`;
  $('cInfo').textContent = info(C); $('pInfo').textContent = info(P);
  $('cField').innerHTML = C.field.map((s, i) => {
    const tg = sel && sel.mode === 'atk' && s;
    return `<button type="button" class="slot${tg ? ' tg' : ''}" data-side="c" data-i="${i}"${s ? '' : ' disabled'}>${fcard(s, false)}</button>`;
  }).join('');
  $('pField').innerHTML = P.field.map((s, i) => {
    const pk = sel && sel.mode === 'trib' && sel.picked.includes(i), at = sel && sel.mode === 'atk' && sel.ai === i;
    const done = s && s.attacked ? '<i class="sd">攻撃済</i>' : '';
    return `<button type="button" class="slot${pk ? ' pk' : ''}${at ? ' at' : ''}" data-side="p" data-i="${i}"${s ? '' : ' disabled'}>${fcard(s, true)}${done}</button>`;
  }).join('');
  $('blog').innerHTML = B.log.slice(-4).map(t => `<p>${esc(t)}</p>`).join('');
  $('pHand').innerHTML = P.hand.map((id, i) => mini(BY[id], { i, disabled: !myTurn || B.placed || !!sel })).join('') || '<p class="note">手札なし</p>';
  let phase = B.over ? (B.winner === 0 ? '勝ち！' : '負け…') : B.cur === 1 ? 'CPU のターン…' : sel ? (sel.mode === 'trib' ? `使用不可にするカードをあと${sel.need - sel.picked.length}枚選んでください` : '攻撃する相手のカードを選んでください') : `あなたのターン${canAttackTurn() ? '' : '（先攻1ターン目は攻撃できません）'}`;
  $('bphase').textContent = phase;
  $('bEnd').textContent = sel ? 'やめる' : 'ターン終了';
  $('bEnd').disabled = !myTurn;
}

// ---------- あなたの操作 ----------
$('bGo').addEventListener('click', start);
$('bEnd').addEventListener('click', () => {
  if (!B || B.cur !== 0 || B.over || B.busy) return;
  if (B.sel) { B.sel = null; return render(); }
  startTurn(1);
});
const myTurnNow = () => B && B.cur === 0 && !B.over && !B.busy;
// 手札：出し方を選ぶ
$('pHand').addEventListener('click', e => {
  const b = e.target.closest('.mc'); if (!b || !myTurnNow() || B.placed || B.sel) return;
  const hi = +b.dataset.i, it = BY[me().hand[hi]], need = TRIB[it.rank], n = fieldCount(me());
  const why = need > n ? `場のカードが${need}枚必要です（いま${n}枚）` : n - need >= 4 ? '場がいっぱいです（4枚まで）' : '';
  const opt = (up, pos, lbl) => `<button class="pill${pos === 'atk' ? ' primary' : ''}" type="button" data-up="${up}" data-pos="${pos}"${why ? ' disabled' : ''}>${lbl}</button>`;
  SG.openDlg(mini(it, { cls: ' big' }) + `<p class="small">${need ? `出すには場のカードを${need}枚使用不可にします` : 'そのまま出せます'}</p>${why ? `<p class="err">${why}</p>` : ''}`
    + `<div class="opts">${opt(1, 'atk', '表・縦（攻撃）')}${opt(1, 'def', '表・横（守備）')}${opt(0, 'atk', '裏・縦（攻撃）')}${opt(0, 'def', '裏・横（守備）')}</div>`);
  $('dlgBody').querySelectorAll('.opts button').forEach(x => x.onclick = () => {
    SG.closeDlg();
    const up = x.dataset.up === '1', pos = x.dataset.pos;
    if (need) { B.sel = { mode: 'trib', hi, up, pos, need, picked: [] }; render(); }
    else { place(0, hi, up, pos); render(); }
  });
});
// 自分の場
$('pField').addEventListener('click', e => {
  const b = e.target.closest('.slot'); if (!b || !myTurnNow()) return;
  const i = +b.dataset.i, s = me().field[i]; if (!s) return;
  if (B.sel && B.sel.mode === 'trib') {
    const pk = B.sel.picked, k = pk.indexOf(i); k >= 0 ? pk.splice(k, 1) : pk.push(i);
    if (pk.length === B.sel.need) { place(0, B.sel.hi, B.sel.up, B.sel.pos, pk); B.sel = null; }
    return render();
  }
  if (B.sel) return;
  const it = BY[s.id], canAtk = s.pos === 'atk' && !s.attacked && canAttackTurn();
  SG.openDlg(mini(it, { cls: ' big' }) + `<p class="small">${s.up ? '表' : '裏'}・${s.pos === 'atk' ? '縦（攻撃）' : '横（守備）'}${s.attacked ? '・このターンは攻撃済み' : ''}</p><div class="opts">`
    + `<button class="pill primary" type="button" id="oAtk"${canAtk ? '' : ' disabled'}>攻撃する</button>`
    + `<button class="pill" type="button" id="oPos"${canChange(s) ? '' : ' disabled'}>${s.pos === 'atk' ? '横（守備）にする' : '縦（攻撃）にする'}</button></div>`
    + `<p class="small">${!canAttackTurn() ? '先攻の1ターン目は攻撃できません。' : ''}${s.turn === B.turn ? '出したターンは表示を変えられません。' : ''}</p>`);
  $('oAtk').onclick = () => {
    SG.closeDlg();
    if (!fieldCount(cpu())) { attack(0, i, null); return render(); }
    B.sel = { mode: 'atk', ai: i }; render();
  };
  $('oPos').onclick = () => { SG.closeDlg(); changePos(0, i); render(); };
});
// 相手の場：攻撃先を選ぶ／表のカードを見る
$('cField').addEventListener('click', e => {
  const b = e.target.closest('.slot'); if (!b || !B) return;
  const ti = +b.dataset.i, t = cpu().field[ti]; if (!t) return;
  if (B.sel && B.sel.mode === 'atk' && myTurnNow()) { const ai = B.sel.ai; B.sel = null; attack(0, ai, ti); return render(); }
  if (t.up) SG.openDlg(mini(BY[t.id], { cls: ' big' }) + `<p class="small">CPU のカード・${t.pos === 'atk' ? '縦（攻撃）' : '横（守備）'}</p>`);
});
$('bGrave').addEventListener('click', () => {
  if (!B) return;
  const list = p => p.grave.length ? `<div class="glist">${p.grave.map(id => mini(BY[id])).join('')}</div>` : '<p class="small">なし</p>';
  SG.openDlg(`<h3>使用不可</h3><p><b>あなた</b></p>${list(me())}<p><b>CPU</b></p>${list(cpu())}`);
});

document.addEventListener('sg:view', e => {
  if (e.detail === 'deck') renderDeck();
  if (e.detail === 'battle') { if (B) render(); else { $('board').hidden = true; $('bstart').hidden = false; } }
});
// テスト用に中身を見られるようにしておく
window.SGB = { get B() { return B; }, start, place, attack, changePos, startTurn, autoDeck, deckProblem };
}

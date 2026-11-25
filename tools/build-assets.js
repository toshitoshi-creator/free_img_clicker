// 実在フリー素材から items.js と images/ を作るスクリプト（SR 写真は先に tools/build-photos.py を実行）
// 使い方: node tools/build-assets.js <npmパッケージを展開したディレクトリ>
//   必要なパッケージ（npm pack で取得して展開）:
//     @iconify-json/streamline-pixel (CC BY 4.0) / @iconify-json/pixelarticons (MIT)
//     @twemoji/svg (グラフィックは CC BY 4.0) / @lobehub/fluent-emoji-3d (Microsoft Fluent Emoji, MIT)
// ドット絵（N）は白黒アイコンをグリッドに戻し、輪郭の内側を塗って色を付ける
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const SRC = process.argv[2], OUT = path.join(__dirname, '..');
const LIST = require('./asset-list.js');

const CREDIT = {
  sp: { author: 'Streamline（Streamline Pixel）', license: 'CC BY 4.0', url: 'https://github.com/webalys-hq/streamline-vectors', note: 'ドット化して色付け' },
  pa: { author: 'Gerrit Halfmann（pixelarticons）', license: 'MIT', url: 'https://github.com/halfmage/pixelarticons', note: 'ドット化して色付け' },
  tw: { author: 'Twitter, Inc. ほか（Twemoji）', license: 'CC BY 4.0', url: 'https://github.com/jdecked/twemoji' },
  fl: { author: 'Microsoft（Fluent Emoji）', license: 'MIT', url: 'https://github.com/microsoft/fluentui-emoji' },
  nzp: { author: "Smithsonian's National Zoo（Smithsonian Open Access）", license: 'CC0', url: 'https://www.si.edu/openaccess', note: '正方形に切り抜き・縮小' },
  ch: { author: 'Cooper Hewitt, Smithsonian Design Museum（Smithsonian Open Access）', license: 'CC0', url: 'https://www.si.edu/openaccess', note: '正方形に余白を足して縮小' },
  fr: { author: 'Mihai Oltean, Horea Muresan（Fruits-360）', license: 'MIT', url: 'https://github.com/Horea94/fruit-images-dataset', note: '拡大' },
  twp: { author: 'Twitter, Inc. ほか（Twemoji）', license: 'CC BY 4.0', url: 'https://github.com/jdecked/twemoji', note: 'ドット化' },
  nasm: { author: 'National Air and Space Museum（Smithsonian Open Access）', license: 'CC0', url: 'https://www.si.edu/openaccess', note: '正方形に余白を足して縮小' },
  gld: { author: '', license: '', url: '', note: '正方形に切り抜き・縮小（Google Landmarks Dataset v2 / Wikimedia Commons より）' },
  saam: { author: 'Smithsonian American Art Museum（Smithsonian Open Access）', license: 'CC0', url: 'https://www.si.edu/openaccess', note: '正方形に余白を足して縮小' },
  oi: { author: '', license: 'CC BY 2.0', url: 'https://creativecommons.org/licenses/by/2.0/', note: '正方形に切り抜き・縮小（Open Images Dataset より）' },
};

// ---- 攻撃・防御（対戦用）。1〜20、合計はランクごとの範囲、ジャンルで攻め寄り・守り寄りを変える ----
const STAT_TOTAL = { N: [6, 15], R: [14, 25], SR: [22, 35], UR: [36, 40] };
const ATK_BIAS = { '動物': 0.6, '乗り物': 0.6, '食べ物': 0.5, '食器': 0.45, '家具': 0.4, '植物': 0.4, '建物': 0.35, '自然': 0.55, 'ファッション': 0.45, '道具': 0.5, 'あそび': 0.55, '絵画': 0.5 };
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function stats(it) {
  if (it.atk && it.def) return [it.atk, it.def]; // 一覧で手動指定があればそれを使う
  const r1 = hash(it.id + ':t') / 4294967296, r2 = hash(it.id + ':a') / 4294967296;
  const [lo, hi] = STAT_TOTAL[it.rank], total = lo + Math.floor(r1 * (hi - lo + 1));
  const ratio = Math.min(0.85, Math.max(0.15, (ATK_BIAS[it.cat] ?? 0.5) + (r2 - 0.5) * 0.5));
  let atk = Math.round(total * ratio);
  atk = Math.min(20, Math.max(1, atk, total - 20)); atk = Math.min(atk, total - 1);
  return [atk, total - atk];
}
// 絵文字ファイル名の揺れ（fe0f の有無）を吸収して探す
const findFile = (dir, code, ext) => [code, code.replace(/-fe0f/g, ''), code + '-fe0f'].map(c => path.join(dir, c + '.' + ext)).find(fs.existsSync);

const icons = {
  sp: JSON.parse(fs.readFileSync(path.join(SRC, '_iconify-json_streamline-pixel/package/icons.json'))),
  pa: JSON.parse(fs.readFileSync(path.join(SRC, '_iconify-json_pixelarticons/package/icons.json'))),
};
const GRID = { sp: 21, pa: 24 }; // streamline は 32 を 1.52 刻み → 21マス

// 塗りつぶし済みのドット絵 SVG（横に並ぶ同色マスは1つの rect にまとめる）
function toPixelSvg(mask, n, fill, line) {
  // 外側（端から到達できる透明マス）を探す
  const out = new Uint8Array(n * n), st = [];
  for (let i = 0; i < n; i++) st.push([i, 0], [i, n - 1], [0, i], [n - 1, i]);
  while (st.length) {
    const [x, y] = st.pop();
    if (x < 0 || y < 0 || x >= n || y >= n) continue;
    const k = y * n + x; if (out[k] || mask[k]) continue;
    out[k] = 1; st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  let s = '';
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      const k = y * n + x, c = mask[k] ? line : out[k] ? null : fill;
      let w = 1; while (x + w < n && (mask[k + w] ? line : out[k + w] ? null : fill) === c) w++;
      if (c) s += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${c}"/>`;
      x += w;
    }
  }
  return `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges">${s}</svg>`;
}

(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  const items = [];
  fs.mkdirSync(path.join(OUT, 'images/r'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'images/n'), { recursive: true });
  for (const it of LIST) {
    const o = { id: it.id, name: it.name, rank: it.rank, cat: it.cat, credit: CREDIT[it.src] };
    [o.atk, o.def] = stats(it);
    if (it.src === 'fl') { // Fluent 3D に無い絵文字は Twemoji で代用
      if (!findFile(path.join(SRC, '_lobehub_fluent-emoji-3d/package/assets'), it.code, 'webp')) { it.src = 'tw'; o.credit = CREDIT.tw; console.log('Fluent に無いので Twemoji:', it.name); }
    }
    if (it.src === 'sp' || it.src === 'pa') {
      const set = icons[it.src], ic = set.icons[it.icon]; if (!ic) throw new Error('icon ' + it.icon);
      const n = GRID[it.src], W = set.width;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${n}" height="${n}" style="color:#000">${ic.body}</svg>`;
      const mask = await p.evaluate(async ({ svg, n }) => {
        const im = new Image(); im.src = 'data:image/svg+xml;base64,' + btoa(svg); await im.decode();
        const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d');
        x.drawImage(im, 0, 0, n, n); const d = x.getImageData(0, 0, n, n).data;
        return Array.from({ length: n * n }, (_, i) => d[i * 4 + 3] > 110 ? 1 : 0);
      }, { svg, n });
      // 色付けしたドット絵を 1マス=1px の PNG にして保存（表示側で拡大）
      const svgArt = toPixelSvg(mask, n, it.fill, it.line || '#2a1a12');
      const png = await p.evaluate(async ({ svgArt, n }) => {
        const s = svgArt.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${n + 2}" height="${n + 2}" `);
        const im = new Image(); im.src = 'data:image/svg+xml;base64,' + btoa(s); await im.decode();
        const c = document.createElement('canvas'); c.width = c.height = n + 2; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
        x.drawImage(im, 0, 0); return c.toDataURL('image/png').split(',')[1];
      }, { svgArt, n });
      fs.writeFileSync(path.join(OUT, 'images/n', it.id + '.png'), Buffer.from(png, 'base64')); o.img = `images/n/${it.id}.png`;
    } else if (it.src === 'twp') { // Twemoji を 18マスのドット絵に（色を減らして輪郭線を付ける）
      const f = findFile(path.join(SRC, '_twemoji_svg/package'), it.code, 'svg'); if (!f) throw new Error('twemoji ' + it.name);
      const svg = fs.readFileSync(f, 'utf8').replace('<svg ', '<svg width="36" height="36" ');
      const png = await p.evaluate(async ({ svg }) => {
        const G = 18, im = new Image(); im.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))); await im.decode();
        const c = document.createElement('canvas'); c.width = c.height = G; const x = c.getContext('2d'); x.drawImage(im, 0, 0, G, G);
        const d = x.getImageData(0, 0, G, G).data, o = document.createElement('canvas'); o.width = o.height = G + 2;
        const y = o.getContext('2d'), od = y.createImageData(G + 2, G + 2), on = (i, j) => i >= 0 && j >= 0 && i < G && j < G && d[(j * G + i) * 4 + 3] > 128;
        const q = v => Math.min(255, Math.round(v / 36) * 36);
        for (let j = -1; j <= G; j++) for (let i = -1; i <= G; i++) {
          const k = ((j + 1) * (G + 2) + (i + 1)) * 4;
          if (on(i, j)) { const s = (j * G + i) * 4; od.data[k] = q(d[s]); od.data[k + 1] = q(d[s + 1]); od.data[k + 2] = q(d[s + 2]); od.data[k + 3] = 255; }
          else if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) { od.data[k] = 42; od.data[k + 1] = 26; od.data[k + 2] = 18; od.data[k + 3] = 255; }
        }
        y.putImageData(od, 0, 0); return o.toDataURL('image/png').split(',')[1];
      }, { svg });
      fs.writeFileSync(path.join(OUT, 'images/n', it.id + '.png'), Buffer.from(png, 'base64')); o.img = `images/n/${it.id}.png`;
    } else if (it.src === 'tw') {
      const f = findFile(path.join(SRC, '_twemoji_svg/package'), it.code, 'svg'); if (!f) throw new Error('twemoji ' + it.name);
      fs.copyFileSync(f, path.join(OUT, 'images/r', it.id + '.svg')); o.img = `images/r/${it.id}.svg`;
    } else if (it.src === 'fl') {
      const f = findFile(path.join(SRC, '_lobehub_fluent-emoji-3d/package/assets'), it.code, 'webp');
      fs.copyFileSync(f, path.join(OUT, 'images/r', it.id + '.webp')); o.img = `images/r/${it.id}.webp`;
    } else if (it.src.startsWith('photo:')) { // 写真は tools/build-photos.py で images/sr/ に作成済み
      const k = it.src.slice(6); o.img = `images/sr/${it.id}.jpg`;
      o.credit = { ...CREDIT[k], ...((k === 'ch' || k === 'nasm' || k === 'saam') && it.url ? { url: it.url } : {}), ...(k === 'nzp' ? { author: `${it.author}（Smithsonian Open Access）` } : {}),
        ...(k === 'oi' ? { author: `${it.author}（Flickr）`, url: it.url } : {}),
        ...(k === 'gld' ? { author: `${it.author}（Wikimedia Commons）`, license: it.license, url: it.url } : {}),
        ...((k === 'saam') && it.url ? { url: it.url } : {}) };
      o.credit.src = k;
      if (it.artist) o.credit.artist = it.artist;
      if (it.title) o.credit.title = it.title;
      if (!fs.existsSync(path.join(OUT, o.img))) throw new Error('photo ' + o.img);
    }
    items.push(o);
  }
  await b.close();
  const dup = (k) => items.map(i => i[k]).filter((v, i, a) => a.indexOf(v) !== i);
  if (dup('id').length || dup('name').length) throw new Error('重複: ' + dup('id') + ' / ' + dup('name'));
  for (const i of items) { const t = i.atk + i.def, [lo, hi] = STAT_TOTAL[i.rank]; if (i.atk < 1 || i.def < 1 || i.atk > 20 || i.def > 20 || t < lo || t > hi) throw new Error('能力値が範囲外: ' + i.name); }
  const js = `// 自動生成：node tools/build-assets.js（元データは tools/asset-list.js）
// 素材はすべて実在のフリー素材。出典とライセンスは各 credit と LICENSES.md を参照
const ITEMS = [\n${items.map(o => JSON.stringify(o)).join(',\n')}\n];\n`;
  fs.writeFileSync(path.join(OUT, 'items.js'), js);
  console.log(items.length, 'items', ['N', 'R', 'SR', 'UR'].map(r => r + ':' + items.filter(i => i.rank === r).length).join(' '), [...new Set(items.map(i => i.cat))].map(c => c + ':' + items.filter(i => i.cat === c).length).join(' '));
})();

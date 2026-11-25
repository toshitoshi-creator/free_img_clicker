// 実在フリー素材から items.js と images/ を作るスクリプト
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
};

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
  fs.mkdirSync(path.join(OUT, 'images/sr'), { recursive: true });
  for (const it of LIST) {
    const o = { id: it.id, name: it.name, rank: it.rank, cat: it.cat, credit: CREDIT[it.src] };
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
      o.art = toPixelSvg(mask, n, it.fill, it.line || '#2a1a12');
    } else if (it.src === 'tw') {
      const f = path.join(SRC, '_twemoji_svg/package', it.code + '.svg');
      fs.copyFileSync(f, path.join(OUT, 'images/r', it.id + '.svg')); o.img = `images/r/${it.id}.svg`;
    } else if (it.src === 'fl') {
      const dir = path.join(SRC, '_lobehub_fluent-emoji-3d/package/assets');
      const f = [it.code + '.webp', it.code + '-fe0f.webp'].map(x => path.join(dir, x)).find(fs.existsSync);
      if (!f) throw new Error('fluent ' + it.code);
      fs.copyFileSync(f, path.join(OUT, 'images/sr', it.id + '.webp')); o.img = `images/sr/${it.id}.webp`;
    }
    items.push(o);
  }
  await b.close();
  const js = `// 自動生成：node tools/build-assets.js（元データは tools/asset-list.js）
// 素材はすべて実在のフリー素材。出典とライセンスは各 credit と LICENSES.md を参照
const ITEMS = [\n${items.map(o => JSON.stringify(o)).join(',\n')}\n];\n`;
  fs.writeFileSync(path.join(OUT, 'items.js'), js);
  console.log(items.length, 'items', ['N', 'R', 'SR'].map(r => r + ':' + items.filter(i => i.rank === r).length).join(' '));
})();

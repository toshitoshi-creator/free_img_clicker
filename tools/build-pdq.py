# パブリックドメインQ の素材から、表のガチャ用（tools/pdq-list.json）と裏のAIクリッカー用（tools/ai-list.json）の
# 画像をまとめ画像（10×10 マス、images/atlas/*.webp）にして、ai-items.js と atlas.js を作る。
#   python3 -I tools/build-pdq.py <サムネイルのキャッシュ>
# リストは tools/pdq-select.py で作る。画像はサムネイル（一覧ページの小さい画像）を正方形に切り抜いたもの。
# N はドット絵（20×20 マス）にする。表の素材の攻撃・防御は tools/build-assets.js で付ける。
import json, os, sys, glob
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = sys.argv[1]
CELL, NPX, NCELL = 128, 20, 80  # 写真・イラストは 128px、ドット絵は 20 マスを 4 倍（80px）
os.makedirs(f'{ROOT}/images/atlas', exist_ok=True)
for f in glob.glob(f'{ROOT}/images/atlas/*.webp'): os.remove(f)

def thumb(pid):
    for ext in ('webp', 'jpg', 'jpeg', 'png'):
        p = f'{CACHE}/{pid}.{ext}'
        if os.path.exists(p): return p

def square(im, fy=0.5):  # 正方形に切り抜く（縦長は fy の位置を中心に）
    w, h = im.size; s = min(w, h)
    x = (w - s) // 2; y = int(max(0, min(h - s, h * fy - s / 2)))
    return im.crop((x, y, x + s, y + s))

def pixelate(im):  # ドット絵：20×20 に縮めて 16 色に減らし、外側の白い背景を透明にする
    im = square(im.convert('RGB')).resize((NPX, NPX), Image.BOX)
    im = im.quantize(16, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    px = im.load(); W = NPX
    white = lambda c: c[0] > 228 and c[1] > 228 and c[2] > 228
    seen, stack = set(), [(x, y) for x in range(W) for y in (0, W - 1)] + [(x, y) for y in range(W) for x in (0, W - 1)]
    while stack:  # ふちから続く白だけ消す（中の白い部分は残す）
        x, y = stack.pop()
        if (x, y) in seen or not (0 <= x < W and 0 <= y < W) or not white(px[x, y]): continue
        seen.add((x, y)); px[x, y] = (0, 0, 0, 0)
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return im.resize((NCELL, NCELL), Image.NEAREST)

def atlases(name, rows, make, cell, lossless):
    out = []
    for a in range(0, len(rows), 100):
        chunk = rows[a:a + 100]
        sheet = Image.new('RGBA' if lossless else 'RGB', (cell * 10, cell * 10), (0, 0, 0, 0) if lossless else (243, 239, 230))
        for i, r in enumerate(chunk):
            im = make(Image.open(thumb(r['pid'])), r)
            sheet.paste(im, ((i % 10) * cell, (i // 10) * cell))
            r['sp'] = [None, i]
        fn = f'images/atlas/{name}{a // 100:02d}.webp'
        sheet.save(f'{ROOT}/{fn}', 'WEBP', lossless=True, quality=100, method=6) if lossless else sheet.save(f'{ROOT}/{fn}', 'WEBP', quality=72, method=6)
        out.append((fn, chunk))
    return out

def photo(im, r): return square(im.convert('RGB'), r.get('fy', 0.5)).resize((CELL, CELL), Image.LANCZOS)

ATLAS = []
def register(groups):
    for fn, chunk in groups:
        ATLAS.append(fn)
        for r in chunk: r['sp'][0] = len(ATLAS) - 1

main = json.load(open(f'{ROOT}/tools/pdq-list.json'))
ai = json.load(open(f'{ROOT}/tools/ai-list.json'))
for L in (main, ai):
    miss = [r['pid'] for r in L if not thumb(r['pid'])]
    if miss: sys.exit(f'サムネイルがない: {len(miss)} 件 {miss[:5]}')
register(atlases('n', [r for r in main if r['rank'] == 'N'], lambda im, r: pixelate(im), NCELL, True))
register(atlases('m', [r for r in main if r['rank'] != 'N'], photo, CELL, False))
register(atlases('a', ai, photo, CELL, False))
json.dump(main, open(f'{ROOT}/tools/pdq-list.json', 'w'), ensure_ascii=False, indent=0)
json.dump(ai, open(f'{ROOT}/tools/ai-list.json', 'w'), ensure_ascii=False, indent=0)

with open(f'{ROOT}/atlas.js', 'w') as f:
    f.write('// 自動生成：python3 tools/build-pdq.py（まとめ画像の一覧。カードの sp = [この番号, マス]）\nconst ATLAS = ' + json.dumps(ATLAS) + ';\n')
AIR = json.load(open(f'{ROOT}/tools/ai-ranks.json'))
with open(f'{ROOT}/ai-items.js', 'w') as f:
    f.write('// 自動生成：python3 tools/build-pdq.py（元データは tools/ai-list.json）\n// 裏のAIクリッカーの素材：パブリックドメインQ の AI 画像（CC0・パブリックドメイン）\n')
    f.write('const AI_RANKS = ' + json.dumps([r['k'] for r in AIR], ensure_ascii=False) + ';\n')
    f.write('const AI_RLBL = ' + json.dumps({r['k']: r['k'] + ' ' + r['label'] for r in AIR}, ensure_ascii=False) + ';\n')
    f.write("const AI_CREDIT = { author: 'パブリックドメインQ（AI画像）', license: 'CC0・パブリックドメイン', note: 'AIで作られた画像。正方形に切り抜き・縮小', src: 'pdqai' };\n")
    f.write('// u は元ページ（https://publicdomainq.net/<u>/）、sp はまとめ画像の [番号, マス]\nconst AI_ITEMS = [\n')
    for r in ai:
        u = r['url'].replace('https://publicdomainq.net/', '').strip('/')
        f.write(json.dumps({'id': 'a' + r['pid'], 'name': r['name'], 'rank': r['rank'], 'cat': r['cat'], 'u': u, 'sp': r['sp']}, ensure_ascii=False, separators=(',', ':')) + ',\n')
    f.write('];\nfor (const i of AI_ITEMS) i.credit = { ...AI_CREDIT, url: `https://publicdomainq.net/${i.u}/` };\n')
print('atlas', len(ATLAS), 'main', len(main), 'ai', len(ai))

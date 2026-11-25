# SR（写真）素材を作るスクリプト：tools/photo-list.json の写真を取得して images/sr/ に正方形 JPEG で保存
# 使い方: python3 tools/build-photos.py <キャッシュ用ディレクトリ> <Fruits-360 を clone したディレクトリ>
#   動物  : Smithsonian's National Zoo（Smithsonian Open Access, CC0）
#   家具・食器: Cooper Hewitt, Smithsonian Design Museum（Smithsonian Open Access, CC0）
#   食べ物: Fruits-360（Mihai Oltean, Horea Muresan, MIT）https://github.com/Horea94/fruit-images-dataset
#   乗り物（飛行機・宇宙船）: National Air and Space Museum（Smithsonian Open Access, CC0）
#   植物・乗り物: Open Images Dataset V4 のテスト画像（各写真の撮影者による CC BY 2.0。作者と元ページは photo-list.json）
import json, os, sys, subprocess, urllib.request
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CACHE, FRUITS = sys.argv[1], sys.argv[2]
S3 = 'https://smithsonian-open-access.s3-us-west-2.amazonaws.com/media/'
SIZE = 240
os.makedirs(os.path.join(ROOT, 'images/sr'), exist_ok=True)
os.makedirs(CACHE, exist_ok=True)

def fetch(it):
    if it['src'] == 'fr':
        d = f"Training/{it['media']}"
        names = sorted(subprocess.run(['git', '-C', FRUITS, 'ls-tree', '--name-only', f'HEAD:{d}'], capture_output=True, text=True, check=True).stdout.split(), key=lambda n: int(n.split('_')[0]) if n.split('_')[0].isdigit() else 0)
        p = os.path.join(CACHE, it['id'] + '.jpg')
        if not os.path.exists(p):
            open(p, 'wb').write(subprocess.run(['git', '-C', FRUITS, 'show', f'HEAD:{d}/{names[39]}'], capture_output=True, check=True).stdout)
        return p
    if it['src'] == 'oi':
        p = os.path.join(CACHE, it['media'] + '.jpg')
        if not os.path.exists(p):
            open(p, 'wb').write(urllib.request.urlopen(f"https://open-images-dataset.s3.amazonaws.com/test/{it['media']}.jpg", timeout=120).read())
        return p
    unit = {'nzp': 'nzp', 'ch': 'chsdm', 'nasm': 'nasm'}[it['src']]
    p = os.path.join(CACHE, it['media'] + '.jpg')
    if not os.path.exists(p):
        open(p, 'wb').write(urllib.request.urlopen(f"{S3}{unit}/{it['media']}.jpg", timeout=120).read())
    return p

for it in json.load(open(os.path.join(ROOT, 'tools/photo-list.json'), encoding='utf-8')):
    im = Image.open(fetch(it)); im.draft('RGB', (SIZE * 4, SIZE * 4)); im = im.convert('RGB')
    w, h = im.size
    if it['src'] in ('nzp', 'oi'):  # 動物・植物・乗り物の写真：主役が入るように正方形に切り抜き
        m = min(w, h); cx, cy = it.get('fx', .5) * w, it.get('fy', .5) * h
        x = min(max(0, cx - m / 2), w - m); y = min(max(0, cy - m / 2), h - m)
        im = im.crop((int(x), int(y), int(x + m), int(y + m)))
    elif it['src'] in ('ch', 'nasm'):  # 博物館の収蔵品：背景色で正方形に余白を足して全体を見せる
        px = [im.getpixel(p) for p in [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]]
        bg = tuple(sum(c[i] for c in px) // 4 for i in range(3))
        m = max(w, h); sq = Image.new('RGB', (m, m), bg); sq.paste(im, ((m - w) // 2, (m - h) // 2)); im = sq
    im.resize((SIZE, SIZE), Image.LANCZOS).save(os.path.join(ROOT, 'images/sr', it['id'] + '.jpg'), quality=80, optimize=True, progressive=True)
print('ok')

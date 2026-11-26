# 公開用の1ファイル版を作る: python3 tools/build-artifact.py . <出力.html> [アセットURLの JSON]
# 画像（ドット絵・イラスト・写真）はすべて data URI でページに埋め込む（別ファイルを読めない表示環境があるため）
import re,sys
root,out=sys.argv[1],sys.argv[2]
r=lambda f:open(f'{root}/{f}',encoding='utf-8').read()
html=r('index.html')
body=re.search(r'<body>\n(.*?)<script src',html,re.S).group(1)
css=r('style.css')+"\n/* 公開ページでは外枠が safe-area 分の余白を持つので二重にしない */\n:root{--sat:0px;--sab:0px}\n"
import base64
MIME={'png':'image/png','svg':'image/svg+xml','webp':'image/webp'}
def inline_img(m):  # ドット絵・イラストはページに埋め込む（公開ページのファイル数上限のため）
    p=m.group(1);b=open(f'{root}/{p}','rb').read()
    return '"img":"data:%s;base64,%s"'%(MIME[p.rsplit('.',1)[1]],base64.b64encode(b).decode())
import io
from PIL import Image
def inline_photo(m):  # 写真もページに埋め込む（別ファイルが読めない表示環境があるため）。軽くするため 200px に縮小
    p=m.group(1);im=Image.open(f'{root}/{p}').convert('RGB');S=260 if im.width>250 else 200
    im=im.resize((S,S),Image.LANCZOS);b=io.BytesIO();im.save(b,'JPEG',quality=72,optimize=True,progressive=True)
    return '"img":"data:image/jpeg;base64,%s"'%base64.b64encode(b.getvalue()).decode()
items=re.sub(r'"img":"(images/(?:n|r)/[^"]+)"',inline_img,r('items.js'))
items=re.sub(r'"img":"(images/sr/[^"]+)"',inline_photo,items)
# まとめ画像（images/atlas/*.webp）はページに入りきらないので、公開ページのアセットに上げておき、その URL を使う
#   第3引数：{"images/atlas/n00.webp": "/_blob/...", ...} の JSON（無ければ相対パスのまま）
import json, os
atlas = r('atlas.js')
if len(sys.argv) > 3 and os.path.exists(sys.argv[3]):
    urls = json.load(open(sys.argv[3]))
    names = json.loads(re.search(r'const ATLAS = (\[.*?\]);', atlas).group(1))
    miss = [n for n in names if n not in urls]
    if miss: sys.exit('アセットの URL がない: ' + ', '.join(miss))
    atlas = 'const ATLAS = ' + json.dumps([urls[n] for n in names]) + ';\n'
js='\n'.join([r('config.js'),atlas,items,r('ai-items.js'),r('game.js'),r('battle.js')]).replace('</script','<\\/script')
page=f'''<title>素材ガチャクリッカー</title>
<meta name="theme-color" content="#e8433a">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;800&display=swap" rel="stylesheet">
<style>
{css}</style>
{body}<script>
{js}
</script>
'''
open(out,'w',encoding='utf-8').write(page)

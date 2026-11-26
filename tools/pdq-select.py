# パブリックドメインQ の一覧ページから集めた投稿（posts.jsonl：タイトル・タグ・サムネイル）から、
# 表のガチャに入れる素材（tools/pdq-list.json）と、裏のAIクリッカーの素材（tools/ai-list.json）を選ぶ。
#   python3 -I tools/pdq-select.py <posts.jsonl>... [--ai]
# ・実在の人の写真は入れない（偉人＝歴史上の人物と、絵画は別）
# ・AI 画像（タグ「フリーAI画像」「AI」、AIカラー化）は表には入れず、AIクリッカーへ
import json, re, sys, os, random, hashlib, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = lambda s: int(hashlib.md5(s.encode()).hexdigest(), 16)

posts = {}
for f in [a for a in sys.argv[1:] if not a.startswith('--')]:
    for l in open(f):
        p = json.loads(l); m = re.search(r'-(\d{7})/$', p['u'])
        if m: p['pid'] = m[1]; posts.setdefault(m[1], p)
used = set(re.findall(r'j_(\d{7})', open(f'{ROOT}/tools/photo-list.json').read()))  # すでに使っている偉人
old_names = set(re.findall(r'"name":"([^"]+)"', ''.join(l for l in open(f'{ROOT}/items.js') if not l.startswith('{"id":"q'))))  # パブリックドメインQ 以外の素材の名前

def clean(t):
    t = re.sub(r'^\[[^\]]*\]\s*', '', t).strip()
    t = re.sub(r'（AI[^）]*）', '', t)
    return t
def is_ai(p): return 'フリーAI画像' in p['tags'] or 'AI' in p['tags'] or '/ai-generated' in p['u'] or 'AI' in p['t']
PEOPLE_TAG = re.compile(r'^(人物|女性|男性|少女|少年|子供|カップル|家族|老人|赤ちゃん|全身|人体|学生|日本人|ポートレイト|若い|アジア人|白人|黒人|職業|結婚式|ビジネス|手$|人と動物|親子（人）|顔)')
PEOPLE_T = re.compile(r'(女性|男性|少女|少年|女の子|男の子|赤ちゃん|カップル|家族|老人|おじいさん|おばあさん|モデル|ビジネスマン|サラリーマン|学生|子ども|子供たち|子供と|の子供|人々|ママ|パパ|花嫁|新郎|新婦|母親|父親|女子|男子|ダンサー|選手|手で|手の|の手|手に|持つ人|する人|人物|自撮り|ポーズ|笑顔|彼女|彼氏|夫婦|おばさん|おじさん|お姉さん|お兄さん|美女|女$|男$)')
def has_people(p): return any(PEOPLE_TAG.match(t) for t in p['tags']) or bool(PEOPLE_T.search(p['t']))
JUNK = re.compile(r'(背景|パターン|罫線|フレーム|テクスチャ|模様|壁紙|ロゴ|文字|素材集|イラスト集|アイコン集|囲み|枠|吹き出し|カード|ポストカード|年賀状|ステッカー|テンプレート|カレンダー|地図|ポスター|広告|切手|シルエット集)')
def junk(p): return bool(JUNK.search(p['t'])) or any(t in ('背景（イラスト）', '枠（フレーム）', '和柄模様') for t in p['tags'])

GENRE = [('乗り物', r'^乗り物'), ('動物', r'^動物（'), ('食べ物', r'^(食べ物|飲み物)（'), ('植物', r'^(植物|花)（'), ('建物', r'^建築物'),
         ('自然', r'^風景（'), ('あそび', r'^(玩具|スポーツ（|音楽（)'), ('道具', r'^(電気機器|本（)')]
def genre(p):
    for g, rx in GENRE:
        if any(re.match(rx, t) for t in p['tags']): return g
    for g, rx in GENRE:
        if re.match(rx, p.get('from', '')): return g
    return None
POPULAR = re.compile(r'^(犬（イヌ）|猫（ネコ）|.*パンダ.*|北極熊.*|白熊.*|ライオン|虎（トラ）|ペンギン.*|兎（ウサギ）|コアラ|イルカ|象（ゾウ）|麒麟.*|キリン|ハムスター|カワウソ|狐（キツネ）|梟（フクロウ）|.*スポーツカー.*|新幹線|.*旅客機.*|飛行機|蒸気機関車.*|寿司（スシ）|ケーキ|苺（イチゴ）|桜（サクラ）|向日葵.*|紅葉.*|富士山|.*城$|オーロラ|.*滝$)')
FAMOUS = re.compile(r'(葛飾北斎|歌川広重|歌川国芳|喜多川歌麿|東洲斎写楽|伊藤若冲|尾形光琳|俵屋宗達|狩野|ゴッホ|モネ|ルノワール|フェルメール|レンブラント|ミレー|セザンヌ|ゴーギャン|クリムト|ダ・ヴィンチ|ラファエロ|ボッティチェリ|ドガ|マネ|ターナー|ムンク|上村松園|横山大観|竹久夢二|河鍋暁斎|月岡芳年|小原古邨|川瀬巴水|吉田博)')

def name_of(p):
    t = clean(p['t'])
    m = re.search(r'「([^」]+)」', t)
    if m and '絵画' in p['t']: return m[1]
    return t

S = collections.defaultdict(list)
for p in posts.values():
    tags = p['tags']
    if is_ai(p) or p['pid'] in used: continue
    if '歴史上の人物' in tags:
        # LR は偉人の写真・肖像画だけ（イラストは入れない）。タイトルに出てくる人名のタグをカード名にする
        if 'フリーイラスト' not in tags: S['LR'].append(p)
        continue
    if 'フリー絵画' in tags:
        if FAMOUS.search(p['t']) and not re.search(r'(タバコ|煙草|骸骨|髑髏|裸|ヌード|死|血|地獄|幽霊|処刑)', p['t']): S['UR絵画'].append(p)
        continue
    if has_people(p) or junk(p): continue
    g = genre(p)
    if not g: continue
    p['cat'] = g
    if 'フリー写真' in tags:
        if '世界遺産' in tags: S['UR名所'].append(p)
        elif any(POPULAR.match(t) for t in tags): S['SR+'].append(p)
        else: S['SR'].append(p)
    elif 'フリーイラスト' in tags:
        simple = any(t in ('ベクター', 'EPS', 'SVG') for t in tags) and len(clean(p['t'])) <= 12 and not re.search(r'[、・と]|セット|種類|たち|いろいろ', clean(p['t']))
        S['N' if simple else 'R'].append(p)
for k, v in S.items(): print(k, len(v), collections.Counter(p.get('cat') for p in v).most_common())

def pick(lst, n):  # ジャンルがかたよらないように順番に選ぶ（毎回同じ結果）
    by = collections.defaultdict(list)
    for p in sorted(lst, key=lambda p: H(p['pid'])): by[p.get('cat')].append(p)
    out = []
    while len(out) < n and any(by.values()):
        for g in list(by):
            if by[g] and len(out) < n: out.append(by[g].pop(0))
    return out

# パブリックドメインQ から入れる数（全体で約5000種になるように）。すでに入っている素材はそのまま残し、足りない分だけ足す
#（作り直しても、持っているカードが消えたり名前が変わったりしないように）
TARGET = {'N': 1393, 'R': 1073, 'SR': 977, 'SR+': 354, 'UR': 210, 'LR': 35}
KEEP = json.load(open(f'{ROOT}/tools/pdq-list.json')) if os.path.exists(f'{ROOT}/tools/pdq-list.json') else []
kept = {r['pid'] for r in KEEP} | set(json.load(open(f'{ROOT}/tools/pdq-skip.json')))  # pdq-skip.json：画像が取れない・壊れている投稿
have = collections.Counter(r['rank'] for r in KEEP)
need = {k: max(0, v - have[k]) for k, v in TARGET.items()}
free = lambda lst: [p for p in lst if p['pid'] not in kept]
# R が足りなければ、簡単な絵（N 候補）の残りを R にまわす
nsel = pick(free(S['N']), need['N'])
rest = [p for p in free(S['N']) if p not in nsel]
rsel = pick(free(S['R']) + (rest if len(free(S['R'])) < need['R'] else []), need['R'])
have_paint = sum(1 for r in KEEP if r['rank'] == 'UR' and r['cat'] == '絵画')
ur = pick([dict(p, cat='絵画') for p in free(S['UR絵画'])], max(0, TARGET['UR'] // 2 - have_paint))
ur += pick([dict(p, cat=p['cat'] if p['cat'] == '自然' else '建物') for p in free(S['UR名所'])], need['UR'] - len(ur))
# LR に入れる偉人（タグ名 → カード名）。誰でも知っている人だけを選んでいる。すでにいる偉人は入れない
LR_WHO = {'マリー・アントワネット': 0, 'ジャンヌ・ダルク': 0, 'ナポレオン・ボナパルト': 0, '聖徳太子': 0, '加藤清正': 0, '菅原道真': 0, '平将門': 0,
          'チャールズ・ダーウィン': 0, '柴田勝家': 0, '今川義元': 0, '斎藤道三': 0, 'ルイ14世': 0, '曹操': 0, 'アリストテレス': 0, 'パブロ・ピカソ': 0,
          'ヴォルフガング・アマデウス・モーツァルト': 'モーツァルト', 'エリザベス1世': 0, 'アルフレッド・ノーベル': 0, '孔子': 0, 'ソクラテス': 0,
          '清少納言': 0, 'ジョン・F・ケネディ': 0, 'マシュー・ペリー': 0, 'ヨハネス・ブラームス': 0,
          '浅井長政': 0, '福島正則': 0, '小早川隆景': 0, '山中幸盛': 0, '滝川一益': 0, '朝倉義景': 0, '源頼光': 0, '北条時政': 0, '平知盛': 0,
          '加藤嘉明': 0, 'アーネスト・トンプソン・シートン': 'シートン', '佐久間盛政': 0, '荒木村重': 0, '筒井順慶': 0}
def lr_pick():  # 1人1枚。写真があれば写真、なければ肖像画
    by = collections.defaultdict(list)
    done = {r['name'] for r in KEEP if r['rank'] == 'LR'}
    for p in free(S['LR']):
        for t in p['tags']:
            if t in LR_WHO and (LR_WHO[t] or t) not in old_names and (LR_WHO[t] or t) not in done: by[t].append(p)
    out = []
    for who, ps in sorted(by.items(), key=lambda kv: H(kv[0])):
        p = sorted(ps, key=lambda p: ('フリー写真' not in p['tags'], H(p['pid'])))[0]
        out.append(dict(p, cat='偉人', lrname=LR_WHO[who] or who))
    return out[:need['LR']]
sel = {'N': nsel, 'R': rsel, 'SR': pick(free(S['SR']), need['SR']), 'SR+': pick(free(S['SR+']), need['SR+']), 'UR': ur, 'LR': lr_pick()}

# 前からの素材を先に、新しい素材をうしろに並べる（まとめ画像の中の位置が変わらないように）
out, names = list(KEEP), set(old_names) | {r['name'] for r in KEEP}
for rank, lst in sel.items():
    for p in lst:
        n = p.get('lrname') or name_of(p); base = n; k = 2
        while n in names: n = f'{base} その{k}'; k += 1
        names.add(n)
        r = {'pid': p['pid'], 'name': n, 'rank': rank, 'cat': p['cat'], 'url': p['u'], 'img': p['img'], 'title': clean(p['t'])}
        a = re.match(r'(.+?)\s*「', clean(p['t']))
        if a and rank in ('UR', 'LR'): r['artist'] = a[1]
        if rank == 'LR': r['fy'] = 0.38  # 顔が上のほうにあるので少し上を中心に切り抜く
        out.append(r)
print('追加', {k: len(v) for k, v in sel.items()}, '不足', {k: need[k] - len(sel[k]) for k in need}, 'total', len(out))
json.dump(out, open(f'{ROOT}/tools/pdq-list.json', 'w'), ensure_ascii=False, indent=0)

# ===== 裏のAIクリッカー：AI 画像を題材ごとのランクに分ける =====
# 公開ページのアセット（まとめ画像）と合わなくなるので、--ai を付けたときだけ作り直す
if '--ai' not in sys.argv: sys.exit(0)
AIR = [
    {'k': 'C', 'label': 'AIポートレート', 'desc': 'AI が作った人物の写真'},
    {'k': 'B', 'label': 'AIワールド', 'desc': 'AI が作った風景・乗り物・食べ物など'},
    {'k': 'A', 'label': 'AIアニマル', 'desc': 'AI が作った動物'},
    {'k': 'S', 'label': 'AIキャラクター', 'desc': 'AI が描いた人物のイラスト'},
    {'k': 'SS', 'label': 'AIファンタジー', 'desc': 'AI が作ったドラゴン・魔法・宇宙・ロボットなど'},
]
json.dump(AIR, open(f'{ROOT}/tools/ai-ranks.json', 'w'), ensure_ascii=False, indent=1)
NG = re.compile(r'(水着|ビキニ|下着|ランジェリー|セクシー|入浴|裸|ベッド|お風呂|バスタオル|胸|谷間|ナイトウェア|ネグリジェ|寝そべ|ボディ|タトゥー|血|ゾンビ|ホラー|死|銃|ナイフ|喫煙|タバコ|お酒を飲|キノコ雲|爆発|戦争|兵士|戦車|軍|火事|災害|事故|洪水|津波|地震)')
FANTASY = re.compile(r'(ドラゴン|竜|ゴブリン|ユニコーン|ペガサス|妖精|魔法|魔女|魔術|エルフ|ドワーフ|オーク|天使|悪魔|精霊|騎士|勇者|モンスター|怪物|宇宙|惑星|銀河|星雲|ロボット|サイボーグ|アンドロイド|宇宙船|SF|サイバー|ファンタジー|幻想|異世界|神殿|不死鳥|フェニックス|グリフォン|人魚|忍者|侍|サムライ|鬼|河童|妖怪|九尾|麒麟|鳳凰|スチームパンク|機械|メカ|未来|スライム|ビッグフット|UFO|宇宙人|エイリアン|恐竜|雪男|ネッシー)')
PPL_AI = ('人物（AI画像）', '女性（AI画像）', '男性（AI画像）', '少女（AI画像）', '少年（AI画像）', '子供（AI画像）', 'カップル（AI画像）', '家族（AI画像）', '全身（AI画像）')
def ai_rank(p):
    t, tags = p['t'], set(p['tags'])
    if FANTASY.search(t): return 'SS', 'ロボ・宇宙' if re.search(r'(宇宙|惑星|銀河|星雲|ロボット|サイボーグ|アンドロイド|SF|サイバー|機械|メカ|未来|スチームパンク)', t) else 'ファンタジー'
    ppl = any(x in tags for x in PPL_AI)
    if ppl:
        g = '子供' if re.search(r'(子供|少女|少年|女の子|男の子|赤ちゃん|子ども)', t) or tags & {'少女（AI画像）', '少年（AI画像）', '子供（AI画像）'} else \
            'ふたり以上' if re.search(r'(カップル|家族|親子|二人|2人|友達|たち|夫婦|兄弟|姉妹)', t) or tags & {'カップル（AI画像）', '家族（AI画像）'} else \
            '男性' if re.search(r'(男性|男|おじいさん|紳士)', t) or '男性（AI画像）' in tags else '女性'
        return ('S' if 'イラスト（AI画像）' in tags else 'C'), g
    if '動物（AI画像）' in tags or any(x.startswith('動物（') for x in tags):
        g = '犬' if re.search(r'(犬|イヌ|ドッグ|レトリバー|柴|プードル|チワワ|コーギー|ダックス|テリア|ブルドッグ|パグ|ハスキー)', t + ''.join(tags)) else \
            '猫' if re.search(r'(猫|ネコ|キャット|子猫)', t + ''.join(tags)) else \
            '鳥' if re.search(r'(鳥|トリ|インコ|オウム|フクロウ|ペンギン|カモメ|ワシ|タカ|ハト|スズメ|ヒヨコ|ニワトリ|白鳥|ツル)', t + ''.join(tags)) else \
            '海・水の生き物' if re.search(r'(魚|サカナ|イルカ|クジラ|カメ|タコ|クラゲ|ペンギン|アザラシ|ラッコ|カエル|カニ|エビ)', t + ''.join(tags)) else 'いろんな動物'
        return 'A', g
    g = '乗り物' if any(x.startswith('乗り物') for x in tags) or re.search(r'(車|パトカー|スポーツカー|レーシングカー|電車|列車|飛行機|船|バイク|自転車|トラック|バス$|ヘリコプター)', t) else \
        '食べ物' if any(x.startswith(('食べ物', '飲み物')) for x in tags) else \
        '花・植物' if any(x.startswith(('花（', '植物（', '葉っぱ')) for x in tags) else \
        '風景' if any(x.startswith('風景') for x in tags) or re.search(r'(風景|景色|森|山|海|湖|川|空|夜景|街|雪|夕日|朝日|滝|島|砂漠|草原|月)', t) else 'くらし・もの'
    return 'B', g

ai = []
for p in posts.values():
    if not is_ai(p) or NG.search(p['t']): continue
    tags = set(p['tags'])
    # 表の素材のタグ（〜（写真）など）で人物とわかるものは除く（AI画像タグの人物は残す）
    if not (tags & {'フリーAI画像'}) and has_people(p): continue
    if any(x in tags for x in ('背景（AI画像）', '背景（イラスト）', '枠（フレーム）')) or JUNK.search(p['t']): continue
    r, g = ai_rank(p)
    ai.append({'pid': p['pid'], 'name': clean(p['t']), 'rank': r, 'cat': g, 'url': p['u'], 'img': p['img'], **({'fy': 0.4} if r in ('C', 'S') else {})})
order = {r['k']: i for i, r in enumerate(AIR)}
ai.sort(key=lambda r: (order[r['rank']], r['cat'], r['pid']))
names = collections.Counter()
for r in ai:  # 同じ題名には番号を付ける
    names[r['name']] += 1
    if names[r['name']] > 1: r['name'] += f' その{names[r["name"]]}'
print('AI', len(ai), collections.Counter(r['rank'] for r in ai), collections.Counter((r['rank'], r['cat']) for r in ai).most_common())
json.dump(ai, open(f'{ROOT}/tools/ai-list.json', 'w'), ensure_ascii=False, indent=0)

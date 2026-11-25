const PAL={r:'#e23b3b',g:'#3fa34d',w:'#ffffff',k:'#222',b:'#3f7fe0',o:'#8a5a33',y:'#f29a38',p:'#f6a5b8',t:'#e8b56a',d:'#9b5f2a',l:'#ffd84a',s:'#c9c9c9'};
const px=rows=>{let s='';rows.forEach((r,y)=>[...r].forEach((c,x)=>{if(PAL[c])s+=`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${PAL[c]}"/>`}));return `<svg viewBox="-1 -1 12 12" shape-rendering="crispEdges">${s}</svg>`};
const sv=b=>`<svg viewBox="0 0 100 100">${b}</svg>`;
// 素材データ。本番素材は img:"images/xxx.png" を指定すると art より優先されます。
// art も img もないものはランクに応じた仮絵を自動生成します。
const ITEMS=[
{id:'apple',name:'りんご',rank:'N',cat:'食べ物',art:px(['....gg....','....g.....','..rrrrrr..','.rrwrrrrr.','.rwrrrrrr.','.rrrrrrrr.','.rrrrrrrr.','..rrrrrr..','...rrrr...'])},
{id:'bread',name:'パン',rank:'N',cat:'食べ物',art:px(['..........','..dddddd..','.dttttttd.','dttttttttd','dttttttttd','.dttttttd.','.dttttttd.','.dttttttd.','.dddddddd.'])},
{id:'fish',name:'さかな',rank:'N',cat:'動物',art:px(['..........','..........','...bbbb..b','..bbbbbbbb','.bkbbbbbb.','.bbbbbbbbb','..bbbbbb.b','...bbbb...'])},
{id:'cat',name:'ねこ',rank:'N',cat:'動物',art:px(['.y......y.','.yy....yy.','.yyyyyyyy.','.ykyyyyky.','.yyyyyyyy.','.yyyppyyy.','..yyyyyy..','..yyyyyy..','.yy.yy.yy.'])},
{id:'chair',name:'いす',rank:'N',cat:'家具',art:px(['..o....o..','..oooooo..','..o....o..','..oooooo..','..o....o..','.oooooooo.','.oooooooo.','.o......o.','.o......o.','.o......o.'])},
{id:'lamp',name:'ランプ',rank:'N',cat:'家具',art:px(['...llll...','..llllll..','.llllllll.','....kk....','....kk....','....kk....','....kk....','..kkkkkk..'])},
{id:'onigiri',name:'おにぎり',rank:'R',cat:'食べ物',art:sv('<path d="M50 16C62 16 86 58 86 70c0 10-8 14-36 14S14 80 14 70C14 58 38 16 50 16z" fill="#fff" stroke="#333" stroke-width="3" stroke-linejoin="round"/><rect x="34" y="58" width="32" height="26" rx="3" fill="#2d3b2f" stroke="#333" stroke-width="3"/><circle cx="50" cy="44" r="3" fill="#e2574c"/>')},
{id:'strawberry',name:'いちご',rank:'R',cat:'食べ物',art:sv('<path d="M50 88C30 74 20 56 22 44c2-10 14-14 28-14s26 4 28 14c2 12-8 30-28 44z" fill="#e8433a" stroke="#333" stroke-width="3"/><path d="M34 30l8-10 8 8 8-8 8 10-16 4z" fill="#4caf50" stroke="#333" stroke-width="3" stroke-linejoin="round"/><g fill="#ffe08a"><circle cx="38" cy="46" r="2"/><circle cx="52" cy="44" r="2"/><circle cx="64" cy="48" r="2"/><circle cx="44" cy="58" r="2"/><circle cx="58" cy="60" r="2"/><circle cx="50" cy="72" r="2"/></g>')},
{id:'rabbit',name:'うさぎ',rank:'R',cat:'動物',art:sv('<ellipse cx="38" cy="30" rx="7" ry="20" fill="#fff" stroke="#333" stroke-width="3"/><ellipse cx="62" cy="30" rx="7" ry="20" fill="#fff" stroke="#333" stroke-width="3"/><ellipse cx="50" cy="64" rx="28" ry="24" fill="#fff" stroke="#333" stroke-width="3"/><circle cx="40" cy="60" r="3" fill="#333"/><circle cx="60" cy="60" r="3" fill="#333"/><path d="M46 70q4 4 8 0" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round"/><circle cx="32" cy="70" r="4" fill="#f6a5b8"/><circle cx="68" cy="70" r="4" fill="#f6a5b8"/>')},
{id:'sofa',name:'ソファ',rank:'R',cat:'家具',art:sv('<rect x="20" y="30" width="60" height="30" rx="10" fill="#5aa0c8" stroke="#333" stroke-width="3"/><rect x="10" y="48" width="80" height="24" rx="8" fill="#4a8db3" stroke="#333" stroke-width="3"/><rect x="8" y="42" width="14" height="30" rx="6" fill="#5aa0c8" stroke="#333" stroke-width="3"/><rect x="78" y="42" width="14" height="30" rx="6" fill="#5aa0c8" stroke="#333" stroke-width="3"/><path d="M18 72v10M82 72v10" stroke="#333" stroke-width="4" stroke-linecap="round"/>')},
{id:'melon',name:'マスクメロン',rank:'SR',cat:'食べ物',art:sv('<defs><radialGradient id="m1" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#e9f5c4"/><stop offset=".5" stop-color="#9cc26a"/><stop offset="1" stop-color="#4d6e2c"/></radialGradient><radialGradient id="sh1"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient><linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4efe6"/><stop offset="1" stop-color="#d9cfbf"/></linearGradient></defs><rect width="100" height="100" fill="url(#bg1)"/><ellipse cx="52" cy="86" rx="34" ry="7" fill="url(#sh1)"/><circle cx="50" cy="54" r="32" fill="url(#m1)"/><g fill="none" stroke="#eef3dc" stroke-opacity=".55" stroke-width="1.2"><path d="M24 44q14 6 26-4t28 4M20 58q16-8 30 2t32-4M26 72q12-8 24 0t26-2M40 24q-6 16 4 30t-2 30M60 24q8 16-2 30t4 30"/></g><path d="M50 22q2-8 8-10" stroke="#6b5a2e" stroke-width="3" fill="none" stroke-linecap="round"/>')},
{id:'egg',name:'たまご',rank:'SR',cat:'食べ物',art:sv('<defs><radialGradient id="e1" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#fffaf2"/><stop offset=".55" stop-color="#f1dcc0"/><stop offset="1" stop-color="#b98f63"/></radialGradient><radialGradient id="sh2"><stop offset="0" stop-color="#000" stop-opacity=".4"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient><linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5d6b78"/><stop offset="1" stop-color="#2c333b"/></linearGradient></defs><rect width="100" height="100" fill="url(#bg2)"/><ellipse cx="54" cy="84" rx="24" ry="5" fill="url(#sh2)"/><path d="M50 16c16 0 26 26 26 44 0 16-12 26-26 26S24 76 24 60c0-18 10-44 26-44z" fill="url(#e1)"/><ellipse cx="42" cy="36" rx="5" ry="9" fill="#fff" opacity=".6"/>')},
// --- ここから下は仮絵自動生成（img を入れれば差し替わります） ---
{id:'banana',name:'バナナ',rank:'N',cat:'食べ物'},
{id:'cheese',name:'チーズ',rank:'N',cat:'食べ物'},
{id:'carrot',name:'にんじん',rank:'N',cat:'食べ物'},
{id:'meat',name:'おにく',rank:'N',cat:'食べ物'},
{id:'pig',name:'ぶた',rank:'N',cat:'動物'},
{id:'chick',name:'ひよこ',rank:'N',cat:'動物'},
{id:'frog',name:'かえる',rank:'N',cat:'動物'},
{id:'bear',name:'くま',rank:'N',cat:'動物'},
{id:'desk',name:'つくえ',rank:'N',cat:'家具'},
{id:'bed',name:'ベッド',rank:'N',cat:'家具'},
{id:'shelf',name:'たな',rank:'N',cat:'家具'},
{id:'clock',name:'とけい',rank:'N',cat:'家具'},
{id:'ramen',name:'ラーメン',rank:'R',cat:'食べ物'},
{id:'cake',name:'ケーキ',rank:'R',cat:'食べ物'},
{id:'burger',name:'ハンバーガー',rank:'R',cat:'食べ物'},
{id:'panda',name:'パンダ',rank:'R',cat:'動物'},
{id:'penguin',name:'ペンギン',rank:'R',cat:'動物'},
{id:'fox',name:'きつね',rank:'R',cat:'動物'},
{id:'bookshelf',name:'ほんだな',rank:'R',cat:'家具'},
{id:'dresser',name:'ドレッサー',rank:'R',cat:'家具'},
{id:'sushi',name:'おすし',rank:'SR',cat:'食べ物'},
{id:'lion',name:'ライオン',rank:'SR',cat:'動物'},
{id:'owl',name:'フクロウ',rank:'SR',cat:'動物'},
{id:'antique',name:'アンティークチェア',rank:'SR',cat:'家具'}
];

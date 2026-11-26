# 素材クレジット・ライセンス

このゲームの絵と写真（表の素材ガチャ 全3025種＋裏のAIクリッカー 全7454種）はすべて、以下の実在するフリー素材を使用しています。
どの素材がどこから来たかは `tools/asset-list.js`・`tools/photo-list.json`・`tools/pdq-list.json`・`tools/ai-list.json` と、ゲーム内の図鑑詳細・クレジット画面で確認できます。

| ランク | 素材 | 作者 | ライセンス | 配布元 | 改変 |
|---|---|---|---|---|---|
| N ドット絵（食べ物・動物） | Streamline Pixel | Streamline | CC BY 4.0 | https://github.com/webalys-hq/streamline-vectors | ドット化して色付け |
| N ドット絵（家具） | pixelarticons | Gerrit Halfmann | MIT | https://github.com/halfmage/pixelarticons | ドット化して色付け |
| N ドット絵（追加分） | Twemoji | Twitter, Inc. and other contributors | CC BY 4.0（グラフィック） | https://github.com/jdecked/twemoji | 18マスにドット化・減色・輪郭線 |
| R イラスト | Twemoji | Twitter, Inc. and other contributors | CC BY 4.0（グラフィック） | https://github.com/jdecked/twemoji | なし |
| R イラスト | Fluent Emoji（3D） | Microsoft Corporation | MIT | https://github.com/microsoft/fluentui-emoji | なし |
| SR 写真（動物） | Smithsonian's National Zoo & Conservation Biology Institute（撮影者は items.js の credit.author） | Smithsonian Institution | CC0 | https://www.si.edu/openaccess | 正方形に切り抜き・縮小 |
| SR 写真（家具・食器） | Cooper Hewitt, Smithsonian Design Museum（各作品ページは credit.url） | Smithsonian Institution | CC0 | https://www.si.edu/openaccess | 余白を足して正方形・縮小 |
| SR 写真（飛行機・宇宙船） | National Air and Space Museum（各収蔵品ページは credit.url） | Smithsonian Institution | CC0 | https://www.si.edu/openaccess | 余白を足して正方形・縮小 |
| SR 写真（植物・乗り物） | Open Images Dataset V4（Flickr の各撮影者。撮影者名と元ページは tools/photo-list.json とゲーム内クレジットに全件記載） | 各撮影者 | CC BY 2.0 | https://storage.googleapis.com/openimages/web/index.html | 正方形に切り抜き・縮小 |
| UR 有名な建物 | Google Landmarks Dataset v2（写真は Wikimedia Commons。撮影者・ライセンス・元ページは tools/photo-list.json とゲーム内クレジットに全件記載。CC BY / CC0 / PD のみ使用、SA は不使用） | 各撮影者 | CC BY 2.0〜4.0 ほか | https://github.com/cvdfoundation/google-landmark | 正方形に切り抜き・縮小 |
| UR 絵画 | Cooper Hewitt（広重・北斎・歌麿・春信・レンブラント・ゴッホ・ミレー・ピラネージ・ゴヤ）、Smithsonian American Art Museum（モラン・ビアスタット・スチュアート・チャーチ） | Smithsonian Institution | CC0 | https://www.si.edu/openaccess | 余白を足して正方形・縮小 |
| LR 偉人 | National Portrait Gallery（写真家・画家は items.js の credit.author、各作品ページは credit.url） | Smithsonian Institution | CC0 | https://www.si.edu/openaccess | 顔が入るよう正方形に切り抜き・縮小 |
| LR 日本の偉人 | パブリックドメインQ（https://publicdomainq.net/ 。「利用規約なし、クレジット不要、改変・再配布も可」。各作品の元ページは items.js の credit.url。絵画は狩野元秀・歌川国芳・月岡芳年） | ― | パブリックドメイン | https://publicdomainq.net/ | 正方形に切り抜き（写真）・余白を足して正方形（絵画）・縮小 |
| N・R・SR・SR+・UR・LR（追加分 2060種） | パブリックドメインQ（「利用規約なし、クレジット不要、改変・再配布も可」。各作品の元ページは tools/pdq-list.json と items.js の credit.url。N・R はフリーイラスト、SR・SR+ はフリー写真、UR は世界遺産の写真と名画（北斎・広重・国芳・芳年・川瀬巴水・吉田博・小原古邨・横山大観・モネ・ゴッホ・クリムトほか）、LR は歴史上の人物の写真・肖像画。実在の人物の写真は LR の偉人のみ） | ― | パブリックドメイン（CC0 の作品を含む） | https://publicdomainq.net/ | 正方形に切り抜き・縮小（N は 20マスにドット化・16色に減色）、10×10 のまとめ画像（images/atlas）に配置 |
| 裏：AIクリッカー（全7454種） | パブリックドメインQ のフリーAI画像（AI で作られた画像。各作品の元ページは tools/ai-list.json と ai-items.js。水着・暴力などの画像は除外） | ― | CC0・パブリックドメイン | https://publicdomainq.net/ | 正方形に切り抜き・縮小、10×10 のまとめ画像に配置 |
| UR 有名な乗り物 | National Air and Space Museum | Smithsonian Institution | CC0 | https://www.si.edu/openaccess | 余白を足して正方形・縮小 |
| SR 写真（食べ物） | Fruits-360 | Mihai Oltean, Horea Muresan | MIT | https://github.com/Horea94/fruit-images-dataset | 拡大 |

フォント：M PLUS Rounded 1c（SIL Open Font License 1.1、Google Fonts から読み込み）

取得元：npm パッケージ `@iconify-json/streamline-pixel`、`@iconify-json/pixelarticons`、`@twemoji/svg`、`@lobehub/fluent-emoji-3d`／Smithsonian Open Access の AWS 公開バケット（`smithsonian-open-access`）／Open Images の AWS 公開バケット（`open-images-dataset`）とメタデータ／Google Landmarks Dataset v2 の AWS 公開バケット（`google-landmark`）／GitHub `Horea94/fruit-images-dataset`

---

## MIT License（Fluent Emoji）

Copyright (c) Microsoft Corporation.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## MIT License（Fruits-360）

Copyright (c) 2017-2020 Mihai Oltean, Horea Muresan

（許諾文は上と同じ MIT License の本文）

## MIT License（pixelarticons）

Copyright (c) Gerrit Halfmann

（許諾文は上と同じ MIT License の本文）

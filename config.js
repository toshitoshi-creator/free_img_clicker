// バランス調整はこのファイルだけ触ればOK
const CONFIG = {
  // 排出率（%）
  RATE: { N: 70, R: 25, SR: 5 },

  // カプセル1個の値段 = BASE × (引いた回数+1)^POW
  // 目安（5タップ/秒）：自動クリック解放まで約1〜4分、コンプまで約10分〜1.5時間
  CAPSULE_BASE: 10,
  CAPSULE_POW: 1.5,
  MAX_DRAWS_PER_TICK: 50, // 1タップで引ける上限（フリーズ防止）

  // 倍率 = (1 + N種類数×N) × (1 + R種類数×R) × (1 + SR種類数×SR)
  // 最初の1枚で2倍、全36種コンプで約988倍
  MULT: { N: 1, R: 0.25, SR: 2 },

  // 自動クリック
  AUTO_UNLOCK: 20,        // 新規カード（種類数）がこの数に達したら解放
  AUTO_BASE_MS: 1000,     // 解放時の間隔
  AUTO_SHRINK: 0.9,       // 1種類増えるごとに間隔 ×0.9
  AUTO_MIN_MS: 50,        // 最短間隔

  SAVE_KEY: 'sozai-gacha-v2',
};

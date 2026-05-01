// デフォルトのテンプレートデータ
const defaultDeckA = {
  id: "deck-a",
  layers: [
    {
      id: "layer-a1",
      effectUrl: "effects/effect-0000-circle.html",
      blend: "normal",
      opacity: 1.0,
      params: {
        "size": 200,
        "color": "#00ffff", // シアン
        "audioReact": 0.5
      }
    }
  ]
};

const defaultDeckB = {
  id: "deck-b",
  layers: [
    {
      id: "layer-b1",
      effectUrl: "effects/effect-0000-circle.html",
      blend: "normal",
      opacity: 0.3, // 背景として薄く置く
      params: {
        "size": 600,
        "color": "#444444", // グレー
        "audioReact": 0.1
      }
    },
    {
      id: "layer-b2",
      effectUrl: "effects/effect-0000-circle.html",
      blend: "screen", // 加算合成で光らせる！
      opacity: 1.0,
      params: {
        "size": 150,
        "color": "#ff00aa", // マゼンタ
        "audioReact": 1.5   // 音に激しく反応
      }
    }
  ]
};

// 初回起動時の初期化処理（localStorageが空ならテンプレートを流し込む）
if (!localStorage.getItem('vj_deck-a')) {
  localStorage.setItem('vj_deck-a', JSON.stringify(defaultDeckA));
}
if (!localStorage.getItem('vj_deck-b')) {
  localStorage.setItem('vj_deck-b', JSON.stringify(defaultDeckB));
}
// storage.js
window.VJStorage = {
  decks: {},
  defaultDecks: {
    "deck-a": [
      {
        id: "group-a1",
        name: "Main Group",
        params: { scale: 1.0, color: "#000000", opacity: 1.0 },
        layers: [
          { id: "layer-a1", effectUrl: "effects/effect-0000-circle.html", name: "Circle A1", params: { "size": 200, "color": "#00ffff", "audioReact": 0.5 } }
        ]
      }
    ],
    "deck-b": [
      {
        id: "group-b1",
        name: "Background Group",
        params: { scale: 1.0, color: "#330033", opacity: 0.5 },
        layers: [
          { id: "layer-b1", effectUrl: "effects/effect-0000-circle.html", name: "Back Circle", params: { "size": 600, "color": "#444444", "audioReact": 0.1 } }
        ]
      }
    ]
  },

  init(deckIds) {
    deckIds.forEach(id => {
      const saved = localStorage.getItem(`vj_${id}`);
      if (saved) {
        let parsed = JSON.parse(saved);
        let data = parsed.groups || parsed;

        // 【マイグレーション】もしデータがグループ構造でなければ、グループで包む
        if (Array.isArray(data) && data.length > 0 && !data[0].layers) {
          data = [{
            id: "group-migrated",
            name: "Default Group",
            params: { scale: 1.0, color: "#000000", opacity: 1.0 },
            layers: data
          }];
        }
        this.decks[id] = data;
      } else {
        this.decks[id] = this.defaultDecks[id] || [];
        this.save(id);
      }
    });
  },

  save(deckId) {
    localStorage.setItem(`vj_${deckId}`, JSON.stringify({ id: deckId, groups: this.decks[deckId] }));
  },

  getDeck(deckId) {
    return this.decks[deckId] || [];
  },

  overwriteDeck(deckId, groups) {
    this.decks[deckId] = groups;
    this.save(deckId);
  },

  // ★ 修正箇所：引数の数（4個か5個か）を自動判定し、値の型を適切に変換して保存する
  updateParam(deckId, arg2, arg3, arg4, arg5) {
    const deck = this.decks[deckId];
    if (!deck) return;

    let groupId, layerId, paramId, value;

    // main.js の呼び出し方が 4引数(旧) か 5引数(新グループ版) かを判定
    if (arg5 !== undefined) {
      // 5引数の場合: deckId, groupId, layerId, paramId, value
      groupId = arg2;
      layerId = arg3;
      paramId = arg4;
      value = arg5;
    } else {
      // 4引数の場合: deckId, layerId, paramId, value
      layerId = arg2;
      paramId = arg3;
      value = arg4;
      // groupIDが渡されなかった場合、layerIdから所属するgroupを自動で探し出す
      const group = deck.find(g => g.layers && g.layers.some(l => l.id === layerId));
      if (!group) return; // レイヤーが見つからなければ終了
      groupId = group.id;
    }

    const group = deck.find(g => g.id === groupId);
    if (!group) return;

    // ★重要★ "200" のような文字列を Number(200) に変換。"Particle" 等の文字列はそのまま維持。
    const parsedValue = isNaN(value) || value === "" || typeof value === "boolean" ? value : Number(value);

    if (layerId === null || layerId === undefined) {
      // グループ全体のパラメータ更新
      if (!group.params) group.params = {};
      group.params[paramId] = parsedValue;
    } else {
      // 個別レイヤーのパラメータ更新
      const layer = group.layers.find(l => l.id === layerId);
      if (layer) {
        if (!layer.params) layer.params = {}; // paramsが空でも確実に作る
        layer.params[paramId] = parsedValue;
      }
    }
    
    this.save(deckId);
  }
};
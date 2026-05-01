// main.js
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('decks-container');
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  let deckIds = hashParams.getAll('d');
  
  if (deckIds.length === 0) deckIds = ['deck-a', 'deck-b'];

  VJStorage.init(deckIds);
  VJWs.init(handleIncomingMessage);
  deckIds.forEach(deckId => renderDeck(deckId));

  function handleIncomingMessage(msg) {
    if (msg.type === 'rebuild_layers') {
      VJStorage.overwriteDeck(msg.deckId, msg.layers);
      renderDeck(msg.deckId);
    } else if (msg.type === 'param_update') {
      const selector = msg.layerId 
        ? `input[data-deck="${msg.deckId}"][data-group="${msg.groupId}"][data-layer="${msg.layerId}"][data-param="${msg.paramId}"]`
        : `input[data-deck="${msg.deckId}"][data-group="${msg.groupId}"][data-param="${msg.paramId}"]`;
      
      const input = document.querySelector(selector);
      if (input && document.activeElement !== input) {
        input.value = msg.value;
      }
      VJStorage.updateParam(msg.deckId, msg.groupId, msg.layerId, msg.paramId, msg.value);
    }
  }

  function renderDeck(deckId) {
    let panel = document.getElementById(`panel-${deckId}`);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = `panel-${deckId}`;
      panel.className = 'deck-panel';
      container.appendChild(panel);
    }

    const groups = VJStorage.getDeck(deckId);
    panel.innerHTML = `
      <div class="deck-header">
        <span>${deckId.toUpperCase()}</span>
        <button class="btn btn-add" onclick="addGroup('${deckId}')">+ Group</button>
      </div>
      <div class="group-list" id="groups-${deckId}"></div>
    `;

    const groupContainer = panel.querySelector('.group-list');
    groups.forEach((group) => {
      groupContainer.appendChild(createGroupUI(deckId, group));
    });
  }

  async function refreshPresetLists() {
      try {
          const res = await fetch('/list_presets');
          const presets = await res.json(); // ['cool-vibe', 'glitch-city', ...]
      
          // 全てのプリセットセレクトボックスを更新
          document.querySelectorAll('.preset-select').forEach(select => {
              const currentVal = select.value;
              select.innerHTML = '<option value="">-- Preset --</option>' + 
                  presets.map(p => `<option value="${p}" ${p === currentVal ? 'selected' : ''}>${p}</option>`).join('');
          });
      } catch (e) { console.error("Preset list fetch failed", e); }
  }
  
  // プリセットロード関数の実体
  window.loadPreset = async (deckId, groupId, presetName) => {
      if (!presetName) return;
      try {
          const res = await fetch(`/load_preset/${presetName}`);
          const presetData = await res.json();
      
          // 指定したグループの内容をプリセットデータで置換
          const deck = VJStorage.decks[deckId];
          const idx = deck.findIndex(g => g.id === groupId);
          if (idx !== -1) {
              // IDは現在のものを維持しつつ、中身（layersやparams）を上書き
              presetData.id = groupId; 
              deck[idx] = presetData;
              
              VJStorage.save(deckId);
              window.syncDeck(deckId); // Viewerへ送信
              renderDeck(deckId);      // UI再描画
          }
      } catch (e) { console.error("Load preset error", e); }
  };

  function createGroupUI(deckId, group) {
    const div = document.createElement('div');
    div.className = 'group-item card'; // カード型のデザインに変更
    div.innerHTML = `
      <div class="group-header">
        <div class="group-info">
          <span class="fold-icon">▼</span>
          <input class="group-title" value="${group.name}" onchange="renameGroup('${deckId}', '${group.id}', this.value)">
        </div>
        <div class="group-actions">
          <select class="preset-select" onchange="loadPreset('${deckId}', '${group.id}', this.value)">
            <option value="">-- Preset --</option>
          </select>
          <button class="btn btn-save" onclick="savePreset('${deckId}', '${group.id}')">💾</button>
          <button class="btn btn-add" onclick="addLayer('${deckId}', '${group.id}')">+ L</button>
          <button class="btn btn-del" onclick="deleteGroup('${deckId}', '${group.id}')">×</button>
        </div>
      </div>
      <div class="group-content">
        <div class="group-master-params">
           <label>G-Scale</label>
           <input type="range" min="0.1" max="5.0" step="0.1" value="${group.params.scale}" 
             oninput="updateParamFromUI('${deckId}', '${group.id}', null, 'scale', this.value)">
           <label>G-Color (Modulo)</label>
           <input type="color" value="${group.params.color}" 
             oninput="updateParamFromUI('${deckId}', '${group.id}', null, 'color', this.value)">
        </div>
        <div class="layer-list" id="list-${deckId}-${group.id}"></div>
      </div>
    `;
    const list = div.querySelector('.layer-list');
    if (group.layers) {
      group.layers.forEach((layer, index) => {
        list.appendChild(createLayerUI(deckId, group.id, layer, index));
      });
    }
    return div;
  }

  function createLayerUI(deckId, groupId, layer, index) {
    const item = document.createElement('div'); // ここで item を定義
    item.className = 'layer-item';
    item.id = `ui-${deckId}-${layer.id}`;
    item.innerHTML = `
      <div class="layer-ctrl-bar" onclick="toggleFolder('${deckId}', '${layer.id}')">
        <span class="fold-icon">▶</span>
        <input class="layer-title" value="${layer.name || layer.id}" onclick="event.stopPropagation()" onchange="renameLayer('${deckId}', '${groupId}', '${layer.id}', this.value)">
        <button class="btn btn-move" onclick="event.stopPropagation(); moveLayer('${deckId}', '${groupId}', ${index}, -1)">▲</button>
        <button class="btn btn-move" onclick="event.stopPropagation(); moveLayer('${deckId}', '${groupId}', ${index}, 1)">▼</button>
        <button class="btn btn-del" onclick="event.stopPropagation(); deleteLayer('${deckId}', '${groupId}', '${layer.id}')">×</button>
      </div>
      <div class="layer-params" id="params-${deckId}-${layer.id}">Loading...</div>
    `;
    fetchParams(deckId, groupId, layer);
    return item; // 最後に return する
  }

  async function fetchParams(deckId, groupId, layer) {
      try {
          const res = await fetch(layer.effectUrl);
          const html = await res.text();
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const schemaEl = doc.getElementById('vj-schema');
          
          // --- 標準RGBAパラメータの定義 ---
          const standardParams = [
              { id: "baseR", label: "Color R", type: "range", min: 0, max: 255, step: 1, default: 0, midi: "Knob1-3" },
              { id: "baseG", label: "Color G", type: "range", min: 0, max: 255, step: 1, default: 255, midi: "Knob2-3" },
              { id: "baseB", label: "Color B", type: "range", min: 0, max: 255, step: 1, default: 255, midi: "Fader1-3" },
              { id: "baseA", label: "Alpha", type: "range", min: 0, max: 1, step: 0.01, default: 1.0, midi: "Fader2-3" }
          ];
        
          const customSchema = schemaEl ? JSON.parse(schemaEl.textContent) : [];
          const fullSchema = [...standardParams, ...customSchema];
        
          const pDiv = document.getElementById(`params-${deckId}-${layer.id}`);
          if (!pDiv) return;
          pDiv.innerHTML = '';
          
          fullSchema.forEach(p => {
              const row = document.createElement('div');
              row.className = 'param-row';
              const currentValue = layer.params[p.id] !== undefined ? layer.params[p.id] : p.default;
              
              const midiLabel = p.midi ? `<span class="midi-tag">${p.midi}</span>` : '';
              
              // --- 共通属性の定義 ---
              const commonAttrs = `
                  data-deck="${deckId}" data-group="${groupId}" data-layer="${layer.id}" data-param="${p.id}"
                  data-midi="${p.midi || ''}"
              `;
          
              let inputHtml = "";
              if (p.type === 'select') {
                  // プルダウンメニューの生成
                  const optionsHtml = p.options.map(opt => 
                      `<option value="${opt}" ${currentValue === opt ? 'selected' : ''}>${opt}</option>`
                  ).join('');
                  inputHtml = `
                      <select ${commonAttrs} 
                          onchange="updateParamFromUI('${deckId}', '${groupId}', '${layer.id}', '${p.id}', this.value)">
                          ${optionsHtml}
                      </select>`;
              } else {
                  // 通常のインプット（range等）の生成
                  inputHtml = `
                      <input type="${p.type}" 
                          min="${p.min||0}" max="${p.max||100}" step="${p.step||1}" 
                          value="${currentValue}"
                          ${commonAttrs}
                          oninput="updateParamFromUI('${deckId}', '${groupId}', '${layer.id}', '${p.id}', this.value)">`;
              }
            
              row.innerHTML = `<label>${p.label} ${midiLabel}</label>${inputHtml}`;
              pDiv.appendChild(row);
              
              if (layer.params[p.id] === undefined) {
                  layer.params[p.id] = p.default;
                  VJStorage.save(deckId);
              }
          });
      } catch(e) { console.error("Schema Load Error:", e); }
  }

  // --- Global API ---
  window.addGroup = (deckId) => {
    const g = { id: "group-"+Date.now(), name: "New Group", params: { scale: 1.0, color: "#000000", opacity: 1.0 }, layers: [] };
    VJStorage.decks[deckId].push(g);
    VJStorage.save(deckId);
    window.syncDeck(deckId);
    renderDeck(deckId);
  };

  window.deleteGroup = (deckId, groupId) => {
    if(!confirm("Delete group?")) return;
    VJStorage.decks[deckId] = VJStorage.decks[deckId].filter(g => g.id !== groupId);
    VJStorage.save(deckId);
    window.syncDeck(deckId);
    renderDeck(deckId);
  };

  window.addLayer = (deckId, groupId) => {
    const url = prompt("Effect URL:", "effects/effect-0000-circle.html");
    if(!url) return;
    const g = VJStorage.decks[deckId].find(g => g.id === groupId);
    if (g) {
      g.layers.push({ id: "layer-"+Date.now(), name: "New Layer", effectUrl: url, params: {} });
      VJStorage.save(deckId);
      window.syncDeck(deckId);
      renderDeck(deckId);
    }
  };

  window.renameGroup = (deckId, groupId, newName) => {
    const g = VJStorage.decks[deckId].find(g => g.id === groupId);
    if (g) {
      g.name = newName;
      VJStorage.save(deckId);
      window.syncDeck(deckId);
    }
  };

  window.renameLayer = (deckId, groupId, layerId, newName) => {
    const g = VJStorage.decks[deckId].find(g => g.id === groupId);
    if (g) {
      const l = g.layers.find(l => l.id === layerId);
      if (l) {
        l.name = newName;
        VJStorage.save(deckId);
        window.syncDeck(deckId);
      }
    }
  };

  window.deleteLayer = (deckId, groupId, layerId) => {
    if(!confirm("Delete layer?")) return;
    const g = VJStorage.decks[deckId].find(g => g.id === groupId);
    if (g) {
      g.layers = g.layers.filter(l => l.id !== layerId);
      VJStorage.save(deckId);
      window.syncDeck(deckId);
      renderDeck(deckId);
    }
  };

  window.moveLayer = (deckId, groupId, index, dir) => {
    const g = VJStorage.decks[deckId].find(g => g.id === groupId);
    if (!g) return;
    const arr = g.layers;
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= arr.length) return;
    [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    VJStorage.save(deckId);
    window.syncDeck(deckId);
    renderDeck(deckId);
  };

  window.toggleGroup = (deckId, groupId) => document.getElementById(`group-${deckId}-${groupId}`).classList.toggle('collapsed');
  window.toggleFolder = (d, l) => document.getElementById(`ui-${d}-${l}`).classList.toggle('expanded');

  window.updateParamFromUI = function(deckId, groupId, layerId, paramId, value) {
    // layerId が文字列 "null" で来る場合のケア
    const targetLayerId = (layerId === "null" || !layerId) ? null : layerId;

    // 1. WebSocket で全クライアント（特にViewer）へブロードキャスト
    VJWs.send({ 
      type: 'param_update', 
      deckId, 
      groupId, 
      layerId: targetLayerId, 
      paramId, 
      value 
    });

    // 2. ローカルストレージ(VJStorage)を更新
    // VJStorage.updateParam(deckId, groupId, layerId, paramId, value)
    VJStorage.updateParam(deckId, groupId, targetLayerId, paramId, value);

    // 3. (重要) iframeに対しても直接 postMessage を送る（反映漏れ防止）
    const iframe = document.querySelector(`iframe[data-deck="${deckId}"][data-layer="${layerId}"]`);
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'param_update', paramId, value }, '*');
    }
  };

  window.syncDeck = (deckId) => {
    VJWs.send({ type: 'rebuild_layers', deckId, layers: VJStorage.getDeck(deckId) });
  };

  document.getElementById('sync-btn').onclick = () => {
    deckIds.forEach(id => window.syncDeck(id));
  };


  window.savePreset = async (deckId, groupId) => {
    const group = VJStorage.decks[deckId].find(g => g.id === groupId);
    const presetName = prompt("Preset Name:", group.name);
    if (!presetName) return;

    try {
      const res = await fetch(`/save_preset/${presetName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(group)
      });
      if (res.ok) alert("Preset Saved!");
    } catch (e) { console.error(e); }
  };

  VJMidi.init();
});
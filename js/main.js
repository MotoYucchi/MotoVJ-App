// main.js
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('decks-container');
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  let deckIds = hashParams.getAll('d');
  
  if (deckIds.length === 0) deckIds = ['deck-a', 'deck-b'];

  VJStorage.init(deckIds);
  VJWs.init(handleIncomingMessage);
  deckIds.forEach(deckId => renderDeck(deckId));

  // === 起動時にプリセット・エフェクト一覧をロード ===
  refreshPresetLists();
  refreshEffectList();

  // === ブラウザ標準動作を抑制（VJコントローラー専用） ===
  // 右クリックメニューを無効化
  document.addEventListener('contextmenu', e => e.preventDefault());
  // タッチスワイプによるブラウザの戻る/進むを防止
  document.body.style.overscrollBehaviorX = 'none';
  document.body.style.touchAction = 'pan-y pinch-zoom';
  document.addEventListener('touchmove', e => {
    // 水平スワイプがブラウザナビゲーションを発火させないよう制御
    if (e.touches.length === 1) {
      const t = e.touches[0];
      if (t.clientX < 30 || t.clientX > window.innerWidth - 30) {
        e.preventDefault();
      }
    }
  }, { passive: false });

  // ====== Effect list cache ======
  let effectListCache = [];

  // ====== Incoming WS messages ======
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

  // ====== Render Deck ======
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
        <button class="btn btn-add" onclick="addGroup('${deckId}')">
          <img src="nt/icons/add-node.svg" alt="+"> Group
        </button>
      </div>
      <div class="group-list" id="groups-${deckId}"></div>
    `;

    const groupContainer = panel.querySelector('.group-list');
    groups.forEach((group, index) => {
      groupContainer.appendChild(createGroupUI(deckId, group, index));
    });

    // グループのドラッグ&ドロップ設定
    setupGroupDragDrop(deckId, groupContainer);
    // プリセット一覧を再投入
    refreshPresetLists();
  }

  // ====== Preset List ======
  async function refreshPresetLists() {
    try {
      const res = await fetch('/list_presets');
      const presets = await res.json();
      document.querySelectorAll('.preset-select').forEach(select => {
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- Preset --</option>' + 
          presets.map(p => `<option value="${p}" ${p === currentVal ? 'selected' : ''}>${p}</option>`).join('');
      });
    } catch (e) { console.error("Preset list fetch failed", e); }
  }

  // ====== Effect List ======
  async function refreshEffectList() {
    try {
      const res = await fetch('/list_effects');
      effectListCache = await res.json();
    } catch (e) { console.error("Effect list fetch failed", e); }
  }

  // ====== Load Preset ======
  window.loadPreset = async (deckId, groupId, presetName) => {
    if (!presetName) return;
    try {
      const res = await fetch(`/load_preset/${presetName}`);
      const presetData = await res.json();
      if (presetData.error) { alert("Preset not found"); return; }
      
      const deck = VJStorage.decks[deckId];
      const idx = deck.findIndex(g => g.id === groupId);
      if (idx !== -1) {
        presetData.id = groupId; 
        
        // 現在のグループのopacityを取得（設定されていなければ1.0とする）
        const currentOpacity = (deck[idx].params && deck[idx].params.opacity !== undefined) ? deck[idx].params.opacity : 1.0;
        
        if (!presetData.params) presetData.params = {};
        // プリセットのopacityを現在の値で必ず上書きする（プリセットに1が含まれていても無視）
        presetData.params.opacity = currentOpacity;

        deck[idx] = presetData;
        VJStorage.save(deckId);
        window.syncDeck(deckId);
        renderDeck(deckId);
      }
    } catch (e) { console.error("Load preset error", e); }
  };

  // ====== Save Preset ======
  window.savePreset = async (deckId, groupId) => {
    const group = VJStorage.decks[deckId].find(g => g.id === groupId);
    const presetName = prompt("Preset Name:", group.name);
    if (!presetName) return;

    // 保存用データを作成し、opacityは保存しないように削除する
    const groupToSave = JSON.parse(JSON.stringify(group));
    if (groupToSave.params && groupToSave.params.opacity !== undefined) {
      delete groupToSave.params.opacity;
    }

    try {
      const res = await fetch(`/save_preset/${presetName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupToSave)
      });
      if (res.ok) {
        alert("Preset Saved!");
        refreshPresetLists(); // 保存後に一覧を更新
      }
    } catch (e) { console.error(e); }
  };

  // ====== Create Group UI ======
  function createGroupUI(deckId, group, groupIndex) {
    const div = document.createElement('div');
    div.className = 'group-item collapsed';
    div.dataset.deckId = deckId;
    div.dataset.groupIndex = groupIndex;
    div.innerHTML = `
      <div class="group-header" onclick="toggleGroupCollapse(this)">
        <div class="group-drag-handle" title="ドラッグで移動" onclick="event.stopPropagation()">
          <img src="nt/icons/drag-handle.svg" alt="drag">
        </div>
        <img class="group-fold-icon" src="nt/icons/caret-button.svg" alt="fold">
        <div class="group-info">
          <input class="group-title" value="${group.name}" onclick="event.stopPropagation()" onchange="renameGroup('${deckId}', '${group.id}', this.value)">
        </div>
        <div class="group-actions" onclick="event.stopPropagation()">
          <select class="preset-select" onchange="loadPreset('${deckId}', '${group.id}', this.value)">
            <option value="">-- Preset --</option>
          </select>
          <button class="btn btn-icon" onclick="savePreset('${deckId}', '${group.id}')" title="プリセット保存">
            <img src="nt/icons/save.svg" alt="save">
          </button>
          <button class="btn btn-icon btn-add" onclick="showAddLayerModal('${deckId}', '${group.id}')" title="レイヤー追加">
            <img src="nt/icons/add-node.svg" alt="add">
          </button>
          <button class="btn btn-icon btn-del" onclick="deleteGroup('${deckId}', '${group.id}')" title="グループ削除">
            <img src="nt/icons/delete-node.svg" alt="del">
          </button>
        </div>
      </div>
      <div class="group-master-opacity" style="padding: 8px 12px; background: #262626; border-bottom: 1px solid #111; display: flex; align-items: center; gap: 10px;">
        <input type="color" value="${group.params.color}" class="group-color-mini"
          oninput="updateParamFromUI('${deckId}', '${group.id}', null, 'color', this.value)"
          title="G-Color (Modulo)">
        <label style="font-size: 11px; color: #ddd; white-space: nowrap; font-weight: bold;">Master Opacity</label>
        <input type="range" class="master-opacity-slider" min="0" max="1" step="0.01" value="${group.params.opacity !== undefined ? group.params.opacity : 1.0}" 
          data-deck="${deckId}" data-group="${group.id}" data-param="opacity"
          oninput="updateParamFromUI('${deckId}', '${group.id}', null, 'opacity', this.value)" style="flex: 1; cursor: pointer; accent-color: #00ffcc;">
      </div>
      <div class="group-content">
        <div class="group-master-params">
           <label>G-Scale</label>
           <input type="range" min="0.1" max="5.0" step="0.1" value="${group.params.scale}" 
             data-deck="${deckId}" data-group="${group.id}" data-param="scale"
             oninput="updateParamFromUI('${deckId}', '${group.id}', null, 'scale', this.value)">
        </div>
        <div class="layer-list" id="list-${deckId}-${group.id}"></div>
      </div>
    `;
    const list = div.querySelector('.layer-list');
    if (group.layers) {
      group.layers.forEach((layer, index) => {
        list.appendChild(createLayerUI(deckId, group.id, layer, index));
      });
      // レイヤーのドラッグ&ドロップ設定
      setupLayerDragDrop(deckId, group.id, list);
    }
    return div;
  }

  // ====== Create Layer UI ======
  function createLayerUI(deckId, groupId, layer, index) {
    const item = document.createElement('div');
    item.className = 'layer-item';
    item.id = `ui-${deckId}-${layer.id}`;
    item.dataset.deckId = deckId;
    item.dataset.groupId = groupId;
    item.dataset.layerIndex = index;
    item.innerHTML = `
      <div class="layer-ctrl-bar">
        <div class="layer-drag-handle" title="ドラッグで移動">
          <img src="nt/icons/drag-handle.svg" alt="drag">
        </div>
        <div class="layer-fold-btn" onclick="event.stopPropagation(); toggleFolder('${deckId}', '${layer.id}')" title="展開/縮小">
          <img class="layer-fold-icon" src="nt/icons/caret-button.svg" alt="fold">
        </div>
        <input class="layer-title" value="${layer.name || layer.id}" onclick="event.stopPropagation()" onchange="renameLayer('${deckId}', '${groupId}', '${layer.id}', this.value)">
        <button class="btn btn-icon" onclick="event.stopPropagation(); showLayerMenu(event, '${deckId}', '${groupId}', '${layer.id}')" title="メニュー">
          <img src="nt/icons/hamburger-menu.svg" alt="menu">
        </button>
      </div>
      <div class="layer-params" id="params-${deckId}-${layer.id}">Loading...</div>
    `;
    fetchParams(deckId, groupId, layer);
    return item;
  }

  // ====== Fetch Params (Effect Schema) ======
  async function fetchParams(deckId, groupId, layer) {
    try {
      const res = await fetch(layer.effectUrl);
      const pDiv = document.getElementById(`params-${deckId}-${layer.id}`);
      if (!res.ok) {
        if (pDiv) pDiv.innerHTML = `<div style="color:#ff6b6b;font-size:11px;padding:4px">⚠ Effect not found: ${layer.effectUrl}</div>`;
        return;
      }
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const schemaEl = doc.getElementById('vj-schema');
      
      const customSchema = schemaEl ? JSON.parse(schemaEl.textContent) : [];
      const fullSchema = customSchema;
    
      if (!pDiv) return;
      pDiv.innerHTML = '';
      
      if (fullSchema.length === 0) {
        pDiv.innerHTML = '<div style="color:#666;font-size:11px;padding:4px">No parameters</div>';
        return;
      }

      fullSchema.forEach(p => {
        const row = document.createElement('div');
        row.className = 'param-row';
        const currentValue = layer.params[p.id] !== undefined ? layer.params[p.id] : p.default;
        
        const midiLabel = p.midi ? `<span class="midi-tag">${p.midi}</span>` : '';
        
        const commonAttrs = `
            data-deck="${deckId}" data-group="${groupId}" data-layer="${layer.id}" data-param="${p.id}"
            data-midi="${p.midi || ''}"
        `;
    
        let inputHtml = "";
        if (p.type === 'select') {
          const optionsHtml = p.options.map(opt => 
            `<option value="${opt}" ${currentValue === opt ? 'selected' : ''}>${opt}</option>`
          ).join('');
          inputHtml = `
              <select ${commonAttrs} 
                  onchange="updateParamFromUI('${deckId}', '${groupId}', '${layer.id}', '${p.id}', this.value)">
                  ${optionsHtml}
              </select>`;
        } else {
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
    } catch(e) { 
      console.error("Schema Load Error:", e);
      if (pDiv) pDiv.innerHTML = `<div style="color:#ff6b6b;font-size:11px;padding:4px">⚠ Error: ${e.message}</div>`;
    }
  }

  // ====== Group Collapse Toggle ======
  window.toggleGroupCollapse = (headerEl) => {
    headerEl.closest('.group-item').classList.toggle('collapsed');
  };

  // ====== Layer Expand Toggle ======
  window.toggleFolder = (d, l) => {
    document.getElementById(`ui-${d}-${l}`).classList.toggle('expanded');
  };

  // ====== CRUD: Group ======
  window.addGroup = (deckId) => {
    const g = { id: "group-"+Date.now(), name: "New Group", params: { scale: 1.0, color: "#000000", opacity: 1.0 }, layers: [] };
    VJStorage.decks[deckId].push(g);
    VJStorage.save(deckId);
    window.syncDeck(deckId);
    renderDeck(deckId);
  };

  window.deleteGroup = (deckId, groupId) => {
    VJStorage.decks[deckId] = VJStorage.decks[deckId].filter(g => g.id !== groupId);
    VJStorage.save(deckId);
    window.syncDeck(deckId);
    renderDeck(deckId);
  };

  window.renameGroup = (deckId, groupId, newName) => {
    const g = VJStorage.decks[deckId].find(g => g.id === groupId);
    if (g) {
      g.name = newName;
      VJStorage.save(deckId);
      window.syncDeck(deckId);
    }
  };

  // ====== CRUD: Layer ======
  window.showAddLayerModal = (deckId, groupId) => {
    // Remove existing modal
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const options = effectListCache.map(eff => 
      `<option value="${eff.url}">${eff.name}</option>`
    ).join('');

    overlay.innerHTML = `
      <div class="modal-box">
        <h3>エフェクトを選択</h3>
        <select id="effect-select">
          ${options || '<option value="">-- エフェクトなし --</option>'}
        </select>
        <div class="modal-actions">
          <button class="btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn-add" onclick="confirmAddLayer('${deckId}', '${groupId}')">Add Layer</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  };

  window.confirmAddLayer = (deckId, groupId) => {
    const select = document.getElementById('effect-select');
    const url = select ? select.value : '';
    if (!url) return;
    const effectName = select.options[select.selectedIndex].text;

    const g = VJStorage.decks[deckId].find(g => g.id === groupId);
    if (g) {
      g.layers.push({ id: "layer-"+Date.now(), name: effectName, effectUrl: url, params: {} });
      VJStorage.save(deckId);
      window.syncDeck(deckId);
      renderDeck(deckId);
    }
    // Close modal
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.remove();
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
    const g = VJStorage.decks[deckId].find(g => g.id === groupId);
    if (g) {
      g.layers = g.layers.filter(l => l.id !== layerId);
      VJStorage.save(deckId);
      window.syncDeck(deckId);
      renderDeck(deckId);
    }
    // Close any open menus
    document.querySelectorAll('.layer-context-menu').forEach(m => m.remove());
  };

  // ====== Layer Duplicate (Hamburger Menu) ======
  window.showLayerMenu = (event, deckId, groupId, layerId) => {
    event.stopPropagation();
    // Remove existing context menus
    document.querySelectorAll('.layer-context-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'layer-context-menu';
    menu.style.left = event.clientX + 'px';
    menu.style.top = event.clientY + 'px';

    menu.innerHTML = `
      <div class="ctx-item" onclick="duplicateLayer('${deckId}', '${groupId}', '${layerId}')">
        <img src="nt/icons/add-node.svg" alt="copy"> レイヤーを複製
      </div>
      <div class="ctx-item ctx-danger" onclick="deleteLayer('${deckId}', '${groupId}', '${layerId}')">
        <img src="nt/icons/delete-node.svg" alt="del"> レイヤーを削除
      </div>
    `;

    document.body.appendChild(menu);

    // Reposition if off-screen
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 8) + 'px';

    // Close on click outside
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  };

  window.duplicateLayer = (deckId, groupId, layerId) => {
    const g = VJStorage.decks[deckId].find(g => g.id === groupId);
    if (!g) return;
    const layerIdx = g.layers.findIndex(l => l.id === layerId);
    if (layerIdx === -1) return;

    // Deep copy
    const original = g.layers[layerIdx];
    const clone = JSON.parse(JSON.stringify(original));
    clone.id = "layer-" + Date.now();
    clone.name = (clone.name || "Layer") + " Copy";

    // Insert after original
    g.layers.splice(layerIdx + 1, 0, clone);
    VJStorage.save(deckId);
    window.syncDeck(deckId);
    renderDeck(deckId);

    // Close context menu
    document.querySelectorAll('.layer-context-menu').forEach(m => m.remove());
  };

  // ====== Drag & Drop: Layers ======
  function setupLayerDragDrop(deckId, groupId, listEl) {
    let dragItem = null;

    listEl.querySelectorAll('.layer-drag-handle').forEach(handle => {
      // Touch events
      handle.addEventListener('touchstart', onDragStart, { passive: false });
      // Mouse events
      handle.addEventListener('mousedown', onDragStart);
    });

    function onDragStart(e) {
      e.preventDefault();
      e.stopPropagation();
      const layerItem = e.target.closest('.layer-item');
      if (!layerItem) return;
      dragItem = layerItem;
      dragItem.classList.add('dragging');

      const isTouch = e.type === 'touchstart';
      const moveEvent = isTouch ? 'touchmove' : 'mousemove';
      const endEvent = isTouch ? 'touchend' : 'mouseup';

      function onDragMove(ev) {
        ev.preventDefault();
        const clientY = isTouch ? ev.touches[0].clientY : ev.clientY;
        const siblings = [...listEl.querySelectorAll('.layer-item:not(.dragging)')];
        
        // Clear all drag-over indicators
        siblings.forEach(s => s.classList.remove('drag-over'));
        
        // Find closest sibling
        const closest = siblings.reduce((closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = clientY - box.top - box.height / 2;
          if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
          }
          return closest;
        }, { offset: Number.NEGATIVE_INFINITY });

        if (closest.element) {
          closest.element.classList.add('drag-over');
        }
      }

      function onDragEnd(ev) {
        document.removeEventListener(moveEvent, onDragMove);
        document.removeEventListener(endEvent, onDragEnd);

        const clientY = isTouch 
          ? (ev.changedTouches ? ev.changedTouches[0].clientY : 0)
          : ev.clientY;

        const siblings = [...listEl.querySelectorAll('.layer-item:not(.dragging)')];
        siblings.forEach(s => s.classList.remove('drag-over'));

        // Compute new index
        const g = VJStorage.decks[deckId].find(g => g.id === groupId);
        if (!g) return;
        
        const oldIndex = parseInt(dragItem.dataset.layerIndex);
        let newIndex = g.layers.length - 1; // default: end

        for (let i = 0; i < siblings.length; i++) {
          const box = siblings[i].getBoundingClientRect();
          if (clientY < box.top + box.height / 2) {
            newIndex = parseInt(siblings[i].dataset.layerIndex);
            if (newIndex > oldIndex) newIndex--;
            break;
          }
        }

        if (oldIndex !== newIndex && newIndex >= 0 && newIndex < g.layers.length) {
          const [moved] = g.layers.splice(oldIndex, 1);
          g.layers.splice(newIndex, 0, moved);
          VJStorage.save(deckId);
          window.syncDeck(deckId);
        }

        dragItem.classList.remove('dragging');
        dragItem = null;
        renderDeck(deckId);
      }

      document.addEventListener(moveEvent, onDragMove, { passive: false });
      document.addEventListener(endEvent, onDragEnd);
    }
  }

  // ====== Drag & Drop: Groups ======
  function setupGroupDragDrop(deckId, groupListEl) {
    let dragItem = null;

    groupListEl.querySelectorAll('.group-drag-handle').forEach(handle => {
      handle.addEventListener('touchstart', onDragStart, { passive: false });
      handle.addEventListener('mousedown', onDragStart);
    });

    function onDragStart(e) {
      e.preventDefault();
      e.stopPropagation();
      const groupItem = e.target.closest('.group-item');
      if (!groupItem) return;
      dragItem = groupItem;
      dragItem.classList.add('dragging');

      const isTouch = e.type === 'touchstart';
      const moveEvent = isTouch ? 'touchmove' : 'mousemove';
      const endEvent = isTouch ? 'touchend' : 'mouseup';

      function onDragMove(ev) {
        ev.preventDefault();
        const clientY = isTouch ? ev.touches[0].clientY : ev.clientY;
        const siblings = [...groupListEl.querySelectorAll('.group-item:not(.dragging)')];
        siblings.forEach(s => s.classList.remove('drag-over'));
        
        const closest = siblings.reduce((closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = clientY - box.top - box.height / 2;
          if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
          }
          return closest;
        }, { offset: Number.NEGATIVE_INFINITY });

        if (closest.element) {
          closest.element.classList.add('drag-over');
        }
      }

      function onDragEnd(ev) {
        document.removeEventListener(moveEvent, onDragMove);
        document.removeEventListener(endEvent, onDragEnd);

        const clientY = isTouch 
          ? (ev.changedTouches ? ev.changedTouches[0].clientY : 0)
          : ev.clientY;

        const siblings = [...groupListEl.querySelectorAll('.group-item:not(.dragging)')];
        siblings.forEach(s => s.classList.remove('drag-over'));

        const deck = VJStorage.decks[deckId];
        const oldIndex = parseInt(dragItem.dataset.groupIndex);
        let newIndex = deck.length - 1;

        for (let i = 0; i < siblings.length; i++) {
          const box = siblings[i].getBoundingClientRect();
          if (clientY < box.top + box.height / 2) {
            newIndex = parseInt(siblings[i].dataset.groupIndex);
            if (newIndex > oldIndex) newIndex--;
            break;
          }
        }

        if (oldIndex !== newIndex && newIndex >= 0 && newIndex < deck.length) {
          const [moved] = deck.splice(oldIndex, 1);
          deck.splice(newIndex, 0, moved);
          VJStorage.save(deckId);
          window.syncDeck(deckId);
        }

        dragItem.classList.remove('dragging');
        dragItem = null;
        renderDeck(deckId);
      }

      document.addEventListener(moveEvent, onDragMove, { passive: false });
      document.addEventListener(endEvent, onDragEnd);
    }
  }

  // ====== Param Update ======
  window.updateParamFromUI = function(deckId, groupId, layerId, paramId, value) {
    const targetLayerId = (layerId === "null" || !layerId) ? null : layerId;

    VJWs.send({ 
      type: 'param_update', 
      deckId, 
      groupId, 
      layerId: targetLayerId, 
      paramId, 
      value 
    });

    VJStorage.updateParam(deckId, groupId, targetLayerId, paramId, value);

    const iframe = document.querySelector(`iframe[data-deck="${deckId}"][data-layer="${layerId}"]`);
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'param_update', paramId, value }, '*');
    }
  };

  // ====== Sync ======
  window.syncDeck = (deckId) => {
    VJWs.send({ type: 'rebuild_layers', deckId, layers: VJStorage.getDeck(deckId) });
  };

  // ====== Force Sync Button ======
  document.getElementById('sync-btn').onclick = async () => {
    deckIds.forEach(id => window.syncDeck(id));
    // Force Sync 時にプリセット・エフェクトデータベースを更新
    refreshPresetLists();
    try {
      await fetch('/refresh_effect_list', { method: 'POST' });
    } catch(e) { console.error(e); }
    await refreshEffectList();
  };

  // ====== MIDI Init ======
  VJMidi.init();
});
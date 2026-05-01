// MotoVJ v3 — Properties Panel (Right Panel)
// Shows parameters of selected node with live editing
window.VJPropertiesPanel = (() => {
  let _container;
  let _currentNode = null;

  function init(container) {
    _container = container;
    if (!_container) return;

    const header = document.createElement('div');
    header.className = 'properties-header';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    
    const titleDiv = document.createElement('div');
    titleDiv.innerHTML = `<img src="icons/setting.svg" style="width:14px;height:14px;filter:brightness(0.6);vertical-align:middle;"> ${VJi18n.t('properties')}`;
    header.appendChild(titleDiv);
    
    const mapBtn = document.createElement('button');
    mapBtn.className = 'btn btn-sm btn-accent';
    mapBtn.innerHTML = '🔗 Map';
    mapBtn.style.padding = '2px 8px';
    mapBtn.onclick = () => { if(_currentNode) showMappingModal(_currentNode); };
    header.appendChild(mapBtn);
    
    _container.appendChild(header);

    const body = document.createElement('div');
    body.className = 'properties-body';
    body.id = 'properties-body';
    _container.appendChild(body);

    showEmpty();

    // Listen for selection changes
    VJBus.on('editor:selection', (node) => {
      _currentNode = node;
      if (node) showNode(node);
      else showEmpty();
    });

    // Listen for external param updates
    VJBus.on('graph:param:changed', ({ nodeId, paramId, value }) => {
      if (_currentNode?.id === nodeId) {
        const input = document.getElementById(`prop-${nodeId}-${paramId}`);
        if (input && document.activeElement !== input) {
          input.value = value;
          // Update value display
          const valEl = document.getElementById(`prop-val-${nodeId}-${paramId}`);
          if (valEl) valEl.textContent = formatValue(value);
        }
      }
    });
  }

  function showEmpty() {
    const body = document.getElementById('properties-body');
    if (!body) return;
    body.innerHTML = `<div class="properties-empty">${VJi18n.t('no_selection')}</div>`;
  }

  function showNode(node) {
    const body = document.getElementById('properties-body');
    if (!body) return;
    const def = VJNodeTypes.get(node.type);
    if (!def) { showEmpty(); return; }

    body.innerHTML = '';

    // Node title
    const titleWrap = document.createElement('div');
    titleWrap.className = 'properties-node-title';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.value = node.title || def.name;
    titleInput.addEventListener('change', () => {
      VJNodeGraph.setNodeTitle(node.id, titleInput.value);
    });
    titleWrap.appendChild(titleInput);
    body.appendChild(titleWrap);

    // Node info badge
    const infoBadge = document.createElement('div');
    infoBadge.style.cssText = 'padding:8px;display:flex;gap:6px;flex-wrap:wrap;';
    infoBadge.innerHTML = `
      <span class="badge badge-accent">${def.category}</span>
      <span class="badge" style="background:${def.color}30;color:${def.color}">${def.icon} ${def.name}</span>
    `;
    body.appendChild(infoBadge);

    // Parameters
    if (def.params && def.params.length > 0) {
      const group = document.createElement('div');
      group.className = 'prop-group';

      const groupTitle = document.createElement('div');
      groupTitle.className = 'prop-group-title';
      groupTitle.textContent = 'Parameters';
      group.appendChild(groupTitle);

      def.params.forEach(param => {
        const row = document.createElement('div');
        row.className = 'prop-row';

        const currentVal = node.params[param.id] ?? param.default ?? 0;

        if (param.type === 'range') {
          row.innerHTML = `
            <div class="prop-row-label">
              <span>${param.label}</span>
              <span class="prop-row-value" id="prop-val-${node.id}-${param.id}">${formatValue(currentVal)}</span>
            </div>
          `;
          const slider = document.createElement('input');
          slider.type = 'range';
          slider.id = `prop-${node.id}-${param.id}`;
          slider.min = param.min;
          slider.max = param.max;
          slider.step = param.step;
          slider.value = currentVal;

          slider.addEventListener('input', () => {
            const val = parseFloat(slider.value);
            VJNodeGraph.setNodeParam(node.id, param.id, val);
            const valEl = document.getElementById(`prop-val-${node.id}-${param.id}`);
            if (valEl) valEl.textContent = formatValue(val);
            // Send to server
            VJWs.send({
              type: 'node_param_update',
              nodeId: node.id,
              paramId: param.id,
              value: val,
            });
          });
          row.appendChild(slider);
        }
        else if (param.type === 'select') {
          row.innerHTML = `
            <div class="prop-row-label">
              <span>${param.label}</span>
            </div>
          `;
          const select = document.createElement('select');
          select.id = `prop-${node.id}-${param.id}`;
          (param.options || []).forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            option.selected = opt === currentVal;
            select.appendChild(option);
          });
          select.addEventListener('change', () => {
            VJNodeGraph.setNodeParam(node.id, param.id, select.value);
            VJWs.send({
              type: 'node_param_update',
              nodeId: node.id,
              paramId: param.id,
              value: select.value,
            });
          });
          row.appendChild(select);
        }
        else if (param.type === 'color') {
          row.innerHTML = `
            <div class="prop-row-label">
              <span>${param.label}</span>
            </div>
          `;
          const colorInput = document.createElement('input');
          colorInput.type = 'color';
          colorInput.id = `prop-${node.id}-${param.id}`;
          colorInput.value = currentVal || '#00ffff';
          colorInput.addEventListener('input', () => {
            VJNodeGraph.setNodeParam(node.id, param.id, colorInput.value);
            VJWs.send({
              type: 'node_param_update',
              nodeId: node.id,
              paramId: param.id,
              value: colorInput.value,
            });
          });
          row.appendChild(colorInput);
        }

        group.appendChild(row);
      });

      body.appendChild(group);
    }

    // Connections info
    const inputs = VJNodeGraph.getInputConnections(node.id);
    const outputs = VJNodeGraph.getOutputConnections(node.id);
    if (inputs.length > 0 || outputs.length > 0) {
      const connGroup = document.createElement('div');
      connGroup.className = 'prop-group';
      const connTitle = document.createElement('div');
      connTitle.className = 'prop-group-title';
      connTitle.textContent = 'Connections';
      connGroup.appendChild(connTitle);

      inputs.forEach(c => {
        const srcNode = VJNodeGraph.getNode(c.srcNode);
        const el = document.createElement('div');
        el.className = 'prop-row';
        el.innerHTML = `<div class="prop-row-label"><span>← ${srcNode?.title || c.srcNode}</span><span style="color:${VJNodeTypes.PORT_COLORS[c.type]}">${c.type}</span></div>`;
        connGroup.appendChild(el);
      });

      outputs.forEach(c => {
        const dstNode = VJNodeGraph.getNode(c.dstNode);
        const el = document.createElement('div');
        el.className = 'prop-row';
        el.innerHTML = `<div class="prop-row-label"><span>→ ${dstNode?.title || c.dstNode}</span><span style="color:${VJNodeTypes.PORT_COLORS[c.type]}">${c.type}</span></div>`;
        connGroup.appendChild(el);
      });

      body.appendChild(connGroup);
    }

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.style.cssText = 'width:100%;margin-top:16px;';
    deleteBtn.textContent = VJi18n.t('delete_node');
    deleteBtn.addEventListener('click', () => {
      VJNodeGraph.removeNode(node.id);
      _currentNode = null;
      showEmpty();
      VJNodeEditorCanvas.broadcastGraph();
    });
    body.appendChild(deleteBtn);
  }

  function formatValue(val) {
    if (typeof val === 'number') {
      return val % 1 === 0 ? val.toString() : val.toFixed(2);
    }
    return String(val);
  }

  function showMappingModal(node) {
    if (!window.VJMapping) return;
    const def = VJNodeTypes.get(node.type);
    if (!def || !def.params) return;

    let html = `<div style="font-size:13px;">`;
    const mappings = VJMapping.getMappingsForNode(node.id);
    
    html += `<h4>Current Mappings</h4><ul style="margin-top:8px;margin-bottom:12px;list-style:none;padding:0;">`;
    if (mappings.length === 0) html += `<li style="color:var(--text-muted)">No mappings.</li>`;
    mappings.forEach(m => {
      html += `<li style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border-subtle);">
        <span><strong>${m.targetParamId}</strong> ← ${m.sourceStr}</span>
        <button class="btn btn-sm btn-danger" onclick="window._rmMap('${m.id}')">X</button>
      </li>`;
    });
    html += `</ul><hr style="border-color:var(--border-subtle);margin:12px 0;">`;

    html += `<h4>Add Mapping</h4><select id="map-param-sel" class="prop-row" style="width:100%;margin-top:8px;margin-bottom:12px;background:var(--bg-input);color:white;border:1px solid var(--border-default);padding:6px;border-radius:4px;">`;
    def.params.forEach(p => {
      html += `<option value="${p.id}">${p.label}</option>`;
    });
    html += `</select>`;
    
    html += `<button class="btn btn-accent" style="width:100%" id="map-learn-btn">Learn (Move MIDI / Virtual Controller)</button>`;
    html += `<div id="map-learn-status" style="margin-top:8px;color:var(--accent-neon);display:none;text-align:center;">Waiting for input...</div>`;
    
    html += `<div id="map-range-setup" style="display:none;margin-top:12px;padding:12px;background:var(--bg-elevated);border-radius:6px;border:1px solid var(--border-subtle);">
               <div style="margin-bottom:8px;">Source: <strong id="map-src-lbl" style="color:var(--accent-neon);"></strong></div>
               <div style="display:flex;gap:12px;margin-top:8px;">
                 <label style="flex:1">In Min <input type="number" id="map-in-min" value="0" style="width:100%;margin-top:4px;background:var(--bg-input);color:white;border:1px solid var(--border-default);padding:4px;border-radius:4px;"></label>
                 <label style="flex:1">In Max <input type="number" id="map-in-max" value="127" style="width:100%;margin-top:4px;background:var(--bg-input);color:white;border:1px solid var(--border-default);padding:4px;border-radius:4px;"></label>
               </div>
               <div style="display:flex;gap:12px;margin-top:12px;" id="map-out-range-div">
                 <label style="flex:1">Out Min <input type="number" id="map-out-min" value="0" step="0.1" style="width:100%;margin-top:4px;background:var(--bg-input);color:white;border:1px solid var(--border-default);padding:4px;border-radius:4px;"></label>
                 <label style="flex:1">Out Max <input type="number" id="map-out-max" value="1" step="0.1" style="width:100%;margin-top:4px;background:var(--bg-input);color:white;border:1px solid var(--border-default);padding:4px;border-radius:4px;"></label>
               </div>
               <div id="map-enum-setup" style="display:none;margin-top:12px;">
               </div>
               <button class="btn btn-primary" style="width:100%;margin-top:16px;" id="map-save-btn">Save Mapping</button>
             </div>`;
    html += `</div>`;

    let modal;
    window._rmMap = (id) => { 
      VJMapping.removeMapping(id);
      modal.close();
      showMappingModal(node); 
    };

    modal = VJModal.show({ title: 'Mapping: ' + node.title, body: html, buttons: [{label: 'Close'}] });

    let detectedSource = null;
    
    document.getElementById('map-learn-btn').addEventListener('click', () => {
      const paramId = document.getElementById('map-param-sel').value;
      document.getElementById('map-learn-status').style.display = 'block';
      
      VJMapping.startLearn(node.id, paramId, (sourceStr) => {
        detectedSource = sourceStr;
        document.getElementById('map-learn-status').style.display = 'none';
        document.getElementById('map-range-setup').style.display = 'block';
        document.getElementById('map-src-lbl').textContent = sourceStr;
        
        const pDef = def.params.find(p => p.id === paramId);
        if (pDef.type === 'range') {
          document.getElementById('map-out-range-div').style.display = 'flex';
          document.getElementById('map-out-min').value = pDef.min;
          document.getElementById('map-out-max').value = pDef.max;
        } else if (pDef.type === 'select') {
          document.getElementById('map-out-range-div').style.display = 'none';
          const ed = document.getElementById('map-enum-setup');
          ed.style.display = 'block';
          ed.innerHTML = '<div style="margin-bottom:8px;font-weight:bold;">Enum Ranges (0-127)</div>';
          const step = Math.floor(128 / pDef.options.length);
          pDef.options.forEach((opt, i) => {
            const s = i * step;
            const e = i === pDef.options.length - 1 ? 127 : (s + step - 1);
            ed.innerHTML += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <input type="text" value="${s}-${e}" class="map-enum-rng" style="width:70px;background:var(--bg-input);color:white;border:1px solid var(--border-default);padding:4px;border-radius:4px;">
              <span>→ ${opt}</span>
            </div>`;
          });
        }
      });
    });

    document.getElementById('map-save-btn').addEventListener('click', () => {
      const paramId = document.getElementById('map-param-sel').value;
      const pDef = def.params.find(p => p.id === paramId);
      
      const mapObj = {
        id: 'map_' + Date.now(),
        sourceStr: detectedSource,
        targetNodeId: node.id,
        targetParamId: paramId,
      };

      if (pDef.type === 'range') {
        mapObj.type = 'number';
        mapObj.minIn = parseFloat(document.getElementById('map-in-min').value);
        mapObj.maxIn = parseFloat(document.getElementById('map-in-max').value);
        mapObj.minOut = parseFloat(document.getElementById('map-out-min').value);
        mapObj.maxOut = parseFloat(document.getElementById('map-out-max').value);
      } else if (pDef.type === 'select') {
        mapObj.type = 'enum';
        mapObj.ranges = [];
        const rngInputs = document.querySelectorAll('.map-enum-rng');
        pDef.options.forEach((opt, i) => {
          const parts = rngInputs[i].value.split('-');
          mapObj.ranges.push({ minIn: parseInt(parts[0]), maxIn: parseInt(parts[1]), val: opt });
        });
      }

      VJMapping.addMapping(mapObj);
      modal.close();
      VJToast.success('Mapping saved');
    });
  }

  return { init };
})();

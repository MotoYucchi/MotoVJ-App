// touch-mixer.js

let mixerDeckId = 'deck-a';
let deckGroups = [];
let connectionStatus = document.getElementById('status');

// ====== 荒ぶるフェーダー対策（ローカル操作中の同期無視） ======
document.addEventListener('pointerdown', e => {
  if (e.target.tagName === 'INPUT' && (e.target.type === 'range' || e.target.type === 'number')) {
    e.target.dataset.dragging = "true";
  }
});
document.addEventListener('pointerup', e => {
  document.querySelectorAll('input[data-dragging="true"]').forEach(el => el.dataset.dragging = "");
});
document.addEventListener('pointercancel', e => {
  document.querySelectorAll('input[data-dragging="true"]').forEach(el => el.dataset.dragging = "");
});

// HSL to Hex
function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Hex to Hue
function hexToHue(hex) {
  if (!hex || hex.length < 7 || hex === '#ffffff' || hex === '#000000') return 0;
  let r = parseInt(hex.substring(1,3), 16) / 255;
  let g = parseInt(hex.substring(3,5), 16) / 255;
  let b = parseInt(hex.substring(5,7), 16) / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    if (max === r) h = (60 * ((g - b) / (max - min)) + 360) % 360;
    else if (max === g) h = (60 * ((b - r) / (max - min)) + 120) % 360;
    else if (max === b) h = (60 * ((r - g) / (max - min)) + 240) % 360;
  }
  return Math.round(h);
}

function handleIncomingMessage(msg) {
  if (msg.type === 'rebuild_layers' && msg.deckId === mixerDeckId) {
    deckGroups = msg.layers;
    renderMixer();
    connectionStatus.textContent = 'Connected (Synced)';
    connectionStatus.style.color = '#66fcf1';
  } else if (msg.type === 'param_update' && msg.deckId === mixerDeckId && !msg.layerId) {
    // Update UI if param changed externally
    const hueSlider = document.querySelector(`.hue-fader[data-group="${msg.groupId}"]`);
    const opSlider = document.querySelector(`.opacity-fader[data-group="${msg.groupId}"]`);
    const whiteBtn = document.querySelector(`.color-btn[data-group="${msg.groupId}"]`);
    
    if (msg.paramId === 'opacity' && opSlider) {
      if (opSlider.dataset.dragging !== "true") opSlider.value = msg.value;
    } else if (msg.paramId === 'color' && hueSlider) {
      if (hueSlider.dataset.dragging !== "true") {
        if (msg.value.toLowerCase() === '#ffffff') {
          if (whiteBtn) whiteBtn.classList.add('active');
        } else {
          hueSlider.value = hexToHue(msg.value);
          if (whiteBtn) whiteBtn.classList.remove('active');
        }
      }
    }
    
    // Update internal state
    const group = deckGroups.find(g => g.id === msg.groupId);
    if (group) {
      if (!group.params) group.params = {};
      group.params[msg.paramId] = msg.value;
    }
  }
}

VJWs.init(handleIncomingMessage);

// Request sync after short delay to allow WS to connect
setTimeout(() => {
  VJWs.send({type: 'request_sync'});
}, 500);

function sendParam(groupId, paramId, value) {
  VJWs.send({
    type: 'param_update',
    deckId: mixerDeckId,
    groupId: groupId,
    layerId: null,
    paramId: paramId,
    value: value
  });
}

window.onHueChange = (groupId, hue) => {
  const hex = hslToHex(Number(hue), 100, 50);
  sendParam(groupId, 'color', hex);
  
  const whiteBtn = document.querySelector(`.color-btn[data-group="${groupId}"]`);
  if (whiteBtn) whiteBtn.classList.remove('active');
};

window.onOpacityChange = (groupId, opacity) => {
  sendParam(groupId, 'opacity', Number(opacity));
};

window.setWhiteColor = (groupId) => {
  sendParam(groupId, 'color', '#ffffff');
  const whiteBtn = document.querySelector(`.color-btn[data-group="${groupId}"]`);
  if (whiteBtn) whiteBtn.classList.add('active');
};

function renderMixer() {
  const container = document.getElementById('mixer-container');
  container.innerHTML = '';
  
  deckGroups.forEach(group => {
    const params = group.params || { opacity: 1.0, color: '#ffffff' };
    const opVal = params.opacity !== undefined ? params.opacity : 1.0;
    const colVal = params.color || '#ffffff';
    const isWhite = colVal.toLowerCase() === '#ffffff';
    const hueVal = isWhite ? 0 : hexToHue(colVal);

    const channel = document.createElement('div');
    channel.className = 'mixer-channel';
    
    channel.innerHTML = `
      <div class="channel-name" title="${group.name}">${group.name}</div>
      <div class="faders-row">
        <!-- Hue Fader Col -->
        <div class="fader-col">
          <div class="fader-label">HUE</div>
          <input type="range" class="v-slider hue-fader" min="0" max="360" step="1" value="${hueVal}" data-group="${group.id}" oninput="onHueChange('${group.id}', this.value)">
          <div class="color-btn ${isWhite ? 'active' : ''}" data-group="${group.id}" onclick="setWhiteColor('${group.id}')" title="Set White">
            <div style="width: 14px; height: 14px; background: #fff; border-radius: 50%; border: 1px solid #ccc;"></div>
          </div>
        </div>
        
        <!-- Opacity Fader Col -->
        <div class="fader-col">
          <div class="fader-label">OPAC</div>
          <input type="range" class="v-slider opacity-fader" min="0" max="1" step="0.01" value="${opVal}" data-group="${group.id}" oninput="onOpacityChange('${group.id}', this.value)">
        </div>
      </div>
    `;
    
    container.appendChild(channel);
  });
}

function changeRows(rows) {
  document.documentElement.style.setProperty('--fader-rows', rows);
  localStorage.setItem('motoVjTouchMixerRows', rows);
}

function changeAlign(align) {
  document.getElementById('mixer-container').style.justifyContent = align;
  localStorage.setItem('motoVjTouchMixerAlign', align);
}

document.addEventListener("DOMContentLoaded", () => {
  const savedRows = localStorage.getItem('motoVjTouchMixerRows') || 1;
  const selectRows = document.getElementById('row-select');
  if (selectRows) selectRows.value = savedRows;
  document.documentElement.style.setProperty('--fader-rows', savedRows);

  const savedAlign = localStorage.getItem('motoVjTouchMixerAlign') || 'start';
  const selectAlign = document.getElementById('align-select');
  if (selectAlign) selectAlign.value = savedAlign;
  document.getElementById('mixer-container').style.justifyContent = savedAlign;
});

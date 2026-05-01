// MotoVJ v3 — Virtual Controller
window.VJVirtualController = (() => {
  let _container;
  let _config = { tracks: 16, rows: 1, edgeMargin: false };
  let _active = false;
  let _fullscreen = false;

  function init() {
    _container = document.createElement('div');
    _container.id = 'vc-panel';
    document.getElementById('workspace').parentNode.insertBefore(_container, document.getElementById('statusbar'));

    const tb = document.getElementById('toolbar');
    const btnGroup = document.createElement('div');
    btnGroup.className = 'toolbar-group';
    btnGroup.innerHTML = `
      <div class="toolbar-separator"></div>
      <button class="btn btn-icon" id="tb-vc-toggle" title="Virtual Controller">
        <img src="icons/slider-thumb.svg" alt="VC">
      </button>
      <button class="btn btn-icon hidden" id="tb-vc-full" title="Fullscreen VC">
        <img src="icons/zoom-fit.svg" alt="Full" style="width:14px;">
      </button>
      <button class="btn btn-icon hidden" id="tb-vc-settings" title="VC Settings">
        <img src="icons/setting.svg" alt="VC Set">
      </button>
    `;
    tb.insertBefore(btnGroup, tb.querySelector('.toolbar-spacer'));

    document.getElementById('tb-vc-toggle').addEventListener('click', toggle);
    document.getElementById('tb-vc-full').addEventListener('click', toggleFullscreen);
    document.getElementById('tb-vc-settings').addEventListener('click', openSettings);

    const savedCfg = VJStorage.get('vc_config');
    if (savedCfg) _config = savedCfg;

    render();
  }

  function toggle() {
    _active = !_active;
    _container.className = _fullscreen ? 'active fullscreen' : (_active ? 'active' : '');
    document.getElementById('tb-vc-full').classList.toggle('hidden', !_active);
    document.getElementById('tb-vc-settings').classList.toggle('hidden', !_active);
    if (!_active && _fullscreen) toggleFullscreen();
  }

  function toggleFullscreen() {
    _fullscreen = !_fullscreen;
    _container.className = _fullscreen ? 'active fullscreen' : (_active ? 'active' : '');
  }

  function openSettings() {
    VJModal.show({
      title: 'Virtual Controller Settings',
      body: `
        <div style="font-size:14px;color:var(--text-primary);">
          <label style="display:block;margin-bottom:8px;">Columns (8-256)
            <input type="number" id="vc-cfg-tracks" value="${_config.tracks}" min="8" max="256" style="width:100%;margin-top:4px;background:var(--bg-input);color:white;border:1px solid var(--border-default);padding:4px;border-radius:4px;">
          </label>
          <label style="display:block;margin-bottom:8px;">Rows (1-3)
            <input type="number" id="vc-cfg-rows" value="${_config.rows}" min="1" max="3" style="width:100%;margin-top:4px;background:var(--bg-input);color:white;border:1px solid var(--border-default);padding:4px;border-radius:4px;">
          </label>
          <label style="display:flex;align-items:center;margin-top:16px;gap:8px;cursor:pointer;">
            <input type="checkbox" id="vc-cfg-margin" ${ _config.edgeMargin ? 'checked' : '' }>
            左右に1列分の余白を作る（ケース干渉対策）
          </label>
        </div>
      `,
      buttons: [
        { label: 'Cancel' },
        { label: 'Apply', class: 'btn-primary', action: () => {
            _config.tracks = parseInt(document.getElementById('vc-cfg-tracks').value) || 16;
            _config.rows = parseInt(document.getElementById('vc-cfg-rows').value) || 1;
            _config.edgeMargin = document.getElementById('vc-cfg-margin').checked;
            VJStorage.set('vc_config', _config);
            render();
          }
        }
      ]
    });
  }

  function render() {
    _container.innerHTML = '';
    _container.className = _fullscreen ? 'active fullscreen' : (_active ? 'active' : '');

    if (_config.edgeMargin) {
      _container.style.paddingLeft = '4rem';
      _container.style.paddingRight = '4rem';
    } else {
      _container.style.paddingLeft = '0';
      _container.style.paddingRight = '0';
    }

    for(let r=0; r<_config.rows; r++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'vc-row';
      for(let i=0; i<_config.tracks; i++) {
         const t = r * _config.tracks + i;
         rowDiv.appendChild(createTrack(t));
      }
      _container.appendChild(rowDiv);
    }
  }

  function createTrack(idx) {
    const el = document.createElement('div');
    el.className = 'vc-track';
    
    el.innerHTML = `
      <div class="vc-track-label">CH ${idx+1}</div>
      <input type="range" class="vc-knob-input" min="0" max="127" value="0" title="Knob ${idx+1}">
      <button class="vc-toggle-btn" title="Toggle ${idx+1}"></button>
      <input type="range" class="vc-fader-input" min="0" max="127" value="0" orient="vertical" title="Fader ${idx+1}">
    `;

    const knobIn = el.querySelector('.vc-knob-input');
    const faderIn = el.querySelector('.vc-fader-input');
    const togBtn = el.querySelector('.vc-toggle-btn');

    knobIn.addEventListener('input', () => VJBus.emit('vc:input', { track: idx, type: 'knob', value: parseInt(knobIn.value) }));
    faderIn.addEventListener('input', () => VJBus.emit('vc:input', { track: idx, type: 'fader', value: parseInt(faderIn.value) }));
    
    togBtn.addEventListener('click', () => {
      togBtn.classList.toggle('active');
      VJBus.emit('vc:input', { track: idx, type: 'toggle', value: togBtn.classList.contains('active') ? 127 : 0 });
    });

    return el;
  }

  return { init };
})();

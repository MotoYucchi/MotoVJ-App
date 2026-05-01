// MotoVJ v3 — Toolbar
window.VJToolbar = (() => {
  function init() {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) return;

    toolbar.innerHTML = `
      <div class="toolbar-brand">
        <span class="toolbar-brand-name">MotoVJ</span>
        <span class="toolbar-brand-version">v3</span>
      </div>

      <div class="toolbar-group">
        <button class="btn btn-icon" id="tb-save" title="${VJi18n.t('save')}">
          <img src="icons/save.svg" alt="Save">
        </button>
        <button class="btn btn-icon" id="tb-load" title="${VJi18n.t('load')}">
          <img src="icons/load.svg" alt="Load">
        </button>
        <button class="btn btn-icon" id="tb-preset" title="${VJi18n.t('preset_save')}">
          <img src="icons/preset.svg" alt="Preset">
        </button>
        <button class="btn btn-icon" id="tb-sync" title="Force Sync to Viewer">
          <span style="font-weight:bold;color:var(--accent-neon);font-size:11px;padding:0 4px;">SYNC</span>
        </button>
      </div>

      <div class="toolbar-separator"></div>

      <div class="toolbar-group">
        <button class="btn btn-icon" id="tb-zoom-in" title="${VJi18n.t('zoom_in')}">
          <img src="icons/zoom-in.svg" alt="Zoom In">
        </button>
        <button class="btn btn-icon" id="tb-zoom-out" title="${VJi18n.t('zoom_out')}">
          <img src="icons/zoom-out.svg" alt="Zoom Out">
        </button>
        <button class="btn btn-icon" id="tb-zoom-fit" title="${VJi18n.t('zoom_fit')}">
          <img src="icons/zoom-fit.svg" alt="Fit">
        </button>
      </div>

      <div class="toolbar-separator"></div>

      <div class="toolbar-group">
        <button class="btn btn-sm btn-ghost" id="tb-audio">
          <img src="icons/audio-off.svg" alt="Audio" style="width:14px;height:14px;filter:brightness(0.8)">
          <span id="tb-audio-label">Audio</span>
        </button>
      </div>

      <div class="toolbar-spacer"></div>

      <div class="toolbar-status">
        <span class="toolbar-status-dot" id="tb-ws-dot"></span>
        <span id="tb-ws-status">WS</span>
        <span id="tb-fps">-- FPS</span>
        <span id="tb-node-count">0 nodes</span>
      </div>

      <div class="toolbar-separator"></div>

      <button class="btn btn-icon" id="tb-settings" title="${VJi18n.t('settings')}">
        <img src="icons/setting.svg" alt="Settings">
      </button>
    `;

    // Event handlers
    document.getElementById('tb-save')?.addEventListener('click', () => {
      VJNodeEditorCanvas.saveGraph();
    });

    document.getElementById('tb-sync')?.addEventListener('click', () => {
      if(window.VJNodeEditorCanvas) {
        VJNodeEditorCanvas.broadcastGraph();
        VJToast.success('Forced Sync to Viewer');
      }
    });

    document.getElementById('tb-load')?.addEventListener('click', async () => {
      // Load from server
      try {
        const res = await fetch('/api/graph');
        const data = await res.json();
        if (data && (data.nodes || data.connections)) {
          VJNodeGraph.deserialize(data);
          VJToast.success(VJi18n.t('graph_loaded'));
        }
      } catch (e) {
        VJToast.error('Load failed');
      }
    });

    document.getElementById('tb-preset')?.addEventListener('click', async () => {
      const name = await VJModal.prompt(VJi18n.t('preset_name'), 'My Preset');
      if (name) {
        const data = VJNodeGraph.serialize();
        try {
          await fetch(`/api/presets/${encodeURIComponent(name)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          VJToast.success(VJi18n.t('preset_saved'));
        } catch (e) {
          VJToast.error('Save failed');
        }
      }
    });

    document.getElementById('tb-zoom-fit')?.addEventListener('click', () => {
      VJNodeEditorCanvas.zoomToFit();
    });

    document.getElementById('tb-audio')?.addEventListener('click', () => {
      VJBus.emit('audio:toggle');
    });

    document.getElementById('tb-settings')?.addEventListener('click', () => {
      VJModal.show({
        title: VJi18n.t('settings'),
        body: `
          <div style="color:var(--text-secondary);font-size:14px;line-height:1.5;">
            <p>※ Virtual Controller や MIDI Mapping機能は今後のアップデートで追加予定です。</p>
            <div style="margin-top:16px;">
              <label>${VJi18n.t('language') || 'Language'}</label>
              <select id="setting-lang" style="width:100%;margin-top:4px;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);color:white;border-radius:4px;">
                <option value="ja" ${VJi18n.getLang() === 'ja' ? 'selected' : ''}>日本語</option>
                <option value="en" ${VJi18n.getLang() === 'en' ? 'selected' : ''}>English</option>
              </select>
            </div>
            <div style="margin-top:16px;">
              <label>${VJi18n.t('ui_scale') || 'UI Scale'}</label>
              <input type="range" id="setting-uiscale" min="0.5" max="1.5" step="0.1" value="1" style="width:100%;margin-top:8px;">
            </div>
          </div>
        `,
        buttons: [{ label: 'Close', class: 'btn-primary' }]
      });
      
      document.getElementById('setting-lang')?.addEventListener('change', (e) => {
        VJi18n.setLang(e.target.value);
        window.location.reload();
      });
      
      document.getElementById('setting-uiscale')?.addEventListener('input', (e) => {
        document.documentElement.style.fontSize = `${16 * e.target.value}px`;
      });
    });

    // Status updates
    VJBus.on('ws:connected', () => {
      const dot = document.getElementById('tb-ws-dot');
      if (dot) { dot.classList.remove('offline'); }
      const label = document.getElementById('tb-ws-status');
      if (label) label.textContent = 'WS ✓';
    });

    VJBus.on('ws:disconnected', () => {
      const dot = document.getElementById('tb-ws-dot');
      if (dot) { dot.classList.add('offline'); }
      const label = document.getElementById('tb-ws-status');
      if (label) label.textContent = 'WS ✕';
    });

    // FPS counter
    let frameCount = 0;
    let lastFpsTime = performance.now();
    const fpsEl = document.getElementById('tb-fps');
    const nodeCountEl = document.getElementById('tb-node-count');

    setInterval(() => {
      const now = performance.now();
      const fps = Math.round(frameCount / ((now - lastFpsTime) / 1000));
      if (fpsEl) fpsEl.textContent = `${fps} FPS`;
      if (nodeCountEl) nodeCountEl.textContent = `${VJNodeGraph.getNodesArray().length} nodes`;
      frameCount = 0;
      lastFpsTime = now;
    }, 1000);

    // Count frames via requestAnimationFrame
    function countFrame() { frameCount++; requestAnimationFrame(countFrame); }
    requestAnimationFrame(countFrame);
  }

  return { init };
})();

// MotoVJ v3 — App Initializer
window.VJApp = {
  init() {
    console.log('🚀 MotoVJ v3 starting...');

    // 1. i18n
    VJi18n.init();

    // 2. UI infrastructure
    VJToast.init();
    VJModal.init();
    VJContextMenu.init();

    // 3. Core services
    VJWs.init();
    if(window.VJMapping) VJMapping.init();

    // 4. Toolbar
    VJToolbar.init();

    // 5. Node Palette (left panel)
    VJNodePalette.init(document.getElementById('node-palette'));

    // 6. Properties Panel (right panel)
    VJPropertiesPanel.init(document.getElementById('properties-panel'));

    // 7. Node Editor Canvas
    VJNodeEditorCanvas.init(document.getElementById('node-editor-canvas'));

    // 8. Audio
    VJAudio.init();

    // 9. MIDI
    VJMidi.init();

    // 9.5 Virtual Controller
    if(window.VJVirtualController) VJVirtualController.init();

    // 10. Status bar
    this._initStatusBar();

    // 11. Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        VJNodeEditorCanvas.saveGraph();
      }
    });

    // 12. Local execution loop (for Monitor node and Controller previews)
    function loop(now) {
      requestAnimationFrame(loop);
      if (window.VJ) window.VJ.updateTime(now);
      if (window.VJNodeExecutor) VJNodeExecutor.execute();
    }
    requestAnimationFrame(loop);

    console.log('✅ MotoVJ v3 ready');
    VJToast.info(VJi18n.t('ready'));
  },

  _initStatusBar() {
    const bar = document.getElementById('statusbar');
    if (!bar) return;
    bar.innerHTML = `
      <div class="statusbar-item">
        <span>MotoVJ v3.0</span>
      </div>
      <div class="statusbar-item">
        <span id="sb-audio-status">Audio: Off</span>
      </div>
      <div class="statusbar-item">
        <span id="sb-node-count">0 nodes</span>
      </div>
      <div class="statusbar-item">
        <span id="sb-conn-count">0 connections</span>
      </div>
    `;

    VJBus.on('audio:started', () => {
      const el = document.getElementById('sb-audio-status');
      if (el) el.innerHTML = '<span class="accent">Audio: Active</span>';
    });
    VJBus.on('audio:stopped', () => {
      const el = document.getElementById('sb-audio-status');
      if (el) el.textContent = 'Audio: Off';
    });

    setInterval(() => {
      const nc = document.getElementById('sb-node-count');
      const cc = document.getElementById('sb-conn-count');
      if (nc) nc.textContent = `${VJNodeGraph.getNodesArray().length} nodes`;
      if (cc) cc.textContent = `${VJNodeGraph.getConnectionsArray().length} conns`;
    }, 1000);
  }
};

document.addEventListener('DOMContentLoaded', () => VJApp.init());

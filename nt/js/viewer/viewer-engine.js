// MotoVJ v3 — Viewer Engine
// Receives graph + audio via WebSocket, executes node graph, renders to canvas
(function() {
  'use strict';

  console.log('🎬 MotoVJ v3 Viewer Engine starting...');

  const mainCanvas = document.getElementById('main-canvas');
  const mainCtx = mainCanvas.getContext('2d', { alpha: true, desynchronized: true });

  let canvasW = window.innerWidth;
  let canvasH = window.innerHeight;

  function resize() {
    canvasW = window.innerWidth;
    canvasH = window.innerHeight;
    mainCanvas.width = canvasW;
    mainCanvas.height = canvasH;
    VJNodeExecutor.resize(canvasW, canvasH);
  }
  window.addEventListener('resize', resize);
  resize();

  // ── Load graph from localStorage ──
  try {
    const raw = localStorage.getItem('vjv3_graph');
    if (raw) {
      const data = JSON.parse(raw);
      VJNodeGraph.deserialize(data);
    }
  } catch (e) { console.error('Graph load error:', e); }

  // ── Visibility tracking ──
  let isVisible = true;
  document.addEventListener('visibilitychange', () => { isVisible = !document.hidden; });

  // ── Render Loop ──
  function renderLoop(timestamp) {
    requestAnimationFrame(renderLoop);
    if (!isVisible) return;

    VJ.updateTime(timestamp);

    // Execute node graph
    VJNodeExecutor.execute();

    // Composite output nodes onto main canvas
    mainCtx.clearRect(0, 0, canvasW, canvasH);

    const filter = window.location.hash.includes('d=deck-a') ? 'a' :
                   window.location.hash.includes('d=deck-b') ? 'b' : null;

    const outputNodes = VJNodeGraph.getOutputNodes();
    for (const node of outputNodes) {
      const deck = node._deck || 'none';
      if (filter && deck !== 'none' && deck !== filter) continue;

      const finalCanvas = VJNodeExecutor.getOutput(node.id, '_final');
      if (finalCanvas) {
        mainCtx.globalAlpha = node._opacity ?? 1;
        mainCtx.drawImage(finalCanvas, 0, 0);
      }
    }
    mainCtx.globalAlpha = 1;
  }
  requestAnimationFrame(renderLoop);

  // ── Audio throttle ──
  let lastAudioTime = 0;
  const AUDIO_INTERVAL = 1000 / 30;

  // ── WebSocket ──
  let ws = null;
  let reconnectTimer = null;
  let reconnectDelay = 1000;

  function connectWS() {
    try { ws = new WebSocket(`ws://${location.host}/ws`); }
    catch (e) { scheduleReconnect(); return; }

    ws.onopen = () => {
      console.log('🔌 Viewer WS connected');
      reconnectDelay = 1000;
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === 'audio_data') {
          const now = performance.now();
          if (now - lastAudioTime < AUDIO_INTERVAL) return;
          lastAudioTime = now;
          VJ.updateAudio(msg);
          return;
        }

        if (msg.type === 'beat') {
          VJ.beat = 1.0;
          return;
        }

        if (msg.type === 'graph_sync' || msg.type === 'graph_update') {
          const graphData = msg.graph || msg.nodes;
          if (graphData) {
            VJNodeGraph.deserialize(graphData);
            localStorage.setItem('vjv3_graph', JSON.stringify(graphData));
          }
          return;
        }

        if (msg.type === 'node_param_update') {
          const node = VJNodeGraph.getNode(msg.nodeId);
          if (node) {
            node.params[msg.paramId] = msg.value;
          }
          return;
        }
      } catch (err) { console.error('Viewer Error:', err); }
    };

    ws.onclose = () => { scheduleReconnect(); };
    ws.onerror = () => {};
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      connectWS();
      reconnectDelay = Math.min(reconnectDelay * 1.5, 15000);
    }, reconnectDelay);
  }

  connectWS();
})();

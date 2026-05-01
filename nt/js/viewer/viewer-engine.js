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

  // ── Deck filter from URL hash ──
  function getDeckFilter() {
    const hash = window.location.hash || '';
    if (hash.includes('d=deck-a')) return 'a';
    if (hash.includes('d=deck-b')) return 'b';
    return null;
  }

  // ── Load graph: try REST API first, then localStorage fallback ──
  async function loadInitialGraph() {
    // Try REST API (server always has the latest)
    try {
      const res = await fetch('/api/graph');
      if (res.ok) {
        const data = await res.json();
        if (data && (data.nodes && Object.keys(data.nodes).length > 0)) {
          VJNodeGraph.deserialize(data);
          console.log('📦 Graph loaded from REST API:', Object.keys(data.nodes).length, 'nodes');
          return;
        }
      }
    } catch (e) {
      console.warn('REST graph fetch failed:', e);
    }

    // Fallback: localStorage
    try {
      const raw = localStorage.getItem('vjv3_graph');
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.nodes) {
          VJNodeGraph.deserialize(data);
          console.log('📦 Graph loaded from localStorage:', Object.keys(data.nodes).length, 'nodes');
        }
      }
    } catch (e) {
      console.error('localStorage graph load error:', e);
    }
  }
  loadInitialGraph();

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

    const filter = getDeckFilter();
    const outputNodes = VJNodeGraph.getOutputNodes();

    for (const node of outputNodes) {
      const deck = node._deck || node.params?.deck || 'none';

      // Deck filter: skip nodes assigned to a different deck
      if (filter && deck !== 'none' && deck !== filter) continue;

      const finalCanvas = VJNodeExecutor.getOutput(node.id, '_final');
      if (finalCanvas) {
        mainCtx.globalAlpha = node._opacity ?? node.params?.opacity ?? 1;
        mainCtx.drawImage(finalCanvas, 0, 0, canvasW, canvasH);
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
          const graphData = msg.graph;
          if (graphData && graphData.nodes) {
            VJNodeGraph.deserialize(graphData);
            localStorage.setItem('vjv3_graph', JSON.stringify(graphData));
            console.log('🔄 Graph synced via WS:', Object.keys(graphData.nodes).length, 'nodes');
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
      } catch (err) { console.error('Viewer WS Error:', err); }
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

// MotoVJ v3 — Node Editor Canvas
// Canvas-based visual node graph editor with drag, pan, zoom, touch support
window.VJNodeEditorCanvas = (() => {
  let _canvas, _ctx;
  let _panX = 0, _panY = 0, _zoom = 1;
  let _selectedNode = null;
  let _hoveredNode = null;
  let _hoveredPort = null;
  let _dragging = null;        // { type: 'node'|'pan'|'connect'|'select', ... }
  let _connecting = null;      // { srcNode, srcPort, srcType, mx, my }
  let _selectionBox = null;    // { x1, y1, x2, y2 }
  let _multiSelected = new Set();
  let _animFrame = null;
  let _spacePressed = false;

  // Node visual constants
  const NODE_W = 160;
  const NODE_HEADER_H = 28;
  const NODE_PORT_H = 20;
  const NODE_PORT_R = 6;
  const NODE_RADIUS = 8;
  const NODE_PAD = 8;

  const PORT_COLORS = VJNodeTypes.PORT_COLORS;

  // ── Coordinate transforms ──
  function screenToWorld(sx, sy) {
    return { x: (sx - _panX) / _zoom, y: (sy - _panY) / _zoom };
  }
  function worldToScreen(wx, wy) {
    return { x: wx * _zoom + _panX, y: wy * _zoom + _panY };
  }

  // ── Node dimensions ──
  function getNodeHeight(node) {
    const def = VJNodeTypes.get(node.type);
    if (!def) return NODE_HEADER_H;
    const portCount = Math.max((def.inputs || []).length, (def.outputs || []).length);
    return NODE_HEADER_H + Math.max(portCount, 1) * NODE_PORT_H + NODE_PAD;
  }

  function getPortPos(node, portId, isInput) {
    const def = VJNodeTypes.get(node.type);
    if (!def) return null;
    const ports = isInput ? (def.inputs || []) : (def.outputs || []);
    const idx = ports.findIndex(p => p.id === portId);
    if (idx < 0) return null;
    const x = isInput ? node.x : node.x + NODE_W;
    const y = node.y + NODE_HEADER_H + idx * NODE_PORT_H + NODE_PORT_H / 2;
    return { x, y };
  }

  // ── Hit testing ──
  function hitTestNode(wx, wy) {
    const nodes = VJNodeGraph.getNodesArray();
    // Reverse order so topmost nodes are tested first
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const h = getNodeHeight(n);
      if (wx >= n.x && wx <= n.x + NODE_W && wy >= n.y && wy <= n.y + h) {
        return n;
      }
    }
    return null;
  }

  function hitTestPort(wx, wy) {
    const nodes = VJNodeGraph.getNodesArray();
    for (const node of nodes) {
      const def = VJNodeTypes.get(node.type);
      if (!def) continue;

      // Check outputs
      for (const port of (def.outputs || [])) {
        const pos = getPortPos(node, port.id, false);
        if (pos && Math.hypot(wx - pos.x, wy - pos.y) < NODE_PORT_R + 4) {
          return { node, port, isInput: false, pos };
        }
      }
      // Check inputs
      for (const port of (def.inputs || [])) {
        const pos = getPortPos(node, port.id, true);
        if (pos && Math.hypot(wx - pos.x, wy - pos.y) < NODE_PORT_R + 4) {
          return { node, port, isInput: true, pos };
        }
      }
    }
    return null;
  }

  // ── Drawing ──
  function draw() {
    if (!_ctx) return;
    const W = _canvas.width, H = _canvas.height;
    _ctx.clearRect(0, 0, W, H);

    _ctx.save();
    _ctx.translate(_panX, _panY);
    _ctx.scale(_zoom, _zoom);

    // Draw grid
    drawGrid();

    // Draw connections
    drawConnections();

    // Draw connecting line (while dragging)
    if (_connecting) {
      drawPendingConnection();
    }

    // Draw nodes
    const nodes = VJNodeGraph.getNodesArray();
    nodes.forEach(node => drawNode(node));

    // Draw selection box
    if (_selectionBox) {
      _ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
      _ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
      _ctx.lineWidth = 1 / _zoom;
      const x = Math.min(_selectionBox.x1, _selectionBox.x2);
      const y = Math.min(_selectionBox.y1, _selectionBox.y2);
      const w = Math.abs(_selectionBox.x2 - _selectionBox.x1);
      const h = Math.abs(_selectionBox.y2 - _selectionBox.y1);
      _ctx.fillRect(x, y, w, h);
      _ctx.strokeRect(x, y, w, h);
    }

    _ctx.restore();

    _animFrame = requestAnimationFrame(draw);
  }

  function drawGrid() {
    const step = 24;
    const W = _canvas.width / _zoom;
    const H = _canvas.height / _zoom;
    const offX = -_panX / _zoom;
    const offY = -_panY / _zoom;

    _ctx.fillStyle = 'rgba(255,255,255,0.03)';
    const startX = Math.floor(offX / step) * step;
    const startY = Math.floor(offY / step) * step;
    for (let x = startX; x < offX + W; x += step) {
      for (let y = startY; y < offY + H; y += step) {
        _ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
      }
    }
  }

  function drawConnections() {
    const connections = VJNodeGraph.getConnectionsArray();
    connections.forEach(conn => {
      const srcNode = VJNodeGraph.getNode(conn.srcNode);
      const dstNode = VJNodeGraph.getNode(conn.dstNode);
      if (!srcNode || !dstNode) return;

      const srcPos = getPortPos(srcNode, conn.srcPort, false);
      const dstPos = getPortPos(dstNode, conn.dstPort, true);
      if (!srcPos || !dstPos) return;

      const color = PORT_COLORS[conn.type] || '#6366f1';
      drawBezier(srcPos.x, srcPos.y, dstPos.x, dstPos.y, color, 2.5);
    });
  }

  function drawPendingConnection() {
    if (!_connecting) return;
    const pos = _connecting.pos;
    const mx = _connecting.mx;
    const my = _connecting.my;
    const color = PORT_COLORS[_connecting.type] || '#6366f1';

    if (_connecting.isInput) {
      drawBezier(mx, my, pos.x, pos.y, color, 2, 0.5);
    } else {
      drawBezier(pos.x, pos.y, mx, my, color, 2, 0.5);
    }
  }

  function drawBezier(x1, y1, x2, y2, color, width = 2, alpha = 0.8) {
    const dx = Math.abs(x2 - x1) * 0.5;
    _ctx.beginPath();
    _ctx.moveTo(x1, y1);
    _ctx.bezierCurveTo(x1 + dx, y1, x2 - dx, y2, x2, y2);
    _ctx.strokeStyle = color;
    _ctx.lineWidth = width / _zoom;
    _ctx.globalAlpha = alpha;
    _ctx.stroke();
    _ctx.globalAlpha = 1;
  }

  function drawNode(node) {
    const def = VJNodeTypes.get(node.type);
    if (!def) return;

    const x = node.x, y = node.y;
    const h = getNodeHeight(node);
    const isSelected = _selectedNode?.id === node.id || _multiSelected.has(node.id);
    const isHovered = _hoveredNode?.id === node.id;

    // Shadow
    _ctx.shadowColor = 'rgba(0,0,0,0.4)';
    _ctx.shadowBlur = 12;
    _ctx.shadowOffsetY = 4;

    // Node body
    _ctx.beginPath();
    roundRect(_ctx, x, y, NODE_W, h, NODE_RADIUS);
    _ctx.fillStyle = isSelected ? '#1a1a30' : '#12121e';
    _ctx.fill();

    _ctx.shadowBlur = 0;
    _ctx.shadowOffsetY = 0;

    // Border
    _ctx.strokeStyle = isSelected
      ? 'rgba(99, 102, 241, 0.7)'
      : isHovered
        ? 'rgba(255,255,255,0.15)'
        : 'rgba(255,255,255,0.06)';
    _ctx.lineWidth = isSelected ? 2 / _zoom : 1 / _zoom;
    _ctx.stroke();

    // Glow for selected
    if (isSelected) {
      _ctx.shadowColor = 'rgba(99, 102, 241, 0.3)';
      _ctx.shadowBlur = 16;
      _ctx.stroke();
      _ctx.shadowBlur = 0;
    }

    // Header
    _ctx.beginPath();
    _ctx.moveTo(x + NODE_RADIUS, y);
    _ctx.lineTo(x + NODE_W - NODE_RADIUS, y);
    _ctx.quadraticCurveTo(x + NODE_W, y, x + NODE_W, y + NODE_RADIUS);
    _ctx.lineTo(x + NODE_W, y + NODE_HEADER_H);
    _ctx.lineTo(x, y + NODE_HEADER_H);
    _ctx.lineTo(x, y + NODE_RADIUS);
    _ctx.quadraticCurveTo(x, y, x + NODE_RADIUS, y);
    _ctx.closePath();
    _ctx.fillStyle = def.color + '30';
    _ctx.fill();

    // Header line
    _ctx.beginPath();
    _ctx.moveTo(x, y + NODE_HEADER_H);
    _ctx.lineTo(x + NODE_W, y + NODE_HEADER_H);
    _ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    _ctx.lineWidth = 1 / _zoom;
    _ctx.stroke();

    // Title (icon + name)
    _ctx.font = `500 ${12}px Inter, sans-serif`;
    _ctx.fillStyle = '#e2e8f0';
    _ctx.textBaseline = 'middle';
    let title = `${def.icon} ${node.title || def.name}`;
    if (node.type === 'monitor' && window.VJNodeExecutor) {
      const val = window.VJNodeExecutor.getOutput(node.id, 'value');
      title += ` [ ${typeof val === 'number' ? val.toFixed(3) : (val ?? '-')} ]`;
    }
    _ctx.fillText(title, x + 8, y + NODE_HEADER_H / 2, NODE_W - 16);

    // Ports
    const inputs = def.inputs || [];
    const outputs = def.outputs || [];

    inputs.forEach((port, i) => {
      const py = y + NODE_HEADER_H + i * NODE_PORT_H + NODE_PORT_H / 2;
      const px = x;

      // Port circle
      _ctx.beginPath();
      _ctx.arc(px, py, NODE_PORT_R / _zoom * _zoom, 0, Math.PI * 2);
      _ctx.fillStyle = PORT_COLORS[port.type] || '#888';
      _ctx.fill();
      _ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      _ctx.lineWidth = 1.5 / _zoom;
      _ctx.stroke();

      // Port label
      _ctx.font = `400 ${10}px Inter, sans-serif`;
      _ctx.fillStyle = '#94a3b8';
      _ctx.textBaseline = 'middle';
      _ctx.fillText(port.name, px + NODE_PORT_R + 6, py);
    });

    outputs.forEach((port, i) => {
      const py = y + NODE_HEADER_H + i * NODE_PORT_H + NODE_PORT_H / 2;
      const px = x + NODE_W;

      // Port circle
      _ctx.beginPath();
      _ctx.arc(px, py, NODE_PORT_R / _zoom * _zoom, 0, Math.PI * 2);
      _ctx.fillStyle = PORT_COLORS[port.type] || '#888';
      _ctx.fill();
      _ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      _ctx.lineWidth = 1.5 / _zoom;
      _ctx.stroke();

      // Port label (right-aligned)
      _ctx.font = `400 ${10}px Inter, sans-serif`;
      _ctx.fillStyle = '#94a3b8';
      _ctx.textBaseline = 'middle';
      _ctx.textAlign = 'right';
      _ctx.fillText(port.name, px - NODE_PORT_R - 6, py);
      _ctx.textAlign = 'left';
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Event Handlers ──
  function onPointerDown(e) {
    const rect = _canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    // Check port hit first
    const portHit = hitTestPort(world.x, world.y);
    if (portHit) {
      _connecting = {
        node: portHit.node,
        port: portHit.port,
        isInput: portHit.isInput,
        type: portHit.port.type,
        pos: portHit.pos,
        mx: world.x,
        my: world.y,
      };
      _dragging = { type: 'connect' };
      return;
    }

    // Check node hit
    const nodeHit = hitTestNode(world.x, world.y);
    if (nodeHit) {
      selectNode(nodeHit);
      _dragging = {
        type: 'node',
        node: nodeHit,
        startX: world.x - nodeHit.x,
        startY: world.y - nodeHit.y,
      };
      return;
    }

    // Start pan or selection
    if (e.button === 1 || e.ctrlKey || e.metaKey || _spacePressed) {
      // Middle click or Ctrl or Space = pan
      _dragging = { type: 'pan', startX: sx - _panX, startY: sy - _panY };
    } else {
      // Left click on empty = deselect + selection box
      selectNode(null);
      _selectionBox = { x1: world.x, y1: world.y, x2: world.x, y2: world.y };
      _dragging = { type: 'select' };
    }
  }

  function onPointerMove(e) {
    const rect = _canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    if (!_dragging) {
      // Hover detection
      _hoveredNode = hitTestNode(world.x, world.y);
      _hoveredPort = hitTestPort(world.x, world.y);
      _canvas.style.cursor = _hoveredPort ? 'crosshair' : _hoveredNode ? 'grab' : 'default';
      return;
    }

    switch (_dragging.type) {
      case 'node': {
        const nx = world.x - _dragging.startX;
        const ny = world.y - _dragging.startY;
        VJNodeGraph.moveNode(_dragging.node.id, nx, ny);
        _canvas.style.cursor = 'grabbing';
        break;
      }
      case 'pan': {
        _panX = sx - _dragging.startX;
        _panY = sy - _dragging.startY;
        _canvas.style.cursor = 'grabbing';
        break;
      }
      case 'connect': {
        if (_connecting) {
          _connecting.mx = world.x;
          _connecting.my = world.y;
        }
        _canvas.style.cursor = 'crosshair';
        break;
      }
      case 'select': {
        if (_selectionBox) {
          _selectionBox.x2 = world.x;
          _selectionBox.y2 = world.y;
        }
        break;
      }
    }
  }

  function onPointerUp(e) {
    const rect = _canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    if (_dragging?.type === 'connect' && _connecting) {
      // Try to complete the connection
      const portHit = hitTestPort(world.x, world.y);
      if (portHit && portHit.isInput !== _connecting.isInput) {
        if (_connecting.isInput) {
          VJNodeGraph.connect(portHit.node.id, portHit.port.id, _connecting.node.id, _connecting.port.id);
        } else {
          VJNodeGraph.connect(_connecting.node.id, _connecting.port.id, portHit.node.id, portHit.port.id);
        }
        broadcastGraph();
      }
    }

    if (_dragging?.type === 'select' && _selectionBox) {
      // Select nodes within box
      const x1 = Math.min(_selectionBox.x1, _selectionBox.x2);
      const y1 = Math.min(_selectionBox.y1, _selectionBox.y2);
      const x2 = Math.max(_selectionBox.x1, _selectionBox.x2);
      const y2 = Math.max(_selectionBox.y1, _selectionBox.y2);
      _multiSelected.clear();
      VJNodeGraph.getNodesArray().forEach(n => {
        const h = getNodeHeight(n);
        if (n.x + NODE_W > x1 && n.x < x2 && n.y + h > y1 && n.y < y2) {
          _multiSelected.add(n.id);
        }
      });
    }

    if (_dragging?.type === 'node') {
      broadcastGraph();
    }

    _dragging = null;
    _connecting = null;
    _selectionBox = null;
    _canvas.style.cursor = 'default';
  }

  function onWheel(e) {
    e.preventDefault();
    const rect = _canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.2, Math.min(3, _zoom * zoomFactor));

    // Zoom towards mouse position
    _panX = sx - (sx - _panX) * (newZoom / _zoom);
    _panY = sy - (sy - _panY) * (newZoom / _zoom);
    _zoom = newZoom;
  }

  function onKeyDown(e) {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && !_spacePressed) {
      _spacePressed = true;
      _canvas.style.cursor = 'grab';
      e.preventDefault();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (_selectedNode) {
        VJNodeGraph.removeNode(_selectedNode.id);
        _selectedNode = null;
        VJBus.emit('editor:selection', null);
        broadcastGraph();
      }
      _multiSelected.forEach(id => VJNodeGraph.removeNode(id));
      if (_multiSelected.size > 0) {
        _multiSelected.clear();
        broadcastGraph();
      }
    }
    // Ctrl+A: select all
    if (e.ctrlKey && e.key === 'a') {
      e.preventDefault();
      _multiSelected.clear();
      VJNodeGraph.getNodesArray().forEach(n => _multiSelected.add(n.id));
    }
    // Ctrl+S: save
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveGraph();
    }
  }

  function onContextMenu(e) {
    e.preventDefault();
    const rect = _canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    VJBus.emit('editor:contextmenu', {
      screenX: e.clientX,
      screenY: e.clientY,
      worldX: world.x,
      worldY: world.y,
    });
  }

  function onKeyUp(e) {
    if (e.code === 'Space') {
      _spacePressed = false;
      if (!_dragging) _canvas.style.cursor = 'default';
      e.preventDefault();
    }
  }

  // ── Touch support ──
  let _lastTouchDist = 0;
  let _lastTouchMid = null;

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      onPointerDown({ clientX: touch.clientX, clientY: touch.clientY, button: 0 });
    } else if (e.touches.length === 2) {
      _dragging = null; _connecting = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      _lastTouchDist = Math.hypot(dx, dy);
      _lastTouchMid = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
    e.preventDefault();
  }

  function onTouchMove(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      onPointerMove({ clientX: touch.clientX, clientY: touch.clientY });
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const mid = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };

      // Pinch zoom
      if (_lastTouchDist > 0) {
        const zoomFactor = dist / _lastTouchDist;
        const newZoom = Math.max(0.2, Math.min(3, _zoom * zoomFactor));
        const rect = _canvas.getBoundingClientRect();
        const sx = mid.x - rect.left;
        const sy = mid.y - rect.top;
        _panX = sx - (sx - _panX) * (newZoom / _zoom);
        _panY = sy - (sy - _panY) * (newZoom / _zoom);
        _zoom = newZoom;
      }

      // Pan
      if (_lastTouchMid) {
        _panX += mid.x - _lastTouchMid.x;
        _panY += mid.y - _lastTouchMid.y;
      }

      _lastTouchDist = dist;
      _lastTouchMid = mid;
    }
    e.preventDefault();
  }

  function onTouchEnd(e) {
    if (e.touches.length === 0) {
      const ct = e.changedTouches[0];
      onPointerUp({ clientX: ct.clientX, clientY: ct.clientY });
    }
    _lastTouchDist = 0;
    _lastTouchMid = null;
  }

  // ── Selection ──
  function selectNode(node) {
    _selectedNode = node;
    _multiSelected.clear();
    VJBus.emit('editor:selection', node);
  }

  // ── Graph sync ──
  function broadcastGraph() {
    const data = VJNodeGraph.serialize();
    VJWs.send({ type: 'graph_update', graph: data });
    VJStorage.setGraph(data);
  }

  function saveGraph() {
    const data = VJNodeGraph.serialize();
    VJWs.send({ type: 'graph_update', graph: data });
    VJStorage.setGraph(data);
    VJBus.emit('toast:info', VJi18n.t('graph_saved'));
  }

  // ── Drop handling (from palette) ──
  function onDrop(e) {
    e.preventDefault();
    const nodeType = e.dataTransfer.getData('text/node-type');
    if (!nodeType) return;
    const rect = _canvas.getBoundingClientRect();
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const node = VJNodeGraph.addNode(nodeType, world.x - NODE_W / 2, world.y - 20);
    if (node) {
      selectNode(node);
      broadcastGraph();
    }
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  // ── Resize ──
  function resize() {
    if (!_canvas) return;
    const wrap = _canvas.parentElement;
    _canvas.width = wrap.clientWidth;
    _canvas.height = wrap.clientHeight;
  }

  // ── Public API ──
  return {
    init(canvasEl) {
      _canvas = canvasEl;
      _ctx = _canvas.getContext('2d');
      resize();

      // Mouse events
      _canvas.addEventListener('pointerdown', onPointerDown);
      _canvas.addEventListener('pointermove', onPointerMove);
      _canvas.addEventListener('pointerup', onPointerUp);
      _canvas.addEventListener('wheel', onWheel, { passive: false });
      _canvas.addEventListener('contextmenu', onContextMenu);

      // Touch events
      _canvas.addEventListener('touchstart', onTouchStart, { passive: false });
      _canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      _canvas.addEventListener('touchend', onTouchEnd);

      // Drop from palette
      _canvas.addEventListener('drop', onDrop);
      _canvas.addEventListener('dragover', onDragOver);

      // Keyboard
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);

      // Resize
      window.addEventListener('resize', resize);

      // Start render loop
      draw();

      // Listen for graph sync from WS
      VJBus.on('ws:graph_sync', (msg) => {
        if (msg.graph) {
          VJNodeGraph.deserialize(msg.graph);
        }
      });

      VJBus.on('ws:graph_update', (msg) => {
        if (msg.graph) {
          VJNodeGraph.deserialize(msg.graph);
        }
      });

      // Load saved graph
      const saved = VJStorage.getGraph();
      if (saved) {
        VJNodeGraph.deserialize(saved);
      }
    },

    addNodeAt(type, x, y) {
      const node = VJNodeGraph.addNode(type, x, y);
      if (node) {
        selectNode(node);
        broadcastGraph();
      }
      return node;
    },

    zoomToFit() {
      const nodes = VJNodeGraph.getNodesArray();
      if (nodes.length === 0) {
        _panX = _canvas.width / 2;
        _panY = _canvas.height / 2;
        _zoom = 1;
        return;
      }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(n => {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + NODE_W);
        maxY = Math.max(maxY, n.y + getNodeHeight(n));
      });
      const pad = 60;
      const gw = maxX - minX + pad * 2;
      const gh = maxY - minY + pad * 2;
      _zoom = Math.min(_canvas.width / gw, _canvas.height / gh, 1.5);
      _panX = (_canvas.width - gw * _zoom) / 2 - minX * _zoom + pad * _zoom;
      _panY = (_canvas.height - gh * _zoom) / 2 - minY * _zoom + pad * _zoom;
    },

    getSelectedNode() { return _selectedNode; },
    saveGraph,
    broadcastGraph,
  };
})();

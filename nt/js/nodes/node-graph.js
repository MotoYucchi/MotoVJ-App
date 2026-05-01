// MotoVJ v3 — Node Graph Data Model
// Manages nodes, connections, serialization, and topological sorting
window.VJNodeGraph = (() => {
  let _nodes = {};       // id → { id, type, title, x, y, params, inputs, outputs }
  let _connections = {};  // id → { id, srcNode, srcPort, dstNode, dstPort }
  let _nextId = 1;

  function genId(prefix = 'n') {
    return `${prefix}_${Date.now().toString(36)}_${(_nextId++).toString(36)}`;
  }

  return {
    // ── Node CRUD ──
    addNode(type, x = 0, y = 0) {
      const def = VJNodeTypes.get(type);
      if (!def) { console.warn(`Unknown node type: ${type}`); return null; }

      const id = genId('n');
      const params = {};
      // Set default params from schema
      if (def.params) {
        def.params.forEach(p => { params[p.id] = p.default !== undefined ? p.default : 0; });
      }

      const node = {
        id, type, title: def.name,
        x, y,
        params,
        inputs: (def.inputs || []).map(p => ({ ...p })),
        outputs: (def.outputs || []).map(p => ({ ...p })),
      };
      _nodes[id] = node;
      VJBus.emit('graph:node:added', node);
      return node;
    },

    removeNode(id) {
      if (!_nodes[id]) return;
      // Remove all connections to/from this node
      Object.keys(_connections).forEach(cid => {
        const c = _connections[cid];
        if (c.srcNode === id || c.dstNode === id) {
          delete _connections[cid];
          VJBus.emit('graph:connection:removed', c);
        }
      });
      const node = _nodes[id];
      delete _nodes[id];
      VJBus.emit('graph:node:removed', node);
    },

    getNode(id) { return _nodes[id] || null; },
    getNodes() { return _nodes; },
    getNodesArray() { return Object.values(_nodes); },

    moveNode(id, x, y) {
      const node = _nodes[id];
      if (node) { node.x = x; node.y = y; }
    },

    setNodeParam(nodeId, paramId, value) {
      const node = _nodes[nodeId];
      if (node) {
        node.params[paramId] = value;
        VJBus.emit('graph:param:changed', { nodeId, paramId, value });
      }
    },

    setNodeTitle(nodeId, title) {
      const node = _nodes[nodeId];
      if (node) { node.title = title; }
    },

    // ── Connection CRUD ──
    connect(srcNode, srcPort, dstNode, dstPort) {
      // Validate port types match
      const sn = _nodes[srcNode], dn = _nodes[dstNode];
      if (!sn || !dn) return null;

      const srcDef = sn.outputs.find(p => p.id === srcPort);
      const dstDef = dn.inputs.find(p => p.id === dstPort);
      if (!srcDef || !dstDef) return null;
      if (srcDef.type !== dstDef.type) return null;

      // Remove existing connection to this input
      Object.keys(_connections).forEach(cid => {
        const c = _connections[cid];
        if (c.dstNode === dstNode && c.dstPort === dstPort) {
          delete _connections[cid];
          VJBus.emit('graph:connection:removed', c);
        }
      });

      // Prevent self-connection
      if (srcNode === dstNode) return null;

      const id = genId('c');
      const conn = { id, srcNode, srcPort, dstNode, dstPort, type: srcDef.type };
      _connections[id] = conn;
      VJBus.emit('graph:connection:added', conn);
      return conn;
    },

    disconnect(connId) {
      const conn = _connections[connId];
      if (conn) {
        delete _connections[connId];
        VJBus.emit('graph:connection:removed', conn);
      }
    },

    getConnections() { return _connections; },
    getConnectionsArray() { return Object.values(_connections); },

    getInputConnections(nodeId) {
      return Object.values(_connections).filter(c => c.dstNode === nodeId);
    },

    getOutputConnections(nodeId) {
      return Object.values(_connections).filter(c => c.srcNode === nodeId);
    },

    // ── Topological Sort ──
    getExecutionOrder() {
      const visited = new Set();
      const stack = [];
      const visiting = new Set();

      const visit = (nodeId) => {
        if (visited.has(nodeId)) return;
        if (visiting.has(nodeId)) return; // Cycle detected, skip
        visiting.add(nodeId);

        // Visit all upstream nodes first
        this.getInputConnections(nodeId).forEach(conn => {
          visit(conn.srcNode);
        });

        visiting.delete(nodeId);
        visited.add(nodeId);
        stack.push(nodeId);
      };

      Object.keys(_nodes).forEach(visit);
      return stack.map(id => _nodes[id]).filter(Boolean);
    },

    // ── Serialization ──
    serialize() {
      return {
        nodes: JSON.parse(JSON.stringify(_nodes)),
        connections: JSON.parse(JSON.stringify(_connections)),
        version: 3
      };
    },

    deserialize(data) {
      if (!data) return;
      _nodes = data.nodes || {};
      _connections = data.connections || {};

      // Ensure all nodes have proper input/output definitions
      Object.values(_nodes).forEach(node => {
        const def = VJNodeTypes.get(node.type);
        if (def) {
          node.inputs = (def.inputs || []).map(p => ({ ...p }));
          node.outputs = (def.outputs || []).map(p => ({ ...p }));
        }
      });

      VJBus.emit('graph:loaded');
    },

    clear() {
      _nodes = {};
      _connections = {};
      _nextId = 1;
      VJBus.emit('graph:loaded');
    },

    // ── Output Nodes ──
    getOutputNodes() {
      return Object.values(_nodes).filter(n => {
        const def = VJNodeTypes.get(n.type);
        return def?.category === 'output';
      });
    }
  };
})();

// MotoVJ v3 — MIDI & VC Mapping System
window.VJMapping = (() => {
  let _mappings = []; // Array of { id, sourceStr, targetNodeId, targetParamId, type, minIn, maxIn, minOut, maxOut, ranges }
  let _learnMode = null;

  function init() {
    const saved = VJStorage.get('mappings');
    if (saved) _mappings = saved;

    VJBus.on('graph:node:removed', (node) => {
      _mappings = _mappings.filter(m => m.targetNodeId !== node.id);
      save();
    });

    VJBus.on('midi:cc', ({ channel, control, value }) => {
      handleInput(`MIDI:CC:${channel}:${control}`, value * 127);
    });

    VJBus.on('midi:noteon', ({ channel, note, velocity }) => {
      handleInput(`MIDI:NOTE:${channel}:${note}`, velocity * 127);
    });

    VJBus.on('vc:input', ({ track, type, value }) => {
      handleInput(`VC:TRK:${track}:${type}`, value);
    });
  }

  function handleInput(sourceStr, value) {
    if (_learnMode) {
      _learnMode.callback(sourceStr);
      _learnMode = null;
      VJBus.emit('mapping:learned', sourceStr);
      return;
    }

    _mappings.forEach(m => {
      if (m.sourceStr === sourceStr) {
        applyMapping(m, value);
      }
    });
  }

  function applyMapping(m, value) {
    const node = VJNodeGraph.getNode(m.targetNodeId);
    if (!node) return;

    let finalVal;
    if (m.type === 'number') {
      const t = (value - m.minIn) / (m.maxIn - m.minIn);
      finalVal = m.minOut + t * (m.maxOut - m.minOut);
      finalVal = Math.max(Math.min(finalVal, Math.max(m.minOut, m.maxOut)), Math.min(m.minOut, m.maxOut)); // clamp
    } else if (m.type === 'enum') {
      const range = m.ranges.find(r => value >= r.minIn && value <= r.maxIn);
      if (range) finalVal = range.val;
    }

    if (finalVal !== undefined) {
      VJNodeGraph.setNodeParam(node.id, m.targetParamId, finalVal);
      VJBus.emit('graph:param:changed', { nodeId: node.id, paramId: m.targetParamId, value: finalVal });
      VJWs.send({ type: 'node_param_update', nodeId: node.id, paramId: m.targetParamId, value: finalVal });
    }
  }

  function save() { VJStorage.set('mappings', _mappings); }
  function addMapping(m) { _mappings.push(m); save(); }
  function removeMapping(id) { _mappings = _mappings.filter(x => x.id !== id); save(); }
  function getMappingsForNode(nodeId) { return _mappings.filter(x => x.targetNodeId === nodeId); }
  
  function startLearn(nodeId, paramId, callback) {
    _learnMode = { nodeId, paramId, callback };
  }

  return { init, addMapping, removeMapping, getMappingsForNode, startLearn };
})();

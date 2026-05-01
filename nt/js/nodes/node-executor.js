// MotoVJ v3 — Node Executor
// Runs the node graph each frame, manages OffscreenCanvas buffer pool
window.VJNodeExecutor = (() => {
  const _buffers = new Map();   // nodeId → { canvas, ctx }
  const _outputs = new Map();   // nodeId:portId → value
  const _smoothState = new Map(); // nodeId → smoothed value
  let _canvasW = 1920, _canvasH = 1080;

  function getBuffer(nodeId) {
    if (_buffers.has(nodeId)) return _buffers.get(nodeId);
    const canvas = document.createElement('canvas');
    canvas.width = _canvasW;
    canvas.height = _canvasH;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    const buf = { canvas, ctx };
    _buffers.set(nodeId, buf);
    return buf;
  }

  function resizeBuffers(w, h) {
    _canvasW = w;
    _canvasH = h;
    _buffers.forEach(buf => {
      buf.canvas.width = w;
      buf.canvas.height = h;
    });
  }

  // Get input value for a node's port
  function getInput(nodeId, portId) {
    const connections = VJNodeGraph.getInputConnections(nodeId);
    const conn = connections.find(c => c.dstPort === portId);
    if (!conn) return null;
    return _outputs.get(`${conn.srcNode}:${conn.srcPort}`) ?? null;
  }

  function setOutput(nodeId, portId, value) {
    _outputs.set(`${nodeId}:${portId}`, value);
  }

  function cleanupRemovedNodes(activeNodeIds) {
    for (const [key] of _buffers) {
      if (!activeNodeIds.has(key)) {
        _buffers.delete(key);
      }
    }
  }

  // Execute entire graph for one frame
  function execute() {
    const order = VJNodeGraph.getExecutionOrder();
    const activeIds = new Set(order.map(n => n.id));
    cleanupRemovedNodes(activeIds);

    const VJ = window.VJ;
    const w = _canvasW, h = _canvasH;

    for (const node of order) {
      const def = VJNodeTypes.get(node.type);
      if (!def) continue;

      const params = node.params || {};

      switch (node.type) {
        // ── SOURCE NODES ──
        case 'audio-fft': {
          setOutput(node.id, 'fft', VJ.fft.center);
          setOutput(node.id, 'bass', VJ.fft.bass);
          setOutput(node.id, 'mid', VJ.fft.mid);
          setOutput(node.id, 'high', VJ.fft.high);
          setOutput(node.id, 'beat', VJ.beat > 0.5 ? 1 : 0);
          break;
        }
        case 'color-source': {
          setOutput(node.id, 'color', {
            r: params.r ?? 0,
            g: params.g ?? 255,
            b: params.b ?? 255,
            a: params.a ?? 1,
          });
          break;
        }
        case 'value-source': {
          setOutput(node.id, 'value', params.value ?? 0.5);
          break;
        }
        case 'time-source': {
          const speed = params.speed ?? 1;
          const t = VJ.time * speed;
          setOutput(node.id, 'time', t);
          setOutput(node.id, 'sin', Math.sin(t));
          setOutput(node.id, 'cos', Math.cos(t));
          break;
        }

        // ── EFFECT NODES ──
        case 'viz-bars':
        case 'viz-circular':
        case 'viz-waveform':
        case 'geo-spiral':
        case 'geo-grid':
        case 'geo-lines':
        case 'ptcl-burst':
        case 'ptcl-fire':
        case 'ptcl-snow':
        case 'mtn-starfield':
        case 'mtn-tunnel':
        case 'bg-plasma':
        case 'bg-gradient':
        case 'fx-strobe':
        case 'fx-glitch': {
          const effectId = def.effectId || node.type;
          const effectDef = window.VJEffects?.[effectId];
          if (!effectDef) break;

          // Get or create effect instance
          if (!node._instance) {
            node._instance = effectDef.create();
          }

          const buf = getBuffer(node.id);
          buf.ctx.clearRect(0, 0, w, h);

          // Set VJ per-node state
          const colorInput = getInput(node.id, 'color');
          VJ.params = { ...params };
          if (colorInput) {
            VJ.params.baseR = colorInput.r;
            VJ.params.baseG = colorInput.g;
            VJ.params.baseB = colorInput.b;
            VJ.params.baseA = colorInput.a;
            VJ.groupColor = { r: 0, g: 0, b: 0 };
          }

          // For glitch: pass through input canvas
          if (node.type === 'fx-glitch') {
            const inputCanvas = getInput(node.id, 'canvas');
            if (inputCanvas) {
              buf.ctx.drawImage(inputCanvas, 0, 0);
            }
          }

          try {
            node._instance.render(buf.ctx, w, h);
          } catch (e) { /* silent */ }

          setOutput(node.id, 'canvas', buf.canvas);
          break;
        }

        // ── TRANSFORM NODES ──
        case 'blend': {
          const a = getInput(node.id, 'a');
          const b = getInput(node.id, 'b');
          const buf = getBuffer(node.id);
          buf.ctx.clearRect(0, 0, w, h);

          if (a) {
            buf.ctx.globalCompositeOperation = 'source-over';
            buf.ctx.globalAlpha = 1;
            buf.ctx.drawImage(a, 0, 0);
          }
          if (b) {
            buf.ctx.globalCompositeOperation = params.mode || 'screen';
            buf.ctx.globalAlpha = params.opacity ?? 1;
            buf.ctx.drawImage(b, 0, 0);
          }
          buf.ctx.globalCompositeOperation = 'source-over';
          buf.ctx.globalAlpha = 1;
          setOutput(node.id, 'canvas', buf.canvas);
          break;
        }

        case 'opacity': {
          const input = getInput(node.id, 'canvas');
          const amount = getInput(node.id, 'amount');
          const buf = getBuffer(node.id);
          buf.ctx.clearRect(0, 0, w, h);
          if (input) {
            buf.ctx.globalAlpha = amount ?? params.opacity ?? 1;
            buf.ctx.drawImage(input, 0, 0);
            buf.ctx.globalAlpha = 1;
          }
          setOutput(node.id, 'canvas', buf.canvas);
          break;
        }

        case 'scale-transform': {
          const input = getInput(node.id, 'canvas');
          const buf = getBuffer(node.id);
          buf.ctx.clearRect(0, 0, w, h);
          if (input) {
            const sx = params.scaleX ?? 1, sy = params.scaleY ?? 1;
            buf.ctx.save();
            buf.ctx.translate(w / 2, h / 2);
            buf.ctx.scale(sx, sy);
            buf.ctx.drawImage(input, -w / 2, -h / 2);
            buf.ctx.restore();
          }
          setOutput(node.id, 'canvas', buf.canvas);
          break;
        }

        case 'mirror': {
          const input = getInput(node.id, 'canvas');
          const buf = getBuffer(node.id);
          buf.ctx.clearRect(0, 0, w, h);
          if (input) {
            buf.ctx.drawImage(input, 0, 0);
            const axis = params.axis || 'horizontal';
            buf.ctx.save();
            if (axis === 'horizontal' || axis === 'both') {
              buf.ctx.translate(w, 0);
              buf.ctx.scale(-1, 1);
              buf.ctx.globalAlpha = 0.5;
              buf.ctx.drawImage(input, 0, 0);
            }
            if (axis === 'vertical' || axis === 'both') {
              buf.ctx.setTransform(1, 0, 0, 1, 0, 0);
              buf.ctx.translate(0, h);
              buf.ctx.scale(1, -1);
              buf.ctx.globalAlpha = 0.5;
              buf.ctx.drawImage(input, 0, 0);
            }
            buf.ctx.restore();
            buf.ctx.globalAlpha = 1;
          }
          setOutput(node.id, 'canvas', buf.canvas);
          break;
        }

        case 'color-shift': {
          const input = getInput(node.id, 'canvas');
          const amount = getInput(node.id, 'amount') ?? 0;
          const buf = getBuffer(node.id);
          buf.ctx.clearRect(0, 0, w, h);
          if (input) {
            const shift = (params.hueShift ?? 0) + amount * (params.multiplier ?? 1) * 360;
            buf.ctx.filter = `hue-rotate(${shift}deg)`;
            buf.ctx.drawImage(input, 0, 0);
            buf.ctx.filter = 'none';
          }
          setOutput(node.id, 'canvas', buf.canvas);
          break;
        }

        case 'transform-pos': {
          const input = getInput(node.id, 'canvas');
          const buf = getBuffer(node.id);
          buf.ctx.clearRect(0, 0, w, h);
          if (input) {
            const x = (getInput(node.id, 'x') ?? 0) + (params.offsetX ?? 0);
            const y = (getInput(node.id, 'y') ?? 0) + (params.offsetY ?? 0);
            buf.ctx.drawImage(input, x * w, y * h);
          }
          setOutput(node.id, 'canvas', buf.canvas);
          break;
        }

        // ── UTILITY NODES ──
        case 'math': {
          const a = getInput(node.id, 'a') ?? 0;
          const b = getInput(node.id, 'b') ?? (params.fallbackB ?? 1);
          let result = 0;
          switch (params.op) {
            case 'add': result = a + b; break;
            case 'subtract': result = a - b; break;
            case 'multiply': result = a * b; break;
            case 'divide': result = b !== 0 ? a / b : 0; break;
            case 'min': result = Math.min(a, b); break;
            case 'max': result = Math.max(a, b); break;
            case 'mod': result = b !== 0 ? a % b : 0; break;
          }
          setOutput(node.id, 'result', result);
          break;
        }

        case 'remap': {
          const input = getInput(node.id, 'input') ?? 0;
          const iMin = params.inMin ?? 0, iMax = params.inMax ?? 1;
          const oMin = params.outMin ?? 0, oMax = params.outMax ?? 1;
          const t = iMax !== iMin ? (input - iMin) / (iMax - iMin) : 0;
          setOutput(node.id, 'output', oMin + t * (oMax - oMin));
          break;
        }

        case 'smooth': {
          const input = getInput(node.id, 'input') ?? 0;
          const factor = params.factor ?? 0.85;
          const prev = _smoothState.get(node.id) ?? input;
          const smoothed = prev * factor + input * (1 - factor);
          _smoothState.set(node.id, smoothed);
          setOutput(node.id, 'output', smoothed);
          break;
        }

        case 'envelope': {
          let val = getInput(node.id, 'trigger') ?? 0;
          const decay = params.decay ?? 0.95;
          const mult = params.multiplier ?? 1;
          
          let prev = _smoothState.get(node.id) ?? 0;
          // if incoming trigger is higher than our decaying value, use it
          if (val > prev) prev = val;
          else prev = prev * decay;
          
          _smoothState.set(node.id, prev);
          setOutput(node.id, 'value', prev * mult);
          break;
        }

        case 'trigger-toggle': {
          let state = _smoothState.get(node.id) || {
            currentOut: null,
            lastTrigTime: 0,
            intervalMs: 0.5, // 120bpm default
            beatCounter: 0,
            prevTrig: 0
          };

          const trig = getInput(node.id, 'trigger') ?? 0;
          const v1 = getInput(node.id, 'val1') ?? (params.val1 ?? 0);
          const v2 = getInput(node.id, 'val2') ?? (params.val2 ?? 1);
          const smooth = params.smooth ?? 0;
          
          let expr = params.interval || '1';
          let intervalMult = 1;
          try {
            if (/^[0-9+\-*/. ()]+$/.test(expr)) intervalMult = new Function('return ' + expr)();
          } catch(e) {}
          if (intervalMult <= 0) intervalMult = 1;

          const now = window.VJ?.time ?? 0;

          // Detect trigger rising edge
          if (trig > 0.5 && state.prevTrig <= 0.5) {
            const delta = now - state.lastTrigTime;
            if (delta > 0.2 && delta < 3.0) { 
              state.intervalMs = state.intervalMs * 0.7 + delta * 0.3; // smooth tempo tracking
            }
            state.lastTrigTime = now;
            state.beatCounter++;
          }
          state.prevTrig = trig;

          let beatsSinceLast = 0;
          if (state.intervalMs > 0 && now >= state.lastTrigTime) {
            beatsSinceLast = (now - state.lastTrigTime) / state.intervalMs;
          }
          let totalBeats = state.beatCounter + beatsSinceLast;

          let phase = totalBeats / intervalMult;
          let togglesCount = Math.floor(phase);
          
          let target = (togglesCount % 2 === 0) ? v1 : v2;

          if (state.currentOut === null) state.currentOut = target;
          
          if (smooth > 0) {
            state.currentOut = state.currentOut * smooth + target * (1 - smooth);
          } else {
            state.currentOut = target;
          }

          _smoothState.set(node.id, state);
          setOutput(node.id, 'value', state.currentOut);
          break;
        }

        case 'monitor': {
          const val = getInput(node.id, 'value');
          setOutput(node.id, 'value', val);
          break;
        }

        // ── OUTPUT NODES ──
        case 'output-screen': {
          // Output nodes are read by the viewer engine
          const input = getInput(node.id, 'canvas');
          setOutput(node.id, '_final', input);
          node._opacity = params.opacity ?? 1;
          node._deck = params.deck ?? 'none';
          break;
        }
      }
    }
  }

  return {
    execute,
    getOutput(nodeId, portId) { return _outputs.get(`${nodeId}:${portId}`) ?? null; },
    resize(w, h) { resizeBuffers(w, h); },
    getCanvasSize() { return { w: _canvasW, h: _canvasH }; },
  };
})();

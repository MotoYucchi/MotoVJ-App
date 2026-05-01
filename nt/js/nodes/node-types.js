// MotoVJ v3 — Node Type Registry
// Defines all available node types with their ports, params, and render functions
window.VJNodeTypes = (() => {
  const _types = {};

  function register(type, def) {
    _types[type] = { type, ...def };
  }

  // ── Port type constants ──
  const PORT = {
    CANVAS: 'canvas',   // Canvas buffer (image data)
    AUDIO:  'audio',    // FFT/audio data
    VALUE:  'value',    // Numeric value
    COLOR:  'color',    // RGBA color
    TRIGGER:'trigger',  // Trigger/beat
  };

  const PORT_COLORS = {
    canvas:  '#f472b6',
    audio:   '#22d3ee',
    value:   '#facc15',
    color:   '#22c55e',
    trigger: '#ef4444',
  };

  // ═══════════════════════════════════════
  //  SOURCE NODES
  // ═══════════════════════════════════════

  register('audio-fft', {
    name: 'Audio FFT',
    category: 'source',
    color: '#22d3ee',
    icon: '🎤',
    inputs: [],
    outputs: [
      { id: 'fft', name: 'FFT', type: PORT.AUDIO },
      { id: 'bass', name: 'Bass', type: PORT.VALUE },
      { id: 'mid', name: 'Mid', type: PORT.VALUE },
      { id: 'high', name: 'High', type: PORT.VALUE },
      { id: 'beat', name: 'Beat', type: PORT.TRIGGER },
    ],
    params: [],
  });

  register('color-source', {
    name: 'Color',
    category: 'source',
    color: '#22c55e',
    icon: '🎨',
    inputs: [],
    outputs: [
      { id: 'color', name: 'Color', type: PORT.COLOR },
    ],
    params: [
      { id: 'r', label: 'Red', type: 'range', min: 0, max: 255, step: 1, default: 0 },
      { id: 'g', label: 'Green', type: 'range', min: 0, max: 255, step: 1, default: 255 },
      { id: 'b', label: 'Blue', type: 'range', min: 0, max: 255, step: 1, default: 255 },
      { id: 'a', label: 'Alpha', type: 'range', min: 0, max: 1, step: 0.01, default: 1 },
    ],
  });

  register('value-source', {
    name: 'Value',
    category: 'source',
    color: '#facc15',
    icon: '🔢',
    inputs: [],
    outputs: [
      { id: 'value', name: 'Value', type: PORT.VALUE },
    ],
    params: [
      { id: 'value', label: 'Value', type: 'range', min: 0, max: 1, step: 0.01, default: 0.5 },
    ],
  });

  register('time-source', {
    name: 'Time',
    category: 'source',
    color: '#facc15',
    icon: '⏱',
    inputs: [],
    outputs: [
      { id: 'time', name: 'Time', type: PORT.VALUE },
      { id: 'sin', name: 'Sin', type: PORT.VALUE },
      { id: 'cos', name: 'Cos', type: PORT.VALUE },
    ],
    params: [
      { id: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 10, step: 0.1, default: 1 },
    ],
  });

  // ═══════════════════════════════════════
  //  EFFECT NODES (Visual — Canvas drawing)
  // ═══════════════════════════════════════

  register('viz-bars', {
    name: 'VizBars',
    category: 'effect',
    color: '#6366f1',
    icon: '📊',
    inputs: [
      { id: 'audio', name: 'Audio', type: PORT.AUDIO },
      { id: 'color', name: 'Color', type: PORT.COLOR },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'barCount', label: 'Bar Count', type: 'range', min: 8, max: 128, step: 1, default: 48 },
      { id: 'gap', label: 'Gap', type: 'range', min: 0, max: 10, step: 1, default: 2 },
      { id: 'mirror', label: 'Mirror', type: 'range', min: 0, max: 1, step: 1, default: 1 },
      { id: 'glow', label: 'Glow', type: 'range', min: 0, max: 30, step: 1, default: 8 },
    ],
    effectId: 'viz-bars',
  });

  register('viz-circular', {
    name: 'VizCircular',
    category: 'effect',
    color: '#6366f1',
    icon: '🔵',
    inputs: [
      { id: 'audio', name: 'Audio', type: PORT.AUDIO },
      { id: 'color', name: 'Color', type: PORT.COLOR },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'radius', label: 'Radius', type: 'range', min: 50, max: 400, step: 1, default: 150 },
      { id: 'lineWidth', label: 'Line Width', type: 'range', min: 1, max: 20, step: 1, default: 3 },
      { id: 'segments', label: 'Segments', type: 'range', min: 32, max: 256, step: 1, default: 128 },
    ],
    effectId: 'viz-circular',
  });

  register('viz-waveform', {
    name: 'Waveform',
    category: 'effect',
    color: '#6366f1',
    icon: '〰️',
    inputs: [
      { id: 'audio', name: 'Audio', type: PORT.AUDIO },
      { id: 'color', name: 'Color', type: PORT.COLOR },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'amplitude', label: 'Amplitude', type: 'range', min: 0.1, max: 3, step: 0.1, default: 1 },
      { id: 'lineWidth', label: 'Line Width', type: 'range', min: 1, max: 10, step: 0.5, default: 2 },
    ],
    effectId: 'viz-waveform',
  });

  register('geo-spiral', {
    name: 'Spiral',
    category: 'effect',
    color: '#8b5cf6',
    icon: '🌀',
    inputs: [
      { id: 'audio', name: 'Audio', type: PORT.AUDIO },
      { id: 'color', name: 'Color', type: PORT.COLOR },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'arms', label: 'Arms', type: 'range', min: 1, max: 12, step: 1, default: 4 },
      { id: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 5, step: 0.1, default: 1 },
      { id: 'spread', label: 'Spread', type: 'range', min: 0.1, max: 2, step: 0.1, default: 0.5 },
    ],
    effectId: 'geo-spiral',
  });

  register('geo-grid', {
    name: 'Grid',
    category: 'effect',
    color: '#8b5cf6',
    icon: '▦',
    inputs: [
      { id: 'audio', name: 'Audio', type: PORT.AUDIO },
      { id: 'color', name: 'Color', type: PORT.COLOR },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'cols', label: 'Columns', type: 'range', min: 4, max: 32, step: 1, default: 12 },
      { id: 'rows', label: 'Rows', type: 'range', min: 4, max: 32, step: 1, default: 8 },
      { id: 'reactivity', label: 'Reactivity', type: 'range', min: 0, max: 2, step: 0.1, default: 1 },
    ],
    effectId: 'geo-grid',
  });

  register('geo-lines', {
    name: 'Lines',
    category: 'effect',
    color: '#8b5cf6',
    icon: '⚡',
    inputs: [
      { id: 'audio', name: 'Audio', type: PORT.AUDIO },
      { id: 'amount', name: 'Amount', type: PORT.VALUE },
      { id: 'color', name: 'Color', type: PORT.COLOR },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'count', label: 'Count', type: 'range', min: 1, max: 100, step: 1, default: 10 },
      { id: 'lineWidth', label: 'Line Width', type: 'range', min: 1, max: 50, step: 1, default: 5 },
      { id: 'angle', label: 'Angle', type: 'range', min: -180, max: 180, step: 1, default: 0 },
      { id: 'spread', label: 'Spread', type: 'range', min: 0, max: 1, step: 0.01, default: 0.5 },
    ],
    effectId: 'geo-lines',
  });

  register('ptcl-burst', {
    name: 'Particle Burst',
    category: 'effect',
    color: '#fb923c',
    icon: '✨',
    inputs: [
      { id: 'audio', name: 'Audio', type: PORT.AUDIO },
      { id: 'color', name: 'Color', type: PORT.COLOR },
      { id: 'trigger', name: 'Trigger', type: PORT.TRIGGER },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'count', label: 'Count', type: 'range', min: 10, max: 500, step: 10, default: 100 },
      { id: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 5, step: 0.1, default: 2 },
      { id: 'size', label: 'Size', type: 'range', min: 1, max: 20, step: 1, default: 4 },
      { id: 'life', label: 'Life', type: 'range', min: 0.5, max: 5, step: 0.1, default: 2 },
    ],
    effectId: 'ptcl-burst',
  });

  register('ptcl-fire', {
    name: 'Fire',
    category: 'effect',
    color: '#fb923c',
    icon: '🔥',
    inputs: [
      { id: 'audio', name: 'Audio', type: PORT.AUDIO },
      { id: 'color', name: 'Color', type: PORT.COLOR },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'intensity', label: 'Intensity', type: 'range', min: 0.1, max: 3, step: 0.1, default: 1 },
      { id: 'width', label: 'Width', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.5 },
      { id: 'height', label: 'Height', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.6 },
    ],
    effectId: 'ptcl-fire',
  });

  register('ptcl-snow', {
    name: 'Snow',
    category: 'effect',
    color: '#38bdf8',
    icon: '❄️',
    inputs: [
      { id: 'color', name: 'Color', type: PORT.COLOR },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'count', label: 'Count', type: 'range', min: 20, max: 500, step: 10, default: 150 },
      { id: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 3, step: 0.1, default: 1 },
      { id: 'size', label: 'Size', type: 'range', min: 1, max: 8, step: 0.5, default: 3 },
    ],
    effectId: 'ptcl-snow',
  });

  register('mtn-starfield', {
    name: 'Starfield',
    category: 'effect',
    color: '#8b5cf6',
    icon: '🌟',
    inputs: [
      { id: 'audio', name: 'Audio', type: PORT.AUDIO },
      { id: 'color', name: 'Color', type: PORT.COLOR },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'starCount', label: 'Star Count', type: 'range', min: 50, max: 1000, step: 50, default: 300 },
      { id: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 10, step: 0.1, default: 2 },
    ],
    effectId: 'mtn-starfield',
  });

  register('mtn-tunnel', {
    name: 'Tunnel',
    category: 'effect',
    color: '#8b5cf6',
    icon: '🕳️',
    inputs: [
      { id: 'audio', name: 'Audio', type: PORT.AUDIO },
      { id: 'color', name: 'Color', type: PORT.COLOR },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'rings', label: 'Rings', type: 'range', min: 3, max: 20, step: 1, default: 8 },
      { id: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 5, step: 0.1, default: 1.5 },
      { id: 'sides', label: 'Sides', type: 'range', min: 3, max: 8, step: 1, default: 6 },
    ],
    effectId: 'mtn-tunnel',
  });

  register('bg-plasma', {
    name: 'Plasma',
    category: 'effect',
    color: '#f472b6',
    icon: '🟣',
    inputs: [
      { id: 'audio', name: 'Audio', type: PORT.AUDIO },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 5, step: 0.1, default: 1 },
      { id: 'scale', label: 'Scale', type: 'range', min: 1, max: 20, step: 0.5, default: 5 },
      { id: 'complexity', label: 'Complexity', type: 'range', min: 1, max: 5, step: 1, default: 3 },
    ],
    effectId: 'bg-plasma',
  });

  register('bg-gradient', {
    name: 'Gradient',
    category: 'effect',
    color: '#f472b6',
    icon: '🌈',
    inputs: [
      { id: 'audio', name: 'Audio', type: PORT.AUDIO },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'speed', label: 'Speed', type: 'range', min: 0, max: 5, step: 0.1, default: 0.5 },
      { id: 'saturation', label: 'Saturation', type: 'range', min: 0, max: 100, step: 1, default: 70 },
      { id: 'lightness', label: 'Lightness', type: 'range', min: 5, max: 60, step: 1, default: 25 },
    ],
    effectId: 'bg-gradient',
  });

  register('fx-strobe', {
    name: 'Strobe',
    category: 'effect',
    color: '#ef4444',
    icon: '⚡',
    inputs: [
      { id: 'audio', name: 'Audio', type: PORT.AUDIO },
      { id: 'trigger', name: 'Trigger', type: PORT.TRIGGER },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'rate', label: 'Rate', type: 'range', min: 1, max: 30, step: 1, default: 10 },
      { id: 'intensity', label: 'Intensity', type: 'range', min: 0, max: 1, step: 0.01, default: 0.8 },
    ],
    effectId: 'fx-strobe',
  });

  register('fx-glitch', {
    name: 'Glitch',
    category: 'effect',
    color: '#ef4444',
    icon: '📺',
    inputs: [
      { id: 'canvas', name: 'Input', type: PORT.CANVAS },
      { id: 'audio', name: 'Audio', type: PORT.AUDIO },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'intensity', label: 'Intensity', type: 'range', min: 0, max: 1, step: 0.01, default: 0.3 },
      { id: 'sliceCount', label: 'Slices', type: 'range', min: 1, max: 20, step: 1, default: 5 },
      { id: 'rgbSplit', label: 'RGB Split', type: 'range', min: 0, max: 1, step: 0.01, default: 0 },
      { id: 'bw', label: 'B/W Mode', type: 'range', min: 0, max: 1, step: 1, default: 0 },
      { id: 'noise', label: 'Noise', type: 'range', min: 0, max: 1, step: 0.01, default: 0 },
    ],
    effectId: 'fx-glitch',
  });

  // ═══════════════════════════════════════
  //  TRANSFORM NODES
  // ═══════════════════════════════════════

  register('blend', {
    name: 'Blend',
    category: 'transform',
    color: '#f472b6',
    icon: '🔀',
    inputs: [
      { id: 'a', name: 'Input A', type: PORT.CANVAS },
      { id: 'b', name: 'Input B', type: PORT.CANVAS },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'mode', label: 'Mode', type: 'select',
        options: ['source-over','screen','multiply','overlay','lighten','hard-light','color-dodge','difference','exclusion'],
        default: 'screen' },
      { id: 'opacity', label: 'Opacity B', type: 'range', min: 0, max: 1, step: 0.01, default: 1 },
    ],
  });

  register('opacity', {
    name: 'Opacity',
    category: 'transform',
    color: '#f472b6',
    icon: '👁',
    inputs: [
      { id: 'canvas', name: 'Input', type: PORT.CANVAS },
      { id: 'amount', name: 'Amount', type: PORT.VALUE },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'opacity', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.01, default: 1 },
    ],
  });

  register('scale-transform', {
    name: 'Scale',
    category: 'transform',
    color: '#f472b6',
    icon: '🔍',
    inputs: [
      { id: 'canvas', name: 'Input', type: PORT.CANVAS },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'scaleX', label: 'Scale X', type: 'range', min: 0.1, max: 3, step: 0.05, default: 1 },
      { id: 'scaleY', label: 'Scale Y', type: 'range', min: 0.1, max: 3, step: 0.05, default: 1 },
    ],
  });

  register('mirror', {
    name: 'Mirror',
    category: 'transform',
    color: '#f472b6',
    icon: '🪞',
    inputs: [
      { id: 'canvas', name: 'Input', type: PORT.CANVAS },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'axis', label: 'Axis', type: 'select', options: ['horizontal', 'vertical', 'both'], default: 'horizontal' },
    ],
  });

  register('color-shift', {
    name: 'Color Shift',
    category: 'transform',
    color: '#22c55e',
    icon: '🎭',
    inputs: [
      { id: 'canvas', name: 'Input', type: PORT.CANVAS },
      { id: 'amount', name: 'Amount', type: PORT.VALUE },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'hueShift', label: 'Hue Shift', type: 'range', min: -360, max: 360, step: 1, default: 0 },
      { id: 'multiplier', label: 'Multiplier', type: 'range', min: -10, max: 10, step: 0.1, default: 1 },
    ],
  });

  register('transform-pos', {
    name: 'Position',
    category: 'transform',
    color: '#f472b6',
    icon: '☩',
    inputs: [
      { id: 'canvas', name: 'Input', type: PORT.CANVAS },
      { id: 'x', name: 'X', type: PORT.VALUE },
      { id: 'y', name: 'Y', type: PORT.VALUE },
    ],
    outputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    params: [
      { id: 'offsetX', label: 'Offset X', type: 'range', min: -1, max: 1, step: 0.01, default: 0 },
      { id: 'offsetY', label: 'Offset Y', type: 'range', min: -1, max: 1, step: 0.01, default: 0 },
    ],
  });

  // ═══════════════════════════════════════
  //  UTILITY NODES
  // ═══════════════════════════════════════

  register('math', {
    name: 'Math',
    category: 'utility',
    color: '#facc15',
    icon: '🧮',
    inputs: [
      { id: 'a', name: 'A', type: PORT.VALUE },
      { id: 'b', name: 'B', type: PORT.VALUE },
    ],
    outputs: [
      { id: 'result', name: 'Result', type: PORT.VALUE },
    ],
    params: [
      { id: 'op', label: 'Operation', type: 'select', options: ['add','subtract','multiply','divide','min','max','mod'], default: 'multiply' },
      { id: 'fallbackB', label: 'Fallback B', type: 'range', min: 0, max: 10, step: 0.01, default: 1 },
    ],
  });

  register('remap', {
    name: 'Remap',
    category: 'utility',
    color: '#facc15',
    icon: '📐',
    inputs: [
      { id: 'input', name: 'Input', type: PORT.VALUE },
    ],
    outputs: [
      { id: 'output', name: 'Output', type: PORT.VALUE },
    ],
    params: [
      { id: 'inMin', label: 'In Min', type: 'range', min: 0, max: 10, step: 0.01, default: 0 },
      { id: 'inMax', label: 'In Max', type: 'range', min: 0, max: 10, step: 0.01, default: 1 },
      { id: 'outMin', label: 'Out Min', type: 'range', min: 0, max: 10, step: 0.01, default: 0 },
      { id: 'outMax', label: 'Out Max', type: 'range', min: 0, max: 10, step: 0.01, default: 1 },
    ],
  });

  register('smooth', {
    name: 'Smooth',
    category: 'utility',
    color: '#facc15',
    icon: '〜',
    inputs: [
      { id: 'input', name: 'Input', type: PORT.VALUE },
    ],
    outputs: [
      { id: 'output', name: 'Output', type: PORT.VALUE },
    ],
    params: [
      { id: 'factor', label: 'Smoothing', type: 'range', min: 0.01, max: 0.99, step: 0.01, default: 0.85 },
    ],
  });

  register('envelope', {
    name: 'Envelope',
    category: 'utility',
    color: '#facc15',
    icon: '📉',
    inputs: [
      { id: 'trigger', name: 'Trigger', type: PORT.TRIGGER },
    ],
    outputs: [
      { id: 'value', name: 'Value', type: PORT.VALUE },
    ],
    params: [
      { id: 'decay', label: 'Decay', type: 'range', min: 0.8, max: 0.99, step: 0.01, default: 0.95 },
      { id: 'multiplier', label: 'Multiplier', type: 'range', min: 0.1, max: 10, step: 0.1, default: 1 },
    ],
  });

  register('trigger-toggle', {
    name: 'Trig Toggle',
    category: 'utility',
    color: '#facc15',
    icon: '🔁',
    inputs: [
      { id: 'trigger', name: 'Trigger', type: PORT.TRIGGER },
      { id: 'val1', name: 'Value 1', type: PORT.VALUE },
      { id: 'val2', name: 'Value 2', type: PORT.VALUE },
    ],
    outputs: [
      { id: 'value', name: 'Value', type: PORT.VALUE },
    ],
    params: [
      { id: 'interval', label: 'Interval (e.g. 1/4, 2)', type: 'text', default: '1' },
      { id: 'smooth', label: 'Smooth Glide', type: 'range', min: 0, max: 0.99, step: 0.01, default: 0 },
    ],
  });

  register('monitor', {
    name: 'Monitor',
    category: 'utility',
    color: '#facc15',
    icon: '👁‍🗨',
    inputs: [
      { id: 'value', name: 'Value', type: PORT.VALUE },
    ],
    outputs: [
      { id: 'value', name: 'Value', type: PORT.VALUE },
    ],
    params: [],
  });

  // ═══════════════════════════════════════
  //  OUTPUT NODES
  // ═══════════════════════════════════════

  register('output-screen', {
    name: 'Screen Output',
    category: 'output',
    color: '#22c55e',
    icon: '🖥',
    inputs: [
      { id: 'canvas', name: 'Canvas', type: PORT.CANVAS },
    ],
    outputs: [],
    params: [
      { id: 'opacity', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.01, default: 1 },
      { id: 'deck', label: 'Deck', type: 'select', options: ['none', 'a', 'b'], default: 'none' },
    ],
  });

  return {
    get(type) { return _types[type] || null; },
    getAll() { return _types; },
    getByCategory(category) {
      return Object.values(_types).filter(t => t.category === category);
    },
    getCategories() {
      const cats = new Set(Object.values(_types).map(t => t.category));
      return Array.from(cats);
    },
    PORT,
    PORT_COLORS,
    register,
  };
})();

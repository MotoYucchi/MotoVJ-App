// MotoVJ v3 — VJ Runtime
// Shared state for all visual effects (time, audio, color utilities)
'use strict';
(function() {
  const _centerBuf = new Uint8Array(1024);
  const _leftBuf   = new Uint8Array(1024);
  const _rightBuf  = new Uint8Array(1024);

  const _colorCache = Object.create(null);
  let _cacheSize = 0;

  const VJ = window.VJ = {
    params: {},
    groupColor: { r: 0, g: 0, b: 0 },

    fft: {
      center: _centerBuf,
      left: _leftBuf,
      right: _rightBuf,
      bass: 0, mid: 0, high: 0,
      bassL: 0, midL: 0, highL: 0,
      bassR: 0, midR: 0, highR: 0,
      bin(i)  { return this.center[i] / 255; },
      binL(i) { return this.left[i] / 255; },
      binR(i) { return this.right[i] / 255; },
    },

    time: 0,
    dt: 0,
    beat: 0,
    _lastTime: 0,

    // Color utilities
    hexToRgb(hex) {
      if (!hex) return { r: 0, g: 0, b: 0 };
      if (_colorCache[hex]) return _colorCache[hex];
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      const result = m
        ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
        : { r: 0, g: 0, b: 0 };
      if (_cacheSize < 200) { _colorCache[hex] = result; _cacheSize++; }
      return result;
    },

    baseColor(alpha) {
      const r = (this.params.baseR ?? 0)   + this.groupColor.r;
      const g = (this.params.baseG ?? 255) + this.groupColor.g;
      const b = (this.params.baseB ?? 255) + this.groupColor.b;
      return `rgba(${r % 256},${g % 256},${b % 256},${alpha ?? this.params.baseA ?? 1})`;
    },

    hsl(h, s, l, a = 1) {
      return `hsla(${h % 360},${s}%,${l}%,${a})`;
    },

    _analyzeBands(data) {
      const bass = (data[1] + data[2] + data[3] + data[4] + data[5]) / 1275;
      let midSum = 0;
      for (let i = 20; i <= 60; i++) midSum += data[i];
      const mid = midSum / 10455;
      let highSum = 0;
      for (let i = 100; i <= 200; i++) highSum += data[i];
      const high = highSum / 25755;
      return { bass: bass || 0, mid: mid || 0, high: high || 0 };
    },

    updateTime(timestamp) {
      this.dt = Math.min(0.1, (timestamp - this._lastTime) / 1000);
      this._lastTime = timestamp;
      this.time += this.dt;
      this.beat *= 0.92;
    },

    updateAudio(msg) {
      const src = msg.fft || msg.center;
      if (src) {
        const len = Math.min(src.length, _centerBuf.length);
        for (let i = 0; i < len; i++) _centerBuf[i] = src[i];
      }
      const c = this._analyzeBands(_centerBuf);
      this.fft.bass = c.bass; this.fft.mid = c.mid; this.fft.high = c.high;

      if (msg.left) {
        const len = Math.min(msg.left.length, _leftBuf.length);
        for (let i = 0; i < len; i++) _leftBuf[i] = msg.left[i];
        const l = this._analyzeBands(_leftBuf);
        this.fft.bassL = l.bass; this.fft.midL = l.mid; this.fft.highL = l.high;
      }
      if (msg.right) {
        const len = Math.min(msg.right.length, _rightBuf.length);
        for (let i = 0; i < len; i++) _rightBuf[i] = msg.right[i];
        const r = this._analyzeBands(_rightBuf);
        this.fft.bassR = r.bass; this.fft.midR = r.mid; this.fft.highR = r.high;
      }
    },

    // Legacy compat
    canvas() { return null; },
    init() {},
    run() {},
    setTargetFps() {},
  };
})();

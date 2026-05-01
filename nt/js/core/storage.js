// MotoVJ v3 — Local Storage Manager
window.VJStorage = {
  PREFIX: 'vjv3_',

  get(key) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch (e) { console.warn('Storage write failed:', e); }
  },

  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  getGraph() { return this.get('graph'); },
  setGraph(data) { this.set('graph', data); }
};

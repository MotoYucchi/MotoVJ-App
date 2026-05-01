// MotoVJ v3 — Event Bus
// Publish/Subscribe pattern for decoupled communication
window.VJBus = {
  _listeners: {},

  on(event, fn) {
    (this._listeners[event] ||= []).push(fn);
    return () => this.off(event, fn);
  },

  off(event, fn) {
    const list = this._listeners[event];
    if (list) this._listeners[event] = list.filter(f => f !== fn);
  },

  emit(event, ...args) {
    const list = this._listeners[event];
    if (list) list.forEach(fn => { try { fn(...args); } catch(e) { console.error(`Bus[${event}]:`, e); } });
  },

  once(event, fn) {
    const wrapper = (...args) => { this.off(event, wrapper); fn(...args); };
    this.on(event, wrapper);
  }
};

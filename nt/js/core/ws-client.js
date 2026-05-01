// MotoVJ v3 — WebSocket Client
window.VJWs = (() => {
  let ws = null;
  let reconnectTimer = null;
  let reconnectDelay = 1000;

  function connect() {
    try {
      ws = new WebSocket(`ws://${location.host}/ws`);
    } catch (e) {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      console.log('🔌 WS connected');
      reconnectDelay = 1000;
      VJBus.emit('ws:connected');
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        VJBus.emit('ws:message', msg);
        if (msg.type) VJBus.emit(`ws:${msg.type}`, msg);
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onclose = () => {
      VJBus.emit('ws:disconnected');
      scheduleReconnect();
    };

    ws.onerror = () => {};
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      connect();
      reconnectDelay = Math.min(reconnectDelay * 1.5, 15000);
    }, reconnectDelay);
  }

  return {
    init() { connect(); },

    send(data) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(typeof data === 'string' ? data : JSON.stringify(data));
      }
    },

    isConnected() { return ws?.readyState === WebSocket.OPEN; }
  };
})();

// ws-client.js
// WebSocketの接続とメッセージ送受信を担当するモジュール

window.VJWs = {
  ws: null,
  
  // onMessageCallbackは、受信したデータをmain.jsのUIに渡すための関数
  init(onMessageCallback) {
    this.ws = new WebSocket(`ws://${location.host}/ws`);
    this.ws.binaryType = 'arraybuffer';
    
    this.ws.onopen = () => console.log("🎛️ Controller WebSocket Connected!");
    this.ws.onerror = (err) => console.error("❌ Controller WS Error:", err);
    
    this.ws.onmessage = (e) => {
      try {
        if (e.data instanceof ArrayBuffer) {
          if (onMessageCallback) onMessageCallback(new Uint8Array(e.data));
          return;
        }
        const msg = JSON.parse(e.data);
        if (onMessageCallback) onMessageCallback(msg);
      } catch(err) {
        // audio_data等のパース不要なものは無視
      }
    };
  },

  pendingParams: {},
  lastSendTime: 0,
  throttleTimer: null,

  send(dataObj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (dataObj.type === 'param_update') {
        // パラメータごとに最新状態を上書き保存
        const key = `${dataObj.deckId}_${dataObj.groupId}_${dataObj.layerId}_${dataObj.paramId}`;
        this.pendingParams[key] = dataObj;
        
        // 最大40Hz（25ms間隔）で送信するためのスロットリング
        if (!this.throttleTimer) {
          const now = Date.now();
          const delay = Math.max(0, 25 - (now - this.lastSendTime));
          this.throttleTimer = setTimeout(() => this.flush(), delay);
        }
      } else {
        // param_update以外は即時送信
        this.ws.send(JSON.stringify(dataObj));
      }
    }
  },

  flush() {
    this.throttleTimer = null;
    this.lastSendTime = Date.now();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      Object.keys(this.pendingParams).forEach(key => {
        this.ws.send(JSON.stringify(this.pendingParams[key]));
      });
      this.pendingParams = {};
    }
  }
};
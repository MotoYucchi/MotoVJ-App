// ws-client.js
// WebSocketの接続とメッセージ送受信を担当するモジュール

window.VJWs = {
  ws: null,
  
  // onMessageCallbackは、受信したデータをmain.jsのUIに渡すための関数
  init(onMessageCallback) {
    this.ws = new WebSocket(`ws://${location.host}/ws`);
    
    this.ws.onopen = () => console.log("🎛️ Controller WebSocket Connected!");
    this.ws.onerror = (err) => console.error("❌ Controller WS Error:", err);
    
    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (onMessageCallback) onMessageCallback(msg);
      } catch(err) {
        // audio_data等のパース不要なものは無視
      }
    };
  },

  send(dataObj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(dataObj));
    }
  }
};
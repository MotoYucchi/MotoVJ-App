// main.js
// 音声入力・解析・データ送信モジュール

document.addEventListener('DOMContentLoaded', () => {
  const startAudioBtn = document.getElementById('start-audio-btn');
  const audioStatus = document.getElementById('audio-status');

  if (!startAudioBtn) return;

  startAudioBtn.addEventListener('click', async () => {
    try {
      // スマホ（iOS Safari等）対応: AudioContextはユーザー操作（click等）の直後に同期的に作成・再開する必要がある
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // getUserMediaの互換性対策
      if (navigator.mediaDevices === undefined) {
        navigator.mediaDevices = {};
      }
      if (navigator.mediaDevices.getUserMedia === undefined) {
        navigator.mediaDevices.getUserMedia = function(constraints) {
          var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
          if (!getUserMedia) {
            return Promise.reject(new Error('スマホブラウザ等のセキュリティ制限により、マイクを使用できません。https:// でアクセスするか、localhostである必要があります。(getUserMedia is not implemented)'));
          }
          return new Promise(function(resolve, reject) {
            getUserMedia.call(navigator, constraints, resolve, reject);
          });
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } 
      });
      
      const audioTrack = stream.getAudioTracks()[0];
      audioStatus.innerText = `✅ 解析中: ${audioTrack.label || "不明"}`;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024; 
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      let lastSendTime = 0;
      function audioLoop(timestamp) {
        if (timestamp - lastSendTime > 33) {
          analyser.getByteFrequencyData(dataArray);
          // バイナリデータ(ArrayBuffer)をそのまま送信し、JSON化の負荷をゼロに
          if (window.VJWs && window.VJWs.ws && window.VJWs.ws.readyState === WebSocket.OPEN) {
            window.VJWs.ws.send(dataArray.buffer);
          }
          lastSendTime = timestamp;
        }
        requestAnimationFrame(audioLoop);
      }
      requestAnimationFrame(audioLoop);
      
      startAudioBtn.style.background = "#28a745";
      startAudioBtn.innerText = "🎙 Audio Active";
      startAudioBtn.disabled = true;

    } catch (err) {
      alert("音声入力エラー: " + err);
      audioStatus.innerText = "❌ エラー";
    }
  });
});
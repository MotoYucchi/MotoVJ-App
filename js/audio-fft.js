// main.js
// 音声入力・解析・データ送信モジュール

document.addEventListener('DOMContentLoaded', () => {
  const startAudioBtn = document.getElementById('start-audio-btn');
  const audioStatus = document.getElementById('audio-status');

  if (!startAudioBtn) return;

  startAudioBtn.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } 
      });
      
      const audioTrack = stream.getAudioTracks()[0];
      audioStatus.innerText = `✅ 解析中: ${audioTrack.label || "不明"}`;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024; 
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      function audioLoop() {
        analyser.getByteFrequencyData(dataArray);
        // 新しい通信モジュールを使って送信
        if (window.VJWs) {
          window.VJWs.send({ type: 'audio_data', fft: Array.from(dataArray) });
        }
        requestAnimationFrame(audioLoop);
      }
      audioLoop();
      
      startAudioBtn.style.background = "#28a745";
      startAudioBtn.innerText = "🎙 Audio Active";
      startAudioBtn.disabled = true;

    } catch (err) {
      alert("音声入力エラー: " + err);
      audioStatus.innerText = "❌ エラー";
    }
  });
});
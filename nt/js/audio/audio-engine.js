// MotoVJ v3 — Audio Engine
// Microphone FFT analysis → WebSocket broadcast
window.VJAudio = (() => {
  let _audioCtx = null;
  let _analyser = null;
  let _stream = null;
  let _active = false;
  let _sendInterval = null;
  const _fftSize = 2048;
  const _dataArray = new Uint8Array(1024);

  async function start() {
    if (_active) return;
    try {
      _stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = _audioCtx.createMediaStreamSource(_stream);
      _analyser = _audioCtx.createAnalyser();
      _analyser.fftSize = _fftSize;
      _analyser.smoothingTimeConstant = 0.75;
      source.connect(_analyser);
      _active = true;

      // Send FFT data at 30fps
      _sendInterval = setInterval(sendFFT, 1000 / 30);

      VJBus.emit('audio:started');
      VJToast.success(VJi18n.t('audio_start'));
    } catch (e) {
      console.error('Audio start failed:', e);
      VJToast.error('Audio: ' + e.message);
    }
  }

  function stop() {
    if (!_active) return;
    if (_sendInterval) clearInterval(_sendInterval);
    if (_stream) _stream.getTracks().forEach(t => t.stop());
    if (_audioCtx) _audioCtx.close();
    _active = false;
    _stream = null;
    _audioCtx = null;
    _analyser = null;
    VJBus.emit('audio:stopped');
  }

  function sendFFT() {
    if (!_analyser) return;
    _analyser.getByteFrequencyData(_dataArray);
    const msg = {
      type: 'audio_data',
      fft: Array.from(_dataArray),
    };
    VJWs.send(msg);
    if (window.VJ) window.VJ.updateAudio(msg);
  }

  function toggle() {
    if (_active) stop();
    else start();
  }

  return {
    init() {
      VJBus.on('audio:toggle', toggle);
    },
    start,
    stop,
    toggle,
    isActive() { return _active; },
  };
})();

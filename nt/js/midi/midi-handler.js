// MotoVJ v3 — MIDI Handler
window.VJMidi = (() => {
  let _access = null;

  async function init() {
    if (!navigator.requestMIDIAccess) {
      console.log('MIDI not supported');
      return;
    }
    try {
      _access = await navigator.requestMIDIAccess();
      _access.inputs.forEach(input => {
        input.onmidimessage = handleMessage;
      });
      _access.onstatechange = (e) => {
        if (e.port.type === 'input' && e.port.state === 'connected') {
          e.port.onmidimessage = handleMessage;
        }
      };
      console.log('🎹 MIDI initialized');
    } catch (e) {
      console.warn('MIDI init failed:', e);
    }
  }

  function handleMessage(msg) {
    const [status, control, value] = msg.data;
    const channel = status & 0x0f;
    const type = status & 0xf0;

    VJBus.emit('midi:message', { channel, type, control, value, raw: msg.data });

    // CC messages → map to node params
    if (type === 0xb0) {
      VJBus.emit('midi:cc', { channel, control, value: value / 127 });
    }
    // Note On
    if (type === 0x90 && value > 0) {
      VJBus.emit('midi:noteon', { channel, note: control, velocity: value / 127 });
    }
  }

  return { init };
})();

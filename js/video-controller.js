// js/video-controller.js

document.addEventListener('DOMContentLoaded', () => {
  let videoFolderCache = [];
  let currentFolder = '';
  let selectedTrackFile = '';
  let selectedTrackTitle = '';
  let isSeekingA = false;
  let isSeekingB = false;

  const state = {
    folderA: '', trackA: '', playA: false, speedA: 1.0, audioA: false, opacityA: 100,
    folderB: '', trackB: '', playB: false, speedB: 1.0, audioB: false, opacityB: 100,
    crossfader: 0,
    playerOpacity: 100,
    playerZIndex: 'background'
  };

  const previewA = document.getElementById('preview-a');
  const previewB = document.getElementById('preview-b');
  const overlayA = document.getElementById('overlay-a');
  const overlayB = document.getElementById('overlay-b');
  
  const seekA = document.getElementById('seek-a');
  const seekB = document.getElementById('seek-b');
  const speedA = document.getElementById('speed-a');
  const speedB = document.getElementById('speed-b');
  const crossfader = document.getElementById('crossfader');
  
  // Audio devices
  async function initAudioDevices() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
      const select = document.getElementById('audio-output-select');
      let options = '<option value="">Default Output</option>';
      audioOutputs.forEach(device => {
        if (device.deviceId && device.deviceId !== 'default') {
          options += `<option value="${device.deviceId}">${device.label || 'Unknown Device'}</option>`;
        }
      });
      select.innerHTML = options;
      select.addEventListener('change', (e) => {
        const id = e.target.value;
        if (previewA.setSinkId) { previewA.setSinkId(id); previewB.setSinkId(id); }
      });
    } catch(e) {}
  }
  initAudioDevices();

  // WS
  VJWs.init(handleIncomingMessage);

  function sendParam(paramId, value) {
    VJWs.send({ type: 'param_update', deckId: 'deck-a', groupId: null, layerId: 'broadcast', paramId: paramId, value: value });
  }

  function handleIncomingMessage(msg) {
    if (msg.type === 'param_update' && state[msg.paramId] !== undefined) {
      state[msg.paramId] = msg.value;
      syncUI();
    }
  }

  function syncUI() {
    if (state.folderA && state.trackA) {
      const src = `/Video/${encodeURIComponent(state.folderA)}/${encodeURIComponent(state.trackA)}`;
      if (!previewA.src.endsWith(src)) previewA.src = src;
    }
    if (state.folderB && state.trackB) {
      const src = `/Video/${encodeURIComponent(state.folderB)}/${encodeURIComponent(state.trackB)}`;
      if (!previewB.src.endsWith(src)) previewB.src = src;
    }

    if (state.playA) { previewA.play().catch(e=>{}); overlayA.innerHTML = '<i class="fas fa-pause"></i>'; overlayA.style.background = 'transparent'; overlayA.style.opacity = '0'; }
    else { previewA.pause(); overlayA.innerHTML = '<i class="fas fa-play"></i>'; overlayA.style.background = 'rgba(0,0,0,0.5)'; overlayA.style.opacity = '1'; }

    if (state.playB) { previewB.play().catch(e=>{}); overlayB.innerHTML = '<i class="fas fa-pause"></i>'; overlayB.style.background = 'transparent'; overlayB.style.opacity = '0'; }
    else { previewB.pause(); overlayB.innerHTML = '<i class="fas fa-play"></i>'; overlayB.style.background = 'rgba(0,0,0,0.5)'; overlayB.style.opacity = '1'; }

    // Hover effect for invisible playing overlays
    overlayA.onmouseenter = () => { if(state.playA) overlayA.style.opacity = '1'; };
    overlayA.onmouseleave = () => { if(state.playA) overlayA.style.opacity = '0'; };
    overlayB.onmouseenter = () => { if(state.playB) overlayB.style.opacity = '1'; };
    overlayB.onmouseleave = () => { if(state.playB) overlayB.style.opacity = '0'; };

    crossfader.value = state.crossfader;
    
    speedA.value = state.speedA;
    speedB.value = state.speedB;
    document.getElementById('speed-val-a').textContent = parseFloat(state.speedA).toFixed(2);
    document.getElementById('speed-val-b').textContent = parseFloat(state.speedB).toFixed(2);
    previewA.playbackRate = state.speedA;
    previewB.playbackRate = state.speedB;

    previewA.muted = !state.audioA;
    previewB.muted = !state.audioB;
    const aBtn = document.getElementById('audio-a-btn');
    if(state.audioA) { aBtn.classList.add('active'); aBtn.textContent = 'ON'; } else { aBtn.classList.remove('active'); aBtn.textContent = 'OFF'; }
    const bBtn = document.getElementById('audio-b-btn');
    if(state.audioB) { bBtn.classList.add('active'); bBtn.textContent = 'ON'; } else { bBtn.classList.remove('active'); bBtn.textContent = 'OFF'; }

    document.getElementById('opacity-a').value = state.opacityA;
    document.getElementById('opacity-b').value = state.opacityB;
    document.getElementById('player-opacity').value = state.playerOpacity;

    const btnBg = document.getElementById('btn-bg');
    const btnFg = document.getElementById('btn-fg');
    if (state.playerZIndex === 'background') {
      btnBg.classList.add('active'); btnFg.classList.remove('active');
    } else {
      btnBg.classList.remove('active'); btnFg.classList.add('active');
    }
  }

  // Audio Toggle
  document.getElementById('audio-a-btn').onclick = () => { state.audioA = !state.audioA; syncUI(); };
  document.getElementById('audio-b-btn').onclick = () => { state.audioB = !state.audioB; syncUI(); };

  // Play Overlay Click
  overlayA.onclick = () => { state.playA = !state.playA; sendParam('playA', state.playA); syncUI(); };
  overlayB.onclick = () => { state.playB = !state.playB; sendParam('playB', state.playB); syncUI(); };

  // Adjust logic (global function for onclick)
  window.adjustTime = function(deck, delta) {
    const video = deck === 'A' ? previewA : previewB;
    if (video.duration) {
      let newT = video.currentTime + delta;
      if (newT < 0) newT = 0;
      if (newT > video.duration) newT = video.duration;
      video.currentTime = newT;
      sendParam(`time${deck}`, newT);
    }
  };

  // Speed logic
  speedA.addEventListener('input', e => {
    state.speedA = e.target.value;
    document.getElementById('speed-val-a').textContent = parseFloat(state.speedA).toFixed(2);
  });
  speedA.addEventListener('change', e => { sendParam('speedA', state.speedA); syncUI(); });

  speedB.addEventListener('input', e => {
    state.speedB = e.target.value;
    document.getElementById('speed-val-b').textContent = parseFloat(state.speedB).toFixed(2);
  });
  speedB.addEventListener('change', e => { sendParam('speedB', state.speedB); syncUI(); });

  // Opacity
  document.getElementById('opacity-a').addEventListener('input', e => {
    state.opacityA = e.target.value;
    sendParam('opacityA', state.opacityA);
  });
  document.getElementById('opacity-b').addEventListener('input', e => {
    state.opacityB = e.target.value;
    sendParam('opacityB', state.opacityB);
  });

  // Master Opacity
  document.getElementById('player-opacity').addEventListener('input', e => {
    state.playerOpacity = e.target.value;
    sendParam('player_opacity', state.playerOpacity);
  });

  // Z-Index Toggle
  document.getElementById('btn-bg').onclick = () => {
    state.playerZIndex = 'background';
    sendParam('player_zindex', 'background');
    syncUI();
  };
  document.getElementById('btn-fg').onclick = () => {
    state.playerZIndex = 'foreground';
    sendParam('player_zindex', 'foreground');
    syncUI();
  };

  // Formatting time
  function formatTime(sec) {
    if (isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function setupSeek(video, seekInput, currEl, durEl, deckKey) {
    video.addEventListener('timeupdate', () => {
      currEl.textContent = formatTime(video.currentTime);
      durEl.textContent = formatTime(video.duration);
      const isSeeking = deckKey === 'A' ? isSeekingA : isSeekingB;
      if (!isSeeking && video.duration) {
        seekInput.value = (video.currentTime / video.duration) * 100;
      }
    });
    seekInput.addEventListener('mousedown', () => deckKey==='A'?isSeekingA=true:isSeekingB=true);
    seekInput.addEventListener('touchstart', () => deckKey==='A'?isSeekingA=true:isSeekingB=true);
    seekInput.addEventListener('input', e => {
      if (video.duration) {
        video.currentTime = (e.target.value / 100) * video.duration;
        currEl.textContent = formatTime(video.currentTime);
      }
    });
    seekInput.addEventListener('change', e => {
      deckKey==='A'?isSeekingA=false:isSeekingB=false;
      if (video.duration) sendParam(`time${deckKey}`, video.currentTime);
    });
  }
  setupSeek(previewA, seekA, document.getElementById('time-curr-a'), document.getElementById('time-dur-a'), 'A');
  setupSeek(previewB, seekB, document.getElementById('time-curr-b'), document.getElementById('time-dur-b'), 'B');

  // Crossfader
  crossfader.addEventListener('input', e => {
    state.crossfader = e.target.value;
    sendParam('crossfader', state.crossfader);
  });

  // Fetch Folders
  async function fetchVideoFolders() {
    try {
      const res = await fetch('/list_video_folders');
      videoFolderCache = await res.json();
      const options = '<option value="">-- Select Playlist Folder --</option>' + videoFolderCache.map(f => `<option value="${f}">${f}</option>`).join('');
      document.getElementById('library-folder').innerHTML = options;
    } catch(e) { }
  }
  fetchVideoFolders();

  // Load Tracks
  document.getElementById('library-folder').addEventListener('change', async (e) => {
    currentFolder = e.target.value;
    const box = document.getElementById('library-tracks');
    box.innerHTML = '';
    selectedTrackFile = '';
    if (currentFolder) {
      try {
        const res = await fetch(`/Video/${encodeURIComponent(currentFolder)}/index.csv`);
        if (res.ok) {
          const csvText = await res.text();
          const lines = csvText.trim().split('\n');
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length >= 4) {
              const div = document.createElement('div');
              div.className = 'track-item';
              div.textContent = cols[0].trim();
              div.dataset.file = cols[3].trim();
              div.onclick = () => {
                box.querySelectorAll('.track-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                selectedTrackFile = div.dataset.file;
                selectedTrackTitle = div.textContent;
              };
              box.appendChild(div);
            }
          }
        }
      } catch (err) {}
    }
  });

  // Load Buttons
  document.getElementById('btn-load-a').addEventListener('click', () => {
    if (currentFolder && selectedTrackFile) {
      state.folderA = currentFolder;
      state.trackA = selectedTrackFile;
      
      // Reset Time and Speed
      state.timeA = 0;
      state.speedA = 1.0;
      sendParam('timeA', 0);
      sendParam('speedA', 1.0);
      document.getElementById('speed-a').value = 1.0;
      document.getElementById('speed-val-a').textContent = "1.00";
      
      document.getElementById('title-a').textContent = selectedTrackTitle;
      sendParam('folderA', state.folderA); sendParam('trackA', state.trackA); syncUI();
    }
  });

  document.getElementById('btn-load-b').addEventListener('click', () => {
    if (currentFolder && selectedTrackFile) {
      state.folderB = currentFolder;
      state.trackB = selectedTrackFile;
      
      // Reset Time and Speed
      state.timeB = 0;
      state.speedB = 1.0;
      sendParam('timeB', 0);
      sendParam('speedB', 1.0);
      document.getElementById('speed-b').value = 1.0;
      document.getElementById('speed-val-b').textContent = "1.00";
      
      document.getElementById('title-b').textContent = selectedTrackTitle;
      sendParam('folderB', state.folderB); sendParam('trackB', state.trackB); syncUI();
    }
  });

  // ====== Audio Monitor Modal Logic ======
  const modal = document.getElementById('monitor-modal');
  const btnMonitor = document.getElementById('btn-monitor');
  const btnCloseModal = document.getElementById('btn-close-modal');
  
  const btnForceSync = document.getElementById('btn-force-sync');
  
  if (btnForceSync) {
    btnForceSync.addEventListener('click', () => {
      // Broadcast all current states to sync the viewer
      Object.keys(state).forEach(key => {
        sendParam(key, state[key]);
      });
      syncUI();
    });
  }

  if (btnMonitor && modal && btnCloseModal) {
    btnMonitor.addEventListener('click', () => modal.classList.add('open'));
    btnCloseModal.addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  }

  // Audio Device Setup
  async function initAudioMonitorDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
      const select = document.getElementById('audio-output-select');
      if (!select) return;

      let options = '<option value="">Default Output</option>';
      audioOutputs.forEach(device => {
        if (device.deviceId && device.deviceId !== 'default') {
          options += `<option value="${device.deviceId}">${device.label || 'Unknown Device'}</option>`;
        }
      });
      select.innerHTML = options;

      select.addEventListener('change', (e) => {
        const deviceId = e.target.value;
        const audioA = document.getElementById('monitor-audio-a');
        const audioB = document.getElementById('monitor-audio-b');
        if (typeof audioA.setSinkId === 'function') {
          audioA.setSinkId(deviceId);
          audioB.setSinkId(deviceId);
        } else {
          console.warn("setSinkId is not supported in this browser.");
        }
      });
    } catch(e) {
      console.warn("Audio enumeration failed or denied", e);
    }
  }
  initAudioMonitorDevices();

  // Sync Audio Playback
  function syncAudioPlayback() {
    const audioA = document.getElementById('monitor-audio-a');
    const audioB = document.getElementById('monitor-audio-b');
    if (!audioA || !audioB) return;
    
    if (state.folderA && state.trackA) {
      const srcA = `/Video/${encodeURIComponent(state.folderA)}/${encodeURIComponent(state.trackA)}`;
      if (!audioA.src.endsWith(srcA)) {
        audioA.src = srcA;
        audioA.currentTime = document.getElementById('preview-a').currentTime || 0;
      }
      if (state.playA) audioA.play().catch(e=>console.warn(e));
      else audioA.pause();
    }
    
    if (state.folderB && state.trackB) {
      const srcB = `/Video/${encodeURIComponent(state.folderB)}/${encodeURIComponent(state.trackB)}`;
      if (!audioB.src.endsWith(srcB)) {
        audioB.src = srcB;
        audioB.currentTime = document.getElementById('preview-b').currentTime || 0;
      }
      if (state.playB) audioB.play().catch(e=>console.warn(e));
      else audioB.pause();
    }
  }

  // Hook sync logic into syncUI
  const originalSyncUI = syncUI;
  syncUI = function() {
    originalSyncUI();
    syncAudioPlayback();
  };

  // --- Speed Presets Logic ---
  window.setSpeed = function(deck, val, relative = false) {
    const isA = (deck === 'A');
    let currentSpeed = isA ? parseFloat(state.speedA) : parseFloat(state.speedB);
    
    let newSpeed = relative ? currentSpeed + val : val;
    newSpeed = Math.max(0.5, Math.min(2.0, newSpeed)); // clamp

    if (isA) {
      state.speedA = newSpeed;
      document.getElementById('speed-a').value = newSpeed;
      document.getElementById('speed-val-a').textContent = newSpeed.toFixed(2);
      previewA.playbackRate = newSpeed;
      sendParam('speedA', newSpeed);
    } else {
      state.speedB = newSpeed;
      document.getElementById('speed-b').value = newSpeed;
      document.getElementById('speed-val-b').textContent = newSpeed.toFixed(2);
      previewB.playbackRate = newSpeed;
      sendParam('speedB', newSpeed);
    }
  };

  // --- Auto-Transition Logic ---
  const btnTransition = document.getElementById('btn-transition');
  const cfDurationInput = document.getElementById('cf-duration');
  let transitionRaf = null;

  btnTransition.addEventListener('click', () => {
    if (transitionRaf) cancelAnimationFrame(transitionRaf);

    const durationSec = parseFloat(cfDurationInput.value) || 2.0;
    const durationMs = durationSec * 1000;
    const startVal = parseFloat(state.crossfader);
    const targetVal = startVal < 50 ? 100 : 0;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      let progress = Math.min(elapsed / durationMs, 1);
      
      // smoothstep easing
      const ease = progress * progress * (3 - 2 * progress);
      
      const currentVal = startVal + (targetVal - startVal) * ease;
      state.crossfader = currentVal;
      crossfader.value = currentVal;
      sendParam('crossfader', currentVal);
      
      if (progress < 1) {
        transitionRaf = requestAnimationFrame(step);
      }
    }
    transitionRaf = requestAnimationFrame(step);
  });

});

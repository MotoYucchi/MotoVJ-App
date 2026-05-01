// MotoVJ v3 — Toast Notifications
window.VJToast = (() => {
  let _container;

  function show(message, type = 'info', duration = 3000) {
    if (!_container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    _container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      el.style.transition = 'all 300ms';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  return {
    init() {
      _container = document.getElementById('toast-container');
      VJBus.on('toast:info', (msg) => show(msg, 'info'));
      VJBus.on('toast:success', (msg) => show(msg, 'success'));
      VJBus.on('toast:warning', (msg) => show(msg, 'warning'));
      VJBus.on('toast:error', (msg) => show(msg, 'error'));
    },
    info: (msg) => show(msg, 'info'),
    success: (msg) => show(msg, 'success'),
    warning: (msg) => show(msg, 'warning'),
    error: (msg) => show(msg, 'error'),
  };
})();

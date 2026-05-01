// MotoVJ v3 — Modal Dialog
window.VJModal = (() => {
  function show({ title, body, buttons = [] }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal anim-scale-in';
    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">${title}</span>
        <button class="btn btn-icon modal-close">✕</button>
      </div>
      <div class="modal-body">${typeof body === 'string' ? body : ''}</div>
      <div class="modal-footer"></div>
    `;

    if (typeof body !== 'string' && body instanceof HTMLElement) {
      modal.querySelector('.modal-body').appendChild(body);
    }

    const footer = modal.querySelector('.modal-footer');
    buttons.forEach(btn => {
      const el = document.createElement('button');
      el.className = `btn ${btn.class || 'btn-ghost'}`;
      el.textContent = btn.label;
      el.addEventListener('click', () => {
        if (btn.action) btn.action();
        close();
      });
      footer.appendChild(el);
    });

    const close = () => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 200ms';
      setTimeout(() => overlay.remove(), 200);
    };

    modal.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    return { close };
  }

  function prompt(title, defaultValue = '') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = defaultValue;
      input.style.width = '100%';
      input.style.marginTop = '8px';

      const { close } = show({
        title,
        body: input,
        buttons: [
          { label: 'Cancel', action: () => resolve(null) },
          { label: 'OK', class: 'btn-primary', action: () => resolve(input.value) },
        ]
      });

      setTimeout(() => input.focus(), 100);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { resolve(input.value); close(); }
        if (e.key === 'Escape') { resolve(null); close(); }
      });
    });
  }

  return { init() {}, show, prompt };
})();

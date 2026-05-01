// MotoVJ v3 — Context Menu
window.VJContextMenu = (() => {
  let _current = null;

  function close() {
    if (_current) { _current.remove(); _current = null; }
  }

  function show(x, y, items) {
    close();
    const menu = document.createElement('div');
    menu.className = 'context-menu anim-scale-in';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    items.forEach(item => {
      if (item === 'separator') {
        menu.appendChild(Object.assign(document.createElement('div'), { className: 'context-menu-separator' }));
        return;
      }

      if (item.sub) {
        const subWrap = document.createElement('div');
        subWrap.className = 'context-menu-sub';
        const label = document.createElement('div');
        label.className = 'context-menu-item context-menu-sub-label';
        label.textContent = item.label;
        subWrap.appendChild(label);

        const subMenu = document.createElement('div');
        subMenu.className = 'context-menu-sub-menu';
        item.sub.forEach(subItem => {
          const subEl = document.createElement('div');
          subEl.className = 'context-menu-item';
          subEl.textContent = subItem.label;
          subEl.addEventListener('click', () => { close(); subItem.action?.(); });
          subMenu.appendChild(subEl);
        });
        subWrap.appendChild(subMenu);
        menu.appendChild(subWrap);
        return;
      }

      const el = document.createElement('div');
      el.className = 'context-menu-item';
      el.innerHTML = (item.icon ? `<span>${item.icon}</span>` : '') + `<span>${item.label}</span>`;
      el.addEventListener('click', () => { close(); item.action?.(); });
      menu.appendChild(el);
    });

    document.body.appendChild(menu);
    _current = menu;

    // Adjust position if off-screen
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';
  }

  function init() {
    document.addEventListener('click', close);
    document.addEventListener('contextmenu', close);

    // Node editor context menu
    VJBus.on('editor:contextmenu', ({ screenX, screenY, worldX, worldY }) => {
      const categories = VJNodeTypes.getCategories();
      const items = [];

      categories.forEach(cat => {
        const types = VJNodeTypes.getByCategory(cat);
        items.push({
          label: `${VJi18n.t(cat)} (${types.length})`,
          sub: types.map(t => ({
            label: `${t.icon} ${t.name}`,
            action: () => VJNodeEditorCanvas.addNodeAt(t.type, worldX, worldY),
          }))
        });
      });

      items.push('separator');
      items.push({
        icon: '🔍',
        label: VJi18n.t('zoom_fit'),
        action: () => VJNodeEditorCanvas.zoomToFit(),
      });
      items.push({
        icon: '💾',
        label: VJi18n.t('save'),
        action: () => VJNodeEditorCanvas.saveGraph(),
      });

      show(screenX, screenY, items);
    });
  }

  return { init, show, close };
})();

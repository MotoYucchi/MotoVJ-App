// MotoVJ v3 — Node Palette (Left Panel)
// Drag-and-drop nodes from categories into the editor canvas
window.VJNodePalette = (() => {
  function init(container) {
    if (!container) return;

    const header = document.createElement('div');
    header.className = 'node-palette-header';
    header.textContent = VJi18n.t('nodes');
    container.appendChild(header);

    // Search
    const searchWrap = document.createElement('div');
    searchWrap.className = 'node-palette-search';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = VJi18n.t('search_nodes');
    searchInput.id = 'node-palette-search-input';
    searchWrap.appendChild(searchInput);
    container.appendChild(searchWrap);

    const list = document.createElement('div');
    list.className = 'node-palette-list';
    list.id = 'node-palette-list';
    container.appendChild(list);

    renderList(list, '');

    searchInput.addEventListener('input', () => {
      renderList(list, searchInput.value.toLowerCase());
    });
  }

  function renderList(container, filter) {
    container.innerHTML = '';
    const categories = ['source', 'effect', 'transform', 'utility', 'output'];

    categories.forEach(cat => {
      let types = VJNodeTypes.getByCategory(cat);
      if (filter) {
        types = types.filter(t =>
          t.name.toLowerCase().includes(filter) ||
          t.type.toLowerCase().includes(filter)
        );
      }
      if (types.length === 0) return;

      const catEl = document.createElement('div');
      catEl.className = 'node-palette-category';

      const titleEl = document.createElement('div');
      titleEl.className = 'node-palette-category-title';
      titleEl.textContent = VJi18n.t(cat);
      catEl.appendChild(titleEl);

      types.forEach(typeDef => {
        const item = document.createElement('div');
        item.className = 'node-palette-item';
        item.draggable = true;

        const dot = document.createElement('span');
        dot.className = 'node-palette-item-dot';
        dot.style.background = typeDef.color;
        item.appendChild(dot);

        const label = document.createElement('span');
        label.textContent = `${typeDef.icon} ${typeDef.name}`;
        item.appendChild(label);

        // Drag start
        item.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/node-type', typeDef.type);
          e.dataTransfer.effectAllowed = 'copy';
          item.style.opacity = '0.5';
        });

        item.addEventListener('dragend', () => {
          item.style.opacity = '1';
        });

        // Double-click to add at center
        item.addEventListener('dblclick', () => {
          VJNodeEditorCanvas.addNodeAt(typeDef.type, 200, 200);
        });

        catEl.appendChild(item);
      });

      container.appendChild(catEl);
    });
  }

  return { init };
})();

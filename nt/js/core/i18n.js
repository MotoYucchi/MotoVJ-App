// MotoVJ v3 — i18n (Internationalization)
window.VJi18n = (() => {
  const _strings = {
    ja: {
      ready: 'MotoVJ v3 準備完了',
      save: '保存', load: '読込', settings: '設定',
      add_node: 'ノード追加', delete_node: 'ノード削除',
      connect: '接続', disconnect: '切断',
      audio_start: 'オーディオ開始', audio_stop: 'オーディオ停止',
      preset_save: 'プリセット保存', preset_load: 'プリセット読込',
      preset_delete: 'プリセット削除', preset_name: 'プリセット名',
      zoom_in: 'ズームイン', zoom_out: 'ズームアウト', zoom_fit: 'フィット',
      nodes: 'ノード', properties: 'プロパティ', palette: 'パレット',
      source: 'ソース', effect: 'エフェクト', transform: '変換',
      output: '出力', utility: 'ユーティリティ',
      no_selection: 'ノードを選択してください',
      graph_saved: 'グラフを保存しました',
      graph_loaded: 'グラフを読み込みました',
      preset_saved: 'プリセットを保存しました',
      confirm_delete: '本当に削除しますか？',
      language: '言語', general_tab: '一般', midi_tab: 'MIDI',
      display_section: '表示', audio_section: 'オーディオ',
      ui_scale: 'UIスケール', reset: 'リセット', about: 'About',
      fps: 'FPS', audio_active: 'Audio: Active', audio_inactive: 'Audio: Off',
      search_nodes: 'ノードを検索...',
    },
    en: {
      ready: 'MotoVJ v3 Ready',
      save: 'Save', load: 'Load', settings: 'Settings',
      add_node: 'Add Node', delete_node: 'Delete Node',
      connect: 'Connect', disconnect: 'Disconnect',
      audio_start: 'Start Audio', audio_stop: 'Stop Audio',
      preset_save: 'Save Preset', preset_load: 'Load Preset',
      preset_delete: 'Delete Preset', preset_name: 'Preset Name',
      zoom_in: 'Zoom In', zoom_out: 'Zoom Out', zoom_fit: 'Fit All',
      nodes: 'Nodes', properties: 'Properties', palette: 'Palette',
      source: 'Source', effect: 'Effect', transform: 'Transform',
      output: 'Output', utility: 'Utility',
      no_selection: 'Select a node',
      graph_saved: 'Graph saved',
      graph_loaded: 'Graph loaded',
      preset_saved: 'Preset saved',
      confirm_delete: 'Are you sure you want to delete?',
      language: 'Language', general_tab: 'General', midi_tab: 'MIDI',
      display_section: 'Display', audio_section: 'Audio',
      ui_scale: 'UI Scale', reset: 'Reset', about: 'About',
      fps: 'FPS', audio_active: 'Audio: Active', audio_inactive: 'Audio: Off',
      search_nodes: 'Search nodes...',
    }
  };

  let _lang = 'ja';

  return {
    init() {
      const saved = localStorage.getItem('vjv3_lang');
      if (saved && _strings[saved]) _lang = saved;
    },
    t(key) { return _strings[_lang]?.[key] || _strings['en']?.[key] || key; },
    getLang() { return _lang; },
    setLang(code) {
      if (_strings[code]) {
        _lang = code;
        localStorage.setItem('vjv3_lang', code);
        VJBus.emit('lang:changed', code);
      }
    },
    getSupportedLangs() {
      return [{ code: 'ja', name: '日本語' }, { code: 'en', name: 'English' }];
    }
  };
})();

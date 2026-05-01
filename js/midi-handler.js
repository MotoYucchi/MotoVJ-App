// midi-handler.js
window.VJMidi = {
    focusedDeck: 'deck-a',
    // STARRYPADのCC番号とバンク済み論理名のマッピング
    idMap: {
        // --- Bank 1 ---
        28: 'Knob1-1', 9: 'Knob2-1', 
        20: 'Fader1-1', 21: 'Fader2-1',
        // --- Bank 2 ---
        12: 'Knob1-2', 13: 'Knob2-2',
        22: 'Fader1-2', 23: 'Fader2-2',
        // --- Bank 3 ---
        14: 'Knob1-3', 15: 'Knob2-3',
        24: 'Fader1-3', 25: 'Fader2-3',
        
        // システム操作
        60: 'PlayPause', 62: 'Record'

        // 26: 'DeckSwitchA', 27: 'DeckSwitchB' // デッキ切り替えは別途処理

        // Padは36-83で連番なので、個別にマッピングせずにhandleMessage内で処理
        // 例: 36 -> Pad1, 37 -> Pad2, ..., 83 -> Pad48

        // PadとBankは、0-127の範囲で、26と27がデッキ切り替えに使用されるため、これもhandleMessage内で処理
        // Padは、MIDIコントローラー側に切り替えボタンがあるため、同じIDで複数の論理名を切り替えることができる。例えば、Bank1でPad1はID36、Bank2でPad1はID36など。
    },

    async init() {
        if (!navigator.requestMIDIAccess) return;
        try {
            const access = await navigator.requestMIDIAccess();
            for (let input of access.inputs.values()) {
                if (input.name.includes("STARRYPAD")) {
                    input.onmidimessage = (e) => this.handleMessage(e.data);
                    console.log(`✅ MIDI Ready: STARRYPAD (Bank Support)`);
                }
            }
        } catch (err) { console.error(err); }
    },

    handleMessage(data) {
        const [status, id, value] = data;

        // デッキ切り替え
        if (id === 26 && value === 127) { this.focusedDeck = 'deck-a'; return; }
        if (id === 27 && value === 127) { this.focusedDeck = 'deck-b'; return; }

        let logicalName = this.idMap[id];
        
        // Padマッピング (36-83 -> Pad1 - Pad48)
        if (!logicalName && id >= 36 && id <= 83) {
            logicalName = `Pad${id - 35}`;
        }

        if (logicalName) {
            this.applyToElements(logicalName, value);
        }
    },

    applyToElements(logicalName, midiValue) {
        // フォーカスデッキ内の、一致する論理名を持つ要素をすべて操作
        const selector = `#panel-${this.focusedDeck} [data-midi="${logicalName}"]`;
        const targets = document.querySelectorAll(selector);

        targets.forEach(el => {
            const min = parseFloat(el.min) || 0;
            const max = parseFloat(el.max) || 100;
            const scaledValue = min + (max - min) * (midiValue / 127);

            el.value = scaledValue;
            window.updateParamFromUI(
                el.dataset.deck, 
                el.dataset.group, 
                el.dataset.layer === "null" ? null : el.dataset.layer, 
                el.dataset.param, 
                scaledValue
            );
        });
    }
};
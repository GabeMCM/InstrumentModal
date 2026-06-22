import { store } from '../state/state.js';
import { STATE_ACTION_TOKENS, STATE_MESSAGE_TOKENS } from '../state/state.tokens.js';
import { renderer } from './renderer.js';
import { audioEngine } from '../audio/engine.js';
import { GLOBAL_TOKENS, MUSIC_TOKENS, DEFAULT_BINDINGS, PERFORMANCE_EFFECTS } from '../tokens/master.tokens.js';
import { elements } from './elements.js';
import { rhythmEngine } from '../audio/rhythm.js';
import { RHYTHM_TOKENS } from '../audio/rhythm.tokens.js';
import { events } from './events.js';
import { DOM_EVENTS_TOKENS } from '../tokens/api.tokens.js';

export const features = {
  currentCaptureSnapshot() {
    if (store.state.tonic === null) return null;
    const matchedIndex = renderer.matchingMemoryIndex();
    const currentMemoryMatches = store.state.currentMemoryIndex !== null
      && store.state.memories[store.state.currentMemoryIndex]
      && [...store.state.memories[store.state.currentMemoryIndex].degrees].sort((a, b) => a - b).join(",")
        === [...store.state.degrees].sort((a, b) => a - b).join(",");
    const memoryIndex = currentMemoryMatches ? store.state.currentMemoryIndex : matchedIndex;
    const memoryLabel = memoryIndex >= 0
      ? store.state.memories[memoryIndex].name
      : store.state.degrees.size
        ? renderer.memoryName([...store.state.degrees])
        : STATE_MESSAGE_TOKENS.TONIC_LABEL;
    const noteName = renderer.currentNoteName();
    return {
      tonic: store.state.tonic,
      noteName,
      octave: store.state.octave,
      degrees: [...store.state.degrees],
      memoryIndex: memoryIndex >= 0 ? memoryIndex : null,
      memoryName: memoryIndex >= 0 ? store.state.memories[memoryIndex].name : null,
      displayName: `${noteName}${memoryLabel}`,
    };
  },

  capturePerformanceMemory(index) {
    const snapshot = store.state.pendingCapture || this.currentCaptureSnapshot();
    if (!snapshot) {
      elements.soundState.textContent = STATE_MESSAGE_TOKENS.ERR_NO_TONIC;
      return;
    }
    store.state.performanceMemories[index] = { ...snapshot };
    store.savePerformanceMemories();
    renderer.renderPerformanceMemories();
    elements.soundState.textContent = `${STATE_MESSAGE_TOKENS.MSG_PERFORMANCE} ${index + 1} ${STATE_MESSAGE_TOKENS.SEPARATOR_DOT} ${store.state.performanceMemories[index].displayName}`;
  },

  captureInNextPerformanceSlot() {
    const nextIndex = store.state.performanceMemories.findIndex(item => !item);
    if (nextIndex < 0) {
      elements.soundState.textContent = STATE_MESSAGE_TOKENS.ERR_PERF_FULL;
      return;
    }
    this.capturePerformanceMemory(nextIndex);
  },

  captureInNextBaseSlot() {
    const nextIndex = store.state.baseMemories.findIndex(item => !item);
    if (nextIndex < 0) {
      elements.soundState.textContent = STATE_MESSAGE_TOKENS.ERR_BASE_FULL;
      return;
    }
    const snapshot = store.state.pendingCapture || this.currentCaptureSnapshot();
    if (!snapshot) return;
    store.state.baseMemories[nextIndex] = { ...snapshot };
    store.saveBaseMemories();
    renderer.renderBaseMemories();
    elements.soundState.textContent = `${STATE_MESSAGE_TOKENS.MSG_BASE} ${nextIndex + 1} ${STATE_MESSAGE_TOKENS.SEPARATOR_DOT} ${snapshot.displayName}`;
  },

  openCaptureDialog() {
    const snapshot = this.currentCaptureSnapshot();
    if (!snapshot) return;
    const noteFree = store.state.performanceMemories.some(item => !item);
    const baseFree = store.state.baseMemories.some(item => !item);
    if (!noteFree && !baseFree) {
      elements.soundState.textContent = STATE_MESSAGE_TOKENS.ERR_ALL_FULL;
      return;
    }
    store.state.pendingCapture = snapshot;
    if (!baseFree) {
      this.captureInNextPerformanceSlot();
      store.state.pendingCapture = null;
      return;
    }
    if (!noteFree) {
      this.captureInNextBaseSlot();
      store.state.pendingCapture = null;
      return;
    }
    elements.captureDialogNote.textContent = `${snapshot.displayName} ${STATE_MESSAGE_TOKENS.SEPARATOR_DOT} ${STATE_MESSAGE_TOKENS.MSG_OCTAVE} ${snapshot.octave}`;
    elements.captureAsNote.disabled = !noteFree;
    elements.captureAsBase.disabled = !baseFree;
    elements.captureDialog.showModal();
  },

  openSetDialog() {
    const notes = store.state.performanceMemories.filter(Boolean).length;
    const bases = store.state.baseMemories.filter(Boolean).length;
    if (!notes && !bases) {
      elements.soundState.textContent = STATE_MESSAGE_TOKENS.ERR_NO_SET_ITEMS;
      return;
    }
    elements.setDialogSummary.textContent = `${notes} NOTAS · ${bases} BASES · O ritmo permanecerá livre.`;
    elements.setNameInput.value = "";
    elements.setDialog.showModal();
    window.setTimeout(() => elements.setNameInput.focus(), 0);
  },

  createSet(name) {
    const now = Date.now();
    const set = {
      id: `set-${now}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      notes: this.cloneSlots(store.state.performanceMemories, 20),
      bases: this.cloneSlots(store.state.baseMemories, 10),
      createdAt: now,
      updatedAt: now,
    };
    store.state.sets.unshift(set);
    store.state.activeSetId = set.id;
    store.saveSets();
    renderer.renderSets();
    elements.soundState.textContent = `${STATE_MESSAGE_TOKENS.MSG_SET_SAVED} ${STATE_MESSAGE_TOKENS.SEPARATOR_DOT} ${set.name}`;
  },

  loadSet(id) {
    const set = store.state.sets.find(item => item.id === id);
    if (!set) return;
    this.stopBase();
    store.state.performanceMemories = this.cloneSlots(set.notes, 20);
    store.state.baseMemories = this.cloneSlots(set.bases, 10);
    store.state.activeSetId = id;
    store.state.activePerformanceSlot = null;
    store.savePerformanceMemories();
    store.saveBaseMemories();
    store.saveSets();
    renderer.renderPerformanceMemories();
    renderer.renderBaseMemories();
    renderer.renderSets();
    elements.soundState.textContent = `${STATE_MESSAGE_TOKENS.MSG_SET_LOADED} ${STATE_MESSAGE_TOKENS.SEPARATOR_DOT} ${set.name}`;
  },

  updateActiveSet() {
    const set = store.state.sets.find(item => item.id === store.state.activeSetId);
    if (!set) return;
    set.notes = this.cloneSlots(store.state.performanceMemories, 20);
    set.bases = this.cloneSlots(store.state.baseMemories, 10);
    set.updatedAt = Date.now();
    store.saveSets();
    renderer.renderSets();
    elements.soundState.textContent = `${STATE_MESSAGE_TOKENS.MSG_SET_UPDATED} ${STATE_MESSAGE_TOKENS.SEPARATOR_DOT} ${set.name}`;
  },

  deleteSet(id) {
    const set = store.state.sets.find(item => item.id === id);
    if (!set) return;
    store.state.sets = store.state.sets.filter(item => item.id !== id);
    if (store.state.activeSetId === id) store.state.activeSetId = null;
    store.saveSets();
    renderer.renderSets();
    elements.soundState.textContent = `CONJUNTO EXCLUÍDO · ${set.name}`;
  },

  reorderSet(draggedId, targetId) {
    if (!draggedId || !targetId || draggedId === targetId) return;
    const fromIndex = store.state.sets.findIndex(set => set.id === draggedId);
    const toIndex = store.state.sets.findIndex(set => set.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = store.state.sets.splice(fromIndex, 1);
    store.state.sets.splice(toIndex, 0, moved);
    store.saveSets();
    renderer.renderSets();
    elements.soundState.textContent = `ORDEM ATUALIZADA · ${moved.name}`;
  },

  navigateSet(direction) {
    if (!store.state.sets.length) return;
    const currentIndex = store.state.sets.findIndex(set => set.id === store.state.activeSetId);
    const nextIndex = currentIndex < 0
      ? direction > 0 ? 0 : store.state.sets.length - 1
      : Math.max(0, Math.min(store.state.sets.length - 1, currentIndex + direction));
    if (nextIndex === currentIndex) return;
    this.loadSet(store.state.sets[nextIndex].id);
  },

  cloneSlots(slots, length) {
    return Array.from({ length }, (_, index) => {
      const item = slots[index];
      return item ? JSON.parse(JSON.stringify(item)) : null;
    });
  },

  baseMidiNotes(item) {
    const root = 12 * (item.octave + 1) + item.tonic;
    return [...new Set([
      root - 12,
      ...item.degrees.map(index => root + MUSIC_TOKENS.DEGREES[index][1]),
    ])].slice(0, 9);
  },

  stopBase() {
    if (!audioEngine.ctx || !store.state.baseVoices.length) {
      store.state.activeBaseSlot = null;
      renderer.renderBaseMemories();
      return;
    }
    const now = audioEngine.ctx.currentTime;
    store.state.baseVoices.forEach(({ oscillators, gain }) => {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0.0001, now, 0.16);
      oscillators.forEach(oscillator => oscillator.stop(now + 0.9));
    });
    store.state.baseVoices = [];
    store.state.activeBaseSlot = null;
    window.setTimeout(() => renderer.renderBaseMemories(), 40);
  },

  startBase(index) {
    const item = store.state.baseMemories[index];
    if (!item) return;
    this.stopBase();
    audioEngine.init();
    const now = audioEngine.ctx.currentTime;
    const notes = this.baseMidiNotes(item);
    const soundSet = MUSIC_TOKENS.SOUND_SETS[store.state.soundSet] || MUSIC_TOKENS.SOUND_SETS.piano;

    store.state.baseVoices = notes.map((midi, noteIndex) => {
      const gain = audioEngine.ctx.createGain();
      const filter = audioEngine.ctx.createBiquadFilter();
      const pan = audioEngine.ctx.createStereoPanner();
      const oscillators = [];
      const level = 0.055 / Math.sqrt(notes.length);

      filter.type = "lowpass";
      filter.frequency.value = soundSet.engine === GLOBAL_TOKENS.ENGINE_PIANO ? 1500 : 1100;
      filter.Q.value = 0.6;
      pan.pan.value = notes.length > 1 ? (noteIndex / (notes.length - 1) - 0.5) * 0.38 : 0;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(level, now + 0.8);

      [-5, 5].forEach((cents, voiceIndex) => {
        const oscillator = audioEngine.ctx.createOscillator();
        oscillator.type = voiceIndex ? "sine" : "triangle";
        oscillator.frequency.value = audioEngine.midiToFrequency(midi);
        oscillator.detune.value = cents;
        oscillator.connect(filter);
        oscillator.start(now);
        oscillators.push(oscillator);
      });

      filter.connect(gain).connect(pan).connect(audioEngine.master);
      return { oscillators, gain };
    });

    store.state.activeBaseSlot = index;
    renderer.renderBaseMemories();
    elements.soundState.textContent = `BASE · ${item.displayName}`;
  },

  toggleBaseMemory(index) {
    if (!store.state.baseMemories[index]) {
      elements.soundState.textContent = `BASE ${index + 1} VAZIA`;
      return;
    }
    if (store.state.activeBaseSlot === index) this.stopBase();
    else this.startBase(index);
  },

  recallPerformanceMemory(index) {
    const item = store.state.performanceMemories[index];
    if (!item) {
      elements.soundState.textContent = `NOTA ${index + 1} VAZIA`;
      return;
    }
    if (!store.state.pedalActive) audioEngine.dampVoices(0.12);
    store.state.tonic = item.tonic;
    store.state.octave = item.octave;
    store.state.degrees = new Set(item.degrees);
    store.state.currentMemoryIndex = item.memoryIndex;
    store.state.smartPosition = null;
    store.state.activePerformanceSlot = index;
    renderer.updateUI();
    renderer.renderPerformanceMemories();
    renderer.updateStageCurrent();
    
    // Play the note immediately if the pedal is active or if we just want it to trigger on press
    audioEngine.strum(GLOBAL_TOKENS.ACTION_RHYTHM_DOWN);

    elements.soundState.textContent = `P${String(index + 1).padStart(2, "0")} · ${item.noteName}`;
  },

  openMemoryDialog(index, renameOnly) {
    const memory = store.state.memories[index];
    if (!renameOnly && !store.state.degrees.size) {
      elements.soundState.textContent = "ESCOLHA AO MENOS UM GRAU";
      return;
    }
    if (renameOnly && !memory) return;

    const degrees = renameOnly ? memory.degrees : [...store.state.degrees].slice(0, 4);
    store.state.editingMemory = { index, degrees };
    elements.memoryDialogTitle.textContent = renameOnly ? `Renomear memória ${index + 1}` : `Salvar memória ${index + 1}`;
    elements.memoryDialogDegrees.textContent = `FORMA · ${renderer.memoryName(degrees)}`;
    elements.memoryNameInput.value = memory?.name || renderer.memoryName(degrees);
    elements.memoryDialog.showModal();
    window.setTimeout(() => {
      elements.memoryNameInput.focus();
      elements.memoryNameInput.select();
    }, 0);
  },

  storeMemory(index, degrees, name) {
    store.state.memories[index] = {
      name: name.trim() || renderer.memoryName(degrees),
      degrees,
    };
    store.saveMemories();
    renderer.renderMemories();
    renderer.renderTonicLinks();
    renderer.updateUI();
    elements.soundState.textContent = `MEMÓRIA ${index + 1} SALVA · ${store.state.memories[index].name}`;
  },

  renderMappings() {
    const query = elements.mappingSearch.value.trim().toLocaleLowerCase("pt-BR");
    const groups = new Map();

    Object.keys(store.state.bindings).forEach(action => {
      const label = this.actionLabel(action);
      const [groupName, context, contextClass] = this.mappingGroup(action);
      const haystack = `${label} ${groupName} ${context} ${renderer.keyLabel(store.state.bindings[action])}`.toLocaleLowerCase("pt-BR");
      if (query && !haystack.includes(query)) return;
      if (!groups.has(groupName)) groups.set(groupName, { context, contextClass, actions: [] });
      groups.get(groupName).actions.push(action);
    });

    elements.mappingList.innerHTML = [...groups.entries()].map(([groupName, group]) => `
      <section class="mapping-group">
        <div class="mapping-group-header">
          <span>${groupName}</span>
          <small>${group.context} · ${group.actions.length}</small>
        </div>
        <div class="mapping-group-grid">
          ${group.actions.map(action => `
            <button class="mapping-item ${store.state.remapping === action ? "listening" : ""}" data-map="${action}" type="button">
              <span>
                <span class="mapping-function">${this.actionLabel(action)}</span>
                <span class="mapping-item-context">${group.context}</span>
              </span>
              <span class="mapping-item-key">
                <span class="keycap">${renderer.keyLabel(store.state.bindings[action])}</span>
                <span class="mapping-change">ALTERAR</span>
              </span>
            </button>
          `).join("")}
        </div>
      </section>
    `).join("");

    elements.mappingList.querySelectorAll("[data-map]").forEach(button => {
      button.addEventListener(DOM_EVENTS_TOKENS.CLICK, () => this.beginShortcutCapture(button.dataset.map));
    });
  },

  actionLabel(action) {
    if (action.startsWith("tonic")) return `Tônica ${MUSIC_TOKENS.TONICS[Number(action.slice(5))][0]}`;
    if (action.startsWith("degree")) return `Grau ${MUSIC_TOKENS.DEGREES[Number(action.slice(6))][0]}`;
    if (action.startsWith("memory")) return `Memória ${Number(action.slice(6)) + 1}`;
    if (action.startsWith("performance")) return `Apresentação ${Number(action.slice(11)) + 1}`;
    if (action.startsWith("base")) return `Nota base ${Number(action.slice(4)) + 1}`;
    return {
      octaveDown: "Oitava −",
      octaveUp: "Oitava +",
      rhythmDown: "Pedal sustain",
      rhythmUp: "Livre",
      effect: "Bend +2",
      effectBendDown: "Bend −2",
    }[action];
  },

  mappingGroup(action) {
    if (action.startsWith("tonic")) return ["TÔNICAS", "Compositor", "composer"];
    if (action.startsWith("degree")) return ["GRAUS", "Compositor", "composer"];
    if (action.startsWith("memory")) return ["MEMÓRIAS HARMÔNICAS", "Compositor", "composer"];
    if (action.startsWith("performance")) return ["NOTAS DE APRESENTAÇÃO", "Apresentação", "stage"];
    if (action.startsWith("base")) return ["NOTAS BASE", "Apresentação", "stage"];
    if (["octaveDown", "octaveUp"].includes(action)) return ["OITAVA", "Compositor", "composer"];
    return ["PERFORMANCE AO VIVO", "Compartilhado", "stage"];
  },

  beginShortcutCapture(action) {
    if (false && store.state.smartMode) {
      elements.soundState.textContent = "NO MODO CAMPO, O TECLADO É FIXO";
      return;
    }
    store.state.remapping = action;
    store.state.pendingShortcut = null;
    store.state.remapModifierCodes.clear();
    elements.shortcutCapture.hidden = false;
    elements.captureActionName.textContent = this.actionLabel(action);
    elements.captureShortcutPreview.textContent = "PRESSIONE UMA TECLA";
    elements.confirmShortcut.disabled = true;
    this.renderMappings();
  },

  cancelShortcutCapture() {
    store.state.remapping = null;
    store.state.pendingShortcut = null;
    store.state.remapModifierCodes.clear();
    elements.shortcutCapture.hidden = true;
    elements.confirmShortcut.disabled = true;
    this.renderMappings();
  },

  setShortcutPreview(shortcut) {
    store.state.pendingShortcut = shortcut;
    elements.captureShortcutPreview.textContent = renderer.keyLabel(shortcut);
    elements.confirmShortcut.disabled = false;
  },

  commitShortcutCapture() {
    if (!store.state.remapping || !store.state.pendingShortcut) return;
    const action = store.state.remapping;
    const swapped = this.findConflictingAction(store.state.pendingShortcut, action);
    if (swapped && swapped !== action) store.state.bindings[swapped] = store.state.bindings[action];
    store.state.bindings[action] = store.state.pendingShortcut;
    store.saveBindings();
    this.cancelShortcutCapture();
    renderer.renderKeys();
    renderer.renderPerformanceMemories();
    renderer.renderBaseMemories();
  },

  findConflictingAction(code, targetAction) {
    const stageOnly = action => action.startsWith("performance") || action.startsWith("base");
    const sharedLive = action => action === "rhythmDown" || action.startsWith("effect");
    return Object.keys(store.state.bindings).find(action =>
      action !== targetAction
      && (
        stageOnly(targetAction)
          ? stageOnly(action) || sharedLive(action)
          : !stageOnly(action)
      )
      && store.state.bindings[action] === code
    );
  },

  updateRhythmControls() {
    const preset = rhythmEngine.currentPreset();
    const manual = Boolean(preset.manual);
    const rhythmPrimaryLabel = document.querySelector("#rhythmPrimaryLabel");
    const rhythmPrimaryCopy = document.querySelector("#rhythmPrimaryCopy");
    if (rhythmPrimaryLabel) rhythmPrimaryLabel.textContent = "PEDAL";
    if (rhythmPrimaryCopy) rhythmPrimaryCopy.textContent = "ALONGA APÓS SOLTAR";
    elements.rhythmPresetSelect.value = store.state.rhythmPreset;
    elements.tempoControl.disabled = manual;
    elements.stageTempoControl.disabled = manual;
    elements.stageRhythmPreset.value = store.state.rhythmPreset;
    elements.stageTempoControl.value = store.state.tempo;
    elements.tempoControl.value = store.state.tempo;
    elements.engineLabel.textContent = `RHYTHM SET · ${preset.source || "INSTALADO"}`;
    elements.beatState.textContent = manual ? "COMPASSO: LIVRE" : `${preset.meter} · PARADO`;
    [elements.autoRhythmButton, elements.stageAutoRhythmButton].filter(Boolean).forEach(button => {
      button.disabled = manual;
      button.classList.toggle("active", store.state.rhythmPlaying);
      button.textContent = store.state.rhythmPlaying ? "PARAR" : "AUTO";
    });
    [elements.rhythmVariationButton, elements.stageRhythmVariationButton].filter(Boolean).forEach(button => {
      button.disabled = manual;
      button.classList.toggle("active", store.state.rhythmVariation === "b");
      button.textContent = `VAR. ${store.state.rhythmVariation.toUpperCase()}`;
    });
    renderer.updateUI();
  },

  bindFeatureControls() {
    elements.captureAsNote.addEventListener(DOM_EVENTS_TOKENS.CLICK, () => {
      this.captureInNextPerformanceSlot();
      store.state.pendingCapture = null;
      elements.captureDialog.close();
    });

    elements.captureAsBase.addEventListener(DOM_EVENTS_TOKENS.CLICK, () => {
      this.captureInNextBaseSlot();
      store.state.pendingCapture = null;
      elements.captureDialog.close();
    });

    elements.newSetButton.addEventListener(DOM_EVENTS_TOKENS.CLICK, () => this.openSetDialog());
    elements.updateSetButton.addEventListener(DOM_EVENTS_TOKENS.CLICK, () => this.updateActiveSet());
    elements.previousSetButton.addEventListener(DOM_EVENTS_TOKENS.CLICK, () => this.navigateSet(-1));
    elements.nextSetButton.addEventListener(DOM_EVENTS_TOKENS.CLICK, () => this.navigateSet(1));

    elements.setForm.addEventListener(DOM_EVENTS_TOKENS.SUBMIT, event => {
      event.preventDefault();
      const name = elements.setNameInput.value.trim();
      if (!name) return;
      this.createSet(name);
      elements.setDialog.close();
    });

    elements.memoryForm.addEventListener(DOM_EVENTS_TOKENS.SUBMIT, event => {
      event.preventDefault();
      if (!store.state.editingMemory) return;
      const { index, degrees } = store.state.editingMemory;
      this.storeMemory(index, degrees, elements.memoryNameInput.value);
      store.state.editingMemory = null;
      elements.memoryDialog.close();
    });

    document.querySelector("#resetMappings").addEventListener(DOM_EVENTS_TOKENS.CLICK, () => {
      // Missing personalDefaultBindings from old app, using tokens
      store.state.bindings = { ...DEFAULT_BINDINGS };
      store.state.remapping = null;
      store.saveBindings();
      renderer.renderKeys();
      this.renderMappings();
      renderer.renderPerformanceMemories();
      renderer.renderBaseMemories();
    });

    [elements.settingsDialog, elements.helpDialog, elements.memoryDialog, elements.captureDialog, elements.setDialog].forEach(dialog => {
      dialog.addEventListener(DOM_EVENTS_TOKENS.CLICK, event => {
        if (event.target === dialog) {
          store.state.editingMemory = null;
          store.state.pendingCapture = null;
          dialog.close();
        }
      });
    });

    document.querySelectorAll("[data-close-dialog]").forEach(button => {
      button.addEventListener(DOM_EVENTS_TOKENS.CLICK, () => {
        const dialog = button.closest("dialog");
        if (!dialog) return;
        store.state.editingMemory = null;
        store.state.pendingCapture = null;
        dialog.close();
      });
    });

    elements.rhythmPresetSelect.innerHTML = Object.entries(RHYTHM_TOKENS.PRESETS)
      .map(([id, preset]) => `<option value="${id}">${preset.name.toUpperCase()}</option>`)
      .join("");
    elements.stageRhythmPreset.innerHTML = elements.rhythmPresetSelect.innerHTML;
    
    if (!RHYTHM_TOKENS.PRESETS[store.state.rhythmPreset]) {
      store.dispatch(STATE_ACTION_TOKENS.SET_RHYTHM_PRESET, RHYTHM_TOKENS.DEFAULT_PRESET);
    }
    elements.rhythmPresetSelect.value = store.state.rhythmPreset;
    elements.stageRhythmPreset.value = store.state.rhythmPreset;
    store.state.tempo = rhythmEngine.currentPreset().bpm;
    elements.tempoControl.value = store.state.tempo;
    elements.stageTempoControl.value = store.state.tempo;

    elements.rhythmPresetSelect.addEventListener(DOM_EVENTS_TOKENS.CHANGE, () => {
      rhythmEngine.stopRhythm();
      store.dispatch(STATE_ACTION_TOKENS.SET_RHYTHM_PRESET, elements.rhythmPresetSelect.value);
      store.state.rhythmVariation = "a";
      store.dispatch(STATE_ACTION_TOKENS.SET_TEMPO, rhythmEngine.currentPreset().bpm);
      elements.tempoControl.value = store.state.tempo;
      elements.stageRhythmPreset.value = store.state.rhythmPreset;
      elements.stageTempoControl.value = store.state.tempo;
      elements.soundState.textContent = `RITMO · ${rhythmEngine.currentPreset().name.toUpperCase()}`;
      this.updateRhythmControls();
    });

    elements.tempoControl.addEventListener(DOM_EVENTS_TOKENS.CHANGE, () => {
      store.dispatch(STATE_ACTION_TOKENS.SET_TEMPO, Math.max(50, Math.min(220, Number(elements.tempoControl.value) || rhythmEngine.currentPreset().bpm)));
      elements.tempoControl.value = store.state.tempo;
      elements.stageTempoControl.value = store.state.tempo;
      if (store.state.rhythmPlaying && audioEngine.ctx) {
        store.state.nextStepAt = audioEngine.ctx.currentTime + 0.04;
      }
      this.updateRhythmControls();
    });

    elements.stageRhythmPreset.addEventListener(DOM_EVENTS_TOKENS.CHANGE, () => {
      elements.rhythmPresetSelect.value = elements.stageRhythmPreset.value;
      elements.rhythmPresetSelect.dispatchEvent(new Event(DOM_EVENTS_TOKENS.CHANGE));
    });

    elements.stageTempoControl.addEventListener(DOM_EVENTS_TOKENS.CHANGE, () => {
      elements.tempoControl.value = elements.stageTempoControl.value;
      elements.tempoControl.dispatchEvent(new Event(DOM_EVENTS_TOKENS.CHANGE));
    });

    [elements.autoRhythmButton, elements.stageAutoRhythmButton].filter(Boolean).forEach(button => {
      button.addEventListener(DOM_EVENTS_TOKENS.CLICK, () => rhythmEngine.toggleRhythm());
    });

    [elements.rhythmVariationButton, elements.stageRhythmVariationButton].filter(Boolean).forEach(button => {
      button.addEventListener(DOM_EVENTS_TOKENS.CLICK, () => rhythmEngine.toggleVariation());
    });

    document.querySelector("#settingsButton").addEventListener(DOM_EVENTS_TOKENS.CLICK, () => {
      this.cancelShortcutCapture();
      elements.mappingSearch.value = "";
      elements.smartCommandModeInputs.forEach(input => {
        input.checked = input.value === store.state.smartCommandMode;
      });
      this.renderMappings();
      elements.settingsDialog.showModal();
    });

    document.querySelector("#helpButton").addEventListener(DOM_EVENTS_TOKENS.CLICK, () => elements.helpDialog.showModal());

    elements.mappingSearch.addEventListener(DOM_EVENTS_TOKENS.INPUT, () => this.renderMappings());
    elements.cancelShortcut.addEventListener(DOM_EVENTS_TOKENS.CLICK, () => this.cancelShortcutCapture());
    elements.confirmShortcut.addEventListener(DOM_EVENTS_TOKENS.CLICK, () => this.commitShortcutCapture());

    elements.memoryGrid.addEventListener(DOM_EVENTS_TOKENS.CLICK, event => {
      const recallBtn = event.target.closest("[data-memory-recall]");
      const saveBtn = event.target.closest("[data-memory-save]");
      const editBtn = event.target.closest("[data-memory-edit]");
      if (editBtn) {
        event.stopPropagation();
        this.openMemoryDialog(Number(editBtn.dataset.memoryEdit), true);
      } else if (saveBtn) {
        event.stopPropagation();
        this.openMemoryDialog(Number(saveBtn.dataset.memorySave), false);
      } else if (recallBtn) {
        events.recallMemory(Number(recallBtn.dataset.memoryRecall), true);
      }
    });
    
    // Memory Grid Event bindings
    elements.performanceMemoryGrid.addEventListener(DOM_EVENTS_TOKENS.CLICK, event => {
      const recallBtn = event.target.closest("[data-stage-recall]");
      const clearBtn = event.target.closest("[data-stage-clear]");
      if (clearBtn) {
        event.stopPropagation();
        const index = Number(clearBtn.dataset.stageClear);
        store.state.performanceMemories[index] = null;
        if (store.state.activePerformanceSlot === index) store.state.activePerformanceSlot = null;
        store.savePerformanceMemories();
        renderer.renderPerformanceMemories();
      } else if (recallBtn) {
        this.recallPerformanceMemory(Number(recallBtn.dataset.stageRecall));
      }
    });

    elements.baseMemoryGrid.addEventListener(DOM_EVENTS_TOKENS.CLICK, event => {
      const recallBtn = event.target.closest("[data-base-recall]");
      const clearBtn = event.target.closest("[data-base-clear]");
      if (clearBtn) {
        event.stopPropagation();
        const index = Number(clearBtn.dataset.baseClear);
        if (store.state.activeBaseSlot === index) this.stopBase();
        store.state.baseMemories[index] = null;
        store.saveBaseMemories();
        renderer.renderBaseMemories();
      } else if (recallBtn) {
        this.toggleBaseMemory(Number(recallBtn.dataset.baseRecall));
      }
    });
    
    elements.setList.addEventListener(DOM_EVENTS_TOKENS.CLICK, event => {
      const deleteBtn = event.target.closest("[data-set-delete]");
      const loadBtn = event.target.closest("[data-set-load]");
      if (deleteBtn) {
        event.stopPropagation();
        this.deleteSet(deleteBtn.dataset.setDelete);
      } else if (loadBtn) {
        this.loadSet(loadBtn.dataset.setLoad);
      }
    });
    
    elements.tonicKeys.addEventListener(DOM_EVENTS_TOKENS.CLICK, event => {
      const btn = event.target.closest("[data-add-tonic]");
      const smartBtn = event.target.closest("[data-add-smart-tonic]");
      if (btn) {
        event.stopPropagation();
        const tonicIndex = Number(btn.dataset.addTonic);
        audioEngine.dampVoices(MUSIC_TOKENS.SOUND_SETS[store.state.soundSet].engine === "piano" ? 0.24 : 0.12);
        store.dispatch(STATE_ACTION_TOKENS.SET_TONIC, tonicIndex);
        store.state.smartPosition = null;
        events.recallLinkedMemory(tonicIndex);
        renderer.updateUI();
        this.openCaptureDialog();
      } else if (smartBtn) {
        event.stopPropagation();
        const position = Number(smartBtn.dataset.addSmartTonic);
        events.activate(`smartTonic${position}`);
        this.openCaptureDialog();
      }
    });
  }
};

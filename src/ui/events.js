import { store } from '../state/state.js';
import { STATE_ACTION_TOKENS } from '../state/state.tokens.js';
import { renderer } from './renderer.js';
import { audioEngine } from '../audio/engine.js';
import { rhythmEngine } from '../audio/rhythm.js';
import { GLOBAL_TOKENS, MUSIC_TOKENS } from '../tokens/master.tokens.js';
import { elements } from './elements.js';
import { UI_EVENTS_TOKENS } from './events.tokens.js';
import { KEYBOARD_TOKENS } from '../tokens/keyboard.tokens.js';
import { DOM_EVENTS_TOKENS, DOM_ELEMENTS_TOKENS } from '../tokens/api.tokens.js';
import { STRING_TOKENS } from '../tokens/string.tokens.js';

export const events = {
  featureHandlers: null,

  smartNoteKeys: {
    [KEYBOARD_TOKENS.KEY_C]: 0,
    [KEYBOARD_TOKENS.KEY_D]: 1,
    [KEYBOARD_TOKENS.KEY_E]: 2,
    [KEYBOARD_TOKENS.KEY_F]: 3,
    [KEYBOARD_TOKENS.KEY_G]: 4,
    [KEYBOARD_TOKENS.KEY_A]: 5,
    [KEYBOARD_TOKENS.KEY_S]: 6,
    [KEYBOARD_TOKENS.KEY_B]: 6,
  },

  smartDegreeKeys: [
    KEYBOARD_TOKENS.DIGIT_1,
    KEYBOARD_TOKENS.DIGIT_2,
    KEYBOARD_TOKENS.DIGIT_3,
    KEYBOARD_TOKENS.DIGIT_4,
    KEYBOARD_TOKENS.DIGIT_5,
    KEYBOARD_TOKENS.DIGIT_6,
    KEYBOARD_TOKENS.DIGIT_7,
    KEYBOARD_TOKENS.DIGIT_8,
    KEYBOARD_TOKENS.DIGIT_9,
    KEYBOARD_TOKENS.DIGIT_0,
    KEYBOARD_TOKENS.MINUS,
    KEYBOARD_TOKENS.EQUAL,
  ],

  init() {
    window.addEventListener(DOM_EVENTS_TOKENS.KEYDOWN, this.handleKeyDown.bind(this));
    window.addEventListener(DOM_EVENTS_TOKENS.KEYUP, this.handleKeyUp.bind(this));
    window.addEventListener(DOM_EVENTS_TOKENS.BLUR, this.handleBlur.bind(this));
    this.bindUIControls();
  },

  shortcutFromEvent(event) {
    if (UI_EVENTS_TOKENS.MODIFIER_KEYS.includes(event.code)) return event.code;
    const parts = [];
    if (event.ctrlKey) parts.push(KEYBOARD_TOKENS.KEY_RAW_CTRL);
    if (event.altKey) parts.push(KEYBOARD_TOKENS.KEY_RAW_ALT);
    if (event.shiftKey) parts.push(KEYBOARD_TOKENS.KEY_RAW_SHIFT);
    if (event.metaKey) parts.push(KEYBOARD_TOKENS.KEY_RAW_META);
    parts.push(event.code);
    return parts.join(KEYBOARD_TOKENS.PLUS);
  },

  findAction(shortcut) {
    const matches = Object.keys(store.state.bindings).filter(action => store.state.bindings[action] === shortcut);
    const shared = action => action === "rhythmDown" || action.startsWith("effect");
    if (store.state.workspace === GLOBAL_TOKENS.WORKSPACE_PERFORMANCE) {
      return matches.find(action => action.startsWith("performance") || action.startsWith("base"))
        || matches.find(shared)
        || null;
    }
    return matches.find(action => !action.startsWith("performance") && !action.startsWith("base") && !shared(action))
      || matches.find(shared)
      || null;
  },

  findActionFromEvent(event) {
    const action = this.findAction(this.shortcutFromEvent(event));
    if (action) return action;
    if (!event.ctrlKey && !event.altKey && !event.metaKey && event.key === ";") {
      return this.findAction(KEYBOARD_TOKENS.SEMICOLON);
    }
    return null;
  },

  syncSmartField() {
    renderer.renderKeys();
    renderer.updateUI();
  },

  cycleSmartDegree(naturalIndex) {
    const flatIndex = 12 + naturalIndex * 2;
    const sharpIndex = flatIndex + 1;
    const family = [naturalIndex, sharpIndex, flatIndex];
    const current = family.find(index => store.state.degrees.has(index));
    const next = current === naturalIndex
      ? sharpIndex
      : current === sharpIndex
        ? flatIndex
        : naturalIndex;

    family.forEach(index => {
      if (store.state.degrees.has(index)) store.dispatch(STATE_ACTION_TOKENS.REMOVE_DEGREE, index);
    });

    if (!store.state.degrees.has(next) && store.state.degrees.size < GLOBAL_TOKENS.MAX_DEGREES) {
      store.dispatch(STATE_ACTION_TOKENS.ADD_DEGREE, next);
    }

    if (!store.state.pedalActive) audioEngine.dampVoices(0.15);
    audioEngine.strum(GLOBAL_TOKENS.ACTION_RHYTHM_DOWN);
    renderer.updateUI();
  },

  handleSmartModeKeyDown(event) {
    if (!store.state.smartMode) return false;
    if (store.state.workspace === GLOBAL_TOKENS.WORKSPACE_PERFORMANCE) return false;

    const notePosition = this.smartNoteKeys[event.code];
    if (notePosition !== undefined) {
      event.preventDefault();
      if (event.shiftKey) {
        store.dispatch(STATE_ACTION_TOKENS.SET_FIELD_LETTER, notePosition);
        store.dispatch(STATE_ACTION_TOKENS.SET_FIELD_ACCIDENTAL, 0);
      store.dispatch(STATE_ACTION_TOKENS.SET_SMART_POSITION, 0);
      this.syncSmartField();
      return true;
    }

      const noteLetter = MUSIC_TOKENS.NOTE_LETTERS[notePosition];
      const smartPosition = renderer.smartScale().findIndex(note => note.name.startsWith(noteLetter));
      if (smartPosition < 0) return true;

      const action = `smartTonic${smartPosition}`;
      store.state.actionsByPhysicalKey.set(event.code, action);
      this.activate(action);
      return true;
    }

    if (event.code === KEYBOARD_TOKENS.ARROW_LEFT) {
      event.preventDefault();
      store.dispatch(STATE_ACTION_TOKENS.SET_FIELD_ACCIDENTAL, 1);
      this.syncSmartField();
      return true;
    }

    if (event.code === KEYBOARD_TOKENS.ARROW_RIGHT) {
      event.preventDefault();
      store.dispatch(STATE_ACTION_TOKENS.SET_FIELD_ACCIDENTAL, -1);
      this.syncSmartField();
      return true;
    }

    if (event.code === KEYBOARD_TOKENS.ARROW_UP) {
      event.preventDefault();
      store.dispatch(STATE_ACTION_TOKENS.SET_FIELD_MINOR, false);
      this.syncSmartField();
      return true;
    }

    if (event.code === KEYBOARD_TOKENS.ARROW_DOWN) {
      event.preventDefault();
      store.dispatch(STATE_ACTION_TOKENS.SET_FIELD_MINOR, true);
      this.syncSmartField();
      return true;
    }

    const degreeIndex = this.smartDegreeKeys.indexOf(event.code);
    if (degreeIndex >= 0) {
      event.preventDefault();
      if (event.shiftKey) {
        this.cycleSmartDegree(degreeIndex);
      } else {
        const action = `degree${degreeIndex}`;
        store.state.actionsByPhysicalKey.set(event.code, action);
        this.activate(action);
      }
      return true;
    }

    return false;
  },

  activate(action) {
    if (store.state.activeActions.has(action)) return;
    store.state.activeActions.add(action);
    const pref = UI_EVENTS_TOKENS.ACTION_PREFIXES;

    if (action.startsWith(pref.SMART_TONIC)) {
      const position = Number(action.slice(pref.SMART_TONIC.length));
      store.dispatch(STATE_ACTION_TOKENS.SET_ACTIVE_PERFORMANCE_SLOT, null);
      audioEngine.dampVoices(store.state.pedalActive ? 0.7 : 0.09);
      
      store.dispatch(STATE_ACTION_TOKENS.SET_SMART_POSITION, position);
      const scaleNote = renderer.smartScale()[position];
      if (scaleNote) {
        store.dispatch(STATE_ACTION_TOKENS.SET_TONIC, scaleNote.pitch);
        const mode = store.state.fieldMinor ? MUSIC_TOKENS.MODE_MINOR : MUSIC_TOKENS.MODE_MAJOR;
        const memoryIndex = store.state.smartLinks[mode][position];
        if (memoryIndex !== null) this.recallMemory(memoryIndex, false);
        audioEngine.strum(GLOBAL_TOKENS.ACTION_RHYTHM_DOWN); // Play immediately
      }
    } else if (action.startsWith(pref.TONIC)) {
      const tonicIndex = Number(action.slice(pref.TONIC.length));
      store.dispatch(STATE_ACTION_TOKENS.SET_ACTIVE_PERFORMANCE_SLOT, null);
      audioEngine.dampVoices(store.state.pedalActive ? 0.7 : 0.09);
      store.dispatch(STATE_ACTION_TOKENS.SET_TONIC, tonicIndex);
      this.recallLinkedMemory(tonicIndex);
      audioEngine.strum(GLOBAL_TOKENS.ACTION_RHYTHM_DOWN); // Play immediately
    } else if (action.startsWith(pref.DEGREE)) {
      const index = Number(action.slice(pref.DEGREE.length));
      if (store.state.degrees.has(index)) {
        store.dispatch(STATE_ACTION_TOKENS.REMOVE_DEGREE, index);
      } else {
        if (store.state.degrees.size >= GLOBAL_TOKENS.MAX_DEGREES) return;
        store.dispatch(STATE_ACTION_TOKENS.ADD_DEGREE, index);
      }
      audioEngine.dampVoices(store.state.pedalActive ? 0.7 : 0.09);
      audioEngine.strum(GLOBAL_TOKENS.ACTION_RHYTHM_DOWN); // Play immediately after changing degree
    } else if (action === pref.OCTAVE_DOWN) {
      store.dispatch(STATE_ACTION_TOKENS.SET_OCTAVE, Math.max(1, store.state.octave - 1));
      if (store.state.tonic !== null) audioEngine.strum(GLOBAL_TOKENS.ACTION_RHYTHM_DOWN);
    } else if (action === pref.OCTAVE_UP) {
      store.dispatch(STATE_ACTION_TOKENS.SET_OCTAVE, Math.min(7, store.state.octave + 1));
      if (store.state.tonic !== null) audioEngine.strum(GLOBAL_TOKENS.ACTION_RHYTHM_DOWN);
    } else if (action === pref.RHYTHM_DOWN) {
      store.dispatch(STATE_ACTION_TOKENS.TOGGLE_PEDAL);
      audioEngine.dampVoices(store.state.pedalActive ? 0.7 : 0.09);
    } else if (action === pref.RHYTHM_UP) {
      return;
    } else if (action.startsWith(pref.MEMORY)) {
      this.recallMemory(Number(action.slice(pref.MEMORY.length)), true);
    } else if (action.startsWith(pref.PERFORMANCE)) {
      this.featureHandlers?.recallPerformanceMemory(Number(action.slice(pref.PERFORMANCE.length)));
    } else if (action.startsWith(pref.BASE)) {
      this.featureHandlers?.toggleBaseMemory(Number(action.slice(pref.BASE.length)));
    } else if (action.startsWith(pref.EFFECT)) {
      audioEngine.applyPerformanceEffect(action, true);
    }
    
    renderer.updateUI();
  },

  hasActiveNotes() {
    const pref = UI_EVENTS_TOKENS.ACTION_PREFIXES;
    for (const a of store.state.activeActions) {
      if (a.startsWith(pref.SMART_TONIC) || a.startsWith(pref.TONIC) || a.startsWith(pref.DEGREE) || a.startsWith(pref.MEMORY) || a.startsWith(pref.PERFORMANCE)) {
        return true;
      }
    }
    return false;
  },

  deactivate(action) {
    if (!store.state.activeActions.has(action)) return;
    store.state.activeActions.delete(action);
    const pref = UI_EVENTS_TOKENS.ACTION_PREFIXES;

    if (
      action.startsWith(pref.SMART_TONIC)
      || action.startsWith(pref.TONIC)
      || action.startsWith(pref.DEGREE)
      || action.startsWith(pref.MEMORY)
      || action.startsWith(pref.PERFORMANCE)
    ) {
      if (!this.hasActiveNotes()) {
        audioEngine.dampVoices(store.state.pedalActive ? 1.8 : 0.2);
      }
    } else if (action.startsWith(pref.EFFECT)) {
      audioEngine.applyPerformanceEffect(action, false);
    }
    renderer.updateUI();
  },

  recallMemory(index, playNote = false) {
    const memory = store.state.memories[index];
    if (!memory) return;
    if (store.state.workspace === GLOBAL_TOKENS.WORKSPACE_COMPOSER) store.dispatch(STATE_ACTION_TOKENS.SET_ACTIVE_PERFORMANCE_SLOT, null);
    
    store.dispatch(STATE_ACTION_TOKENS.SET_DEGREES, memory.degrees);
    store.dispatch(STATE_ACTION_TOKENS.SET_CURRENT_MEMORY_INDEX, index);
    if (playNote) {
      if (!store.state.pedalActive) audioEngine.dampVoices(0.15);
      audioEngine.strum(GLOBAL_TOKENS.ACTION_RHYTHM_DOWN);
    }
    renderer.updateUI();
  },

  recallLinkedMemory(tonicIndex) {
    const memoryIndex = store.state.tonicLinks[tonicIndex];
    if (memoryIndex !== null && store.state.memories[memoryIndex]) this.recallMemory(memoryIndex, false);
  },

  handleKeyDown(event) {
    if (store.state.remapping) {
      event.preventDefault();
      event.stopPropagation();
      if (event.code === "Escape") {
        this.featureHandlers?.cancelShortcutCapture();
        return;
      }
      if (!UI_EVENTS_TOKENS.MODIFIER_KEYS.includes(event.code)) {
        this.featureHandlers?.setShortcutPreview(this.shortcutFromEvent(event));
      }
      return;
    }
    if (event.repeat || event.target.closest(DOM_ELEMENTS_TOKENS.DIALOG) || event.target.matches("select, input, textarea")) return;
    if (this.handleSmartModeKeyDown(event)) return;

    const action = this.findActionFromEvent(event);
    
    if (action) {
      event.preventDefault();
      store.state.actionsByPhysicalKey.set(event.code, action);
      this.activate(action);
    }
  },

  handleKeyUp(event) {
    const trackedAction = store.state.actionsByPhysicalKey.get(event.code);
    if (trackedAction) {
      store.state.actionsByPhysicalKey.delete(event.code);
      event.preventDefault();
      this.deactivate(trackedAction);
    } else {
      const action = this.findAction(this.shortcutFromEvent(event));
      if (action) {
        event.preventDefault();
        this.deactivate(action);
      }
    }
  },

  handleBlur() {
    [...store.state.activeActions].forEach(action => this.deactivate(action));
    store.state.actionsByPhysicalKey.clear();
  },

  bindUIControls() {
    elements.panicButton?.addEventListener(DOM_EVENTS_TOKENS.CLICK, () => {
      rhythmEngine.stopRhythm();
      audioEngine.stopAll(0.02);
      this.featureHandlers?.stopBase?.();
      store.state.manualTimers.forEach(timers => {
        window.clearTimeout(timers.delay);
        window.clearInterval(timers.interval);
      });
      store.state.manualTimers.clear();
      store.state.activeActions.clear();
      store.state.actionsByPhysicalKey.clear();
      store.dispatch(STATE_ACTION_TOKENS.SET_PEDAL_ACTIVE, false);
      elements.soundState.textContent = STRING_TOKENS.UI.PANIC_AUDIO_STOPPED;
      renderer.updateUI();
    });

    elements.soundSetSelect.addEventListener(DOM_EVENTS_TOKENS.CHANGE, () => {
      audioEngine.stopAll();
      this.featureHandlers?.stopBase?.();
      store.dispatch(STATE_ACTION_TOKENS.SET_SOUND_SET, elements.soundSetSelect.value);
      audioEngine.init();
      renderer.updateUI();
    });

    const setSmartMode = enabled => {
      store.dispatch(STATE_ACTION_TOKENS.SET_SMART_MODE, enabled);
      if (store.state.smartMode) {
        store.dispatch(STATE_ACTION_TOKENS.SET_SMART_POSITION, 0);
      } else {
        store.dispatch(STATE_ACTION_TOKENS.SET_SMART_POSITION, null);
      }
      renderer.renderKeys();
      renderer.updateUI();
    };

    elements.smartModeToggle.addEventListener(DOM_EVENTS_TOKENS.CHANGE, () => {
      setSmartMode(elements.smartModeToggle.checked);
    });

    elements.smartModeToggle.closest(".smart-mode-switch")?.addEventListener(DOM_EVENTS_TOKENS.CLICK, event => {
      if (event.target === elements.smartModeToggle) return;
      event.preventDefault();
      elements.smartModeToggle.checked = !elements.smartModeToggle.checked;
      setSmartMode(elements.smartModeToggle.checked);
    });

    elements.fieldFlatButton.addEventListener(DOM_EVENTS_TOKENS.CLICK, () => {
      store.dispatch(STATE_ACTION_TOKENS.SET_FIELD_ACCIDENTAL, store.state.fieldAccidental === -1 ? 0 : -1);
      renderer.renderKeys();
    });

    elements.fieldLetterGrid.addEventListener(DOM_EVENTS_TOKENS.CLICK, event => {
      const button = event.target.closest("[data-field-letter]");
      if (!button) return;
      store.dispatch(STATE_ACTION_TOKENS.SET_FIELD_LETTER, Number(button.dataset.fieldLetter));
      renderer.renderKeys();
    });

    elements.fieldSharpButton.addEventListener(DOM_EVENTS_TOKENS.CLICK, () => {
      store.dispatch(STATE_ACTION_TOKENS.SET_FIELD_ACCIDENTAL, store.state.fieldAccidental === 1 ? 0 : 1);
      renderer.renderKeys();
    });

    elements.fieldMinorButton.addEventListener(DOM_EVENTS_TOKENS.CLICK, () => {
      store.dispatch(STATE_ACTION_TOKENS.SET_FIELD_MINOR, !store.state.fieldMinor);
      renderer.renderKeys();
    });

    elements.tonicLinkGrid.addEventListener(DOM_EVENTS_TOKENS.CHANGE, event => {
      const tonicSelect = event.target.closest("[data-tonic-link]");
      const smartSelect = event.target.closest("[data-smart-link]");
      if (tonicSelect) {
        store.dispatch(STATE_ACTION_TOKENS.SET_TONIC_LINK, {
          tonicIndex: Number(tonicSelect.dataset.tonicLink),
          memoryIndex: tonicSelect.value === "" ? null : Number(tonicSelect.value),
        });
        renderer.renderTonicLinks();
      } else if (smartSelect) {
        const mode = store.state.fieldMinor ? MUSIC_TOKENS.MODE_MINOR : MUSIC_TOKENS.MODE_MAJOR;
        store.dispatch(STATE_ACTION_TOKENS.SET_SMART_LINK, {
          mode,
          position: Number(smartSelect.dataset.smartLink),
          memoryIndex: smartSelect.value === "" ? null : Number(smartSelect.value),
        });
        renderer.renderTonicLinks();
      }
    });

    elements.themeToggle.addEventListener(DOM_EVENTS_TOKENS.CHANGE, () => {
      store.dispatch(STATE_ACTION_TOKENS.SET_THEME, elements.themeToggle.checked ? GLOBAL_TOKENS.THEME_LIGHT : GLOBAL_TOKENS.THEME_DARK);
      renderer.applyTheme(store.state.theme);
    });

    elements.smartCommandModeInputs.forEach(input => {
      input.addEventListener(DOM_EVENTS_TOKENS.CHANGE, () => {
        if (!input.checked) return;
        store.dispatch(STATE_ACTION_TOKENS.SET_SMART_COMMAND_MODE, input.value);
        renderer.renderKeys();
      });
    });
    
    document.addEventListener(DOM_EVENTS_TOKENS.POINTER_DOWN, event => {
      const element = event.target.closest("[data-action], [data-stage-action]");
      if (!element) return;
      if (event.button !== 0 && event.pointerType === UI_EVENTS_TOKENS.POINTER_MOUSE) return;
      const action = element.dataset.action || element.dataset.stageAction;
      event.preventDefault();
      element.setPointerCapture?.(event.pointerId);
      store.state.pointerActions.set(event.pointerId, action);
      this.activate(action);
    });

    const releasePointerAction = event => {
      const action = store.state.pointerActions.get(event.pointerId);
      if (!action) return;
      store.state.pointerActions.delete(event.pointerId);
      this.deactivate(action);
    };

    document.addEventListener(DOM_EVENTS_TOKENS.POINTER_UP, releasePointerAction);
    document.addEventListener(DOM_EVENTS_TOKENS.POINTER_CANCEL, releasePointerAction);
  }
};

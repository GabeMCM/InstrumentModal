import { GLOBAL_TOKENS, MUSIC_TOKENS, DEFAULT_BINDINGS } from '../tokens/master.tokens.js';
import { STATE_ACTION_TOKENS, STATE_MESSAGE_TOKENS } from './state.tokens.js';
import { STORAGE_KEYS } from './storage.tokens.js';
import { KEYBOARD_TOKENS } from '../tokens/keyboard.tokens.js';
import { RHYTHM_TOKENS } from '../audio/rhythm.tokens.js';
import { JAVASCRIPT_TOKENS } from '../tokens/api.tokens.js';
import { storage } from './storage.js';

function loadBindings() {
  const stored = storage.getJSON(STORAGE_KEYS.BINDINGS, {});
  const migrated = { ...stored };
  if (stored.rhythm && !stored.rhythmDown) migrated.rhythmDown = stored.rhythm;
  if (migrated.rhythmUp === KEYBOARD_TOKENS.ENTER) migrated.rhythmUp = null;
  if (migrated.effect === KEYBOARD_TOKENS.ARROW_DOWN || migrated.effect === KEYBOARD_TOKENS.SHIFT_LEFT || !migrated.effect) {
    const semicolonOwner = Object.keys(migrated).find(action =>
      action !== GLOBAL_TOKENS.ACTION_EFFECT && migrated[action] === KEYBOARD_TOKENS.SEMICOLON
    );
    if (semicolonOwner) migrated[semicolonOwner] = null;
    migrated.effect = KEYBOARD_TOKENS.SEMICOLON;
  }
  if (!migrated.effectBendDown || migrated.effectBendDown === migrated.memory10) {
    migrated.effectBendDown = KEYBOARD_TOKENS.SLASH;
  }
  const bindings = Object.fromEntries(Object.keys(DEFAULT_BINDINGS).map(action => [
    action,
    Object.prototype.hasOwnProperty.call(migrated, action) ? migrated[action] : DEFAULT_BINDINGS[action],
  ]));
  
  if (!storage.get(STORAGE_KEYS.PERSONAL_DEFAULT_BINDINGS)) {
    storage.setJSON(STORAGE_KEYS.PERSONAL_DEFAULT_BINDINGS, bindings);
  }
  storage.set(STORAGE_KEYS.DIRECTIONAL_MIGRATION, GLOBAL_TOKENS.TRUE);
  storage.setJSON(STORAGE_KEYS.BINDINGS, bindings);
  return bindings;
}

function isValidSoundSet(value) {
  return Boolean(value && MUSIC_TOKENS.SOUND_SETS[value]);
}

function isValidRhythmPreset(value) {
  const registry = globalThis.RHYTHM_PRESETS || RHYTHM_TOKENS.PRESETS;
  return Boolean(value && registry[value]);
}

function loadTheme() {
  const stored = storage.get(STORAGE_KEYS.THEME);
  return stored === GLOBAL_TOKENS.THEME_LIGHT ? GLOBAL_TOKENS.THEME_LIGHT : GLOBAL_TOKENS.THEME_DARK;
}

function loadMemories() {
  const stored = storage.getJSON(STORAGE_KEYS.MEMORIES);
  if (!Array.isArray(stored)) return Array(GLOBAL_TOKENS.MAX_MEMORIES).fill(null);
  return Array.from({ length: GLOBAL_TOKENS.MAX_MEMORIES }, (_, index) => {
    const memory = stored[index];
    if (!memory || !Array.isArray(memory.degrees)) return null;
    return {
      name: String(memory.name || GLOBAL_TOKENS.STRING_EMPTY).slice(0, 24),
      degrees: memory.degrees.filter(value => Number.isInteger(value) && value >= 0 && value < MUSIC_TOKENS.DEGREES.length).slice(0, 4),
    };
  });
}

function loadPerformanceMemories() {
  const stored = storage.getJSON(STORAGE_KEYS.PERFORMANCE_MEMORIES);
  if (!Array.isArray(stored)) return Array(GLOBAL_TOKENS.MAX_PERFORMANCE_SLOTS).fill(null);
  return Array.from({ length: GLOBAL_TOKENS.MAX_PERFORMANCE_SLOTS }, (_, index) => {
    const item = stored[index];
    if (!item || !Number.isInteger(item.tonic)) return null;
    return {
      tonic: Math.max(0, Math.min(11, item.tonic)),
      noteName: String(item.noteName || MUSIC_TOKENS.TONICS[item.tonic]?.[0] || GLOBAL_TOKENS.SYMBOL_EMPTY).slice(0, 8),
      octave: Math.max(1, Math.min(7, Number(item.octave) || 4)),
      degrees: Array.isArray(item.degrees)
        ? item.degrees.filter(value => Number.isInteger(value) && value >= 0 && value < MUSIC_TOKENS.DEGREES.length).slice(0, 4)
        : [],
      memoryIndex: Number.isInteger(item.memoryIndex) && item.memoryIndex >= 0 && item.memoryIndex < GLOBAL_TOKENS.MAX_MEMORIES
        ? item.memoryIndex
        : null,
      memoryName: item.memoryName ? String(item.memoryName).slice(0, 24) : null,
      displayName: item.displayName ? String(item.displayName).slice(0, 36) : null,
    };
  });
}

function loadBaseMemories() {
  const stored = storage.getJSON(STORAGE_KEYS.BASE_MEMORIES);
  if (!Array.isArray(stored)) return Array(GLOBAL_TOKENS.MAX_BASE_SLOTS).fill(null);
  return Array.from({ length: GLOBAL_TOKENS.MAX_BASE_SLOTS }, (_, index) => {
    const item = stored[index];
    if (!item || !Number.isInteger(item.tonic)) return null;
    return {
      tonic: Math.max(0, Math.min(11, item.tonic)),
      noteName: String(item.noteName || MUSIC_TOKENS.TONICS[item.tonic]?.[0] || GLOBAL_TOKENS.SYMBOL_EMPTY).slice(0, 8),
      octave: Math.max(1, Math.min(7, Number(item.octave) || 4)),
      degrees: Array.isArray(item.degrees)
        ? item.degrees.filter(value => Number.isInteger(value) && value >= 0 && value < MUSIC_TOKENS.DEGREES.length).slice(0, 4)
        : [],
      memoryIndex: Number.isInteger(item.memoryIndex) && item.memoryIndex >= 0 && item.memoryIndex < GLOBAL_TOKENS.MAX_MEMORIES
        ? item.memoryIndex
        : null,
      memoryName: item.memoryName ? String(item.memoryName).slice(0, 24) : null,
      displayName: item.displayName ? String(item.displayName).slice(0, 36) : null,
    };
  });
}

function loadSets() {
  const stored = storage.getJSON(STORAGE_KEYS.SETS);
  if (!Array.isArray(stored)) return [];
  return stored.filter(set =>
    set && typeof set.id === JAVASCRIPT_TOKENS.TYPE_STRING && Array.isArray(set.notes) && Array.isArray(set.bases)
  ).map(set => ({
    id: set.id,
    name: String(set.name || STATE_MESSAGE_TOKENS.UNNAMED_SET).slice(0, 40),
    notes: Array.from({ length: GLOBAL_TOKENS.MAX_PERFORMANCE_SLOTS }, (_, index) => set.notes[index] || null),
    bases: Array.from({ length: GLOBAL_TOKENS.MAX_BASE_SLOTS }, (_, index) => set.bases[index] || null),
    createdAt: Number(set.createdAt) || Date.now(),
    updatedAt: Number(set.updatedAt) || Number(set.createdAt) || Date.now(),
  }));
}

function loadTonicLinks() {
  const storedLinks = storage.getJSON(STORAGE_KEYS.TONIC_LINKS);
  if (Array.isArray(storedLinks)) {
    return Array.from({ length: 12 }, (_, index) => {
      const memoryIndex = storedLinks[index];
      return Number.isInteger(memoryIndex) && memoryIndex >= 0 && memoryIndex < GLOBAL_TOKENS.MAX_MEMORIES
        ? memoryIndex
        : null;
    });
  }

  const oldMemories = storage.getJSON(STORAGE_KEYS.MEMORIES);
  const migrated = Array(12).fill(null);
  if (Array.isArray(oldMemories)) {
    oldMemories.forEach((memory, memoryIndex) => {
      if (Number.isInteger(memory?.tonic) && memory.tonic >= 0 && memory.tonic < 12 && memoryIndex < GLOBAL_TOKENS.MAX_MEMORIES) {
        migrated[memory.tonic] = memoryIndex;
      }
    });
  }
  return migrated;
}

function loadSmartLinks() {
  const stored = storage.getJSON(STORAGE_KEYS.SMART_LINKS);
  const sanitize = values => Array.from({ length: 7 }, (_, index) => {
    const memoryIndex = values?.[index];
    return Number.isInteger(memoryIndex) && memoryIndex >= 0 && memoryIndex < GLOBAL_TOKENS.MAX_MEMORIES
      ? memoryIndex
      : null;
  });
  return {
    major: sanitize(stored?.major),
    minor: sanitize(stored?.minor),
  };
}

const listeners = new Set();
const actionListeners = new Map();

const initialState = {
  bindings: loadBindings(),
  activeActions: new Set(),
  pointerActions: new Map(),
  tonic: null,
  degrees: new Set(),
  memories: loadMemories(),
  tonicLinks: loadTonicLinks(),
  smartMode: storage.get(STORAGE_KEYS.SMART_MODE) === GLOBAL_TOKENS.TRUE,
  smartCommandMode: storage.get(STORAGE_KEYS.SMART_COMMAND_MODE) || GLOBAL_TOKENS.SMART_MODE_NOTE,
  fieldLetter: Number(storage.get(STORAGE_KEYS.FIELD_LETTER)) || 0,
  fieldAccidental: Number(storage.get(STORAGE_KEYS.FIELD_ACCIDENTAL)) || 0,
  fieldMinor: storage.get(STORAGE_KEYS.FIELD_MINOR) === GLOBAL_TOKENS.TRUE,
  smartLinks: loadSmartLinks(),
  smartPosition: null,
  octave: 4,
  voices: [],
  audio: null,
  master: null,
  bodyFilter: null,
  reverb: null,
  reverbGain: null,
  stringBuffers: new Map(),
  remapping: null,
  soundSet: isValidSoundSet(storage.get(STORAGE_KEYS.SOUND_SET))
    ? storage.get(STORAGE_KEYS.SOUND_SET)
    : GLOBAL_TOKENS.ENGINE_PIANO,
  rhythmPreset: isValidRhythmPreset(storage.get(STORAGE_KEYS.RHYTHM_PRESET))
    ? storage.get(STORAGE_KEYS.RHYTHM_PRESET)
    : RHYTHM_TOKENS.DEFAULT_PRESET,
  tempo: Math.max(50, Math.min(220, Number(storage.get(STORAGE_KEYS.RHYTHM_TEMPO)) || RHYTHM_TOKENS.PRESETS[storage.get(STORAGE_KEYS.RHYTHM_PRESET)]?.bpm || GLOBAL_TOKENS.DEFAULT_TEMPO)),
  rhythmPlaying: false,
  rhythmVariation: GLOBAL_TOKENS.RHYTHM_VAR_A,
  rhythmStep: 0,
  rhythmTimer: null,
  nextStepAt: 0,
  manualTimers: new Map(),
  editingMemory: null,
  workspace: storage.get(STORAGE_KEYS.WORKSPACE) === GLOBAL_TOKENS.WORKSPACE_PERFORMANCE 
    ? GLOBAL_TOKENS.WORKSPACE_PERFORMANCE 
    : GLOBAL_TOKENS.WORKSPACE_COMPOSER,
  performanceMemories: loadPerformanceMemories(),
  baseMemories: loadBaseMemories(),
  sets: loadSets(),
  activeSetId: storage.get(STORAGE_KEYS.ACTIVE_SET_ID) || null,
  activePerformanceSlot: null,
  activeBaseSlot: null,
  baseVoices: [],
  pendingCapture: null,
  currentMemoryIndex: null,
  actionsByPhysicalKey: new Map(),
  remapModifierCodes: new Set(),
  pendingShortcut: null,
  draggedSetId: null,
  pedalActive: false,
  theme: loadTheme(),
};

export const store = {
  state: { ...initialState },
  
  subscribe(actionType, listener) {
    if (typeof actionType === JAVASCRIPT_TOKENS.TYPE_FUNCTION && !listener) {
      listeners.add(actionType);
      return () => listeners.delete(actionType);
    }

    if (typeof listener !== JAVASCRIPT_TOKENS.TYPE_FUNCTION) {
      return () => {};
    }

    if (!actionListeners.has(actionType)) {
      actionListeners.set(actionType, new Set());
    }
    actionListeners.get(actionType).add(listener);
    return () => actionListeners.get(actionType)?.delete(listener);
  },
  
  notify(actionType, payload) {
    for (const listener of listeners) {
      listener(this.state);
    }
    for (const listener of actionListeners.get(actionType) || []) {
      listener(payload, this.state);
    }
  },
  
  dispatch(actionType, payload) {
    let changed = false;
    switch (actionType) {
      case STATE_ACTION_TOKENS.SET_TONIC:
        this.state.tonic = payload;
        changed = true;
        break;
      case STATE_ACTION_TOKENS.ADD_DEGREE:
        this.state.degrees.add(payload);
        changed = true;
        break;
      case STATE_ACTION_TOKENS.REMOVE_DEGREE:
        this.state.degrees.delete(payload);
        changed = true;
        break;
      case STATE_ACTION_TOKENS.SET_OCTAVE:
        this.state.octave = payload;
        changed = true;
        break;
      case STATE_ACTION_TOKENS.SET_WORKSPACE:
        this.state.workspace = payload;
        storage.set(STORAGE_KEYS.WORKSPACE, payload);
        changed = true;
        break;
      case STATE_ACTION_TOKENS.SET_SOUND_SET:
        if (isValidSoundSet(payload)) {
          this.state.soundSet = payload;
          this.saveSoundSet();
          changed = true;
        }
        break;
      case STATE_ACTION_TOKENS.SET_THEME:
        this.state.theme = payload === GLOBAL_TOKENS.THEME_LIGHT ? GLOBAL_TOKENS.THEME_LIGHT : GLOBAL_TOKENS.THEME_DARK;
        this.saveTheme();
        changed = true;
        break;
      case STATE_ACTION_TOKENS.SET_SMART_MODE:
        this.state.smartMode = Boolean(payload);
        if (!this.state.smartMode) this.state.smartPosition = null;
        storage.set(STORAGE_KEYS.SMART_MODE, String(this.state.smartMode));
        changed = true;
        break;
      case STATE_ACTION_TOKENS.SET_SMART_COMMAND_MODE:
        this.state.smartCommandMode = payload || GLOBAL_TOKENS.SMART_MODE_NOTE;
        storage.set(STORAGE_KEYS.SMART_COMMAND_MODE, this.state.smartCommandMode);
        changed = true;
        break;
      case STATE_ACTION_TOKENS.SET_FIELD_LETTER:
        this.state.fieldLetter = Math.max(0, Math.min(6, Number(payload) || 0));
        this.saveSmartState();
        changed = true;
        break;
      case STATE_ACTION_TOKENS.SET_FIELD_ACCIDENTAL:
        this.state.fieldAccidental = Math.max(-1, Math.min(1, Number(payload) || 0));
        this.saveSmartState();
        changed = true;
        break;
      case STATE_ACTION_TOKENS.SET_FIELD_MINOR:
        this.state.fieldMinor = Boolean(payload);
        this.saveSmartState();
        changed = true;
        break;
      case STATE_ACTION_TOKENS.SET_RHYTHM_PRESET:
        if (isValidRhythmPreset(payload)) {
          this.state.rhythmPreset = payload;
          this.saveRhythmState();
          changed = true;
        }
        break;
      case STATE_ACTION_TOKENS.SET_TEMPO:
        this.state.tempo = Math.max(50, Math.min(220, Number(payload) || GLOBAL_TOKENS.DEFAULT_TEMPO));
        this.saveRhythmState();
        changed = true;
        break;
      case STATE_ACTION_TOKENS.SET_ACTIVE_PERFORMANCE_SLOT:
        this.state.activePerformanceSlot = Number.isInteger(payload) ? payload : null;
        changed = true;
        break;
      case STATE_ACTION_TOKENS.SET_ACTIVE_BASE_SLOT:
        this.state.activeBaseSlot = Number.isInteger(payload) ? payload : null;
        changed = true;
        break;
      case STATE_ACTION_TOKENS.SET_TONIC_LINK: {
        const { tonicIndex, memoryIndex } = payload || {};
        if (Number.isInteger(tonicIndex) && tonicIndex >= 0 && tonicIndex < this.state.tonicLinks.length) {
          this.state.tonicLinks[tonicIndex] = Number.isInteger(memoryIndex) ? memoryIndex : null;
          this.saveTonicLinks();
          changed = true;
        }
        break;
      }
      case STATE_ACTION_TOKENS.SET_SMART_LINK: {
        const { mode, position, memoryIndex } = payload || {};
        if ((mode === MUSIC_TOKENS.MODE_MAJOR || mode === MUSIC_TOKENS.MODE_MINOR) && Number.isInteger(position) && position >= 0 && position < this.state.smartLinks[mode].length) {
          this.state.smartLinks[mode][position] = Number.isInteger(memoryIndex) ? memoryIndex : null;
          this.saveSmartState();
          changed = true;
        }
        break;
      }
      case STATE_ACTION_TOKENS.UPDATE_BINDING: {
        const { action, shortcut } = payload || {};
        if (typeof action === JAVASCRIPT_TOKENS.TYPE_STRING) {
          this.state.bindings[action] = shortcut ?? null;
          this.saveBindings();
          changed = true;
        }
        break;
      }
      case STATE_ACTION_TOKENS.SAVE_MEMORY: {
        const { index, memory } = payload || {};
        if (Number.isInteger(index) && index >= 0 && index < this.state.memories.length) {
          this.state.memories[index] = memory ? { ...memory } : null;
          this.saveMemories();
          changed = true;
        }
        break;
      }
      case STATE_ACTION_TOKENS.SAVE_PERFORMANCE_MEMORY: {
        const { index, memory } = payload || {};
        if (Number.isInteger(index) && index >= 0 && index < this.state.performanceMemories.length) {
          this.state.performanceMemories[index] = memory ? { ...memory } : null;
          this.savePerformanceMemories();
          changed = true;
        }
        break;
      }
      case STATE_ACTION_TOKENS.SAVE_BASE_MEMORY: {
        const { index, memory } = payload || {};
        if (Number.isInteger(index) && index >= 0 && index < this.state.baseMemories.length) {
          this.state.baseMemories[index] = memory ? { ...memory } : null;
          this.saveBaseMemories();
          changed = true;
        }
        break;
      }
      case STATE_ACTION_TOKENS.TOGGLE_PEDAL:
        this.state.pedalActive = !this.state.pedalActive;
        changed = true;
        break;
      // Adicionar mais handlers conforme necessário
      default:
        console.warn(STATE_MESSAGE_TOKENS.ERR_UNKNOWN_ACTION, actionType);
    }
    
    if (changed) {
      this.notify(actionType, payload);
    }
  },

  // Helpers de gravação direta
  savePerformanceMemories() {
    storage.setJSON(STORAGE_KEYS.PERFORMANCE_MEMORIES, this.state.performanceMemories);
  },
  saveBaseMemories() {
    storage.setJSON(STORAGE_KEYS.BASE_MEMORIES, this.state.baseMemories);
  },
  saveSets() {
    storage.setJSON(STORAGE_KEYS.SETS, this.state.sets);
    storage.set(STORAGE_KEYS.ACTIVE_SET_ID, this.state.activeSetId || GLOBAL_TOKENS.STRING_EMPTY);
  },
  saveTonicLinks() {
    storage.setJSON(STORAGE_KEYS.TONIC_LINKS, this.state.tonicLinks);
  },
  saveSmartState() {
    storage.set(STORAGE_KEYS.SMART_MODE, String(this.state.smartMode));
    storage.set(STORAGE_KEYS.FIELD_LETTER, String(this.state.fieldLetter));
    storage.set(STORAGE_KEYS.FIELD_ACCIDENTAL, String(this.state.fieldAccidental));
    storage.set(STORAGE_KEYS.FIELD_MINOR, String(this.state.fieldMinor));
    storage.setJSON(STORAGE_KEYS.SMART_LINKS, this.state.smartLinks);
    storage.set(STORAGE_KEYS.SMART_COMMAND_MODE, this.state.smartCommandMode);
  },
  saveSoundSet() {
    storage.set(STORAGE_KEYS.SOUND_SET, this.state.soundSet);
  },
  saveRhythmState() {
    storage.set(STORAGE_KEYS.RHYTHM_PRESET, this.state.rhythmPreset);
    storage.set(STORAGE_KEYS.RHYTHM_TEMPO, String(this.state.tempo));
  },
  saveTheme() {
    storage.set(STORAGE_KEYS.THEME, this.state.theme);
  },
  saveMemories() {
    storage.setJSON(STORAGE_KEYS.MEMORIES, this.state.memories);
  },
  saveBindings() {
    storage.setJSON(STORAGE_KEYS.BINDINGS, this.state.bindings);
  }
};

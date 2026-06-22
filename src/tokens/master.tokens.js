import { KEYBOARD_TOKENS } from './keyboard.tokens.js';

export const GLOBAL_TOKENS = {
  // Configurações
  MAX_DEGREES: 8,
  MAX_MEMORIES: 24,
  MAX_PERFORMANCE_SLOTS: 20,
  MAX_BASE_SLOTS: 10,
  DEFAULT_TEMPO: 108,

  // Temas
  THEME_LIGHT: "light",
  THEME_DARK: "dark",

  // Workspaces
  WORKSPACE_COMPOSER: "composer",
  WORKSPACE_PERFORMANCE: "performance",

  // Modos Inteligentes
  SMART_MODE_NOTE: "note",
  SMART_MODE_POSITION: "position",

  // Motores de Som
  ENGINE_PIANO: "piano",
  ENGINE_GUITAR: "guitar",
  ENGINE_SYNTH: "synth",
  ENGINE_ORGAN: "organ",
  ENGINE_WIND: "wind",

  // Prefixos de Ações (Eventos)
  ACTION_TONIC: "tonic",
  ACTION_DEGREE: "degree",
  ACTION_MEMORY: "memory",
  ACTION_PERFORMANCE: "performance",
  ACTION_BASE: "base",
  ACTION_OCTAVE_DOWN: "octaveDown",
  ACTION_OCTAVE_UP: "octaveUp",
  ACTION_RHYTHM_DOWN: "rhythmDown",
  ACTION_RHYTHM_UP: "rhythmUp",
  ACTION_EFFECT: "effect",
  ACTION_EFFECT_PREFIX: "effect",

  // Símbolos
  SYMBOL_FLAT: "♭",
  SYMBOL_SHARP: "♯",
  SYMBOL_EMPTY: "—",
  SYMBOL_EMPTY_SLOT: "∅",
  
  // Teclas Especiais
  KEY_SHIFT: "Shift",
  KEY_CTRL: "Control",
  KEY_ALT: "Alt",
  KEY_META: "Meta",

  // Modos de Ritmo
  RHYTHM_VAR_A: "a",
  RHYTHM_VAR_B: "b",
  
  // Tipos de Captura
  CAPTURE_NOTE: "note",
  CAPTURE_BASE: "base",

  // Misc Strings
  STRING_EMPTY: "",
  STRING_SPACE: " ",
};

export const PERFORMANCE_EFFECTS = [
  { action: "effectBendDown", label: "BEND −", copy: "DESCE 2 SEMITONS" },
  { action: "rhythmDown", label: "PEDAL", copy: "ALONGA APÓS SOLTAR" },
  { action: "effect", label: "BEND +", copy: "ESTICA +2 SEMITONS" },
];

export const MUSIC_TOKENS = {
  MODE_MAJOR: "major",
  MODE_MINOR: "minor",
  TONICS: [
    ["C", 0], ["C♯", 1], ["D", 2], ["D♯", 3], ["E", 4], ["F", 5],
    ["F♯", 6], ["G", 7], ["G♯", 8], ["A", 9], ["A♯", 10], ["B", 11],
  ],
  NOTE_LETTERS: ["C", "D", "E", "F", "G", "A", "B"],
  NATURAL_PITCHES: [0, 2, 4, 5, 7, 9, 11],
  SCALE_PATTERNS: {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
  },
  SCALE_DEGREES: ["I", "II", "III", "IV", "V", "VI", "VII"],
  DEGREES: [
    ["2", 2, "MAIOR"], ["3", 4, "MAIOR"], ["4", 5, "JUSTA"], ["5", 7, "JUSTA"],
    ["6", 9, "MAIOR"], ["7", 11, "MAIOR"], ["9", 14, "COMPOSTA"], ["10", 16, "COMPOSTA"],
    ["11", 17, "COMPOSTA"], ["12", 19, "COMPOSTA"], ["13", 21, "COMPOSTA"], ["14", 23, "COMPOSTA"],
    ["♭2", 1, "BEMOL"], ["♯2", 3, "SUSTENIDO"], ["♭3", 3, "BEMOL"], ["♯3", 5, "SUSTENIDO"],
    ["♭4", 4, "BEMOL"], ["♯4", 6, "SUSTENIDO"], ["♭5", 6, "BEMOL"], ["♯5", 8, "SUSTENIDO"],
    ["♭6", 8, "BEMOL"], ["♯6", 10, "SUSTENIDO"], ["♭7", 10, "BEMOL"], ["♯7", 12, "SUSTENIDO"],
    ["♭9", 13, "BEMOL"], ["♯9", 15, "SUSTENIDO"], ["♭10", 15, "BEMOL"], ["♯10", 17, "SUSTENIDO"],
    ["♭11", 16, "BEMOL"], ["♯11", 18, "SUSTENIDO"], ["♭12", 18, "BEMOL"], ["♯12", 20, "SUSTENIDO"],
    ["♭13", 20, "BEMOL"], ["♯13", 22, "SUSTENIDO"], ["♭14", 22, "BEMOL"], ["♯14", 24, "SUSTENIDO"],
  ],
  SOUND_SETS: {
    piano: {
      id: "piano",
      label: "PIANO · GRAND CONCERT",
      engine: GLOBAL_TOKENS.ENGINE_PIANO,
      duration: 6.8,
      brightness: 5600,
      hammer: 0.16,
      warmth: 1,
      room: 0.28,
    },
    pianoSoft: {
      id: "pianoSoft",
      label: "PIANO · FELT",
      engine: GLOBAL_TOKENS.ENGINE_PIANO,
      duration: 6.2,
      brightness: 3100,
      hammer: 0.055,
      warmth: 1.25,
      room: 0.34,
    },
    guitarNylon: {
      id: "guitarNylon",
      label: "VIOLÃO · NYLON",
      engine: GLOBAL_TOKENS.ENGINE_GUITAR,
      duration: 5.5,
      brightness: 3200,
      pickNoise: 0.35,
      damping: 0.98,
      room: 0.15,
    },
    guitarSteel: {
      id: "guitarSteel",
      label: "VIOLÃO · AÇO",
      engine: GLOBAL_TOKENS.ENGINE_GUITAR,
      duration: 6.5,
      brightness: 6500,
      pickNoise: 0.85,
      damping: 0.992,
      room: 0.25,
    },
    synthPad: {
      id: "synthPad",
      label: "SYNTH · WARM PAD",
      engine: GLOBAL_TOKENS.ENGINE_SYNTH,
      duration: 8.0,
      brightness: 1800,
      room: 0.5,
    },
    synthLead: {
      id: "synthLead",
      label: "SYNTH · BRIGHT LEAD",
      engine: GLOBAL_TOKENS.ENGINE_SYNTH,
      duration: 4.0,
      brightness: 8000,
      room: 0.4,
    },
    organ: {
      id: "organ",
      label: "ÓRGÃO · ELETRIC",
      engine: GLOBAL_TOKENS.ENGINE_ORGAN,
      duration: Infinity,
      brightness: 4500,
      room: 0.3,
    },
    windFlute: {
      id: "windFlute",
      label: "SOPRO · FLAUTA",
      engine: GLOBAL_TOKENS.ENGINE_WIND,
      duration: 7.5,
      brightness: 3600,
      windType: "flute",
      resonance: 1.4,
      room: 0.34,
    },
    windTrumpet: {
      id: "windTrumpet",
      label: "SOPRO · TROMPETE",
      engine: GLOBAL_TOKENS.ENGINE_WIND,
      duration: 5.5,
      brightness: 5200,
      windType: "trumpet",
      resonance: 2.8,
      room: 0.28,
    },
    windSax: {
      id: "windSax",
      label: "SOPRO · SAXOFONE",
      engine: GLOBAL_TOKENS.ENGINE_WIND,
      duration: 6.2,
      brightness: 2400,
      windType: "sax",
      resonance: 3.6,
      room: 0.3,
    },
  }
};

export const DEFAULT_BINDINGS = {
  [GLOBAL_TOKENS.ACTION_TONIC + "0"]: KEYBOARD_TOKENS.DIGIT_1, [GLOBAL_TOKENS.ACTION_TONIC + "1"]: KEYBOARD_TOKENS.DIGIT_2, 
  [GLOBAL_TOKENS.ACTION_TONIC + "2"]: KEYBOARD_TOKENS.DIGIT_3, [GLOBAL_TOKENS.ACTION_TONIC + "3"]: KEYBOARD_TOKENS.DIGIT_4,
  [GLOBAL_TOKENS.ACTION_TONIC + "4"]: KEYBOARD_TOKENS.DIGIT_5, [GLOBAL_TOKENS.ACTION_TONIC + "5"]: KEYBOARD_TOKENS.DIGIT_6, 
  [GLOBAL_TOKENS.ACTION_TONIC + "6"]: KEYBOARD_TOKENS.DIGIT_7, [GLOBAL_TOKENS.ACTION_TONIC + "7"]: KEYBOARD_TOKENS.DIGIT_8,
  [GLOBAL_TOKENS.ACTION_TONIC + "8"]: KEYBOARD_TOKENS.DIGIT_9, [GLOBAL_TOKENS.ACTION_TONIC + "9"]: KEYBOARD_TOKENS.DIGIT_0, 
  [GLOBAL_TOKENS.ACTION_TONIC + "10"]: KEYBOARD_TOKENS.MINUS, [GLOBAL_TOKENS.ACTION_TONIC + "11"]: KEYBOARD_TOKENS.EQUAL,
  
  [GLOBAL_TOKENS.ACTION_DEGREE + "0"]: KEYBOARD_TOKENS.KEY_Q, [GLOBAL_TOKENS.ACTION_DEGREE + "1"]: KEYBOARD_TOKENS.KEY_W, 
  [GLOBAL_TOKENS.ACTION_DEGREE + "2"]: KEYBOARD_TOKENS.KEY_E, [GLOBAL_TOKENS.ACTION_DEGREE + "3"]: KEYBOARD_TOKENS.KEY_R,
  [GLOBAL_TOKENS.ACTION_DEGREE + "4"]: KEYBOARD_TOKENS.KEY_T, [GLOBAL_TOKENS.ACTION_DEGREE + "5"]: KEYBOARD_TOKENS.KEY_Y, 
  [GLOBAL_TOKENS.ACTION_DEGREE + "6"]: KEYBOARD_TOKENS.KEY_U, [GLOBAL_TOKENS.ACTION_DEGREE + "7"]: KEYBOARD_TOKENS.KEY_I,
  [GLOBAL_TOKENS.ACTION_DEGREE + "8"]: KEYBOARD_TOKENS.KEY_O, [GLOBAL_TOKENS.ACTION_DEGREE + "9"]: KEYBOARD_TOKENS.KEY_P, 
  [GLOBAL_TOKENS.ACTION_DEGREE + "10"]: KEYBOARD_TOKENS.BRACKET_LEFT, [GLOBAL_TOKENS.ACTION_DEGREE + "11"]: KEYBOARD_TOKENS.BRACKET_RIGHT,
  
  [GLOBAL_TOKENS.ACTION_OCTAVE_DOWN]: KEYBOARD_TOKENS.KEY_Z, [GLOBAL_TOKENS.ACTION_OCTAVE_UP]: KEYBOARD_TOKENS.KEY_X,
  [GLOBAL_TOKENS.ACTION_RHYTHM_DOWN]: KEYBOARD_TOKENS.SPACE, [GLOBAL_TOKENS.ACTION_RHYTHM_UP]: null, 
  [GLOBAL_TOKENS.ACTION_EFFECT]: KEYBOARD_TOKENS.SEMICOLON,
  effectBendDown: KEYBOARD_TOKENS.SLASH,
  
  [GLOBAL_TOKENS.ACTION_MEMORY + "0"]: KEYBOARD_TOKENS.KEY_A, [GLOBAL_TOKENS.ACTION_MEMORY + "1"]: KEYBOARD_TOKENS.KEY_S, 
  [GLOBAL_TOKENS.ACTION_MEMORY + "2"]: KEYBOARD_TOKENS.KEY_D, [GLOBAL_TOKENS.ACTION_MEMORY + "3"]: KEYBOARD_TOKENS.KEY_F,
  [GLOBAL_TOKENS.ACTION_MEMORY + "4"]: KEYBOARD_TOKENS.KEY_G, [GLOBAL_TOKENS.ACTION_MEMORY + "5"]: KEYBOARD_TOKENS.KEY_H, 
  [GLOBAL_TOKENS.ACTION_MEMORY + "6"]: KEYBOARD_TOKENS.KEY_J, [GLOBAL_TOKENS.ACTION_MEMORY + "7"]: KEYBOARD_TOKENS.KEY_K,
  [GLOBAL_TOKENS.ACTION_MEMORY + "8"]: KEYBOARD_TOKENS.KEY_L, [GLOBAL_TOKENS.ACTION_MEMORY + "10"]: KEYBOARD_TOKENS.QUOTE, 
  [GLOBAL_TOKENS.ACTION_MEMORY + "11"]: KEYBOARD_TOKENS.BACKSLASH,
};

const DEFAULT_PERFORMANCE_CODES = [
  KEYBOARD_TOKENS.DIGIT_1, KEYBOARD_TOKENS.DIGIT_2, KEYBOARD_TOKENS.DIGIT_3, KEYBOARD_TOKENS.DIGIT_4, KEYBOARD_TOKENS.DIGIT_5, KEYBOARD_TOKENS.DIGIT_6,
  KEYBOARD_TOKENS.DIGIT_7, KEYBOARD_TOKENS.DIGIT_8, KEYBOARD_TOKENS.DIGIT_9, KEYBOARD_TOKENS.DIGIT_0, KEYBOARD_TOKENS.MINUS, KEYBOARD_TOKENS.EQUAL,
  KEYBOARD_TOKENS.F1, KEYBOARD_TOKENS.F2, KEYBOARD_TOKENS.F3, KEYBOARD_TOKENS.F4, KEYBOARD_TOKENS.F5, KEYBOARD_TOKENS.F6, KEYBOARD_TOKENS.F7, KEYBOARD_TOKENS.F8,
];

DEFAULT_PERFORMANCE_CODES.forEach((code, index) => {
  DEFAULT_BINDINGS[GLOBAL_TOKENS.ACTION_PERFORMANCE + index] = code;
});

const DEFAULT_BASE_CODES = [
  KEYBOARD_TOKENS.NUMPAD_1, KEYBOARD_TOKENS.NUMPAD_2, KEYBOARD_TOKENS.NUMPAD_3, KEYBOARD_TOKENS.NUMPAD_4, KEYBOARD_TOKENS.NUMPAD_5,
  KEYBOARD_TOKENS.NUMPAD_6, KEYBOARD_TOKENS.NUMPAD_7, KEYBOARD_TOKENS.NUMPAD_8, KEYBOARD_TOKENS.NUMPAD_9, KEYBOARD_TOKENS.NUMPAD_0,
];

DEFAULT_BASE_CODES.forEach((code, index) => {
  DEFAULT_BINDINGS[GLOBAL_TOKENS.ACTION_BASE + index] = code;
});

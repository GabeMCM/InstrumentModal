import { KEYBOARD_TOKENS } from './keyboard.tokens.js';

export const GLOBAL_TOKENS = {
  // Configurações
  MAX_DEGREES: 8,
  MAX_MEMORIES: 24,
  MAX_PERFORMANCE_SLOTS: 40,
  MAX_BASE_SLOTS: 10,
  DEFAULT_TEMPO: 108,

  // Temas
  THEME_LIGHT: "light",
  THEME_DARK: "dark",

  // Workspaces
  WORKSPACE_COMPOSER: "composer",
  WORKSPACE_PERFORMANCE: "performance",
  WORKSPACE_RHYTHM: "rhythm",

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

const GM_GROUPS = [
  ["gmPiano", "PIANOS", ["Acoustic Grand Piano", "Bright Acoustic Piano", "Electric Grand Piano", "Honky-tonk Piano", "Electric Piano 1", "Electric Piano 2", "Harpsichord", "Clavinet"]],
  ["gmChromatic", "PERCUSSAO MELODICA", ["Celesta", "Glockenspiel", "Music Box", "Vibraphone", "Marimba", "Xylophone", "Tubular Bells", "Dulcimer"]],
  ["gmOrgan", "ORGAOS", ["Drawbar Organ", "Percussive Organ", "Rock Organ", "Church Organ", "Reed Organ", "Accordion", "Harmonica", "Tango Accordion"]],
  ["gmGuitar", "GUITARRAS", ["Acoustic Guitar Nylon", "Acoustic Guitar Steel", "Electric Guitar Jazz", "Electric Guitar Clean", "Electric Guitar Muted", "Overdriven Guitar", "Distortion Guitar", "Guitar Harmonics"]],
  ["gmBass", "BAIXOS", ["Acoustic Bass", "Electric Bass Finger", "Electric Bass Pick", "Fretless Bass", "Slap Bass 1", "Slap Bass 2", "Synth Bass 1", "Synth Bass 2"]],
  ["gmStrings", "CORDAS", ["Violin", "Viola", "Cello", "Contrabass", "Tremolo Strings", "Pizzicato Strings", "Orchestral Harp", "Timpani"]],
  ["gmEnsemble", "ENSEMBLES", ["String Ensemble 1", "String Ensemble 2", "Synth Strings 1", "Synth Strings 2", "Choir Aahs", "Voice Oohs", "Synth Voice", "Orchestra Hit"]],
  ["gmBrass", "METAIS", ["Trumpet", "Trombone", "Tuba", "Muted Trumpet", "French Horn", "Brass Section", "Synth Brass 1", "Synth Brass 2"]],
  ["gmReed", "PALHETAS", ["Soprano Sax", "Alto Sax", "Tenor Sax", "Baritone Sax", "Oboe", "English Horn", "Bassoon", "Clarinet"]],
  ["gmPipe", "SOPROS", ["Piccolo", "Flute", "Recorder", "Pan Flute", "Blown Bottle", "Shakuhachi", "Whistle", "Ocarina"]],
  ["gmLead", "SYNTH LEADS", ["Lead 1 Square", "Lead 2 Sawtooth", "Lead 3 Calliope", "Lead 4 Chiff", "Lead 5 Charang", "Lead 6 Voice", "Lead 7 Fifths", "Lead 8 Bass + Lead"]],
  ["gmPad", "SYNTH PADS", ["Pad 1 New Age", "Pad 2 Warm", "Pad 3 Polysynth", "Pad 4 Choir", "Pad 5 Bowed", "Pad 6 Metallic", "Pad 7 Halo", "Pad 8 Sweep"]],
  ["gmFx", "SYNTH FX", ["FX 1 Rain", "FX 2 Soundtrack", "FX 3 Crystal", "FX 4 Atmosphere", "FX 5 Brightness", "FX 6 Goblins", "FX 7 Echoes", "FX 8 Sci-fi"]],
  ["gmEthnic", "ETNICOS", ["Sitar", "Banjo", "Shamisen", "Koto", "Kalimba", "Bagpipe", "Fiddle", "Shanai"]],
  ["gmPercussive", "PERCUSSIVOS", ["Tinkle Bell", "Agogo", "Steel Drums", "Woodblock", "Taiko Drum", "Melodic Tom", "Synth Drum", "Reverse Cymbal"]],
  ["gmSoundFx", "EFEITOS", ["Guitar Fret Noise", "Breath Noise", "Seashore", "Bird Tweet", "Telephone Ring", "Helicopter", "Applause", "Gunshot"]],
];

const GM_GROUP_ENGINE = {
  gmPiano: GLOBAL_TOKENS.ENGINE_PIANO,
  gmOrgan: GLOBAL_TOKENS.ENGINE_ORGAN,
  gmBrass: GLOBAL_TOKENS.ENGINE_WIND,
  gmReed: GLOBAL_TOKENS.ENGINE_WIND,
  gmPipe: GLOBAL_TOKENS.ENGINE_WIND,
  gmLead: GLOBAL_TOKENS.ENGINE_SYNTH,
  gmPad: GLOBAL_TOKENS.ENGINE_SYNTH,
  gmFx: GLOBAL_TOKENS.ENGINE_SYNTH,
};

function gmDefaults(groupId) {
  if (groupId === "gmOrgan") return { duration: Infinity, brightness: 4300, room: 0.3 };
  if (groupId === "gmGuitar" || groupId === "gmBass") return { duration: 4.8, brightness: 3600, room: 0.24 };
  if (groupId === "gmStrings" || groupId === "gmEnsemble") return { duration: 7.2, brightness: 3300, room: 0.42 };
  if (groupId === "gmBrass" || groupId === "gmReed" || groupId === "gmPipe") return { duration: 5.4, brightness: 4600, room: 0.32 };
  if (groupId === "gmLead") return { duration: 4.2, brightness: 7200, room: 0.32 };
  if (groupId === "gmPad" || groupId === "gmFx") return { duration: 8.0, brightness: 2400, room: 0.5 };
  if (groupId === "gmPercussive" || groupId === "gmChromatic") return { duration: 4.2, brightness: 5200, room: 0.28 };
  return { duration: 5.2, brightness: 4200, room: 0.3 };
}

function createGMSoundSets() {
  return Object.fromEntries(GM_GROUPS.flatMap(([groupId, group, names], groupIndex) =>
    names.map((name, index) => {
      const program = groupIndex * 8 + index;
      const id = `gm${String(program).padStart(3, "0")}`;
      return [id, {
        id,
        label: `${group} · ${name.toUpperCase()}`,
        group,
        program,
        engine: GM_GROUP_ENGINE[groupId] || "gm",
        ...gmDefaults(groupId),
      }];
    })
  ));
}

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
      duration: 5.8,
      brightness: 4800,
      hammer: 0.12,
      warmth: 1,
      room: 0.28,
    },
    pianoSoft: {
      id: "pianoSoft",
      label: "PIANO · FELT",
      engine: GLOBAL_TOKENS.ENGINE_PIANO,
      duration: 5.4,
      brightness: 2600,
      hammer: 0.052,
      warmth: 1.25,
      room: 0.34,
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
      duration: 5.8,
      brightness: 5200,
      windType: "flute",
      resonance: 1.8,
      room: 0.34,
    },
    windTrumpet: {
      id: "windTrumpet",
      label: "SOPRO · TROMPETE",
      engine: GLOBAL_TOKENS.ENGINE_WIND,
      duration: 4.7,
      brightness: 3900,
      windType: "trumpet",
      resonance: 4.2,
      room: 0.28,
    },
    windSax: {
      id: "windSax",
      label: "SOPRO · SAXOFONE",
      engine: GLOBAL_TOKENS.ENGINE_WIND,
      duration: 5.4,
      brightness: 2800,
      windType: "sax",
      resonance: 3.2,
      room: 0.3,
    },
    ...createGMSoundSets(),
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
  [GLOBAL_TOKENS.ACTION_DEGREE + "10"]: null, [GLOBAL_TOKENS.ACTION_DEGREE + "11"]: null,
  
  [GLOBAL_TOKENS.ACTION_OCTAVE_DOWN]: KEYBOARD_TOKENS.KEY_Z, [GLOBAL_TOKENS.ACTION_OCTAVE_UP]: KEYBOARD_TOKENS.KEY_X,
  [GLOBAL_TOKENS.ACTION_RHYTHM_DOWN]: KEYBOARD_TOKENS.SPACE, [GLOBAL_TOKENS.ACTION_RHYTHM_UP]: null, 
  [GLOBAL_TOKENS.ACTION_EFFECT]: KEYBOARD_TOKENS.BRACKET_RIGHT,
  effectBendDown: KEYBOARD_TOKENS.BRACKET_LEFT,
  
  [GLOBAL_TOKENS.ACTION_MEMORY + "0"]: KEYBOARD_TOKENS.KEY_A, [GLOBAL_TOKENS.ACTION_MEMORY + "1"]: KEYBOARD_TOKENS.KEY_S, 
  [GLOBAL_TOKENS.ACTION_MEMORY + "2"]: KEYBOARD_TOKENS.KEY_D, [GLOBAL_TOKENS.ACTION_MEMORY + "3"]: KEYBOARD_TOKENS.KEY_F,
  [GLOBAL_TOKENS.ACTION_MEMORY + "4"]: KEYBOARD_TOKENS.KEY_G, [GLOBAL_TOKENS.ACTION_MEMORY + "5"]: KEYBOARD_TOKENS.KEY_H, 
  [GLOBAL_TOKENS.ACTION_MEMORY + "6"]: KEYBOARD_TOKENS.KEY_J, [GLOBAL_TOKENS.ACTION_MEMORY + "7"]: KEYBOARD_TOKENS.KEY_K,
  [GLOBAL_TOKENS.ACTION_MEMORY + "8"]: KEYBOARD_TOKENS.KEY_L, [GLOBAL_TOKENS.ACTION_MEMORY + "10"]: KEYBOARD_TOKENS.QUOTE, 
  [GLOBAL_TOKENS.ACTION_MEMORY + "11"]: KEYBOARD_TOKENS.BACKSLASH,
};

const DEFAULT_PERFORMANCE_CODES = [
  KEYBOARD_TOKENS.DIGIT_1, KEYBOARD_TOKENS.DIGIT_2, KEYBOARD_TOKENS.DIGIT_3, KEYBOARD_TOKENS.DIGIT_4, KEYBOARD_TOKENS.DIGIT_5,
  KEYBOARD_TOKENS.DIGIT_6, KEYBOARD_TOKENS.DIGIT_7, KEYBOARD_TOKENS.DIGIT_8, KEYBOARD_TOKENS.DIGIT_9, KEYBOARD_TOKENS.DIGIT_0,
  KEYBOARD_TOKENS.KEY_Q, KEYBOARD_TOKENS.KEY_W, KEYBOARD_TOKENS.KEY_E, KEYBOARD_TOKENS.KEY_R, KEYBOARD_TOKENS.KEY_T,
  KEYBOARD_TOKENS.KEY_Y, KEYBOARD_TOKENS.KEY_U, KEYBOARD_TOKENS.KEY_I, KEYBOARD_TOKENS.KEY_O, KEYBOARD_TOKENS.KEY_P,
  KEYBOARD_TOKENS.KEY_A, KEYBOARD_TOKENS.KEY_S, KEYBOARD_TOKENS.KEY_D, KEYBOARD_TOKENS.KEY_F, KEYBOARD_TOKENS.KEY_G,
  KEYBOARD_TOKENS.KEY_H, KEYBOARD_TOKENS.KEY_J, KEYBOARD_TOKENS.KEY_K, KEYBOARD_TOKENS.KEY_L, KEYBOARD_TOKENS.SEMICOLON,
  KEYBOARD_TOKENS.KEY_Z, KEYBOARD_TOKENS.KEY_X, KEYBOARD_TOKENS.KEY_C, KEYBOARD_TOKENS.KEY_V, KEYBOARD_TOKENS.KEY_B,
  KEYBOARD_TOKENS.KEY_N, KEYBOARD_TOKENS.KEY_M, KEYBOARD_TOKENS.COMMA, KEYBOARD_TOKENS.PERIOD, KEYBOARD_TOKENS.SLASH,
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

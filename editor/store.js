export const initialState = {
  settings: {
    bpm: 120,
    instrument: {
      strings: 6,
      frets: 22,
      tuning: ["E2", "A2", "D3", "G3", "B3", "E4"]
    }
  },
  libraries: {
    shapes: {
      "shape_C_aberto": {
        name: "C Maior",
        positions: [
          { string: 5, fret: 3 },
          { string: 4, fret: 2 },
          { string: 3, fret: 0 },
          { string: 2, fret: 1 },
          { string: 1, fret: 0 }
        ],
        muted: [6]
      }
    },
    patterns: {
      "pattern_batida_pop": {
        id: "pattern_batida_pop",
        name: "Batida Pop (Down/Down/Up)",
        events: [
          // Batida Down
          { id: "A", strings: [6], delayAfter: 20, intensity: 0.8 },
          { id: "B", strings: [5], delayAfter: 20, intensity: 0.8 },
          { id: "C", strings: [4], delayAfter: 20, intensity: 0.8 },
          { id: "D", strings: [3], delayAfter: 20, intensity: 0.8 },
          { id: "E", strings: [2], delayAfter: 20, intensity: 0.8 },
          { id: "F", strings: [1], delayAfter: 400, intensity: 0.8 },
          // Batida Down (mais fraca)
          { id: "G", strings: [6], delayAfter: 20, intensity: 0.6 },
          { id: "H", strings: [5], delayAfter: 20, intensity: 0.6 },
          { id: "I", strings: [4], delayAfter: 20, intensity: 0.6 },
          { id: "J", strings: [3], delayAfter: 20, intensity: 0.6 },
          { id: "K", strings: [2], delayAfter: 20, intensity: 0.6 },
          { id: "L", strings: [1], delayAfter: 400, intensity: 0.6 },
          // Puxada Simultânea
          { id: "M", strings: [5, 4, 3], delayAfter: 0, intensity: 0.9 }
        ]
      }
    }
  },
  timeline: {
    leftHandTrack: [
      { id: "block_1", shapeId: "shape_C_aberto", startTimeMs: 0, durationMs: 2000 },
      { id: "block_3", shapeId: "shape_C_aberto", startTimeMs: 2500, durationMs: 1500 }
    ],
    rightHandTrack: [
      { id: "block_2", patternId: "pattern_batida_pop", startTimeMs: 0, durationMs: 2000 },
      { id: "block_4", patternId: "pattern_batida_pop", startTimeMs: 2500, durationMs: 1500 }
    ]
  }
};

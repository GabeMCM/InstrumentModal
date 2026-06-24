import * as Tone from 'tone';
import { WorkletSynthesizer } from 'spessasynth_lib';
import { GLOBAL_TOKENS } from '../tokens/master.tokens.js';

const PROGRAMS = {
  piano: 0,
  pianoSoft: 0,
  organ: 16,
  windFlute: 73,
  windTrumpet: 56,
  windSax: 65,
  synthPad: 89,
  synthLead: 81,
};
const LEVELS = {
  piano: 0.72,
  organ: 0.42,
  synth: 0.46,
  wind: 0.5,
  fallback: 0.48,
};

let toneReady = false;
let master = null;
let limiter = null;
let reverb = null;
let compressor = null;
let sampledPiano = null;
let sampledPianoPitch = null;
let sampledPianoReady = false;
let sampledPianoLoading = false;
let spessaReady = false;
let spessaSynth = null;
let spessaLoading = null;
const spessaPrograms = new Map();
const spessaTimers = new Map();
const MIN_SCHEDULE_AHEAD = 0.025;
const SPESSA_WORKLET_URL = '/vendor/spessasynth_processor.min.js';
const SOUNDFONT_URLS = ['/soundfonts/forminic.sf3', '/soundfonts/forminic.sf2'];
const MIDI_CC_BANK_MSB = 0;
const MIDI_CC_BANK_LSB = 32;
const PERCUSSION_PROGRAMS = new Set([112, 113, 114, 115, 116, 117, 118, 119]);
const PIANO_SAMPLE_URLS = {
  A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
  A1: 'A1.mp3', C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
  A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
  A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
  A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
  A5: 'A5.mp3', C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
  A6: 'A6.mp3', C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3',
  A7: 'A7.mp3', C8: 'C8.mp3',
};

function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function soundType(preset = {}) {
  if (preset.engine === GLOBAL_TOKENS.ENGINE_WIND) return 'wind';
  if (preset.engine === GLOBAL_TOKENS.ENGINE_ORGAN) return 'organ';
  if (preset.engine === GLOBAL_TOKENS.ENGINE_SYNTH) return 'synth';
  if (preset.engine === GLOBAL_TOKENS.ENGINE_PIANO) return 'piano';
  return 'fallback';
}

function envelopeFor(preset = {}, muted = false) {
  const type = soundType(preset);
  if (muted) return { attack: 0.002, decay: 0.05, sustain: 0.03, release: 0.06 };
  if (type === 'piano') return { attack: 0.003, decay: 1.2, sustain: 0.12, release: 1.6 };
  if (type === 'wind') return { attack: 0.075, decay: 0.22, sustain: 0.72, release: 0.62 };
  if (type === 'organ') return { attack: 0.012, decay: 0.08, sustain: 0.86, release: 0.42 };
  if (type === 'synth') return { attack: 0.14, decay: 0.4, sustain: 0.62, release: 1.25 };
  return { attack: 0.015, decay: 0.35, sustain: 0.34, release: 0.75 };
}

function synthFor(preset = {}, muted = false) {
    const type = soundType(preset);
    const envelope = envelopeFor(preset, muted);
  if (type === 'piano') {
    return new Tone.FMSynth({
      harmonicity: 2.35,
      modulationIndex: preset.id === 'pianoSoft' ? 5 : 9,
      oscillator: { type: 'sine' },
      modulation: { type: 'triangle' },
      envelope,
      modulationEnvelope: { attack: 0.002, decay: 0.5, sustain: 0.02, release: 0.28 },
    });
  }
  if (type === 'wind') {
    const isFlute = preset.windType === 'flute';
    const isSax = preset.windType === 'sax';
    return new Tone.AMSynth({
      harmonicity: isFlute ? 1.01 : isSax ? 1.49 : 1.99,
      oscillator: { type: isFlute ? 'sine' : isSax ? 'fatsawtooth' : 'sawtooth' },
      modulation: { type: isFlute ? 'sine' : isSax ? 'triangle' : 'square' },
      envelope,
      modulationEnvelope: { attack: 0.08, decay: 0.35, sustain: 0.5, release: 0.5 },
    });
  }
  return new Tone.Synth({
    oscillator: { type: type === 'organ' ? 'sine4' : type === 'synth' ? 'sawtooth8' : 'triangle' },
    envelope,
  });
}

function initSampledPiano() {
  if (sampledPiano || sampledPianoLoading) return;
  sampledPianoLoading = true;
  sampledPiano = new Tone.Sampler({
    urls: PIANO_SAMPLE_URLS,
    baseUrl: 'https://tonejs.github.io/audio/salamander/',
    attack: 0.002,
    release: 1.45,
    curve: 'exponential',
    onload: () => {
      sampledPianoReady = true;
      sampledPianoLoading = false;
    },
    onerror: () => {
      sampledPianoReady = false;
      sampledPianoLoading = false;
    },
  });
  sampledPianoPitch = new Tone.PitchShift({ pitch: 0, windowSize: 0.03, delayTime: 0.01, feedback: 0 });
  sampledPiano.chain(sampledPianoPitch, new Tone.Filter(5200, 'lowpass'), master);
  sampledPiano.connect(reverb);
}

function spessaChannelFor(program) {
  if (PERCUSSION_PROGRAMS.has(program)) return 9;
  if (program >= 24 && program <= 39) return 1;
  if (program >= 40 && program <= 55) return 2;
  if (program >= 56 && program <= 79) return 3;
  if (program >= 80 && program <= 103) return 4;
  if (program >= 104 && program <= 111) return 5;
  if (program >= 120) return 6;
  return 0;
}

function selectSpessaProgram(channel, program) {
  const selected = spessaPrograms.get(channel);
  if (selected === program) return;
  spessaSynth.controllerChange(channel, MIDI_CC_BANK_MSB, 0);
  spessaSynth.controllerChange(channel, MIDI_CC_BANK_LSB, 0);
  spessaSynth.programChange(channel, program);
  spessaPrograms.set(channel, program);
}

async function initSpessa(context) {
  if (spessaReady || spessaLoading) return spessaLoading;
  spessaLoading = (async () => {
    try {
      await context.audioWorklet.addModule(SPESSA_WORKLET_URL);
      spessaSynth = new WorkletSynthesizer(context);
      spessaSynth.connect(context.destination);
      let response = null;
      for (const url of SOUNDFONT_URLS) {
        response = await fetch(url);
        if (response.ok) break;
      }
      if (!response?.ok) throw new Error('soundfont ausente');
      const bank = await response.arrayBuffer();
      await spessaSynth.soundBankManager.addSoundBank(bank, 'forminic');
      await spessaSynth.isReady;
      for (let channel = 0; channel < 16; channel += 1) {
        try {
          spessaSynth.controllerChange(channel, MIDI_CC_BANK_MSB, 0);
          spessaSynth.controllerChange(channel, MIDI_CC_BANK_LSB, 0);
          spessaSynth.pitchWheelRange?.(channel, 2);
        } catch (_) {}
      }
      spessaReady = true;
    } catch (_) {
      spessaReady = false;
      spessaSynth = null;
    }
  })();
  return spessaLoading;
}

export const toneSpessaEngine = {
  async init(context) {
    if (!toneReady) {
      Tone.setContext(new Tone.Context(context));
      Tone.getContext().lookAhead = 0.035;
      await Tone.start();
      limiter = new Tone.Limiter(-1);
      compressor = new Tone.Compressor({ threshold: -20, ratio: 5, attack: 0.006, release: 0.16 });
      master = new Tone.Gain(0.58);
      reverb = new Tone.Reverb({ decay: 2.2, preDelay: 0.018, wet: 0.14 });
      master.connect(compressor);
      reverb.connect(compressor);
      compressor.connect(limiter);
      limiter.toDestination();
      toneReady = true;
      initSampledPiano();
    }
    initSpessa(context);
  },

  get available() {
    return toneReady;
  },

  get hasSpessa() {
    return spessaReady;
  },

  play(midi, index, total, scheduledAt, velocity, muted, preset, currentTime) {
    if (!toneReady) return null;
    if (preset?.id?.startsWith('gm') && !spessaReady) return null;
    const program = Number.isInteger(preset?.program) ? preset.program : PROGRAMS[preset?.id] ?? PROGRAMS[preset?.engine] ?? 0;
    const type = soundType(preset);
    const level = LEVELS[type] || LEVELS.fallback;
    if (spessaReady && spessaSynth && preset?.engine !== GLOBAL_TOKENS.ENGINE_GUITAR) {
      const delay = Math.max(MIN_SCHEDULE_AHEAD, (scheduledAt ?? currentTime) - currentTime);
      const channel = spessaChannelFor(program);
      const noteKey = `${channel}:${midi}`;
      window.clearTimeout(spessaTimers.get(noteKey));
      window.setTimeout(() => {
        selectSpessaProgram(channel, program);
        spessaSynth.noteOff(channel, midi);
        spessaSynth.noteOn(channel, midi, Math.max(1, Math.min(108, Math.round(velocity * level * 118))));
      }, delay * 1000);
      const length = preset.duration === Infinity ? 18 : Math.min(8, preset.duration || 4);
      spessaTimers.set(noteKey, window.setTimeout(() => {
        spessaSynth?.noteOff?.(channel, midi);
        spessaTimers.delete(noteKey);
      }, (delay + length) * 1000));
      return { tone: true, spessa: true, channel, midi, startedAt: scheduledAt ?? currentTime, bendRatio: 1 };
    }

    const startAt = Tone.now() + Math.max(MIN_SCHEDULE_AHEAD, (scheduledAt ?? currentTime) - currentTime);
    if (preset?.engine === GLOBAL_TOKENS.ENGINE_PIANO && sampledPianoReady && sampledPiano) {
      const note = Tone.Frequency(midi, 'midi').toNote();
      sampledPiano.triggerAttack(note, startAt, Math.min(0.78, velocity * level));
      return { tone: true, sampled: true, note, midi, startedAt: scheduledAt ?? currentTime, bendRatio: 1 };
    }

    const panValue = total > 1 ? (index / (total - 1) - 0.5) * 0.42 : 0;
    const synth = synthFor(preset, muted);
    const filter = new Tone.Filter(muted ? 900 : preset.brightness || 4200, 'lowpass');
    const gain = new Tone.Gain(Math.min(0.46, Math.max(0.028, velocity * level)));
    const pan = new Tone.Panner(panValue);
    let vibrato = null;
    let formant = null;
    synth.connect(filter);
    if (preset?.engine === GLOBAL_TOKENS.ENGINE_WIND) {
      formant = new Tone.Filter(preset.windType === 'trumpet' ? 1650 : preset.windType === 'sax' ? 780 : 2450, 'bandpass');
      formant.Q.value = preset.windType === 'trumpet' ? 6.5 : preset.windType === 'sax' ? 4.2 : 2.4;
      filter.connect(formant);
      formant.connect(gain);
      vibrato = new Tone.LFO(preset.windType === 'trumpet' ? 5.2 : 4.4, -6, 6);
      vibrato.connect(synth.detune);
    } else {
      filter.connect(gain);
    }
    gain.connect(pan);
    pan.connect(master);
    pan.connect(reverb);
    const duration = muted ? 0.12 : preset.duration === Infinity ? undefined : Math.min(8, Math.max(0.5, preset.duration || 3.5));
    vibrato?.start(startAt + 0.08);
    if (duration) synth.triggerAttackRelease(midiToFrequency(midi), duration, startAt, Math.min(0.72, velocity));
    else synth.triggerAttack(midiToFrequency(midi), startAt, Math.min(0.66, velocity));
    const voice = { tone: true, synth, gain, filter, formant, vibrato, pan, midi, startedAt: scheduledAt ?? currentTime, bendRatio: 1, baseLevel: velocity, basePan: panValue };
    const cleanup = ((duration || 18) + 1.8) * 1000;
    window.setTimeout(() => this.disposeVoice(voice), cleanup);
    return voice;
  },

  stopVoice(voice, release = 0.12) {
    if (!voice?.tone) return;
    if (voice.sampled) {
      try { sampledPiano?.triggerRelease(voice.note || Tone.Frequency(voice.midi, 'midi').toNote(), Tone.now() + Math.max(0.01, release)); } catch (_) {}
      return;
    }
    if (voice.spessa) {
      const noteKey = `${voice.channel ?? 0}:${voice.midi}`;
      window.clearTimeout(spessaTimers.get(noteKey));
      spessaTimers.delete(noteKey);
      spessaSynth?.noteOff?.(voice.channel ?? 0, voice.midi);
      return;
    }
    const time = Tone.now();
    try { voice.synth?.triggerRelease(time + Math.max(0.01, release)); } catch (_) {}
    window.setTimeout(() => this.disposeVoice(voice), (release + 0.45) * 1000);
  },

  disposeVoice(voice) {
    if (!voice || voice.disposed || voice.spessa) return;
    voice.disposed = true;
    try { voice.synth?.dispose(); } catch (_) {}
    try { voice.filter?.dispose(); } catch (_) {}
    try { voice.formant?.dispose(); } catch (_) {}
    try { voice.vibrato?.dispose(); } catch (_) {}
    try { voice.gain?.dispose(); } catch (_) {}
    try { voice.pan?.dispose(); } catch (_) {}
  },

  bendVoice(voice, ratio, seconds = 0.12) {
    if (!voice?.tone) return;
    if (voice.spessa) {
      const semitones = 12 * Math.log2(ratio);
      spessaSynth?.pitchWheel?.(voice.channel ?? 0, Math.max(0, Math.min(16383, Math.round(8192 + (semitones / 2) * 8192))));
      return;
    }
    const cents = 1200 * Math.log2(ratio);
    if (voice.sampled) {
      if (sampledPianoPitch) sampledPianoPitch.pitch = cents / 100;
      voice.bendRatio = ratio;
      return;
    }
    voice.synth.detune?.linearRampToValueAtTime(cents, Tone.now() + seconds);
    voice.bendRatio = ratio;
  },

  setGain(voice, value, time = 0.04) {
    if (!voice?.tone || voice.spessa) return;
    voice.gain.gain.rampTo(Math.max(0.001, value), time);
  },

  setFilter(voice, value, time = 0.05) {
    if (!voice?.tone || voice.spessa) return;
    voice.filter.frequency.rampTo(Math.max(80, value), time);
  },

  panic() {
    try { sampledPianoPitch && (sampledPianoPitch.pitch = 0); } catch (_) {}
    for (let channel = 0; channel < 16; channel += 1) {
      try { spessaSynth?.pitchWheel?.(channel, 8192); } catch (_) {}
    }
    if (spessaSynth) {
      for (let channel = 0; channel < 16; channel += 1) {
        for (let note = 0; note < 128; note += 1) {
          try { spessaSynth.noteOff(channel, note); } catch (_) {}
        }
      }
    }
    spessaTimers.forEach(timer => window.clearTimeout(timer));
    spessaTimers.clear();
    spessaPrograms.clear();
    try { sampledPiano?.releaseAll?.(); } catch (_) {}
  },
};

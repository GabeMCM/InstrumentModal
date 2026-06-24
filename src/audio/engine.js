import { store } from '../state/state.js';
import { MUSIC_TOKENS, GLOBAL_TOKENS } from '../tokens/master.tokens.js';
import { ENGINE_TOKENS } from './engine.tokens.js';
import { WEB_AUDIO_TOKENS, JAVASCRIPT_TOKENS } from '../tokens/api.tokens.js';
import { toneSpessaEngine } from './tone-spessa.js';

let audioCtx = null;
let masterGain = null;
let reverbNode = null;
let reverbGain = null;
let bodyFilter = null;
let stringBuffers = new Map();
let effectTimers = new Map();
const MAX_ACTIVE_VOICES = 36;
const MAX_CHORD_NOTES = 8;
const MIN_MIDI = 24;
const MAX_MIDI = 96;

// Active voices tracking
let voices = [];

function createBodyFilter() {
  const filter = audioCtx.createBiquadFilter();
  filter.type = WEB_AUDIO_TOKENS.FILTER_LOWSHELF;
  filter.frequency.value = 180;
  filter.gain.value = 4;
  
  const mid = audioCtx.createBiquadFilter();
  mid.type = WEB_AUDIO_TOKENS.FILTER_PEAKING;
  mid.frequency.value = 600;
  mid.Q.value = 1.2;
  mid.gain.value = -3;
  filter.connect(mid);
  
  const high = audioCtx.createBiquadFilter();
  high.type = WEB_AUDIO_TOKENS.FILTER_HIGHSHELF;
  high.frequency.value = 3200;
  high.gain.value = 2;
  mid.connect(high);
  
  return { input: filter, output: high };
}

function generateImpulseResponse(duration = 2.5, decay = 2.0) {
  const sampleRate = audioCtx.sampleRate;
  const length = sampleRate * duration;
  const impulse = audioCtx.createBuffer(2, length, sampleRate);
  for (let c = 0; c < 2; c++) {
    const channel = impulse.getChannelData(c);
    for (let i = 0; i < length; i++) {
      channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function createPluckBuffer(frequency, preset) {
  const sampleRate = audioCtx.sampleRate;
  const length = Math.floor(sampleRate * 2.0);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  
  const period = Math.max(2, Math.floor(sampleRate / frequency));
  const noise = new Float32Array(period);
  const pickPosition = preset.engine === GLOBAL_TOKENS.ENGINE_GUITAR
    ? (preset.id === "guitarNylon" ? 0.34 : 0.22)
    : 0.28;
  for (let i = 0; i < noise.length; i++) {
    const burst = Math.random() * 2 - 1;
    const pickComb = 1 - Math.cos((i / noise.length) * Math.PI * 2 * (1 / pickPosition));
    const softened = preset.id === "guitarNylon" ? Math.sin((i / noise.length) * Math.PI) : 1;
    noise[i] = burst * pickComb * softened * (preset.pickNoise || 0.5);
  }
  
  const damping = preset.damping || 0.99;
  const brightnessLoss = preset.id === "guitarNylon" ? 0.72 : 0.55;
  let previous = 0;
  let bridge = 0;
  for (let i = 0; i < length; i++) {
    if (i < noise.length) {
      data[i] = noise[i];
    } else {
      const current = data[i - noise.length];
      bridge = bridge * brightnessLoss + current * (1 - brightnessLoss);
      const next = data[i] = ((current + previous) * 0.46 + bridge * 0.08) * damping;
      previous = next;
    }
  }
  return buffer;
}

export const audioEngine = {
  init() {
    if (audioCtx) {
      if (audioCtx.state === WEB_AUDIO_TOKENS.STATE_SUSPENDED) audioCtx.resume().catch(() => {});
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
    
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.62;
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.22;
    masterGain.connect(compressor).connect(audioCtx.destination);
    
    bodyFilter = createBodyFilter();
    bodyFilter.output.connect(masterGain);
    
    reverbNode = audioCtx.createConvolver();
    reverbNode.buffer = generateImpulseResponse();
    
    reverbGain = audioCtx.createGain();
    reverbGain.gain.value = 0.25;
    
    reverbNode.connect(reverbGain);
    reverbGain.connect(masterGain);
    toneSpessaEngine.init(audioCtx).catch(() => {});
  },

  get ctx() {
    return audioCtx;
  },

  get master() {
    return masterGain;
  },

  stopAll(release = 0.06) {
    if (!audioCtx) return;
    [...voices].forEach(voice => this.stopVoice(voice, release));
    toneSpessaEngine.panic?.();
    effectTimers.forEach(timer => window.clearInterval(timer));
    effectTimers.clear();
  },

  midiToFrequency(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  },

  previewRhythmGesture(direction = ENGINE_TOKENS.STRUM_DOWN, velocity = 0.8, muted = false, options = {}) {
    this.init();
    const root = store.state.tonic === null
      ? 60
      : (store.state.octave + 1) * 12 + store.state.tonic;
    let notes = store.state.degrees.size
      ? [root, ...[...store.state.degrees].slice(0, 4).map(index => root + MUSIC_TOKENS.DEGREES[index][1])]
      : [root, root + 4, root + 7];
    notes = [...new Set(notes)].sort((a, b) => direction === ENGINE_TOKENS.STRUM_DOWN ? a - b : b - a);
    const now = options.scheduledAt ?? audioCtx.currentTime + 0.012;
    if (options.bassThenChord) {
      this.pluckString(root - 12, 0, 1, now, velocity * 0.95, false);
      notes.forEach((midi, index) => {
        this.pluckString(midi, index, notes.length, now + 0.12 + index * 0.008, velocity * 0.74, muted);
      });
      return;
    }
    const spacing = options.chord ? 0 : options.spacing ?? 0.012;
    notes.forEach((midi, index) => {
      this.pluckString(midi, index, notes.length, now + index * spacing, velocity * (index === 0 ? 1 : 0.9), muted);
    });
    if (options.staccato) window.setTimeout(() => this.dampRecentVoices(0.35, 0.12), 120);
  },

  dampVoices(release = 0.14) {
    if (!audioCtx || !voices.length) return;
    const now = audioCtx.currentTime;
    const musicalRelease = Math.max(0.04, release);
    [...voices].forEach(voice => {
      const { gain, source } = voice;
      if (voice.stopping) return;
      voice.stopping = true;
      if (voice.tone) {
        toneSpessaEngine.stopVoice(voice, musicalRelease);
        window.setTimeout(() => {
          voices = voices.filter(item => item !== voice);
        }, (musicalRelease + 0.1) * 1000);
        return;
      }
      if (typeof gain.gain.cancelAndHoldAtTime === JAVASCRIPT_TOKENS.TYPE_FUNCTION) {
        gain.gain.cancelAndHoldAtTime(now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + musicalRelease);
      } else {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0.001, now, musicalRelease / 4);
      }
      if (source && source.stop && !source.isOsc) {
        try { source.stop(now + musicalRelease + 0.05); } catch (_) {}
      }
      if (source && source.isOsc) {
        source.oscillators.forEach(o => {
          const osc = o.osc || o;
          try { osc.stop(now + musicalRelease + 0.2); } catch(e){}
        });
      }
      window.setTimeout(() => {
        voices = voices.filter(item => item !== voice);
      }, (musicalRelease + 0.1) * 1000);
    });
  },

  dampRecentVoices(ageLimit = 0.72, release = 0.9) {
    if (!audioCtx || !voices.length) return;
    const now = audioCtx.currentTime;
    voices.forEach(({ gain, startedAt = now }) => {
      if (now - startedAt > ageLimit) return;
      if (gain?.gain?.rampTo) {
        gain.gain.rampTo(0.001, release);
        return;
      }
      if (typeof gain.gain.cancelAndHoldAtTime === JAVASCRIPT_TOKENS.TYPE_FUNCTION) {
        gain.gain.cancelAndHoldAtTime(now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + release);
      } else {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0.001, now, release / 4);
      }
    });
  },

  stopVoice(voice, release = 0.08) {
    if (!audioCtx || !voice || voice.stopping) return;
    voice.stopping = true;
    const now = audioCtx.currentTime;
    if (voice.tone) {
      toneSpessaEngine.stopVoice(voice, release);
      voices = voices.filter(item => item !== voice);
      return;
    }
    voice.gain?.gain.cancelScheduledValues(now);
    voice.gain?.gain.setTargetAtTime(0.001, now, Math.max(0.01, release / 4));
    if (voice.source?.isOsc) {
      voice.source.oscillators.forEach(item => {
        try { (item.osc || item).stop(now + release + 0.06); } catch (_) {}
      });
    } else {
      try { voice.source?.stop?.(now + release + 0.06); } catch (_) {}
    }
    voices = voices.filter(item => item !== voice);
  },

  applyBend(active) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const target = active ? Math.pow(2, 2 / 12) : 1;
    voices.forEach(voice => {
      if (voice.tone) {
        toneSpessaEngine.bendVoice(voice, target, active ? 0.17 : 0.13);
        return;
      }
      if (!voice.source?.playbackRate) return;
      const from = voice.bendRatio || 1;
      voice.source.playbackRate.cancelScheduledValues(now);
      voice.source.playbackRate.setValueAtTime(from, now);
      voice.source.playbackRate.exponentialRampToValueAtTime(target, now + (active ? 0.17 : 0.13));
      voice.bendRatio = target;
    });
  },

  setVoiceGain(voice, value, time = 0.04) {
    if (!audioCtx || !voice.gain) return;
    if (voice.tone) return toneSpessaEngine.setGain(voice, value, time);
    const now = audioCtx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(Math.max(0.001, value), now, time);
  },

  setVoiceFilter(voice, value, time = 0.05) {
    if (!audioCtx || !voice.filter) return;
    if (voice.tone) return toneSpessaEngine.setFilter(voice, value, time);
    const now = audioCtx.currentTime;
    voice.filter.frequency.cancelScheduledValues(now);
    voice.filter.frequency.setTargetAtTime(Math.max(120, value), now, time);
  },

  setPitchRatio(ratio, active) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const target = active ? ratio : 1;
    voices.forEach(voice => {
      if (voice.tone) {
        toneSpessaEngine.bendVoice(voice, target, 0.12);
        return;
      }
      if (!voice.source?.playbackRate) return;
      const from = voice.bendRatio || 1;
      voice.source.playbackRate.cancelScheduledValues(now);
      voice.source.playbackRate.setValueAtTime(from, now);
      voice.source.playbackRate.exponentialRampToValueAtTime(target, now + 0.12);
      voice.bendRatio = target;
    });
  },

  clearEffectTimer(effect) {
    const timer = effectTimers.get(effect);
    if (timer) window.clearInterval(timer);
    effectTimers.delete(effect);
  },

  applyPerformanceEffect(effect, active) {
    if (effect === GLOBAL_TOKENS.ACTION_EFFECT) return this.applyBend(active);
    if (!audioCtx) return;
    this.clearEffectTimer(effect);

    if (effect === "effectBendDown") return this.setPitchRatio(Math.pow(2, -2 / 12), active);
    if (effect === "effectOctaveUp") return this.setPitchRatio(2, active);
    if (effect === "effectOctaveDown") return this.setPitchRatio(0.5, active);
    if (effect === "effectFifth") return this.setPitchRatio(Math.pow(2, 7 / 12), active);

    const preset = MUSIC_TOKENS.SOUND_SETS[store.state.soundSet] || MUSIC_TOKENS.SOUND_SETS.piano;
    if (!active) {
      voices.forEach(voice => {
        this.setVoiceGain(voice, voice.baseLevel || 0.08);
        this.setVoiceFilter(voice, preset.brightness || 4200);
        if (voice.pan) voice.pan.pan.setTargetAtTime(voice.basePan || 0, audioCtx.currentTime, 0.08);
      });
      return;
    }

    if (effect === "effectMute") voices.forEach(voice => this.setVoiceFilter(voice, 520));
    if (effect === "effectSoft") voices.forEach(voice => this.setVoiceGain(voice, (voice.baseLevel || 0.08) * 0.45));
    if (effect === "effectBright") voices.forEach(voice => this.setVoiceFilter(voice, (preset.brightness || 4200) * 1.8));
    if (effect === "effectDark") voices.forEach(voice => this.setVoiceFilter(voice, 900));
    if (effect === "effectSwell") voices.forEach(voice => this.setVoiceGain(voice, (voice.baseLevel || 0.08) * 1.8, 0.5));
    if (effect === "effectWiden") voices.forEach((voice, index) => voice.pan?.pan.setTargetAtTime(index % 2 ? 0.75 : -0.75, audioCtx.currentTime, 0.08));
    if (effect === "effectFreeze") voices.forEach(voice => this.setVoiceGain(voice, (voice.baseLevel || 0.08) * 0.9, 0.25));

    if (effect === "effectTremolo" || effect === "effectStutter") {
      let on = false;
      const low = effect === "effectStutter" ? 0.001 : 0.35;
      effectTimers.set(effect, window.setInterval(() => {
        on = !on;
        voices.forEach(voice => this.setVoiceGain(voice, (voice.baseLevel || 0.08) * (on ? 1 : low), 0.015));
      }, effect === "effectStutter" ? 95 : 140));
    }

    if (effect === "effectVibrato") {
      let phase = 0;
      effectTimers.set(effect, window.setInterval(() => {
        phase += 1;
        this.setPitchRatio(1 + Math.sin(phase) * 0.015, true);
      }, 55));
    }
  },

  pluckString(midi, index, total, scheduledAt, velocity = 1, muted = false) {
    if (!audioCtx) return null;
    const preset = MUSIC_TOKENS.SOUND_SETS[store.state.soundSet] || MUSIC_TOKENS.SOUND_SETS.piano;
    const startAt = scheduledAt ?? audioCtx.currentTime;
    const frequency = this.midiToFrequency(midi);
    const gmPreset = preset.id?.startsWith("gm");

    if (preset.engine !== GLOBAL_TOKENS.ENGINE_GUITAR && toneSpessaEngine.available) {
      const polyphonyScale = 1 / Math.sqrt(Math.max(1, total));
      const familyLevel = preset.engine === GLOBAL_TOKENS.ENGINE_PIANO ? 0.86
        : preset.engine === GLOBAL_TOKENS.ENGINE_WIND ? 0.72
          : preset.engine === GLOBAL_TOKENS.ENGINE_ORGAN ? 0.66
            : 0.7;
      const level = Math.min(0.88, Math.max(0.04, velocity * polyphonyScale * familyLevel));
      const toneVoice = toneSpessaEngine.play(midi, index, total, startAt, level, muted, preset, audioCtx.currentTime);
      if (toneVoice) {
        voices.push(toneVoice);
        while (voices.length > MAX_ACTIVE_VOICES) this.stopVoice(voices[0], 0.04);
        return toneVoice;
      }
    }

    if (gmPreset) return null;
    
    let source;
    let mainOutput;
    
    if (preset.engine === GLOBAL_TOKENS.ENGINE_GUITAR) {
      if (!stringBuffers.has(midi)) {
        stringBuffers.set(midi, createPluckBuffer(frequency, preset));
      }
      source = audioCtx.createBufferSource();
      source.buffer = stringBuffers.get(midi);
      source.playbackRate.value = 1;
      mainOutput = source;
      source.start(startAt);
    } else if (
      preset.engine === GLOBAL_TOKENS.ENGINE_SYNTH
      || preset.engine === GLOBAL_TOKENS.ENGINE_ORGAN
      || preset.engine === GLOBAL_TOKENS.ENGINE_WIND
    ) {
      const isOrgan = preset.engine === GLOBAL_TOKENS.ENGINE_ORGAN;
      const isWind = preset.engine === GLOBAL_TOKENS.ENGINE_WIND;
      const windType = preset.windType || "flute";
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const sub = audioCtx.createOscillator();
      
      osc1.type = isOrgan ? WEB_AUDIO_TOKENS.OSC_SINE : isWind && windType === "flute" ? WEB_AUDIO_TOKENS.OSC_SINE : WEB_AUDIO_TOKENS.OSC_SAWTOOTH;
      osc2.type = isOrgan ? WEB_AUDIO_TOKENS.OSC_TRIANGLE : isWind && windType === "sax" ? WEB_AUDIO_TOKENS.OSC_SQUARE : WEB_AUDIO_TOKENS.OSC_SINE;
      sub.type = WEB_AUDIO_TOKENS.OSC_SINE;
      
      osc1.frequency.value = frequency;
      osc2.frequency.value = frequency * (isOrgan ? 2 : isWind ? 2.002 : 1.002);
      sub.frequency.value = frequency * (isWind ? 1.005 : 0.5);
      
      const merger = audioCtx.createGain();
      merger.gain.value = isOrgan ? 0.3 : isWind ? (windType === "trumpet" ? 0.16 : 0.2) : 0.4;
      osc1.connect(merger);
      osc2.connect(merger);
      sub.connect(merger);
      
      source = {
        isOsc: true,
        oscillators: [osc1, osc2, sub],
        playbackRate: {
          cancelScheduledValues: (t) => [osc1, osc2, sub].forEach(o => o.frequency.cancelScheduledValues(t)),
          setValueAtTime: (v, t) => [osc1, osc2, sub].forEach((o, i) => o.frequency.setValueAtTime(
            frequency * v * (i === 1 && isOrgan ? 2 : i === 1 && isWind ? 2.002 : i === 1 ? 1.002 : i === 2 && isWind ? 1.005 : i === 2 ? 0.5 : 1),
            t
          )),
          exponentialRampToValueAtTime: (v, t) => [osc1, osc2, sub].forEach((o, i) => o.frequency.exponentialRampToValueAtTime(
            frequency * v * (i === 1 && isOrgan ? 2 : i === 1 && isWind ? 2.002 : i === 1 ? 1.002 : i === 2 && isWind ? 1.005 : i === 2 ? 0.5 : 1),
            t
          ))
        }
      };
      osc1.start(startAt);
      osc2.start(startAt);
      sub.start(startAt);
      mainOutput = merger;
    } else {
      // PIANO fallback
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const osc3 = audioCtx.createOscillator();
      
      osc1.type = WEB_AUDIO_TOKENS.OSC_TRIANGLE;
      osc2.type = WEB_AUDIO_TOKENS.OSC_SINE;
      osc3.type = WEB_AUDIO_TOKENS.OSC_SINE;
      
      osc1.frequency.value = frequency;
      osc2.frequency.value = frequency * 1.001;
      osc3.frequency.value = frequency * 0.998;
      
      const merger = audioCtx.createGain();
      merger.gain.value = 0.33;
      osc1.connect(merger);
      osc2.connect(merger);
      osc3.connect(merger);
      
      source = {
        isOsc: true,
        oscillators: [osc1, osc2, osc3],
        playbackRate: {
          cancelScheduledValues: (t) => [osc1, osc2, osc3].forEach(o => o.frequency.cancelScheduledValues(t)),
          setValueAtTime: (v, t) => [osc1, osc2, osc3].forEach((o, i) => o.frequency.setValueAtTime(frequency * v * (i===1 ? 1.001 : i===2 ? 0.998 : 1), t)),
          exponentialRampToValueAtTime: (v, t) => [osc1, osc2, osc3].forEach((o, i) => o.frequency.exponentialRampToValueAtTime(frequency * v * (i===1 ? 1.001 : i===2 ? 0.998 : 1), t))
        }
      };
      osc1.start(startAt);
      osc2.start(startAt);
      osc3.start(startAt);
      mainOutput = merger;
    }
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = WEB_AUDIO_TOKENS.FILTER_LOWPASS;
    filter.frequency.value = muted ? preset.brightness * 0.3 : preset.brightness;
    filter.Q.value = preset.engine === GLOBAL_TOKENS.ENGINE_WIND ? (preset.resonance || 2.2) : 0.7;
    if (preset.engine === GLOBAL_TOKENS.ENGINE_SYNTH) {
      filter.frequency.setValueAtTime(preset.brightness * 2, startAt);
      filter.frequency.exponentialRampToValueAtTime(preset.brightness * 0.2, startAt + 1.5);
    }
    
    const gain = audioCtx.createGain();
    const polyphonyScale = 1 / Math.sqrt(Math.max(1, total));
    const engineLevel = preset.engine === GLOBAL_TOKENS.ENGINE_PIANO
      ? (preset.hammer || 0.16)
      : preset.engine === GLOBAL_TOKENS.ENGINE_WIND ? 0.18 : 0.28;
    const level = Math.min(0.22, velocity * engineLevel * polyphonyScale);
    
    if (muted) {
      gain.gain.setValueAtTime(level, startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.15);
    } else {
      gain.gain.setValueAtTime(0.001, startAt);
      gain.gain.linearRampToValueAtTime(level, startAt + (preset.engine === GLOBAL_TOKENS.ENGINE_WIND ? 0.09 : 0.015));
      
      if (preset.duration === Infinity) {
        gain.gain.setTargetAtTime(level * 0.8, startAt + 0.1, 0.5);
        gain.gain.setTargetAtTime(0.001, startAt + 10, 1.8);
      } else {
        gain.gain.exponentialRampToValueAtTime(
          Math.max(0.001, level * (preset.engine === GLOBAL_TOKENS.ENGINE_WIND ? 0.86 : 0.58)),
          startAt + 0.34
        );
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, level * 0.2), startAt + 3.2);
        gain.gain.exponentialRampToValueAtTime(0.001, startAt + preset.duration);
      }
    }
    
    const pan = audioCtx.createStereoPanner();
    pan.pan.value = total > 1
      ? (index / (total - 1) - 0.5) * 0.72 + (Math.random() - 0.5) * 0.06
      : 0;
      
    if (preset.engine === GLOBAL_TOKENS.ENGINE_GUITAR) {
      const air = audioCtx.createBiquadFilter();
      air.type = WEB_AUDIO_TOKENS.FILTER_HIGHSHELF;
      air.frequency.value = preset.id === "guitarNylon" ? 2600 : 4200;
      air.gain.value = preset.id === "guitarNylon" ? -1.5 : 2.2;

      const bodyLow = audioCtx.createBiquadFilter();
      bodyLow.type = WEB_AUDIO_TOKENS.FILTER_PEAKING;
      bodyLow.frequency.value = 115;
      bodyLow.Q.value = 1.1;
      bodyLow.gain.value = 3.2;

      const bodyMid = audioCtx.createBiquadFilter();
      bodyMid.type = WEB_AUDIO_TOKENS.FILTER_PEAKING;
      bodyMid.frequency.value = preset.id === "guitarNylon" ? 360 : 520;
      bodyMid.Q.value = 1.6;
      bodyMid.gain.value = preset.id === "guitarNylon" ? 2.8 : 1.7;

      const nasalCut = audioCtx.createBiquadFilter();
      nasalCut.type = WEB_AUDIO_TOKENS.FILTER_PEAKING;
      nasalCut.frequency.value = 950;
      nasalCut.Q.value = 1.2;
      nasalCut.gain.value = -2.4;

      mainOutput.connect(filter).connect(air).connect(bodyLow).connect(bodyMid).connect(nasalCut).connect(gain).connect(pan);
    } else {
      mainOutput.connect(filter).connect(gain).connect(pan);
    }
    pan.connect(bodyFilter.input);
    pan.connect(reverbNode);
    
    const voice = { source, gain, filter, pan, midi, startedAt: startAt, bendRatio: 1, baseLevel: level, basePan: pan.pan.value };
    voices.push(voice);
    while (voices.length > MAX_ACTIVE_VOICES) this.stopVoice(voices[0], 0.04);
    
    if (mainOutput.onended !== undefined && !source.isOsc) {
      mainOutput.onended = () => {
        voices = voices.filter(item => item !== voice);
      };
    } else {
      // Cleanup osc manually
      const lifetime = preset.duration !== Infinity ? preset.duration + 0.5 : 12;
      window.setTimeout(() => this.stopVoice(voice, 0.12), lifetime * 1000);
    }
    
    return voice;
  },

  strum(direction, velocity = 1, muted = false, scheduledAt = null) {
    this.init();
    const { tonic, octave, degrees, smartMode, smartPosition, fieldMinor, fieldLetter, fieldAccidental } = store.state;
    
    let resolvedTonic = tonic;
    if (smartMode && smartPosition !== null) {
      // Resolve pitch logic
      const mode = fieldMinor ? MUSIC_TOKENS.MODE_MINOR : MUSIC_TOKENS.MODE_MAJOR;
      const rootPitch = (MUSIC_TOKENS.NATURAL_PITCHES[fieldLetter] + fieldAccidental + 12) % 12;
      const interval = MUSIC_TOKENS.SCALE_PATTERNS[mode][smartPosition];
      resolvedTonic = (rootPitch + interval) % 12;
    }
    
    if (resolvedTonic === null) return;
    
    let notes = [resolvedTonic];
    if (degrees.size) {
      notes = [...degrees].map(d => (resolvedTonic + MUSIC_TOKENS.DEGREES[d][1]) % 12);
      notes.unshift(resolvedTonic);
    }
    
    // Convert to MIDI
    const rootMidi = (octave + 1) * 12 + resolvedTonic;
    notes = notes.map((pitch, i) => {
      let m = (octave + 1) * 12 + pitch;
      if (m < rootMidi) m += 12;
      if (i > 0 && pitch === resolvedTonic) m += 12;
      return Math.max(MIN_MIDI, Math.min(MAX_MIDI, m));
    }).slice(0, MAX_CHORD_NOTES);
    
    notes = notes.sort((a, b) => direction === ENGINE_TOKENS.STRUM_DOWN ? a - b : b - a);
    const now = scheduledAt ?? audioCtx.currentTime + 0.012;
    const spacing = direction === ENGINE_TOKENS.STRUM_DOWN ? 0.014 : 0.01;
    
    notes.forEach((midi, index) => {
      const timingDrift = (Math.random() - 0.5) * 0.006;
      this.pluckString(midi, index, notes.length, now + index * spacing + timingDrift, velocity, muted);
    });
  }
};

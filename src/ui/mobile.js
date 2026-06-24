import { store } from '../state/state.js';
import { GLOBAL_TOKENS, MUSIC_TOKENS } from '../tokens/master.tokens.js';
import { STATE_ACTION_TOKENS } from '../state/state.tokens.js';
import { renderer } from './renderer.js';
import { events } from './events.js';
import { audioEngine } from '../audio/engine.js';
import { rhythmEngine } from '../audio/rhythm.js';

const root = document.querySelector('#mobileInstrument');
const wheel = document.querySelector('#mobileWheel');
const wheelZone = document.querySelector('#mobileWheelZone');
const centerNote = document.querySelector('#mobileCenterNote');
const centerShape = document.querySelector('#mobileCenterShape');
const centerOverline = document.querySelector('#mobileCenterOverline');
const modeLabel = document.querySelector('#mobileModeLabel');
const harmonyLabel = document.querySelector('#mobileHarmonyLabel');
const strip = document.querySelector('#mobileContextStrip');
const tabs = document.querySelector('#mobileContextTabs');
const soundSelect = document.querySelector('#mobileSoundSet');
const addStageButton = document.querySelector('#mobileAddStage');

let panel = 'degrees';
let touchStartX = null;
let wheelGesture = null;
let activePerformanceTouch = null;
let performanceReleasedAt = 0;

function currentPerformanceIndex() {
  const active = store.state.activePerformanceSlot;
  if (active !== null && store.state.performanceMemories[active]) return active;
  return store.state.performanceMemories.findIndex(Boolean);
}

function wheelItems() {
  if (store.state.workspace === GLOBAL_TOKENS.WORKSPACE_RHYTHM) return [];
  if (store.state.workspace === GLOBAL_TOKENS.WORKSPACE_PERFORMANCE) {
    const saved = store.state.performanceMemories
      .map((item, index) => item ? ({
        label: item.noteName,
        detail: item.memoryName || renderer.memoryName(item.degrees),
        index,
        active: store.state.activePerformanceSlot === index,
      }) : null).filter(Boolean);
    if (saved.length <= 8) return saved;
    const activePosition = Math.max(0, saved.findIndex(item => item.active));
    return Array.from({ length: 8 }, (_, offset) =>
      saved[(activePosition - 3 + offset + saved.length) % saved.length]
    );
  }
  if (store.state.smartMode) {
    return renderer.smartScale().map((item, index) => ({
      label: item.name,
      detail: MUSIC_TOKENS.SCALE_DEGREES[index],
      action: `smartTonic${index}`,
      active: store.state.smartPosition === index,
    }));
  }
  return MUSIC_TOKENS.TONICS.map(([label], index) => ({
    label,
    detail: String(index + 1).padStart(2, '0'),
    action: `tonic${index}`,
    active: store.state.tonic === index,
  }));
}

function renderWheel() {
  const items = wheelItems();
  wheel.innerHTML = items.map((item, position) => {
    const angle = (360 / Math.max(items.length, 1)) * position - 90;
    const action = item.action ? `data-action="${item.action}"` : `data-mobile-performance="${item.index}"`;
    return `
      <button class="mobile-wheel-note ${item.active ? 'active' : ''}" ${action}
        style="--angle:${angle}deg" type="button">
        <span>${item.label}</span><small>${item.detail}</small>
      </button>
    `;
  }).join('');
}

function renderStrip() {
  const performance = store.state.workspace === GLOBAL_TOKENS.WORKSPACE_PERFORMANCE;
  const rhythm = store.state.workspace === GLOBAL_TOKENS.WORKSPACE_RHYTHM;
  tabs.querySelector('[data-mobile-panel="degrees"]').hidden = performance;
  tabs.querySelector('[data-mobile-panel="memories"]').hidden = performance || rhythm;
  tabs.querySelector('[data-mobile-panel="notes"]').hidden = !performance;
  tabs.querySelector('[data-mobile-panel="bases"]').hidden = !performance;
  tabs.querySelector('[data-mobile-panel="rhythms"]').hidden = !rhythm;
  if (performance && panel !== 'notes' && panel !== 'bases') panel = 'notes';
  if (rhythm) panel = 'rhythms';

  tabs.querySelectorAll('button').forEach(button => {
    button.classList.toggle('active', button.dataset.mobilePanel === panel);
  });

  if (panel === 'degrees') {
    strip.innerHTML = MUSIC_TOKENS.DEGREES.slice(0, 12).map(([name], index) => {
      const flatIndex = 12 + index * 2;
      const sharpIndex = flatIndex + 1;
      return `
        <div class="mobile-degree-family">
          <button class="mobile-chip degree-natural ${store.state.degrees.has(index) ? 'active' : ''}"
            data-action="degree${index}" type="button">${name}</button>
          <button class="mobile-chip degree-altered ${store.state.degrees.has(flatIndex) ? 'active' : ''}"
            data-action="degree${flatIndex}" type="button">${MUSIC_TOKENS.DEGREES[flatIndex][0]}</button>
          <button class="mobile-chip degree-altered ${store.state.degrees.has(sharpIndex) ? 'active' : ''}"
            data-action="degree${sharpIndex}" type="button">${MUSIC_TOKENS.DEGREES[sharpIndex][0]}</button>
        </div>
      `;
    }).join('');
  } else if (panel === 'memories') {
    strip.innerHTML = store.state.memories.map((memory, index) => memory ? `
      <button class="mobile-chip memory ${store.state.currentMemoryIndex === index ? 'active' : ''}"
        data-mobile-memory="${index}" type="button">
        <small>M${String(index + 1).padStart(2, '0')}</small>${memory.name}
      </button>
    ` : '').join('') || '<span class="mobile-empty">NENHUMA MEMÓRIA SALVA</span>';
  } else if (panel === 'notes') {
    strip.innerHTML = store.state.performanceMemories.map((item, index) => item ? `
      <div class="mobile-saved-note ${store.state.activePerformanceSlot === index ? 'active' : ''}">
        <button data-mobile-performance="${index}" type="button">
          <small>P${String(index + 1).padStart(2, '0')}</small>
          <strong>${item.displayName}</strong>
        </button>
        <button class="mobile-note-delete" data-mobile-delete="${index}" type="button" aria-label="Excluir ${item.displayName}">×</button>
      </div>
    ` : '').join('') || '<span class="mobile-empty">NENHUMA NOTA NO CA</span>';
  } else if (panel === 'rhythms') {
    const presets = Object.entries(globalThis.RHYTHM_PRESETS || {}).filter(([, preset]) => !preset.manual);
    strip.innerHTML = presets.map(([id, preset]) => `
      <button class="mobile-chip memory ${store.state.rhythmPreset === id ? 'active' : ''}"
        data-mobile-rhythm="${id}" type="button">
        <small>${preset.bpm} BPM</small>${preset.name}
      </button>
    `).join('');
  } else {
    strip.innerHTML = store.state.baseMemories.map((item, index) => item ? `
      <button class="mobile-chip base ${store.state.activeBaseSlot === index ? 'active' : ''}"
        data-mobile-base="${index}" type="button">
        <small>B${String(index + 1).padStart(2, '0')}</small>${item.displayName}
      </button>
    ` : '').join('') || '<span class="mobile-empty">NENHUMA BASE SALVA</span>';
  }
}

function render() {
  if (!root) return;
  const performance = store.state.workspace === GLOBAL_TOKENS.WORKSPACE_PERFORMANCE;
  const rhythm = store.state.workspace === GLOBAL_TOKENS.WORKSPACE_RHYTHM;
  root.dataset.mode = rhythm ? 'rhythm' : performance ? 'performance' : 'composer';
  modeLabel.textContent = rhythm ? 'LABORATÓRIO DE RITMO' : performance ? 'CAMPO DE APRESENTAÇÃO' : 'CENTRO DE COMPOSIÇÃO';
  centerOverline.textContent = rhythm ? 'RITMO ATUAL' : performance ? 'ACORDE ATUAL' : 'TÔNICA';
  if (rhythm) {
    const preset = rhythmEngine.currentPreset();
    centerNote.textContent = preset.name;
    centerShape.textContent = store.state.rhythmPlaying ? 'TOCANDO · TOQUE PARA PARAR' : `${preset.bpm} BPM · TOQUE PARA INICIAR`;
  } else {
  centerNote.textContent = renderer.currentNoteName();
  centerShape.textContent = store.state.degrees.size
    ? renderer.memoryName([...store.state.degrees])
    : 'TÔNICA PURA';
  }
  harmonyLabel.textContent = performance
    ? `${store.state.performanceMemories.filter(Boolean).length} NOTAS PRONTAS`
    : `OITAVA ${store.state.octave} · ${store.state.degrees.size} GRAUS`;
  soundSelect.value = store.state.soundSet;
  addStageButton.hidden = performance || rhythm;
  root.querySelectorAll('[data-workspace]').forEach(button => {
    button.classList.toggle('active', button.dataset.workspace === store.state.workspace);
  });
  const mobilePedal = root.querySelector('[data-action="rhythmDown"]');
  mobilePedal?.classList.toggle('active', store.state.pedalActive);
  mobilePedal?.setAttribute('aria-pressed', String(store.state.pedalActive));
  const pedalLabel = mobilePedal?.querySelector('strong');
  if (pedalLabel) pedalLabel.textContent = store.state.pedalActive ? 'PEDAL ON' : 'PEDAL OFF';
  renderWheel();
  renderStrip();
}

function stepWheel(direction) {
  if (store.state.workspace === GLOBAL_TOKENS.WORKSPACE_PERFORMANCE) {
    const saved = store.state.performanceMemories.map((item, index) => item ? index : null).filter(index => index !== null);
    if (!saved.length) return;
    const current = saved.indexOf(currentPerformanceIndex());
    const next = saved[(Math.max(0, current) + direction + saved.length) % saved.length];
    events.featureHandlers?.recallPerformanceMemory(next);
    render();
    return;
  }
  const count = store.state.smartMode ? 7 : 12;
  const current = store.state.smartMode ? (store.state.smartPosition ?? 0) : (store.state.tonic ?? 0);
  const next = (current + direction + count) % count;
  events.activate(store.state.smartMode ? `smartTonic${next}` : `tonic${next}`);
  events.deactivate(store.state.smartMode ? `smartTonic${next}` : `tonic${next}`);
  render();
}

function wheelNoteFromPoint(clientX, clientY) {
  const buttons = [...wheel.querySelectorAll('.mobile-wheel-note')];
  let closest = null;
  let closestDistance = Infinity;
  buttons.forEach(button => {
    const rect = button.getBoundingClientRect();
    const distance = Math.hypot(clientX - (rect.left + rect.width / 2), clientY - (rect.top + rect.height / 2));
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = button;
    }
  });
  return closestDistance < 55 ? closest : null;
}

function switchToWheelButton(button) {
  if (!button || wheelGesture?.lastButton === button) return;
  wheelGesture.lastButton = button;
  const performanceIndex = button.dataset.mobilePerformance;
  const action = button.dataset.action;
  if (performanceIndex !== undefined) {
    events.featureHandlers?.recallPerformanceMemory(Number(performanceIndex));
    activePerformanceTouch = Number(performanceIndex);
  } else if (action) {
    const previous = [...store.state.activeActions].find(active =>
      active.startsWith('tonic') || active.startsWith('smartTonic')
    );
    events.activate(action);
    if (previous && previous !== action) store.state.activeActions.delete(previous);
    store.state.activeActions.delete(action);
  }
  render();
}

function handleWheelMove(event) {
  if (!wheelGesture || wheelGesture.pointerId !== event.pointerId) return;
  const rect = wheelZone.getBoundingClientRect();
  const distanceFromCenter = Math.hypot(
    event.clientX - (rect.left + rect.width / 2),
    event.clientY - (rect.top + rect.height / 2)
  );
  const centerRadius = Math.min(rect.width, rect.height) * 0.19;
  if (distanceFromCenter <= centerRadius) {
    wheelGesture.armed = true;
    const trackedAction = store.state.pointerActions.get(event.pointerId);
    if (trackedAction) {
      store.state.pointerActions.delete(event.pointerId);
      store.state.activeActions.delete(trackedAction);
    }
    centerShape.textContent = 'ESCOLHA A PRÓXIMA NOTA';
    root.classList.add('wheel-armed');
    return;
  }
  if (wheelGesture.armed) {
    const target = wheelNoteFromPoint(event.clientX, event.clientY);
    if (target) {
      wheelGesture.armed = false;
      root.classList.remove('wheel-armed');
      switchToWheelButton(target);
    }
  }
}

function init() {
  if (!root) return;
  soundSelect.innerHTML = renderer.soundSetOptionsHTML();
  soundSelect.addEventListener('change', () => {
    document.querySelector('#soundSet').value = soundSelect.value;
    document.querySelector('#soundSet').dispatchEvent(new Event('change'));
  });
  tabs.addEventListener('click', event => {
    const button = event.target.closest('[data-mobile-panel]');
    if (!button) return;
    panel = button.dataset.mobilePanel;
    renderStrip();
  });
  addStageButton.addEventListener('click', () => {
    if (store.state.tonic === null) return;
    events.featureHandlers?.captureInNextPerformanceSlot();
    addStageButton.classList.add('saved');
    window.setTimeout(() => addStageButton.classList.remove('saved'), 480);
  });
  root.addEventListener('click', event => {
    const performanceButton = event.target.closest('[data-mobile-performance]');
    const memoryButton = event.target.closest('[data-mobile-memory]');
    const baseButton = event.target.closest('[data-mobile-base]');
    const rhythmButton = event.target.closest('[data-mobile-rhythm]');
    const deleteButton = event.target.closest('[data-mobile-delete]');
    if (deleteButton) {
      const index = Number(deleteButton.dataset.mobileDelete);
      store.dispatch(STATE_ACTION_TOKENS.SAVE_PERFORMANCE_MEMORY, { index, memory: null });
      if (store.state.activePerformanceSlot === index) {
        store.dispatch(STATE_ACTION_TOKENS.SET_ACTIVE_PERFORMANCE_SLOT, null);
      }
      render();
      return;
    }
    if (performanceButton && Date.now() - performanceReleasedAt > 240) {
      events.featureHandlers?.recallPerformanceMemory(Number(performanceButton.dataset.mobilePerformance));
      window.setTimeout(() => audioEngine.dampVoices(store.state.pedalActive ? 1.8 : 0.48), 180);
    }
    if (memoryButton) events.recallMemory(Number(memoryButton.dataset.mobileMemory), true);
    if (baseButton) events.featureHandlers?.toggleBaseMemory(Number(baseButton.dataset.mobileBase));
    if (rhythmButton) {
      const id = rhythmButton.dataset.mobileRhythm;
      rhythmEngine.stopRhythm();
      store.dispatch(STATE_ACTION_TOKENS.SET_RHYTHM_PRESET, id);
      store.dispatch(STATE_ACTION_TOKENS.SET_TEMPO, globalThis.RHYTHM_PRESETS[id].bpm);
      rhythmEngine.startRhythm();
    }
    window.setTimeout(render, 0);
  });
  wheelZone.addEventListener('pointerdown', event => {
    touchStartX = event.clientX;
    wheelGesture = {
      pointerId: event.pointerId,
      armed: false,
      lastButton: event.target.closest('.mobile-wheel-note'),
    };
    wheelZone.setPointerCapture?.(event.pointerId);
  });
  wheelZone.addEventListener('pointermove', handleWheelMove);
  wheelZone.addEventListener('pointerup', event => {
    if (touchStartX === null) return;
    const distance = event.clientX - touchStartX;
    touchStartX = null;
    if (!wheelGesture?.lastButton && Math.abs(distance) > 42) stepWheel(distance < 0 ? 1 : -1);
    wheelGesture = null;
    root.classList.remove('wheel-armed');
    if (store.state.workspace === GLOBAL_TOKENS.WORKSPACE_PERFORMANCE && activePerformanceTouch !== null) {
      audioRelease();
    }
  });
  wheelZone.addEventListener('pointercancel', () => {
    touchStartX = null;
    wheelGesture = null;
    root.classList.remove('wheel-armed');
    audioRelease();
  });
  strip.addEventListener('pointerdown', event => {
    const performanceButton = event.target.closest('[data-mobile-performance]');
    if (!performanceButton || event.target.closest('[data-mobile-delete]')) return;
    activePerformanceTouch = Number(performanceButton.dataset.mobilePerformance);
    events.featureHandlers?.recallPerformanceMemory(activePerformanceTouch);
  });
  strip.addEventListener('pointerup', audioRelease);
  strip.addEventListener('pointercancel', audioRelease);
  document.querySelector('#mobileWheelCenter')?.addEventListener('click', () => {
    if (store.state.workspace === GLOBAL_TOKENS.WORKSPACE_RHYTHM) rhythmEngine.toggleRhythm();
    render();
  });
  store.subscribe(render);
  window.addEventListener('resize', render);
  render();
}

function audioRelease() {
  if (activePerformanceTouch === null) return;
  activePerformanceTouch = null;
  performanceReleasedAt = Date.now();
  audioEngine.dampVoices(store.state.pedalActive ? 1.8 : 0.48);
}

document.addEventListener('DOMContentLoaded', init);

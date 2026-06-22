import { store } from '../state/state.js';
import { GLOBAL_TOKENS, MUSIC_TOKENS } from '../tokens/master.tokens.js';
import { STATE_ACTION_TOKENS } from '../state/state.tokens.js';
import { renderer } from './renderer.js';
import { events } from './events.js';

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

let panel = 'degrees';
let touchStartX = null;

function currentPerformanceIndex() {
  const active = store.state.activePerformanceSlot;
  if (active !== null && store.state.performanceMemories[active]) return active;
  return store.state.performanceMemories.findIndex(Boolean);
}

function wheelItems() {
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
  tabs.querySelector('[data-mobile-panel="degrees"]').hidden = performance;
  tabs.querySelector('[data-mobile-panel="memories"]').hidden = performance;
  tabs.querySelector('[data-mobile-panel="bases"]').hidden = !performance;
  if (performance) panel = 'bases';

  tabs.querySelectorAll('button').forEach(button => {
    button.classList.toggle('active', button.dataset.mobilePanel === panel);
  });

  if (panel === 'degrees') {
    strip.innerHTML = MUSIC_TOKENS.DEGREES.map(([name], index) => `
      <button class="mobile-chip ${store.state.degrees.has(index) ? 'active' : ''}"
        data-action="degree${index}" type="button">${name}</button>
    `).join('');
  } else if (panel === 'memories') {
    strip.innerHTML = store.state.memories.map((memory, index) => memory ? `
      <button class="mobile-chip memory ${store.state.currentMemoryIndex === index ? 'active' : ''}"
        data-mobile-memory="${index}" type="button">
        <small>M${String(index + 1).padStart(2, '0')}</small>${memory.name}
      </button>
    ` : '').join('') || '<span class="mobile-empty">NENHUMA MEMÓRIA SALVA</span>';
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
  root.dataset.mode = performance ? 'performance' : 'composer';
  modeLabel.textContent = performance ? 'CAMPO DE APRESENTAÇÃO' : 'CENTRO DE COMPOSIÇÃO';
  centerOverline.textContent = performance ? 'ACORDE ATUAL' : 'TÔNICA';
  centerNote.textContent = renderer.currentNoteName();
  centerShape.textContent = store.state.degrees.size
    ? renderer.memoryName([...store.state.degrees])
    : 'TÔNICA PURA';
  harmonyLabel.textContent = performance
    ? `${store.state.performanceMemories.filter(Boolean).length} NOTAS PRONTAS`
    : `OITAVA ${store.state.octave} · ${store.state.degrees.size} GRAUS`;
  soundSelect.value = store.state.soundSet;
  root.querySelectorAll('[data-workspace]').forEach(button => {
    button.classList.toggle('active', button.dataset.workspace === store.state.workspace);
  });
  root.querySelector('[data-action="rhythmDown"]')?.classList.toggle('active', store.state.pedalActive);
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

function init() {
  if (!root) return;
  soundSelect.innerHTML = Object.values(MUSIC_TOKENS.SOUND_SETS)
    .map(set => `<option value="${set.id}">${set.label}</option>`).join('');
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
  root.addEventListener('click', event => {
    const performanceButton = event.target.closest('[data-mobile-performance]');
    const memoryButton = event.target.closest('[data-mobile-memory]');
    const baseButton = event.target.closest('[data-mobile-base]');
    if (performanceButton) events.featureHandlers?.recallPerformanceMemory(Number(performanceButton.dataset.mobilePerformance));
    if (memoryButton) events.recallMemory(Number(memoryButton.dataset.mobileMemory), true);
    if (baseButton) events.featureHandlers?.toggleBaseMemory(Number(baseButton.dataset.mobileBase));
    window.setTimeout(render, 0);
  });
  wheelZone.addEventListener('pointerdown', event => {
    touchStartX = event.clientX;
  });
  wheelZone.addEventListener('pointerup', event => {
    if (touchStartX === null) return;
    const distance = event.clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(distance) > 42) stepWheel(distance < 0 ? 1 : -1);
  });
  store.subscribe(render);
  window.addEventListener('resize', render);
  render();
}

document.addEventListener('DOMContentLoaded', init);

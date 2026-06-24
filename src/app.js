import { store } from './state/state.js';
import { STATE_ACTION_TOKENS } from './state/state.tokens.js';
import { renderer } from './ui/renderer.js';
import { events } from './ui/events.js';
import { features } from './ui/features.js';
import { elements } from './ui/elements.js';
import { initRhythmEditor } from './rhythm/editor.js';
import { GLOBAL_TOKENS, MUSIC_TOKENS } from './tokens/master.tokens.js';
import { DOM_EVENTS_TOKENS, DOM_ATTRIBUTES_TOKENS } from './tokens/api.tokens.js';
import { UI_SELECTORS } from './ui/elements.tokens.js';

function bootstrap() {
  // Inicialização de UI
  renderer.applyTheme(store.state.theme);
  renderer.renderSoundSetOptions();
  renderer.renderPerformanceEffects();
  renderer.renderKeys();
  if (store.state.smartMode) {
    store.state.smartPosition = 0;
    const firstScaleNote = renderer.smartScale()[0];
    store.state.tonic = firstScaleNote.pitch;
    const initialMode = store.state.fieldMinor ? MUSIC_TOKENS.MODE_MINOR : MUSIC_TOKENS.MODE_MAJOR;
    const initialMemory = store.state.smartLinks[initialMode][0];
    if (initialMemory !== null && store.state.memories[initialMemory]) {
      store.state.degrees = new Set(store.state.memories[initialMemory].degrees);
    }
    renderer.renderKeys();
  }
  
  features.updateRhythmControls();
  renderer.renderPerformanceMemories();
  renderer.renderBaseMemories();
  
  if (!store.state.sets.some(set => set.id === store.state.activeSetId)) {
    store.state.activeSetId = null;
  }
  renderer.renderSets();

  // Iniciar listeners de eventos e features
  events.featureHandlers = features;
  events.init();
  features.bindFeatureControls();
  initRhythmEditor();

  // Escutar eventos de state centralizado (Pub/Sub) para UI Updates pesados
  store.subscribe(STATE_ACTION_TOKENS.SET_WORKSPACE, (workspace) => {
    const performance = workspace === GLOBAL_TOKENS.WORKSPACE_PERFORMANCE;
    const rhythm = workspace === GLOBAL_TOKENS.WORKSPACE_RHYTHM;
    elements.composerWorkspace.hidden = performance || rhythm;
    elements.performanceWorkspace.hidden = !performance;
    elements.rhythmWorkspace.hidden = !rhythm;
    document.querySelectorAll(UI_SELECTORS.workspaceButtons).forEach(button => {
      button.classList.toggle(DOM_ATTRIBUTES_TOKENS.CLASS_ACTIVE, button.dataset.workspace === workspace);
    });
    if (performance) {
      renderer.renderPerformanceMemories();
      renderer.renderBaseMemories();
      renderer.updateStageCurrent();
    }
    [...store.state.activeActions].forEach(action => events.deactivate(action));
  });

  // Atualiza Workspace inicial
  store.dispatch(STATE_ACTION_TOKENS.SET_WORKSPACE, store.state.workspace);
}

document.addEventListener(DOM_EVENTS_TOKENS.DOM_CONTENT_LOADED, bootstrap);

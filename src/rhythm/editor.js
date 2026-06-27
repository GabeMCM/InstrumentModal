import { store } from '../state/state.js';
import { storage } from '../state/storage.js';
import { STORAGE_KEYS } from '../state/storage.tokens.js';
import { STATE_ACTION_TOKENS } from '../state/state.tokens.js';
import { rhythmEngine } from '../audio/rhythm.js';
import { RHYTHM_TOKENS } from '../audio/rhythm.tokens.js';
import { audioEngine } from '../audio/engine.js';
import { MUSIC_TOKENS } from '../tokens/master.tokens.js';

let customRhythms = {};
const registry = () => globalThis.RHYTHM_PRESETS;

export function initRhythmEditor() {
  const container = document.querySelector('#pianoRollContainer');
  const keysContainer = document.querySelector('#pianoRollKeys');
  const tracksContainer = document.querySelector('#pianoRollTracks');
  const playhead = document.querySelector('#pianoRollPlayhead');
  const gridContainer = document.querySelector('#pianoRollGrid');
  
  if (!container || !keysContainer || !tracksContainer) return;

  const bpmInput = document.querySelector('#rhythmBpmInput');
  const snapSelect = document.querySelector('#rhythmGridSnap');
    const eventPosition = document.querySelector('#rhythmEventPosition');
    const eventDuration = document.querySelector('#rhythmEventDuration');
    const eventEffect = document.querySelector('#rhythmEventEffect');

  let activeNotes = [];
  let blocks = [];
  let selectedBlockId = null;
  let previewTimer = null;
  let previewPlaying = false;
  let previewStartTime = 0;
  
  const PX_PER_SECOND = 300; // Zoom visual (300px = 1 segundo)

  // Initialization
  customRhythms = storage.getJSON(STORAGE_KEYS.CUSTOM_RHYTHMS, {}) || {};
  Object.assign(registry(), customRhythms);

  function getBPM() {
    return Math.max(30, Math.min(300, Number(bpmInput?.value) || 100));
  }

  function getBarDurationMs() {
    // Assumindo 4 tempos (4/4) por compasso
    return (60 / getBPM()) * 4 * 1000;
  }

  // Gera as teclas/linhas dinamicamente com base nas notas selecionadas
  function renderKeys() {
    keysContainer.innerHTML = '';
    tracksContainer.innerHTML = '';
    
    // Ler faixas do state
    activeNotes = store.state.rhythmTracks.map(track => ({ id: track.id, name: track.displayName }));

    activeNotes.forEach((track) => {
      // Cria rótulo da linha (eixo Y)
      const keyEl = document.createElement('div');
      keyEl.className = 'piano-roll-key';
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = track.name;
      keyEl.appendChild(nameSpan);

      const delTrackBtn = document.createElement('button');
      delTrackBtn.innerHTML = '×';
      delTrackBtn.className = 'track-delete-btn';
      delTrackBtn.style.cssText = 'background: transparent; border: none; color: var(--red); cursor: pointer; font-size: 14px; margin-left: auto; padding: 0 4px;';
      delTrackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        store.dispatch(STATE_ACTION_TOKENS.REMOVE_RHYTHM_TRACK, track.id);
        // Remove blocos associados
        blocks = blocks.filter(b => b.trackId !== track.id);
        if (selectedBlockId && !blocks.find(b => b.id === selectedBlockId)) selectBlock(null);
        renderKeys();
      });
      keyEl.appendChild(delTrackBtn);

      keysContainer.appendChild(keyEl);

      // Cria trilha para os blocos
      const trackEl = document.createElement('div');
      trackEl.className = 'piano-roll-track';
      trackEl.dataset.trackId = track.id;
      
      // Clique na trilha para adicionar bloco
      trackEl.addEventListener('click', (e) => {
        if (e.target !== trackEl) return; // ignora cliques nos blocos
        const rect = trackEl.getBoundingClientRect();
        const x = e.clientX - rect.left + container.scrollLeft;
        addBlock(track.id, x);
      });

      tracksContainer.appendChild(trackEl);
    });
    
    renderBlocks();
  }

  // Escuta as mudanças de notas e refaz as linhas
  store.subscribe(state => {
    const currentTracksStr = state.rhythmTracks.map(t => t.id).join(',');
    if (renderKeys.lastTracksStr !== currentTracksStr) {
      renderKeys.lastTracksStr = currentTracksStr;
      renderKeys();
    }
  });

  function getSnapMs() {
    const val = snapSelect.value;
    if (val === 'free') return 1; 
    const beatValue = Number(val); // 0.25 = 1/4 (1 beat)
    const msPerBeat = (60 / getBPM()) * 1000;
    return msPerBeat * (beatValue / 0.25);
  }

  function xToMs(x) {
    return (x / PX_PER_SECOND) * 1000;
  }

  function msToX(ms) {
    return (ms / 1000) * PX_PER_SECOND;
  }

  function magneticSnapMs(ms) {
    const snap = getSnapMs();
    if (snap <= 1) return ms; // free mode
    
    const snappedMs = Math.round(ms / snap) * snap;
    const distancePx = Math.abs(msToX(ms) - msToX(snappedMs));
    
    // Magnetic pull distance: 15px
    if (distancePx < 15) {
      return snappedMs;
    }
    return ms;
  }

  function addBlock(trackId, x) {
    const ms = magneticSnapMs(xToMs(x));
    const block = {
      id: 'block_' + Date.now(),
      trackId,
      startTimeMs: ms,
      durationMs: getSnapMs() > 1 ? getSnapMs() : 250,
      velocity: 80
    };
    blocks.push(block);
    selectBlock(block.id);
    renderBlocks();
    
    rhythmEngine.playTrack(trackId, null, block.velocity / 100);
  }

  function updateInspector(block) {
    if (block) {
      const track = store.state.rhythmTracks.find(t => t.id === block.trackId);
      const noteName = track ? track.displayName : 'Trilha';
      eventPosition.textContent = `${noteName} @ ${Math.round(block.startTimeMs)}ms`;
      if (eventDuration) eventDuration.value = Math.round(block.durationMs);
      if (eventEffect) eventEffect.value = block.effect || 'none';
    } else {
      eventPosition.textContent = '—';
      if (eventDuration) eventDuration.value = '';
      if (eventEffect) eventEffect.value = 'none';
    }
  }

  function selectBlock(id, skipRender = false) {
    selectedBlockId = id;
    const block = blocks.find(b => b.id === id);
    updateInspector(block);
    if (!skipRender) {
      renderBlocks();
    } else {
      document.querySelectorAll('.piano-roll-block').forEach(n => n.classList.remove('selected'));
      const activeEl = document.querySelector(`.piano-roll-block[data-block-id="${id}"]`);
      if (activeEl) activeEl.classList.add('selected');
    }
  }

  if (eventDuration) {
    eventDuration.addEventListener('input', () => {
      const block = blocks.find(b => b.id === selectedBlockId);
      if (block) {
        block.durationMs = Math.max(10, Number(eventDuration.value) || 100);
        renderBlocks();
      }
    });
  }

  if (eventEffect) {
    eventEffect.addEventListener('change', () => {
      const block = blocks.find(b => b.id === selectedBlockId);
      if (block) {
        block.effect = eventEffect.value;
      }
    });
  }

  let isDragging = false;
  let isResizing = false;
  let startX = 0;
  let initialStartMs = 0;
  let initialDurationMs = 0;
  let draggedBlock = null;

  window.addEventListener('mousemove', (e) => {
    if (isDragging && draggedBlock) {
      const dx = e.clientX - startX;
      const msDelta = xToMs(dx);
      draggedBlock.block.startTimeMs = Math.max(0, magneticSnapMs(initialStartMs + msDelta));
      draggedBlock.el.style.left = msToX(draggedBlock.block.startTimeMs) + 'px';
      if (draggedBlock.block.id === selectedBlockId) {
        const track = store.state.rhythmTracks.find(t => t.id === draggedBlock.block.trackId);
        eventPosition.textContent = `${track ? track.displayName : 'Trilha'} @ ${Math.round(draggedBlock.block.startTimeMs)}ms`;
      }
    } else if (isResizing && draggedBlock) {
      const dx = e.clientX - startX;
      const msDelta = xToMs(dx);
      const currentEndMs = initialStartMs + initialDurationMs + msDelta;
      const snappedEndMs = magneticSnapMs(currentEndMs);
      
      draggedBlock.block.durationMs = Math.max(10, snappedEndMs - draggedBlock.block.startTimeMs);
      draggedBlock.el.style.width = Math.max(4, msToX(draggedBlock.block.durationMs)) + 'px';
      if (draggedBlock.block.id === selectedBlockId && eventDuration) {
        eventDuration.value = Math.round(draggedBlock.block.durationMs);
      }
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDragging || isResizing) {
      isDragging = false;
      isResizing = false;
      draggedBlock = null;
      renderBlocks(); 
    }
  });

  function renderBlocks() {
    document.querySelectorAll('.piano-roll-block').forEach(el => el.remove());

    blocks.forEach(block => {
      const trackIndex = activeNotes.findIndex(n => n.id === block.trackId);
      if (trackIndex === -1) return; 

      const trackEl = tracksContainer.children[trackIndex];
      if (!trackEl) return;

      const el = document.createElement('div');
      el.className = 'piano-roll-block' + (block.id === selectedBlockId ? ' selected' : '');
      el.dataset.blockId = block.id;
      el.style.left = msToX(block.startTimeMs) + 'px';
      el.style.width = Math.max(4, msToX(block.durationMs)) + 'px';
      
      // Resize Handle
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'piano-roll-block-resize-handle';
      el.appendChild(resizeHandle);
      
      resizeHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        selectBlock(block.id, true);
        isResizing = true;
        startX = e.clientX;
        initialDurationMs = block.durationMs;
        initialStartMs = block.startTimeMs;
        draggedBlock = { block, el };
      });

      el.addEventListener('mousedown', (e) => {
        if (isResizing) return;
        e.stopPropagation();
        selectBlock(block.id, true);
        isDragging = true;
        startX = e.clientX;
        initialStartMs = block.startTimeMs;
        draggedBlock = { block, el };
      });

      trackEl.appendChild(el);
    });
  }


  document.querySelector('#clearRhythmEvent').addEventListener('click', () => {
    if (!selectedBlockId) return;
    blocks = blocks.filter(b => b.id !== selectedBlockId);
    selectedBlockId = null;
    selectBlock(null);
    renderBlocks();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId && store.state.workspace === GLOBAL_TOKENS.WORKSPACE_RHYTHM) {
      document.querySelector('#clearRhythmEvent').click();
    }
  });

  function stopPreview() {
    previewPlaying = false;
    cancelAnimationFrame(previewTimer);
    document.querySelector('#previewRhythmButton').classList.remove('active');
    document.querySelector('#previewRhythmButton span').textContent = '▶';
    playhead.style.left = '0px';
  }

  function startPreview() {
    if (previewPlaying) {
      stopPreview();
      return;
    }
    audioEngine.init();
    previewPlaying = true;
    previewStartTime = audioEngine.ctx.currentTime;
    
    document.querySelector('#previewRhythmButton').classList.add('active');
    document.querySelector('#previewRhythmButton span').textContent = '■';

    const barMs = getBarDurationMs();
    let maxEndMs = 0;
    blocks.forEach(b => {
      const end = b.startTimeMs + b.durationMs;
      if (end > maxEndMs) maxEndMs = end;
    });
    
    // Calcula múltiplos do compasso que consigam englobar o último bloco
    let loopDurationMs = barMs;
    if (maxEndMs > barMs) {
      loopDurationMs = Math.ceil(maxEndMs / barMs) * barMs;
    }
    
    let playedBlocks = new Set();
    let currentLoopStart = previewStartTime;

    function animate() {
      if (!previewPlaying) return;
      const now = audioEngine.ctx.currentTime;
      let elapsed = now - currentLoopStart;

      const loopMode = document.querySelector('#rhythmLoopMode').value === 'true';

      if (elapsed * 1000 >= loopDurationMs) {
        if (!loopMode) {
          stopPreview();
          return;
        }
        currentLoopStart += loopDurationMs / 1000;
        elapsed = now - currentLoopStart;
        playedBlocks.clear();
      }

      const elapsedMs = elapsed * 1000;
      playhead.style.left = msToX(elapsedMs) + 'px';
      
      blocks.forEach(block => {
        if (!playedBlocks.has(block.id) && block.startTimeMs <= elapsedMs) {
          playedBlocks.add(block.id);
          rhythmEngine.playTrack(block.trackId, now, block.velocity / 100, block.durationMs);
          
          // Piscar o bloco visualmente
          const blockEls = document.querySelectorAll('.piano-roll-block');
          blockEls.forEach(el => {
            if (el.style.left === msToX(block.startTimeMs) + 'px') {
              el.classList.add('playing');
              setTimeout(() => el.classList.remove('playing'), 100);
            }
          });
        }
      });

      previewTimer = requestAnimationFrame(animate);
    }
    
    animate();
  }

  document.querySelector('#previewRhythmButton').addEventListener('click', startPreview);

  document.querySelector('#rhythmForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.querySelector('#rhythmNameInput').value;
    const id = `${RHYTHM_TOKENS.PREFIX_CUSTOM}${Date.now()}`;
    const preset = {
      name: name || RHYTHM_TOKENS.NAME_CUSTOM,
      type: 'rhythm',
      bpm: getBPM(),
      blocks: [...blocks]
    };
    customRhythms[id] = preset;
    registry()[id] = preset;
    storage.setJSON(STORAGE_KEYS.CUSTOM_RHYTHMS, customRhythms);
    store.dispatch(STATE_ACTION_TOKENS.SET_RHYTHM_PRESET, id);
    
    // Atualizar UI de sucesso (opcional, pode ser um pequeno aviso ao invés de alert)
    const btn = document.querySelector('#rhythmForm button[type="submit"]');
    const oldText = btn.textContent;
    btn.textContent = 'SALVO COM SUCESSO!';
    setTimeout(() => btn.textContent = oldText, 2000);
  });

  renderKeys();
}

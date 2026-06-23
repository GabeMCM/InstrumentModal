import { elements } from './elements.js';
import { store } from '../state/state.js';
import { GLOBAL_TOKENS, MUSIC_TOKENS, PERFORMANCE_EFFECTS } from '../tokens/master.tokens.js';
import { STATE_MESSAGE_TOKENS } from '../state/state.tokens.js';
import { UI_RENDERER_TOKENS } from './renderer.tokens.js';

export const renderer = {
  applyTheme(theme) {
    const light = theme === GLOBAL_TOKENS.THEME_LIGHT;
    document.body.dataset.theme = light ? GLOBAL_TOKENS.THEME_LIGHT : GLOBAL_TOKENS.THEME_DARK;
    elements.themeToggle.checked = light;
    elements.themeLabel.textContent = light ? UI_RENDERER_TOKENS.LABEL_CLARO : UI_RENDERER_TOKENS.LABEL_ESCURO;
  },

  keyLabel(code) {
    if (code?.includes("+")) {
      return code.split("+").map(part => {
        const short = UI_RENDERER_TOKENS.SHORTCUT_PARTS[part];
        return short || this.keyLabel(part);
      }).join("+");
    }
    const labels = UI_RENDERER_TOKENS.SHORTCUT_LABELS;
    if (!code) return GLOBAL_TOKENS.SYMBOL_EMPTY;
    if (labels[code]) return labels[code];
    
    let compact = code;
    UI_RENDERER_TOKENS.COMPACT_PREFIXES.forEach(({ regex, replace }) => {
      compact = compact.replace(regex, replace);
    });
    
    return compact.length > 7 ? `${compact.slice(0, 6)}…` : compact;
  },

  smartScale() {
    const mode = store.state.fieldMinor ? MUSIC_TOKENS.MODE_MINOR : MUSIC_TOKENS.MODE_MAJOR;
    const rootPitch = (MUSIC_TOKENS.NATURAL_PITCHES[store.state.fieldLetter] + store.state.fieldAccidental + 12) % 12;
    const pattern = MUSIC_TOKENS.SCALE_PATTERNS[mode];
    return pattern.map((interval, position) => {
      const letterIndex = (store.state.fieldLetter + position) % 7;
      const targetPitch = (rootPitch + interval) % 12;
      let difference = targetPitch - MUSIC_TOKENS.NATURAL_PITCHES[letterIndex];
      while (difference > 6) difference -= 12;
      while (difference < -6) difference += 12;
      const accidental = difference < 0 ? "♭".repeat(Math.abs(difference)) : "♯".repeat(difference);
      return {
        name: `${MUSIC_TOKENS.NOTE_LETTERS[letterIndex]}${accidental}`,
        pitch: targetPitch,
        position,
      };
    });
  },

  renderKeys() {
    const smartKeyLabel = noteName => {
      const letter = noteName.charAt(0);
      return letter === "B" ? "S/B" : letter;
    };
    if (store.state.smartMode) {
      elements.tonicKeys.classList.add("smart-tonic-grid");
      elements.tonicKeys.innerHTML = this.smartScale().map(({ name }, position) => `
        <div class="tonic-cell">
          <button class="note-key tonic-key" data-action="smartTonic${position}" type="button" aria-label="Posição ${MUSIC_TOKENS.SCALE_DEGREES[position]}, ${name}">
            <span class="note-name">${name}</span>
            <span class="scale-degree">${MUSIC_TOKENS.SCALE_DEGREES[position]} · BOTÃO ${position + 1}</span>
            <span class="keycap">${smartKeyLabel(name)}</span>
          </button>
          <button class="tonic-add" data-add-smart-tonic="${position}" type="button" aria-label="Adicionar ${name} à apresentação">+</button>
        </div>
      `).join("");
    } else {
      elements.tonicKeys.classList.remove("smart-tonic-grid");
      elements.tonicKeys.innerHTML = MUSIC_TOKENS.TONICS.map(([name], index) => `
        <div class="tonic-cell">
          <button class="note-key tonic-key" data-action="tonic${index}" type="button" aria-label="Tônica ${name}">
            <span class="note-name">${name}</span>
            <span class="keycap">${this.keyLabel(store.state.bindings[`tonic${index}`])}</span>
          </button>
          <button class="tonic-add" data-add-tonic="${index}" type="button" aria-label="Adicionar ${name} à apresentação">+</button>
        </div>
      `).join("");
    }

    const smartDegreeLabels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "−", "="];
    elements.degreeKeys.innerHTML = MUSIC_TOKENS.DEGREES.slice(0, 12).map(([name, , quality], index) => {
      const flatIndex = 12 + index * 2;
      const sharpIndex = flatIndex + 1;
      const degreeButton = (degreeIndex, extraClass = "") => {
        const [degreeName, , degreeQuality] = MUSIC_TOKENS.DEGREES[degreeIndex];
        return `
          <button class="note-key degree-key ${extraClass}" data-action="degree${degreeIndex}" type="button" aria-label="Grau ${degreeName}">
            <span class="note-name">${degreeName}</span>
            <span class="interval">${degreeQuality}</span>
            ${store.state.smartMode && degreeIndex === index
              ? `<span class="keycap">${smartDegreeLabels[index]}</span>`
              : store.state.bindings[`degree${degreeIndex}`] ? `<span class="keycap">${this.keyLabel(store.state.bindings[`degree${degreeIndex}`])}</span>` : ""}
          </button>
        `;
      };

      return `
        <div class="degree-family">
          ${degreeButton(index, "degree-natural")}
          <div class="degree-alterations">
            ${degreeButton(flatIndex, "altered flat")}
            ${degreeButton(sharpIndex, "altered sharp")}
          </div>
        </div>
      `;
    }).join("");

    for (const action of ["octaveDown", "octaveUp"]) {
      const btn = document.querySelector(`[data-action="${action}"] .keycap`);
      if (btn) btn.textContent = this.keyLabel(store.state.bindings[action]);
    }
    for (const action of ["rhythmDown", "rhythmUp", "effect"]) {
      const btn = document.querySelector(`[data-action="${action}"] .wide-keycap`);
      if (btn) btn.textContent = this.keyLabel(store.state.bindings[action]);
      document.querySelectorAll(`[data-stage-action="${action}"] .wide-keycap`).forEach(keycap => {
        keycap.textContent = this.keyLabel(store.state.bindings[action]);
      });
    }

    this.renderMemories();
    this.renderTonicLinks();
    this.updateUI();
  },

  renderPerformanceEffects() {
    const card = (effect, stage = false) => `
      <button class="performance-key ${effect.action === "rhythmDown" ? "rhythm-key rhythm-down" : "effect-key"}" ${stage ? "data-stage-action" : "data-action"}="${effect.action}" type="button">
        <span class="performance-label">${effect.label}</span>
        <span class="performance-copy">${effect.copy}</span>
        <span class="wide-keycap">${this.keyLabel(store.state.bindings[effect.action])}</span>
      </button>
    `;
    if (elements.performanceEffectsGrid) {
      elements.performanceEffectsGrid.innerHTML = PERFORMANCE_EFFECTS.map(effect => card(effect)).join("");
    }
    if (elements.stagePerformanceEffectsGrid) {
      elements.stagePerformanceEffectsGrid.innerHTML = PERFORMANCE_EFFECTS.map(effect => card(effect, true)).join("");
    }
  },

  memoryName(degrees) {
    if (!degrees.length) return STATE_MESSAGE_TOKENS.NO_DEGREES;
    return degrees.map(index => MUSIC_TOKENS.DEGREES[index][0]).join(` ${STATE_MESSAGE_TOKENS.SEPARATOR_DOT} `);
  },

  currentNoteName() {
    if (store.state.tonic === null) return GLOBAL_TOKENS.SYMBOL_EMPTY;
    const staged = store.state.activePerformanceSlot !== null
      ? store.state.performanceMemories[store.state.activePerformanceSlot]
      : null;
    if (staged && staged.tonic === store.state.tonic) return staged.noteName;
    if (store.state.smartMode && store.state.smartPosition !== null) return this.smartScale()[store.state.smartPosition].name;
    return MUSIC_TOKENS.TONICS[store.state.tonic][0];
  },

  matchingMemoryIndex(degrees = [...store.state.degrees]) {
    const signature = [...degrees].sort((a, b) => a - b).join(",");
    return store.state.memories.findIndex(memory =>
      memory && [...memory.degrees].sort((a, b) => a - b).join(",") === signature
    );
  },

  updateStageCurrent() {
    elements.stageCurrentNote.textContent = store.state.tonic === null
      ? STATE_MESSAGE_TOKENS.NO_TONIC
      : `${this.currentNoteName()} ${STATE_MESSAGE_TOKENS.SEPARATOR_DOT} ${STATE_MESSAGE_TOKENS.MSG_OCTAVE} ${store.state.octave}`;
    const memoryIndex = store.state.currentMemoryIndex !== null
      ? store.state.currentMemoryIndex
      : this.matchingMemoryIndex();
    elements.stageCurrentShape.textContent = memoryIndex >= 0
      ? `M${memoryIndex + 1} · ${store.state.memories[memoryIndex].name}`
      : store.state.degrees.size
        ? this.memoryName([...store.state.degrees])
        : "TÔNICA PURA";
  },

  renderPerformanceMemories() {
    const lastFilled = store.state.performanceMemories.reduce((last, item, index) => item ? index : last, -1);
    const visibleRows = Math.min(4, Math.max(1, Math.ceil((lastFilled + 2) / 10)));
    const visibleSlots = visibleRows * 10;
    elements.performanceMemoryGrid.dataset.rows = String(visibleRows);
    elements.performanceMemoryGrid.innerHTML = store.state.performanceMemories.slice(0, visibleSlots).map((item, index) => `
      <article class="performance-memory-slot ${item ? "saved" : "empty"} ${store.state.activePerformanceSlot === index ? "active" : ""}" ${item ? `data-stage-recall="${index}"` : ""}>
        <span class="stage-slot-number">P${String(index + 1).padStart(2, "0")}</span>
        ${item ? `<button class="stage-slot-clear" data-stage-clear="${index}" type="button" aria-label="Limpar espaço ${index + 1}">×</button>` : ""}
        ${item
          ? `<strong class="stage-slot-note">${item.displayName || `${item.noteName}${item.memoryName || this.memoryName(item.degrees)}`}</strong>`
          : `<span class="empty-slot-symbol" aria-label="Espaço vazio">${GLOBAL_TOKENS.SYMBOL_EMPTY_SLOT}</span>`
        }
        <span class="stage-slot-detail">${
          item
            ? `${item.noteName} · OITAVA ${item.octave}<br>${item.memoryName ? item.memoryName : this.memoryName(item.degrees)}`
            : ""
        }</span>
        <div class="stage-slot-actions">
          <span>${item ? "TOCAR" : ""}</span>
          <span class="keycap">${this.keyLabel(store.state.bindings[`performance${index}`])}</span>
        </div>
      </article>
    `).join("");
  },

  renderBaseMemories() {
    elements.baseMemoryGrid.innerHTML = store.state.baseMemories.map((item, index) => `
      <article class="base-memory-slot ${item ? "saved" : "empty"} ${store.state.activeBaseSlot === index ? "active" : ""}" ${item ? `data-base-recall="${index}"` : ""}>
        <span class="stage-slot-number">B${String(index + 1).padStart(2, "0")}</span>
        ${item ? `<button class="stage-slot-clear" data-base-clear="${index}" type="button" aria-label="Limpar base ${index + 1}">×</button>` : ""}
        ${item
          ? `<strong class="stage-slot-note">${item.displayName}</strong>`
          : `<span class="empty-slot-symbol" aria-label="Base vazia">${GLOBAL_TOKENS.SYMBOL_EMPTY_SLOT}</span>`
        }
        <span class="stage-slot-detail">${item ? `OITAVA ${item.octave}` : ""}</span>
        <div class="stage-slot-actions">
          <span>${item ? "LIGAR / DESLIGAR" : ""}</span>
          <span class="keycap">${this.keyLabel(store.state.bindings[`base${index}`])}</span>
        </div>
      </article>
    `).join("");
  },

  formatSetDate(timestamp) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(timestamp));
  },

  renderSets() {
    const hasSets = store.state.sets.length > 0;
    elements.setEmpty.hidden = hasSets;
    elements.setList.hidden = !hasSets;
    elements.updateSetButton.disabled = !store.state.activeSetId;
    const activeIndex = store.state.sets.findIndex(set => set.id === store.state.activeSetId);
    elements.previousSetButton.disabled = !hasSets || activeIndex === 0;
    elements.nextSetButton.disabled = !hasSets || activeIndex === store.state.sets.length - 1;
    elements.setPosition.querySelector("strong").textContent = activeIndex >= 0
      ? `${activeIndex + 1} / ${store.state.sets.length}`
      : `— / ${store.state.sets.length || "—"}`;
    elements.setPosition.querySelector("span").textContent = activeIndex >= 0
      ? store.state.sets[activeIndex].name
      : "SEM CONJUNTO";

    elements.setList.innerHTML = store.state.sets.map((set, index) => {
      const stats = { notes: set.notes.filter(Boolean).length, bases: set.bases.filter(Boolean).length };
      return `
        <article class="set-card ${store.state.activeSetId === set.id ? "active" : ""}" data-set-load="${set.id}" draggable="true">
          <span class="set-card-index">CONJUNTO ${String(index + 1).padStart(2, "0")}</span>
          <span class="set-drag-handle" aria-hidden="true">⠿</span>
          <button class="set-card-delete" data-set-delete="${set.id}" type="button" aria-label="Excluir ${set.name}">×</button>
          <h4>${set.name.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</h4>
          <div class="set-card-stats">
            <span><strong>${stats.notes}</strong> NOTAS</span>
            <span><strong>${stats.bases}</strong> BASES</span>
          </div>
          <span class="set-card-date">${store.state.activeSetId === set.id ? "ATIVO · " : ""}${this.formatSetDate(set.updatedAt)}</span>
        </article>
      `;
    }).join("");
  },

  renderMemories() {
    elements.memoryGrid.innerHTML = store.state.memories.map((memory, index) => `
      <div class="memory-slot ${memory ? "saved" : ""}">
        <button class="memory-recall" data-memory-recall="${index}" type="button" ${memory ? "" : "disabled"}>
          <span class="memory-number">M${String(index + 1).padStart(2, "0")}</span>
          <span class="memory-name">${memory ? memory.name : "VAZIA"}</span>
        </button>
        <button class="memory-save ${memory ? "replace" : ""}" data-memory-save="${index}" type="button" aria-label="${memory ? `Substituir memória ${index + 1}` : `Salvar memória ${index + 1}`}">
          ${memory ? `
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 7h-5V2M4 17h5v5M19 12a7 7 0 0 0-12-5L4 10M5 12a7 7 0 0 0 12 5l3-3" />
            </svg>
          ` : "SALVAR"}
        </button>
        ${memory ? `<button class="memory-edit" data-memory-edit="${index}" type="button" aria-label="Renomear memória ${index + 1}">✎</button>` : ""}
        <span class="keycap memory-key">${this.keyLabel(store.state.bindings[`memory${index}`])}</span>
      </div>
    `).join("");
  },

  renderTonicLinks() {
    if (store.state.smartMode) {
      const mode = store.state.fieldMinor ? "minor" : "major";
      const scale = this.smartScale();
      elements.tonicLinkGrid.innerHTML = scale.map(({ name }, position) => {
        const options = store.state.memories.map((memory, memoryIndex) => memory
          ? `<option value="${memoryIndex}" ${store.state.smartLinks[mode][position] === memoryIndex ? "selected" : ""}>M${memoryIndex + 1} · ${memory.name}</option>`
          : ""
        ).join("");
        return `
          <label class="tonic-link-select">
            <span>${MUSIC_TOKENS.SCALE_DEGREES[position]} · ${name}</span>
            <select data-smart-link="${position}" aria-label="Memória da posição ${MUSIC_TOKENS.SCALE_DEGREES[position]}">
              <option value="">LIVRE</option>
              ${options}
            </select>
          </label>
        `;
      }).join("");
    } else {
      elements.tonicLinkGrid.innerHTML = MUSIC_TOKENS.TONICS.map(([tonicName], tonicIndex) => {
        const options = store.state.memories.map((memory, memoryIndex) => memory
          ? `<option value="${memoryIndex}" ${store.state.tonicLinks[tonicIndex] === memoryIndex ? "selected" : ""}>M${memoryIndex + 1} · ${memory.name}</option>`
          : ""
        ).join("");
        return `
          <label class="tonic-link-select">
            <span>${tonicName}</span>
            <select data-tonic-link="${tonicIndex}" aria-label="Memória automática para ${tonicName}">
              <option value="">LIVRE</option>
              ${options}
            </select>
          </label>
        `;
      }).join("");
    }
  },

  updateUI() {
    document.querySelectorAll("[data-action]").forEach(element => {
      const action = element.dataset.action;
      let active = store.state.activeActions.has(action);
      if (action.startsWith("smartTonic")) active = store.state.smartPosition === Number(action.slice(10));
      if (action.startsWith("tonic")) active = store.state.tonic === Number(action.slice(5));
      if (action.startsWith("degree")) active = store.state.degrees.has(Number(action.slice(6)));
      element.classList.toggle("active", active);
    });
    document.querySelectorAll("[data-stage-action]").forEach(element => {
      const action = element.dataset.stageAction;
      element.classList.toggle("active", store.state.activeActions.has(action));
      element.classList.toggle("latched", action === "rhythmDown" && store.state.pedalActive);
      if (action === "rhythmDown") {
        element.setAttribute("aria-pressed", String(store.state.pedalActive));
        const copy = element.querySelector(".performance-copy");
        if (copy) copy.textContent = store.state.pedalActive ? "ATIVO · SOLTE PARA LIBERAR" : "DESATIVADO · ALONGA O FIM";
      }
    });

    elements.octaveValue.textContent = store.state.octave;
    elements.degreeCount.textContent = store.state.degrees.size;
    elements.memoryCount.textContent = store.state.memories.filter(Boolean).length;
    elements.soundSetSelect.value = store.state.soundSet;
    
    const rDownBtn = elements.performanceEffectsGrid?.querySelector('[data-action="rhythmDown"]');
    if (rDownBtn) {
      rDownBtn.classList.toggle("latched", store.state.pedalActive);
      // Wait, space is now just a pedal! We will toggle its visual state using "latched" class or "active"
      rDownBtn.classList.toggle("active", store.state.pedalActive);
      rDownBtn.setAttribute("aria-pressed", String(store.state.pedalActive));
      const copy = rDownBtn.querySelector(".performance-copy");
      if (copy) copy.textContent = store.state.pedalActive ? "ATIVO · SOLTE PARA LIBERAR" : "DESATIVADO · ALONGA O FIM";
    }
    
    elements.smartModeToggle.checked = store.state.smartMode;
    elements.fieldControls.hidden = !store.state.smartMode;
    elements.fieldLetterGrid.querySelectorAll("[data-field-letter]").forEach(button => {
      button.classList.toggle("active", Number(button.dataset.fieldLetter) === store.state.fieldLetter);
    });
    
    const accidental = store.state.fieldAccidental < 0 ? GLOBAL_TOKENS.SYMBOL_FLAT : store.state.fieldAccidental > 0 ? GLOBAL_TOKENS.SYMBOL_SHARP : "";
    elements.fieldName.textContent = `${MUSIC_TOKENS.NOTE_LETTERS[store.state.fieldLetter]}${accidental} ${store.state.fieldMinor ? "MENOR" : "MAIOR"}`;
    
    elements.fieldMinorButton.textContent = store.state.fieldMinor ? "MAIOR" : "MENOR";
    elements.fieldFlatButton.classList.toggle("active", store.state.fieldAccidental === -1);
    elements.fieldSharpButton.classList.toggle("active", store.state.fieldAccidental === 1);
    
    elements.tonicModeDescription.textContent = store.state.smartMode
      ? "SETE POSIÇÕES DO CAMPO HARMÔNICO"
      : "SELECIONE A NOTA PRINCIPAL";
    elements.tonicLinksDescription.textContent = store.state.smartMode
      ? `Memórias por posição no campo ${store.state.fieldMinor ? "menor" : "maior"}.`
      : "Escolha qual memória cada tônica deve carregar.";
      
    this.updateStageCurrent();
  }
};

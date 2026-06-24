import * as Tone from 'tone';

// Criação de um sintetizador polifônico básico para simular o violão.
const synth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "triangle" }, // Timbre levemente mais aveludado parecido com corda
  envelope: { 
    attack: 0.005, // Ataque rápido (dedo batendo na corda)
    decay: 1.5,
    sustain: 0.1,
    release: 1.5 
  }
}).toDestination();

synth.volume.value = -5;

/**
 * Calcula a frequência exata (nome da nota musical) para uma corda e uma casa específicas.
 */
export function getNoteForFret(baseTuning, stringIndex, fret) {
  // A afinação (baseTuning) vem do JSON como ["E2", "A2", "D3", "G3", "B3", "E4"]
  // O array tem índice 0 = E2 (corda 6), índice 5 = E4 (corda 1)
  const openNote = baseTuning[6 - stringIndex]; 
  return Tone.Frequency(openNote).transpose(fret).toNote();
}

/**
 * Para o áudio com limpeza correta das caudas de *release*
 */
export function stopAudio() {
  Tone.Transport.stop();
  Tone.Transport.cancel(0);
  synth.releaseAll(Tone.now()); // Mata as notas infinitas!
}

/**
 * Lê todo o estado da linha do tempo e agenda os eventos do Tracker na engine de áudio.
 */
export function scheduleTimeline(state) {
  // Limpa agendamentos anteriores
  Tone.Transport.cancel(0);

  const { timeline, libraries, settings } = state;
  const tuning = settings.instrument.tuning; 

  timeline.rightHandTrack.forEach(rhBlock => {
    const pattern = libraries.patterns[rhBlock.patternId];
    if (!pattern) return;

    let timeAccumulatorMs = 0;

    // Tracker: cada evento é executado, e então adicionamos seu delayAfter ao acumulador
    pattern.events.forEach(event => {
      const absoluteTimeMs = rhBlock.startTimeMs + timeAccumulatorMs;
      const absoluteTimeSecs = absoluteTimeMs / 1000;

      // Agenda o evento no Tone.js
      Tone.Transport.schedule((time) => {
        // Neste exato milissegundo, descubra qual Shape da Mão Esquerda está ativo
        const currentLhBlock = timeline.leftHandTrack.filter(
          b => absoluteTimeMs >= b.startTimeMs && absoluteTimeMs < b.startTimeMs + b.durationMs
        ).pop();

        if (!currentLhBlock) return; // Mão esquerda não está pressionando nada

        const shape = libraries.shapes[currentLhBlock.shapeId];
        if (!shape) return;

        // Proteção contra cache antigo do Vite: garante que strings seja um array
        const safeStrings = event.strings || [];

        // Se o evento engloba múltiplas cordas (puxada), disparamos todas no mesmo milissegundo
        safeStrings.forEach(stringNum => {
          if (shape.muted.includes(stringNum)) return;

          const pos = shape.positions.find(p => p.string === stringNum);
          const fret = pos ? pos.fret : 0; // Se não tiver dedo na corda, é 0 (solta)
          
          const note = getNoteForFret(tuning, stringNum, fret);
          const velocity = event.intensity || 0.8;

          synth.triggerAttackRelease(note, "2n", time, velocity);
        });

      }, absoluteTimeSecs);

      // Avança o tempo no Tracker para a próxima batida
      timeAccumulatorMs += (event.delayAfter || 0);
    });
  });
}

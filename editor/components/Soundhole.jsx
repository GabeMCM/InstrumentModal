import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function Soundhole({ instrument, activePattern, onInteract }) {
  const strings = Array.from({ length: instrument.strings });
  const [defaultInterval, setDefaultInterval] = useState(250);
  const gridRef = useRef(null);
  const [draggingIdx, setDraggingIdx] = useState(null);

  const handleStringClick = (stringIndex) => {
    onInteract('add_event', null, { string: stringIndex, defaultInterval });
  };

  // Helper para converter array de delayAfter em tempos absolutos
  const getAbsoluteTimes = (events) => {
    let acc = 0;
    return events.map(ev => {
      const current = acc;
      acc += (ev.delayAfter || 0);
      return current;
    });
  };

  const handlePointerDown = (e, idx) => {
    e.stopPropagation(); // Previne adicionar nova nota
    if (idx === 0) return; // Não arrasta a primeira nota (ela é a âncora 0ms)
    setDraggingIdx(idx);
  };

  const handlePointerMove = useCallback((e) => {
    if (draggingIdx === null || draggingIdx === 0 || !gridRef.current) return;
    
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Precisamos do totalMs original para saber a escala do visualizador
    const currentEvents = activePattern.events;
    const totalMs = Math.max(1000, currentEvents.reduce((acc, ev) => acc + (ev.delayAfter || 0), 0) + 200); // 200ms padding
    
    let rawTime = (x / rect.width) * totalMs;
    rawTime = Math.round(rawTime / 10) * 10; // Snap 10ms

    // Clonamos os eventos para recalcular
    const newEvents = JSON.parse(JSON.stringify(currentEvents));
    const absTimes = getAbsoluteTimes(newEvents);
    
    // Restrições de limite: não pode cruzar o evento anterior nem o próximo
    const minTime = absTimes[draggingIdx - 1] + 10;
    const maxTime = draggingIdx < absTimes.length - 1 ? absTimes[draggingIdx + 1] - 10 : totalMs;
    
    const newAbsTime = Math.max(minTime, Math.min(rawTime, maxTime));
    
    // Atualizamos o delayAfter do evento anterior
    newEvents[draggingIdx - 1].delayAfter = newAbsTime - absTimes[draggingIdx - 1];
    
    // Atualizamos o delayAfter deste evento (se não for o último)
    if (draggingIdx < newEvents.length - 1) {
      newEvents[draggingIdx].delayAfter = absTimes[draggingIdx + 1] - newAbsTime;
    }

    onInteract('batch_edit_events', null, { events: newEvents });
  }, [draggingIdx, activePattern, onInteract]);

  const handlePointerUp = useCallback(() => {
    setDraggingIdx(null);
  }, []);

  useEffect(() => {
    if (draggingIdx !== null) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingIdx, handlePointerMove, handlePointerUp]);

  return (
    <div className="flex-1 bg-wood-pattern rounded-lg p-4 flex flex-col border-2 border-wood-dark shadow-wood relative overflow-hidden group">
      <div className="flex justify-between items-center z-10 mb-2">
        <div className="text-gold-light text-sm opacity-80 font-semibold tracking-wider">
          TRACKER DE AÇÃO (HÍBRIDO) {activePattern && `- ${activePattern.name}`}
        </div>
        
        {/* Painel de Intervalo Padrão */}
        <div className="flex items-center gap-2 bg-black/60 px-2 py-1 rounded border border-chrome-dark">
          <span className="text-[10px] text-wood-light uppercase">Intervalo Padrão:</span>
          <input 
            type="number" step="10" min="0" value={defaultInterval} 
            onChange={(e) => setDefaultInterval(Number(e.target.value))}
            className="bg-black text-gold text-xs p-1 w-14 text-center rounded border border-chrome-dark"
          />
          <span className="text-[9px] text-wood-light">ms</span>
        </div>
      </div>
      
      {activePattern ? (
        <div className="flex flex-1 gap-4">
          {/* Lado Esquerdo: Visor de Cordas Híbrido */}
          <div className="flex-1 bg-black/80 rounded border border-chrome-dark flex flex-col relative" ref={gridRef}>
            <div className="absolute inset-0 flex flex-col justify-between py-2 z-10">
              {strings.map((_, i) => {
                const stringIndex = 6 - i; // 6 to 1
                return (
                  <div 
                    key={`tracker-string-${i}`} 
                    className="w-full flex-1 relative flex items-center hover:bg-white/5 cursor-pointer"
                    onClick={() => handleStringClick(stringIndex)}
                    title={`Clique vazio adiciona toque`}
                  >
                    <div className={`w-full bg-chrome-gradient shadow-sm opacity-40 pointer-events-none ${i < 2 ? 'h-[3px]' : 'h-[1px]'}`}></div>
                    <div className="absolute -left-2 text-[10px] text-chrome font-mono opacity-50 pointer-events-none bg-black/80 px-1">
                      {instrument.tuning[5 - i]}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Marcadores Visuais Arrastáveis */}
            <div className="absolute inset-0 z-30 py-2 flex flex-col justify-between pointer-events-none">
              {activePattern.events.map((ev, idx) => {
                const principalString = ev.strings[0];
                const rowIndex = 6 - principalString;
                const topPercent = (rowIndex / 6) * 100 + (100 / 12);
                
                // Mapeamento visual baseado no tempo matemático absoluto!
                const absTimes = getAbsoluteTimes(activePattern.events);
                const totalMs = Math.max(1000, absTimes[absTimes.length - 1] + 200); // 200ms de sobra pra direita
                const leftPercent = (absTimes[idx] / totalMs) * 100;

                return (
                  <div 
                    key={`marker-${idx}`}
                    className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-chrome-light shadow-[0_0_8px_rgba(255,255,255,0.8)] border-2 border-wood flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-auto transition-transform hover:scale-125"
                    style={{ top: `${topPercent}%`, left: `${leftPercent}%` }}
                    onPointerDown={(e) => handlePointerDown(e, idx)}
                    onClick={(e) => { e.stopPropagation(); onInteract('delete_event', idx); }}
                    title={idx > 0 ? `Arraste para alterar a distância do anterior. Clique para apagar.` : 'Primeira nota (Âncora). Clique para apagar.'}
                  >
                    <span className="text-[10px] font-bold text-black">{ev.id}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lado Direito: Painel Lateral de Relações de Tempo (Tracker) */}
          <div className="w-48 bg-black/60 rounded p-2 border border-chrome-dark flex flex-col gap-1 overflow-y-auto custom-scrollbar">
            <span className="text-gold-light text-[10px] font-bold uppercase mb-2 text-center">Matemática</span>
            {activePattern.events.map((ev, idx) => (
              <div key={idx} className="flex flex-col gap-1 items-center bg-[#1a1a1a] p-1 rounded border border-[#333]">
                <div className="flex justify-between w-full items-center px-1">
                  <div className="flex gap-1 items-center">
                    <div className="w-4 h-4 rounded-full bg-chrome-light flex items-center justify-center text-[9px] font-bold text-black">
                      {ev.id}
                    </div>
                    <span className="text-[10px] text-chrome-dark">Corda: {ev.strings.join(',')}</span>
                  </div>
                  <button onClick={() => onInteract('delete_event', idx)} className="text-red-500 hover:text-red-400 font-bold px-1 text-xs">X</button>
                </div>
                
                {idx < activePattern.events.length - 1 && (
                  <div className="flex flex-col items-center my-1">
                    <div className="w-px h-2 bg-chrome-dark"></div>
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" step="10" min="0" value={ev.delayAfter} 
                        onChange={(e) => onInteract('edit_event', idx, {delayAfter: e.target.value})}
                        className="bg-black text-gold text-xs p-1 w-12 text-center rounded border border-chrome-dark"
                      />
                      <span className="text-[9px] text-wood-light">ms</span>
                    </div>
                    <div className="w-px h-2 bg-chrome-dark"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-chrome-dark font-mono text-sm opacity-50">
          Posicione a agulha sobre um bloco da trilha cromada para ativar o Tracker Híbrido.
        </div>
      )}
    </div>
  );
}

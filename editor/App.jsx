import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import Fretboard from './components/Fretboard';
import Soundhole from './components/Soundhole';
import Timeline from './components/Timeline';
import { initialState } from './store';
import * as Tone from 'tone';
import { Play, Square, Pause } from 'lucide-react';
import { scheduleTimeline, stopAudio } from './audio';

export default function App() {
  const [state, setState] = useState(initialState);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const timelineRef = useRef(null);
  const [resizingBlock, setResizingBlock] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Find active shape based on currentTimeMs
  const activeLeftBlock = state.timeline.leftHandTrack.filter(
    b => currentTimeMs >= b.startTimeMs && currentTimeMs < b.startTimeMs + b.durationMs
  ).pop();
  const activeShapeId = activeLeftBlock ? activeLeftBlock.shapeId : null;
  const activeShape = activeShapeId ? state.libraries.shapes[activeShapeId] : null;

  // Find active pattern (Right Hand) based on currentTimeMs
  const activeRightBlock = state.timeline.rightHandTrack.filter(
    b => currentTimeMs >= b.startTimeMs && currentTimeMs < b.startTimeMs + b.durationMs
  ).pop();
  const activePatternId = activeRightBlock ? activeRightBlock.patternId : null;
  const activePattern = activePatternId ? state.libraries.patterns[activePatternId] : null;

  const handleDragEnd = (event) => {
    const { active, delta } = event;
    if (!delta.x) return;

    // Convert pixel delta to timeMs (Scale: 10px = 100ms, so 1px = 10ms)
    const msDelta = Math.round(delta.x * 10);

    setState(prev => {
      // É preciso clonar os arrays internos para o React notar a mudança!
      const newState = { 
        ...prev, 
        timeline: { 
          leftHandTrack: prev.timeline.leftHandTrack.map(b => ({...b})), 
          rightHandTrack: prev.timeline.rightHandTrack.map(b => ({...b})) 
        } 
      };
      
      // Update left track blocks
      const leftIndex = newState.timeline.leftHandTrack.findIndex(b => b.id === active.id);
      if (leftIndex !== -1) {
        newState.timeline.leftHandTrack[leftIndex].startTimeMs = Math.max(0, newState.timeline.leftHandTrack[leftIndex].startTimeMs + msDelta);
      }
      
      // Update right track blocks
      const rightIndex = newState.timeline.rightHandTrack.findIndex(b => b.id === active.id);
      if (rightIndex !== -1) {
        newState.timeline.rightHandTrack[rightIndex].startTimeMs = Math.max(0, newState.timeline.rightHandTrack[rightIndex].startTimeMs + msDelta);
      }
      
      return newState;
    });
  };

  // Sync visual loop with Tone.js
  React.useEffect(() => {
    let animationFrameId;
    const updateTime = () => {
      if (Tone.Transport.state === 'started') {
        setCurrentTimeMs(Tone.Transport.seconds * 1000);
        animationFrameId = requestAnimationFrame(updateTime);
      }
    };
    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateTime);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  // Recalculate audio schedule whenever timeline tracks or shapes/patterns change
  React.useEffect(() => {
    scheduleTimeline(state);
  }, [state.timeline, state.libraries]);

  const togglePlay = async () => {
    await Tone.start();
    if (isPlaying) {
      Tone.Transport.pause();
    } else {
      scheduleTimeline(state); // Reagendamos tudo antes de dar play, pois o Stop apaga a fila
      Tone.Transport.start();
    }
    setIsPlaying(!isPlaying);
  };

  const stopPlay = () => {
    stopAudio();
    setIsPlaying(false);
    setCurrentTimeMs(0);
    // Reset playhead visuals by seeking to 0
    Tone.Transport.seconds = 0;
  };

  // Editor Mão Esquerda (Fretboard Interativo)
  const handleInteractFretboard = (stringIndex, fretNumber, action) => {
    if (!activeShapeId) return; // Só edita se houver um shape sob a agulha
    
    setState(prev => {
      const newLibraries = { ...prev.libraries, shapes: { ...prev.libraries.shapes } };
      // Deep clone do shape
      const newShape = JSON.parse(JSON.stringify(newLibraries.shapes[activeShapeId]));
      
      if (action === 'set_fret') {
        newShape.muted = newShape.muted.filter(s => s !== stringIndex); // Remove mute
        const posIndex = newShape.positions.findIndex(p => p.string === stringIndex);
        if (posIndex !== -1) {
          if (newShape.positions[posIndex].fret === fretNumber) {
            // Se clicou na mesma casa, remove o dedo (deixa solta = fret 0)
            newShape.positions[posIndex].fret = 0;
          } else {
            newShape.positions[posIndex].fret = fretNumber;
          }
        } else {
          newShape.positions.push({ string: stringIndex, fret: fretNumber });
        }
      } else if (action === 'toggle_mute') {
        if (newShape.muted.includes(stringIndex)) {
          // Desmuta e deixa solta
          newShape.muted = newShape.muted.filter(s => s !== stringIndex);
          const posIndex = newShape.positions.findIndex(p => p.string === stringIndex);
          if (posIndex === -1) newShape.positions.push({ string: stringIndex, fret: 0 });
          else newShape.positions[posIndex].fret = 0;
        } else {
          // Muta e remove os dedos
          newShape.muted.push(stringIndex);
          newShape.positions = newShape.positions.filter(p => p.string !== stringIndex);
        }
      }
      
      newLibraries.shapes[activeShapeId] = newShape;
      return { ...prev, libraries: newLibraries };
    });
  };

  // --- Lógica de Resizing de Blocos na Timeline ---
  const handleResizeDown = (e, track, index) => {
    e.stopPropagation();
    setResizingBlock({ track, index });
  };

  const handleResizeMove = useCallback((e) => {
    if (!resizingBlock || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const block = state.timeline[resizingBlock.track][resizingBlock.index];
    
    // Calcula o milissegundo baseado na posição absoluta do mouse no container
    const mouseX = Math.max(0, e.clientX - rect.left);
    const newEndMs = Math.round(((mouseX / rect.width) * 5000) / 100) * 100; // Snap a cada 100ms
    const newDuration = Math.max(250, newEndMs - block.startTimeMs);

    setState(prev => {
      const newTimeline = { ...prev.timeline, [resizingBlock.track]: [...prev.timeline[resizingBlock.track]] };
      newTimeline[resizingBlock.track][resizingBlock.index] = {
        ...newTimeline[resizingBlock.track][resizingBlock.index],
        durationMs: newDuration
      };
      return { ...prev, timeline: newTimeline };
    });
  }, [resizingBlock, state.timeline]);

  const handleResizeUp = useCallback(() => {
    setResizingBlock(null);
  }, []);

  useEffect(() => {
    if (resizingBlock !== null) {
      window.addEventListener('pointermove', handleResizeMove);
      window.addEventListener('pointerup', handleResizeUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleResizeMove);
      window.removeEventListener('pointerup', handleResizeUp);
    };
  }, [resizingBlock, handleResizeMove, handleResizeUp]);

  // --- Helpers de Auto-Cálculo ---
  const getPatternDuration = (patternId) => {
    const pattern = state.libraries.patterns[patternId];
    if (!pattern || !pattern.events) return 2000;
    const total = pattern.events.reduce((acc, ev) => acc + (ev.delayAfter || 0), 0);
    return Math.max(500, total); // mínimo de meio segundo visual
  };

  // Editor Mão Direita (Pattern Editor - Tracker)
  const handleInteractPattern = (action, index, payload) => {
    if (!activePatternId) return;

    setState(prev => {
      const newLibraries = { ...prev.libraries, patterns: { ...prev.libraries.patterns } };
      const newPattern = JSON.parse(JSON.stringify(newLibraries.patterns[activePatternId]));

      if (action === 'add_event') {
        const nextLetter = String.fromCharCode(65 + (newPattern.events.length % 26)); // A, B, C...
        
        // Se houver eventos anteriores, o penúltimo herda o defaultInterval para distanciar deste novo
        if (newPattern.events.length > 0) {
          newPattern.events[newPattern.events.length - 1].delayAfter = payload.defaultInterval || 250;
        }

        newPattern.events.push({
          id: nextLetter,
          strings: [payload.string],
          delayAfter: 0, // Último evento sempre tem 0
          intensity: 0.8
        });
      } else if (action === 'delete_event') {
        newPattern.events.splice(index, 1);
      } else if (action === 'edit_event') {
        newPattern.events[index] = { ...newPattern.events[index], ...payload };
        if (payload.delayAfter !== undefined) newPattern.events[index].delayAfter = Number(payload.delayAfter);
        if (payload.intensity !== undefined) newPattern.events[index].intensity = Number(payload.intensity);
      } else if (action === 'batch_edit_events') {
        newPattern.events = payload.events;
      }

      newLibraries.patterns[activePatternId] = newPattern;
      return { ...prev, libraries: newLibraries };
    });
  };

  // --- Lógica de Drag & Drop da Biblioteca para a Timeline ---
  const handleDropOnTrack = (e, trackType) => {
    e.preventDefault();
    if (!timelineRef.current) return;
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (
        (trackType === 'leftHandTrack' && data.type !== 'shape') ||
        (trackType === 'rightHandTrack' && data.type !== 'pattern')
      ) {
        return; // Tentou arrastar o tipo errado para a trilha
      }

      const rect = timelineRef.current.getBoundingClientRect();
      const mouseX = Math.max(0, e.clientX - rect.left);
      const dropTimeMs = Math.round(((mouseX / rect.width) * 5000) / 100) * 100; // Snap a cada 100ms

      setState(prev => {
        const newTimeline = { ...prev.timeline };
        if (trackType === 'leftHandTrack') {
          newTimeline.leftHandTrack.push({
            shapeId: data.id,
            startTimeMs: dropTimeMs,
            durationMs: 1000 // default inicial para shape novo
          });
        } else {
          newTimeline.rightHandTrack.push({
            patternId: data.id,
            startTimeMs: dropTimeMs
          });
        }
        return { ...prev, timeline: newTimeline };
      });
    } catch (err) {
      console.error("Erro no drag and drop", err);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] p-6 flex flex-col gap-6 overflow-hidden">
      
      {/* Header Controls */}
      <div className="flex gap-4 items-center bg-[#121212] p-4 rounded-lg border border-chrome-dark shadow-wood">
        <button 
          onClick={togglePlay}
          className="flex items-center gap-2 bg-chrome hover:bg-chrome-light text-black px-4 py-2 rounded font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all"
        >
          {isPlaying ? <Pause size={18}/> : <Play size={18}/>}
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </button>
        <button 
          onClick={stopPlay}
          className="flex items-center gap-2 bg-wood-dark hover:bg-wood text-white border border-wood-light px-4 py-2 rounded font-bold transition-all"
        >
          <Square size={18}/>
          STOP
        </button>
        <div className="ml-8 font-mono text-gold-light text-xl bg-black px-4 py-1 rounded shadow-inner">
          {(currentTimeMs / 1000).toFixed(2)}s
        </div>
      </div>

      <main className="flex-1 flex p-4 gap-4 min-h-0">
        {/* Fretboard (Left Hand) */}
        <Fretboard 
          instrument={state.settings.instrument}
          activeShape={activeShape}
          onInteract={handleInteractFretboard}
        />
        
        {/* Soundhole (Right Hand) */}
        <Soundhole 
          instrument={state.settings.instrument}
          activePattern={activePattern}
          onInteract={handleInteractPattern}
        />

        {/* Sidebar de Bibliotecas (Drag & Drop) */}
        <div className="w-64 bg-black/60 rounded-lg border border-chrome-dark p-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <div className="text-gold-light text-sm font-bold uppercase tracking-wider text-center border-b border-[#333] pb-2">Minha Biblioteca</div>
          
          <div className="flex flex-col gap-2">
            <span className="text-chrome text-xs font-bold bg-[#111] px-2 py-1 rounded">Mão Esquerda (Shapes)</span>
            {Object.values(state.libraries.shapes).map(shape => (
              <div 
                key={shape.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ type: 'shape', id: shape.id }))}
                className="bg-wood p-2 rounded cursor-grab active:cursor-grabbing border-2 border-wood-dark hover:border-wood-light transition-colors text-xs text-chrome font-semibold shadow-sm flex items-center justify-between"
                title="Arraste para a trilha LH na Timeline"
              >
                <span>{shape.name}</span>
                <span className="text-[10px] bg-black/40 px-1 rounded">arrastar</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <span className="text-chrome text-xs font-bold bg-[#111] px-2 py-1 rounded">Mão Direita (Padrões)</span>
            {Object.values(state.libraries.patterns).map(pattern => (
              <div 
                key={pattern.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify({ type: 'pattern', id: pattern.id }))}
                className="bg-chrome-gradient p-2 rounded cursor-grab active:cursor-grabbing border-2 border-chrome-dark hover:border-chrome-light transition-colors text-xs text-black font-bold shadow-sm flex items-center justify-between"
                title="Arraste para a trilha RH na Timeline"
              >
                <span>{pattern.name}</span>
                <span className="text-[10px] bg-black/20 px-1 rounded">arrastar</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <Timeline tracks={state.timeline} currentTimeMs={currentTimeMs} />
      </DndContext>
      
    </div>
  );
}

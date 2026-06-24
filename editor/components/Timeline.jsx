import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

function TimelineBlock({ block, type }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
  });

  // Calculate position: 10px = 100ms (1px = 10ms)
  const style = {
    left: `${block.startTimeMs / 10}px`,
    width: `${block.durationMs / 10}px`,
    transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined, // Only allow X axis drag visually
    zIndex: isDragging ? 50 : 10,
  };

  const isLeft = type === 'left';

  return (
    <div 
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`absolute top-2 bottom-2 border rounded shadow-md flex items-center px-2 cursor-grab active:cursor-grabbing transition-shadow ${
        isLeft 
          ? 'bg-wood border-wood-light hover:bg-wood-light' 
          : 'bg-chrome-dark border-chrome hover:bg-chrome'
      } ${isDragging ? 'shadow-xl opacity-90 ring-2 ring-gold' : ''}`}
      style={style}
    >
      <span className="text-xs font-semibold text-white truncate pointer-events-none select-none">
        {isLeft ? block.shapeId : block.patternId}
      </span>
    </div>
  );
}

export default function Timeline({ tracks, currentTimeMs }) {
  const { setNodeRef } = useDroppable({ id: 'timeline-area' });

  // Playhead position (10px = 100ms -> 1px = 10ms)
  const playheadX = currentTimeMs / 10;

  return (
    <div className="flex-1 bg-[#121212] rounded-lg border-2 border-chrome-dark flex flex-col relative overflow-hidden shadow-wood">
      <div className="h-8 border-b border-chrome-dark bg-[#1e1e1e] flex items-center px-4 justify-between shrink-0">
        <span className="text-xs text-chrome font-bold tracking-widest">SEQUENCIADOR</span>
        <span className="text-xs text-chrome-dark">Arraste os blocos horizontalmente para alterar o tempo</span>
      </div>

      <div ref={setNodeRef} className="flex-1 flex flex-col relative overflow-x-auto overflow-y-hidden">
        {/* Playhead */}
        <div 
          className="absolute top-0 bottom-0 w-px bg-gold z-40 shadow-[0_0_8px_rgba(212,175,55,1)] pointer-events-none transition-transform duration-75"
          style={{ transform: `translate3d(${playheadX + 128 + 16}px, 0, 0)` }} // 128px is sidebar + 16px padding
        >
          <div className="w-3 h-3 bg-gold absolute -top-0 -left-[5px] rounded-b-sm"></div>
        </div>

        {/* Left Track */}
        <div className="flex-1 border-b border-chrome-dark flex relative bg-black/40 min-w-[3000px]">
          <div className="w-32 border-r border-chrome-dark flex items-center justify-center bg-[#1a1a1a] sticky left-0 z-30 shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
            <span className="text-xs text-wood-light font-bold tracking-widest">MÃO ESQUERDA</span>
          </div>
          <div className="flex-1 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGxpbmUgeDE9IjQwIiB5MT0iMCIgeDI9IjQwIiB5Mj0iNDAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] ml-4">
            {tracks.leftHandTrack.map(block => (
              <TimelineBlock key={block.id} block={block} type="left" />
            ))}
          </div>
        </div>

        {/* Right Track */}
        <div className="flex-1 flex relative bg-black/40 min-w-[3000px]">
          <div className="w-32 border-r border-chrome-dark flex items-center justify-center bg-[#1a1a1a] sticky left-0 z-30 shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
            <span className="text-xs text-gold-light font-bold tracking-widest">MÃO DIREITA</span>
          </div>
          <div className="flex-1 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGxpbmUgeDE9IjQwIiB5MT0iMCIgeDI9IjQwIiB5Mj0iNDAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] ml-4">
            {tracks.rightHandTrack.map(block => (
              <TimelineBlock key={block.id} block={block} type="right" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

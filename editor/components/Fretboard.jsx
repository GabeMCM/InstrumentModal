export default function Fretboard({ instrument, activeShape, onInteract }) {
  const frets = Array.from({ length: instrument.frets + 1 });
  const strings = Array.from({ length: instrument.strings });

  return (
    <div className="flex-1 bg-wood-pattern rounded-lg p-4 flex flex-col justify-center border-2 border-wood-dark shadow-wood relative overflow-hidden group">
      <div className="absolute top-2 left-4 text-gold-light text-sm opacity-80 font-semibold tracking-wider">
        BRAÇO (LEFT HAND) {activeShape && "- MODO EDIÇÃO ATIVO"}
      </div>
      
      {/* Fretboard Grid */}
      <div className="relative w-full h-48 bg-wood-board rounded border-y border-chrome-dark flex">
        {/* Nut / Pestana */}
        <div className="w-4 bg-chrome h-full shadow-chrome border-r border-chrome-dark z-10"></div>
        
        {/* Frets */}
        {frets.slice(1).map((_, i) => (
          <div key={`fret-${i}`} className="flex-1 border-r border-chrome-dark relative flex items-center justify-center">
            {/* Inlays */}
            {[3, 5, 7, 9, 15, 17, 19, 21].includes(i + 1) && (
              <div className="w-3 h-3 rounded-full bg-chrome-light opacity-50 absolute"></div>
            )}
            {i + 1 === 12 && (
              <div className="flex flex-col gap-8 absolute">
                <div className="w-3 h-3 rounded-full bg-chrome-light opacity-50"></div>
                <div className="w-3 h-3 rounded-full bg-chrome-light opacity-50"></div>
              </div>
            )}
          </div>
        ))}

        {/* Strings */}
        <div className="absolute inset-0 flex flex-col justify-between py-2 z-20">
          {strings.map((_, i) => {
            const stringIndex = 6 - i; // 6 to 1
            const isMuted = activeShape?.muted?.includes(stringIndex);
            
            return (
              <div key={`string-${i}`} className="w-full flex-1 relative flex items-center group">
                {/* Visual String */}
                <div className={`w-full bg-chrome-gradient shadow-sm opacity-90 pointer-events-none ${i < 2 ? 'h-[3px]' : 'h-[1.5px]'}`}></div>
                
                {/* String Label / Toggle Mute */}
                <div 
                  className="absolute -left-6 w-8 h-8 flex items-center justify-center text-xs text-chrome-light font-mono opacity-50 cursor-pointer hover:text-white hover:opacity-100 z-50 bg-black/50 rounded pointer-events-auto"
                  onClick={() => onInteract && onInteract(stringIndex, 0, 'toggle_mute')}
                  title="Clique para alternar entre Abafar (X) e Tocar (O)"
                >
                  {instrument.tuning[5 - i]}
                </div>
                
                {/* Finger Dots based on activeShape */}
                {!isMuted && activeShape?.positions?.map(pos => {
                  if (pos.string === stringIndex && pos.fret > 0) {
                    return (
                      <div 
                        key={`finger-${pos.string}`} 
                        className="absolute w-4 h-4 rounded-full bg-gold shadow-[0_0_10px_rgba(212,175,55,0.8)] border border-gold-light z-30 transition-transform hover:scale-125 cursor-pointer pointer-events-none"
                        style={{ left: `${(pos.fret - 0.5) * (100 / frets.length)}%` }}
                      ></div>
                    );
                  }
                  return null;
                })}

                {/* Hit areas for each fret (Interactivity) */}
                <div className="absolute inset-0 flex">
                  {frets.slice(1).map((_, fretIndex) => {
                    const actualFret = fretIndex + 1;
                    return (
                      <div 
                        key={`hit-${stringIndex}-${actualFret}`} 
                        className="flex-1 h-full cursor-pointer hover:bg-gold/20 z-40 transition-colors"
                        onClick={() => onInteract && onInteract(stringIndex, actualFret, 'set_fret')}
                        title={`Pressionar corda ${stringIndex} na casa ${actualFret}`}
                      ></div>
                    );
                  })}
                </div>

                {/* Muted X */}
                {isMuted && (
                  <div className="absolute -left-4 text-red-500 font-bold text-sm pointer-events-none">X</div>
                )}
                
                {/* Open O */}
                {!isMuted && activeShape?.positions?.find(p => p.string === stringIndex && p.fret === 0) && (
                  <div className="absolute -left-4 text-gold-light font-bold text-sm pointer-events-none">O</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {activeShape && (
        <div className="absolute bottom-2 right-4 text-gold-light text-sm bg-black/50 px-2 py-1 rounded">
          Shape: <span className="font-bold">{activeShape.name}</span>
        </div>
      )}
    </div>
  );
}

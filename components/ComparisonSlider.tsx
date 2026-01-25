
import React, { useState, useRef, useEffect } from 'react';

interface ComparisonSliderProps {
  before: string;
  after: string;
}

const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ before, after }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Actualizar el ancho del contenedor para cálculos precisos de la imagen superior
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1 || e.buttons === 0) { // Permitir movimiento con hover o click
      handleMove(e.clientX);
    }
  };
  
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none cursor-col-resize group bg-black/40 rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] flex items-center justify-center"
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
    >
      {/* Imagen ANTES (Fondo) - Usamos object-contain para preservar el ratio original */}
      <img 
        src={before} 
        alt="Original" 
        className="absolute inset-0 w-full h-full object-contain" 
      />

      {/* Imagen DESPUÉS (Capa superior con recorte) */}
      <div 
        className="absolute inset-0 h-full overflow-hidden z-10" 
        style={{ width: `${sliderPos}%` }}
      >
        <div 
          className="absolute inset-0 h-full"
          style={{ width: containerWidth }}
        >
          <img 
            src={after} 
            alt="Rendered" 
            className="w-full h-full object-contain" 
            style={{ maxWidth: 'none' }}
          />
        </div>
      </div>

      {/* Línea divisoria y controlador */}
      <div 
        className="absolute top-0 bottom-0 w-[2px] bg-white/60 z-20 pointer-events-none shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-black/90 backdrop-blur-2xl border-2 border-white/30 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.8)]">
           <div className="flex gap-1.5 items-center">
              <i className="fa-solid fa-caret-left text-[10px] text-alpine-sap"></i>
              <div className="w-[1px] h-4 bg-white/20"></div>
              <i className="fa-solid fa-caret-right text-[10px] text-alpine-sap"></i>
           </div>
        </div>
      </div>

      {/* Etiquetas de estado */}
      <div className="absolute top-6 left-6 pointer-events-none z-30 flex gap-2 items-center transition-all duration-500 opacity-0 group-hover:opacity-100">
        <div className="h-2 w-2 bg-white/40 rounded-full animate-pulse"></div>
        <span className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full text-[7px] font-black uppercase tracking-[0.3em] text-white/60">Antes</span>
      </div>
      
      <div className="absolute top-6 right-6 pointer-events-none z-30 flex gap-2 items-center transition-all duration-500 opacity-0 group-hover:opacity-100">
        <span className="bg-alpine-sap/80 backdrop-blur-md border border-alpine-sap/20 px-4 py-1.5 rounded-full text-[7px] font-black uppercase tracking-[0.3em] text-black">Después</span>
        <div className="h-2 w-2 bg-black/40 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};

export default ComparisonSlider;

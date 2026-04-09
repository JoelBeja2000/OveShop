import React from 'react';
import { BrushType } from '../src/domain/types';

interface BrushToolbarProps {
  brushType: BrushType;
  setBrushType: (type: BrushType) => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushWidth: number;
  setBrushWidth: (width: number) => void;
  onClearAll?: () => void;
}

export const BrushToolbar: React.FC<BrushToolbarProps> = ({
  brushType,
  setBrushType,
  brushColor,
  setBrushColor,
  brushWidth,
  setBrushWidth,
  onClearAll
}) => {
  const alpineColors = [
    '#A2AD91', // Alpine Sap (Green)
    '#ffffff', // White
    '#FFC5C5', // Soft Rose
    '#C5D9FF', // Soft Sky
    '#FFE0C5', // Soft Sand
    '#000000', // Black
  ];

  const tools: { id: BrushType; icon: string; label: string }[] = [
    { id: 'pencil', icon: 'fa-pencil', label: 'Lápiz' },
    { id: 'highlighter', icon: 'fa-highlighter', label: 'Marcador' },
    { id: 'eraser', icon: 'fa-eraser', label: 'Borrador' },
  ];

  return (
    <div className="flex flex-col gap-4 p-5 rounded-[2.5rem] bg-black/60 backdrop-blur-3xl border border-white/10 shadow-2xl animate-fade-in">
      {/* Herramientas */}
      <div className="flex flex-col gap-2">
        <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white/30 text-center mb-1">Herramientas</span>
        <div className="flex items-center gap-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setBrushType(tool.id)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                brushType === tool.id 
                ? 'bg-alpine-sap text-black scale-110 shadow-lg shadow-alpine-sap/20' 
                : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
              }`}
              title={tool.label}
            >
              <i className={`fa-solid ${tool.icon} text-xs`}></i>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-white/5 mx-2"></div>

      {/* Colores */}
      {brushType !== 'eraser' && (
        <div className="flex flex-col gap-3">
          <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white/30 text-center mb-1">Colores</span>
          <div className="grid grid-cols-3 gap-2">
            {alpineColors.map((color) => (
              <button
                key={color}
                onClick={() => setBrushColor(color)}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 active:scale-90 ${
                  brushColor === color ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="h-px bg-white/5 mx-2"></div>

      {/* Grosor */}
      <div className="flex flex-col gap-2 px-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white/30">Grosor</span>
          <span className="text-[8px] font-bold text-alpine-sap">{brushWidth}px</span>
        </div>
        <input
          type="range"
          min="1"
          max={brushType === 'eraser' ? 100 : 50}
          value={brushWidth}
          onChange={(e) => setBrushWidth(parseInt(e.target.value))}
          className="w-full accent-alpine-sap bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
        />
      </div>

      {onClearAll && (
        <>
          <div className="h-px bg-white/5 mx-2"></div>
          <button
            onClick={onClearAll}
            className="w-full py-3 rounded-2xl bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-trash-can text-[10px]"></i>
            Limpiar Todo
          </button>
        </>
      )}
    </div>
  );
};

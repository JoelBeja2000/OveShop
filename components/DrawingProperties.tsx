import React from 'react';
import { BrushType, PlacedItem } from '../src/domain/types';

interface DrawingPropertiesProps {
  brushType: BrushType;
  setBrushType: (type: BrushType) => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushWidth: number;
  setBrushWidth: (width: number) => void;
  onClearAll?: () => void;
  colorLabels?: Record<string, string>;
  onUpdateLabels?: (labels: Record<string, string>) => void;
  usedColors: string[];
  customPalette?: string[];
  onAddCustomColor?: (color: string) => void;
  onFinish?: () => void;
  onExit?: () => void;
}

export const DrawingProperties: React.FC<DrawingPropertiesProps> = ({
  brushType,
  setBrushType,
  brushColor,
  setBrushColor,
  brushWidth,
  setBrushWidth,
  onClearAll,
  colorLabels = {},
  onUpdateLabels,
  usedColors,
  customPalette = [],
  onAddCustomColor,
  onFinish,
  onExit
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

  const handleUpdateLabel = (color: string, label: string) => {
    if (onUpdateLabels) {
      onUpdateLabels({ ...colorLabels, [color.toLowerCase()]: label });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-alpine-sap/20 text-alpine-sap flex items-center justify-center">
          <i className="fa-solid fa-paintbrush text-xs"></i>
        </div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/90">Propiedades de Dibujo</h3>
      </div>

      <div className="space-y-5">
        {/* HERRAMIENTAS */}
        <div className="space-y-3">
          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Tipo de Trazo</label>
          <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setBrushType(tool.id)}
                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  brushType === tool.id 
                  ? 'bg-white/10 text-white shadow-lg' 
                  : 'text-white/20 hover:text-white/40'
                }`}
              >
                <i className={`fa-solid ${tool.icon} text-[10px]`}></i>
                <span className="text-[8px] font-black uppercase tracking-widest">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* GROSOR */}
        <div className="space-y-3">
          <div className="flex justify-between items-center ml-1">
            <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">Grosor de Pincel</label>
            <span className="text-[9px] font-black text-alpine-sap bg-alpine-sap/10 px-2 py-0.5 rounded-full">{brushWidth}px</span>
          </div>
          <div className="px-1">
            <input
              type="range"
              min="1"
              max={brushType === 'eraser' ? 100 : 50}
              value={brushWidth}
              onChange={(e) => setBrushWidth(parseInt(e.target.value))}
              className="w-full accent-alpine-sap bg-white/5 h-1.5 rounded-full appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* PALETA DE COLORES */}
        {brushType !== 'eraser' && (
          <div className="space-y-3">
            <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Color de Pincel</label>
            <div className="grid grid-cols-6 gap-2">
              {[...alpineColors, ...customPalette].map((color) => (
                <button
                  key={color}
                  onClick={() => setBrushColor(color)}
                  className={`aspect-square rounded-full border-2 transition-all hover:scale-110 ${
                    brushColor.toLowerCase() === color.toLowerCase() ? 'border-white scale-110 shadow-lg shadow-white/10' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <div className="relative aspect-square">
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button 
                  onClick={() => onAddCustomColor && onAddCustomColor(brushColor)}
                  className="w-full h-full rounded-full border-2 border-white/10 flex items-center justify-center bg-gradient-to-br from-white/10 to-transparent hover:border-alpine-sap/30 transition-colors group"
                  title="Añadir color actual a la paleta"
                >
                  <i className="fa-solid fa-plus text-[8px] text-white/20 group-hover:text-alpine-sap transition-colors"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="h-px bg-white/5 my-2"></div>

        {/* ACCIONES */}
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="w-full py-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-red-500/10 hover:border-red-500/20 text-white/30 hover:text-red-400 transition-all text-[8px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3"
          >
            <i className="fa-solid fa-trash-can text-[10px]"></i>
            Borrar Todo el Dibujo
          </button>
        )}

        {(onFinish || onExit) && (
          <div className="flex gap-3 pt-2">
            <button
              onClick={onExit}
              className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all text-[8px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-xmark text-[10px]"></i>
              Salir
            </button>
            <button
              onClick={onFinish}
              className="flex-1 py-4 rounded-2xl bg-alpine-sap text-black hover:scale-[1.02] active:scale-[0.98] transition-all text-[8px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 shadow-lg shadow-alpine-sap/20"
            >
              <i className="fa-solid fa-check text-[10px]"></i>
              Finalizar
            </button>
          </div>
        )}

        {/* GLOSARIO DE COLORES */}
        {usedColors.length > 0 && (
          <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-2xl animate-fade-in mt-4">
            <div className="flex items-center gap-2 mb-1">
              <i className="fa-solid fa-tags text-[9px] text-alpine-sap"></i>
              <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50">Glosario de Colores</label>
            </div>
            <div className="space-y-2">
              {usedColors.filter((c, i, self) => self.indexOf(c) === i).map((color) => (
                <div key={color} className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5">
                  <div 
                    className="w-6 h-6 rounded-lg border border-white/10 shrink-0 shadow-inner"
                    style={{ backgroundColor: color }}
                  />
                  <input
                    type="text"
                    value={colorLabels[color.toLowerCase()] || ''}
                    onChange={(e) => handleUpdateLabel(color, e.target.value)}
                    placeholder="Etiqueta..."
                    className="flex-1 bg-transparent border-none outline-none text-[9px] font-black uppercase tracking-widest text-white/80 placeholder:text-white/10"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

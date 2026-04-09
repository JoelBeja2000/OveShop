import React from 'react';
import { PlacedItem, TextConfig } from '../src/domain/types';

interface TextPropertiesProps {
  item: PlacedItem;
  onUpdate: (id: string, config: Partial<TextConfig>) => void;
}

export const TextProperties: React.FC<TextPropertiesProps> = ({ item, onUpdate }) => {
  if (!item.textConfig) return null;

  const config = item.textConfig;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-alpine-sap/20 text-alpine-sap flex items-center justify-center">
          <i className="fa-solid fa-font text-xs"></i>
        </div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/90">Propiedades de Texto</h3>
      </div>

      <div className="space-y-4">
        {/* TEXT CONTENT */}
        <div className="space-y-2">
          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Contenido</label>
          <textarea
            value={config.text}
            onChange={(e) => onUpdate(item.id, { text: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-white focus:border-alpine-sap/50 outline-none transition-all resize-none h-24 scrollbar-hide"
            placeholder="Escribe algo..."
          />
        </div>

        {/* FONT FAMILY - OS NATIVE SUPPORT */}
        <div className="space-y-2">
          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Fuente del Sistema</label>
          <div className="relative group">
            <input
              type="text"
              value={config.fontFamily}
              onChange={(e) => onUpdate(item.id, { fontFamily: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-white focus:border-alpine-sap/50 outline-none transition-all"
              placeholder="Ej: Impact, Courier New, etc."
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-white/40 transition-colors">
              <i className="fa-solid fa-keyboard text-[9px]"></i>
            </div>
          </div>
          <p className="text-[7px] text-white/20 uppercase tracking-widest leading-relaxed ml-1">
            Escribe el nombre de cualquier fuente instalada en tu equipo.
          </p>
        </div>

        {/* FONT SIZE & COLOR */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Tamaño</label>
            <input
              type="number"
              value={config.fontSize}
              onChange={(e) => onUpdate(item.id, { fontSize: parseInt(e.target.value) || 12 })}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-white focus:border-alpine-sap/50 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Color</label>
            <div className="relative">
              <input
                type="color"
                value={config.color}
                onChange={(e) => onUpdate(item.id, { color: e.target.value })}
                className="w-full h-[41px] bg-white/5 border border-white/10 rounded-xl p-1 cursor-pointer outline-none"
              />
            </div>
          </div>
        </div>

        {/* STYLE BUTTONS */}
        <div className="flex gap-2">
          <button
            onClick={() => onUpdate(item.id, { fontWeight: config.fontWeight === '900' ? '400' : '900' })}
            className={`flex-1 py-3 rounded-xl border transition-all text-[9px] font-bold ${config.fontWeight === '900' ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
          >
            B
          </button>
          <button
            onClick={() => onUpdate(item.id, { italic: !config.italic })}
            className={`flex-1 py-3 rounded-xl border transition-all text-[9px] italic ${config.italic ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
          >
            I
          </button>
          <button
            onClick={() => onUpdate(item.id, { underline: !config.underline })}
            className={`flex-1 py-3 rounded-xl border transition-all text-[9px] underline ${config.underline ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
          >
            U
          </button>
        </div>

        {/* ALIGNMENT */}
        <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => onUpdate(item.id, { align })}
              className={`flex-1 py-2 rounded-lg transition-all ${config.align === align ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/40'}`}
            >
              <i className={`fa-solid fa-align-${align} text-[10px]`}></i>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

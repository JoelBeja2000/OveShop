import React from 'react';
import { PlacedItem, TextConfig } from '../src/domain/types';

interface TextPropertiesProps {
  item: PlacedItem;
  onUpdate: (id: string, config: Partial<TextConfig>) => void;
  onUpdateItem: (id: string, updates: Partial<PlacedItem>) => void;
  customPalette?: string[];
  onAddCustomColor?: (color: string) => void;
}

export const TextProperties: React.FC<TextPropertiesProps> = ({ item, onUpdate, onUpdateItem, customPalette = [], onAddCustomColor }) => {
  if (!item.textConfig) return null;

  const config = item.textConfig;
  const editorRef = React.useRef<HTMLDivElement>(null);

  // Helper to normalize colors (handles hex and rgb)
  const normalizeColor = (c: string) => {
    let color = c.toLowerCase().trim();
    // Convert short hex to long hex
    if (color.startsWith('#') && color.length === 4) {
      color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    return color;
  };

  // Helper to extract colors from HTML
  const colors = React.useMemo(() => {
    const html = config.richText || '';
    const colorRegex = /color:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\))/g;
    const matches = Array.from(html.matchAll(colorRegex));
    const uniqueColors = new Set<string>();
    
    // Add baseline color
    if (config.color) uniqueColors.add(normalizeColor(config.color));
    
    matches.forEach(m => uniqueColors.add(normalizeColor(m[1])));
    return Array.from(uniqueColors);
  }, [config.richText, config.color]);

  // Sync initial content or changes from outside
  React.useEffect(() => {
    if (editorRef.current && config.isRichText && config.richText) {
      if (editorRef.current.innerHTML !== config.richText) {
        editorRef.current.innerHTML = config.richText;
      }
    } else if (editorRef.current && !config.isRichText) {
      editorRef.current.innerText = config.text;
    }
  }, [config.richText, config.isRichText, config.text]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const text = editorRef.current.innerText;
      onUpdate(item.id, { 
        richText: html, 
        text: text,
        isRichText: true 
      });
    }
  };

  const applyColor = (color: string) => {
    if (editorRef.current) {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, color);
      handleInput();
    }
  };

  const handleUpdateLabel = (color: string, label: string) => {
    const currentLabels = item.colorLabels || {};
    onUpdateItem(item.id, {
      colorLabels: { ...currentLabels, [color]: label }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-alpine-sap/20 text-alpine-sap flex items-center justify-center">
          <i className="fa-solid fa-font text-xs"></i>
        </div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/90">Propiedades de Texto</h3>
      </div>

      <div className="space-y-4">
        {/* TEXT CONTENT - RICH TEXT EDITOR */}
        <div className="space-y-2">
          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Contenido (Selecciona para colorear)</label>
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onBlur={handleInput}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-white focus:border-alpine-sap/50 outline-none transition-all min-h-[100px] overflow-y-auto scrollbar-hide whitespace-pre-wrap"
            style={{ 
              fontFamily: config.fontFamily || 'sans-serif',
              textAlign: config.align
            }}
          />
        </div>

        {/* FONT FAMILY - OS NATIVE SUPPORT */}
        <div className="space-y-2">
          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Fuente del Sistema</label>
          <div className="relative">
            <select
              value={config.fontFamily}
              onChange={(e) => onUpdate(item.id, { fontFamily: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-white focus:border-alpine-sap/50 outline-none transition-all appearance-none cursor-pointer"
            >
              <optgroup label="Sans Serif" className="bg-[#121212]">
                <option value="Inter, sans-serif">Inter</option>
                <option value="system-ui, sans-serif">System UI</option>
                <option value="Helvetica, Arial, sans-serif">Helvetica / Arial</option>
                <option value="Impact, Haettenschweiler, sans-serif">Impact</option>
                <option value="'Segoe UI', Roboto, sans-serif">Segoe / Roboto</option>
              </optgroup>
              <optgroup label="Serif" className="bg-[#121212]">
                <option value="Georgia, serif">Georgia</option>
                <option value="'Times New Roman', Times, serif">Times New Roman</option>
                <option value="'Playfair Display', serif">Playfair Display</option>
              </optgroup>
              <optgroup label="Monospace" className="bg-[#121212]">
                <option value="'Fira Code', monospace">Fira Code</option>
                <option value="'Courier New', Courier, monospace">Courier New</option>
                <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
              </optgroup>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20">
              <i className="fa-solid fa-chevron-down text-[8px]"></i>
            </div>
          </div>
        </div>

        {/* FONT SIZE & COLOR */}
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-2">
            <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Tamaño de Fuente</label>
            <input
              type="number"
              value={config.fontSize}
              onChange={(e) => onUpdate(item.id, { fontSize: parseInt(e.target.value) || 12 })}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-white focus:border-alpine-sap/50 outline-none transition-all"
            />
          </div>
          <div className="space-y-3 mt-1">
            <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Paleta de Colores (incremental)</label>
            <div className="grid grid-cols-6 gap-2">
              {['#A2AD91', '#ffffff', '#FFC5C5', '#C5D9FF', '#FFE0C5', '#000000', ...customPalette].map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onUpdate(item.id, { color });
                    applyColor(color);
                  }}
                  className={`aspect-square rounded-full border-2 transition-all hover:scale-110 ${
                    normalizeColor(config.color) === normalizeColor(color) ? 'border-white scale-110 shadow-lg shadow-white/10' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <div className="relative aspect-square">
                <input
                  type="color"
                  value={config.color}
                  onChange={(e) => {
                    const newColor = e.target.value;
                    onUpdate(item.id, { color: newColor });
                    applyColor(newColor);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button 
                  onClick={() => onAddCustomColor && onAddCustomColor(config.color)}
                  className="w-full h-full rounded-full border-2 border-white/10 flex items-center justify-center bg-gradient-to-br from-white/10 to-transparent hover:border-alpine-sap/30 transition-colors group"
                  title="Añadir color actual a la paleta"
                >
                  <i className="fa-solid fa-plus text-[8px] text-white/20 group-hover:text-alpine-sap transition-colors"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* STYLE BUTTONS */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              document.execCommand('bold', false);
              handleInput();
            }}
            className={`flex-1 py-3 rounded-xl border transition-all text-[9px] font-black bg-white/5 text-white/40 border-white/10 hover:bg-white hover:text-black hover:border-white`}
          >
            B
          </button>
          <button
            onClick={() => {
              document.execCommand('italic', false);
              handleInput();
            }}
            className={`flex-1 py-3 rounded-xl border transition-all text-[9px] italic bg-white/5 text-white/40 border-white/10 hover:bg-white hover:text-black hover:border-white`}
          >
            I
          </button>
          <button
            onClick={() => {
              document.execCommand('underline', false);
              handleInput();
            }}
            className={`flex-1 py-3 rounded-xl border transition-all text-[9px] underline bg-white/5 text-white/40 border-white/10 hover:bg-white hover:text-black hover:border-white`}
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

        {/* GLOSARIO DE COLORES */}
        {colors.length > 0 && (
          <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-2xl animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <i className="fa-solid fa-tags text-[9px] text-alpine-sap"></i>
              <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50">Glosario de Colores</label>
            </div>
            <div className="space-y-2">
              {colors.map((color) => (
                <div key={color} className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5">
                  <div 
                    className="w-6 h-6 rounded-lg border border-white/10 shrink-0 shadow-inner"
                    style={{ backgroundColor: color }}
                  />
                  <input
                    type="text"
                    value={item.colorLabels?.[color] || ''}
                    onChange={(e) => handleUpdateLabel(color, e.target.value)}
                    placeholder="Etiqueta (ej: LAVA)"
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

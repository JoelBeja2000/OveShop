
import React, { useState, useRef } from 'react';
import { AssetCategory, AssetItem, VisualBehavior } from '../src/domain/types';

interface AssetCarouselProps {
  onSelectItem: (id: string, name: string, image: string, x: number, y: number, hueRotate: number, saturation: number, brightness: number, description: string, visualBehavior: VisualBehavior, category: AssetCategory) => void;
  selectedId: string | null;
  darkMode: boolean;
  userAssets: ColorVariantItem[];
  setUserAssets: React.Dispatch<React.SetStateAction<ColorVariantItem[]>>;
  onUserFileUpload: (files: FileList | File[]) => void;
  hasBackground: boolean;
}

interface ColorVariantItem extends AssetItem {
  hueRotate?: number;
  saturation?: number;
  brightness?: number;
}

const AssetCarousel: React.FC<AssetCarouselProps> = ({ onSelectItem, selectedId, darkMode, userAssets, setUserAssets, onUserFileUpload, hasBackground }) => {
  const [expandedCategory, setExpandedCategory] = useState<AssetCategory | null>(AssetCategory.INVENTORY);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (e: React.DragEvent, item: ColorVariantItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify({
      id: item.id,
      name: item.name,
      image: item.image,
      hueRotate: item.hueRotate || 0,
      saturation: item.saturation || 1,
      brightness: item.brightness || 1,
      description: item.description,
      visualBehavior: item.visualBehavior || 'generative',
      category: item.category
    }));
  };

  const categories = Object.values(AssetCategory);

  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="mb-6 px-1">
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/80">OveShop Library</h2>
        <div className="h-0.5 w-10 bg-alpine-sap mt-2"></div>
      </div>

      <button
        onClick={() => hasBackground && fileInputRef.current?.click()}
        disabled={!hasBackground}
        className={`mb-6 mx-1 h-12 rounded-2xl border transition-all flex items-center justify-center gap-2 group ${
          hasBackground 
            ? 'bg-white/5 border-white/10 hover:bg-white/10' 
            : 'bg-white/[0.02] border-white/[0.05] cursor-not-allowed opacity-50'
        }`}
      >
        <i className={`fa-solid ${hasBackground ? 'fa-plus' : 'fa-lock'} text-[10px] ${hasBackground ? 'text-alpine-sap' : 'text-white/20'} group-hover:scale-125 transition-transform`}></i>
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/60 group-hover:text-white">
          {hasBackground ? 'Cargar Asset Local' : 'Carga un fondo primero'}
        </span>
        {hasBackground && (
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            multiple 
            onChange={(e) => {
              if (e.target.files) onUserFileUpload(e.target.files);
            }} 
          />
        )}
      </button>

      {categories.map((cat) => {
        const categoryItems = userAssets.filter(item => item.category === cat);
        const isExpanded = expandedCategory === cat;

        return (
          <div key={cat} className="flex flex-col mb-2">
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : cat)}
              className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 border ${isExpanded
                ? 'bg-alpine-sap border-alpine-sap/20 text-black shadow-lg translate-x-1'
                : 'bg-white/[0.03] border-white/[0.05] text-white/30 hover:bg-white/[0.06] hover:text-white/60'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 rounded-full ${isExpanded ? 'bg-black' : 'bg-alpine-sap/40'}`}></div>
                <span className="text-[8px] font-black uppercase tracking-[0.2em]">{cat}</span>
                <span className={`text-[7px] font-bold ${isExpanded ? 'text-black/40' : 'text-white/20'}`}>({categoryItems.length})</span>
              </div>
              <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-[7px]`}></i>
            </button>

            <div className={`grid transition-all duration-500 ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden flex flex-col gap-4 px-1">
                {categoryItems.length === 0 && isExpanded && (
                  <div className="py-8 text-center bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
                    <p className="text-[7px] font-bold uppercase tracking-widest text-white/20">Sin assets en esta categoría</p>
                  </div>
                )}
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, item)}
                    onClick={() => onSelectItem(item.id, item.name, item.image, 50, 50, item.hueRotate || 0, item.saturation || 1, item.brightness || 1, item.description, item.visualBehavior || 'strict', item.category)}
                    className="group relative flex gap-4 p-3 rounded-3xl transition-all duration-300 border bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.08] hover:border-white/10 cursor-pointer"
                  >
                    <div className="w-20 h-20 shrink-0 bg-black/40 rounded-2xl flex items-center justify-center p-2 group-hover:scale-110 transition-transform overflow-hidden shadow-inner">
                      <img
                        src={item.image}
                        style={{ filter: `hue-rotate(${item.hueRotate || 0}deg) saturate(${item.saturation || 1}) brightness(${item.brightness || 1})` }}
                        className="w-full h-full object-contain drop-shadow-md"
                        alt={item.name}
                      />
                    </div>
                    <div className="flex flex-col justify-center min-w-0 flex-1">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/90 truncate">{item.name}</span>
                        <select 
                          className="w-fit text-[5px] font-bold px-1.5 py-0.5 rounded border border-white/20 bg-black text-white/60 outline-none hover:border-alpine-sap/40 transition-colors"
                          value={item.category}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const newCat = e.target.value as AssetCategory;
                            setUserAssets(prev => prev.map(a => a.id === item.id ? { ...a, category: newCat } : a));
                          }}
                        >
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <p className="text-[6px] text-white/40 line-clamp-2 mt-1 leading-relaxed uppercase tracking-wider">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AssetCarousel;

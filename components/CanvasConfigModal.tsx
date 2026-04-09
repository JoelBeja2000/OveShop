import React, { useState, useEffect } from 'react';

interface CanvasConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (w: number, h: number, color: string, isTransparent: boolean) => void;
  initialW?: number;
  initialH?: number;
  initialColor?: string;
  initialTransparent?: boolean;
}

export const CanvasConfigModal: React.FC<CanvasConfigModalProps> = ({ 
  isOpen, onClose, onConfirm, initialW = 1080, initialH = 1080, initialColor = '#1a1a1a', initialTransparent = false 
}) => {
  const [w, setW] = useState(initialW);
  const [h, setH] = useState(initialH);
  const [color, setColor] = useState(initialColor);
  const [isTrans, setIsTrans] = useState(initialTransparent);

  useEffect(() => {
    if (isOpen) {
      setW(initialW);
      setH(initialH);
      setColor(initialColor);
      setIsTrans(initialTransparent);
    }
  }, [isOpen, initialW, initialH, initialColor, initialTransparent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-white/10 p-8 rounded-[2.5rem] max-w-md w-full space-y-8 shadow-2xl animate-fade-in-up">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-alpine-sap/10 text-alpine-sap rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-plus text-2xl"></i>
          </div>
          <h3 className="text-sm font-black uppercase tracking-[0.4em] text-white">Configurar Lienzo</h3>
          <p className="text-[9px] text-white/40 uppercase tracking-widest leading-relaxed px-4">
            Establece las dimensiones y el tipo de fondo para tu nuevo lienzo de trabajo.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest text-white/40 ml-1">Ancho (px)</label>
              <input 
                type="number" 
                value={w} 
                onChange={(e) => setW(parseInt(e.target.value) || 0)}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white font-bold focus:outline-none focus:border-alpine-sap/40 transition-all"
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest text-white/40 ml-1">Alto (px)</label>
              <input 
                type="number" 
                value={h} 
                onChange={(e) => setH(parseInt(e.target.value) || 0)}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white font-bold focus:outline-none focus:border-alpine-sap/40 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5 transition-all hover:bg-white/[0.05]">
            <div className="flex items-center gap-4">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Color Fondo</span>
              <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white/20">
                <input 
                  type="color" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer bg-transparent border-none appearance-none" 
                />
              </div>
            </div>
            <button 
              onClick={() => setIsTrans(!isTrans)}
              className={`px-4 h-10 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-3 border shadow-lg ${
                isTrans 
                ? 'bg-alpine-sap text-black border-alpine-sap scale-105' 
                : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
              }`}
            >
              <i className="fa-solid fa-border-none text-[10px]"></i>
              <span>{isTrans ? 'Retícula ON' : 'Transparente'}</span>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button 
            onClick={onClose}
            className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onConfirm(w, h, color, isTrans)}
            className="flex-1 h-12 rounded-xl bg-alpine-sap text-black text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-alpine-sap/20 border border-alpine-sap/50"
          >
            Aplicar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

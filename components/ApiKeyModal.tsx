
import React, { useState } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string) => void;
  onClose: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, onClose }) => {
  const [key, setKey] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      onSave(key.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#121212] border border-white/10 w-full max-w-md p-8 rounded-2xl shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-alpine-sap/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-key text-alpine-sap text-xl"></i>
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-widest mb-2">API Key Requerida</h2>
          <p className="text-[10px] text-white/60 uppercase tracking-wider">
            Para generar renders con IA necesitas una API Key de Google Gemini.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[9px] font-bold text-white/40 uppercase tracking-widest mb-2">
              Gemini API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Pegar tu API Key aquí..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-alpine-sap transition-colors placeholder:text-white/20"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 h-10 rounded-xl border border-white/10 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/60 hover:bg-white/5 hover:text-white transition-all group"
            >
              <span>Conseguir Key</span>
              <i className="fa-solid fa-arrow-up-right-from-square text-[8px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"></i>
            </a>
            <button
              type="submit"
              disabled={!key.trim()}
              className="flex-1 h-10 rounded-xl bg-alpine-sap text-black flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              <span>Guardar</span>
              <i className="fa-solid fa-check"></i>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApiKeyModal;

import React, { useState } from 'react';

interface NavbarProps {
  onLoadScene: () => void;
  onUseWebcam: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  onResetProject: () => void;
  onResetApiKey: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onRender: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isRendering: boolean;
  canRender: boolean;
  currentZoom: number;
  onCreateBackground: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  onLoadScene,
  onUseWebcam,
  onSaveProject,
  onLoadProject,
  onResetProject,
  onResetApiKey,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onRender,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isRendering,
  canRender,
  currentZoom,
  onCreateBackground
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const menuItems = [
    {
      label: 'Archivo',
      options: [
        { label: 'Cargar Escena', icon: 'fa-solid fa-image', action: onLoadScene },
        { label: 'Crear Fondo Nuevo', icon: 'fa-solid fa-plus-square', action: onCreateBackground },
        { label: 'Usar Webcam', icon: 'fa-solid fa-camera', action: onUseWebcam },
        { type: 'separator' },
        { label: 'Guardar Proyecto', icon: 'fa-solid fa-file-export', action: onSaveProject },
        { label: 'Cargar Proyecto', icon: 'fa-solid fa-file-import', action: onLoadProject },
        { type: 'separator' },
        { label: 'Reiniciar Mesa', icon: 'fa-solid fa-rotate-left', action: onResetProject },
      ]
    },
    {
      label: 'Edición',
      options: [
        { label: 'Deshacer', icon: 'fa-solid fa-rotate-left', action: onUndo, shortcut: 'Cmd Z', disabled: !canUndo },
        { label: 'Rehacer', icon: 'fa-solid fa-rotate-right', action: onRedo, shortcut: 'Cmd Shift Z', disabled: !canRedo },
        { type: 'separator' },
        { label: 'Añadir API Key', icon: 'fa-solid fa-key', action: onResetApiKey },
      ]
    }
  ];

  return (
    <nav className="hidden md:flex h-10 w-full bg-black/40 backdrop-blur-3xl border-b border-white/5 items-center px-4 fixed top-0 left-0 right-0 z-[2000] select-none">
      <div className="flex items-center gap-2 mr-6 opacity-80 hover:opacity-100 transition-opacity">
        <div className="w-5 h-5 bg-alpine-sap rounded-md rotate-12 flex items-center justify-center">
          <span className="text-[10px] font-black text-black">O</span>
        </div>
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">OveShop</span>
      </div>

      <div className="flex items-center h-full">
        {menuItems.map((menu) => (
          <div 
            key={menu.label}
            className="relative h-full flex items-center"
            onMouseEnter={() => menu.options && setActiveMenu(menu.label)}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <button
              className={`px-3 py-1 h-full text-[8px] font-black uppercase tracking-widest transition-all ${
                activeMenu === menu.label ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {menu.label}
            </button>

            {menu.options && activeMenu === menu.label && (
              <div className="absolute top-10 left-0 min-w-[200px] bg-[#1a1a1a] backdrop-blur-3xl border border-white/10 rounded-b-xl shadow-2xl py-2 animate-fade-in-down origin-top">
                {menu.options.map((opt, i) => (
                  opt.type === 'separator' ? (
                    <div key={i} className="my-1 border-t border-white/5 mx-2" />
                  ) : (
                    <button
                      key={i}
                      onClick={() => { if (!opt.disabled) { opt.action?.(); setActiveMenu(null); } }}
                      disabled={opt.disabled}
                      className={`w-full px-4 py-2 flex items-center justify-between group transition-colors ${
                        opt.disabled ? 'opacity-20 cursor-default' : 'hover:bg-alpine-sap/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {opt.icon && <i className={`${opt.icon} text-[9px] text-white/30 group-hover:text-alpine-sap`}></i>}
                        <span className="text-[7px] font-black uppercase tracking-widest text-white/60 group-hover:text-white whitespace-nowrap">
                          {opt.label}
                        </span>
                      </div>
                      {opt.shortcut && (
                        <span className="text-[6px] font-bold text-white/20 uppercase tracking-tighter">
                          {opt.shortcut}
                        </span>
                      )}
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-4 pr-4">
        <div className="flex items-center gap-1 bg-white/5 px-3 py-1 rounded-full border border-white/10">
          <span className="text-[6px] font-black text-white/20 uppercase tracking-widest">Zoom</span>
          <span className="text-[8px] font-black text-white/60 min-w-[30px] text-center">{currentZoom}%</span>
        </div>
        <button
          onClick={onRender}
          disabled={isRendering || !canRender}
          className={`
            h-7 px-4 min-w-[140px] justify-center rounded-full flex items-center gap-2 transition-all duration-300
            ${isRendering || !canRender
              ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5' 
              : 'bg-alpine-sap text-black hover:scale-105 active:scale-95 shadow-lg shadow-alpine-sap/20 font-black text-[8px] uppercase tracking-widest shadow-xl cursor-pointer'
            }
          `}
        >
          {isRendering ? (
            <>
              <i className="fa-solid fa-circle-notch animate-spin"></i>
              <span>Generando...</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              <span>Generar Render</span>
            </>
          )}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;

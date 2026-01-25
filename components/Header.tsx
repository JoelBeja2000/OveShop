
import React from 'react';

interface HeaderProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  onReset?: () => void;
}

const Header: React.FC<HeaderProps> = ({ darkMode, onToggleTheme, onReset }) => {
  return (
    <header className="absolute top-0 left-0 right-0 py-6 px-10 flex justify-between items-center z-30 pointer-events-none">
      <div className="flex items-center gap-8 pointer-events-auto">
        <button 
          onClick={onReset}
          className="group flex flex-col items-center gap-1 transition-all"
        >
          <div className="h-8 w-8 flex items-center justify-center rounded-full border border-white/5 bg-black/20 backdrop-blur-md group-hover:border-white/20 transition-all">
            <i className="fa-solid fa-arrow-left text-[10px] text-white/20 group-hover:text-white"></i>
          </div>
        </button>

        <div className="flex flex-col">
          <h1 className="text-[12px] font-black text-white tracking-[0.4em] uppercase leading-none">
            ECO<span className="text-white/20">DECOR</span>
          </h1>
          <span className="text-[6px] font-black text-alpine-sap/40 uppercase tracking-[0.8em] mt-2">Vision & Budget 1.0</span>
        </div>
      </div>

      <div className="flex items-center gap-4 pointer-events-auto">
        <button 
          onClick={onToggleTheme}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/20 bg-black/20 backdrop-blur-md border border-white/5 hover:text-white transition-all"
        >
          <i className={`fa-solid ${darkMode ? 'fa-sun' : 'fa-moon'} text-[10px]`}></i>
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white/10 bg-black/20 backdrop-blur-md border border-white/5">
           <i className="fa-solid fa-ellipsis-vertical text-[10px]"></i>
        </div>
      </div>
    </header>
  );
};

export default Header;

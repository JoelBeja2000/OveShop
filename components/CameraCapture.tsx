
import React, { useRef, useState, useEffect } from 'react';
import { PlacedItem, PerspectivePoints, PricingType, VisualBehavior } from '../src/domain/types';

interface CameraCaptureProps {
  darkMode: boolean;
  placedItems: PlacedItem[];
  setPlacedItems: React.Dispatch<React.SetStateAction<PlacedItem[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  externalBackground?: string | null;
  // Updated onDropItem to include visualBehavior to match handleAddItem signature
  onDropItem?: (id: string, name: string, image: string, price: number, pricingType: PricingType, x: number, y: number, hue: number, sat: number, bri: number, description: string, visualBehavior: VisualBehavior) => void;
}

function getPerspectiveMatrix(w: number, h: number, p: PerspectivePoints) {
  const x0 = (p.tl.x / 100) * w, y0 = (p.tl.y / 100) * h;
  const x1 = (1 + p.tr.x / 100) * w, y1 = (p.tr.y / 100) * h;
  const x2 = (1 + p.br.x / 100) * w, y2 = (1 + p.br.y / 100) * h;
  const x3 = (p.bl.x / 100) * w, y3 = (1 + p.bl.y / 100) * h;

  const dx1 = x1 - x2, dy1 = y1 - y2;
  const dx2 = x3 - x2, dy2 = y3 - y2;
  const dx3 = x0 - x1 + x2 - x3, dy3 = y0 - y1 + y2 - y3;

  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < 0.0001) return "none";

  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const h_param = (dx1 * dy3 - dx3 * dy1) / det;

  const a = (x1 - x0 + g * x1) / w;
  const b = (x3 - x0 + h_param * x3) / w;
  const c = x0;
  const d = (y1 - y0 + g * y1) / h;
  const e = (y3 - y0 + h_param * y3) / h;
  const f = y0;

  if (1 + g + h_param <= 0) return "none";
  return `matrix3d(${a}, ${d}, 0, ${g / w}, ${b}, ${e}, 0, ${h_param / w}, 0, 0, 1, 0, ${c}, ${f}, 0, 1)`;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  placedItems, setPlacedItems, selectedId, setSelectedId, externalBackground, onDropItem
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);
  const [isWarpMode, setIsWarpMode] = useState(false);

  useEffect(() => {
    if (externalBackground) {
      const img = new Image();
      img.onload = () => setAspectRatio(img.width / img.height);
      img.src = externalBackground;
    }
  }, [externalBackground]);

  // HANDLERS UNIFICADOS (MOUSE + TOUCH)
  const handleInteractionStart = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    const isTouch = 'touches' in e;
    if (!isTouch && (e as React.MouseEvent).button !== 0) return;
    e.stopPropagation();

    // Prevent scrolling on touch devices
    // if (isTouch) e.preventDefault(); // CAUTION: Calling this on start might block click? No, but mainly used on move.

    if (selectedId !== id) {
      setSelectedId(id);
      setIsWarpMode(false);
    }

    const rect = canvasRef.current!.getBoundingClientRect();
    const startX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const startY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

    const item = placedItems.find(i => i.id === id);
    if (!item) return;

    const el = itemRefs.current.get(id);

    const initialX = item.x;
    const initialY = item.y;
    let rafId: number;

    const onMove = (mv: MouseEvent | TouchEvent) => {
      if ('touches' in mv) mv.preventDefault(); // Prevent scroll while dragging

      const currentX = 'touches' in mv ? mv.touches[0].clientX : mv.clientX;
      const currentY = 'touches' in mv ? mv.touches[0].clientY : mv.clientY;
      const dx = ((currentX - startX) / rect.width) * 100;
      const dy = ((currentY - startY) / rect.height) * 100;

      const newX = Math.max(0, Math.min(100, initialX + dx));
      const newY = Math.max(0, Math.min(100, initialY + dy));

      if (el) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          el.style.left = `${newX}%`;
          el.style.top = `${newY}%`;
        });
      }
    };

    const onEnd = (endEvent: MouseEvent | TouchEvent) => {
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('touchend', onEnd);
      if (rafId) cancelAnimationFrame(rafId);

      // Calculate final position to update React State
      let finalX = initialX;
      let finalY = initialY;

      // We need to recalculate based on the LAST event or trust the DOM style?
      // Trusting DOM style is tricky if we want exact math. best is to recalc using the last known position.
      // But 'endEvent' might not have coordinates (e.g. mouseup).
      // Easier: just read the style.left/top we set!
      if (el) {
        finalX = parseFloat(el.style.left || String(initialX));
        finalY = parseFloat(el.style.top || String(initialY));
      }

      setPlacedItems(prev => prev.map(i => i.id === id ? { ...i, x: finalX, y: finalY } : i));
    };

    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove as any, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  const handleResizeStart = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const item = placedItems.find(i => i.id === id);
    if (!item || !canvasRef.current) return;
    const el = itemRefs.current.get(id);

    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.left + (item.x / 100) * rect.width;
    const centerY = rect.top + (item.y / 100) * rect.height;

    const isTouch = 'touches' in e;
    const currentX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const currentY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

    const startDist = Math.hypot(currentX - centerX, currentY - centerY);
    const initialScale = item.scale;
    let rafId: number;
    let finalScale = initialScale;

    const onMove = (mv: MouseEvent | TouchEvent) => {
      if ('touches' in mv) mv.preventDefault();
      const mvX = 'touches' in mv ? mv.touches[0].clientX : mv.clientX;
      const mvY = 'touches' in mv ? mv.touches[0].clientY : mv.clientY;
      const currentDist = Math.hypot(mvX - centerX, mvY - centerY);

      const newScale = Math.max(0.05, (currentDist / startDist) * initialScale);
      finalScale = newScale;

      if (el) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          el.style.transform = `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${newScale})`;
        });
      }
    };

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('touchend', onEnd);
      if (rafId) cancelAnimationFrame(rafId);

      setPlacedItems(prev => prev.map(i => i.id === id ? { ...i, scale: finalScale } : i));
    };

    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove as any, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  const handleWarpPointStart = (id: string, corner: keyof PerspectivePoints, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const item = placedItems.find(i => i.id === id);
    if (!item) return;

    const isTouch = 'touches' in e;
    const startX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const startY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

    const initialPos = { ...item.perspective![corner] };
    const baseH = 250;
    const baseW = 250 * item.aspectRatio;
    const rad = (item.rotation * Math.PI) / 180;
    const scale = item.scale;

    const onMove = (mv: MouseEvent | TouchEvent) => {
      const mvX = 'touches' in mv ? mv.touches[0].clientX : mv.clientX;
      const mvY = 'touches' in mv ? mv.touches[0].clientY : mv.clientY;
      const dx_px = mvX - startX;
      const dy_px = mvY - startY;
      const localDx = dx_px * Math.cos(-rad) - dy_px * Math.sin(-rad);
      const localDy = dx_px * Math.sin(-rad) + dy_px * Math.cos(-rad);

      const dx_pct = (localDx / (baseW * scale)) * 100;
      const dy_pct = (localDy / (baseH * scale)) * 100;

      setPlacedItems(prev => prev.map(i => i.id === id ? {
        ...i,
        perspective: { ...i.perspective!, [corner]: { x: initialPos.x + dx_pct, y: initialPos.y + dy_pct } }
      } : i));
    };

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove as any, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  return (
    <div
      className="w-full h-full flex items-center justify-center relative select-none"
      onMouseDown={() => { setSelectedId(null); setIsWarpMode(false); }}
      onTouchStart={() => { setSelectedId(null); setIsWarpMode(false); }}
    >
      <div
        ref={canvasRef}
        style={{ aspectRatio: aspectRatio }}
        className="relative w-full h-full bg-[#050505] overflow-hidden shadow-2xl rounded-2xl md:rounded-[3rem] border border-white/5"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const data = JSON.parse(e.dataTransfer.getData("application/json"));
          const rect = canvasRef.current!.getBoundingClientRect();
          // Added data.visualBehavior to match the updated onDropItem signature
          onDropItem?.(
            data.id,
            data.name,
            data.image,
            data.price,
            data.pricingType,
            ((e.clientX - rect.left) / rect.width) * 100,
            ((e.clientY - rect.top) / rect.height) * 100,
            data.hueRotate,
            data.saturation,
            data.brightness,
            data.description,
            data.visualBehavior
          );
        }}
      >
        {externalBackground && <img src={externalBackground} className="w-full h-full object-contain pointer-events-none" alt="" />}

        {placedItems.map(item => {
          const isSelected = selectedId === item.id;
          const baseH = 250;
          const baseW = 250 * item.aspectRatio;
          const p = item.perspective || { tl: { x: 0, y: 0 }, tr: { x: 0, y: 0 }, bl: { x: 0, y: 0 }, br: { x: 0, y: 0 } };
          const matrix = getPerspectiveMatrix(baseW, baseH, p);

          const h = {
            tl: { x: p.tl.x, y: p.tl.y },
            tr: { x: 100 + p.tr.x, y: p.tr.y },
            br: { x: 100 + p.br.x, y: 100 + p.br.y },
            bl: { x: p.bl.x, y: 100 + p.bl.y }
          };

          return (
            <div
              key={item.id}
              ref={(el) => {
                if (el) itemRefs.current.set(item.id, el);
                else itemRefs.current.delete(item.id);
              }}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
                width: baseW,
                height: baseH,
                zIndex: isSelected ? 200 : 20,
                touchAction: 'none',
              }}
              className={`absolute flex items-center justify-center cursor-move transition-shadow duration-300 ${isSelected ? 'shadow-[0_0_30px_rgba(255,255,255,0.1)]' : ''}`}
              onMouseDown={(e) => handleInteractionStart(item.id, e)}
              onTouchStart={(e) => handleInteractionStart(item.id, e)}
            >
              {isSelected && isWarpMode && (
                <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-[10]">
                  <path
                    d={`M ${h.tl.x}% ${h.tl.y}% L ${h.tr.x}% ${h.tr.y}% L ${h.br.x}% ${h.br.y}% L ${h.bl.x}% ${h.bl.y}% Z`}
                    fill="rgba(162,173,145,0.1)"
                    stroke="#A2AD91"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                </svg>
              )}

              <div
                className="w-full h-full pointer-events-none"
                style={{ transform: matrix, transformOrigin: '0 0' }}
              >
                <img
                  src={item.image}
                  className="w-full h-full object-contain drop-shadow-2xl"
                  style={{ filter: `hue-rotate(${item.hueRotate}deg) saturate(${item.saturation}) brightness(${item.brightness})` }}
                  alt=""
                />
              </div>

              {isSelected && (
                <>
                  {!isWarpMode && (
                    <>
                      {/* TIRADORES DE ESCALA MEJORADOS PARA TOUCH */}
                      <div onMouseDown={(e) => handleResizeStart(item.id, e)} onTouchStart={(e) => handleResizeStart(item.id, e)} className="absolute -top-4 -left-4 w-10 h-10 flex items-center justify-center z-[300] cursor-nwse-resize group">
                        <div className="w-5 h-5 bg-white rounded-full border-2 border-black shadow-lg group-active:scale-125 transition-transform"></div>
                      </div>
                      <div onMouseDown={(e) => handleResizeStart(item.id, e)} onTouchStart={(e) => handleResizeStart(item.id, e)} className="absolute -top-4 -right-4 w-10 h-10 flex items-center justify-center z-[300] cursor-nesw-resize group">
                        <div className="w-5 h-5 bg-white rounded-full border-2 border-black shadow-lg group-active:scale-125 transition-transform"></div>
                      </div>
                      <div onMouseDown={(e) => handleResizeStart(item.id, e)} onTouchStart={(e) => handleResizeStart(item.id, e)} className="absolute -bottom-4 -left-4 w-10 h-10 flex items-center justify-center z-[300] cursor-nesw-resize group">
                        <div className="w-5 h-5 bg-white rounded-full border-2 border-black shadow-lg group-active:scale-125 transition-transform"></div>
                      </div>
                      <div onMouseDown={(e) => handleResizeStart(item.id, e)} onTouchStart={(e) => handleResizeStart(item.id, e)} className="absolute -bottom-4 -right-4 w-10 h-10 flex items-center justify-center z-[300] cursor-nwse-resize group">
                        <div className="w-5 h-5 bg-white rounded-full border-2 border-black shadow-lg group-active:scale-125 transition-transform"></div>
                      </div>
                    </>
                  )}

                  {isWarpMode && (
                    <>
                      {['tl', 'tr', 'br', 'bl'].map((corner) => (
                        <div
                          key={corner}
                          onMouseDown={(e) => handleWarpPointStart(item.id, corner as keyof PerspectivePoints, e)}
                          onTouchStart={(e) => handleWarpPointStart(item.id, corner as keyof PerspectivePoints, e)}
                          className="absolute w-12 h-12 flex items-center justify-center z-[300] cursor-crosshair group/point"
                          style={{
                            left: `${h[corner as keyof typeof h].x}%`,
                            top: `${h[corner as keyof typeof h].y}%`,
                            transform: 'translate(-50%, -50%)'
                          }}
                        >
                          <div className="w-5 h-5 bg-alpine-sap rounded-full border-2 border-black shadow-md transition-transform group-active:bg-white group-active:scale-110"></div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* BARRA DE ACCIONES FLOTANTE ADAPTADA */}
                  <div
                    className="absolute -bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/95 backdrop-blur-3xl p-2 rounded-full border border-white/10 z-[400] shadow-2xl scale-100 md:scale-90 animate-fade-in-up"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); setPlacedItems(prev => prev.filter(i => i.id !== item.id)); }}
                      className="w-10 h-10 md:w-8 md:h-8 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                    >
                      <i className="fa-solid fa-trash-can text-[10px] md:text-[9px]"></i>
                    </button>

                    <button
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const el = itemRefs.current.get(item.id);
                        const rect = canvasRef.current!.getBoundingClientRect();
                        const cx = rect.left + (item.x / 100) * rect.width;
                        const cy = rect.top + (item.y / 100) * rect.height;
                        let rafId: number;
                        let finalRotation = item.rotation;

                        const onMove = (mv: MouseEvent | TouchEvent) => {
                          if ('touches' in mv) mv.preventDefault();
                          const mvX = 'touches' in mv ? mv.touches[0].clientX : mv.clientX;
                          const mvY = 'touches' in mv ? mv.touches[0].clientY : mv.clientY;
                          const angle = Math.atan2(mvY - cy, mvX - cx);
                          finalRotation = (angle * 180 / Math.PI) + 90;

                          if (el) {
                            if (rafId) cancelAnimationFrame(rafId);
                            rafId = requestAnimationFrame(() => {
                              el.style.transform = `translate(-50%, -50%) rotate(${finalRotation}deg) scale(${item.scale})`;
                            });
                          }
                        };
                        const onEnd = () => {
                          window.removeEventListener('mousemove', onMove as any);
                          window.removeEventListener('mouseup', onEnd);
                          window.removeEventListener('touchmove', onMove as any);
                          window.removeEventListener('touchend', onEnd);
                          if (rafId) cancelAnimationFrame(rafId);
                          setPlacedItems(prev => prev.map(i => i.id === item.id ? { ...i, rotation: finalRotation } : i));
                        };
                        window.addEventListener('mousemove', onMove as any);
                        window.addEventListener('mouseup', onEnd);
                        window.addEventListener('touchmove', onMove as any, { passive: false });
                        window.addEventListener('touchend', onEnd);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        // Logic duplicated here for touchStart binding if React doesn't map overlapping handlers well, 
                        // but actually the handler above handles both event types in listeners. 
                        // However, we need to trigger the INIT logic.
                        // Actually, let's just make a shared handler function to keep it DRY or copy-paste carefully.
                        // For simplicity in this diff, I will just call the handler.
                        // Wait, the onMouseDown above is defining functions closing over local vars.
                        // I will duplicate logic for touchStart to be safe and explicit, or better:
                        // Create a unified internal handler and call it.
                        const el = itemRefs.current.get(item.id);
                        const rect = canvasRef.current!.getBoundingClientRect();
                        const cx = rect.left + (item.x / 100) * rect.width;
                        const cy = rect.top + (item.y / 100) * rect.height;
                        let rafId: number;
                        let finalRotation = item.rotation;

                        const onMove = (mv: MouseEvent | TouchEvent) => {
                          if ('touches' in mv) mv.preventDefault();
                          const mvX = 'touches' in mv ? mv.touches[0].clientX : mv.clientX;
                          const mvY = 'touches' in mv ? mv.touches[0].clientY : mv.clientY;
                          const angle = Math.atan2(mvY - cy, mvX - cx);
                          finalRotation = (angle * 180 / Math.PI) + 90;

                          if (el) {
                            if (rafId) cancelAnimationFrame(rafId);
                            rafId = requestAnimationFrame(() => {
                              el.style.transform = `translate(-50%, -50%) rotate(${finalRotation}deg) scale(${item.scale})`;
                            });
                          }
                        };
                        const onEnd = () => {
                          window.removeEventListener('mousemove', onMove as any);
                          window.removeEventListener('mouseup', onEnd);
                          window.removeEventListener('touchmove', onMove as any);
                          window.removeEventListener('touchend', onEnd);
                          if (rafId) cancelAnimationFrame(rafId);
                          setPlacedItems(prev => prev.map(i => i.id === item.id ? { ...i, rotation: finalRotation } : i));
                        };
                        window.addEventListener('touchmove', onMove as any, { passive: false });
                        window.addEventListener('touchend', onEnd);
                      }}
                      className="w-10 h-10 md:w-8 md:h-8 bg-white/5 text-white/40 rounded-full hover:bg-white hover:text-black transition-all flex items-center justify-center"
                    >
                      <i className="fa-solid fa-rotate text-[10px] md:text-[9px]"></i>
                    </button>

                    <div className="w-px h-6 md:h-4 bg-white/10 mx-1"></div>

                    <button
                      onClick={(e) => { e.stopPropagation(); setIsWarpMode(!isWarpMode); }}
                      className={`w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all ${isWarpMode ? 'bg-alpine-sap text-black' : 'bg-white/5 text-white'}`}
                    >
                      <i className="fa-solid fa-vector-square text-[10px] md:text-[9px]"></i>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CameraCapture;


import React, { useRef, useState, useEffect } from 'react';
import { PlacedItem, PerspectivePoints, VisualBehavior, AssetCategory, DrawingStroke, BrushType, Point, DrawingSegment } from '../src/domain/types';
import { DrawingElement } from './DrawingElement';

interface CameraCaptureProps {
  darkMode: boolean;
  placedItems: PlacedItem[];
  setPlacedItems: React.Dispatch<React.SetStateAction<PlacedItem[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  externalBackground?: string | null;
  // Updated onDropItem to include visualBehavior to match handleAddItem signature
  onDropItem?: (id: string, name: string, image: string, x: number, y: number, hue: number, sat: number, bri: number, description: string, visualBehavior: VisualBehavior, category: AssetCategory) => void;
  onFileUpload?: (files: FileList | File[], dropPos: { x: number, y: number }) => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  panOffset: { x: number, y: number };
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number, y: number }>>;
  interactionMode?: 'move' | 'draw' | 'text';
  onAddText?: (x: number, y: number) => void;
  setInteractionMode?: React.Dispatch<React.SetStateAction<'move' | 'draw' | 'text'>>;
  drawingStrokes?: DrawingStroke[];
  setDrawingStrokes?: React.Dispatch<React.SetStateAction<DrawingStroke[]>>;
  activeBrush?: { type: BrushType, color: string, width: number };
  onEditDrawing?: (id: string) => void;
  onSaveToHistory?: () => void;
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
  placedItems, setPlacedItems, selectedId, setSelectedId, externalBackground, onDropItem, onFileUpload, zoom, setZoom, panOffset, setPanOffset,
  interactionMode = 'move', onAddText, setInteractionMode,
  drawingStrokes = [], setDrawingStrokes, activeBrush, onEditDrawing, onSaveToHistory
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);
  const [isWarpMode, setIsWarpMode] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (externalBackground) {
      const img = new Image();
      img.onload = () => setAspectRatio(img.width / img.height);
      img.src = externalBackground;
    }
  }, [externalBackground]);

  // BACKGROUND PANNING
  const handleBackgroundPanStart = (e: React.MouseEvent | React.TouchEvent) => {
    // Only pan if we didn't click an item (already handled by setSelectedId(null) in parent)
    const isTouch = 'touches' in e;
    if (!isTouch && (e as React.MouseEvent).button !== 0) return;

    const startX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const startY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    const initialPan = { ...panOffset };

    const onMove = (mv: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in mv ? mv.touches[0].clientX : mv.clientX;
      const currentY = 'touches' in mv ? mv.touches[0].clientY : mv.clientY;
      
      const dx = currentX - startX;
      const dy = currentY - startY;

      const limitX = window.innerWidth * 0.8;
      const limitY = window.innerHeight * 0.8;

      setPanOffset({
        x: Math.max(-limitX, Math.min(limitX, initialPan.x + dx)),
        y: Math.max(-limitY, Math.min(limitY, initialPan.y + dy))
      });
    };

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  // HANDLERS UNIFICADOS (MOUSE + TOUCH)
  const handleInteractionStart = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    const isTouch = 'touches' in e;
    if (!isTouch && (e as React.MouseEvent).button !== 0) return;
    onSaveToHistory?.();
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
    onSaveToHistory?.();
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
    onSaveToHistory?.();
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

  const handleRotationStart = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    onSaveToHistory?.();
    e.stopPropagation();
    const item = placedItems.find(i => i.id === id);
    if (!item || !canvasRef.current) return;
    const el = itemRefs.current.get(id);

    const rect = canvasRef.current.getBoundingClientRect();
    const cx = rect.left + (item.x / 100) * rect.width;
    const cy = rect.top + (item.y / 100) * rect.height;

    const isTouch = 'touches' in e;
    const startX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const startY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

    const startAngle = Math.atan2(startY - cy, startX - cx);
    const initialRotation = item.rotation;
    let rafId: number;
    let finalRotation = initialRotation;

    const onMove = (mv: MouseEvent | TouchEvent) => {
      if ('touches' in mv) mv.preventDefault();
      const mvX = 'touches' in mv ? mv.touches[0].clientX : mv.clientX;
      const mvY = 'touches' in mv ? mv.touches[0].clientY : mv.clientY;
      const currentAngle = Math.atan2(mvY - cy, mvX - cx);
      const delta = (currentAngle - startAngle) * 180 / Math.PI;
      finalRotation = initialRotation + delta;

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
      setPlacedItems(prev => prev.map(i => i.id === id ? { ...i, rotation: finalRotation } : i));
    };

    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove as any, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  // DRAWING LOGIC
  const handleDrawingStart = (e: React.MouseEvent | React.TouchEvent) => {
    const isDrawingModeActive = interactionMode === 'draw';
    if (!isDrawingModeActive || !activeBrush || !setDrawingStrokes) return;
    e.stopPropagation();
    
    const isTouch = 'touches' in e;
    const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    isDrawingRef.current = true;
    
    if (activeBrush.type === 'eraser') {
      handleEraserAction(x, y);
    } else {
      const newStroke: DrawingStroke = {
        id: Math.random().toString(36).substr(2, 9),
        segments: [{
          points: [{ x, y }],
          color: activeBrush.color,
          width: activeBrush.width,
          opacity: activeBrush.type === 'highlighter' ? 0.4 : 1,
          type: activeBrush.type
        }],
        x: 0,
        y: 0,
        zIndex: 10
      };
      setCurrentStroke(newStroke);
    }
    
    const onMove = (mv: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      if (mv.cancelable && 'touches' in mv) mv.preventDefault();
      
      const mX = 'touches' in mv ? (mv as TouchEvent).touches[0].clientX : (mv as MouseEvent).clientX;
      const mY = 'touches' in mv ? (mv as TouchEvent).touches[0].clientY : (mv as MouseEvent).clientY;
      const curX = ((mX - rect.left) / rect.width) * 100;
      const curY = ((mY - rect.top) / rect.height) * 100;
      
      if (activeBrush.type === 'eraser') {
        handleEraserAction(curX, curY);
      } else {
        setCurrentStroke(prev => {
          if (!prev) return null;
          const segments = [...prev.segments];
          const lastSeg = { ...segments[segments.length - 1] };
          lastSeg.points = [...lastSeg.points, { x: curX, y: curY }];
          segments[segments.length - 1] = lastSeg;
          return { ...prev, segments };
        });
      }
    };
    
    const onEnd = () => {
      isDrawingRef.current = false;
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('touchend', onEnd);
      
      setCurrentStroke(prev => {
        if (prev && setDrawingStrokes) {
          setDrawingStrokes(old => [...old, prev]);
        }
        return null;
      });
    };
    
    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove as any, { passive: false });
    window.addEventListener('touchend', onEnd);
  };
  
  const handleEraserAction = (x: number, y: number) => {
    if (!setDrawingStrokes || !activeBrush || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const eraserRadiusPct = (activeBrush.width / 2 / rect.width) * 100;
    
    setDrawingStrokes(prev => {
      let changed = false;
      const nextStrokes = prev.map(stroke => {
        let strokeChanged = false;
        const newSegments: DrawingSegment[] = [];
        
        stroke.segments.forEach(seg => {
          let currentPoints: Point[] = [];
          
          seg.points.forEach(p => {
            const dx = p.x - x;
            const dy = p.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > eraserRadiusPct) {
              currentPoints.push(p);
            } else {
              strokeChanged = true;
              changed = true;
              if (currentPoints.length > 0) {
                newSegments.push({ ...seg, points: currentPoints });
                currentPoints = [];
              }
            }
          });
          
          if (currentPoints.length > 0) {
            newSegments.push({ ...seg, points: currentPoints });
          }
        });
        
        if (strokeChanged) {
          return { ...stroke, segments: newSegments };
        }
        return stroke;
      }).filter(s => s.segments.length > 0);
      
      return changed ? nextStrokes : prev;
    });
  };

  return (
    <div
      className="w-full h-full flex items-center justify-center relative select-none cursor-default overflow-hidden"
      onMouseDown={(e) => { 
        if (interactionMode === 'draw') {
          handleDrawingStart(e);
        } else if (interactionMode === 'text') {
          const rect = canvasRef.current!.getBoundingClientRect();
          const xPct = ((e.clientX - rect.left - panOffset.x - rect.width / 2) / zoom + rect.width / 2) / rect.width * 100;
          const yPct = ((e.clientY - rect.top - panOffset.y - rect.height / 2) / zoom + rect.height / 2) / rect.height * 100;
          onAddText?.(xPct, yPct);
        } else {
          setSelectedId(null); 
          setIsWarpMode(false);
          handleBackgroundPanStart(e);
        }
      }}
      onTouchStart={(e) => { 
        if (interactionMode === 'draw') {
          handleDrawingStart(e);
        } else if (interactionMode === 'text') {
          const rect = canvasRef.current!.getBoundingClientRect();
          const touch = e.touches[0];
          const xPct = ((touch.clientX - rect.left - panOffset.x - rect.width / 2) / zoom + rect.width / 2) / rect.width * 100;
          const yPct = ((touch.clientY - rect.top - panOffset.y - rect.height / 2) / zoom + rect.height / 2) / rect.height * 100;
          onAddText?.(xPct, yPct);
        } else {
          setSelectedId(null); 
          setIsWarpMode(false);
          handleBackgroundPanStart(e);
        }
      }}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const delta = -e.deltaY;
          const factor = Math.exp(delta / 500);
          setZoom(z => Math.max(0.2, Math.min(5, z * factor)));
        } else {
          // PANNING (Scroll with two fingers on trackpad)
          const limitX = window.innerWidth * 0.8;
          const limitY = window.innerHeight * 0.8;
          setPanOffset(prev => ({
            x: Math.max(-limitX, Math.min(limitX, prev.x - e.deltaX)),
            y: Math.max(-limitY, Math.min(limitY, prev.y - e.deltaY))
          }));
        }
      }}
    >
      <div
        ref={canvasRef}
        style={{ 
          aspectRatio: aspectRatio,
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.1s cubic-bezier(0.19, 1, 0.22, 1)'
        }}
        className={`relative w-full h-full ${externalBackground ? 'bg-[#1a1a1a] shadow-2xl border border-white/5' : 'bg-transparent'} overflow-visible rounded-2xl md:rounded-[3rem] transition-all duration-700`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const rect = canvasRef.current!.getBoundingClientRect();
          const dropX = ((e.clientX - rect.left) / rect.width) * 100;
          const dropY = ((e.clientY - rect.top) / rect.height) * 100;

          // HANDLE OS FILES
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileUpload?.(e.dataTransfer.files, { x: dropX, y: dropY });
            return;
          }

          // HANDLE INTERNAL JSON DATA
          const jsonData = e.dataTransfer.getData("application/json");
          if (jsonData) {
            try {
              const data = JSON.parse(jsonData);
              onDropItem?.(
                data.id,
                data.name,
                data.image,
                dropX,
                dropY,
                data.hueRotate,
                data.saturation,
                data.brightness,
                data.description,
                data.visualBehavior,
                data.category
              );
            } catch (err) {
              console.error("Internal drop error:", err);
            }
          }
        }}
      >
        {externalBackground && <img src={externalBackground} className="w-full h-full object-contain pointer-events-none" alt="" />}
        
        {/* DRAWING LAYER */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {drawingStrokes.map(stroke => (
            <DrawingElement key={stroke.id} stroke={stroke} />
          ))}
          {currentStroke && <DrawingElement stroke={currentStroke} />}
        </div>

        {placedItems.map(item => {
          const isSelected = selectedId === item.id;
          
          // RESPONSIVE SCALING LOGIC: Use percentages relative to container
          const BASE_SIZE_PCT = 25; // Base height as % of container height
          const itemH_pct = BASE_SIZE_PCT;
          const itemW_pct = (BASE_SIZE_PCT * item.aspectRatio) / aspectRatio;
          
          // Virtual dimensions for the perspective matrix (fixed internal grid)
          const virtualW = 1000 * (itemW_pct / 100);
          const virtualH = 1000 * (itemH_pct / 100);
          
          const p = item.perspective || { tl: { x: 0, y: 0 }, tr: { x: 0, y: 0 }, bl: { x: 0, y: 0 }, br: { x: 0, y: 0 } };
          const matrix = getPerspectiveMatrix(virtualW, virtualH, p);

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
                width: `${itemW_pct}%`,
                height: `${itemH_pct}%`,
                zIndex: (isSelected ? 1000 : 10) + placedItems.findIndex(i => i.id === item.id),
                touchAction: 'none',
              }}
              className={`absolute flex items-center justify-center cursor-move transition-shadow duration-300 ${isSelected ? 'shadow-[0_0_30px_rgba(255,255,255,0.1)]' : ''}`}
              onMouseDown={(e) => handleInteractionStart(item.id, e)}
              onTouchStart={(e) => handleInteractionStart(item.id, e)}
            >
              {isSelected && (
                <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-[10]">
                  <path
                    d={`M ${h.tl.x}% ${h.tl.y}% L ${h.tr.x}% ${h.tr.y}% L ${h.br.x}% ${h.br.y}% L ${h.bl.x}% ${h.bl.y}% Z`}
                    fill={isWarpMode ? "rgba(162,173,145,0.1)" : "transparent"}
                    stroke={isWarpMode ? "#A2AD91" : "rgba(255,255,255,0.4)"}
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                </svg>
              )}

              <div
                className="w-full h-full pointer-events-none"
                style={{ transform: matrix, transformOrigin: '0 0' }}
              >
                {item.textConfig ? (
                  <div
                    className="w-full h-full flex items-center justify-center p-2 text-center select-none"
                    style={{
                      fontFamily: item.textConfig.fontFamily,
                      fontSize: `${item.textConfig.fontSize}px`,
                      color: item.textConfig.color,
                      fontWeight: item.textConfig.fontWeight,
                      fontStyle: item.textConfig.italic ? 'italic' : 'normal',
                      textDecoration: item.textConfig.underline ? 'underline' : 'none',
                      textAlign: item.textConfig.align,
                      lineHeight: '1.2',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      filter: `hue-rotate(${item.hueRotate}deg) saturate(${item.saturation}) brightness(${item.brightness})`,
                      transform: `scaleX(${item.scaleX || 1})`,
                    }}
                  >
                    {item.textConfig.text}
                  </div>
                ) : (
                  <img
                    src={item.image}
                    className="w-full h-full object-contain drop-shadow-2xl"
                    style={{
                      filter: `hue-rotate(${item.hueRotate}deg) saturate(${item.saturation}) brightness(${item.brightness})`,
                      transform: `scaleX(${item.scaleX || 1})`,
                      display: (item.drawingStrokes && item.drawingStrokes.length > 0) ? 'none' : 'block'
                    }}
                    alt=""
                  />
                )}
                
                {item.drawingStrokes && (
                  <div className="absolute inset-0 pointer-events-none">
                    {item.drawingStrokes.map(stroke => (
                      <DrawingElement key={stroke.id} stroke={stroke} />
                    ))}
                  </div>
                )}
              </div>

              {isSelected && (
                <>
                  {!isWarpMode && (
                    <>
                      {/* ROTATION HANDLE (LOLLIPOP) */}
                      <div
                        onMouseDown={(e) => handleRotationStart(item.id, e)}
                        onTouchStart={(e) => handleRotationStart(item.id, e)}
                        className="absolute w-10 h-16 flex flex-col items-center justify-end z-[300] cursor-grab group origin-bottom"
                        style={{ 
                          left: `${(h.tl.x + h.tr.x) / 2}%`,
                          top: `${(h.tl.y + h.tr.y) / 2}%`,
                          transform: `translate(-50%, -100%) scale(${1 / (item.scale * zoom)})` 
                        }}
                      >
                        <div className="w-0.5 h-8 bg-white/80 shadow-sm"></div>
                        <div className="w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center transform group-active:scale-110 transition-transform">
                          <i className="fa-solid fa-rotate-right text-[8px] text-black/50"></i>
                        </div>
                      </div>

                      {/* TIRADORES DE ESCALA MEJORADOS - AHORA INTEGRADOS CON WARP */}
                      <div onMouseDown={(e) => handleResizeStart(item.id, e)} onTouchStart={(e) => handleResizeStart(item.id, e)} style={{ left: `${h.tl.x}%`, top: `${h.tl.y}%`, transform: `translate(-50%, -50%) scale(${1 / (item.scale * zoom)})` }} className="absolute w-10 h-10 flex items-center justify-center z-[300] cursor-nwse-resize group">
                        <div className="w-5 h-5 bg-white rounded-full border-2 border-black shadow-lg group-active:scale-125 transition-transform"></div>
                      </div>
                      <div onMouseDown={(e) => handleResizeStart(item.id, e)} onTouchStart={(e) => handleResizeStart(item.id, e)} style={{ left: `${h.tr.x}%`, top: `${h.tr.y}%`, transform: `translate(-50%, -50%) scale(${1 / (item.scale * zoom)})` }} className="absolute w-10 h-10 flex items-center justify-center z-[300] cursor-nesw-resize group">
                        <div className="w-5 h-5 bg-white rounded-full border-2 border-black shadow-lg group-active:scale-125 transition-transform"></div>
                      </div>
                      <div onMouseDown={(e) => handleResizeStart(item.id, e)} onTouchStart={(e) => handleResizeStart(item.id, e)} style={{ left: `${h.bl.x}%`, top: `${h.bl.y}%`, transform: `translate(-50%, -50%) scale(${1 / (item.scale * zoom)})` }} className="absolute w-10 h-10 flex items-center justify-center z-[300] cursor-nesw-resize group">
                        <div className="w-5 h-5 bg-white rounded-full border-2 border-black shadow-lg group-active:scale-125 transition-transform"></div>
                      </div>
                      <div onMouseDown={(e) => handleResizeStart(item.id, e)} onTouchStart={(e) => handleResizeStart(item.id, e)} style={{ left: `${h.br.x}%`, top: `${h.br.y}%`, transform: `translate(-50%, -50%) scale(${1 / (item.scale * zoom)})` }} className="absolute w-10 h-10 flex items-center justify-center z-[300] cursor-nwse-resize group">
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
                            transform: `translate(-50%, -50%) scale(${1 / (item.scale * zoom)})`
                          }}
                        >
                          <div className="w-5 h-5 bg-alpine-sap rounded-full border-2 border-black shadow-md transition-transform group-active:bg-white group-active:scale-110"></div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* BARRA DE ACCIONES FLOTANTE ADAPTADA */}
                  <div
                    className="absolute -bottom-24 left-1/2 flex items-center gap-3 bg-black/95 backdrop-blur-3xl p-2 rounded-full border border-white/10 z-[400] shadow-2xl animate-fade-in-up origin-top"
                    style={{ transform: `translateX(-50%) scale(${1 / (item.scale * zoom)})` }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); onSaveToHistory?.(); setPlacedItems(prev => prev.filter(i => i.id !== item.id)); }}
                      className="w-10 h-10 md:w-8 md:h-8 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                    >
                      <i className="fa-solid fa-trash-can text-[10px] md:text-[9px]"></i>
                    </button>

                    <button
                      onMouseDown={(e) => handleRotationStart(item.id, e)}
                      onTouchStart={(e) => handleRotationStart(item.id, e)}
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

                    <div className="w-px h-6 md:h-4 bg-white/10 mx-1"></div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlacedItems(prev => prev.map(i => i.id === item.id ? { ...i, scaleX: (i.scaleX || 1) * -1 } : i));
                      }}
                      className="w-10 h-10 md:w-8 md:h-8 bg-white/5 text-white/40 rounded-full hover:bg-white hover:text-black transition-all flex items-center justify-center"
                    >
                      <i className="fa-solid fa-right-left text-[10px] md:text-[9px]"></i>
                    </button>

                    {item.drawingStrokes && (
                      <>
                        <div className="w-px h-6 md:h-4 bg-white/10 mx-1"></div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditDrawing?.(item.id);
                          }}
                          className="w-10 h-10 md:w-8 md:h-8 bg-alpine-sap/10 text-alpine-sap rounded-full hover:bg-alpine-sap hover:text-black transition-all flex items-center justify-center"
                          title="Editar Dibujo"
                        >
                          <i className="fa-solid fa-pencil text-[10px] md:text-[9px]"></i>
                        </button>
                      </>
                    )}
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

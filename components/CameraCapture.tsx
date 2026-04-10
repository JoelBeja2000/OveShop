
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { PlacedItem, PerspectivePoints, VisualBehavior, AssetCategory, DrawingStroke, BrushType, Point, DrawingSegment } from '../src/domain/types';
import { DrawingElement } from './DrawingElement';

interface CameraCaptureProps {
  darkMode: boolean;
  placedItems: PlacedItem[];
  setPlacedItems: React.Dispatch<React.SetStateAction<PlacedItem[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  externalBackground?: string | null;
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
  sceneResolution?: { w: number, h: number } | null;
  sceneBgColor?: string;
  isTransparent?: boolean;
  editingItemId?: string | null;
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
  drawingStrokes = [], setDrawingStrokes, activeBrush, onEditDrawing, onSaveToHistory,
  sceneResolution, sceneBgColor = '#ffffff', isTransparent = false, editingItemId
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const activeDrawingSvgRef = useRef<SVGSVGElement>(null);
  const globalDrawingSvgRef = useRef<SVGSVGElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);
  const [isWarpMode, setIsWarpMode] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (externalBackground) {
      const img = new Image();
      img.onload = () => setAspectRatio(img.width / img.height);
      img.src = externalBackground;
    }
  }, [externalBackground]);

  const getLocalCoords = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const svg = globalDrawingSvgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    if ('touches' in e && e.touches.length > 0) {
      pt.x = e.touches[0].clientX;
      pt.y = e.touches[0].clientY;
    } else {
      pt.x = (e as MouseEvent).clientX;
      pt.y = (e as MouseEvent).clientY;
    }
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const localPt = pt.matrixTransform(ctm.inverse());
    return { x: localPt.x, y: localPt.y };
  };

  const handleBackgroundPanStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (interactionMode === 'draw') return;
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

  const handleInteractionStart = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    if (interactionMode === 'draw') return;
    const isTouch = 'touches' in e;
    if (!isTouch && (e as React.MouseEvent).button !== 0) return;
    onSaveToHistory?.();
    e.stopPropagation();

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
      if ('touches' in mv) mv.preventDefault();
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

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('touchend', onEnd);
      if (rafId) cancelAnimationFrame(rafId);
      let finalX = initialX;
      let finalY = initialY;
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
    const baseW = 250 * (item.aspectRatio || 1);
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

  const handleDrawingStart = (e: React.MouseEvent | React.TouchEvent) => {
    const isDrawingModeActive = interactionMode === 'draw';
    if (!isDrawingModeActive || !activeBrush || !setDrawingStrokes) return;
    
    const mappingSvg = globalDrawingSvgRef.current;
    if (!mappingSvg) return;

    e.stopPropagation();
    const coords = getLocalCoords(e);
    isDrawingRef.current = true;
    
    const generateId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `stroke_${crypto.randomUUID().split('-')[0]}_${Date.now().toString(36)}`;
      }
      return `stroke_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    };

    if (activeBrush.type === 'eraser') {
      handleEraserAction(coords.x, coords.y, mappingSvg);
    } else {
      const newStroke: DrawingStroke = {
        id: generateId(),
        segments: [{
          points: [coords],
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
      currentStrokeRef.current = newStroke;
    }

    const onMove = (mv: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      if ('touches' in mv) mv.preventDefault();
      
      const moveCoords = getLocalCoords(mv);
      if (activeBrush.type === 'eraser') {
        handleEraserAction(moveCoords.x, moveCoords.y, mappingSvg);
      } else {
        setCurrentStroke(prev => {
          if (!prev) return null;
          const segments = [...prev.segments];
          const lastSeg = { ...segments[segments.length - 1] };
          lastSeg.points = [...lastSeg.points, moveCoords];
          segments[segments.length - 1] = lastSeg;
          const updated = { ...prev, segments };
          currentStrokeRef.current = updated;
          return updated;
        });
      }
    };

    const onEnd = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('touchend', onEnd);

      const finishedStroke = currentStrokeRef.current;
      if (finishedStroke && setDrawingStrokes) {
        setDrawingStrokes(old => [...old, finishedStroke]);
      }
      setCurrentStroke(null);
      currentStrokeRef.current = null;
    };

    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove as any, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  const handleEraserAction = (x: number, y: number, svg: SVGSVGElement) => {
    if (!setDrawingStrokes || !activeBrush) return;
    const eraserRadius = activeBrush.width / 2;
    
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
            if (dist > eraserRadius) {
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
        if (strokeChanged) return { ...stroke, segments: newSegments };
        return stroke;
      }).filter(s => s.segments.length > 0);
      return changed ? nextStrokes : prev;
    });
  };

  const effectiveRatio = sceneResolution ? (sceneResolution.w / sceneResolution.h) : (aspectRatio || 1);

  const transparencyGridStyle = {
    backgroundImage: `linear-gradient(45deg, #f0f0f0 25%, transparent 25%), 
                      linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #f0f0f0 75%), 
                      linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)`,
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
    backgroundColor: '#ffffff'
  };

  return (
    <div
      className="w-full h-full flex items-center justify-center relative select-none cursor-default overflow-hidden"
      onMouseDown={(e) => { 
        if (interactionMode === 'move') {
          setSelectedId(null); 
          setIsWarpMode(false);
          handleBackgroundPanStart(e);
        } else if (interactionMode === 'text') {
          const rect = canvasRef.current!.getBoundingClientRect();
          const xPct = ((e.clientX - rect.left) / rect.width) * 100;
          const yPct = ((e.clientY - rect.top) / rect.height) * 100;
          onAddText?.(xPct, yPct);
        }
      }}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const delta = -e.deltaY;
          const factor = Math.exp(delta / 500);
          setZoom(z => Math.max(0.2, Math.min(5, z * factor)));
        } else {
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
          aspectRatio: effectiveRatio,
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: interactionMode === 'draw' ? 'none' : 'transform 0.1s cubic-bezier(0.19, 1, 0.22, 1)',
          backgroundColor: !isTransparent ? sceneBgColor : undefined,
          ...(isTransparent ? transparencyGridStyle : {})
        }}
        className={`relative w-full h-full shadow-2xl border border-white/5 overflow-visible rounded-2xl md:rounded-[3rem] transition-all duration-700`}
      >
        {externalBackground && <img src={externalBackground} className="w-full h-full object-contain pointer-events-none" alt="" />}
        
        {placedItems.map(item => {
          const isSelected = selectedId === item.id;
          let itemW_pct, itemH_pct;
          if (item.drawingBounds) {
            itemW_pct = item.drawingBounds.width;
            itemH_pct = item.drawingBounds.height;
          } else {
            const BASE_SIZE_PCT = 25; 
            itemH_pct = BASE_SIZE_PCT;
            itemW_pct = (BASE_SIZE_PCT * (item.aspectRatio || 1)) / aspectRatio;
          }
          const p = item.perspective || { tl: { x: 0, y: 0 }, tr: { x: 0, y: 0 }, bl: { x: 0, y: 0 }, br: { x: 0, y: 0 } };
          const virtualW = 1000 * (itemW_pct / 100);
          const virtualH = virtualW / (item.aspectRatio || 1);
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
                pointerEvents: (interactionMode === 'draw') ? (isSelected ? 'auto' : 'none') : 'auto',
              }}
              className={`absolute flex items-center justify-center cursor-move transition-shadow duration-300 ${isSelected ? 'shadow-[0_0_30px_rgba(255,255,255,0.1)]' : ''}`}
              onMouseDown={(e) => handleInteractionStart(item.id, e)}
              onTouchStart={(e) => handleInteractionStart(item.id, e)}
            >
              {isSelected && !isWarpMode && interactionMode === 'move' && (
                <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-[10]" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d={`M ${h.tl.x} ${h.tl.y} L ${h.tr.x} ${h.tr.y} L ${h.br.x} ${h.br.y} L ${h.bl.x} ${h.bl.y} Z`} fill="transparent" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeDasharray="4 4" />
                </svg>
              )}

              <div className="w-full h-full pointer-events-none overflow-visible" style={{ transform: matrix, transformOrigin: '0 0' }}>
                {item.textConfig ? (
                  <div className="w-full h-full flex items-center justify-center p-2 text-center select-none" style={{
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
                  }} dangerouslySetInnerHTML={item.textConfig.isRichText && item.textConfig.richText ? { __html: item.textConfig.richText } : undefined}>
                    {!item.textConfig.isRichText || !item.textConfig.richText ? item.textConfig.text : null}
                  </div>
                ) : (
                  <img src={item.image || undefined} className="w-full h-full object-contain drop-shadow-2xl" style={{ filter: `hue-rotate(${item.hueRotate}deg) saturate(${item.saturation}) brightness(${item.brightness})`, transform: `scaleX(${item.scaleX || 1})`, display: (item.drawingStrokes && item.drawingStrokes.length > 0 && !item.image) ? 'none' : 'block' }} alt="" />
                )}
                
                <div className="absolute inset-0 pointer-events-none overflow-visible w-full h-full">
                  {item.drawingStrokes && !(item.id === editingItemId && interactionMode === 'draw') && (
                    item.drawingStrokes.map((stroke, sidx) => {
                      const bw = item.drawingBounds ? (item.drawingBounds.width / 100) * 1000 : 1000;
                      const bh = item.drawingBounds ? (item.drawingBounds.height / 100) * (1000 / effectiveRatio) : 1000;
                      return <DrawingElement key={`static-${stroke.id}-${sidx}`} stroke={stroke} canvasWidth={bw} canvasHeight={bh} />;
                    })
                  )}
                  {item.id === editingItemId && (
                    <svg ref={activeDrawingSvgRef} viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-0 pointer-events-none" preserveAspectRatio="none" />
                  )}
                </div>
              </div>

              {isSelected && interactionMode === 'move' && (
                <>
                  {!isWarpMode && interactionMode === 'move' && (
                    <>
                      <div onMouseDown={(e) => handleRotationStart(item.id, e)} onTouchStart={(e) => handleRotationStart(item.id, e)} className="absolute w-10 h-16 flex flex-col items-center justify-end z-[300] cursor-grab group origin-bottom" style={{ left: `${(h.tl.x + h.tr.x) / 2}%`, top: `${(h.tl.y + h.tr.y) / 2}%`, transform: `translate(-50%, -100%) scale(${1 / (item.scale * zoom)})` }}>
                        <div className="w-0.5 h-8 bg-white/80 shadow-sm"></div>
                        <div className="w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center transform group-active:scale-110 transition-transform">
                          <i className="fa-solid fa-rotate-right text-[8px] text-black/50"></i>
                        </div>
                      </div>
                      <div onMouseDown={(e) => handleResizeStart(item.id, e)} className="absolute w-6 h-6 z-[300] cursor-nwse-resize" style={{ left: `${h.tl.x}%`, top: `${h.tl.y}%`, transform: `translate(-50%, -50%) scale(${1 / (item.scale * zoom)})` }}><div className="w-3 h-3 bg-white rounded-full border border-black shadow"></div></div>
                      <div onMouseDown={(e) => handleResizeStart(item.id, e)} className="absolute w-6 h-6 z-[300] cursor-nesw-resize" style={{ left: `${h.tr.x}%`, top: `${h.tr.y}%`, transform: `translate(-50%, -50%) scale(${1 / (item.scale * zoom)})` }}><div className="w-3 h-3 bg-white rounded-full border border-black shadow"></div></div>
                      <div onMouseDown={(e) => handleResizeStart(item.id, e)} className="absolute w-6 h-6 z-[300] cursor-nesw-resize" style={{ left: `${h.bl.x}%`, top: `${h.bl.y}%`, transform: `translate(-50%, -50%) scale(${1 / (item.scale * zoom)})` }}><div className="w-3 h-3 bg-white rounded-full border border-black shadow"></div></div>
                      <div onMouseDown={(e) => handleResizeStart(item.id, e)} className="absolute w-6 h-6 z-[300] cursor-nwse-resize" style={{ left: `${h.br.x}%`, top: `${h.br.y}%`, transform: `translate(-50%, -50%) scale(${1 / (item.scale * zoom)})` }}><div className="w-3 h-3 bg-white rounded-full border border-black shadow"></div></div>
                    </>
                  )}
                  {isWarpMode && (
                    <div className="absolute inset-0 z-[300] pointer-events-none">
                      {['tl', 'tr', 'br', 'bl'].map((corner) => (
                        <div key={corner} onMouseDown={(e) => handleWarpPointStart(item.id, corner as keyof PerspectivePoints, e)} className="absolute w-8 h-8 flex items-center justify-center pointer-events-auto cursor-crosshair group/point" style={{ left: `${h[corner as keyof typeof h].x}%`, top: `${h[corner as keyof typeof h].y}%`, transform: `translate(-50%, -50%) scale(${1 / (item.scale * zoom)})` }}>
                          <div className="w-4 h-4 bg-alpine-sap rounded-full border border-black shadow-md transiton-transform group-active:scale-110"></div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="absolute -bottom-24 left-1/2 flex items-center gap-3 bg-black/95 backdrop-blur-3xl p-2 rounded-full border border-white/10 z-[400] shadow-2xl animate-fade-in-up origin-top" style={{ transform: `translateX(-50%) scale(${1 / (item.scale * zoom)})` }} onMouseDown={e => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); setPlacedItems(prev => prev.filter(i => i.id !== item.id)); }} className="w-8 h-8 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                      <i className="fa-solid fa-trash-can text-[10px]"></i>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setIsWarpMode(!isWarpMode); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isWarpMode ? 'bg-alpine-sap text-black' : 'bg-white/5 text-white'}`}>
                      <i className="fa-solid fa-vector-square text-[10px]"></i>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onEditDrawing?.(item.id); }} className="w-8 h-8 bg-alpine-sap/10 text-alpine-sap rounded-full hover:bg-alpine-sap hover:text-black transition-all flex items-center justify-center" title="Editar Dibujo">
                      <i className="fa-solid fa-pencil text-[10px]"></i>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {interactionMode === 'draw' && (
          <div 
            className="absolute inset-0 z-[3000] cursor-crosshair"
            onMouseDown={handleDrawingStart}
            onTouchStart={handleDrawingStart}
          >
            <div className="absolute inset-0 pointer-events-none overflow-visible">
               {/* Global drawings and currently being drawn strokes */}
               {drawingStrokes.map((stroke, idx) => <DrawingElement key={`global-${stroke.id}-${idx}`} stroke={stroke} canvasWidth={1000} canvasHeight={1000 / effectiveRatio} />)}
               {currentStroke && <DrawingElement stroke={currentStroke} canvasWidth={1000} canvasHeight={1000 / effectiveRatio} />}
            </div>
            <svg ref={globalDrawingSvgRef} viewBox={`0 0 1000 ${1000 / effectiveRatio}`} className="absolute inset-0 w-full h-full opacity-0 pointer-events-none" preserveAspectRatio="none" />
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;

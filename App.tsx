import React, { useState, useEffect, useRef } from 'react';
import { PlacedItem, VisualBehavior, AssetCategory, AssetItem, DrawingStroke, BrushType, Point, DrawingSegment, TextConfig } from './src/domain/types';
import { GeminiAIAdapter } from './src/infrastructure/ai/GeminiAIAdapter';
import { CanvasCollageAdapter } from './src/infrastructure/canvas/CanvasCollageAdapter';
import AssetCarousel from './components/AssetCarousel';
import CameraCapture from './components/CameraCapture';
import WebcamCapture from './components/WebcamCapture';
import { TextProperties } from './components/TextProperties';
import { DrawingProperties } from './components/DrawingProperties';
import ComparisonSlider from './components/ComparisonSlider';
import ApiKeyModal from './components/ApiKeyModal';
import { CanvasConfigModal } from './components/CanvasConfigModal';
import { BrushToolbar } from './components/BrushToolbar';
import { DrawingElement } from './components/DrawingElement';
import Navbar from './components/Navbar';

interface ColorVariantItem extends AssetItem {
  hueRotate?: number;
  saturation?: number;
  brightness?: number;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const getSupportedAspectRatio = (ratio: number): "1:1" | "4:3" | "3:4" | "9:16" | "16:9" => {
  if (ratio > 1.5) return "16:9";
  if (ratio > 1.2) return "4:3";
  if (ratio < 0.6) return "9:16";
  if (ratio < 0.8) return "3:4";
  return "1:1";
};

const App: React.FC = () => {
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [imageRatio, setImageRatio] = useState<number>(1);
  const [isLeftBarOpen, setIsLeftBarOpen] = useState(true);
  const [isRightBarOpen, setIsRightBarOpen] = useState(true);
  const [drawingColorLabels, setDrawingColorLabels] = useState<Record<string, string>>({});
  const [customPalette, setCustomPalette] = useState<string[]>(JSON.parse(localStorage.getItem('oveshop_custom_palette_v2') || '[]'));

  const [isRendering, setIsRendering] = useState(false);
  const [renderedImage, setRenderedImage] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  const [activeMobileTab, setActiveMobileTab] = useState<'scene' | 'shop'>('scene');
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string | null>(localStorage.getItem('gemini_api_key'));
  const [relationGroups, setRelationGroups] = useState<Record<string, { prompt: string, color: string }>>({});
  const [isLinkingId, setIsLinkingId] = useState<string | null>(null);
  const [userAssets, setUserAssets] = useState<ColorVariantItem[]>([]);
  const [sceneResolution, setSceneResolution] = useState<{ w: number, h: number } | null>(null);
  const [sceneBgColor, setSceneBgColor] = useState<string>('#1a1a1a');
  const [isTransparent, setIsTransparent] = useState<boolean>(false);
  const [canvasZoom, setCanvasZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [drawingStrokes, setDrawingStrokes] = useState<DrawingStroke[]>([]);
  const [interactionMode, setInteractionMode] = useState<'move' | 'draw' | 'text'>('move');
  const isDrawingMode = interactionMode === 'draw';
  const [activeBrushType, setActiveBrushType] = useState<BrushType>('pencil');
  const [activeBrushColor, setActiveBrushColor] = useState('#A2AD91');
  const [activeBrushWidth, setActiveBrushWidth] = useState(3);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isCanvasModalOpen, setIsCanvasModalOpen] = useState(false);
  const [historyStack, setHistoryStack] = useState<PlacedItem[][]>([]);
  const [futureStack, setFutureStack] = useState<PlacedItem[][]>([]);

  const usedDrawingColors = React.useMemo(() => {
    const uniqueColors = new Set<string>();
    drawingStrokes.forEach(stroke => {
      stroke.segments.forEach(segment => {
        uniqueColors.add(segment.color.toLowerCase());
      });
    });
    // Add current brush color unless it's eraser
    if (activeBrushType !== 'eraser') {
      uniqueColors.add(activeBrushColor.toLowerCase());
    }
    return Array.from(uniqueColors);
  }, [drawingStrokes, activeBrushColor, activeBrushType]);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const saveToHistory = (currentItems: PlacedItem[]) => {
    setHistoryStack(prev => [...prev.slice(-49), currentItems]);
    setFutureStack([]);
  };

  const undo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    setFutureStack(prev => [...prev, placedItems]);
    setHistoryStack(prev => prev.slice(0, -1));
    setPlacedItems(previous);
  };

  const redo = () => {
    if (futureStack.length === 0) return;
    const next = futureStack[futureStack.length - 1];
    setHistoryStack(prev => [...prev, placedItems]);
    setFutureStack(prev => prev.slice(0, -1));
    setPlacedItems(next);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyStack, futureStack, placedItems]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      // FORCE FIX: Set the correct key provided by user
      const correctKey = 'AIzaSyD-vSinXxuPCk6lEs2HsU0RBOEJUdIn2QE';
      const storedKey = localStorage.getItem('gemini_api_key');

      if (storedKey !== correctKey) {
        localStorage.setItem('gemini_api_key', correctKey);
        setUserApiKey(correctKey);
        setHasApiKey(true);
      } else if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } else if (storedKey) {
        setHasApiKey(true);
      }
    };
    checkKey();
    document.documentElement.classList.add('dark');
  }, []);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    } else {
      setApiKeyModalOpen(true);
    }
  };

  const handleAddCustomColor = (color: string) => {
    const alpineColors = ['#A2AD91', '#ffffff', '#FFC5C5', '#C5D9FF', '#FFE0C5', '#000000'];
    const normalized = color.toLowerCase();
    
    setCustomPalette(prev => {
      // Ignore if it's one of the basic alpine colors
      if (alpineColors.map(c => c.toLowerCase()).includes(normalized)) {
        return prev;
      }
      
      // Move to front if already exists, otherwise add to front
      const filtered = prev.filter(c => c.toLowerCase() !== normalized);
      const next = [color, ...filtered].slice(0, 24); // Limit to 24 colors
      
      localStorage.setItem('oveshop_custom_palette_v2', JSON.stringify(next));
      return next;
    });
  };

  const handleRemoveCustomColor = (color: string) => {
    setCustomPalette(prev => {
      const next = prev.filter(c => c.toLowerCase() !== color.toLowerCase());
      localStorage.setItem('oveshop_custom_palette_v2', JSON.stringify(next));
      return next;
    });
  };

  const handleFinishDrawing = () => {
    if (interactionMode !== 'draw') return;
    if (drawingStrokes.length > 0) {
      setPlacedItems(prev => {
        const item = prev.find(i => i.id === editingItemId);
        let globalPoints: Point[] = [];
        let strokesInGlobalSpace: DrawingStroke[] = [];

        if (item) {
          strokesInGlobalSpace = drawingStrokes.map(s => ({
            ...s,
            segments: s.segments.map(seg => ({
              ...seg,
              points: seg.points.map(p => {
                const gx = item.x - (item.drawingBounds?.width || 0)/2 + (p.x / 100) * (item.drawingBounds?.width || 0);
                const gy = item.y - (item.drawingBounds?.height || 0)/2 + (p.y / 100) * (item.drawingBounds?.height || 0);
                globalPoints.push({ x: gx, y: gy });
                return { x: gx, y: gy };
              })
            }))
          }));
        } else {
          strokesInGlobalSpace = drawingStrokes;
          drawingStrokes.forEach(s => s.segments.forEach(seg => seg.points.forEach(p => globalPoints.push(p))));
        }

        if (globalPoints.length === 0) return prev;
        let minX = 100, minY = 100, maxX = 0, maxY = 0;
        globalPoints.forEach(p => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        });

        const w = Math.max(2, maxX - minX);
        const h = Math.max(2, maxY - minY);
        const cx = minX + w / 2;
        const cy = minY + h / 2;

        // Calculate a scale factor to keep stroke width consistent visually.
        // If the box expands, the local coordinates span more physical space,
        // so we must decrease the numerical width to match.
        const wOld = item?.drawingBounds?.width || 100;
        const scaleFactor = wOld / w;

        // 3. Normalize all strokes to new 0-100 local space
        const normalized = strokesInGlobalSpace.map(s => ({
          ...s,
          segments: s.segments.map(seg => ({
            ...seg,
            points: seg.points.map(p => ({
              x: ((p.x - minX) / w) * 100,
              y: ((p.y - minY) / h) * 100
            })),
            width: seg.width * scaleFactor
          }))
        }));

        if (item) {
          return prev.map(i => i.id === editingItemId ? {
            ...i,
            x: cx, y: cy,
            drawingBounds: { minX, minY, width: w, height: h },
            drawingStrokes: normalized,
            aspectRatio: w / h
          } : i);
        } else {
          const newItem: PlacedItem = {
            id: `draw_${Date.now()}`,
            itemId: 'system-drawing',
            name: 'Dibujo Personalizado',
            image: '',
            x: cx, y: cy,
            hueRotate: 0, saturation: 1, brightness: 1,
            scale: 1, rotation: 1,
            description: 'Dibujo creado manualmente',
            visualBehavior: 'generative',
            drawingStrokes: normalized,
            drawingBounds: { minX, minY, width: w, height: h },
            aspectRatio: w / h,
            colorLabels: drawingColorLabels
          };
          return [...prev, newItem];
        }
      });
    }
    setInteractionMode('move');
    setEditingItemId(null);
    setDrawingStrokes([]);
    setSelectedId(null);
  };

  const handleExitDrawing = () => {
    setDrawingStrokes([]);
    setDrawingColorLabels({});
    setEditingItemId(null);
    setInteractionMode('move');
  };

  const handleToggleDrawMode = () => {
    if (interactionMode === 'draw') {
      handleFinishDrawing();
    } else {
      handleSelectElement(selectedId);
      if (interactionMode !== 'draw') setInteractionMode('draw');
    }
  };

  const moveLayer = (id: string, direction: 'up' | 'down', isBlock: boolean = false) => {
    saveToHistory(placedItems);
    setPlacedItems(prev => {
      if (!isBlock) {
        // SIMPLE INDIVIDUAL SWAP
        const index = prev.findIndex(item => item.id === id);
        if (index === -1) return prev;
        const newItems = [...prev];
        if (direction === 'down' && index > 0) {
          [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
        } else if (direction === 'up' && index < prev.length - 1) {
          [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        }
        return newItems;
      }

      // BLOCK-AWARE SWAP
      const elements: (PlacedItem | { groupId: string; items: PlacedItem[] })[] = [];
      const groupMap: Record<string, { groupId: string; items: PlacedItem[] }> = {};
      
      prev.forEach(item => {
        if (!item.groupId) {
          elements.push(item);
        } else {
          if (!groupMap[item.groupId]) {
            groupMap[item.groupId] = { groupId: item.groupId, items: [] };
            elements.push(groupMap[item.groupId]);
          }
          groupMap[item.groupId].items.push(item);
        }
      });

      const elIdx = elements.findIndex(el => {
        if ('id' in el) return el.id === id;
        return el.items.some(it => it.id === id);
      });

      if (elIdx === -1) return prev;

      const newElements = [...elements];
      if (direction === 'down' && elIdx > 0) {
        [newElements[elIdx], newElements[elIdx - 1]] = [newElements[elIdx - 1], newElements[elIdx]];
      } else if (direction === 'up' && elIdx < elements.length - 1) {
        [newElements[elIdx], newElements[elIdx + 1]] = [newElements[elIdx + 1], newElements[elIdx]];
      } else {
        return prev;
      }

      const flattened: PlacedItem[] = [];
      newElements.forEach(el => {
        if ('id' in el) {
          flattened.push(el);
        } else {
          flattened.push(...el.items);
        }
      });
      return flattened;
    });
  };
  
  const handleSelectElement = (id: string | null) => {
    setSelectedId(id);
    if (id) {
      const item = placedItems.find(i => i.id === id);
      if (item?.drawingStrokes && item.drawingBounds) {
        setInteractionMode('move');
        setEditingItemId(id);
        if (item.colorLabels) setDrawingColorLabels(item.colorLabels);
        
        const bounds = item.drawingBounds;
        setDrawingStrokes(item.drawingStrokes);
      } else if (item?.textConfig) {
        setInteractionMode('text');
        setEditingItemId(id);
      } else {
        if (interactionMode !== 'move') {
          setInteractionMode('move');
          setEditingItemId(null);
          setDrawingStrokes([]);
        }
      }
    } else {
      if (editingItemId) {
        setInteractionMode('move');
        setEditingItemId(null);
        setDrawingStrokes([]);
      }
    }
  };
  const generateId = () => `id_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;

  const handleAddText = (x: number, y: number) => {
    saveToHistory(placedItems);
    const newId = generateId();
    const newItem: PlacedItem = {
      id: newId,
      itemId: 'system-text',
      name: 'Texto',
      description: 'Capa de texto',
      x,
      y,
      scale: 1.5,
      aspectRatio: 2, 
      rotation: 0,
      image: '', 
      visualBehavior: 'strict',
      perspective: { tl: { x: 0, y: 0 }, tr: { x: 0, y: 0 }, bl: { x: 0, y: 0 }, br: { x: 0, y: 0 } },
      textConfig: {
        text: 'Escribe aquí...',
        fontSize: 32,
        color: '#ffffff',
        fontFamily: 'system-ui',
        fontWeight: '900',
        italic: false,
        underline: false,
        align: 'center',
        isRichText: false,
        richText: ''
      }
    };
    setPlacedItems(prev => [...prev, newItem]);
    setSelectedId(newId);
    setInteractionMode('move'); 
  };

  const handleAddItem = (itemId: string, name: string, image: string, x: number, y: number, h: number, s: number, b: number, description: string, visualBehavior: VisualBehavior, category: AssetCategory) => {
    // Redundant safety check to prevent rapid-click duplicates
    if (placedItems.some(item => item.itemId === itemId)) return;

    saveToHistory(placedItems);
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      const newId = generateId();
      setPlacedItems(prev => {
        const next = [...prev, {
          id: newId,
          itemId,
          name,
          description,
          image,
          x,
          y,
          scale: 1,
          aspectRatio: ratio,
          rotation: 0,
          hueRotate: h,
          saturation: s,
          brightness: b,
          visualBehavior,
          occlusionMode: (category === AssetCategory.BACKGROUND || category === AssetCategory.EFFECT) ? 'destroy' : 'overlay',
          perspective: { tl: { x: 0, y: 0 }, tr: { x: 0, y: 0 }, bl: { x: 0, y: 0 }, br: { x: 0, y: 0 } }
        }];
        return next;
      });
      setSelectedId(newId);
      if (window.innerWidth < 768) setActiveMobileTab('scene');
    };
    img.src = image;
  };

  const handleUpdateText = (id: string, config: Partial<TextConfig>) => {
    setPlacedItems(prev => prev.map(item => 
      item.id === id ? { ...item, textConfig: { ...item.textConfig!, ...config } } : item
    ));
  };

  const handleUpdateItem = (id: string, updates: Partial<PlacedItem>) => {
    setPlacedItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (backgroundImage || placedItems.length > 0) {
        e.preventDefault();
        e.returnValue = ''; // Standard for showing confirmation dialog
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'v' || e.key === 'V') setInteractionMode('move');
      if (e.key === 'b' || e.key === 'B') setInteractionMode('draw');
      if (e.key === 't' || e.key === 'T') setInteractionMode('text');
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') redo();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [backgroundImage, placedItems.length, historyStack.length, futureStack.length]);

  const handleUserFileUpload = (files: FileList | File[], dropPos?: { x: number, y: number }) => {
    Array.from(files).forEach((file: File, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
          const assetId = `user_asset_${generateId()}`;
        const newAsset: ColorVariantItem = {
          id: assetId,
          name: file.name.split('.')[0],
          category: AssetCategory.INVENTORY,
          visualBehavior: 'strict',
          image: dataUrl,
          description: 'Asset cargado localmente'
        };
        
        setUserAssets(prev => [newAsset, ...prev]);

        // If it was a drop on canvas, place the first item immediately
        if (dropPos && index === 0) {
          handleAddItem(
            newAsset.id,
            newAsset.name,
            newAsset.image,
            dropPos.x,
            dropPos.y,
            0, 1, 1,
            newAsset.description,
            newAsset.visualBehavior as VisualBehavior,
            newAsset.category
          );
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setUserApiKey(key);
    setHasApiKey(true);
    setApiKeyModalOpen(false);
  };

  const handleResetApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setUserApiKey(null);
    setHasApiKey(false);
    setApiKeyModalOpen(true);
  };

  const handleResetProject = () => {
    setPlacedItems([]);
    setBackgroundImage(null);
    setSceneResolution(null);
    setRenderedImage(null);
    setShowComparison(false);
    setDrawingStrokes([]);
    setRelationGroups({});
    setIsResetModalOpen(false);
  };

  const handleDownloadImage = () => {
    if (!renderedImage) return;
    const link = document.createElement('a');
    link.href = renderedImage;
    link.download = `OveShop_Render_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportProject = () => {
    const projectData = {
      version: '1.0',
      backgroundImage,
      placedItems,
      userAssets,
      sceneResolution,
      canvasZoom,
      panOffset,
      drawingStrokes,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OveShop_Project_${new Date().getTime()}.oveshop`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleCreateCustomBackground = (w: number, h: number, color: string, transparent: boolean) => {
    saveToHistory(placedItems);
    setBackgroundImage(null); 
    setSceneResolution({ w, h });
    setSceneBgColor(color);
    setIsTransparent(transparent);
    setIsCanvasModalOpen(false);
    setRenderedImage(null);
    setPlacedItems([]);
  };

  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.backgroundImage !== undefined) setBackgroundImage(data.backgroundImage);
        saveToHistory(placedItems);
        if (data.placedItems) setPlacedItems(data.placedItems);
        if (data.userAssets) setUserAssets(data.userAssets);
        if (data.sceneResolution) setSceneResolution(data.sceneResolution);
        if (data.canvasZoom) setCanvasZoom(data.canvasZoom);
        if (data.panOffset) setPanOffset(data.panOffset);
        if (data.drawingStrokes) setDrawingStrokes(data.drawingStrokes);
        // Reset view states
        setRenderedImage(null);
        setShowComparison(false);
      } catch (err) {
        alert("❌ Error al cargar el proyecto: Archivo inválido");
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Clear input so same file can be loaded again
    e.target.value = '';
  };

  const processWithAI = async () => {
    if (!backgroundImage || placedItems.length === 0) return;
    if (!hasApiKey) {
      await handleOpenKeyDialog();
      return;
    }

    setIsRendering(true);

    try {
      const canvasAdapter = new CanvasCollageAdapter();
      const collageData = (await canvasAdapter.generateCollageBlob(backgroundImage, placedItems, true)).split(',')[1];

      const apiRatio = getSupportedAspectRatio(imageRatio);

      const aiAdapter = new GeminiAIAdapter(userApiKey || process.env.API_KEY || '');
      const result = await aiAdapter.generateRender(backgroundImage, collageData, placedItems, apiRatio, relationGroups);

      if (result.image) {
        setRenderedImage(result.image);
        setShowComparison(false);
      }
    } catch (error: any) {
      console.error("AI Error:", error);

      const errorMessage = error.message || JSON.stringify(error);

      if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
        alert("⚠️ Has excedido tu cuota gratuita de Gemini (Rate Limit). Espera unos instantes antes de intentar de nuevo.");
        return;
      }

      if (
        errorMessage.includes("API key not valid") ||
        errorMessage.includes("403") ||
        errorMessage.includes("400") ||
        errorMessage.includes("INVALID_ARGUMENT") ||
        errorMessage.includes("GoogleGenerativeAIError")
      ) {
        alert("❌ La API Key proporcionada no es válida o ha expirado. Por favor, revísala.");
        localStorage.removeItem('gemini_api_key');
        setUserApiKey(null);
        setHasApiKey(false);
        setApiKeyModalOpen(true);
      } else if (errorMessage.includes("Requested entity was not found") || errorMessage.includes("404")) {
        alert("❌ El modelo de IA seleccionado no está disponible con tu API Key o región. Intentando cambiar de modelo...");
      } else {
        alert(`❌ Error inesperado: ${errorMessage.substring(0, 100)}...`);
      }
    } finally {
      setIsRendering(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setImageRatio(img.width / img.height);
          setSceneResolution({ w: img.width, h: img.height });
          setBackgroundImage(dataUrl);
          setRenderedImage(null);
          setPlacedItems([]);
          setActiveMobileTab('scene');
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#121212] overflow-hidden">
      <Navbar 
        onLoadScene={() => fileInputRef.current?.click()}
        onUseWebcam={() => setIsWebcamOpen(true)}
        onSaveProject={handleExportProject}
        onLoadProject={() => projectInputRef.current?.click()}
        onResetProject={() => setIsResetModalOpen(true)}
        onResetApiKey={handleResetApiKey}
        onZoomIn={() => setCanvasZoom(z => Math.min(5, z + 0.2))}
        onZoomOut={() => setCanvasZoom(z => Math.max(0.2, z - 0.2))}
        onResetZoom={() => { setCanvasZoom(1.0); setPanOffset({ x: 0, y: 0 }); }}
        onRender={processWithAI}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyStack.length > 0}
        canRedo={futureStack.length > 0}
        isRendering={isRendering}
        canRender={placedItems.length > 0}
        currentZoom={Math.round(canvasZoom * 100)}
        sceneResolution={sceneResolution}
        setSceneResolution={setSceneResolution}
        sceneBgColor={sceneBgColor}
        setSceneBgColor={setSceneBgColor}
        isTransparent={isTransparent}
        setIsTransparent={setIsTransparent}
        onCreateBackground={() => setIsCanvasModalOpen(true)}
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden font-sans relative md:pt-10">

      {/* BARRA LATERAL IZQUIERDA: GESTIÓN */}
      <div className={`
        fixed top-0 md:top-10 bottom-0 left-0 z-[500] w-full md:w-64 transform transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] flex pointer-events-none
        ${window.innerWidth < 768 ? (activeMobileTab === 'budget' ? 'translate-x-0' : '-translate-x-full') : (isLeftBarOpen ? 'translate-x-0' : 'translate-x-[calc(-100%+24px)]')}
      `}>
        <aside className="flex-1 bg-[#1a1a1a] md:bg-[#1a1a1a]/80 backdrop-blur-3xl border-r border-white/5 flex flex-col shadow-2xl relative overflow-hidden pointer-events-auto">
          <div className="p-4 flex flex-col gap-3 items-stretch z-10 md:hidden">
            <button
              onClick={() => { setPlacedItems([]); setBackgroundImage(null); setSceneResolution(null); setRenderedImage(null); setShowComparison(false); }}
              className="h-10 w-full px-4 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all shrink-0 group"
            >
              <div className="flex items-center gap-2 w-full">
                <i className="fa-solid fa-rotate-right text-[10px] text-white/40 group-hover:text-white"></i>
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/60 group-hover:text-white">Reiniciar</span>
              </div>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-10 w-full px-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center hover:bg-white/20 transition-all shrink-0 group relative overflow-hidden"
              title="Cargar imagen de fondo"
            >
              <div className="flex items-center gap-2 w-full justify-center">
                <i className="fa-regular fa-image text-[10px] text-white/40 group-hover:text-white"></i>
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/60 group-hover:text-white">Cargar Escena</span>
              </div>
              {sceneResolution && (
                <div className="text-[5px] font-bold text-alpine-sap/60 uppercase tracking-widest mt-0.5 animate-fade-in">
                  {sceneResolution.w}x{sceneResolution.h} PX
                </div>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
            </button>
            <button
              onClick={() => setIsWebcamOpen(true)}
              className="h-10 w-full px-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all shrink-0 group"
              title="Usar Webcam"
            >
              <div className="flex items-center gap-2 w-full">
                <i className="fa-solid fa-camera text-[10px] text-white/40 group-hover:text-white"></i>
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/60 group-hover:text-white">Usar Webcam</span>
              </div>
            </button>
            <button
              onClick={handleResetApiKey}
              className="h-10 w-full px-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all shrink-0 group"
              title="Cambiar API Key"
            >
              <div className="flex items-center gap-2 w-full">
                <i className="fa-solid fa-key text-[10px] text-white/40 group-hover:text-white"></i>
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/60 group-hover:text-white">API Key</span>
              </div>
            </button>

            <div className="flex items-center gap-2 w-full mt-2">
              <button 
                onClick={() => setCanvasZoom(z => Math.max(0.2, z - 0.2))}
                className="h-10 flex-1 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white"
                title="Zoom Out"
              >
                <i className="fa-solid fa-magnifying-glass-minus text-[10px]"></i>
              </button>
              <button 
                onClick={() => { setCanvasZoom(1.0); setPanOffset({ x: 0, y: 0 }); }}
                className="h-10 flex-1 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-[7px] font-black uppercase tracking-widest text-white/40 hover:text-white"
                title="Reset View"
              >
                {Math.round(canvasZoom * 100)}%
              </button>
              <button 
                onClick={() => setCanvasZoom(z => Math.min(5, z + 0.2))}
                className="h-10 flex-1 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white"
                title="Zoom In"
              >
                <i className="fa-solid fa-magnifying-glass-plus text-[10px]"></i>
              </button>
            </div>

            <div className="flex items-center gap-2 w-full">
              <button 
                onClick={handleExportProject}
                className="h-10 flex-1 rounded-xl bg-alpine-sap/10 border border-alpine-sap/20 flex flex-col items-center justify-center hover:bg-alpine-sap/20 transition-all group"
                title="Exportar Proyecto OveShop (.oveshop)"
              >
                <i className="fa-solid fa-file-export text-[10px] text-alpine-sap/60 group-hover:text-alpine-sap"></i>
                <span className="text-[5px] font-black uppercase tracking-widest text-alpine-sap/40 group-hover:text-alpine-sap mt-0.5">Guardar</span>
              </button>
              <button 
                onClick={() => projectInputRef.current?.click()}
                className="h-10 flex-1 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center hover:bg-white/10 transition-all group"
                title="Importar Proyecto OveShop"
              >
                <i className="fa-solid fa-file-import text-[10px] text-white/40 group-hover:text-white"></i>
                <span className="text-[5px] font-black uppercase tracking-widest text-white/40 group-hover:text-white mt-0.5">Cargar</span>
                <input type="file" ref={projectInputRef} className="hidden" accept=".oveshop,.json" onChange={handleImportProject} />
              </button>
            </div>
          </div>

          <div className={`flex-1 flex flex-col overflow-hidden px-4 py-4 transition-opacity duration-300 ${isLeftBarOpen || window.innerWidth < 768 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="mb-6">
              <span className="text-[7px] font-black uppercase tracking-[0.4em] text-white/30 block mb-1">PROYECTO</span>
              <div className="flex items-end gap-2 mb-4">
                <span className="text-2xl font-black text-alpine-sap tracking-tighter">{placedItems.length}</span>
                <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest pb-1">CAPAS</span>
              </div>

              {/* ACTION BUTTONS (MOVED HERE) */}
              <div className="flex flex-col gap-2 mb-6">
                {!renderedImage && placedItems.length > 0 && (
                  <button
                    onClick={processWithAI}
                    disabled={isRendering}
                    className="w-full h-12 rounded-xl bg-alpine-sap text-black font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-alpine-sap/10 md:hidden"
                  >
                    <i className={`fa-solid ${isRendering ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
                    <span>Generar Render</span>
                  </button>
                )}

                {(backgroundImage || sceneResolution) && (
                  <>
                    {interactionMode === 'draw' ? (
                      <div className="flex gap-2 w-full">
                        <button
                          onClick={handleFinishDrawing}
                          className="flex-1 h-12 rounded-xl bg-white text-black font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.02] active:scale-95"
                        >
                          <i className="fa-solid fa-check"></i>
                          <span>Finalizar</span>
                        </button>
                        <button
                          onClick={handleExitDrawing}
                          className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 text-white/40 font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all hover:bg-white/10 hover:text-white hover:scale-[1.02] active:scale-95"
                        >
                          <i className="fa-solid fa-xmark"></i>
                          <span>Salir Modo</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleToggleDrawMode}
                        className="w-full h-12 rounded-xl border border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-lg"
                      >
                        <i className="fa-solid fa-paintbrush"></i>
                        <span>Modo Dibujo</span>
                      </button>
                    )}

                    <button
                      onClick={() => setInteractionMode(interactionMode === 'text' ? 'move' : 'text')}
                      className={`w-full h-12 mt-2 rounded-xl border border-white/10 font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-lg ${
                        interactionMode === 'text' ? 'bg-white text-black scale-105' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <i className="fa-solid fa-font"></i>
                      <span>{interactionMode === 'text' ? 'Salir Modo Texto' : 'Modo Texto'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 mb-4">
              {(() => {
                const groupedElements: (PlacedItem | { groupId: string; items: PlacedItem[] })[] = [];
                const groupMap: Record<string, { groupId: string; items: PlacedItem[] }> = {};

                placedItems.forEach(item => {
                  if (!item.groupId) {
                    groupedElements.push(item);
                  } else {
                    if (!groupMap[item.groupId]) {
                      groupMap[item.groupId] = { groupId: item.groupId, items: [] };
                      groupedElements.push(groupMap[item.groupId]);
                    }
                    groupMap[item.groupId].items.push(item);
                  }
                });

                // REVERSE to match standard layer panel (Top = Last item / On top)
                return [...groupedElements].reverse().map((element, idx) => {
                  // CASE A: STANDALONE ITEM
                  if (!('items' in element)) {
                    const item = element;
                    const isSelected = selectedId === item.id;
                    const isLinkingIdActive = !!isLinkingId;
                    const isTarget = isLinkingId && isLinkingId !== item.id;

                    const cardClass = isSelected
                      ? 'bg-alpine-sap border-alpine-sap/20'
                      : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.08]';

                    const linkingHighlight = isLinkingId === item.id ? 'ring-2 ring-alpine-lavender shadow-[0_0_20px_rgba(162,145,173,0.4)]' : '';
                    const targetPulse = isTarget ? 'animate-pulse border-alpine-lavender/50' : '';

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (isLinkingId) {
                            if (isLinkingId !== item.id) {
                              const fromItem = placedItems.find(i => i.id === isLinkingId);
                              const targetItem = item;

                              let newGroupId = fromItem?.groupId || targetItem.groupId || generateId();

                              // If both already have DIFFERENT groups, we MERGE the target's group into fromItem's group
                              const sourceGroupId = fromItem?.groupId;
                              const targetGroupId = targetItem.groupId;

                              if (sourceGroupId && targetGroupId && sourceGroupId !== targetGroupId) {
                                // Merge logic: move all items from targetGroupId to sourceGroupId
                                setPlacedItems(prev => prev.map(pi => pi.groupId === targetGroupId ? { ...pi, groupId: sourceGroupId } : pi));
                                newGroupId = sourceGroupId;
                              } else if (targetGroupId) {
                                newGroupId = targetGroupId;
                              }

                              if (!relationGroups[newGroupId]) {
                                setRelationGroups(prev => ({ ...prev, [newGroupId]: { prompt: '', color: '#9c91ad' } }));
                              }

                              setPlacedItems(prev => prev.map(pi => (pi.id === item.id || pi.id === isLinkingId) ? { ...pi, groupId: newGroupId } : pi));
                              setIsLinkingId(null);
                            } else {
                              setIsLinkingId(null);
                            }
                          } else {
                            setSelectedId(item.id);
                            if (window.innerWidth < 768) setActiveMobileTab('scene');
                          }
                        }}
                        className={`group flex flex-col gap-2 p-2 rounded-xl border transition-all cursor-pointer ${cardClass} ${linkingHighlight} ${targetPulse}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-black/40 p-1 shrink-0">
                            <img src={item.image} className="w-full h-full object-contain" alt="" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[7px] font-black uppercase tracking-wider truncate ${isSelected ? 'text-black' : 'text-white/80'}`}>{item.name}</p>
                            <span className={`text-[7px] font-bold uppercase tracking-widest ${isSelected ? 'text-black/60' : 'text-alpine-sap'}`}>
                              Editando
                            </span>
                          </div>

                          {/* LAYER CONTROLS */}
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); moveLayer(item.id, 'up'); }}
                              className={`w-5 h-5 flex items-center justify-center rounded bg-black/10 hover:bg-black/20 ${isSelected ? 'text-black' : 'text-white/40'}`}
                            >
                              <i className="fa-solid fa-chevron-up text-[8px]"></i>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveLayer(item.id, 'down'); }}
                              className={`w-5 h-5 flex items-center justify-center rounded bg-black/10 hover:bg-black/20 ${isSelected ? 'text-black' : 'text-white/40'}`}
                            >
                              <i className="fa-solid fa-chevron-down text-[8px]"></i>
                            </button>
                          </div>
                          
                          {/* COLOR CHIPS TOP-RIGHT */}
                          {item.drawingStrokes && (
                            <div className="flex flex-wrap gap-1 items-center justify-end max-w-[80px] shrink-0">
                              {(Array.from(new Set(item.drawingStrokes.flatMap(s => s.segments.map(seg => seg.color)))) as string[]).map(color => (
                                <button
                                  key={color}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const label = prompt(`Etiqueta para el color ${color}`, item.colorLabels?.[color] || '');
                                    if (label !== null) {
                                      setPlacedItems(prev => prev.map(p => 
                                        p.id === item.id 
                                          ? { ...p, colorLabels: { ...(p.colorLabels || {}), [color]: label } } 
                                          : p
                                      ));
                                    }
                                  }}
                                  className="w-3 h-3 rounded-full border border-black/10 shadow-sm transition-transform hover:scale-125 cursor-help"
                                  style={{ backgroundColor: color }}
                                  title={item.colorLabels?.[color] ? `Material: ${item.colorLabels[color]}` : `Sin material asignado (Click para etiquetar)`}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {isSelected && (
                          <div className="mt-1 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                            <textarea
                              placeholder="Instrucciones IA (ej: 'Tapa el monitor')..."
                              value={item.customPrompt || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPlacedItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, customPrompt: val } : pi));
                              }}
                              className="w-full h-12 bg-black/10 border border-black/10 rounded-lg p-2 text-[8px] text-black placeholder-black/40 resize-none focus:outline-none focus:border-black/30"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); setIsLinkingId(item.id); }}
                                className="flex-1 py-1 bg-white/5 border border-white/10 rounded-md text-[7px] font-bold uppercase text-white hover:bg-white/10"
                              >
                                <i className="fa-solid fa-link mr-1"></i> Vincular
                              </button>
                              <button
                                onClick={() => setPlacedItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, occlusionMode: 'overlay' } : pi))}
                                className={`flex-1 py-1 rounded-md text-[7px] font-bold uppercase transition-all ${(!item.occlusionMode || item.occlusionMode === 'overlay') ? 'bg-white shadow-sm text-black' : 'text-black/40 hover:text-black/70'}`}
                              >
                                Encima de
                              </button>
                              <button
                                onClick={() => setPlacedItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, occlusionMode: 'destroy' } : pi))}
                                className={`flex-1 py-1 rounded-md text-[7px] font-bold uppercase transition-all ${(item.occlusionMode === 'destroy') ? 'bg-red-500/10 text-red-600 shadow-sm border border-red-500/20' : 'text-black/40 hover:text-black/70'}`}
                              >
                                Destruir
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // CASE B: GROUP BLOCK
                  const group = element;
                  const groupData = relationGroups[group.groupId] || { prompt: '', color: '#9c91ad' };
                  const color = groupData.color;
                  const isAnyItemSelected = group.items.some(it => it.id === selectedId);

                  return (
                    <div
                      key={group.groupId}
                      className="flex flex-col rounded-2xl border transition-all overflow-hidden"
                      style={{
                        borderColor: 'rgba(255,255,255,0.1)',
                        backgroundColor: color,
                        boxShadow: isAnyItemSelected ? `0 10px 30px -10px ${color}80` : 'none'
                      }}
                    >
                      {/* Group Header */}
                      <div className="p-2 border-b transition-all border-white/10" style={{ color: 'white' }}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <i className="fa-solid fa-link text-[8px] text-white"></i>
                            <span className="text-[6px] font-black uppercase tracking-widest text-white">Relación de Grupo</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-black/20 px-1.5 py-0.5 rounded-full border border-white/10">
                              <span className="text-[5px] font-bold text-white/60 uppercase">COLOR</span>
                              <input
                                type="color"
                                value={color}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setRelationGroups(prev => ({ ...prev, [group.groupId]: { ...groupData, color: val } }));
                                }}
                                className="w-3 h-3 rounded-full overflow-hidden border border-white/20 p-0 cursor-pointer bg-transparent appearance-none"
                              />
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPlacedItems(prev => prev.map(pi => pi.groupId === group.groupId ? { ...pi, groupId: undefined } : pi));
                              }}
                              className="text-[5px] text-white hover:text-white/80 uppercase font-bold px-2 py-1 bg-black/20 rounded-md transition-colors border border-white/10"
                            >
                              Desvincular Todo
                            </button>
                          </div>
                        </div>

                        {/* GROUP LAYER CONTROLS */}
                        <div className="flex gap-2 p-2 border-b border-white/5 bg-black/10">
                          <span className="text-[6px] font-bold text-white/40 uppercase self-center mr-auto">Mover Grupo</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveLayer(group.items[0].id, 'up', true); }}
                            className="w-5 h-5 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white/40"
                            title="Subir Grupo"
                          >
                            <i className="fa-solid fa-chevron-up text-[8px]"></i>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveLayer(group.items[0].id, 'down', true); }}
                            className="w-5 h-5 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white/40"
                            title="Bajar Grupo"
                          >
                            <i className="fa-solid fa-chevron-down text-[8px]"></i>
                          </button>
                        </div>

                        <textarea
                          placeholder="¿Cómo interactúan? (ej: 'La enredadera 1 llega hasta la 2')..."
                          value={groupData.prompt}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRelationGroups(prev => ({ ...prev, [group.groupId]: { ...groupData, prompt: val } }));
                          }}
                          className="w-full h-10 bg-black/20 border border-white/10 rounded-lg p-2 text-[7px] text-white placeholder-white/50 resize-none focus:outline-none"
                        />
                      </div>

                      {/* Group Items */}
                      <div className="p-1 space-y-1">
                        {group.items.map(item => {
                          const isSelected = selectedId === item.id;
                          const isTarget = isLinkingId && isLinkingId !== item.id;
                          const cardStyle = isSelected ? { backgroundColor: color, color: 'white' } : {};

                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                if (isLinkingId) {
                                  if (isLinkingId !== item.id) {
                                    const fromItem = placedItems.find(i => i.id === isLinkingId);
                                    const sourceGroupId = fromItem?.groupId;
                                    const targetGroupId = group.groupId;

                                    if (sourceGroupId && sourceGroupId !== targetGroupId) {
                                      // Merge two different groups
                                      setPlacedItems(prev => prev.map(pi => pi.groupId === targetGroupId ? { ...pi, groupId: sourceGroupId } : pi));
                                    } else {
                                      // Standalone joins group OR already same group
                                      setPlacedItems(prev => prev.map(pi => (pi.id === isLinkingId) ? { ...pi, groupId: targetGroupId } : pi));
                                    }
                                    setIsLinkingId(null);
                                  } else {
                                    setIsLinkingId(null);
                                  }
                                } else {
                                  setSelectedId(item.id);
                                }
                              }}
                              className={`flex flex-col gap-1.5 p-1.5 rounded-lg border transition-all cursor-pointer ${isSelected ? 'border-white/20 bg-white/10' : 'border-transparent hover:bg-white/5'} ${isTarget ? 'animate-pulse ring-1 ring-white' : ''}`}
                              style={{
                                color: 'white'
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-black/20 p-0.5 shrink-0">
                                  <img src={item.image} className="w-full h-full object-contain" alt="" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-[6px] font-black uppercase truncate ${isSelected ? 'text-white' : 'text-white/60'}`}>{item.name}</p>
                                </div>

                                {/* INTERNAL LAYER CONTROLS */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); moveLayer(item.id, 'up', false); }}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white/40"
                                    title="Subir Capa"
                                  >
                                    <i className="fa-solid fa-chevron-up text-[7px]"></i>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); moveLayer(item.id, 'down', false); }}
                                    className="w-5 h-5 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white/40"
                                    title="Bajar Capa"
                                  >
                                    <i className="fa-solid fa-chevron-down text-[7px]"></i>
                                  </button>
                                </div>

                                {/* COLOR CHIPS TOP-RIGHT (ADDED FOR GROUPS) */}
                                {item.drawingStrokes && (
                                  <div className="flex flex-wrap gap-1 items-center justify-end max-w-[60px] shrink-0">
                                    {(Array.from(new Set(item.drawingStrokes.flatMap(s => s.segments.map(seg => seg.color)))) as string[]).map(color => (
                                      <button
                                        key={color}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const label = prompt(`Etiqueta para el color ${color}`, item.colorLabels?.[color] || '');
                                          if (label !== null) {
                                            setPlacedItems(prev => prev.map(p => 
                                              p.id === item.id 
                                                ? { ...p, colorLabels: { ...(p.colorLabels || {}), [color]: label } } 
                                                : p
                                            ));
                                          }
                                        }}
                                        className="w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm transition-transform hover:scale-125 cursor-help"
                                        style={{ backgroundColor: color }}
                                        title={item.colorLabels?.[color] ? `Material: ${item.colorLabels[color]}` : `Sin material asignado (Click para etiquetar)`}
                                      />
                                    ))}
                                  </div>
                                )}

                                {isSelected && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPlacedItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, groupId: undefined } : pi));
                                    }}
                                    className="w-4 h-4 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
                                  >
                                    <i className="fa-solid fa-unlink text-[6px]"></i>
                                  </button>
                                )}
                              </div>

                              {isSelected && (
                                <div className="flex flex-col gap-1.5" onClick={e => e.stopPropagation()}>
                                  <textarea
                                    placeholder="Instrucciones específicas..."
                                    value={item.customPrompt || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPlacedItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, customPrompt: val } : pi));
                                    }}
                                    className="w-full h-10 bg-black/20 border border-white/10 rounded-lg p-1.5 text-[7px] text-white placeholder-white/30 resize-none focus:outline-none"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => setPlacedItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, occlusionMode: 'overlay' } : pi))}
                                      className={`flex-1 py-1 rounded-md text-[6px] font-bold uppercase transition-all ${(!item.occlusionMode || item.occlusionMode === 'overlay') ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'}`}
                                    >
                                      Encima
                                    </button>
                                    <button
                                      onClick={() => setPlacedItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, occlusionMode: 'destroy' } : pi))}
                                      className={`flex-1 py-1 rounded-md text-[6px] font-bold uppercase transition-all ${(item.occlusionMode === 'destroy') ? 'bg-red-500 text-white' : 'text-white/40 hover:text-white/70'}`}
                                    >
                                      Destruir
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Buttons moved above layers list */}
            </div>
          </div>
        </aside>
        <button onClick={() => setIsLeftBarOpen(!isLeftBarOpen)} className="hidden md:flex h-20 w-5 bg-black/80 backdrop-blur-3xl border border-white/10 border-l-0 rounded-r-2xl self-center items-center justify-center text-white/20 hover:text-white transition-all shadow-2xl z-[510] relative -left-[1px] pointer-events-auto"><i className={`fa-solid ${isLeftBarOpen ? 'fa-chevron-left' : 'fa-chevron-right'} text-[7px]`}></i></button>
      </div>

      {/* ÁREA PRINCIPAL: LIENZO */}
      <main 
        className={`flex-1 relative bg-[#141414] flex items-center justify-center overflow-hidden transition-all duration-700 ${activeMobileTab !== 'scene' && window.innerWidth < 768 ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      >
        <div className="w-full h-full flex items-center justify-center p-2 md:p-10 pb-24 md:pb-10">
          <div className="w-full h-full flex items-center justify-center relative">
            {(!backgroundImage && !sceneResolution) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[100] animate-pulse">
                <h2 className="text-4xl md:text-8xl font-black text-alpine-sap uppercase tracking-[0.2em] text-center drop-shadow-[0_0_40px_rgba(162,173,145,0.3)] flex flex-col gap-0 md:gap-4 leading-[0.9]">
                  <span>Carga</span>
                  <span>Un</span>
                  <span>Fondo</span>
                </h2>
              </div>
            )}

            {renderedImage && backgroundImage ? (
              <div className="w-full h-full flex items-center justify-center animate-fade-in relative">
                {showComparison ? (
                  <div className="w-full h-full max-w-5xl max-h-[80vh] flex items-center justify-center" style={{ aspectRatio: imageRatio }}>
                    <ComparisonSlider before={backgroundImage} after={renderedImage} />
                  </div>
                ) : (
                  <div className="w-full h-full max-w-5xl max-h-[80vh] flex items-center justify-center relative group" style={{ aspectRatio: imageRatio }}>
                    <img src={renderedImage} className="w-full h-full object-contain rounded-[2rem] shadow-2xl" alt="Rendered Result" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]">
                      <button
                        onClick={() => setShowComparison(true)}
                        className="bg-white text-black px-8 py-4 rounded-full text-[9px] font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                      >
                        <i className="fa-solid fa-circle-nodes"></i>
                        Ver Comparativa
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <CameraCapture
                darkMode={true}
                placedItems={placedItems}
                setPlacedItems={setPlacedItems}
                onSaveToHistory={() => saveToHistory(placedItems)}
                selectedId={selectedId}
                setSelectedId={handleSelectElement}
                externalBackground={backgroundImage}
                onDropItem={handleAddItem}
                onFileUpload={handleUserFileUpload}
                zoom={canvasZoom}
                setZoom={setCanvasZoom}
                panOffset={panOffset}
                setPanOffset={setPanOffset}
                interactionMode={interactionMode}
                onAddText={handleAddText}
                setInteractionMode={setInteractionMode}
                drawingStrokes={drawingStrokes}
                setDrawingStrokes={setDrawingStrokes}
                activeBrush={{
                  type: activeBrushType,
                  color: activeBrushColor,
                  width: activeBrushWidth
                }}
                onEditDrawing={(id) => {
                  const item = placedItems.find(i => i.id === id);
                  if (item && item.drawingStrokes && item.drawingBounds) {
                    const { width, height } = item.drawingBounds;
                    // Current global top-left based on current item.x, item.y
                    const minX = item.x - width / 2;
                    const minY = item.y - height / 2;
                    
                    // De-normalize strokes back to canvas global space
                    const deNormalizedStrokes = item.drawingStrokes.map(stroke => ({
                      ...stroke,
                      segments: stroke.segments.map(seg => ({
                        ...seg,
                        points: seg.points.map(p => ({
                          x: (p.x * width) / 100 + minX,
                          y: (p.y * height) / 100 + minY
                        }))
                      }))
                    }));
                    
                    setEditingItemId(id);
                    setInteractionMode('draw');
                    setDrawingStrokes(deNormalizedStrokes); 
                  }
                }}
                sceneResolution={sceneResolution}
                sceneBgColor={sceneBgColor}
                isTransparent={isTransparent}
              />

              {/* BARRA DE HERRAMIENTAS FLOTANTE - DEBAJO DEL LIENZO */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#121212]/80 backdrop-blur-3xl px-5 py-2.5 rounded-full border border-white/10 shadow-2xl z-[1000] scale-90 md:scale-100 ring-1 ring-white/5 animate-fade-in-up">
                {/* UNDO/REDO */}
                <div className="flex items-center gap-1 mr-4 border-r border-white/10 pr-4">
                  <button
                    onClick={undo}
                    disabled={historyStack.length === 0}
                    title="Deshacer (Cmd+Z)"
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${historyStack.length > 0 ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-white/10'}`}
                  >
                    <i className="fa-solid fa-rotate-left text-[11px]"></i>
                  </button>
                  <button
                    onClick={redo}
                    disabled={futureStack.length === 0}
                    title="Rehacer (Cmd+Shift+Z)"
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${futureStack.length > 0 ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-white/10'}`}
                  >
                    <i className="fa-solid fa-rotate-right text-[11px]"></i>
                  </button>
                </div>

                {/* ZOOM CONTROLS */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setCanvasZoom(z => Math.max(0.2, z - 0.2))}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all"
                  >
                    <i className="fa-solid fa-minus text-[10px]"></i>
                  </button>
                  <button 
                    onClick={() => { setCanvasZoom(1.0); setPanOffset({ x: 0, y: 0 }); }}
                    className="px-3 py-1.5 bg-white/5 rounded-lg text-[10px] font-black tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-all min-w-[60px] text-center"
                  >
                    {Math.round(canvasZoom * 100)}%
                  </button>
                  <button
                    onClick={() => setCanvasZoom(z => Math.min(5, z + 0.2))}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all"
                  >
                    <i className="fa-solid fa-plus text-[10px]"></i>
                  </button>
                </div>

                {/* INTERACTION MODES */}
                <div className="flex items-center gap-1 ml-4 border-l border-white/10 pl-4">
                  <button
                    onClick={() => setInteractionMode('move')}
                    title="Modo Mover (V)"
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${interactionMode === 'move' ? 'bg-alpine-sap text-black' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
                  >
                    <i className="fa-solid fa-arrow-pointer text-[11px]"></i>
                  </button>
                  <button
                    onClick={() => setInteractionMode('draw')}
                    title="Modo Dibujo (B)"
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${interactionMode === 'draw' ? 'bg-alpine-sap text-black' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
                  >
                    <i className="fa-solid fa-paintbrush text-[11px]"></i>
                  </button>
                  <button
                    onClick={() => setInteractionMode('text')}
                    title="Modo Texto (T)"
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${interactionMode === 'text' ? 'bg-alpine-sap text-black' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
                  >
                    <i className="fa-solid fa-font text-[11px]"></i>
                  </button>
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      </main>

      {/* PANEL DE ACCIONES FLOTANTE (PASTILLA) - ESTILO CAPTURA */}
      {renderedImage && (
        <div className={`fixed right-6 md:right-10 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-[1000] animate-fade-in-right`}>
          <div className="flex flex-col gap-3 p-3 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl">
            <button
              onClick={() => setShowComparison(!showComparison)}
              title="Comparar Capas"
              className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${showComparison ? 'bg-alpine-sap text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
            >
              <i className="fa-solid fa-layer-group text-base"></i>
            </button>
            <button
              onClick={() => setRenderedImage(null)}
              title="Ajustes"
              className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/5 text-white/60 flex items-center justify-center hover:bg-white/10 transition-all"
            >
              <i className="fa-solid fa-sliders text-base"></i>
            </button>
            <button
              onClick={handleDownloadImage}
              title="Guardar Post-procesado"
              className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-alpine-sap text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg"
            >
              <i className="fa-solid fa-wand-magic-sparkles text-base"></i>
            </button>
            <button
              onClick={handleExportProject}
              title="Guardar Proyecto (Capas)"
              className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/5 text-white/60 flex items-center justify-center hover:bg-white/10 transition-all"
            >
              <i className="fa-solid fa-box-archive text-base"></i>
            </button>
          </div>
        </div>
      )}

      {/* BARRA LATERAL DERECHA: CATÁLOGO */}
      <div className={`
        fixed top-0 md:top-10 bottom-0 right-0 z-[500] w-full md:w-80 transform transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] flex pointer-events-none
        ${window.innerWidth < 768 ? (activeMobileTab === 'shop' ? 'translate-x-0' : 'translate-x-full') : (isRightBarOpen ? 'translate-x-0' : 'translate-x-[calc(100%-24px)]')}
      `}>
        <button onClick={() => setIsRightBarOpen(!isRightBarOpen)} className="hidden md:flex h-20 w-5 bg-black/80 backdrop-blur-3xl border border-white/10 border-r-0 rounded-l-2xl self-center items-center justify-center text-white/20 hover:text-white transition-all shadow-2xl z-[510] relative -right-[1px] pointer-events-auto"><i className={`fa-solid ${isRightBarOpen ? 'fa-chevron-right' : 'fa-chevron-left'} text-[7px]`}></i></button>
        <aside className="flex-1 bg-[#121212] md:bg-[#121212]/95 backdrop-blur-3xl md:border-l border-white/5 p-6 md:p-7 overflow-y-auto scrollbar-hide shadow-2xl relative pointer-events-auto">
          {!renderedImage ? (
            <>
              {selectedId && placedItems.find(i => i.id === selectedId)?.textConfig ? (
                <TextProperties 
                  item={placedItems.find(i => i.id === selectedId)!} 
                  onUpdate={handleUpdateText} 
                  onUpdateItem={handleUpdateItem}
                  customPalette={customPalette}
                  onAddCustomColor={handleAddCustomColor}
                  onRemoveCustomColor={handleRemoveCustomColor}
                />
              ) : (interactionMode === 'draw' || (selectedId && placedItems.find(i => i.id === selectedId)?.drawingStrokes)) ? (
                <DrawingProperties
                  brushType={activeBrushType}
                  setBrushType={(type) => {
                    setActiveBrushType(type);
                    setInteractionMode('draw');
                  }}
                  brushColor={activeBrushColor}
                  setBrushColor={(color) => {
                    setActiveBrushColor(color);
                    setInteractionMode('draw');
                    if (activeBrushType === 'eraser' || !activeBrushType) {
                      setActiveBrushType('pencil');
                    }
                  }}
                  brushWidth={activeBrushWidth}
                  setBrushWidth={setActiveBrushWidth}
                  onClearAll={() => {
                    if (window.confirm('¿Estás seguro de que quieres borrar todos los dibujos?')) {
                      setDrawingStrokes([]);
                    }
                  }}
                  colorLabels={drawingColorLabels}
                  onUpdateLabels={setDrawingColorLabels}
                  usedColors={usedDrawingColors}
                  customPalette={customPalette}
                  onAddCustomColor={handleAddCustomColor}
                  onRemoveCustomColor={handleRemoveCustomColor}
                  onFinish={handleFinishDrawing}
                  onExit={handleExitDrawing}
                />
              ) : (
                <AssetCarousel 
                  onSelectItem={handleAddItem} 
                  selectedId={selectedId} 
                  setSelectedId={handleSelectElement}
                  darkMode={true} 
                  userAssets={userAssets}
                  setUserAssets={setUserAssets}
                  onUserFileUpload={handleUserFileUpload}
                  hasBackground={!!backgroundImage || !!sceneResolution}
                  placedItems={placedItems}
                />
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-center opacity-20">
              <i className="fa-solid fa-wand-magic-sparkles text-2xl"></i>
              <p className="text-[8px] font-black uppercase tracking-[0.4em]">Visualización de Render</p>
            </div>
          )}
        </aside>
      </div>
      
      {/* Brush Toolbar Overlay when drawing mode is active */}
      {/* Legacy Brush Toolbar removed in favor of Sidebar properties */}

      {/* NAVEGACIÓN INFERIOR (MÓVIL) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black/90 backdrop-blur-3xl border-t border-white/5 z-[600] flex items-center justify-around px-4">
        <button onClick={() => setActiveMobileTab('scene')} className={`flex flex-col items-center gap-1 transition-all ${activeMobileTab === 'scene' ? 'text-alpine-sap' : 'text-white/30'}`}>
          <i className="fa-solid fa-border-all text-sm"></i>
          <span className="text-[7px] font-black uppercase tracking-widest">Lienzo</span>
        </button>
        <button onClick={() => setActiveMobileTab('shop')} className={`flex flex-col items-center gap-1 transition-all ${activeMobileTab === 'shop' ? 'text-alpine-sap' : 'text-white/30'}`}>
          <i className="fa-solid fa-plus-square text-sm"></i>
          <span className="text-[7px] font-black uppercase tracking-widest">Tienda</span>
        </button>
      </nav>

      {isRendering && (
        <div className="fixed inset-0 z-[1000] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center px-10">
          <div className="w-14 h-14 md:w-16 md:h-16 border-t-2 border-alpine-sap rounded-full animate-spin"></div>
          <div className="mt-10 text-center space-y-3">
            <div className="text-alpine-sap font-black uppercase tracking-[0.6em] text-[10px] md:text-[11px]">Generando Integración</div>
            <p className="text-[8px] text-white/30 uppercase tracking-[0.3em]">Calculando profundidad y oclusión...</p>
          </div>
        </div>
      )}
      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        onSave={handleSaveApiKey}
        onClose={() => setApiKeyModalOpen(false)}
      />

      {isWebcamOpen && (
        <WebcamCapture
          onCapture={(img) => {
            setBackgroundImage(img);
            setIsWebcamOpen(false);
          }}
          onClose={() => setIsWebcamOpen(false)}
        />
      )}

      {/* MODAL DE REINICIAR */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 p-8 rounded-3xl max-w-sm w-full space-y-6 shadow-2xl animate-fade-in-up">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-rotate-left text-xl"></i>
              </div>
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">¿Reiniciar Mesa?</h3>
              <p className="text-[9px] text-white/40 uppercase tracking-widest leading-loose">
                Se perderán todas las capas y el fondo actual. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleResetProject}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg shadow-red-600/20"
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL CONFIGURACIÓN LIENZO */}
      <CanvasConfigModal
        isOpen={isCanvasModalOpen}
        onClose={() => setIsCanvasModalOpen(false)}
        onConfirm={handleCreateCustomBackground}
        initialW={sceneResolution?.w}
        initialH={sceneResolution?.h}
        initialColor={sceneBgColor}
        initialTransparent={isTransparent}
      />
    </div>
  </div>
);
};

export default App;

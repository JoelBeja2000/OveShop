
import React, { useState, useEffect, useRef } from 'react';
import { PlacedItem, PricingType, VisualBehavior, AssetCategory, AssetItem } from './src/domain/types';
import { GeminiAIAdapter } from './src/infrastructure/ai/GeminiAIAdapter';
import { CanvasCollageAdapter } from './src/infrastructure/canvas/CanvasCollageAdapter';
import AssetCarousel from './components/AssetCarousel';
import { PRICE_CATALOG, getPriceForItem, PRICE_CONFIG } from './src/domain/PriceCatalog';
import CameraCapture from './components/CameraCapture';
import WebcamCapture from './components/WebcamCapture';
import ComparisonSlider from './components/ComparisonSlider';
import ApiKeyModal from './components/ApiKeyModal';

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
  const [isRendering, setIsRendering] = useState(false);
  const [renderedImage, setRenderedImage] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  const [activeMobileTab, setActiveMobileTab] = useState<'scene' | 'budget' | 'shop'>('scene');
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string | null>(localStorage.getItem('gemini_api_key'));
  const [relationGroups, setRelationGroups] = useState<Record<string, { prompt: string, color: string }>>({});
  const [isLinkingId, setIsLinkingId] = useState<string | null>(null);
  const [finalBudget, setFinalBudget] = useState<number | null>(null);
  const [userAssets, setUserAssets] = useState<ColorVariantItem[]>([]);
  const [sceneResolution, setSceneResolution] = useState<{ w: number, h: number } | null>(null);
  const [canvasZoom, setCanvasZoom] = useState<number>(1.0);
  const projectInputRef = useRef<HTMLInputElement>(null);

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

  const handleAddItem = (itemId: string, name: string, image: string, price: number, pricingType: PricingType, x: number, y: number, h: number, s: number, b: number, description: string, visualBehavior: VisualBehavior, category: AssetCategory) => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      const newId = Math.random().toString(36).substr(2, 9);
      setPlacedItems(prev => [...prev, {
        id: newId,
        itemId,
        name,
        description,
        image,
        price,
        pricingType,
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
      }]);
      setSelectedId(newId);
      if (window.innerWidth < 768) setActiveMobileTab('scene');
    };
    img.src = image;
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (backgroundImage || placedItems.length > 0) {
        e.preventDefault();
        e.returnValue = ''; // Standard for showing confirmation dialog
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [backgroundImage, placedItems.length]);

  const handleUserFileUpload = (files: FileList | File[], dropPos?: { x: number, y: number }) => {
    Array.from(files).forEach((file: File, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const assetId = `user_asset_${Math.random().toString(36).substr(2, 9)}`;
        const newAsset: ColorVariantItem = {
          id: assetId,
          name: file.name.split('.')[0],
          category: AssetCategory.INVENTORY,
          price: 0,
          pricingType: PricingType.UNIT,
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
            newAsset.price,
            newAsset.pricingType,
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

  // DEPRECATED: Live calculation removed in favor of on-demand "Final Budget"
  // const calculateItemPrice = (item: PlacedItem) => { ... }
  // const totalPrice = placedItems.reduce((acc, item) => acc + calculateItemPrice(item), 0);

  const calculateProjectBudget = (analysedAreas?: Record<string, number>) => {
    let total = 0;

    placedItems.forEach(item => {
      const rule = getPriceForItem(item.itemId);
      let itemCost = 0;

      if (rule.type === 'unidad') {
        itemCost = rule.basePrice;
      } else if (rule.type === 'm²') {
        // USE AI ANALYSIS IF AVAILABLE, OTHERWISE ESTIMATE
        if (analysedAreas && analysedAreas[item.id]) {
          const aiArea = analysedAreas[item.id];
          itemCost = Math.max(rule.minPrice || 0, aiArea * rule.basePrice);
          console.log(`[Budget] Used AI Area for ${item.name}: ${aiArea.toFixed(2)}m² -> $${itemCost}`);
        } else {
          // Area estimation fallback
          // Assume screen height = PRICE_CONFIG.ASSUMED_SCENE_HEIGHT_METERS (e.g. 3m)
          // item.scale is relative to screen height (~0.35 base size). 
          // Let's approximate: (scale * baseSize) * (scale * baseSize * aspectRatio)
          const baseSizeMeters = PRICE_CONFIG.ASSUMED_SCENE_HEIGHT_METERS * 0.35;
          const h_meters = baseSizeMeters * item.scale;
          const w_meters = h_meters * item.aspectRatio;
          const area_m2 = h_meters * w_meters;

          itemCost = Math.max(rule.minPrice || 0, area_m2 * rule.basePrice);
        }
      } else if (rule.type === 'g') {
        // Weight estimation
        // Scale 1.0 = X grams ?
        // item.scale * PRICE_CONFIG.GRAMS_PER_SCALE_UNIT
        const estimatedGrams = item.scale * PRICE_CONFIG.GRAMS_PER_SCALE_UNIT; // e.g. 50g
        const unitsOf100g = estimatedGrams / 100;
        itemCost = unitsOf100g * rule.basePrice;
      }

      if (rule.installationFee) {
        itemCost += rule.installationFee;
      }

      // Update item with calculated price for the invoice
      item.price = itemCost;
      total += itemCost;
    });

    setFinalBudget(total);
    // Force update of items to reflect calculated prices (optional, but good for invoice)
    setPlacedItems([...placedItems]);
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

  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.backgroundImage !== undefined) setBackgroundImage(data.backgroundImage);
        if (data.placedItems) setPlacedItems(data.placedItems);
        if (data.userAssets) setUserAssets(data.userAssets);
        if (data.sceneResolution) setSceneResolution(data.sceneResolution);
        // Reset view states
        setRenderedImage(null);
        setFinalBudget(null);
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

  const handleDownloadInvoice = () => {
    const invoiceWindow = window.open('', '_blank');
    if (!invoiceWindow) return;

    const itemsHtml = placedItems.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <div style="font-weight: bold; font-size: 14px;">${item.name}</div>
          <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">${item.description}</div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; text-transform: capitalize;">${item.pricingType}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">$${(item.price || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    invoiceWindow.document.write(`
      <html>
        <head>
          <title>Presupuesto OveShop Pro</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .logo { font-weight: 900; letter-spacing: 0.3em; font-size: 28px; }
            .meta { text-align: right; font-size: 12px; color: #666; }
            .project-image { width: 100%; border-radius: 12px; margin-bottom: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden; }
            .project-image img { width: 100%; height: auto; display: block; }
            .image-caption { font-size: 9px; text-transform: uppercase; letter-spacing: 0.3em; color: #999; text-align: center; margin-top: 15px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th { text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; color: #999; border-bottom: 1px solid #000; padding: 12px; }
            .total-box { background: #f9f9f9; padding: 30px; text-align: right; border-radius: 16px; margin-top: 20px; }
            .total-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; color: #999; margin-bottom: 5px; }
            .total-amount { font-size: 42px; font-weight: 900; color: #000; }
            @media print { .no-print { display: none; } body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">OVESHOP</div>
              <div style="font-size: 10px; margin-top: 5px; letter-spacing: 0.2em; color: #888; font-weight: bold;">AI IMAGE EDITOR & COMPOSITOR</div>
            </div>
            <div class="meta">
              <div>Fecha: ${new Date().toLocaleDateString()}</div>
              <div>ID Presupuesto: #${Math.random().toString(36).substr(2, 6).toUpperCase()}</div>
            </div>
          </div>
          
          ${renderedImage ? `
          <div class="project-image">
            <img src="${renderedImage}" alt="Proyecto Renderizado" />
            <div class="image-caption">Visualización Fotorealista del Proyecto Final</div>
          </div>
          ` : ''}
          
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Elemento</th>
                <th style="text-align: right;">Cálculo</th>
                <th style="text-align: right;">Inversión Estimada</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-label">Inversión Total del Proyecto</div>
            <div class="total-amount">$${(finalBudget || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>

          <script>
            window.onload = () => {
              setTimeout(() => { window.print(); }, 800);
            };
          </script>
        </body>
      </html>
    `);
    invoiceWindow.document.close();
  };



  const processWithAI = async () => {
    if (!backgroundImage || placedItems.length === 0) return;
    if (!hasApiKey) {
      await handleOpenKeyDialog();
      return;
    }

    setIsRendering(true);

    // 1. Calculate Budget at the start of processing
    calculateProjectBudget();

    try {
      const canvasAdapter = new CanvasCollageAdapter();
      const collageData = (await canvasAdapter.generateCollageBlob(backgroundImage, placedItems, true)).split(',')[1];

      const apiRatio = getSupportedAspectRatio(imageRatio);

      const aiAdapter = new GeminiAIAdapter(userApiKey || process.env.API_KEY || '');
      const result = await aiAdapter.generateRender(backgroundImage, collageData, placedItems, apiRatio, relationGroups);

      if (result.image) {
        setRenderedImage(result.image);
        setShowComparison(false);

        // 2. Recalculate Budget with AI Data if available
        if (result.usageAnalysis) {
          calculateProjectBudget(result.usageAnalysis);
        }
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
        // Opcional: Podríamos intentar cambiar el modelo automáticamente aquí si tuviéramos un estado para ello.
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
          setFinalBudget(null); // Reset budget on new image
          setPlacedItems([]);
          setActiveMobileTab('scene');
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#020202] text-white flex flex-col md:flex-row overflow-hidden font-sans relative">

      {/* BARRA LATERAL IZQUIERDA: GESTIÓN */}
      <div className={`
        fixed inset-y-0 left-0 z-[500] w-full md:w-64 transform transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] flex
        ${window.innerWidth < 768 ? (activeMobileTab === 'budget' ? 'translate-x-0' : '-translate-x-full') : (isLeftBarOpen ? 'translate-x-0' : 'translate-x-[calc(-100%+24px)]')}
      `}>
        <aside className="flex-1 bg-black md:bg-black/80 backdrop-blur-3xl border-r border-white/5 flex flex-col shadow-2xl relative overflow-hidden">
          <div className="p-4 flex flex-col gap-3 items-stretch z-10">
            <button
              onClick={() => { setPlacedItems([]); setBackgroundImage(null); setSceneResolution(null); setRenderedImage(null); setShowComparison(false); setFinalBudget(null); }}
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
                onClick={() => setCanvasZoom(1.0)}
                className="h-10 flex-1 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-[7px] font-black uppercase tracking-widest text-white/40 hover:text-white"
                title="Reset Zoom"
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
              <button 
                onClick={handleDownloadInvoice}
                className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white"
                title="Exportar Presupuesto"
              >
                <i className="fa-solid fa-file-invoice-dollar text-[10px]"></i>
              </button>
            </div>
          </div>

          <div className={`flex-1 flex flex-col overflow-hidden px-4 py-4 transition-opacity duration-300 ${isLeftBarOpen || window.innerWidth < 768 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="mb-6">
              <span className="text-[7px] font-black uppercase tracking-[0.4em] text-white/30 block mb-1">PROYECTO</span>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-alpine-sap tracking-tighter">{placedItems.length}</span>
                <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest pb-1">OBJETOS</span>
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

                return groupedElements.map((element, idx) => {
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

                              let newGroupId = fromItem?.groupId || targetItem.groupId || Math.random().toString(36).substr(2, 9);

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
                            <span className={`text-[7px] font-bold ${isSelected ? 'text-black/60' : 'text-alpine-sap'}`}>
                              {finalBudget ? `$${item.price.toFixed(1)}` : '...'}
                            </span>
                          </div>
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
                                  <span className={`text-[6px] font-bold ${isSelected ? 'text-white/70' : ''}`} style={!isSelected ? { color } : {}}>
                                    {finalBudget ? `$${item.price.toFixed(1)}` : '...'}
                                  </span>
                                </div>
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
            </div>

            <div className="mt-auto border-t border-white/10 pt-4 pb-20 md:pb-4">
              <span className="text-[7px] font-black uppercase tracking-[0.4em] text-white/30 block mb-1">PRESUPUESTO</span>
              <div className="text-2xl font-black text-white tracking-tighter leading-none mb-4">
                {finalBudget !== null ? (
                  <>
                    <span className="text-sm mr-1">$</span>{finalBudget.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                  </>
                ) : (
                  <span className="text-sm text-white/40 tracking-widest">PENDIENTE</span>
                )}
              </div>

              <button
                onClick={handleDownloadInvoice}
                className="w-full h-8 mb-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center gap-2 hover:bg-white/10 transition-all group"
              >
                <i className="fa-solid fa-receipt text-[10px] text-white/40 group-hover:text-white"></i>
                <span className="text-[7px] font-bold uppercase tracking-widest text-white/50 group-hover:text-white">Descargar Ticket</span>
              </button>

              {!renderedImage && placedItems.length > 0 && (
                <button onClick={processWithAI} disabled={isRendering} className="w-full h-12 rounded-xl bg-alpine-sap text-black font-black text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-alpine-sap/10">
                  <i className={`fa-solid ${isRendering ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
                  <span>Generar Render</span>
                </button>
              )}
            </div>
          </div>
        </aside>
        <button onClick={() => setIsLeftBarOpen(!isLeftBarOpen)} className="hidden md:flex h-20 w-5 bg-black/80 backdrop-blur-3xl border border-white/10 border-l-0 rounded-r-2xl self-center items-center justify-center text-white/20 hover:text-white transition-all shadow-2xl z-[510] relative -left-[1px]"><i className={`fa-solid ${isLeftBarOpen ? 'fa-chevron-left' : 'fa-chevron-right'} text-[7px]`}></i></button>
      </div>

      {/* ÁREA PRINCIPAL: LIENZO */}
      <main className={`flex-1 relative bg-[#050505] flex items-center justify-center overflow-hidden transition-all duration-700 ${activeMobileTab !== 'scene' && window.innerWidth < 768 ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
        <div className="w-full h-full flex items-center justify-center p-2 md:p-10 pb-24 md:pb-10">
          <div className="w-full h-full flex items-center justify-center relative">
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
              <CameraCapture
                darkMode={true}
                placedItems={placedItems}
                setPlacedItems={setPlacedItems}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                externalBackground={backgroundImage}
                onDropItem={handleAddItem}
                onFileUpload={handleUserFileUpload}
                zoom={canvasZoom}
                setZoom={setCanvasZoom}
              />
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
        fixed inset-y-0 right-0 z-[500] w-full md:w-80 transform transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] flex
        ${window.innerWidth < 768 ? (activeMobileTab === 'shop' ? 'translate-x-0' : 'translate-x-full') : (isRightBarOpen ? 'translate-x-0' : 'translate-x-[calc(100%-24px)]')}
      `}>
        <button onClick={() => setIsRightBarOpen(!isRightBarOpen)} className="hidden md:flex h-20 w-5 bg-black/80 backdrop-blur-3xl border border-white/10 border-r-0 rounded-l-2xl self-center items-center justify-center text-white/20 hover:text-white transition-all shadow-2xl z-[510] relative -right-[1px]"><i className={`fa-solid ${isRightBarOpen ? 'fa-chevron-right' : 'fa-chevron-left'} text-[7px]`}></i></button>
        <aside className="flex-1 bg-black md:bg-[#080808]/95 backdrop-blur-3xl md:border-l border-white/5 p-6 md:p-7 overflow-y-auto scrollbar-hide shadow-2xl relative">
          {!renderedImage ? (
            <AssetCarousel 
              onSelectItem={handleAddItem} 
              selectedId={selectedId} 
              darkMode={true} 
              userAssets={userAssets}
              setUserAssets={setUserAssets}
              onUserFileUpload={handleUserFileUpload}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-center opacity-20">
              <i className="fa-solid fa-wand-magic-sparkles text-2xl"></i>
              <p className="text-[8px] font-black uppercase tracking-[0.4em]">Visualización de Render</p>
            </div>
          )}
        </aside>
      </div>

      {/* NAVEGACIÓN INFERIOR (MÓVIL) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black/90 backdrop-blur-3xl border-t border-white/5 z-[600] flex items-center justify-around px-4">
        <button onClick={() => setActiveMobileTab('budget')} className={`flex flex-col items-center gap-1 transition-all ${activeMobileTab === 'budget' ? 'text-alpine-sap' : 'text-white/30'}`}>
          <i className="fa-solid fa-receipt text-sm"></i>
          <span className="text-[7px] font-black uppercase tracking-widest">Proyecto</span>
        </button>
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
    </div>
  );
};

export default App;

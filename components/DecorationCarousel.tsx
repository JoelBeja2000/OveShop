
import React, { useState } from 'react';
import { DecorationCategory, DecorationItem, PricingType, VisualBehavior } from '../src/domain/types';

interface DecorationCarouselProps {
  onSelectItem: (id: string, name: string, image: string, price: number, pricingType: PricingType, x: number, y: number, hueRotate: number, saturation: number, brightness: number, description: string, visualBehavior: VisualBehavior) => void;
  selectedId: string | null;
  darkMode: boolean;
}

interface ColorVariantItem extends DecorationItem {
  hueRotate?: number;
  saturation?: number;
  brightness?: number;
}

const DecorationCarousel: React.FC<DecorationCarouselProps> = ({ onSelectItem, selectedId, darkMode }) => {
  const [expandedCategory, setExpandedCategory] = useState<DecorationCategory | null>(DecorationCategory.PARED);

  const items: ColorVariantItem[] = [
    // PIEZAS DE AUTOR - MODO FIJO (STRICT) - PARED
    {
      id: 'cuadro_musgo_mixto_redondo',
      name: 'Cuadro Circular de Musgo Mixto',
      category: DecorationCategory.PARED,
      price: 125,
      pricingType: PricingType.UNIT,
      visualBehavior: 'strict',
      image: 'https://i.postimg.cc/2SNQ3mh5/cuadro_mussgo_1_redondo_removebg_preview.png',
      description: 'Panel decorativo circular con composición artística de musgos preservados en múltiples tonalidades de verde. Diseño en capas con formas orgánicas onduladas que crean profundidad visual.'
    },
    {
      id: 'jardin_vertical_suculentas',
      name: 'Jardín Vertical con Suculentas y Musgo',
      category: DecorationCategory.PARED,
      price: 180,
      pricingType: PricingType.UNIT,
      visualBehavior: 'strict',
      image: 'https://i.postimg.cc/6pxrTwn3/cuadro_mussgo_cuadrado_1_removebg_preview.png',
      description: 'Panel vegetal mixto enmarcado que combina musgo preservado en tonos verdes y amarillos con plantas suculentas de hojas verdes brillantes.'
    },
    {
      id: 'panel_musgo_denso',
      name: 'Panel de Musgo Verde Denso',
      category: DecorationCategory.PARED,
      price: 95,
      pricingType: PricingType.UNIT,
      visualBehavior: 'strict',
      image: 'https://i.postimg.cc/P5nWNhYJ/cuadro_mussgo_cuadrado_5_removebg_preview.png',
      description: 'Panel cuadrado completamente cubierto de musgo preservado de textura esponjosa. Ideal para revestimiento decorativo de paredes.'
    },
    {
      id: 'panel_vertical_led',
      name: 'Panel Vertical Musgo con Iluminación LED',
      category: DecorationCategory.PARED,
      price: 450,
      pricingType: PricingType.UNIT,
      visualBehavior: 'strict',
      image: 'https://i.postimg.cc/CxpGdYkn/Gemini_Generated_Image_9cfz3z9cfz3z9cfz_removebg_preview.png',
      description: 'Panel vertical rectangular con musgo preservado e iluminación LED integrada en la base que proyecta luz hacia arriba.'
    },
    {
      id: 'cuadro_botanico_invernal',
      name: 'Cuadro Botánico Invernal',
      category: DecorationCategory.PARED,
      price: 140,
      pricingType: PricingType.UNIT,
      visualBehavior: 'strict',
      image: 'https://i.postimg.cc/bwfxd8k2/Gemini_Generated_Image_jof307jof307jof3_removebg_preview.png',
      description: 'Composición de vegetación preservada en tonos verdes, grises y blancos que evocan un paisaje invernal.'
    },
    {
      id: 'cuadro_panoramico_jardin',
      name: 'Cuadro Panorámico de Jardín Musgo',
      category: DecorationCategory.PARED,
      price: 320,
      pricingType: PricingType.UNIT,
      visualBehavior: 'strict',
      image: 'https://i.postimg.cc/RZx7q9KH/Gemini_Generated_Image_rno57arno57arno5_removebg_preview.png',
      description: 'Panel horizontal rectangular con jardín en miniatura de musgo preservado, plantas brillantes y detalles de vegetación seca.'
    },

    // PIEZAS DE AUTOR - MODO FIJO (STRICT) - TECHO/MESA
    {
      id: 'ecosistema_otonal_luz',
      name: 'Cuadro Circular Ecosistema Otoñal',
      category: DecorationCategory.PARED,
      price: 290,
      pricingType: PricingType.UNIT,
      visualBehavior: 'strict',
      image: 'https://i.postimg.cc/bwfxd8kD/Gemini_Generated_Image_2qekno2qekno2qek_removebg_preview.png',
      description: 'Panel circular botánico con tonos otoñales y lámpara circular integrada con luz cálida amarilla.'
    },
    {
      id: 'maqueta_topografica_veg',
      name: 'Maqueta Topográfica con Vegetación',
      category: DecorationCategory.MESA,
      price: 210,
      pricingType: PricingType.UNIT,
      visualBehavior: 'strict',
      image: 'https://i.postimg.cc/qvHsg0yg/cuadro_mussgo_cuadrado_2_removebg_preview.png',
      description: 'Diorama tridimensional topográfico que representa relieve con musgo verde y zonas texturizadas beige/blanco.'
    },
    {
      id: 'estructura_colgante_roja',
      name: 'Lámpara Colgante Floral',
      category: DecorationCategory.TECHO,
      price: 380,
      pricingType: PricingType.UNIT,
      visualBehavior: 'strict',
      image: 'https://i.postimg.cc/KzDDBYSp/image-removebg-preview.png',
      description: 'Escultura lumínica de techo con forma helicoidal y luz LED integrada, revestida con arreglos florales preservados en tonos rojos, cobre y burdeos.'
    },

    // PERSONAS
    {
      id: 'persona_javi',
      name: 'Javi',
      category: DecorationCategory.PERSONA,
      price: 0,
      pricingType: PricingType.UNIT,
      visualBehavior: 'generative',
      image: 'https://i.postimg.cc/C5t7LQVF/image-removebg-preview-(3).png',
      description: 'Persona real. Se adapta al entorno y posición.'
    },

    // ELEMENTOS ORGÁNICOS - MODO AUTO (GENERATIVE) - MESA/SUELO
    {
      id: 'roca_gris_musgo',
      name: 'Roca Gris con Musgo sutil',
      category: DecorationCategory.MESA,
      price: 45,
      pricingType: PricingType.UNIT,
      visualBehavior: 'generative',
      image: 'https://i.postimg.cc/dQytfnYf/580b585b2edbce24c47b26f5.png',
      description: 'Piedra o roca de textura rugosa en tonos grises con manchas sutiles de musgo o líquenes verdes en los bordes.'
    },
    {
      id: 'cactus_pro_gen',
      name: 'Cactus Columnar',
      category: DecorationCategory.MESA,
      price: 55,
      pricingType: PricingType.UNIT,
      visualBehavior: 'generative',
      image: 'https://i.postimg.cc/rzqk01z9/580b585b2edbce24c47b2632.png',
      description: 'Cactus desértico columnar con espinas realistas y piel suculenta detallada.'
    },
    {
      id: 'stitch_peluche_gen',
      name: 'Peluche de Stitch',
      category: DecorationCategory.MESA,
      price: 22,
      pricingType: PricingType.UNIT,
      visualBehavior: 'generative',
      image: 'https://i.postimg.cc/N0rgKqcn/peluche-stitchcon-sonido-lilo-y-stitch-de-disney-22-cmm.png',
      description: 'Objeto decorativo infantil. Peluche de alta calidad con textura de tela real.'
    },
    {
      id: 'cesped_denso_gen',
      name: 'Césped Pro',
      category: DecorationCategory.SUELO,
      price: 35,
      pricingType: PricingType.AREA,
      visualBehavior: 'generative',
      image: 'https://i.postimg.cc/KzMjnhDX/Pngtree-square-patch-of-fresh-green-20843080-(1).png',
      description: 'Césped natural de alta gama con briznas realistas y profundidad.'
    },
    {
      id: 'musgo_monticulos_gen',
      name: 'Montículos de Musgo',
      category: DecorationCategory.SUELO,
      price: 20,
      pricingType: PricingType.AREA,
      visualBehavior: 'generative',
      image: 'https://i.postimg.cc/XNC7Pxbm/ai_generated_green_moss_with_grass_clip_art_free_png.png',
      description: 'Pequeñas dunas de musgo esponjoso con micro-textura volumétrica.'
    },
    {
      id: 'linea_de_fa',
      name: 'Línea de Fa',
      category: DecorationCategory.MESA,
      price: 1.5, // Price per gram (example)
      pricingType: PricingType.WEIGHT,
      visualBehavior: 'generative',
      image: 'https://i.postimg.cc/43hNy8hT/image-removebg-preview-(4).png',
      description: 'Elemento decorativo lineal para mesas. Precio calculado por peso (gramos).'
    }
  ];

  const handleDragStart = (e: React.DragEvent, item: ColorVariantItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify({
      id: item.id,
      name: item.name,
      image: item.image,
      price: item.price || 0,
      pricingType: item.pricingType,
      hueRotate: item.hueRotate || 0,
      saturation: item.saturation || 1,
      brightness: item.brightness || 1,
      description: item.description,
      visualBehavior: item.visualBehavior || 'generative'
    }));
  };

  const categories = Object.values(DecorationCategory);

  return (
    <div className="flex flex-col gap-2 py-2">
      <div className="mb-6 px-1">
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/80">Catálogo Pro</h2>
        <div className="h-0.5 w-10 bg-alpine-sap mt-2"></div>
      </div>
      {categories.map((cat) => {
        const categoryItems = items.filter(item => item.category === cat);
        if (categoryItems.length === 0) return null;
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
              </div>
              <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-[7px]`}></i>
            </button>

            <div className={`grid transition-all duration-500 ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden flex flex-col gap-4 px-1">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, item)}
                    onClick={() => onSelectItem(item.id, item.name, item.image, item.price || 0, item.pricingType, 50, 50, item.hueRotate || 0, item.saturation || 1, item.brightness || 1, item.description, item.visualBehavior || 'generative')}
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
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/90 truncate">{item.name}</span>
                        <div className={`shrink-0 text-[5px] font-bold px-1.5 py-0.5 rounded border ${item.visualBehavior === 'strict' ? 'border-alpine-sap text-alpine-sap' : 'border-white/20 text-white/40'}`}>
                          {item.visualBehavior === 'strict' ? 'FIJO' : 'AUTO'}
                        </div>
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

export default DecorationCarousel;

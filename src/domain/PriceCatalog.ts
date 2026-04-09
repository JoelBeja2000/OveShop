import { PricingType } from "./types";

export interface PriceRule {
    basePrice: number; // Price per unit, per m2, or per 100g
    type: PricingType;
    minPrice?: number; // Minimum charge
    installationFee?: number; // One-time fee per item type
}

// Global estimation constants
export const PRICE_CONFIG = {
    // Assumption: The canvas height represents roughly 3 meters in reality for 'Area' calculations
    ASSUMED_SCENE_HEIGHT_METERS: 3.0,
    // For weight items, approximate density conversion 
    GRAMS_PER_SCALE_UNIT: 50
};

// INVENTED PRICING DATA "On another file" as requested
export const PRICE_CATALOG: Record<string, PriceRule> = {
    // WALL ITEMS
    'cuadro_musgo_mixto_redondo': { basePrice: 145.50, type: PricingType.UNIT, installationFee: 25 },
    'jardin_vertical_suculentas': { basePrice: 210.00, type: PricingType.UNIT, installationFee: 35 },
    'panel_musgo_denso': { basePrice: 110.00, type: PricingType.UNIT },
    'panel_vertical_led': { basePrice: 499.99, type: PricingType.UNIT, installationFee: 60 },
    'cuadro_botanico_invernal': { basePrice: 165.00, type: PricingType.UNIT },
    'cuadro_panoramico_jardin': { basePrice: 350.00, type: PricingType.UNIT, installationFee: 40 },
    'ecosistema_otonal_luz': { basePrice: 310.00, type: PricingType.UNIT, installationFee: 30 },
    'maqueta_topografica_veg': { basePrice: 245.00, type: PricingType.UNIT },
    'estructura_colgante_roja': { basePrice: 420.00, type: PricingType.UNIT, installationFee: 80 },

    // TABLE/FLOOR ITEMS
    'roca_gris_musgo': { basePrice: 55.00, type: PricingType.UNIT },
    'cactus_pro_gen': { basePrice: 65.00, type: PricingType.UNIT },
    'planta_maceta_cintas': { basePrice: 48.00, type: PricingType.UNIT },
    'stitch_peluche_gen': { basePrice: 25.99, type: PricingType.UNIT },

    // AREA BASED (Prices per m2)
    'cesped_denso_gen': { basePrice: 45.00, type: PricingType.AREA, minPrice: 20 }, // 45 per m2
    'musgo_monticulos_gen': { basePrice: 85.00, type: PricingType.AREA },

    // WEIGHT BASED (Prices per 100g)
    'linea_de_fa': { basePrice: 12.50, type: PricingType.WEIGHT }, // 12.50 per 100g

    // PEOPLE
    'persona_javi': { basePrice: 0, type: PricingType.UNIT }
};

export const getPriceForItem = (id: string): PriceRule => {
    return PRICE_CATALOG[id] || { basePrice: 0, type: PricingType.UNIT };
};

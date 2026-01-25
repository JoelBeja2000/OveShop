
export enum DecorationCategory {
  SUELO = 'Suelo',
  PARED = 'Pared',
  MESA = 'Mesa / Decoración',
  TECHO = 'Techo / Superior',
  PERSONA = 'Personas'
}

export enum PricingType {
  UNIT = 'unidad',
  AREA = 'm²',
  WEIGHT = 'g'
}

export type VisualBehavior = 'strict' | 'generative';

export interface DecorationItem {
  id: string;
  name: string;
  category: DecorationCategory;
  price?: number;
  pricingType: PricingType;
  image: string;
  description: string;
  visualBehavior?: VisualBehavior;
}

export interface PerspectivePoints {
  tl: { x: number; y: number };
  tr: { x: number; y: number };
  bl: { x: number; y: number };
  br: { x: number; y: number };
}

export interface PlacedItem {
  id: string;
  itemId: string;
  name: string;
  description: string;
  x: number;
  y: number;
  scale: number;
  scaleX?: number; // 1 or -1 for mirroring
  aspectRatio: number;
  rotation: number;
  image: string;
  price: number;
  pricingType: PricingType;
  perspective?: PerspectivePoints;
  hueRotate?: number;
  saturation?: number;
  brightness?: number;
  visualBehavior: VisualBehavior;
}

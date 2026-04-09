
export enum AssetCategory {
  INVENTORY = 'Inventario',
  BACKGROUND = 'Fondo',
  OBJECT = 'Objeto',
  CHARACTER = 'Personaje',
  EFFECT = 'Efecto/VFX',
  OTHER = 'Otros'
}

export type VisualBehavior = 'strict' | 'generative';

export interface AssetItem {
  id: string;
  name: string;
  category: AssetCategory;
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
  perspective?: PerspectivePoints;
  hueRotate?: number;
  saturation?: number;
  brightness?: number;
  visualBehavior: VisualBehavior;
  customPrompt?: string;
  occlusionMode?: 'overlay' | 'destroy';
  groupId?: string; // ID for grouping related items
  groupRole?: string; // specific role in the relation (e.g. "Item A", "Item B")
}

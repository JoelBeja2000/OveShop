
export enum AssetCategory {
  INVENTORY = 'Inventario',
  BACKGROUND = 'Fondo',
  OBJECT = 'Objeto',
  CHARACTER = 'Personaje',
  EFFECT = 'Efecto/VFX',
  OTHER = 'Otros',
  DRAWING = 'Dibujo',
  TEXT = 'Texto'
}

export interface TextConfig {
  text: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  fontWeight: string;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right';
  isRichText?: boolean;
  richText?: string;
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
  drawingStrokes?: DrawingStroke[];
  drawingBounds?: { minX: number, minY: number, width: number, height: number };
  colorLabels?: Record<string, string>;
  textConfig?: TextConfig;
}

export type BrushType = 'pencil' | 'highlighter' | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface DrawingSegment {
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  type: BrushType;
}

export interface DrawingStroke {
  id: string;
  segments: DrawingSegment[];
  x: number;
  y: number;
  zIndex: number;
}

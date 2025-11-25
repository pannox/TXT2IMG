export interface ArtSettings {
  fontSizeMin: number;
  fontSizeMax: number;
  spacing: number;
  rotation: 'random' | 'horizontal' | 'vertical' | 'mixed';
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  backgroundMode: 'solid' | 'image';
  backgroundImage?: string;
  iterations: number; // Higher means tighter packing but slower
}

export interface ShapeMask {
  id: string;
  name: string;
  url: string; // Data URL or Image URL
  type: 'preset' | 'generated' | 'upload';
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // radians
}
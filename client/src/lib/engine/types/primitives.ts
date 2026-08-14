/**
 * lib/engine/types/primitives.ts
 *
 * Tipos primitivos fundamentais e neutros do DocMaster Engine V1.
 * 100% puro: sem dependências de DOM, React, navegador ou Cloudflare.
 */

export type DimensionUnit = 'px' | 'pt' | 'mm' | 'in';

export type CanvasOrientation = 'portrait' | 'landscape' | 'square' | 'custom';

export interface CanvasDefinition {
  readonly width: number;
  readonly height: number;
  readonly unit: DimensionUnit;
  /**
   * DPI (dots per inch) opcional para metadados de rasterização/exportação.
   * Não altera as coordenadas matemáticas do CanvasDefinition.
   */
  readonly dpi?: number;
  readonly orientation: CanvasOrientation;
}

export type FontWeight = 'normal' | 'bold' | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type FontStyle = 'normal' | 'italic';

export interface FontSpec {
  readonly family: string;
  readonly size: number;
  readonly weight: FontWeight;
  readonly style?: FontStyle;
  readonly letterSpacing?: number;
  readonly lineHeight?: number;
}

export type ColorValue = string;

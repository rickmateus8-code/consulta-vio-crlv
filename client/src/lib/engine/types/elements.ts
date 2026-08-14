/**
 * lib/engine/types/elements.ts
 *
 * Modelo Universal de Elementos visuais sobre o Canvas.
 */

import type { ColorValue, FontSpec } from './primitives';
import type { ElementGeometry } from './geometry';

export type ElementType =
  | 'TEXT'
  | 'IMAGE'
  | 'PHOTO'
  | 'SIGNATURE'
  | 'QR_CODE'
  | 'MRZ'
  | 'BARCODE'
  | 'SHAPE'
  | 'LINE'
  | 'TABLE';

export interface TextElementConfig {
  readonly font: FontSpec;
  readonly color: ColorValue;
  readonly align: 'left' | 'center' | 'right';
  readonly uppercase?: boolean;
  readonly wordWrap?: boolean;
}

export interface QRCodeConfig {
  readonly errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  readonly margin?: number;
  readonly intensity?: number;
}

export interface MRZConfig {
  readonly standard?: 'ICAO_9303_TD1' | 'ICAO_9303_TD2' | 'ICAO_9303_TD3';
  readonly format?: string;
}

export interface ElementDefinition {
  readonly id: string;
  readonly type: ElementType;
  readonly geometry: ElementGeometry;
  /** Vínculo canônico com chave de campo em FormDefinition. */
  readonly fieldBinding?: string;
  /** Valor estático quando o elemento não é vinculado a campo dinâmico. */
  readonly staticValue?: string;
  /** Referência a um Asset de Design em AssetSet (ex: logo, brasão). */
  readonly assetRefId?: string;
  readonly textConfig?: TextElementConfig;
  readonly qrConfig?: QRCodeConfig;
  readonly mrzConfig?: MRZConfig;
  readonly locked?: boolean;
  readonly visibility?: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

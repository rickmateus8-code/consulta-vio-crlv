/**
 * lib/engine/types/layout.ts
 *
 * Definição de Layout Visual.
 * O Layout é o dono do CanvasDefinition, da BaseAsset de fundo e dos ElementDefinitions.
 */

import type { CanvasDefinition } from './primitives';
import type { ElementDefinition } from './elements';

export interface LayoutDefinition {
  readonly id: string;
  readonly name: string;
  readonly canvas: CanvasDefinition;
  readonly baseAssetId?: string;
  readonly elements: readonly ElementDefinition[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

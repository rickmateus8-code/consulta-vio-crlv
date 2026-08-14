/**
 * lib/engine/types/document.ts
 *
 * Definição Mestre do Documento (DocumentDefinition).
 * Agrupa FormDefinition, AssetSet e múltiplos RenderProfiles.
 */

import type { RenderProfile } from './renderProfile';

export type DocumentStatus = 'draft' | 'audit' | 'published' | 'deprecated';

export interface DocumentDefinition {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly category: string;
  readonly version: number;
  readonly status: DocumentStatus;
  readonly formDefinitionId: string;
  readonly assetSetId?: string;
  readonly renderProfiles: readonly RenderProfile[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

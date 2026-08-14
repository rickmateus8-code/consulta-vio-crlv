/**
 * lib/engine/resolvers/types.ts
 *
 * Contratos de entrada e diagnóstico para o Document Resolver (Phase 3B.2).
 */

import type { DocumentDefinition } from '../types/document';
import type { LayoutDefinition } from '../types/layout';
import type { FormDefinition } from '../types/form';
import type { AssetSet } from '../types/assets';
import type { CanonicalData } from '../types/data';
import type {
  ResolutionDiagnostic,
  ResolutionDiagnosticLevel,
  ResolutionSuccess,
  ResolutionFailure,
  ResolvedRenderDocument,
} from '../types/resolved';

export interface ResolveDocumentInput {
  readonly doc: DocumentDefinition;
  readonly profileId: string;
  readonly layouts: readonly LayoutDefinition[];
  readonly forms: readonly FormDefinition[];
  readonly assetSets: readonly AssetSet[];
  readonly data: CanonicalData;
}

export function createResolutionDiagnostic(
  level: ResolutionDiagnosticLevel,
  code: string,
  message: string,
  options?: {
    readonly pageId?: string;
    readonly elementId?: string;
    readonly path?: string;
  }
): ResolutionDiagnostic {
  return {
    level,
    code,
    message,
    pageId: options?.pageId,
    elementId: options?.elementId,
    path: options?.path,
  };
}

export function hasResolutionErrors(diagnostics: readonly ResolutionDiagnostic[]): boolean {
  return diagnostics.some(d => d.level === 'error');
}

export function createResolutionSuccess(
  document: ResolvedRenderDocument,
  diagnostics: readonly ResolutionDiagnostic[] = []
): ResolutionSuccess {
  return {
    ok: true,
    document,
    diagnostics,
  };
}

export function createResolutionFailure(
  diagnostics: readonly ResolutionDiagnostic[]
): ResolutionFailure {
  return {
    ok: false,
    diagnostics,
  };
}

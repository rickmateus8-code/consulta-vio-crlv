/**
 * lib/engine/adapters/diagnostics.ts
 *
 * Funções auxiliares puras para criação e filtragem de diagnósticos e resultados de adaptação.
 */

import type { CanonicalData, EmissionIdentity } from '../types/data';
import type { RuntimeMediaRef } from '../types/assets';
import type {
  AdapterDiagnostic,
  AdapterDiagnosticLevel,
  AdapterSuccess,
  AdapterFailure,
} from './types';

export function createDiagnostic(
  level: AdapterDiagnosticLevel,
  code: string,
  message: string,
  path?: string
): AdapterDiagnostic {
  return { level, code, message, path };
}

export function hasAdapterErrors(diagnostics: readonly AdapterDiagnostic[]): boolean {
  return diagnostics.some(d => d.level === 'error');
}

export function warningsOf(diagnostics: readonly AdapterDiagnostic[]): readonly AdapterDiagnostic[] {
  return diagnostics.filter(d => d.level === 'warning');
}

export function errorsOf(diagnostics: readonly AdapterDiagnostic[]): readonly AdapterDiagnostic[] {
  return diagnostics.filter(d => d.level === 'error');
}

export function createAdapterSuccess(
  data: CanonicalData,
  options?: {
    identity?: EmissionIdentity;
    mediaRefs?: readonly RuntimeMediaRef[];
    diagnostics?: readonly AdapterDiagnostic[];
  }
): AdapterSuccess {
  return {
    ok: true,
    data,
    identity: options?.identity,
    mediaRefs: options?.mediaRefs,
    diagnostics: options?.diagnostics ?? [],
  };
}

export function createAdapterFailure(diagnostics: readonly AdapterDiagnostic[]): AdapterFailure {
  return {
    ok: false,
    diagnostics,
  };
}

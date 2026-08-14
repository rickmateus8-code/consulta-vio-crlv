/**
 * lib/engine/adapters/types.ts
 *
 * Contratos genéricos e puros para a camada de Adapters de Borda da Engine V1.
 * 100% puro: sem dependências de navegador, React, CNH ou banco de dados.
 */

import type { CanonicalData, EmissionIdentity } from '../types/data';
import type { RuntimeMediaRef } from '../types/assets';

export type AdapterDiagnosticLevel = 'warning' | 'error';

export interface AdapterDiagnostic {
  readonly level: AdapterDiagnosticLevel;
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

/**
 * Envelope confiável de persistência/runtime injetado externamente (ex: do banco D1 ou sessão).
 * INVARIANTE: Chaves arbitrárias de payload não-confiável (raw.id, raw.docId, raw.cpf)
 * NUNCA devem sobrescrever a identidade contida neste contexto.
 */
export interface AdapterContext {
  readonly emissionId?: string;
  readonly validationId?: string;
  readonly createdAt?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export type AdapterMode = 'legacy' | 'strict';

export interface AdapterSuccess {
  readonly ok: true;
  readonly data: CanonicalData;
  readonly identity?: EmissionIdentity;
  readonly mediaRefs?: readonly RuntimeMediaRef[];
  readonly diagnostics: readonly AdapterDiagnostic[];
}

export interface AdapterFailure {
  readonly ok: false;
  readonly diagnostics: readonly AdapterDiagnostic[];
}

/**
 * Resultado discriminado de adaptação de entrada.
 * Em caso de falha (ok: false), CanonicalData válida NÃO é exposta.
 */
export type AdapterResult = AdapterSuccess | AdapterFailure;

/**
 * Interface universal de Adapter de Borda para ingestão documental.
 */
export interface LegacyInputAdapter<TRaw = unknown> {
  readonly id: string;
  /** Identificador semântico do tipo documental (ex: 'cnh', 'atestado', 'crlv'). */
  readonly documentType: string;
  readonly version: number;
  /** Identifica se o payload de entrada é suportado por este adapter. */
  supports(input: unknown): input is TRaw;
  /** Executa a adaptação do payload para CanonicalData sem lançar exceções para erros esperados. */
  adapt(raw: TRaw, context?: AdapterContext, mode?: AdapterMode): AdapterResult;
}

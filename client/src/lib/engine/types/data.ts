/**
 * lib/engine/types/data.ts
 *
 * Modelo de Dados Canônicos de Preenchimento e Identidade de Emissão.
 * 100% puro e agnóstico de documentos específicos.
 */

/**
 * Dicionário universal de valores canônicos preenchidos (chave canônica -> valor).
 */
export type CanonicalData = Readonly<Record<string, unknown>>;

/**
 * Identidade unívoca de uma emissão documental no sistema.
 */
export interface EmissionIdentity {
  /** Identificador primário UUID da emissão (documents.id). */
  readonly emissionId: string;
  /** Código alternativo de validação ou hash quando aplicável. */
  readonly validationId?: string;
  /** Timestamp de criação da emissão no banco. */
  readonly createdAt?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

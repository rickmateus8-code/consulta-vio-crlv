/**
 * lib/engine/adapters/cnhLegacyAdapter.ts
 *
 * Adapter de Borda de Referência para Ingestão de CNH (DocMaster Engine V1).
 * Atua como bridge para o normalizador estável existente (client/src/lib/cnh/normalize.ts).
 *
 * INVARIANTES:
 *  - NÃO duplica ALIAS_MAP, unwrap de nesting, formatação de datas ou derivações.
 *  - O context confiável é a ÚNICA fonte de EmissionIdentity.
 *  - validationId NÃO faz fallback para emissionId (permanece undefined se context.validationId for omitido).
 *  - raw.id, raw.docId, raw.codigoQR e raw.cpf NUNCA sobrescrevem context.emissionId.
 *  - Se context.emissionId for omitido, identity permanece undefined (zero fake UUIDs).
 *  - Mídias (fotoUrl, assinaturaUrl) residem em CanonicalData sem duplicação em mediaRefs.
 */

import { normalizeCNHRenderInput } from '../../cnh/normalize';
import type { CanonicalData, EmissionIdentity } from '../types/data';
import type {
  LegacyInputAdapter,
  AdapterContext,
  AdapterMode,
  AdapterResult,
  AdapterDiagnostic,
} from './types';
import {
  createDiagnostic,
  createAdapterSuccess,
  createAdapterFailure,
} from './diagnostics';

/**
 * Heurística conservadora para identificar se um payload representa confiavelmente uma CNH.
 * Evita falsos positivos em payloads genéricos contendo apenas uma chave genérica (ex: 'categoria').
 */
function isCNHPayloadLike(obj: Record<string, unknown>): boolean {
  // 1. Sinais explícitos de tipo no envelope
  const tipo = typeof obj.tipo === 'string' ? obj.tipo.toLowerCase() : '';
  const docType = typeof obj.documentType === 'string' ? obj.documentType.toLowerCase() : '';
  if (tipo === 'cnh' || docType === 'cnh') return true;

  // Sinais explícitos em envelope aninhado
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    const inner = obj.data as Record<string, unknown>;
    const innerTipo = typeof inner.tipo === 'string' ? inner.tipo.toLowerCase() : '';
    if (innerTipo === 'cnh') return true;
  }

  // 2. Chaves altamente específicas e exclusivas da CNH (1 sinal basta)
  const exclusiveKeys = [
    'renach',
    'categoria_cnh',
    'registro_cnh',
    'validade_cnh',
    'primeiraHabilitacao',
    'primeiraHab',
    'primeira_habilitacao',
    'assDigital1',
    'assDigital2',
    'numeroFormulario',
    'acc_cnh',
  ];

  for (const k of exclusiveKeys) {
    if (k in obj && obj[k] !== undefined && obj[k] !== null) return true;
    if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
      if (k in (obj.data as Record<string, unknown>)) return true;
    }
  }

  // 3. Chaves documentais comuns de CNH: requer no mínimo 2 sinais coincidentes para evitar falso positivo
  const commonKeys = ['categoria', 'registro', 'espelho', 'validade', 'acc'];
  let matchCount = 0;

  for (const k of commonKeys) {
    if (k in obj && obj[k] !== undefined && obj[k] !== null) matchCount++;
    else if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
      if (k in (obj.data as Record<string, unknown>)) matchCount++;
    }
  }

  return matchCount >= 2;
}

export const cnhLegacyAdapter: LegacyInputAdapter<Record<string, unknown>> = {
  id: 'adapter_cnh_v1',
  documentType: 'cnh',
  version: 1,

  supports(input: unknown): input is Record<string, unknown> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return false;
    }
    return isCNHPayloadLike(input as Record<string, unknown>);
  },

  adapt(
    raw: Record<string, unknown>,
    context?: AdapterContext,
    mode: AdapterMode = 'legacy'
  ): AdapterResult {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return createAdapterFailure([
        createDiagnostic('error', 'INVALID_INPUT_TYPE', 'Expected CNH raw input to be a non-null object'),
      ]);
    }

    const diagnostics: AdapterDiagnostic[] = [];

    // Inspeção de modo estrito vs legados
    const isNested = Boolean(raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data));
    if (mode === 'strict' && isNested) {
      return createAdapterFailure([
        createDiagnostic(
          'error',
          'STRICT_MODE_REJECTED_NESTING',
          "Strict mode rejects nested legacy 'data' payload structure"
        ),
      ]);
    }

    if (isNested) {
      diagnostics.push(
        createDiagnostic(
          'warning',
          'LEGACY_NESTING_DETECTED',
          "Nested legacy 'data' payload structure was unnested"
        )
      );
    }

    // Auditoria de identidade bruta ignorada
    if ('id' in raw && context?.emissionId && raw.id !== context.emissionId) {
      diagnostics.push(
        createDiagnostic(
          'warning',
          'RAW_ID_IGNORED',
          "Raw payload 'id' was ignored in favor of trusted context emissionId"
        )
      );
    }

    try {
      // Reuso 1:1 da implementação estável existente
      const normalized = normalizeCNHRenderInput(raw, {
        emissionId: context?.emissionId ?? '',
        validationId: context?.validationId,
        createdAt: context?.createdAt,
      });

      // Projeta CanonicalData diretamente do CNHCanonicalData
      const canonicalData: CanonicalData = normalized.data as unknown as CanonicalData;

      // Constrói identity SOMENTE a partir do context confiável (sem fallback de validationId para emissionId)
      let identity: EmissionIdentity | undefined;
      if (context?.emissionId) {
        identity = {
          emissionId: context.emissionId,
          validationId: context.validationId, // Permanece undefined se não fornecido
          createdAt: context.createdAt,
        };
      }

      return createAdapterSuccess(canonicalData, {
        identity,
        mediaRefs: undefined, // Preserva SSOT: fotoUrl e assinaturaUrl vivem em CanonicalData
        diagnostics,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return createAdapterFailure([
        createDiagnostic(
          'error',
          'NORMALIZATION_FAILED',
          'Underlying CNH normalizer failed: ' + errMsg
        ),
      ]);
    }
  },
};

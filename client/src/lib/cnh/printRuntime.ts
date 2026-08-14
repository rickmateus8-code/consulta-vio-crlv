/**
 * lib/cnh/printRuntime.ts
 *
 * Helper puro para resolução de identidade em runtime do renderer PRINT_A4.
 *
 * PRINCÍPIO: NÃO acessa React, DOM, canvas ou fetch.
 *            Pode ser importado em testes sem ambiente de browser.
 *
 * Fase 2E.1 — Phase 2 Unified Master Render
 */

import type { CNHPrintRuntimeIdentity } from "./renderInput";

// ─── Constante Pública ────────────────────────────────────────────────────────

/**
 * UUID placeholder usado pelo PRINT_A4 quando não existe validationId real.
 * Mantido idêntico ao valor original hardcoded em drawCNHToCanvas (comportamento legado).
 */
export const PRINT_QR_PLACEHOLDER = "31c64778-606e-436e-9f9d-287574f23abe";

// ─── Helper Principal ─────────────────────────────────────────────────────────

/**
 * Resolve o valor do QR Code para o renderer PRINT_A4.
 *
 * Preserva EXATAMENTE a semântica legada de drawCNHToCanvas:
 *   - mode="preview"                     → placeholder (sem QR real)
 *   - validationId ausente ou vazio      → placeholder
 *   - value === "PREVIEW"               → placeholder (sentinel legado)
 *   - value contém "."                  → placeholder (proteção contra URLs D1 legadas)
 *   - valor legado válido (sem ".")      → usar valor diretamente
 *
 * NÃO valida formato UUID — comportamento idêntico ao renderer anterior.
 * NÃO tornar a validação mais rígida nesta fase (behavior-preserving).
 *
 * @param runtime - Identidade runtime resolvida pelo caller.
 * @returns UUID string a usar no gerarQRCode — nunca vazio, nunca "PREVIEW".
 */
export function resolveQRForPrint(runtime: CNHPrintRuntimeIdentity): string {
  if (runtime.mode === "preview") return PRINT_QR_PLACEHOLDER;

  const raw = runtime.rawValidationValue ?? runtime.validationId;
  if (!raw || raw === "PREVIEW" || raw.includes(".")) return PRINT_QR_PLACEHOLDER;
  return raw;
}

// ─── Helpers de Construção de Runtime ────────────────────────────────────────

/**
 * Constrói CNHPrintRuntimeIdentity para estado pré-emissão (nova CNH não salva).
 * emissionId ausente porque documents.id ainda não existe.
 */
export function previewRuntime(): CNHPrintRuntimeIdentity {
  return { mode: "preview" };
}

/**
 * Constrói CNHPrintRuntimeIdentity para documento existente em carregamento
 * (ex: CNHEditar durante fetch, ou modo edit em CNHCria).
 * emissionId conhecido (docId da URL), mas dados ainda não carregados.
 */
export function previewRuntimeWithId(emissionId: string): CNHPrintRuntimeIdentity {
  return { mode: "preview", emissionId };
}

/**
 * Constrói CNHPrintRuntimeIdentity para emissão confirmada.
 * emissionId = documents.id (UUID do INSERT).
 * validationId = documents.codigo_qr || documents.id.
 */
export function emittedRuntime(
  emissionId: string,
  validationId: string,
  rawValidationValue?: string,
): CNHPrintRuntimeIdentity {
  return { mode: "emitted", emissionId, validationId, rawValidationValue };
}

/**
 * lib/cnh/validation.ts
 *
 * URL canônica de validação CNH — função determinística única.
 *
 * PROBLEMA ANTERIOR: múltiplas construções manuais da URL espalhadas pelo código,
 * e duas divergências em config.qrcode.ts:
 *   - Usa "/?id=" sem "/consulta/" (incorreto vs renderers ativos)
 *   - Usa domínio "validacao-digital-vio.online" (diferente de "validacao-online-vio.digital")
 *
 * SOLUÇÃO: Esta função é a única fonte canônica para URLs de validação CNH.
 *
 * URL CANÔNICA (auditada nos renderers ativos em 2026-08-13):
 *   https://validacao-online-vio.digital/consulta/?id={UUID}
 *
 * A função:
 *   - Recebe o validationId já resolvido pelo caller
 *   - NÃO busca CPF, NÃO resolve aliases, NÃO consulta D1
 *   - NÃO escolhe qual emissão está ativa
 *   - É pura: mesmo input → mesmo output
 *
 * config.qrcode.ts NÃO foi modificado (decisão deliberada — ver débito técnico abaixo).
 *
 * DÉBITO TÉCNICO (NÃO corrigir agora):
 *   config.qrcode.ts:19  → "https://validacao-online-vio.digital/?id=" (falta /consulta/)
 *   config.qrcode.ts:53  → "https://validacao-online-vio.digital/?id=" (falta /consulta/)
 *   config.qrcode.ts:79  → domínio "validacao-digital-vio.online" (errado)
 *   config.qrcode.ts:81  → domínio "validacao-digital-vio.online" (errado)
 *   getQRCodeCNH() em CNHEditar.tsx:14 → importado mas NUNCA chamado (import morto)
 *   habilitacao.html:492,538 → asset estático fora do bundle React — fora do escopo 2B
 *
 * Fase 2B — Phase 2 Unified Master Render
 */

/** Domínio canônico de validação CNH — auditado nos renderers ativos. */
const CNH_VALIDATION_BASE = "https://validacao-online-vio.digital";

/**
 * Constrói deterministicamente a URL de validação da CNH.
 *
 * @param validationId - UUID da emissão (documents.id = documents.codigo_validacao para CNH).
 *   Deve ser um UUID válido. A função não valida o formato — o caller é responsável.
 *
 * @returns URL completa: https://validacao-online-vio.digital/consulta/?id={validationId}
 *
 * @example
 *   getCNHValidationUrl("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
 *   // → "https://validacao-online-vio.digital/consulta/?id=a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 */
export function getCNHValidationUrl(validationId: string): string {
  return `${CNH_VALIDATION_BASE}/consulta/?id=${encodeURIComponent(validationId)}`;
}

/**
 * Retorna o domínio base (sem path) para uso em comparações ou construções específicas.
 * Evitar usar diretamente — preferir getCNHValidationUrl.
 */
export const CNH_VALIDATION_DOMAIN = CNH_VALIDATION_BASE;

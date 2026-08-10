/**
 * Configuração de QR Code — DocMaster
 * Sistema UNIVERSAL de validação via QR Code.
 *
 * Domínios de validação por tipo de documento:
 * - Atestados:  https://validaratestado.digital/verificar/atestado/:codigo
 * - Receitas:   https://verificamed.digital/verificar/receita/:codigo
 * - CNH:        https://validacao-online-vio.digital/?id=:codigo
 * - Genérico:   https://docmaster.store/v/:codigo
 *
 * REGRA UNIVERSAL: Todo documento com QR Code DEVE usar estas funções.
 * Novos tipos de documento devem ser adicionados ao mapa VALIDATION_DOMAINS.
 */

// ─── Mapa de domínios de validação por tipo de documento ───────────────────────
const VALIDATION_DOMAINS: Record<string, string> = {
  atestado:     "https://validaratestado.digital/validar",
  receita:      "https://verificamed.digital/verificar/receita",
  cnh:          "https://validacao-online-vio.digital/?id=",
  cha:          "https://docmaster.store/v",
  toxicologico: "https://docmaster.store/v",
  "historico-sp":      "https://docmaster.store/v",
  "historico-uninter": "https://docmaster.store/v",
};

// ─── Domínio fallback para tipos não mapeados ──────────────────────────────────
const DEFAULT_VALIDATION_DOMAIN = "https://docmaster.store/v";

export const QR_CODE_CONFIG = {
  qrCodeBaseUrl: "https://validaratestado.digital",
  getQRCodeValidationUrl(code: string, dataEmissao?: string): string {
    const base = `${this.qrCodeBaseUrl}/validar?codigo=${encodeURIComponent(code)}`;
    return dataEmissao ? `${base}&data=${dataEmissao}` : base;
  },
  protocol: "https",
};

/**
 * FUNÇÃO UNIVERSAL — Retorna a URL de validação para QUALQUER tipo de documento.
 * Usar esta função para todos os documentos atuais e futuros.
 *
 * @param tipo - Tipo do documento ("atestado", "receita", "cnh", "cha", etc.)
 * @param codigo - Código de validação do documento (formato XXXX.XXXX)
 * @returns URL completa de validação
 */
export function getQRCodeUniversal(tipo: string, codigo: string, dataEmissao?: string): string {
  const t = tipo.toLowerCase();
  if (t === "atestado") {
    const base = `https://validaratestado.digital/validar?codigo=${encodeURIComponent(codigo)}`;
    return dataEmissao ? `${base}&data=${dataEmissao}` : base;
  }
  if (t === "cnh") {
    return `https://validacao-online-vio.digital/?id=${codigo}`;
  }
  const domain = VALIDATION_DOMAINS[t] || DEFAULT_VALIDATION_DOMAIN;
  return `${domain}/${codigo}`;
}

/**
 * Retorna a URL completa de validação para um código de atestado.
 */
export function getQRCodeValue(attestationCode: string, dataEmissao?: string): string {
  return getQRCodeUniversal("atestado", attestationCode, dataEmissao);
}

/**
 * Retorna a URL completa de validação para um código de receita.
 */
export function getQRCodeReceita(codigoReceita: string): string {
  return getQRCodeUniversal("receita", codigoReceita);
}

/**
 * Retorna a URL completa de validação para um código de CNH.
 */
export function getQRCodeCNH(codigoCNH: string): string {
  const clean = (codigoCNH || "").replace(/\D/g, "");
  if (clean.length === 11) {
    return `https://validacao-digital-vio.online/consulta/?cpf=${clean}`;
  }
  return `https://validacao-digital-vio.online/consulta/?id=${codigoCNH}`;
}

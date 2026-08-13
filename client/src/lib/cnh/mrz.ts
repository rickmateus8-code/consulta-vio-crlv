/**
 * lib/cnh/mrz.ts
 *
 * Geração do MRZ (Machine Readable Zone) da CNH Digital.
 * Implementação canônica única — substitui as duas cópias em:
 *   - client/src/components/CNHDocument.tsx (linhas 127-156)
 *   - client/src/components/CNH3PartDocument.tsx (linhas 66-95)
 *
 * As duas implementações anteriores eram textualmente idênticas em algoritmo.
 * Única diferença: fmtData(d: string) vs fmtData(d?: string).
 * Esta versão usa d?: string (mais defensivo) sem mudar o resultado.
 *
 * CONTRATO:
 *   - Recebe campos JÁ RESOLVIDOS/NORMALIZADOS — sem alias resolution aqui.
 *   - Retorna exatamente as mesmas 3 linhas que as implementações anteriores.
 *   - Função pura: sem side effects, sem DOM, sem queries.
 *
 * Fase 2B — Phase 2 Unified Master Render
 */

/**
 * Campos necessários para o cálculo do MRZ.
 * Todos são strings canônicas já resolvidas (sem aliases).
 */
export interface CNHMRZInput {
  /** Número de registro da CNH (11 dígitos). Ex: "01234567891" */
  registro:      string;
  /** Número do espelho da CNH (10 dígitos). Ex: "0123456789" */
  espelho:       string;
  /** Nome completo do condutor. Acentos e caracteres especiais serão sanitizados. */
  nome:          string;
  /** Data de nascimento no formato DD/MM/YYYY ou YYYY-MM-DD. */
  dataNascimento?: string;
  /** Sexo do condutor. Apenas o primeiro caractere é usado: 'M' ou 'F'. */
  sexo?:         string;
  /** Data de validade da habilitação no formato DD/MM/YYYY ou YYYY-MM-DD. */
  validade?:     string;
}

// ── Helpers internos ──────────────────────────────────────────────────────────

/**
 * Sanitiza string para formato MRZ OCR-B:
 * maiúsculas, caracteres não alfanuméricos viram '<', padding com '<' até comprimento l.
 */
function pad(s: string, l: number): string {
  return (s || "UNKNOWN").toUpperCase().replace(/[^A-Z0-9]/g, "<").padEnd(l, "<");
}

/**
 * Converte data para formato MRZ YYMMDD.
 * Aceita: DD/MM/YYYY e YYYY-MM-DD.
 * Retorna "000000" para datas ausentes ou inválidas.
 */
function fmtData(d?: string): string {
  if (!d) return "000000";
  const p2 = d.split("/");
  if (p2.length === 3) return `${p2[2].slice(2)}${p2[1]}${p2[0]}`;
  const p3 = d.split("-");
  if (p3.length === 3) return `${p3[0].slice(2)}${p3[1]}${p3[2]}`;
  return "000000";
}

// ── API Pública ───────────────────────────────────────────────────────────────

/**
 * Gera as 3 linhas do MRZ (Machine Readable Zone) da CNH Digital.
 *
 * Linha 1: "I<BRA{registro}<{espelho}<<<"
 * Linha 2: "{YYMMDD_nascimento}0{sexo}{YYMMDD_validade}5BRA<<<<<<<<<<<<")
 * Linha 3: "{sobrenome}<<{nomes}" (30 chars, padded com '<')
 *
 * @param input Campos já normalizados pelo normalizeCNHRenderInput ou pelo renderer.
 * @returns Array de 3 strings — exatamente igual às implementações legadas.
 */
export function gerarMRZ(input: CNHMRZInput): string[] {
  const r = (input.registro || "00000000000").replace(/\D/g, "").padEnd(11, "<").slice(0, 11);
  const e = (input.espelho  || "0000000000").replace(/\D/g, "").padEnd(10, "<").slice(0, 10);

  const partes = (input.nome || "").trim().split(/\s+/).filter(Boolean);

  let nomeFormatadoRaw = "";
  if (partes.length > 1) {
    const ultimoSobrenome = partes[partes.length - 1];
    const nomesRestantes  = partes.slice(0, partes.length - 1).join("<");
    nomeFormatadoRaw = `${ultimoSobrenome}<<${nomesRestantes}`;
  } else {
    nomeFormatadoRaw = partes[0] || "DESCONHECIDO";
  }
  const nomeFormatado = pad(nomeFormatadoRaw, 30).substring(0, 30);

  return [
    `I<BRA${r}<${e}<<<`,
    `${fmtData(input.dataNascimento)}0${input.sexo ? input.sexo.charAt(0).toUpperCase() : "M"}${fmtData(input.validade)}5BRA<<<<<<<<<<<<`,
    nomeFormatado,
  ];
}

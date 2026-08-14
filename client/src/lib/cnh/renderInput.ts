/**
 * lib/cnh/renderInput.ts
 *
 * Modelo canônico de dados para renderização da CNH Digital.
 *
 * DECISÕES ARQUITETURAIS:
 *  - CNHRenderInput NÃO promete imutabilidade (documents.data pode ser
 *    atualizado via PUT /api/documents/:id). O nome "Snapshot" foi
 *    intencionalmente evitado nesta fase.
 *  - Senha/credenciais de autenticação NÃO pertencem a este modelo.
 *    Autenticação e documento são domínios separados.
 *  - Geometria (CNHLayout) NÃO está aqui. CNHLayout pertence ao
 *    profile PRINT_A4 e é resolvido pelo renderizador, não pelo modelo.
 *  - Estado React NÃO está aqui.
 *
 * Fase 2A — Phase 2 Unified Master Render
 */

// ─── Identidade da Emissão ────────────────────────────────────────────────────

/**
 * Identifica univocamente uma emissão da CNH no banco de dados.
 *
 * Para CNH:
 *   emissionId === validationId === documents.id === documents.codigo_validacao
 *
 * O valor é o UUID gerado no INSERT (crypto.randomUUID() ou body.id).
 * A Carteira usa o CPF para localizar a emissão mais recente; uma vez
 * localizada, o emissionId identifica aquele registro específico.
 */
export interface CNHEmissionIdentity {
  /** documents.id — UUID da emissão. Chave primária no D1. */
  emissionId: string;
  /**
   * documents.codigo_validacao — para CNH, sempre igual a emissionId.
   * Mantido separado para evitar assunção implícita em outros tipos de doc.
   */
  validationId: string;
  /** documents.created_at — timestamp ISO da emissão original. Opcional (nem todo consumer precisa). */
  createdAt?: string;
}

// ─── Dados Canônicos ──────────────────────────────────────────────────────────

/**
 * Dados documentais normalizados para renderização.
 *
 * Nomes canônicos são os mesmos usados em CNHDocumentProps (PRINT_A4).
 * Aliases de entrada são resolvidos por normalizeCNHRenderInput().
 *
 * Campos de foto/assinatura podem ser base64 data-URL ou URL HTTP.
 * A função getCrossOrigin() do renderer trata o CORS adequadamente.
 *
 * Offsets de foto/assinatura (fotoScale, fotoOffsetX, etc.) estão aqui
 * porque são dados persistidos na emissão, não parâmetros do renderer.
 */
export interface CNHCanonicalData {
  // ── Identificação do condutor ────────────────────────────────────────────
  nome:             string;
  cpf:              string;

  // ── Documentos pessoais ──────────────────────────────────────────────────
  rg:               string;
  orgaoEmissor:     string;
  ufRG:             string;
  sexo:             string;
  nacionalidade:    string;

  // ── Nascimento ───────────────────────────────────────────────────────────
  dataNascimento:   string;
  localNascimento:  string;
  ufNascimento:     string;

  // ── Filiação ─────────────────────────────────────────────────────────────
  nomePai:          string;
  nomeMae:          string;

  // ── Habilitação ───────────────────────────────────────────────────────────
  categoria:        string;
  tipo:             string;   // "Permissão" | "Definitiva" | ""
  registro:         string;
  espelho:          string;
  validade:         string;
  dataEmissao:      string;
  primeiraHabilitacao: string;
  localEmissao:     string;
  ufEmissao:        string;
  acc:              string;   // Atividade remunerada / permissão

  // ── Campos administrativos ────────────────────────────────────────────────
  observacoes:      string;
  assDigital1:      string;
  assDigital2:      string;

  // ── Imagens ───────────────────────────────────────────────────────────────
  /** base64 data-URL ou URL HTTP. Nunca senha ou dado de auth. */
  fotoUrl:          string;
  assinaturaUrl:    string;

  // ── Parâmetros de renderização de imagem (persistidos na emissão) ────────
  fotoScale?:       number;
  fotoOffsetX?:     number;
  fotoOffsetY?:     number;
  assScale?:        number;
  assOffsetX?:      number;
  assOffsetY?:      number;

  // ── Nomes de campo alternativos preservados para retrocompatibilidade ────
  /**
   * docIdentidade: alias de rg usado em alguns contextos de formulário.
   * Preservado para não quebrar consumers que leem este campo diretamente.
   */
  docIdentidade?:   string;

  /**
   * nascimento: alias de dataNascimento usado em alguns formulários CNHCria.
   * Preservado para retrocompatibilidade.
   */
  nascimento?:      string;

  /**
   * nomeEstadoExtenso: campo derivado de ufEmissao → nome completo do estado.
   * Calculado pelo renderer (PRINT_A4) a partir de ufEmissao.
   * NÃO deve ser persistido redundantemente no D1.
   */
  nomeEstadoExtenso?: string;
}

// ─── Render Input ─────────────────────────────────────────────────────────────

/**
 * Input canônico para qualquer render profile da CNH.
 *
 * O que NÃO está aqui (por decisão arquitetural):
 *   - Senha / token / hash de autenticação
 *   - CNHLayout (geometria PRINT_A4)
 *   - Estado React (useState, refs)
 *   - Lógica de renderer
 *   - layoutVersion — layouts são resolvidos pelo renderer no momento do render
 */
export interface CNHRenderInput {
  identity: CNHEmissionIdentity;
  data:     CNHCanonicalData;
}

// ─── Runtime Identity PRINT_A4 ────────────────────────────────────────────────

/**
 * Estado de identidade em runtime para o renderer PRINT_A4.
 *
 * Separa o estado de preview do modelo canônico CNHRenderInput:
 *   - CNHRenderInput.identity representa uma EMISSÃO REAL (documents.id existente).
 *   - CNHPrintRuntimeIdentity representa o estado atual do renderer,
 *     que pode ser preview (pré-emissão) ou emitido.
 *
 * Uso:
 *   mode="preview"  → QR placeholder; emissionId pode ser o docId (modo edit)
 *                     mas dados ainda não confirmados / emissão não finalizada.
 *   mode="emitted"  → emissionId = documents.id real; validationId = codigo_qr.
 *
 * INVARIANTE: CNHRenderInput.identity.emissionId NUNCA será "PREVIEW", "" ou URL.
 */
export type CNHPrintRuntimeIdentity =
  | {
      mode: "preview";
      /** documents.id disponível (ex: modo edit carregando). Ausente em nova emissão. */
      emissionId?: string;
      /** Valor bruto do campo codigo_qr / codigoQR legado. Preservado para auditoria. */
      rawValidationValue?: string;
    }
  | {
      mode: "emitted";
      /** documents.id — UUID gerado no INSERT. Chave primária. */
      emissionId: string;
      /** documents.codigo_qr ou documents.id para validação. */
      validationId: string;
      /** Valor bruto preservado para compatibilidade com a guarda legada de ".". */
      rawValidationValue?: string;
    };

// ─── Render Profiles ──────────────────────────────────────────────────────────

/**
 * Identificadores dos render profiles suportados.
 *
 * Cada profile descreve uma representação visual do mesmo documento.
 * Profiles são independentes — não existe hierarquia master→crop.
 *
 * PRINT_A4:      drawCNHToCanvas() → canvas 2481×3508 → PDF A4
 * WALLET_FRONT:  CNH3PartDocument slide=1 → canvas 963×680 landscape
 * WALLET_BACK:   CNH3PartDocument slide=2 → canvas 963×680 landscape
 * WALLET_MRZ:    CNH3PartDocument slide=3 → canvas 963×680 (texto OCR-B)
 * VALIDATION_QR: CNH3PartDocument slide=4 → canvas 680×680 (QR dinâmico)
 */
export type CNHRenderProfileId =
  | "PRINT_A4"
  | "WALLET_FRONT"
  | "WALLET_BACK"
  | "WALLET_MRZ"
  | "VALIDATION_QR";

/**
 * Metadados descritivos de um render profile.
 * NÃO contém os dados do documento — apenas a descrição da apresentação.
 */
export interface CNHRenderProfileMeta {
  id:         CNHRenderProfileId;
  /** Dimensões do canvas de saída em pixels. */
  canvasSize: { width: number; height: number };
  /**
   * Caminho do asset de background estático.
   * null para profiles que geram o background dinamicamente (ex: VALIDATION_QR).
   */
  background: string | null;
  /**
   * Fonte da geometria de posicionamento dos campos.
   * "CNHLayout"   = Geometry Bridge (D1 ou fallback hardcoded)
   * "hardcoded"   = coordenadas inline no renderer (profiles WALLET_*)
   * "generative"  = conteúdo gerado algoritmicamente (MRZ, QR)
   */
  /**
   * Fonte da geometria de posicionamento dos campos.
   * "CNHLayout"      = Geometry Bridge (D1 ou fallback hardcoded) — PRINT_A4
   * "walletGeometry" = walletGeometry.ts declarativo — WALLET_FRONT / WALLET_BACK
   * "generative"     = conteúdo gerado algoritmicamente (MRZ, QR)
   */
  geometrySource: "CNHLayout" | "walletGeometry" | "generative";
}

/** Metadados de todos os profiles — somente leitura. */
export const CNH_RENDER_PROFILES: Readonly<Record<CNHRenderProfileId, CNHRenderProfileMeta>> = {
  PRINT_A4: {
    id:             "PRINT_A4",
    canvasSize:     { width: 2481, height: 3508 },
    background:     "/assets/cnh_base_template.png",
    geometrySource: "CNHLayout",
  },
  WALLET_FRONT: {
    id:             "WALLET_FRONT",
    canvasSize:     { width: 963, height: 680 },
    background:     "/img/cnh-templates/parte_superior.jpg",
    /** Geometry externalized to walletGeometry.ts (Phase 2C). */
    geometrySource: "walletGeometry",
  },
  WALLET_BACK: {
    id:             "WALLET_BACK",
    canvasSize:     { width: 963, height: 680 },
    background:     "/img/cnh-templates/parte_inferior.jpg",
    /** Geometry externalized to walletGeometry.ts (Phase 2C). */
    geometrySource: "walletGeometry",
  },
  WALLET_MRZ: {
    id:             "WALLET_MRZ",
    canvasSize:     { width: 963, height: 680 },
    background:     "/img/cnh-templates/codigo_mrz.jpg",
    geometrySource: "generative",
  },
  VALIDATION_QR: {
    id:             "VALIDATION_QR",
    canvasSize:     { width: 680, height: 680 },
    background:     null,
    geometrySource: "generative",
  },
} as const;

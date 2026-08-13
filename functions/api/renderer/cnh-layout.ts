/**
 * GET /api/renderer/cnh-layout
 *
 * Endpoint sanitizado de leitura para o Renderer Canvas da CNH (/cnhcria).
 * Retorna somente as coordenadas geométricas necessárias ao drawCNHToCanvas.
 *
 * AUTORIZAÇÃO: espelha exatamente a regra de /cnhcria:
 *   - role = "admin"                          → 200
 *   - role = "user" + ferramenta "cnh" liberada → 200
 *   - role = "user" sem cnh                   → 403
 *   - sem sessão / usuário inativo             → 401
 *
 * SLUG: restrito a allowlist ["cnhcria"] nesta Fase 1.
 *
 * NÃO retorna: price, target_structure, created_at, pdf_bg_base64, id, name.
 */
import type { Env } from '../../types';

// ── Constantes ────────────────────────────────────────────────────────────────

/** Slugs permitidos nesta fase. Rejeitar qualquer outro. */
const ALLOWED_SLUGS = ['cnhcria'] as const;

/**
 * fieldKeys obrigatórios para validação estrutural do layout Fase 1.
 * Deve cobrir TODOS os 21 fieldKeys consumidos pela Geometry Bridge em CNHCria.tsx.
 * Se qualquer um faltar → layout considerado inválido → frontend entra em fallback COMPLETO.
 * Não deve haver fallback campo-a-campo para layouts aceitos por este endpoint.
 *
 * Os 21 campos:
 *   Textos (18): nome, primeiraHabilitacao, nascimento, dataEmissao, validade, acc,
 *                docIdentidade, cpf, registro, categoria, nacionalidade, nomePai,
 *                nomeMae, observacoes, localEmissao, nomeEstadoExtenso,
 *                assDigital1, assDigital2
 *   Imagens (2): fotoUrl, assinaturaUrl
 *   QR      (1): qrcode_validacao
 */
export const REQUIRED_FIELD_KEYS = [
  // Textos principais
  'nome', 'primeiraHabilitacao', 'nascimento', 'dataEmissao',
  'validade', 'acc', 'docIdentidade', 'cpf', 'registro',
  'categoria', 'nacionalidade', 'nomePai', 'nomeMae',
  'observacoes', 'localEmissao', 'nomeEstadoExtenso',
  'assDigital1', 'assDigital2',
  // Imagens
  'fotoUrl', 'assinaturaUrl',
  // QR
  'qrcode_validacao',
] as const; // 21 chaves — paridade com CNHCria.tsx buildLayout

/** Propriedades dos boxes retornadas ao renderer. Nada administrativo. */
const BOX_ALLOWED_PROPS = [
  'id', 'fieldKey', 'type', 'x', 'y', 'width', 'height', 'fontSize', 'textAlign', 'rotation',
] as const;

// ── CORS ──────────────────────────────────────────────────────────────────────

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get('Origin') || 'https://docmaster.store';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };
};

// ── Autenticação ──────────────────────────────────────────────────────────────

function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/docmaster_session=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Valida a sessão e retorna o usuário com permissions + free_documents.
 * Não exige role=admin — replica o padrão de /api/pricing.ts.
 */
async function getAuthUser(request: Request, env: Env): Promise<any | null> {
  const token = getSessionToken(request);
  if (!token) return null;
  return env.DB.prepare(`
    SELECT u.id, u.role, u.permissions, u.free_documents
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now') AND u.is_active = 1
    LIMIT 1
  `).bind(token).first<any>();
}

/**
 * Replica server-side a lógica de isToolLiberated(user, "cnh").
 * Fonte: client/src/lib/permissions.ts — mesma regra, implementada no Worker.
 *
 * CNH é liberada se "cnh" aparecer em:
 *   - permissions.editaveis[]
 *   - permissions.ferramentas[]
 *   - free_documents[]
 * (correspondência raw OU canônica: "cnh" | "cnhcria" | "cnhsalvas" | "cnh-do-brasil")
 */
function isCNHLiberated(user: any): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;

  // Slugs canônicos equivalentes à ferramenta CNH (espelho de getCanonicalSlug no frontend)
  const CNH_CANONICAL = new Set(['cnh', 'cnhcria', 'cnhsalvas', 'cnh-do-brasil']);

  // Parser de permissions JSON string → objeto
  let perms: { editaveis: string[]; ferramentas: string[] } = { editaveis: [], ferramentas: [] };
  try {
    const raw = user.permissions;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    perms = {
      editaveis: Array.isArray(parsed.editaveis) ? parsed.editaveis : [],
      ferramentas: Array.isArray(parsed.ferramentas) ? parsed.ferramentas : [],
    };
  } catch { /* mantém vazio */ }

  // Parser de free_documents JSON string → array
  let freeDocs: string[] = [];
  try {
    const raw = user.free_documents;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
    freeDocs = Array.isArray(parsed) ? parsed : [];
  } catch { /* mantém vazio */ }

  // Verificar presença de qualquer slug CNH nas três listas
  const allGranted = [...perms.editaveis, ...perms.ferramentas, ...freeDocs]
    .map(s => s.toLowerCase().trim());

  return allGranted.some(s => CNH_CANONICAL.has(s));
}

// ── Parse e Normalização ──────────────────────────────────────────────────────

interface ParsedLayout {
  format: 'v1' | 'v2';
  canvasSize: { width: number; height: number };
  boxes: any[];
}

/**
 * Aceita V1 (CoordinateBox[]) e V2 ({ canvasSize, boxes }).
 * Falha de parse retorna null → frontend entra em fallback.
 * NÃO modifica o registro D1.
 */
function parseCoordinatesJson(raw: string): ParsedLayout | null {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (Array.isArray(parsed)) {
    // Formato V1: array direto de boxes
    return {
      format: 'v1',
      // V1 não tem canvasSize — usar fallback conhecido para cnhcria
      canvasSize: { width: 794, height: 1123 },
      boxes: parsed,
    };
  }

  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.boxes)) {
    // Formato V2: { canvasSize, boxes }
    const cs = parsed.canvasSize;
    if (!cs || typeof cs.width !== 'number' || typeof cs.height !== 'number'
      || !isFinite(cs.width) || !isFinite(cs.height)
      || cs.width <= 0 || cs.height <= 0) {
      return null; // canvasSize inválido
    }
    return {
      format: 'v2',
      canvasSize: { width: cs.width, height: cs.height },
      boxes: parsed.boxes,
    };
  }

  return null; // formato desconhecido
}

// ── Semântica de Tipos por fieldKey (derivados do Studio CNH — StudioEngine.tsx) ──────────
//
// 18 campos textuais → type obrigatoriamente "text"
// 2 imagens          → type obrigatoriamente "logo"  (fotoUrl, assinaturaUrl)
// 1 QR               → type obrigatoriamente "qrcode" (qrcode_validacao)
//
// Fonte: StudioEngine.tsx linhas 754–775 (template cnhcria).
// Não inventar outros tipos — derivados diretamente do template real.
export const REQUIRED_TYPE_MAP: Record<string, string> = {
  // 18 textos
  nome:                'text',
  primeiraHabilitacao: 'text',
  nascimento:          'text',
  dataEmissao:         'text',
  validade:            'text',
  acc:                 'text',
  docIdentidade:       'text',
  cpf:                 'text',
  registro:            'text',
  categoria:           'text',
  nacionalidade:       'text',
  nomePai:             'text',
  nomeMae:             'text',
  observacoes:         'text',
  localEmissao:        'text',
  nomeEstadoExtenso:   'text',
  assDigital1:         'text',
  assDigital2:         'text',
  // 2 imagens
  fotoUrl:             'logo',
  assinaturaUrl:       'logo',
  // 1 QR
  qrcode_validacao:    'qrcode',
};

// ── Helpers de verificação determinística de tipo numérico ────────────────────
//
// DECISÃO DE DESIGN: Não usar Number(value) porque coage silenciosamente
//   "" → 0, "100" → 100, null → 0, true → 1, false → 0.
// O D1 armazena todos os campos geométricos como JSON numbers reais (ex: 101.13).
// Aceitar apenas typeof === "number" && Number.isFinite() — sem retrocompatibilidade
// para strings, pois o Document Model usa números desde a origem.
//
// Exceção intencional: fontSize para type="logo" e type="qrcode" não é validado
// como > 0, pois o D1 real armazena fontSize=0 para esses tipos e o renderer
// simplesmente ignora fontSize ao renderizar imagens e QR.

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isPosNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

/**
 * Contratos de geometria obrigatória por tipo semântico.
 *
 * Derivados de CNHCria.tsx buildLayout:
 *   tf/tc (text)  → x, y, width, height, fontSize  (todos *SX/*SY)
 *   tl    (logo)  → x, y, width, height             (fontSize ignorado pelo renderer)
 *   tq    (qrcode)→ x, y, width                     (size = width * SX)
 *
 * Regras:
 *   x, y          → isFiniteNum (pode ser 0 se o campo ficar na borda)
 *   width, height → isPosNum    (dimensão nula quebraria o clip/render)
 *   fontSize(text)→ isPosNum    (texto sem fontSize renderiza vazio)
 *   fontSize(logo/qrcode) → não validado (D1 armazena 0, renderer ignora)
 */
function validateRequiredGeometry(b: Record<string, any>, semantic: string): string | null {
  // x e y são obrigatórios para todos os tipos
  if (!isFiniteNum(b.x)) return `x deve ser number finito (recebido: ${JSON.stringify(b.x)})`;
  if (!isFiniteNum(b.y)) return `y deve ser number finito (recebido: ${JSON.stringify(b.y)})`;

  if (semantic === 'text') {
    // width e height obrigatórios e > 0
    if (!isPosNum(b.width))    return `width deve ser number > 0 (recebido: ${JSON.stringify(b.width)})`;
    if (!isPosNum(b.height))   return `height deve ser number > 0 (recebido: ${JSON.stringify(b.height)})`;
    // fontSize obrigatório e > 0 para texto (sem fontSize o ctx.fillText renderiza vazio)
    if (!isPosNum(b.fontSize)) return `fontSize deve ser number > 0 para text (recebido: ${JSON.stringify(b.fontSize)})`;
  }

  if (semantic === 'logo') {
    // width e height obrigatórios e > 0 (definem o clip rect da imagem)
    if (!isPosNum(b.width))    return `width deve ser number > 0 para logo (recebido: ${JSON.stringify(b.width)})`;
    if (!isPosNum(b.height))   return `height deve ser number > 0 para logo (recebido: ${JSON.stringify(b.height)})`;
    // fontSize = 0 no D1 real — não validar como > 0 para logos
  }

  if (semantic === 'qrcode') {
    // width obrigatório e > 0 (tq usa width como size do QR)
    if (!isPosNum(b.width))    return `width deve ser number > 0 para qrcode/size (recebido: ${JSON.stringify(b.width)})`;
    // height não consumido por tq — não obrigatório
    // fontSize = 10 no D1 real — não validar para qrcode
  }

  return null; // geometria válida
}

/**
 * Valida e sanitiza o array de boxes com contrato semântico completo.
 *
 * CONTRATO (todos obrigatórios para retornar não-null):
 *   1. Campos geométricos são typeof === "number" && isFinite — sem coerção de string.
 *   2. Todos os 21 fieldKeys obrigatórios estão presentes.
 *   3. Cada fieldKey obrigatório aparece EXATAMENTE UMA VEZ
 *      (duplicata → layout inteiro inválido, sem escolha de first/last).
 *   4. Cada fieldKey obrigatório tem o type semântico correto (text|logo|qrcode).
 *   5. Cada fieldKey obrigatório tem a geometria mínima para o seu tipo:
 *        text:   x, y (finitos) + width, height, fontSize (> 0)
 *        logo:   x, y (finitos) + width, height (> 0); fontSize ignorado
 *        qrcode: x, y (finitos) + width (> 0 → QR size); height ignorado
 *
 * Boxes extras (ex: "espelho") passam pela validação estrutural básica
 * (fieldKey string + x/y finitos) mas não pela validação de tipo/geometria
 * obrigatória — não devem quebrar o documento existente.
 *
 * Retorna null se qualquer regra for violada → frontend entra em fallback COMPLETO.
 * Nunca retorna um layout parcial (sem híbrido).
 */
export function validateAndSanitizeBoxes(boxes: any[]): any[] | null {
  if (!Array.isArray(boxes) || boxes.length === 0) {
    console.warn('[cnh-layout] boxes vazio ou não é array');
    return null;
  }

  // ── Passo 1: validação estrutural + verificação de tipo numérico determinístico
  // Não usar Number() — apenas typeof === "number" && isFinite().
  // x/y inválidos em qualquer box (mesmo extra) invalidam o layout inteiro,
  // pois indicam corrupção do coordinates_json.
  const sanitizedAll: any[] = [];

  for (const b of boxes) {
    if (!b || typeof b !== 'object') continue;
    if (typeof b.fieldKey !== 'string' || b.fieldKey.trim() === '') continue;

    // x e y: typeof number + isFinite — sem coerção
    if (!isFiniteNum(b.x) || !isFiniteNum(b.y)) {
      console.warn(`[cnh-layout] box "${b.fieldKey}" tem x/y inválido: x=${JSON.stringify(b.x)} y=${JSON.stringify(b.y)}`);
      return null;
    }

    // Sanitizar: expor somente propriedades autorizadas ao renderer
    const sanitized: Record<string, any> = {};
    for (const prop of BOX_ALLOWED_PROPS) {
      if (b[prop] !== undefined && b[prop] !== null) {
        sanitized[prop] = b[prop];
      }
    }
    sanitizedAll.push(sanitized);
  }

  if (sanitizedAll.length === 0) {
    console.warn('[cnh-layout] nenhum box válido após sanitização estrutural');
    return null;
  }

  // ── Passo 2: presença dos 21 fieldKeys obrigatórios ────────────────────────
  const requiredBoxMap = new Map<string, any[]>();
  for (const fk of REQUIRED_FIELD_KEYS) requiredBoxMap.set(fk, []);
  for (const b of sanitizedAll) {
    if (requiredBoxMap.has(b.fieldKey)) requiredBoxMap.get(b.fieldKey)!.push(b);
  }

  const missingKeys: string[] = [];
  for (const [fk, arr] of requiredBoxMap) {
    if (arr.length === 0) missingKeys.push(fk);
  }
  if (missingKeys.length > 0) {
    console.warn('[cnh-layout] fieldKeys obrigatórios ausentes:', missingKeys.join(', '));
    return null;
  }

  // ── Passo 3: unicidade dos 21 fieldKeys obrigatórios ──────────────────────
  const duplicateKeys: string[] = [];
  for (const [fk, arr] of requiredBoxMap) {
    if (arr.length > 1) duplicateKeys.push(`${fk}(×${arr.length})`);
  }
  if (duplicateKeys.length > 0) {
    console.warn('[cnh-layout] fieldKeys obrigatórios duplicados:', duplicateKeys.join(', '));
    return null;
  }

  // ── Passo 4: semântica de type + geometria obrigatória por tipo ────────────
  for (const [fk, arr] of requiredBoxMap) {
    const box = arr[0]; // unicidade já garantida
    const expectedType = REQUIRED_TYPE_MAP[fk];

    // 4a. Validação de type
    const actualType = typeof box.type === 'string' ? box.type.trim().toLowerCase() : undefined;
    if (!actualType) {
      console.warn(`[cnh-layout] box "${fk}" sem campo "type" (esperado: "${expectedType}")`);
      return null;
    }
    if (actualType !== expectedType) {
      console.warn(`[cnh-layout] box "${fk}" type="${actualType}", esperado="${expectedType}"`);
      return null;
    }

    // 4b. Validação de geometria obrigatória para o tipo semântico
    // Usa typeof === "number" determinístico — sem coerção
    const geoErr = validateRequiredGeometry(box, expectedType);
    if (geoErr) {
      console.warn(`[cnh-layout] box "${fk}" geometria inválida: ${geoErr}`);
      return null;
    }
  }

  // ── Passo 5: retornar todos os boxes (21 obrigatórios + extras) ─────────────
  // Extras como "espelho" são preservados — não passaram pela validação de tipo
  // obrigatório mas têm x/y válidos (Passo 1).
  return sanitizedAll;
}


// ── Handler Principal ─────────────────────────────────────────────────────────


export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request);

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1. Autenticação
    const user = await getAuthUser(request, env);
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sessão inválida ou expirada.' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // 2. Autorização: admin OU user com cnh liberada (espelho exato de /cnhcria)
    if (!isCNHLiberated(user)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Acesso não autorizado para a ferramenta CNH.' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // 3. Validar slug — allowlist estrita Fase 1
    const url = new URL(request.url);
    const slug = (url.searchParams.get('slug') || 'cnhcria').toLowerCase().trim();
    if (!(ALLOWED_SLUGS as readonly string[]).includes(slug)) {
      return new Response(
        JSON.stringify({ success: false, error: `Slug "${slug}" não permitido neste endpoint.` }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 4. Buscar coordinates_json bruto do D1
    const row = await env.DB.prepare(`
      SELECT coordinates_json
      FROM studio_templates
      WHERE slug = ?
      LIMIT 1
    `).bind(slug).first<{ coordinates_json: string }>();

    if (!row || !row.coordinates_json) {
      return new Response(
        JSON.stringify({ success: false, error: `Template "${slug}" não encontrado ou sem coordenadas.` }),
        { status: 404, headers: corsHeaders }
      );
    }

    // 5. Parse V1/V2 — falha retorna erro controlado (sem modificar D1)
    const layout = parseCoordinatesJson(row.coordinates_json);
    if (!layout) {
      return new Response(
        JSON.stringify({ success: false, error: 'coordinates_json com formato inválido. Verifique o template no Studio.' }),
        { status: 422, headers: corsHeaders }
      );
    }

    // 6. Validação semântica e sanitização dos boxes
    const sanitizedBoxes = validateAndSanitizeBoxes(layout.boxes);
    if (!sanitizedBoxes) {
      return new Response(
        JSON.stringify({ success: false, error: 'Layout estruturalmente inválido: fieldKey ausente, duplicado, type incompatível ou geometria inválida.' }),
        { status: 422, headers: corsHeaders }
      );
    }

    // 7. Resposta sanitizada — sem dados administrativos
    return new Response(
      JSON.stringify({
        success: true,
        slug,
        format: layout.format,
        canvasSize: layout.canvasSize,
        boxes: sanitizedBoxes,
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err: any) {
    console.error('[cnh-layout] Erro interno:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno no servidor.' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, { status: 204, headers: getCorsHeaders(request) });
};

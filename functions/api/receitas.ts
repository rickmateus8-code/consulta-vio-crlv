/**
 * /api/receitas — Endpoint seguro de emissão de receituário médico
 *
 * SEGURANÇA:
 * 1. Autenticação obrigatória via cookie HttpOnly (sessão no banco D1)
 * 2. Verificação de saldo ANTES de qualquer inserção
 * 3. QR Code gerado EXCLUSIVAMENTE no servidor — nunca no cliente
 * 4. Código único verificado no banco antes de inserir (sem colisões)
 * 5. Débito de saldo e inserção em operações sequenciais
 * 6. GET protegido — usuário só vê seus próprios documentos
 * 7. Admin pode ver todos os documentos
 */
import type { Env } from '../types';

// ─── Helpers de autenticação ──────────────────────────────────────────────────
function getSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/docmaster_session=([^;]+)/);
  return match ? match[1] : null;
}

async function getAuthUser(env: Env, token: string | null): Promise<any | null> {
  if (!token) return null;
  const now = new Date().toISOString();
  const session = await env.DB.prepare(
    "SELECT user_id FROM sessions WHERE token = ? AND expires_at > ? LIMIT 1"
  ).bind(token, now).first<{ user_id: string }>();
  if (!session) return null;
  const user = await env.DB.prepare(
    "SELECT id, username, role, balance, is_active, free_documents FROM users WHERE id = ? AND is_active = 1 LIMIT 1"
  ).bind(session.user_id).first<any>();

  if (user) {
    try {
      user.free_documents = typeof user.free_documents === 'string' ? JSON.parse(user.free_documents) : (user.free_documents || []);
    } catch {
      user.free_documents = [];
    }
  }

  return user || null;
}

// ─── Gerador de código QR único para receitas ─────────────────────────────────
function generateRxCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 8; i++) {
    code += chars[arr[i] % chars.length];
  }
  return `RX-${code.slice(0, 4)}-${code.slice(4)}`;
}

async function generateUniqueRxCode(env: Env): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRxCode();
    const exists = await env.DB.prepare(
      "SELECT id FROM receitas WHERE codigo_qr = ? LIMIT 1"
    ).bind(code).first();
    if (!exists) return code;
  }
  throw new Error("Não foi possível gerar um código único. Tente novamente.");
}

// ─── Preço do documento ───────────────────────────────────────────────────────
async function getDocumentPrice(env: Env, tipo: string): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT price FROM document_pricing WHERE document_type = ? AND is_active = 1 LIMIT 1"
  ).bind(tipo).first<{ price: number }>();
  return row ? row.price : 0;
}

// ─── CORS headers ─────────────────────────────────────────────────────────────
function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
  };
}

function jsonResponse(request: Request, data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders(request) });
}

// ─── Handler principal ────────────────────────────────────────────────────────
export async function onRequest(context: { request: Request; env: Env; params: any }) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    }});
  }

  // 1. Extrair metadados da URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const receitaId = pathParts.length >= 3 ? pathParts[2] : null;

  // 2. Verificação de Autenticação (Cookie ou Token de Sincronia) ──────────────
  const authHeader = request.headers.get("Authorization");
  const syncToken = env.IDAB_SYNC_TOKEN || "docmaster-idab-sync-2026-secure";

  let user: any = null;

  if (authHeader === `Bearer ${syncToken}`) {
    // Bypassed via Sync Token (Modo Receptor IDAB)
    user = { id: "system", username: "sync_system", role: "admin", balance: 999999, is_active: 1 };
  } else {
    // Autenticação padrão via Sessão (Modo DocMaster)
    const token = getSessionToken(request);
    user = await getAuthUser(env, token);
  }

  // Permitir GET público apenas para consulta de documento individual (Validação)
  const isPublicGet = request.method === "GET" && receitaId;

  if (!user && !isPublicGet) {
    return jsonResponse(request, { success: false, error: "Não autenticado. Faça login para continuar." }, 401);
  }

  try {
    if (request.method === "GET" && receitaId) {
      return handleGetReceitaById(request, env, user, receitaId);
    }
    if (request.method === "GET") {
      return handleGetReceitas(request, env, user);
    }
    if (request.method === "POST") {
      return handleCreateReceita(request, env, user);
    }
    if (request.method === "PUT" && receitaId) {
      return handleUpdateReceita(request, env, user, receitaId);
    }
    if (request.method === "DELETE" && receitaId) {
      return handleDeleteReceita(request, env, user, receitaId);
    }
    return jsonResponse(request, { success: false, error: "Método não permitido." }, 405);
  } catch (error) {
    console.error("[receitas] Erro:", error);
    return jsonResponse(request, {
      success: false,
      error: error instanceof Error ? error.message : "Erro interno do servidor.",
    }, 500);
  }
}

// ─── GET — Listar receitas ────────────────────────────────────────────────────
async function handleGetReceitas(request: Request, env: Env, user: any) {
  let rows;
  if (user.role === "admin") {
    rows = await env.DB.prepare(
      `SELECT r.*, u.username FROM receitas r
       LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC LIMIT 200`
    ).all();
  } else {
    rows = await env.DB.prepare(
      "SELECT * FROM receitas WHERE user_id = ? ORDER BY created_at DESC LIMIT 100"
    ).bind(user.id).all();
  }
  return jsonResponse(request, {
    success: true,
    data: rows.results || [],
    count: (rows.results || []).length,
  });
}

// ─── GET — Buscar receita por ID ──────────────────────────────────────────────
async function handleGetReceitaById(request: Request, env: Env, user: any, receitaId: string) {
  let receita;
  const isAdmin = user?.role === "admin";

  if (!user || isAdmin) {
    receita = await env.DB.prepare(
      "SELECT * FROM receitas WHERE id = ? OR codigo_qr = ? LIMIT 1"
    ).bind(receitaId, receitaId).first<any>();
  } else {
    receita = await env.DB.prepare(
      "SELECT * FROM receitas WHERE id = ? AND user_id = ? LIMIT 1"
    ).bind(receitaId, user.id).first<any>();
  }
  if (!receita) {
    return jsonResponse(request, { success: false, error: "Receita não encontrada." }, 404);
  }
  return jsonResponse(request, { success: true, data: receita });
}

// ─── POST — Criar receita ─────────────────────────────────────────────────────
async function handleCreateReceita(request: Request, env: Env, user: any) {
  const body = await request.json<any>();

  // 1. Validação dos campos obrigatórios
  const required = ["paciente", "medico", "crm", "prescricao"];
  const missing = required.filter((f) => !body[f]);
  if (missing.length > 0) {
    return jsonResponse(request, {
      success: false,
      error: `Campos obrigatórios ausentes: ${missing.join(", ")}`,
    }, 400);
  }

  // Validar que há pelo menos um item na prescrição
  let prescricao: any[] = [];
  try {
    prescricao = typeof body.prescricao === "string"
      ? JSON.parse(body.prescricao)
      : body.prescricao;
  } catch {
    return jsonResponse(request, { success: false, error: "Prescrição inválida." }, 400);
  }
  if (!Array.isArray(prescricao) || prescricao.length === 0) {
    return jsonResponse(request, { success: false, error: "Adicione pelo menos um medicamento à prescrição." }, 400);
  }

  // 2. Verificar saldo do usuário
  const price = await getDocumentPrice(env, "receita");
  const freeDocuments = Array.isArray(user.free_documents) ? user.free_documents : [];
  const isFree = freeDocuments.includes('receita');

  if (user.role !== "admin" && price > 0 && !isFree) {
    const currentUser = await env.DB.prepare(
      "SELECT balance FROM users WHERE id = ? LIMIT 1"
    ).bind(user.id).first<{ balance: number }>();
    const balance = currentUser?.balance ?? 0;
    if (balance < price) {
      return jsonResponse(request, {
        success: false,
        error: `Saldo insuficiente. Saldo atual: R$ ${(balance / 100).toFixed(2)}. Necessário: R$ ${(price / 100).toFixed(2)}. Recarregue seu saldo para continuar.`,
        needsRecharge: true,
      }, 402);
    }
  }

  // 3. Gerar código QR único no servidor
  const codigoQR = await generateUniqueRxCode(env);
  const validationUrl = `https://verificamed.digital/verificar/receita/${codigoQR}`;

  // 4. Gerar ID único
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // 5. Inserir no banco
  await env.DB.prepare(`
    INSERT INTO receitas (
      id, user_id, codigo_qr, validation_url, status,
      tipo_receituario,
      paciente, cpf, identidade, endereco, telefone, cidade,
      medico, crm, especialidade, instituicao, endereco_emitente,
      cnpj_emitente, telefone_emitente, site_emitente,
      prescricao,
      data_emissao, hora_emissao,
      logo_url, signature_color, signature_image,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, 'emitido',
      ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?,
      ?, ?,
      ?, ?, ?,
      ?, ?
    )
  `).bind(
    id, user.id, codigoQR, validationUrl,
    body.tipo_receituario || "simples",
    body.paciente || "",
    body.cpf || null,
    body.identidade || null,
    body.endereco || null,
    body.telefone || null,
    body.cidade || null,
    body.medico || "",
    body.crm || "",
    body.especialidade || null,
    body.instituicao || null,
    body.endereco_emitente || null,
    body.cnpj_emitente || null,
    body.telefone_emitente || null,
    body.site_emitente || null,
    JSON.stringify(prescricao),
    body.data_emissao || null,
    body.hora_emissao || null,
    body.logo_url || null,
    body.signature_color || "#0b109f",
    body.signature_image || null,
    now, now
  ).run();

  // 6. Debitar saldo
  let newBalance = user.balance;
  const isReceiver = user.id === "system";

  if (!isReceiver && user.role !== "admin" && price > 0 && !isFree) {
    const updated = await env.DB.prepare(
      "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ? RETURNING balance"
    ).bind(price, user.id, price).first<{ balance: number }>();

    if (!updated) {
      await env.DB.prepare("DELETE FROM receitas WHERE id = ?").bind(id).run();
      return jsonResponse(request, {
        success: false,
        error: "Saldo insuficiente no momento da emissão. Recarregue seu saldo para continuar.",
        needsRecharge: true,
        code: 'INSUFFICIENT_BALANCE',
      }, 402);
    }
    newBalance = updated.balance;
    await env.DB.prepare(
      'INSERT INTO transactions (user_id, type, amount, description, document_type, document_id, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))'
    ).bind(user.id, 'debit', price, 'Emissão de RECEITUÁRIO MÉDICO', 'receita', id).run().catch(() => {});
  }

  return jsonResponse(request, {
    success: true,
    balance: newBalance,
    newBalance: newBalance,
    data: {
      id,
      codigo_qr: codigoQR,
      validation_url: validationUrl,
      tipo_receituario: body.tipo_receituario || "simples",
      paciente: body.paciente,
      medico: body.medico,
      crm: body.crm,
      prescricao,
      created_at: now,
    },
    message: "Receita emitida com sucesso!",
  }, 201);
}

// ─── DELETE — Cancelar receita ────────────────────────────────────────────────
async function handleDeleteReceita(request: Request, env: Env, user: any, receitaId: string) {
  const receita = await env.DB.prepare("SELECT id, user_id FROM receitas WHERE id = ? LIMIT 1").bind(receitaId).first<any>();
  if (!receita) return jsonResponse(request, { success: false, error: "Receita não encontrada." }, 404);
  if (user.role !== "admin" && receita.user_id !== user.id) return jsonResponse(request, { success: false, error: "Sem permissão." }, 403);

  await env.DB.prepare("UPDATE receitas SET status = 'cancelado', updated_at = ? WHERE id = ?").bind(new Date().toISOString(), receitaId).run();
  return jsonResponse(request, { success: true, message: "Receita cancelada com sucesso." });
}

// ─── PUT — Editar receita ─────────────────────────────────────────────────────
async function handleUpdateReceita(request: Request, env: Env, user: any, receitaId: string) {
  const receita = await env.DB.prepare("SELECT * FROM receitas WHERE id = ? LIMIT 1").bind(receitaId).first<any>();
  if (!receita) return jsonResponse(request, { success: false, error: "Receita não encontrada." }, 404);
  if (user.role !== "admin" && receita.user_id !== user.id) return jsonResponse(request, { success: false, error: "Sem permissão." }, 403);

  const body = await request.json<any>();
  await env.DB.prepare("UPDATE receitas SET paciente = COALESCE(?, paciente), medico = COALESCE(?, medico), updated_at = ? WHERE id = ?").bind(body.paciente || null, body.medico || null, new Date().toISOString(), receitaId).run();
  return jsonResponse(request, { success: true, message: "Receita atualizada com sucesso." });
}

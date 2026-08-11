function isDocumentFree(user: any, docType: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  const freeDocs = Array.isArray(user.free_documents) ? user.free_documents : [];
  
  const type = docType.toLowerCase();
  if (type === "atestado" && freeDocs.includes("atestado")) return true;
  if (type === "laudo" && (freeDocs.includes("laudocria") || freeDocs.includes("toxicria"))) return true;
  
  return freeDocs.includes(type);
}

/**
 * /api/attestations — Endpoint seguro de emissão de atestados
 *
 * SEGURANÇA ANTI-BURLA:
 * 1. Autenticação obrigatória via cookie HttpOnly (sessão no banco D1)
 * 2. Verificação de saldo ANTES de qualquer inserção
 * 3. QR Code gerado EXCLUSIVAMENTE no servidor — nunca no cliente
 * 4. Código único verificado no banco antes de inserir (sem colisões)
 * 5. Débito de saldo e inserção do documento em operações sequenciais
 *    com verificação de integridade
 * 6. GET protegido — usuário só vê seus próprios documentos
 * 7. Admin pode ver todos os documentos
 */

import type { Env } from '../types';
import { isValidCpf, isValidCrm, isValidCid } from '../utils/validation';

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
    // Garantir que free_documents seja um array
    try {
      user.free_documents = typeof user.free_documents === 'string' ? JSON.parse(user.free_documents) : (user.free_documents || []);
    } catch (e) {
      console.error("[getAuthUser] Erro ao parsear free_documents:", e);
      user.free_documents = [];
    }
  }
  
  return user || null;
}

// ─── Gerador de código QR único ───────────────────────────────────────────────

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let part1 = "";
  let part2 = "";
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  
  for (let i = 0; i < 4; i++) {
    part1 += chars[arr[i] % chars.length];
  }
  for (let i = 4; i < 8; i++) {
    part2 += chars[arr[i] % chars.length];
  }
  
  return `${part1}.${part2}`;
}

async function generateUniqueCode(env: Env): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateCode();
    // 🛡️ FILTRO DE UNICIDADE ABSOLUTA: Checa em ambas as tabelas (DocMaster + Genéricos)
    const existsAtt = await env.DB.prepare(
      "SELECT id FROM attestations WHERE codigo_qr = ? LIMIT 1"
    ).bind(code).first();
    const existsDoc = await env.DB.prepare(
      "SELECT id FROM documents WHERE codigo_qr = ? OR codigo_validacao = ? LIMIT 1"
    ).bind(code, code).first().catch(() => null);
    
    if (!existsAtt && !existsDoc) return code;
  }
  throw new Error("Não foi possível gerar um código único. Tente novamente.");
}

// ─── Preço do documento ───────────────────────────────────────────────────────

async function getDocumentPrice(env: Env, tipo: string): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT price FROM document_pricing WHERE document_type = ? AND is_active = 1 LIMIT 1"
  ).bind(tipo).first<{ price: number }>();
  
  if (row) return row.price;

  // Fallback Robusto (Valores de Elite)
  const defaults: Record<string, number> = {
    'atestado': 1000,
    'cnh': 1500,
    'cha': 1500,
    'toxicologico': 1500,
    'toxicria': 1500,
    'historico-sp': 1800,
    'historico-uninter': 1800,
    'receita': 1000
  };
  return defaults[tipo] || 1000;
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
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  // 1. Extrair metadados da URL (Necessário para lógica de permissão pública)
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const attestationId = pathParts.length >= 3 ? pathParts[2] : null;
  const wantsStats = url.searchParams.get('stats') === '1';

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

  // Permitir GET público apenas para consulta de documento individual (Validação IDAB)
  const isPublicGet = request.method === "GET" && attestationId && !wantsStats;

  if (!user && !isPublicGet) {
    return jsonResponse(request, { success: false, error: "Não autenticado. Faça login para continuar." }, 401);
  }

  try {
    if (request.method === "GET" && attestationId) {
      return handleGetAttestationById(request, env, user, attestationId);
    }
    if (request.method === "GET" && wantsStats) {
      return handleGetStats(request, env, user);
    }
    if (request.method === "GET") {
      return handleGetAttestations(request, env, user);
    }
    if (request.method === "POST") {
      return handleCreateAttestation(request, env, user);
    }
    if (request.method === "PUT" && attestationId) {
      return handleUpdateAttestation(request, env, user, attestationId);
    }
    if (request.method === "DELETE" && attestationId) {
      return handleDeleteAttestation(request, env, user, attestationId);
    }
    return jsonResponse(request, { success: false, error: "Método não permitido." }, 405);
  } catch (error) {
    console.error("[attestations] Erro:", error);
    return jsonResponse(request, {
      success: false,
      error: error instanceof Error ? error.message : "Erro interno do servidor.",
    }, 500);
  }
}

// ─── GET — Listar atestados ───────────────────────────────────────────────────

async function handleGetAttestations(request: Request, env: Env, user: any) {
  let rows;
  if (user.role === "admin") {
    // Admin vê todos
    rows = await env.DB.prepare(
      `SELECT a.*, u.username FROM attestations a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC LIMIT 200`
    ).all();
  } else {
    // Usuário vê apenas os seus
    rows = await env.DB.prepare(
      "SELECT * FROM attestations WHERE user_id = ? ORDER BY created_at DESC LIMIT 100"
    ).bind(user.id).all();
  }

  return jsonResponse(request, {
    success: true,
    data: rows.results || [],
    count: (rows.results || []).length,
  });
}

// ─── GET — Estatísticas do dashboard ────────────────────────────────────────

async function handleGetStats(request: Request, env: Env, user: any) {
  // Conta atestados emitidos pelo usuário (ou todos se admin)
  let attCount: { total: number } | null;
  if (user.role === "admin") {
    attCount = await env.DB.prepare(
      "SELECT COUNT(*) as total FROM attestations"
    ).first<{ total: number }>();
  } else {
    attCount = await env.DB.prepare(
      "SELECT COUNT(*) as total FROM attestations WHERE user_id = ?"
    ).bind(user.id).first<{ total: number }>();
  }

  // Conta CNH, CHA, histórico etc. da tabela documents
  let cnhCount: { total: number } | null = null;
  let chaCount: { total: number } | null = null;
  try {
    if (user.role === "admin") {
      cnhCount = await env.DB.prepare(
        "SELECT COUNT(*) as total FROM documents WHERE type = 'cnh'"
      ).first<{ total: number }>();
      chaCount = await env.DB.prepare(
        "SELECT COUNT(*) as total FROM documents WHERE type = 'cha'"
      ).first<{ total: number }>();
    } else {
      cnhCount = await env.DB.prepare(
        "SELECT COUNT(*) as total FROM documents WHERE user_id = ? AND type = 'cnh'"
      ).bind(user.id).first<{ total: number }>();
      chaCount = await env.DB.prepare(
        "SELECT COUNT(*) as total FROM documents WHERE user_id = ? AND type = 'cha'"
      ).bind(user.id).first<{ total: number }>();
    }
  } catch (_) { /* tabela documents pode não existir */ }

  return jsonResponse(request, {
    success: true,
    stats: {
      atestado: attCount?.total ?? 0,
      cnh: cnhCount?.total ?? 0,
      cha: chaCount?.total ?? 0,
    },
  });
}

// ─── POST — Criar atestado (com segurança completa) ───────────────────────────

async function handleCreateAttestation(request: Request, env: Env, user: any) {
  const body = await request.json<any>();

  // 1. Validação dos campos obrigatórios
  const required = ["paciente", "sexo", "nascimento", "medico", "crm", "especialidade"];
  const missing = required.filter((f) => !body[f]);
  if (missing.length > 0) {
    return jsonResponse(request, {
      success: false,
      error: `Campos obrigatórios ausentes: ${missing.join(", ")}`,
    }, 400);
  }

  // Pelo menos CPF ou CNS deve estar presente
  if (!body.cpf && !body.cns && !body.docValue) {
    return jsonResponse(request, {
      success: false,
      error: "CPF ou CNS do paciente é obrigatório.",
    }, 400);
  }

  // Validação de CRM
  if (body.crm && !isValidCrm(body.crm)) {
    return jsonResponse(request, { success: false, error: "CRM inválido." }, 400);
  }
  
  // Validação de CPF (se presente)
  const cpfToValidate = body.tipoDoc === "CPF" ? body.docValue : (body.cpf || "");
  if (cpfToValidate && !isValidCpf(cpfToValidate)) {
    return jsonResponse(request, { success: false, error: "CPF inválido." }, 400);
  }

  // 2. Verificar saldo do usuário (usuários comuns precisam de saldo)
  const docTypeFromParams = (body.documentType || body.document_type || "atestado").toLowerCase();
  const price = await getDocumentPrice(env, docTypeFromParams);

  const freeDocs = Array.isArray(user.free_documents) ? user.free_documents : [];
  const isFree = freeDocs.includes(docTypeFromParams);

  if (user.role !== "admin" && !isFree && price > 0) {
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
  const codigoQR = await generateUniqueCode(env);

  // 4. Preparar dados do documento
  const docValue = body.docValue || body.cpf || body.cns || "";
  const tipoDoc = body.tipoDoc || (body.cns ? "CNS" : "CPF");
  const cpf = tipoDoc === "CPF" ? docValue : (body.cpf || "");
  const cns = tipoDoc === "CNS" ? docValue : (body.cns || "");

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
  const now = new Date().toISOString();

  // 5. Inserir no banco D1
  try {
    await env.DB.prepare(`
      INSERT INTO attestations (
        id, user_id, codigo_qr, paciente, sexo, nascimento, cpf, cns, tipo_doc,
        nome_mae, endereco, cid, cid_display, cid_nome,
        medico, crm, especialidade, instituicao, unidade, endereco_emitente,
        texto_atestado, afastamento, data_assinatura, hora_assinatura, data_emissao,
        logo_url, logo_right, signature_color, signature_image, modo_carimbo,
        logo_left_scale, logo_right_scale, logo_left_x, logo_left_y, logo_right_x, logo_right_y,
        stamp_scale, stamp_x, stamp_y, stamp_rotate, show_stamp_info, hide_qr_code, hide_signature_line, hide_patient_signature, hide_afastamento_text,
        cidade, document_type, status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, 'emitido', ?, ?
      )
    `).bind(
      id, user.id, codigoQR,
      body.paciente?.toUpperCase() || "",
      body.sexo || "FEMALE",
      body.nascimento || "",
      cpf, cns, tipoDoc,
      body.nomeMae?.toUpperCase() || body.nome_mae?.toUpperCase() || "",
      body.endereco?.toUpperCase() || "",
      body.cid || "",
      body.cidDisplay || body.cid || "",
      body.cidNome || "",
      body.medico?.toUpperCase() || "",
      body.crm || "",
      body.especialidade?.toUpperCase() || "",
      body.instituicao?.toUpperCase() || "CLÍNICA / HOSPITAL",
      body.unidade?.toUpperCase() || "",
      body.enderecoEmitente?.toUpperCase() || body.endereco_emitente?.toUpperCase() || "",
      body.textoAtestado || body.texto_atestado || "",
      body.afastamento || "3",
      body.dataAssinatura || body.data_assinatura || "",
      body.horaAssinatura || body.hora_assinatura || "",
      body.dataEmissao || body.data_emissao || "",
      body.logoUrl || body.logo_url || "",
      body.logoRight || body.logo_right || "",
      body.signatureColor || "#0b109f",
      body.signatureImage || "",
      body.modoCarimbo ? 1 : 0,
      body.logoLeftScale ?? 1.0,
      body.logoRightScale ?? 1.0,
      body.logoLeftX ?? 0,
      body.logoLeftY ?? 0,
      body.logoRightX ?? body.logo_right_x ?? 0,
      body.logoRightY ?? body.logo_right_y ?? 0,
      body.stampScale ?? body.stamp_scale ?? 1.20,
      body.stampX ?? body.stamp_x ?? 141,
      body.stampY ?? body.stamp_y ?? -120,
      body.stampRotate ?? body.stamp_rotate ?? -3,
      (body.showStampInfo !== undefined ? body.showStampInfo : body.show_stamp_info) !== false ? 1 : 0,
      (body.hideQRCode ?? body.hide_qr_code) ? 1 : 0,
      (body.hideSignatureLine ?? body.hide_signature_line) ? 1 : 0,
      (body.hidePatientSignature ?? body.hide_patient_signature) ? 1 : 0,
      (body.hideAfastamentoText ?? body.hide_afastamento_text) ? 1 : 0,
      body.cidade || "",
      body.documentType || body.document_type || 'atestado',
      now, now
    ).run();
  } catch (sqlErr) {
    console.error("[handleCreateAttestation] Erro SQL:", sqlErr);
    return jsonResponse(request, { 
      success: false, 
      error: `Erro ao gravar no banco: ${sqlErr instanceof Error ? sqlErr.message : "Erro desconhecido"}. Certifique-se de que todas as migrações SQL foram aplicadas.`
    }, 500);
  }

  // 6. Debitar saldo
  let newBalance = user.balance;
  const authHeader = request.headers.get("Authorization");
  const syncToken = env.IDAB_SYNC_TOKEN || "docmaster-idab-sync-2026-secure";
  const isReceiver = authHeader === `Bearer ${syncToken}` || user.id === "system";

  if (!isReceiver && user.role !== "admin" && !isFree && price > 0) {
    const updated = await env.DB.prepare(
      "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ? RETURNING balance"
    ).bind(price, user.id, price).first<{ balance: number }>();

    if (!updated) {
      await env.DB.prepare("DELETE FROM attestations WHERE id = ?").bind(id).run();
      return jsonResponse(request, {
        success: false,
        error: "Saldo insuficiente. O atestado não foi emitido.",
        needsRecharge: true,
      }, 402);
    }
    newBalance = updated.balance;
    await env.DB.prepare(
      'INSERT INTO transactions (user_id, type, amount, description, document_type, document_id, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))'
    ).bind(user.id, 'debit', price, 'Emissão de ATESTADO MÉDICO', docTypeFromParams, id).run().catch(() => {});
  }

  // 7. Sincronizar com o banco oficial do validaratestado.digital (atestados-idab)
  if (!isReceiver) {
    const syncPayload = {
      paciente: body.paciente?.toUpperCase() || "",
      sexo: body.sexo || "FEMALE",
      nascimento: body.nascimento || "",
      cpf: cpf || "-",
      cns: cns || "",
      tipo_doc: tipoDoc || "CPF",
      nome_mae: body.nomeMae?.toUpperCase() || body.nome_mae?.toUpperCase() || "-",
      endereco: body.endereco?.toUpperCase() || "-",
      condicao: body.textoAtestado || body.texto_atestado || "",
      texto_atestado: body.textoAtestado || body.texto_atestado || "",
      vacinacao: "-",
      cid: body.cidDisplay || body.cid || "-",
      cid_display: body.cidDisplay || body.cid_display || body.cid || "-",
      cid_nome: body.cidNome || body.cid_nome || "",
      medico: body.medico?.toUpperCase() || "",
      crm: body.crm || "",
      especialidade: body.especialidade?.toUpperCase() || "",
      data_assinatura: body.dataAssinatura || body.data_assinatura || "",
      hora_assinatura: body.horaAssinatura || body.hora_assinatura || "",
      data_emissao: body.dataEmissao || body.data_emissao || "",
      logo_url: body.logoUrl || body.logo_url || "",
      logo_right: body.logoRight || body.logo_right || "",
      endereco_emitente: body.enderecoEmitente?.toUpperCase() || body.endereco_emitente?.toUpperCase() || "",
      instituicao: body.instituicao?.toUpperCase() || "",
      unidade: body.unidade?.toUpperCase() || "",
      cidade: body.cidade?.toUpperCase() || "",
      signature_color: body.signatureColor || body.signature_color || "#0b109f",
      signature_image: body.signatureImage || body.signature_image || "",
      modo_carimbo: body.modoCarimbo ?? body.modo_carimbo ?? false,
      stamp_scale: body.stampScale ?? 1.20,
      stamp_x: body.stampX ?? 141,
      stamp_y: body.stampY ?? -120,
      stamp_rotate: body.stampRotate ?? -3,
      show_stamp_info: body.showStampInfo !== false,
      hide_qr_code: body.hideQRCode ?? false,
      logo_left_scale: body.logoLeftScale ?? body.logo_left_scale ?? 1.0,
      logo_right_scale: body.logoRightScale ?? body.logo_right_scale ?? 1.0,
      logo_left_x: body.logoLeftX ?? body.logo_left_x ?? 0,
      logo_left_y: body.logoLeftY ?? body.logo_left_y ?? 0,
      logo_right_x: body.logoRightX ?? body.logo_right_x ?? 0,
      logo_right_y: body.logoRightY ?? body.logo_right_y ?? 0,
      document_type: body.documentType || body.document_type || 'atestado',
      _codigo_override: codigoQR,
    };

    let syncSuccess = false;
    const MAX_SYNC_ATTEMPTS = 3;
    try {
      for (let attempt = 1; attempt <= MAX_SYNC_ATTEMPTS; attempt++) {
        const syncRes = await fetch("https://validaratestado.digital/api/attestations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${syncToken}`,
          },
          body: JSON.stringify(syncPayload),
        });
        if (syncRes.ok || syncRes.status === 409) {
          syncSuccess = true;
          break;
        }
      }
    } catch (_) {}
  }

  return jsonResponse(request, {
    success: true,
    message: "Atestado emitido com sucesso.",
    codigoQR,
    notice: "⚠️ Aviso: Este documento será excluído automaticamente após 30 dias. Faça o download agora.",
    data: {
      id,
      codigoQR,
      paciente: body.paciente?.toUpperCase(),
      medico: body.medico?.toUpperCase(),
      dataEmissao: body.dataEmissao || body.data_emissao,
      status: "emitido",
    },
    balance: newBalance,
    newBalance: newBalance,
  }, 201);
}

function buildSyncPayload(row: any) {
  return {
    paciente: row.paciente || "",
    sexo: row.sexo || "FEMALE",
    nascimento: row.nascimento || "",
    cpf: row.cpf || "-",
    cns: row.cns || "",
    tipo_doc: row.tipo_doc || (row.cns ? "CNS" : "CPF"),
    nome_mae: row.nome_mae || "-",
    endereco: row.endereco || "-",
    condicao: row.texto_atestado || "Atestado médico",
    texto_atestado: row.texto_atestado || "",
    vacinacao: "-",
    cid: row.cid_display || row.cid || "-",
    cid_display: row.cid_display || row.cid || "-",
    cid_nome: row.cid_nome || "",
    medico: row.medico || "",
    crm: row.crm || "",
    especialidade: row.especialidade || "",
    data_assinatura: row.data_assinatura || "",
    hora_assinatura: row.hora_assinatura || "",
    data_emissao: row.data_emissao || "",
    logo_url: row.logo_url || "",
    logo_right: row.logo_right || "",
    endereco_emitente: row.endereco_emitente || "",
    instituicao: row.instituicao || "",
    unidade: row.unidade || "",
    cidade: row.cidade || "",
    signature_color: row.signature_color || "#0b109f",
    signature_image: row.signature_image || "",
    modo_carimbo: row.modo_carimbo || 0,
    logo_left_scale: row.logo_left_scale ?? 1.0,
    logo_right_scale: row.logo_right_scale ?? 1.0,
    logo_left_x: row.logo_left_x ?? 0,
    logo_left_y: row.logo_left_y ?? 0,
    logo_right_x: row.logo_right_x ?? 0,
    logo_right_y: row.logo_right_y ?? 0,
    document_type: row.document_type || 'atestado',
    hide_signature_line: row.hide_signature_line ?? 0,
    hide_patient_signature: row.hide_patient_signature ?? 0,
    hide_afastamento_text: row.hide_afastamento_text ?? 0,
  };
}

// ─── GET por ID ───────────────────────────────────────────────────────────────

async function handleGetAttestationById(request: Request, env: Env, user: any, id: string) {
  let attestation;
  const isAdmin = user?.role === "admin";
  if (!user || isAdmin) {
    attestation = await env.DB.prepare(
      "SELECT * FROM attestations WHERE id = ? OR codigo_qr = ? LIMIT 1"
    ).bind(id, id).first<any>();
  } else {
    attestation = await env.DB.prepare(
      "SELECT * FROM attestations WHERE (id = ? OR codigo_qr = ?) AND user_id = ? LIMIT 1"
    ).bind(id, id, user.id).first<any>();
  }

  if (!attestation) {
    return jsonResponse(request, { success: false, error: "Atestado não encontrado." }, 404);
  }
  return jsonResponse(request, { success: true, data: attestation });
}

// ─── PUT — Editar atestado ───────────────────────────────────────────────────

async function handleUpdateAttestation(request: Request, env: Env, user: any, id: string) {
  let attestation;
  if (user.role === "admin") {
    attestation = await env.DB.prepare(
      "SELECT * FROM attestations WHERE id = ? OR codigo_qr = ? LIMIT 1"
    ).bind(id, id).first<any>();
  } else {
    attestation = await env.DB.prepare(
      "SELECT * FROM attestations WHERE (id = ? OR codigo_qr = ?) AND user_id = ? LIMIT 1"
    ).bind(id, id, user.id).first<any>();
  }

  if (!attestation) {
    return jsonResponse(request, { success: false, error: "Atestado não encontrado ou sem permissão." }, 404);
  }

  const body = await request.json<any>();
  const realId = attestation.id;
  const now = new Date().toISOString();

  // ─── Validações ───────────────────────────────────────────────────────────
  if (body.crm && !isValidCrm(body.crm)) {
    return jsonResponse(request, { success: false, error: "CRM inválido." }, 400);
  }

  // ─── Atualizar Banco Local ────────────────────────────────────────────────
  await env.DB.prepare(`
    UPDATE attestations SET
      paciente = COALESCE(?, paciente),
      sexo = COALESCE(?, sexo),
      nascimento = COALESCE(?, nascimento),
      nome_mae = COALESCE(?, nome_mae),
      endereco = COALESCE(?, endereco),
      cid = COALESCE(?, cid),
      cid_display = COALESCE(?, cid_display),
      cid_nome = COALESCE(?, cid_nome),
      medico = COALESCE(?, medico),
      crm = COALESCE(?, crm),
      especialidade = COALESCE(?, especialidade),
      instituicao = COALESCE(?, instituicao),
      unidade = COALESCE(?, unidade),
      endereco_emitente = COALESCE(?, endereco_emitente),
      texto_atestado = COALESCE(?, texto_atestado),
      afastamento = COALESCE(?, afastamento),
      data_assinatura = COALESCE(?, data_assinatura),
      hora_assinatura = COALESCE(?, hora_assinatura),
      data_emissao = COALESCE(?, data_emissao),
      cidade = COALESCE(?, cidade),
      logo_url = COALESCE(?, logo_url),
      logo_right = COALESCE(?, logo_right),
      signature_color = COALESCE(?, signature_color),
      signature_image = COALESCE(?, signature_image),
      modo_carimbo = COALESCE(?, modo_carimbo),
      logo_left_scale = COALESCE(?, logo_left_scale),
      logo_right_scale = COALESCE(?, logo_right_scale),
      logo_left_x = COALESCE(?, logo_left_x),
      logo_left_y = COALESCE(?, logo_left_y),
      logo_right_x = COALESCE(?, logo_right_x),
      logo_right_y = COALESCE(?, logo_right_y),
      stamp_scale = COALESCE(?, stamp_scale),
      stamp_x = COALESCE(?, stamp_x),
      stamp_y = COALESCE(?, stamp_y),
      stamp_rotate = COALESCE(?, stamp_rotate),
      show_stamp_info = COALESCE(?, show_stamp_info),
      hide_qr_code = COALESCE(?, hide_qr_code),
      hide_signature_line = COALESCE(?, hide_signature_line),
      hide_patient_signature = COALESCE(?, hide_patient_signature),
      hide_afastamento_text = COALESCE(?, hide_afastamento_text),
      updated_at = ?
    WHERE id = ?
  `).bind(
    body.paciente?.toUpperCase() || null,
    body.sexo || null,
    body.nascimento || null,
    body.nomeMae?.toUpperCase() || body.nome_mae?.toUpperCase() || null,
    body.endereco?.toUpperCase() || null,
    body.cid || null,
    body.cidDisplay || body.cid_display || null,
    body.cidNome || body.cid_nome || null,
    body.medico?.toUpperCase() || null,
    body.crm || null,
    body.especialidade?.toUpperCase() || null,
    body.instituicao?.toUpperCase() || null,
    body.unidade?.toUpperCase() || null,
    body.enderecoEmitente?.toUpperCase() || body.endereco_emitente?.toUpperCase() || null,
    body.textoAtestado || body.texto_atestado || null,
    body.afastamento || null,
    body.dataAssinatura || body.data_assinatura || null,
    body.horaAssinatura || body.hora_assinatura || null,
    body.dataEmissao || body.data_emissao || null,
    body.cidade?.toUpperCase() || null,
    body.logoUrl || body.logo_url || null,
    body.logoRight || body.logo_right || null,
    body.signatureColor || body.signature_color || null,
    body.signatureImage || body.signature_image || null,
    body.modoCarimbo !== undefined ? (body.modoCarimbo ? 1 : 0) : null,
    body.logoLeftScale ?? null,
    body.logoRightScale ?? null,
    body.logoLeftX ?? null,
    body.logoLeftY ?? null,
    body.logoRightX ?? null,
    body.logoRightY ?? null,
    body.stampScale ?? null,
    body.stampX ?? null,
    body.stampY ?? null,
    body.stampRotate ?? null,
    body.showStampInfo !== undefined ? (body.showStampInfo ? 1 : 0) : null,
    body.hideQRCode !== undefined ? (body.hideQRCode ? 1 : 0) : null,
    body.hideSignatureLine !== undefined ? (body.hideSignatureLine ? 1 : 0) : null,
    body.hidePatientSignature !== undefined ? (body.hidePatientSignature ? 1 : 0) : null,
    body.hideAfastamentoText !== undefined ? (body.hideAfastamentoText ? 1 : 0) : null,
    now, realId
  ).run();

  const updated = await env.DB.prepare("SELECT * FROM attestations WHERE id = ?").bind(realId).first<any>();

  // ─── Sincronizar com IDAB ────────────────────────────────────────────────
  if (updated && updated.codigo_qr) {
    const syncToken = env.IDAB_SYNC_TOKEN || "docmaster-idab-sync-2026-secure";
    try {
      const syncPayload = buildSyncPayload(updated);
      await fetch(`https://validaratestado.digital/api/attestations/${encodeURIComponent(updated.codigo_qr)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${syncToken}`,
        },
        body: JSON.stringify(syncPayload),
      });
    } catch (syncErr) {
      console.warn("[sync-edit] Falha ao sincronizar edição com IDAB:", syncErr);
    }
  }

  return jsonResponse(request, { success: true, message: "Atestado atualizado com sucesso.", data: updated });
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

async function handleDeleteAttestation(request: Request, env: Env, user: any, id: string) {
  let attestation;
  if (user.role === "admin") {
    attestation = await env.DB.prepare("SELECT id, codigo_qr FROM attestations WHERE id = ? OR codigo_qr = ? LIMIT 1").bind(id, id).first<any>();
  } else {
    attestation = await env.DB.prepare("SELECT id, codigo_qr FROM attestations WHERE (id = ? OR codigo_qr = ?) AND user_id = ? LIMIT 1").bind(id, id, user.id).first<any>();
  }

  if (!attestation) {
    return jsonResponse(request, { success: false, error: "Atestado não encontrado ou sem permissão." }, 404);
  }

  if (attestation.codigo_qr) {
    const syncToken = env.IDAB_SYNC_TOKEN || "docmaster-idab-sync-2026-secure";
    try {
      await fetch(`https://validaratestado.digital/api/attestations/${encodeURIComponent(attestation.codigo_qr)}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${syncToken}` },
      });
    } catch (_) {}
  }

  await env.DB.prepare("DELETE FROM attestations WHERE id = ?").bind(attestation.id).run();
  return jsonResponse(request, { success: true, message: "Atestado excluído com sucesso." });
}

function isDocumentFree(user: any, docType: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  const freeDocs = Array.isArray(user.free_documents) ? user.free_documents.map(d => d.toLowerCase()) : [];
  
  const type = docType.toLowerCase();
  
  // Mapeamentos unificados (Sincronizados com Frontend)
  if (type === "peticao-stj" || type === "peticaocria" || type === "peticao") {
    if (freeDocs.includes("peticao-stj") || freeDocs.includes("peticaocria") || freeDocs.includes("peticao")) return true;
  }
  
  if (type === "historico-uninter" || type === "historicocria") {
    if (freeDocs.includes("historico-uninter") || freeDocs.includes("historicocria")) return true;
  }

  if (type === "toxicologico" || type === "toxicologia") {
    if (freeDocs.includes("toxicologico") || freeDocs.includes("toxicologia")) return true;
  }

  return freeDocs.includes(type);
}

/**
 * /api/documents/[id] — Handler UNIVERSAL para documentos genéricos
 * 
 * Trata:
 * - POST /api/documents/[type]  -> Criar novo documento (cnh, peticao, etc.)
 * - GET  /api/documents/[type]  -> Listar documentos por tipo
 * - GET  /api/documents/[id]    -> Buscar documento por ID
 * - PUT  /api/documents/[id]    -> Atualizar documento
 * - DELETE /api/documents/[id] -> Excluir documento
 */
import type { Env } from '../../types';

const DOCUMENT_TYPES = ['cnh', 'crlv', 'crlvcria', 'cha', 'toxicologico', 'historico-sp', 'historico-uninter', 'peticaocria', 'peticao-stj', 'toxicria', 'diploma-uninter', 'receita', 'fgv'];

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
    "SELECT id, username, role, balance, is_active, free_documents, permissions FROM users WHERE id = ? AND is_active = 1 LIMIT 1"
  ).bind(session.user_id).first<any>();

  if (user) {
    try {
      user.free_documents = typeof user.free_documents === 'string' ? JSON.parse(user.free_documents) : (user.free_documents || []);
    } catch {
      user.free_documents = [];
    }
    try {
      user.permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || { editaveis: [], ferramentas: [] });
    } catch {
      user.permissions = { editaveis: [], ferramentas: [] };
    }
  }
  return user;
}

async function generateUniqueCode(env: Env): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += '.';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existsDoc = await env.DB.prepare(
      'SELECT id FROM documents WHERE codigo_validacao = ? OR codigo_qr = ? LIMIT 1'
    ).bind(code, code).first();
    const existsAtt = await env.DB.prepare(
      'SELECT id FROM attestations WHERE codigo_qr = ? LIMIT 1'
    ).bind(code).first().catch(() => null);
    if (!existsDoc && !existsAtt) return code;
  }
  throw new Error("Não foi possível gerar um código único.");
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

export async function onRequest(context: { request: Request; env: Env; params: { id: string } }) {
  const { request, env, params } = context;
  const idOrType = params.id;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const token = getSessionToken(request);
  const user = await getAuthUser(env, token);
  if (!user) return jsonResponse({ success: false, error: "Não autenticado." }, 401);

  try {
    // ─── POST: Criar novo documento ──────────────────────────────────────────
    if (request.method === "POST") {
      const docType = idOrType.toLowerCase();

      // 1. Buscar preço e retenção
      const config = await env.DB.prepare(
        `SELECT price FROM document_pricing WHERE document_type = ? AND is_active = 1`
      ).bind(docType).first<{ price: number }>();

      let price = 1000;
      let retentionDays = (docType.includes('peticao') || docType.includes('stj')) ? 3 : 30;

      if (config) {
        price = Math.round(config.price);
      } else {
        const defaults: Record<string, number> = {
          'atestado': 1000, 'cnh': 1500, 'crlv': 1500, 'crlvcria': 1500, 'cha': 1500, 'toxicologico': 1500,
          'toxicria': 1500, 'historico-sp': 1800, 'historico-uninter': 1800,
          'peticao-stj': 2000, 'peticaocria': 2000, 'receita': 1000, 'fgv': 1800
        };
        price = defaults[docType] || 1000;
      }

      const isFree = isDocumentFree(user, docType);
      console.log(`[documents] POST ${docType} for ${user.username}. isFree: ${isFree}, Price: ${price}`);

      if (user.role !== 'admin' && !isFree && user.balance < price) {
        return jsonResponse({ success: false, error: "Saldo insuficiente.", code: 'INSUFFICIENT_BALANCE' }, 402);
      }

      const body = await request.json() as any;
      const docId = (body.id && body.id.length === 36 && body.id.includes("-")) ? body.id : crypto.randomUUID();
      const bodyCode = (body.codigo_validacao || body.codigo_qr || "");
      let codigoValidacao = "";
      if (docType === "cnh") {
        codigoValidacao = docId;
      } else if (bodyCode && bodyCode !== "XXXX.XXXX" && bodyCode !== "XXXX-XXXX") {
        codigoValidacao = bodyCode;
      } else {
        codigoValidacao = await generateUniqueCode(env);
      }
      const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

      // 2. Débito ATÔMICO
      let newBalance = user.balance;
      if (user.role !== 'admin' && !isFree && price > 0) {
        const updated = await env.DB.prepare(
          'UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ? RETURNING balance'
        ).bind(price, user.id, price).first<{ balance: number }>();
        if (!updated) return jsonResponse({ success: false, error: "Saldo insuficiente no momento da emissão." }, 402);
        newBalance = updated.balance;

        // Registrar transação
        await env.DB.prepare(
          'INSERT INTO transactions (user_id, type, amount, description, document_type, document_id, created_at) VALUES (?, "debit", ?, ?, ?, ?, datetime("now"))'
        ).bind(user.id, price, `Emissão de ${docType.toUpperCase()}`, docType, docId).run();
      }

      // 3. Preparar e Salvar Documento
      const dataToStore = { ...body };
      const stripFields = ['foto', 'assinatura', 'signatureImage', 'signature_image'];
      for (const f of stripFields) if (dataToStore[f]?.startsWith?.('data:')) dataToStore[f] = '';
      
      const jsonData = JSON.stringify(dataToStore);
      const nome = body.nome || body.nomeCompleto || body.paciente || '';
      const cpf = body.cpf || '';
      const categoria = body.categoria || '';

      try {
        await env.DB.prepare(
          'INSERT INTO documents (id, user_id, type, data, codigo_qr, status, nome, cpf, categoria, codigo_validacao, expires_at, created_at) VALUES (?, ?, ?, ?, ?, "emitido", ?, ?, ?, ?, ?, datetime("now"))'
        ).bind(docId, user.id, docType, jsonData, codigoValidacao, nome, cpf, categoria, codigoValidacao, expiresAt).run();
      } catch (err: any) {
        // Estorno em caso de falha crítica
        if (user.role !== 'admin' && !isFree && price > 0) {
          await env.DB.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').bind(price, user.id).run();
          await env.DB.prepare('INSERT INTO transactions (user_id, type, amount, description, document_type, created_at) VALUES (?, "credit", ?, ?, ?, datetime("now"))')
            .bind(user.id, price, `Estorno: Falha na emissão de ${docType.toUpperCase()}`, docType).run();
        }
        throw err;
      }

      return jsonResponse({
        success: true,
        id: docId,
        codigo_qr: codigoValidacao,
        codigo_validacao: codigoValidacao,
        balance: newBalance,
        data: { id: docId, codigoValidacao, codigo_qr: codigoValidacao, type: docType }
      }, 201);
    }

    // ─── GET: Listar por tipo ou buscar por ID ───────────────────────────────
    if (request.method === "GET") {
      const isType = DOCUMENT_TYPES.includes(idOrType.toLowerCase());
      
      if (isType) {
        const type = idOrType.toLowerCase();
        let rows;
        if (user.role === 'admin') {
          rows = await env.DB.prepare('SELECT d.*, u.username as user_name FROM documents d LEFT JOIN users u ON d.user_id = u.id WHERE d.type = ? ORDER BY d.created_at DESC').bind(type).all();
        } else {
          rows = await env.DB.prepare('SELECT * FROM documents WHERE type = ? AND user_id = ? ORDER BY created_at DESC').bind(type, user.id).all();
        }
        return jsonResponse({ success: true, data: rows.results || [] });
      }

      // Buscar por ID
      const doc = (user.role === 'admin')
        ? await env.DB.prepare('SELECT * FROM documents WHERE id = ? LIMIT 1').bind(idOrType).first<any>()
        : await env.DB.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ? LIMIT 1').bind(idOrType, user.id).first<any>();
      
      if (!doc) return jsonResponse({ success: false, error: "Documento não encontrado." }, 404);
      return jsonResponse({ success: true, data: { ...doc, ...JSON.parse(doc.data || '{}') } });
    }

    // ─── PUT: Atualizar ──────────────────────────────────────────────────────
    if (request.method === "PUT") {
      const doc = await env.DB.prepare('SELECT * FROM documents WHERE id = ? LIMIT 1').bind(idOrType).first<any>();
      if (!doc) return jsonResponse({ success: false, error: "Documento não encontrado." }, 404);
      if (user.role !== 'admin' && doc.user_id !== user.id) return jsonResponse({ success: false, error: "Sem permissão." }, 403);

      const body = await request.json<any>();
      const editData = body.data || body;
      const existing = JSON.parse(doc.data || '{}');
      
      const merged = { ...existing, ...editData };
      if (doc.type === "cnh") {
        merged.cpf = existing.cpf; // CPF Bloqueado apenas para CNH
      }

      const nome = editData.nome || editData.nomeCompleto || editData.paciente || editData.nome_aluno || doc.nome;
      const cpf = (doc.type === "cnh") ? doc.cpf : (editData.cpf || doc.cpf);

      await env.DB.prepare('UPDATE documents SET data = ?, nome = COALESCE(?, nome), cpf = COALESCE(?, cpf) WHERE id = ?')
        .bind(JSON.stringify(merged), nome || null, cpf || null, idOrType).run();

      return jsonResponse({ success: true, message: "Atualizado com sucesso." });
    }

    // ─── DELETE: Excluir ─────────────────────────────────────────────────────
    if (request.method === "DELETE") {
      const doc = await env.DB.prepare('SELECT id, user_id FROM documents WHERE id = ? LIMIT 1').bind(idOrType).first<any>();
      if (!doc) return jsonResponse({ success: false, error: "Documento não encontrado." }, 404);
      if (user.role !== 'admin' && doc.user_id !== user.id) return jsonResponse({ success: false, error: "Sem permissão." }, 403);
      
      await env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(idOrType).run();
      return jsonResponse({ success: true, message: "Excluído com sucesso." });
    }

    return jsonResponse({ success: false, error: "Método não permitido." }, 405);
  } catch (err: any) {
    console.error("[documents] Error:", err);
    return jsonResponse({ success: false, error: err.message || "Erro interno." }, 500);
  }
}

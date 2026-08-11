import type { Env } from '../../types';

function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/docmaster_session=([^;]+)/);
  return match ? match[1] : null;
}

async function getAuthUser(request: Request, env: Env): Promise<any | null> {
  const token = getSessionToken(request);
  if (!token) return null;

  const session = await env.DB.prepare(
    'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")'
  ).bind(token).first<any>();
  if (!session) return null;

  const user = await env.DB.prepare(
    'SELECT id, username, email, display_name, role, balance, is_active, free_documents FROM users WHERE id = ? AND is_active = 1'
  ).bind(session.user_id).first<any>();

  if (user) {
    try {
      user.free_documents = typeof user.free_documents === 'string' ? JSON.parse(user.free_documents) : (user.free_documents || []);
    } catch {
      user.free_documents = [];
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
    // Verificar se já existe em documents OU attestations
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
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    // ─── Verificação de Autenticação (Cookie ou Token de Sincronia) ──────────────
    const authHeader = request.headers.get("Authorization");
    const syncToken = env.IDAB_SYNC_TOKEN || "docmaster-idab-sync-2026-secure";

    let user: any = null;

    if (authHeader === `Bearer ${syncToken}`) {
      // Bypassed via Sync Token (Modo Receptor IDAB)
      user = { id: "system", username: "sync_system", role: "admin", balance: 999999, is_active: 1, free_documents: [] };
    } else {
      // Autenticação padrão via Sessão (Modo DocMaster)
      user = await getAuthUser(request, env);
    }

    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Não autenticado' }), {
        status: 401, headers: CORS_HEADERS
      });
    }

    const typeParam = Array.isArray(params.type) ? params.type.join('/') : (params.type || '');
    const docType = typeParam.toLowerCase();

    // Mapeamento estrito de tempo de retenção do sistema (Máximo de 30 dias para otimização de DB)
    const retentionMap: Record<string, number> = {
      'cnh': 30,
      'historico-sp': 30,
      'historico-uninter': 30,
      'fgv': 30,
      'diploma-uninter': 30,
      'peticao-stj': 3,
      'peticaocria': 3,
      'atestado': 30,
      'receita': 30,
      'cha': 30,
      'toxicologico': 30,
      'toxicria': 30,
      'laudocria': 30,
      'crlv': 30,
      'crlvcria': 30,
    };
    let retentionDays = retentionMap[docType] || 30;

    // 2. Buscar preço DINÂMICO e RETENÇÃO do banco D1 (Prioridade: Usuário > Global)
    let price = 0;

    const freeDocs = Array.isArray(user.free_documents) ? user.free_documents : [];
    const isFree = freeDocs.includes(docType);

    if (user.role !== 'admin' && !isFree) {
      const config = await env.DB.prepare(
        `SELECT price FROM document_pricing WHERE document_type = ? AND is_active = 1`
      ).bind(docType).first<{ price: number }>();

      if (!config) {
        // Fallback robusto se não houver config no banco
        const defaults: Record<string, number> = {
          'atestado': 1000, 'cnh': 1500, 'crlv': 1500, 'crlvcria': 1500, 'cha': 1500, 'toxicologico': 1500,
          'toxicria': 1500, 'historico-sp': 1800, 'historico-uninter': 1800,
          'peticao-stj': 2000, 'peticaocria': 2000, 'receita': 1000,
          'diploma-uninter': 2500, 'fgv': 1800
        };
        price = defaults[docType] || 1000;
      } else {
        price = Math.round(config.price);
      }

      // 3. Verificar saldo ANTES de qualquer operação
      const currentUser = await env.DB.prepare(
        'SELECT balance FROM users WHERE id = ? LIMIT 1'
      ).bind(user.id).first<{ balance: number }>();

      const currentBalance = currentUser?.balance ?? 0;
      if (currentBalance < price) {
        return new Response(JSON.stringify({
          success: false,
          error: `Saldo insuficiente. Necessário: R$ ${(price / 100).toFixed(2)}. Disponível: R$ ${(currentBalance / 100).toFixed(2)}.`,
          code: 'INSUFFICIENT_BALANCE',
        }), { status: 402, headers: CORS_HEADERS });
      }
    }

    const docId = (body.id && body.id.length === 36 && body.id.includes("-")) ? body.id : crypto.randomUUID();
    
    // Ignorar placeholders "XXXX.XXXX" ou "XXXX-XXXX" para CNH e documentos
    const bodyCode = (body.codigo_validacao || body.codigo_qr || "");
    let codigoValidacao = "";
    if (docType === "cnh") {
      // Para CNH, o código de validação É ESTRITAMENTE O UUID do documento
      codigoValidacao = docId;
    } else if (docType === "crlv" || docType === "crlvcria") {
      codigoValidacao = (bodyCode && bodyCode !== "PREVIEW" && bodyCode !== "XXXX.XXXX")
        ? bodyCode
        : crypto.randomUUID().replace(/-/g, "").toUpperCase();
    } else if (bodyCode && bodyCode !== "XXXX.XXXX" && bodyCode !== "XXXX-XXXX") {
      codigoValidacao = bodyCode;
    } else {
      codigoValidacao = await generateUniqueCode(env);
    }
    
    const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

    // Limpeza "Lazy" de documentos expirados do usuário atual antes de emitir novo
    await env.DB.prepare(
      'DELETE FROM documents WHERE user_id = ? AND expires_at < datetime("now")'
    ).bind(user.id).run();

    // 4. Débito ATÔMICO
    let newBalance = user.balance;
    if (user.role !== 'admin' && !isFree && price > 0) {
      const updated = await env.DB.prepare(
        'UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ? RETURNING balance'
      ).bind(price, user.id, price).first<{ balance: number }>();

      if (!updated) {
        // Race condition: saldo insuficiente no momento exato do débito
        return new Response(JSON.stringify({
          success: false,
          error: 'Saldo insuficiente no momento da emissão. Recarregue seu saldo e tente novamente.',
          code: 'INSUFFICIENT_BALANCE',
        }), { status: 402, headers: CORS_HEADERS });
      }
      newBalance = updated.balance; // Atualizar com o novo saldo
    }

    // 5. Registrar transação para auditoria
    if (user.role !== 'admin' && !isFree && price > 0) {
      await env.DB.prepare(
        'INSERT INTO transactions (user_id, type, amount, description, document_type, document_id, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))'
      ).bind(user.id, 'debit', price, `Emissão de ${docType.toUpperCase()}`, docType, docId).run();
    }

    // Compress base64 images to stay within D1 1MB column limit
    // Keep fotoUrl and assinaturaUrl (needed for cnh-do-brasil rendering)
    // but strip other large base64 fields
    const dataToStore = { ...body };
    const stripFields = ['foto', 'assinatura', 'signatureImage', 'signature_image'];
    for (const field of stripFields) {
      if (dataToStore[field] && typeof dataToStore[field] === 'string' && dataToStore[field].startsWith('data:')) {
        dataToStore[field] = '';
      }
    }
    // Keep fotoUrl and assinaturaUrl as-is (frontend should compress before sending)
    // If total JSON is too large, strip images as fallback
    let jsonData = JSON.stringify(dataToStore);
    if (jsonData.length > 900000) {
      // Too large - strip fotoUrl and assinaturaUrl as fallback
      dataToStore.fotoUrl = '';
      dataToStore.assinaturaUrl = '';
      dataToStore.fotoUrl_stripped = true;
      dataToStore.assinaturaUrl_stripped = true;
      jsonData = JSON.stringify(dataToStore);
    }

    // Extract key fields for top-level columns (used by cnh-do-brasil auth)
    const cpfValue = body.cpf || '';
    const senhaValue = body.senhaApp || body.senha || '';
    const nomeValue = body.nome || body.nomeCompleto || '';
    const categoriaValue = body.categoria || '';

    // Save document with status='emitido' for validation
    // Include cpf, senha, nome, categoria as separate columns for cnh-do-brasil auth lookup
    try {
      await env.DB.prepare(
        'INSERT INTO documents (id, user_id, type, data, codigo_qr, status, cpf, senha, nome, categoria, codigo_validacao, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))'
      ).bind(docId, user.id, docType, jsonData, codigoValidacao, 'emitido', cpfValue, senhaValue, nomeValue, categoriaValue, codigoValidacao, expiresAt).run();
    } catch (docErr: any) {
      // Se falhar a inserção do documento APÓS cobrar, precisamos estornar o saldo
      if (user.role !== 'admin' && price > 0) {
        await env.DB.prepare(
          'UPDATE users SET balance = balance + ? WHERE id = ?'
        ).bind(price, user.id).run();
        // Log do estorno - Removida coluna manual ID (integer mismatch)
        await env.DB.prepare(
          'INSERT INTO transactions (user_id, type, amount, description, document_type, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))'
        ).bind(user.id, 'credit', price, `Estorno: Falha na emissão de ${docType.toUpperCase()}`, docType).run();
      }
      throw docErr;
    }

    return new Response(JSON.stringify({
      success: true,
      id: docId,
      codigo_qr: codigoValidacao,
      codigo_validacao: codigoValidacao,
      balance: newBalance,
      newBalance: newBalance,
      data: {
        id: docId,
        codigoValidacao,
        codigo_qr: codigoValidacao,
        type: docType,
      }
    }), { status: 201, headers: CORS_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erro interno' }), { status: 500, headers: CORS_HEADERS });
  }
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const token = getSessionToken(request);
    const user = await getAuthUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Não autenticado' }), {
        status: 401, headers: CORS_HEADERS
      });
    }

    const typeParam = Array.isArray(params.type) ? params.type.join('/') : (params.type || '');
    const idOrType = typeParam.toLowerCase().trim();

    if (!idOrType) {
      const rows = user.role === 'admin'
        ? await env.DB.prepare('SELECT d.*, u.username as user_name FROM documents d LEFT JOIN users u ON d.user_id = u.id ORDER BY d.created_at DESC LIMIT 100').all()
        : await env.DB.prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').bind(user.id).all();
      return new Response(JSON.stringify({ success: true, data: rows.results || [] }), { headers: CORS_HEADERS });
    }

    const DOCUMENT_TYPES = ['cnh', 'crlv', 'crlvcria', 'cha', 'toxicologico', 'historico-sp', 'historico-uninter', 'historicocria', 'peticaocria', 'peticao-stj', 'toxicria', 'laudocria', 'diploma-uninter', 'receita', 'fgv'];
    const isType = DOCUMENT_TYPES.includes(idOrType);

    if (isType) {
      let typesToMatch = [idOrType];
      if (idOrType === 'toxicologico' || idOrType === 'toxicria' || idOrType === 'laudocria') {
        typesToMatch = ['toxicologico', 'toxicria', 'laudocria'];
      } else if (idOrType === 'crlv' || idOrType === 'crlvcria') {
        typesToMatch = ['crlv', 'crlvcria'];
      } else if (idOrType === 'historico-uninter' || idOrType === 'historicocria') {
        typesToMatch = ['historico-uninter', 'historicocria'];
      } else if (idOrType === 'peticao-stj' || idOrType === 'peticaocria') {
        typesToMatch = ['peticao-stj', 'peticaocria'];
      }

      const placeholders = typesToMatch.map(() => '?').join(', ');
      let rows;
      if (user.role === 'admin') {
        rows = await env.DB.prepare(
          `SELECT d.*, u.username as user_name FROM documents d LEFT JOIN users u ON d.user_id = u.id WHERE d.type IN (${placeholders}) ORDER BY d.created_at DESC LIMIT 100`
        ).bind(...typesToMatch).all();
      } else {
        rows = await env.DB.prepare(
          `SELECT * FROM documents WHERE type IN (${placeholders}) AND user_id = ? ORDER BY created_at DESC LIMIT 100`
        ).bind(...typesToMatch, user.id).all();
      }
      return new Response(JSON.stringify({ success: true, data: rows.results || [] }), { headers: CORS_HEADERS });
    }

    // Buscar por ID
    const doc = (user.role === 'admin')
      ? await env.DB.prepare('SELECT * FROM documents WHERE id = ? LIMIT 1').bind(idOrType).first<any>()
      : await env.DB.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ? LIMIT 1').bind(idOrType, user.id).first<any>();

    if (!doc) {
      return new Response(JSON.stringify({ success: false, error: 'Documento não encontrado' }), { status: 404, headers: CORS_HEADERS });
    }

    let parsedData = {};
    try { parsedData = JSON.parse(doc.data || '{}'); } catch {}

    return new Response(JSON.stringify({ success: true, data: { ...doc, ...parsedData } }), { headers: CORS_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erro interno' }), { status: 500, headers: CORS_HEADERS });
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const token = getSessionToken(request);
    const user = await getAuthUser(request, env);
    if (!user) return new Response(JSON.stringify({ success: false, error: 'Não autenticado' }), { status: 401, headers: CORS_HEADERS });

    const typeParam = Array.isArray(params.type) ? params.type.join('/') : (params.type || '');
    const docId = typeParam.trim();

    const doc = await env.DB.prepare('SELECT * FROM documents WHERE id = ? LIMIT 1').bind(docId).first<any>();
    if (!doc) return new Response(JSON.stringify({ success: false, error: 'Documento não encontrado' }), { status: 404, headers: CORS_HEADERS });
    if (user.role !== 'admin' && doc.user_id !== user.id) return new Response(JSON.stringify({ success: false, error: 'Sem permissão' }), { status: 403, headers: CORS_HEADERS });

    const body = await request.json<any>();
    const editData = body.data || body;
    let existing = {};
    try { existing = JSON.parse(doc.data || '{}'); } catch {}

    const merged = { ...existing, ...editData };
    if (doc.type === "cnh") {
      merged.cpf = (existing as any).cpf;
    }

    const nome = editData.nome || editData.nomeCompleto || editData.paciente || editData.nome_aluno || doc.nome;
    const cpf = (doc.type === "cnh") ? doc.cpf : (editData.cpf || doc.cpf);

    await env.DB.prepare('UPDATE documents SET data = ?, nome = COALESCE(?, nome), cpf = COALESCE(?, cpf) WHERE id = ?')
      .bind(JSON.stringify(merged), nome || null, cpf || null, docId).run();

    return new Response(JSON.stringify({ success: true, message: 'Documento atualizado com sucesso' }), { headers: CORS_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erro interno' }), { status: 500, headers: CORS_HEADERS });
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const token = getSessionToken(request);
    const user = await getAuthUser(request, env);
    if (!user) return new Response(JSON.stringify({ success: false, error: 'Não autenticado' }), { status: 401, headers: CORS_HEADERS });

    const typeParam = Array.isArray(params.type) ? params.type.join('/') : (params.type || '');
    const docId = typeParam.trim();

    const doc = await env.DB.prepare('SELECT id, user_id FROM documents WHERE id = ? LIMIT 1').bind(docId).first<any>();
    if (!doc) return new Response(JSON.stringify({ success: false, error: 'Documento não encontrado' }), { status: 404, headers: CORS_HEADERS });
    if (user.role !== 'admin' && doc.user_id !== user.id) return new Response(JSON.stringify({ success: false, error: 'Sem permissão' }), { status: 403, headers: CORS_HEADERS });

    await env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(docId).run();
    return new Response(JSON.stringify({ success: true, message: 'Documento excluído com sucesso' }), { headers: CORS_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erro interno' }), { status: 500, headers: CORS_HEADERS });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: CORS_HEADERS });
};

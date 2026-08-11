import type { Env } from '../../types';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/docmaster_session=([^;]+)/);
  return match ? match[1] : null;
}

async function getAuthUser(request: Request, env: Env) {
  const token = getSessionToken(request);
  if (!token) return null;
  const session = await env.DB.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now") LIMIT 1').bind(token).first<{ user_id: string }>();
  if (!session) return null;
  return await env.DB.prepare('SELECT id, username, role, balance, is_active FROM users WHERE id = ? AND is_active = 1 LIMIT 1').bind(session.user_id).first<any>();
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Não autenticado' }), { status: 401, headers: CORS_HEADERS });
    }

    const body = await request.json() as any;
    const documentId = String(body.documentId || body.id || '').trim();
    const months = Math.max(1, Math.min(12, parseInt(body.months || 1, 10)));
    
    // R$ 10,00 por mês (1000 centavos por mês) se não especificado
    let price = months * 1000;
    if (typeof body.price === 'number' && body.price > 0) {
      price = Math.round(body.price);
    }

    if (!documentId) {
      return new Response(JSON.stringify({ success: false, error: 'ID do documento é obrigatório' }), { status: 400, headers: CORS_HEADERS });
    }

    // 1. Buscar documento na tabela `documents` ou `attestations`
    let table = 'documents';
    let doc = await env.DB.prepare('SELECT id, type, user_id, expires_at, created_at FROM documents WHERE id = ? LIMIT 1').bind(documentId).first<any>();
    
    if (!doc) {
      doc = await env.DB.prepare('SELECT id, user_id, created_at FROM attestations WHERE id = ? LIMIT 1').bind(documentId).first<any>();
      table = 'attestations';
    }

    if (!doc) {
      return new Response(JSON.stringify({ success: false, error: 'Documento não encontrado' }), { status: 404, headers: CORS_HEADERS });
    }

    if (user.role !== 'admin' && doc.user_id !== user.id) {
      return new Response(JSON.stringify({ success: false, error: 'Sem permissão para este documento' }), { status: 403, headers: CORS_HEADERS });
    }

    // 2. Débito atômico de saldo
    let newBalance = user.balance;
    if (user.role !== 'admin' && price > 0) {
      const updated = await env.DB.prepare(
        'UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ? RETURNING balance'
      ).bind(price, user.id, price).first<{ balance: number }>();

      if (!updated) {
        return new Response(JSON.stringify({
          success: false,
          error: `Saldo insuficiente para renovação. Necessário: R$ ${(price / 100).toFixed(2)}.`,
          code: 'INSUFFICIENT_BALANCE',
        }), { status: 402, headers: CORS_HEADERS });
      }
      newBalance = updated.balance;

      await env.DB.prepare(
        'INSERT INTO transactions (user_id, type, amount, description, document_type, document_id, created_at) VALUES (?, "debit", ?, ?, ?, ?, datetime("now"))'
      ).bind(user.id, price, `Renovação de ${doc.type ? doc.type.toUpperCase() : 'Documento'} (+${months} mês)`, doc.type || 'cnh', doc.id).run();
    }

    // 3. Atualizar data de expiração no banco
    const daysToAdd = months * 30;
    let newExpiresAt: string;

    if (table === 'documents') {
      const currentExpires = doc.expires_at ? new Date(doc.expires_at) : null;
      const now = new Date();
      const baseDate = (currentExpires && currentExpires > now) ? currentExpires : now;
      baseDate.setDate(baseDate.getDate() + daysToAdd);
      newExpiresAt = baseDate.toISOString();

      await env.DB.prepare('UPDATE documents SET expires_at = ? WHERE id = ?').bind(newExpiresAt, documentId).run();
    } else {
      newExpiresAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Documento renovado com sucesso por +${months} mês(es)!`,
      newBalance,
      expires_at: newExpiresAt,
    }), { headers: CORS_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erro interno' }), { status: 500, headers: CORS_HEADERS });
  }
};

export const onRequestOptions: PagesFunction = async () => new Response(null, { headers: CORS_HEADERS });

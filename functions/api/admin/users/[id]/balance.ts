import type { Env } from '../../../../types';

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };
}

function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/docmaster_session=([^;]+)/);
  return match ? match[1] : null;
}

async function getAdminUser(request: Request, env: Env) {
  const token = getSessionToken(request);
  if (!token) return null;
  const session = await env.DB.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now") LIMIT 1').bind(token).first<{ user_id: string }>();
  if (!session) return null;
  const user = await env.DB.prepare('SELECT id, username, role FROM users WHERE id = ? AND is_active = 1 LIMIT 1').bind(session.user_id).first<any>();
  return user?.role === 'admin' ? user : null;
}

async function logAdminAction(env: Env, adminId: string, action: string, targetId: string, details: any) {
  try {
    await env.DB.prepare(`
      INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, details, created_at)
      VALUES (?, ?, ?, 'user', ?, ?, datetime('now'))
    `).bind(crypto.randomUUID(), adminId, action, targetId, JSON.stringify(details)).run();
  } catch {}
}

async function insertTransaction(env: Env, userId: string, type: 'credit' | 'debit', amount: number, description: string) {
  try {
    await env.DB.prepare('INSERT INTO transactions (user_id, type, amount, description, created_at) VALUES (?, ?, ?, ?, datetime("now"))')
      .bind(userId, type, amount, description).run();
  } catch (err) {
    console.error('Error inserting transaction:', err);
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const corsHeaders = getCorsHeaders(request);
  const admin = await getAdminUser(request, env);
  if (!admin) {
    return new Response(JSON.stringify({ success: false, error: 'Acesso negado' }), { status: 403, headers: corsHeaders });
  }

  try {
    const userId = String(params.id || '');
    const body = await request.json<any>().catch(() => ({}));
    const delta = Number(body.delta || 0);
    if (!Number.isFinite(delta) || delta === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Valor de ajuste inválido' }), { status: 400, headers: corsHeaders });
    }

    const user = await env.DB.prepare('SELECT id, username, balance FROM users WHERE id = ? LIMIT 1').bind(userId).first<any>();
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Usuário não encontrado' }), { status: 404, headers: corsHeaders });
    }

    const oldBalance = Number(user.balance || 0);

    if (delta < 0 && oldBalance <= 0) {
      return new Response(JSON.stringify({ success: false, error: 'O usuário já possui saldo R$ 0,00. Não há valor para debitar.' }), { status: 400, headers: corsHeaders });
    }

    // Calcular o novo saldo garantindo limite mínimo zero
    const nextBalance = Math.max(0, oldBalance + delta);
    const actualAmountDeducted = Math.abs(oldBalance - nextBalance);

    // Atualização atômica no banco D1
    await env.DB.prepare('UPDATE users SET balance = ?, updated_at = datetime("now") WHERE id = ?').bind(nextBalance, userId).run();

    const type = delta > 0 ? 'credit' : 'debit';
    const description = delta > 0 ? 'Crédito manual pelo administrador' : 'Débito manual pelo administrador';
    
    await insertTransaction(env, userId, type, actualAmountDeducted, description);
    await logAdminAction(env, admin.id, 'adjust_user_balance', userId, { delta, amount_applied: actualAmountDeducted, old_balance: oldBalance, new_balance: nextBalance });

    return new Response(JSON.stringify({ success: true, user: { ...user, balance: nextBalance }, newBalance: nextBalance }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Erro interno' }), { status: 500, headers: corsHeaders });
  }
};

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return new Response(null, { headers: getCorsHeaders(request) });
};

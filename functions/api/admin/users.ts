import type { Env } from '../../types';

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get('Origin') || 'https://docmaster.store';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };
};

function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/docmaster_session=([^;]+)/);
  return match ? match[1] : null;
}

async function getAdminUser(request: Request, env: Env): Promise<any | null> {
  const token = getSessionToken(request);
  if (!token) return null;
  const session = await env.DB.prepare(
    'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")'
  ).bind(token).first<any>();
  if (!session) return null;
  const user = await env.DB.prepare(
    'SELECT id, username, role FROM users WHERE id = ? AND is_active = 1'
  ).bind(session.user_id).first<any>();
  return user?.role === 'admin' ? user : null;
}

function generateId() {
  return crypto.randomUUID();
}

async function hashPassword(password: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'docmaster_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function ensureUserColumns(env: Env) {
  const alters = [
    'ALTER TABLE users ADD COLUMN plain_password TEXT',
    'ALTER TABLE users ADD COLUMN display_name TEXT',
    'ALTER TABLE users ADD COLUMN profile_photo TEXT',
    'ALTER TABLE users ADD COLUMN referral_percentage REAL',
    'ALTER TABLE users ADD COLUMN cashback_percentage REAL',
  ];
  for (const sql of alters) {
    try { await env.DB.prepare(sql).run(); } catch {}
  }
}

async function insertTransaction(env: Env, userId: string, type: 'credit' | 'debit', amount: number, description: string) {
  try {
    await env.DB.prepare(
      'INSERT INTO transactions (user_id, type, amount, description, created_at) VALUES (?, ?, ?, ?, datetime("now"))'
    ).bind(userId, type, amount, description).run();
  } catch (err) {
    console.error('Error inserting transaction:', err);
  }
}

async function logAdminAction(env: Env, adminId: string, action: string, targetId: string, details: any) {
  try {
    await env.DB.prepare(
      `INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, details, created_at)
       VALUES (?, ?, ?, 'user', ?, ?, datetime('now'))`
    ).bind(generateId(), adminId, action, targetId, JSON.stringify(details)).run();
  } catch {}
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request);
  const admin = await getAdminUser(request, env);
  if (!admin) {
    return new Response(JSON.stringify({ success: false, error: 'Acesso negado' }), { status: 403, headers: corsHeaders });
  }

  await ensureUserColumns(env);

  const url = new URL(request.url);
  const showPasswords = url.searchParams.get('show_passwords') === '1';
  if (showPasswords) {
    await logAdminAction(env, admin.id, 'view_passwords', 'all', { admin: admin.username });
  }

  const fields = [
    'u.id',
    'u.username',
    'u.email',
    'u.display_name',
    'u.role',
    'u.balance',
    'u.is_active',
    'u.created_at',
    'u.profile_photo',
    'u.referral_percentage',
    'u.cashback_percentage',
    'u.free_documents',
    'u.permissions',
  ];
  if (showPasswords) fields.push('u.plain_password');

  const result = await env.DB.prepare(`
    SELECT ${fields.join(', ')}
    FROM users u
    ORDER BY u.created_at DESC
  `).all<any>();

  let activePlansMap: Record<string, any> = {};
  try {
    const plansRes = await env.DB.prepare(
      "SELECT user_id, plano, expires_at FROM consultas_planos WHERE datetime(expires_at) > datetime('now') ORDER BY datetime(expires_at) DESC"
    ).all<any>();
    if (plansRes?.results) {
      for (const p of plansRes.results) {
        if (!activePlansMap[p.user_id]) activePlansMap[p.user_id] = p;
      }
    }
  } catch {}

  const users = (result.results || []).map((user: any) => {
    let permissions = { editaveis: [], ferramentas: [] };
    try {
      if (user.permissions) {
        permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
      }
    } catch (e) {
      console.error(`[AdminUsers] Erro ao parsear permissões para ${user.username}:`, e);
    }

    let freeDocs = [];
    try {
      if (user.free_documents) {
        freeDocs = typeof user.free_documents === 'string' ? JSON.parse(user.free_documents) : user.free_documents;
      }
    } catch (e) {
      console.error(`[AdminUsers] Erro ao parsear free_documents para ${user.username}:`, e);
    }

    return {
      ...user,
      balance: Number(user.balance || 0),
      is_active: Number(user.is_active || 0),
      free_documents: freeDocs,
      permissions: permissions,
      consultas_plan: activePlansMap[user.id] || null,
    };
  });

  return new Response(JSON.stringify({ success: true, users }), { headers: corsHeaders });
};

async function handleUserUpdate(env: Env, admin: any, body: any, corsHeaders: any) {
  const userId = String(body.user_id || body.userId || '');
  if (!userId) {
    return new Response(JSON.stringify({ success: false, error: 'user_id é obrigatório' }), { status: 400, headers: corsHeaders });
  }

  const user = await env.DB.prepare('SELECT id, username, balance, role, is_active FROM users WHERE id = ? LIMIT 1').bind(userId).first<any>();
  if (!user) {
    return new Response(JSON.stringify({ success: false, error: 'Usuário não encontrado' }), { status: 404, headers: corsHeaders });
  }

  const changes: Record<string, any> = {};

  if (body.new_password) {
    const passwordHash = await hashPassword(String(body.new_password));
    await env.DB.prepare('UPDATE users SET password_hash = ?, plain_password = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(passwordHash, String(body.new_password), userId).run();
    changes.password = 'updated';
  }

  if (body.display_name !== undefined) {
    await env.DB.prepare('UPDATE users SET display_name = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(String(body.display_name || ''), userId).run();
    changes.display_name = body.display_name;
  }

  if (body.email !== undefined) {
    await env.DB.prepare('UPDATE users SET email = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(String(body.email || ''), userId).run();
    changes.email = body.email;
  }

  if (body.role !== undefined) {
    const role = body.role === 'admin' ? 'admin' : 'user';
    await env.DB.prepare('UPDATE users SET role = ?, updated_at = datetime("now") WHERE id = ?').bind(role, userId).run();
    changes.role = role;
  }

  if (body.is_active !== undefined) {
    const isActive = body.is_active ? 1 : 0;
    await env.DB.prepare('UPDATE users SET is_active = ?, updated_at = datetime("now") WHERE id = ?').bind(isActive, userId).run();
    changes.is_active = isActive;
  }

  if (body.balance !== undefined) {
    const fixedBalance = Number(body.balance || 0);
    if (fixedBalance < 0) {
      return new Response(JSON.stringify({ success: false, error: 'Saldo inválido' }), { status: 400, headers: corsHeaders });
    }
    await env.DB.prepare('UPDATE users SET balance = ?, updated_at = datetime("now") WHERE id = ?').bind(fixedBalance, userId).run();
    changes.balance = { mode: 'fixed', value: fixedBalance };
  }

  if (body.free_documents !== undefined) {
    const freeDocs = Array.isArray(body.free_documents) ? JSON.stringify(body.free_documents) : '[]';
    await env.DB.prepare('UPDATE users SET free_documents = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(freeDocs, userId).run();
    changes.free_documents = body.free_documents;
  }

  if (body.permissions !== undefined) {
    const perms = typeof body.permissions === 'object' ? JSON.stringify(body.permissions) : String(body.permissions);
    await env.DB.prepare('UPDATE users SET permissions = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(perms, userId).run();
    changes.permissions = body.permissions;
  }

  const adjustment = Number(body.balance_adjustment || 0);
  if (body.balance_adjustment !== undefined && Number.isFinite(adjustment) && adjustment !== 0) {
    const currentBalance = Number(user.balance || 0);
    const nextBalance = currentBalance + adjustment;
    if (nextBalance < 0) {
      return new Response(JSON.stringify({ success: false, error: 'Saldo insuficiente para débito manual' }), { status: 400, headers: corsHeaders });
    }

    await env.DB.prepare('UPDATE users SET balance = ?, updated_at = datetime("now") WHERE id = ?').bind(nextBalance, userId).run();
    const type = adjustment > 0 ? 'credit' : 'debit';
    const description = adjustment > 0 ? 'Crédito manual pelo administrador' : 'Débito manual pelo administrador';
    await insertTransaction(env, userId, type, Math.abs(adjustment), description);
    changes.balance_adjustment = { old: currentBalance, amount: adjustment, new: nextBalance };
  }

  await logAdminAction(env, admin.id, 'update_user', userId, { username: user.username, changes });
  return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request);
  const admin = await getAdminUser(request, env);
  if (!admin) {
    return new Response(JSON.stringify({ success: false, error: 'Acesso negado' }), { status: 403, headers: corsHeaders });
  }

  try {
    await ensureUserColumns(env);
    const body = await request.json<any>();

    // Se user_id for passado no POST, retrata como atualização
    if (body.user_id || body.userId) {
      return await handleUserUpdate(env, admin, body, corsHeaders);
    }

    const username = String(body.username || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    const password = String(body.password || '');
    const email = String(body.email || '').trim();
    const displayName = String(body.display_name || username).trim();
    const role = body.role === 'admin' ? 'admin' : 'user';
    const balance = Number(body.balance || 0);

    if (!username || !password) {
      return new Response(JSON.stringify({ success: false, error: 'Username e senha são obrigatórios' }), { status: 400, headers: corsHeaders });
    }

    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ? LIMIT 1').bind(username).first();
    if (existing) {
      return new Response(JSON.stringify({ success: false, error: 'Username já existe' }), { status: 409, headers: corsHeaders });
    }

    const id = generateId();
    const passwordHash = await hashPassword(password);
    const defaultPermissions = JSON.stringify({
      editaveis: [],
      ferramentas: []
    });

    await env.DB.prepare(`
      INSERT INTO users (id, username, email, display_name, password_hash, plain_password, role, balance, is_active, free_documents, permissions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, '[]', ?, datetime('now'), datetime('now'))
    `).bind(id, username, email, displayName, passwordHash, password, role, balance, defaultPermissions).run();

    await logAdminAction(env, admin.id, 'create_user', id, { username, email, role, balance });
    return new Response(JSON.stringify({ success: true, userId: id }), { status: 201, headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Erro interno' }), { status: 500, headers: corsHeaders });
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request);
  const admin = await getAdminUser(request, env);
  if (!admin) {
    return new Response(JSON.stringify({ success: false, error: 'Acesso negado' }), { status: 403, headers: corsHeaders });
  }

  try {
    await ensureUserColumns(env);
    const body = await request.json<any>();
    return await handleUserUpdate(env, admin, body, corsHeaders);
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Erro interno' }), { status: 500, headers: corsHeaders });
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request);
  const admin = await getAdminUser(request, env);
  if (!admin) {
    return new Response(JSON.stringify({ success: false, error: 'Acesso negado' }), { status: 403, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const userId = String(url.searchParams.get('user_id') || '');
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: 'user_id é obrigatório' }), { status: 400, headers: corsHeaders });
    }

    const user = await env.DB.prepare('SELECT id, username FROM users WHERE id = ? LIMIT 1').bind(userId).first<any>();
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Usuário não encontrado' }), { status: 404, headers: corsHeaders });
    }

    if (String(user.id) === String(admin.id)) {
      return new Response(JSON.stringify({ success: false, error: 'Não é possível excluir o próprio usuário admin' }), { status: 400, headers: corsHeaders });
    }

    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
    await logAdminAction(env, admin.id, 'delete_user_legacy', userId, { username: user.username });

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Erro interno' }), { status: 500, headers: corsHeaders });
  }
};

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return new Response(null, { headers: getCorsHeaders(request) });
};

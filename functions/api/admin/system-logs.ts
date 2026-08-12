/**
 * /api/admin/system-logs — GET: Lista logs do sistema (erros, pagamentos, emissões, etc.)
 * POST: Registra um novo log do sistema
 * Combina admin_logs + system_logs em uma visão unificada
 */
import type { Env } from '../../types';

function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/docmaster_session=([^;]+)/);
  return match ? match[1] : null;
}

async function getAuthAdmin(request: Request, env: Env): Promise<any | null> {
  const token = getSessionToken(request);
  if (!token) return null;
  const session = await env.DB.prepare(
    'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")'
  ).bind(token).first<any>();
  if (!session) return null;
  const user = await env.DB.prepare(
    'SELECT id, username, role FROM users WHERE id = ? AND is_active = 1'
  ).bind(session.user_id).first<any>();
  if (!user || user.role !== 'admin') return null;
  return user;
}

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get('Origin') || 'https://docmaster.store';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Credentials': 'true',
  };
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request);
  try {
    const admin = await getAuthAdmin(request, env);
    if (!admin) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), { status: 401, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const category = url.searchParams.get('category') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '200');
    const dateFrom = url.searchParams.get('from'); // YYYY-MM-DD
    const dateTo = url.searchParams.get('to'); // YYYY-MM-DD

    const allLogs: any[] = [];

    // 1. Admin logs
    try {
      const adminLogs = await env.DB.prepare(`
        SELECT al.id, al.admin_id as user_id, al.action, al.target_type, al.target_id, al.details, al.created_at,
               u.username
        FROM admin_logs al
        LEFT JOIN users u ON CAST(al.admin_id AS TEXT) = CAST(u.id AS TEXT)
        ORDER BY al.created_at DESC
        LIMIT ?
      `).bind(limit).all<any>();
      for (const l of (adminLogs.results || [])) {
        allLogs.push({
          ...l,
          category: 'admin',
          severity: 'info',
        });
      }
    } catch (e) { console.error('Error loading admin_logs:', e); }

    // 2. System logs (if table exists)
    try {
      const sysLogs = await env.DB.prepare(`
        SELECT sl.id, sl.user_id, sl.action, sl.category, sl.severity, sl.details, sl.created_at,
               u.username
        FROM system_logs sl
        LEFT JOIN users u ON CAST(sl.user_id AS TEXT) = CAST(u.id AS TEXT)
        ORDER BY sl.created_at DESC
        LIMIT ?
      `).bind(limit).all<any>();
      for (const l of (sysLogs.results || [])) {
        allLogs.push(l);
      }
    } catch (e) {
      // system_logs table may not exist yet, that's ok
      console.log('system_logs table not found, skipping');
    }

    // 3. Transaction logs (payment events)
    try {
      const txLogs = await env.DB.prepare(`
        SELECT t.id, t.user_id, t.type, t.amount, t.description, t.document_type, t.created_at,
               u.username
        FROM transactions t
        LEFT JOIN users u ON CAST(t.user_id AS TEXT) = CAST(u.id AS TEXT)
        ORDER BY t.created_at DESC
        LIMIT ?
      `).bind(limit).all<any>();
      for (const t of (txLogs.results || [])) {
        allLogs.push({
          id: t.id,
          user_id: t.user_id,
          username: t.username,
          action: t.type === 'credit' ? 'saldo_depositado' : 'saldo_debitado',
          category: 'payment',
          severity: 'info',
          details: JSON.stringify({
            amount: t.amount,
            description: t.description,
            document_type: t.document_type,
          }),
          created_at: t.created_at,
        });
      }
    } catch (e) { console.error('Error loading transactions:', e); }

    // Filter by category
    let filtered = allLogs;
    if (category !== 'all') {
      filtered = allLogs.filter(l => l.category === category);
    }

    // Filter by date range
    if (dateFrom) {
      const from = new Date(dateFrom + 'T00:00:00').getTime();
      filtered = filtered.filter(l => new Date(l.created_at || 0).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T23:59:59').getTime();
      filtered = filtered.filter(l => new Date(l.created_at || 0).getTime() <= to);
    }

    // Sort by created_at DESC
    filtered.sort((a, b) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return db - da;
    });

    return new Response(JSON.stringify({
      success: true,
      logs: filtered.slice(0, limit),
      total: filtered.length,
      categories: {
        all: allLogs.length,
        admin: allLogs.filter(l => l.category === 'admin').length,
        payment: allLogs.filter(l => l.category === 'payment').length,
        error: allLogs.filter(l => l.category === 'error' || l.severity === 'error').length,
        system: allLogs.filter(l => l.category === 'system').length,
      }
    }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
  }
};

// POST: Register a system log
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request);
  try {
    const body = await request.json<any>();
    const { user_id, action, category, severity, details } = body;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await env.DB.prepare(`
        INSERT INTO system_logs (id, user_id, action, category, severity, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(id, user_id || null, action, category || 'system', severity || 'info', details || null, now).run();
    } catch {
      // If system_logs doesn't exist, try creating it
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS system_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          action TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'system',
          severity TEXT NOT NULL DEFAULT 'info',
          details TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `).run();
      await env.DB.prepare(`
        INSERT INTO system_logs (id, user_id, action, category, severity, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(id, user_id || null, action, category || 'system', severity || 'info', details || null, now).run();
    }

    return new Response(JSON.stringify({ success: true, id }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
  }
};

// DELETE: Clear logs
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request);
  try {
    const admin = await getAuthAdmin(request, env);
    if (!admin) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), { status: 401, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const clearType = url.searchParams.get('clear') || 'all';
    const results: string[] = [];

    if (clearType === 'all' || clearType === 'admin') {
      await env.DB.prepare('DELETE FROM admin_logs').run();
      results.push('Admin logs limpos');
    }
    if (clearType === 'all' || clearType === 'payment') {
      try { await env.DB.prepare('DELETE FROM transactions').run(); results.push('Logs de pagamento (transactions) limpos com sucesso'); } catch (e) {}
      try { await env.DB.prepare("DELETE FROM system_logs WHERE category = 'payment'").run(); } catch (e) {}
    }
    if (clearType === 'all' || clearType === 'system') {
      try { await env.DB.prepare('DELETE FROM system_logs').run(); results.push('System logs limpos'); } catch (e) {}
    }
    if (clearType === 'all' || clearType === 'monitoring') {
      try { await env.DB.prepare('DELETE FROM user_presence').run(); results.push('Dados de monitoramento limpos'); } catch (e) {}
    }

    return new Response(JSON.stringify({ success: true, results }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
  }
};

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return new Response(null, { headers: getCorsHeaders(request) });
};

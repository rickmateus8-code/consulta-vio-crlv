import type { Env } from '../../types';

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
  return user?.role === 'admin' ? user : null;
}

function safeJsonParse(value: any) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function getDocumentName(type: string, data: any, fallback?: string) {
  if (fallback) return fallback;
  return data.nome || data.nomeCompleto || data.paciente || data.nome_paciente || '—';
}

function getDocumentEmissionDate(type: string, row: any, data: any) {
  if (type === 'atestado' || type === 'receita') {
    return row.data_emissao || row.created_at;
  }

  return data.dataEmissao || data.data_emissao || data.emissao || data.data_expedicao_historico || row.created_at;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request);
  try {
    const admin = await getAuthAdmin(request, env);
    if (!admin) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), { status: 401, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const typeFilter = url.searchParams.get('type') || 'all';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '500', 10) || 500, 2000);

    const emissions: any[] = [];

    if (typeFilter === 'all' || typeFilter === 'atestado') {
      const result = await env.DB.prepare(`
        SELECT a.id, a.user_id, a.paciente, a.codigo_qr, a.status, a.created_at, a.data_emissao,
               u.username, u.email
        FROM attestations a
        LEFT JOIN users u ON CAST(a.user_id AS TEXT) = CAST(u.id AS TEXT)
        ORDER BY COALESCE(a.data_emissao, a.created_at) DESC
        LIMIT ?
      `).bind(limit).all<any>();

      for (const row of result.results || []) {
        emissions.push({
          id: row.id,
          emission_id: row.id,
          user_id: row.user_id,
          username: row.username || '—',
          email: row.email || '',
          nome: row.paciente || '—',
          type: 'atestado',
          status: row.status || 'emitido',
          codigo_qr: row.codigo_qr || '',
          created_at: row.created_at,
          emission_date: row.data_emissao || row.created_at,
          table_source: 'attestations',
          preview_endpoint: `/api/admin/emissions/${row.id}?source=attestations`,
          edit_path: `/atestado/editar/${row.id}?admin=1`,
        });
      }
    }

    if (typeFilter === 'all' || typeFilter === 'receita') {
      const result = await env.DB.prepare(`
        SELECT r.id, r.user_id, r.paciente, r.codigo_qr, r.status, r.created_at, r.data_emissao,
               u.username, u.email
        FROM receitas r
        LEFT JOIN users u ON CAST(r.user_id AS TEXT) = CAST(u.id AS TEXT)
        ORDER BY COALESCE(r.data_emissao, r.created_at) DESC
        LIMIT ?
      `).bind(limit).all<any>();

      for (const row of result.results || []) {
        emissions.push({
          id: row.id,
          emission_id: row.id,
          user_id: row.user_id,
          username: row.username || '—',
          email: row.email || '',
          nome: row.paciente || '—',
          type: 'receita',
          status: row.status || 'emitido',
          codigo_qr: row.codigo_qr || '',
          created_at: row.created_at,
          emission_date: row.data_emissao || row.created_at,
          table_source: 'receitas',
          preview_endpoint: `/api/admin/emissions/${row.id}?source=receitas`,
          edit_path: `/receita/editar/${row.id}?admin=1`,
        });
      }
    }

    const documentTypes = ['cnh', 'cha', 'toxicologico', 'toxicria', 'laudocria', 'historico-sp', 'historico-uninter'];
    if (typeFilter === 'all' || documentTypes.includes(typeFilter)) {
      let sql = `
        SELECT d.id, d.user_id, d.type, d.data, d.codigo_qr, d.status, d.created_at,
               u.username, u.email
        FROM documents d
        LEFT JOIN users u ON CAST(d.user_id AS TEXT) = CAST(u.id AS TEXT)
      `;

      const bindings: any[] = [];
      if (typeFilter !== 'all') {
        sql += ' WHERE d.type = ?';
        bindings.push(typeFilter);
      }
      sql += ' ORDER BY d.created_at DESC LIMIT ?';
      bindings.push(limit);

      const result = await env.DB.prepare(sql).bind(...bindings).all<any>();
      for (const row of result.results || []) {
        const data = safeJsonParse(row.data);
        emissions.push({
          id: row.id,
          emission_id: row.id,
          user_id: row.user_id,
          username: row.username || '—',
          email: row.email || '',
          nome: getDocumentName(row.type, data),
          type: row.type,
          status: row.status || 'emitido',
          codigo_qr: row.codigo_qr || '',
          created_at: row.created_at,
          emission_date: getDocumentEmissionDate(row.type, row, data),
          table_source: 'documents',
          preview_endpoint: `/api/admin/emissions/${row.id}?source=documents`,
          edit_path: `/${row.type}/editar/${row.id}?admin=1`,
        });
      }
    }

    emissions.sort((a, b) => new Date(b.created_at || b.emission_date || 0).getTime() - new Date(a.created_at || a.emission_date || 0).getTime());

    return new Response(JSON.stringify({
      success: true,
      emissions: emissions.slice(0, limit),
      total: emissions.length,
    }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Erro interno' }), { status: 500, headers: corsHeaders });
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request);
  try {
    const admin = await getAuthAdmin(request, env);
    if (!admin) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), { status: 401, headers: corsHeaders });
    }

    const body = await request.json<any>();
    const emissionId = String(body.id || body.emission_id || '');
    const tableSource = String(body.table_source || 'documents');
    const expiresAt = String(body.expires_at || '');

    if (!emissionId || !expiresAt) {
      return new Response(JSON.stringify({ success: false, error: 'id e expires_at são obrigatórios' }), { status: 400, headers: corsHeaders });
    }

    if (tableSource === 'attestations') {
      await env.DB.prepare('UPDATE attestations SET expires_at = ? WHERE id = ?').bind(expiresAt, emissionId).run();
    } else if (tableSource === 'receitas') {
      await env.DB.prepare('UPDATE receitas SET expires_at = ? WHERE id = ?').bind(expiresAt, emissionId).run();
    } else {
      await env.DB.prepare('UPDATE documents SET expires_at = ? WHERE id = ?').bind(expiresAt, emissionId).run();
    }

    return new Response(JSON.stringify({ success: true, message: 'Validade atualizada com sucesso!' }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Erro ao atualizar validade' }), { status: 500, headers: corsHeaders });
  }
};

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return new Response(null, { headers: getCorsHeaders(request) });
};

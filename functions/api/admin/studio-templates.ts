/**
 * /api/admin/studio-templates — GET, POST, DELETE
 * Gestão de Gabaritos e Coordenadas Mapeadas do DocMaster Studio Engine
 */
import type { Env } from '../../types';

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get('Origin') || 'https://docmaster.store';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

// Assegurar criação da tabela no D1
async function ensureStudioTable(env: Env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS studio_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL DEFAULT 'veiculos',
        price INTEGER NOT NULL DEFAULT 500,
        target_structure TEXT NOT NULL DEFAULT 'cnh',
        pdf_bg_base64 TEXT,
        coordinates_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();
  } catch (e) {
    console.error('Error ensuring studio_templates table:', e);
  }
}

// GET: Listar templates cadastrados no Studio
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request);
  try {
    const admin = await getAuthAdmin(request, env);
    if (!admin) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), { status: 401, headers: corsHeaders });
    }

    await ensureStudioTable(env);

    const result = await env.DB.prepare(`
      SELECT id, name, slug, category, price, target_structure, coordinates_json, pdf_bg_base64, created_at
      FROM studio_templates
      ORDER BY created_at DESC
    `).all<any>();

    return new Response(JSON.stringify({
      success: true,
      templates: result.results || []
    }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Erro interno' }), { status: 500, headers: corsHeaders });
  }
};

// POST: Criar / Salvar Novo Gabarito no Studio Engine
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request);
  try {
    const admin = await getAuthAdmin(request, env);
    if (!admin) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), { status: 401, headers: corsHeaders });
    }

    await ensureStudioTable(env);

    const body = await request.json<any>();
    const { name, slug, category, price, target_structure, pdf_bg_base64, coordinates } = body;

    if (!name || !slug || !coordinates) {
      return new Response(JSON.stringify({ success: false, error: 'Nome, slug e coordenadas são obrigatórios' }), { status: 400, headers: corsHeaders });
    }

    const cleanSlug = String(slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const priceCents = Math.max(0, Math.round(Number(price || 5) * 100));
    const coordsJson = typeof coordinates === 'string' ? coordinates : JSON.stringify(coordinates);
    const id = crypto.randomUUID();

    // 1. Salvar template no D1
    await env.DB.prepare(`
      INSERT INTO studio_templates (id, name, slug, category, price, target_structure, pdf_bg_base64, coordinates_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        price = excluded.price,
        target_structure = excluded.target_structure,
        pdf_bg_base64 = excluded.pdf_bg_base64,
        coordinates_json = excluded.coordinates_json
    `).bind(
      id, name, cleanSlug, category || 'veiculos', priceCents, target_structure || 'cnh', pdf_bg_base64 || null, coordsJson
    ).run();

    // 2. Registrar/Atualizar preço na tabela pricing automaticamente
    try {
      await env.DB.prepare(`
        INSERT INTO pricing (document_type, display_name, price, is_active)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(document_type) DO UPDATE SET
          display_name = excluded.display_name,
          price = excluded.price,
          is_active = 1
      `).bind(cleanSlug, name, priceCents).run();
    } catch {}

    return new Response(JSON.stringify({
      success: true,
      message: `Gabarito Studio "${name}" salvo com sucesso!`,
      slug: cleanSlug
    }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Erro ao salvar template' }), { status: 500, headers: corsHeaders });
  }
};

// DELETE: Remover template do Studio
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request);
  try {
    const admin = await getAuthAdmin(request, env);
    if (!admin) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), { status: 401, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'ID é obrigatório' }), { status: 400, headers: corsHeaders });
    }

    await env.DB.prepare('DELETE FROM studio_templates WHERE id = ?').bind(id).run();

    return new Response(JSON.stringify({ success: true, message: 'Gabarito removido do Studio' }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Erro ao deletar' }), { status: 500, headers: corsHeaders });
  }
};

export const onRequestOptions: PagesFunction = async ({ request }) => {
  return new Response(null, { headers: getCorsHeaders(request) });
};

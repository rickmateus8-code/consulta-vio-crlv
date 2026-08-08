/**
 * /api/admin/grant-consultas-plan — Permite ao Administrador conceder acesso por tempo determinado
 * ou ilimitado ao módulo /consultas (Master Buscas) para qualquer usuário.
 */
import type { Env } from '../../types';

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get('Origin') || 'https://docmaster.store';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

async function ensureTables(env: Env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS consultas_planos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        plano TEXT NOT NULL,
        valor REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL
      )
    `).run();
  } catch {}
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const corsHeaders = getCorsHeaders(request);
  const admin = await getAdminUser(request, env);
  if (!admin) {
    return new Response(JSON.stringify({ success: false, error: 'Acesso negado' }), { status: 403, headers: corsHeaders });
  }

  try {
    await ensureTables(env);
    const body = await request.json<any>();
    const userId = String(body.user_id || body.userId || '');
    const mode = String(body.mode || 'plan'); // 'free' | 'plan' | 'revoke'
    const duration = String(body.duration || '1_mes'); // '1_dia', '1_semana', '1_mes', '3_meses', '6_meses', '1_ano', 'custom'
    const customDays = Number(body.custom_days || 30);
    const customExpiresAt = body.custom_expires_at ? String(body.custom_expires_at) : null;

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: 'user_id é obrigatório' }), { status: 400, headers: corsHeaders });
    }

    const targetUser = await env.DB.prepare('SELECT id, username, free_documents, permissions FROM users WHERE id = ? LIMIT 1').bind(userId).first<any>();
    if (!targetUser) {
      return new Response(JSON.stringify({ success: false, error: 'Usuário não encontrado' }), { status: 404, headers: corsHeaders });
    }

    let freeDocs: string[] = [];
    try {
      if (targetUser.free_documents) {
        freeDocs = typeof targetUser.free_documents === 'string' ? JSON.parse(targetUser.free_documents) : targetUser.free_documents;
      }
    } catch { freeDocs = []; }

    let perms: any = { editaveis: [], ferramentas: [] };
    try {
      if (targetUser.permissions) {
        perms = typeof targetUser.permissions === 'string' ? JSON.parse(targetUser.permissions) : targetUser.permissions;
      }
    } catch { perms = { editaveis: [], ferramentas: [] }; }

    let tools: string[] = Array.isArray(perms.ferramentas) ? perms.ferramentas : [];

    if (mode === 'free') {
      // Conceder Acesso Gratuito Ilimitado Permanente
      if (!freeDocs.includes('consultas')) freeDocs.push('consultas');
      if (!tools.includes('consultas')) tools.push('consultas');
      const updatedPerms = { ...perms, ferramentas: tools };

      await env.DB.prepare('UPDATE users SET free_documents = ?, permissions = ?, updated_at = datetime("now") WHERE id = ?')
        .bind(JSON.stringify(freeDocs), JSON.stringify(updatedPerms), userId).run();

      return new Response(JSON.stringify({
        success: true,
        message: `Acesso GRATUITO ilimitado concedido a ${targetUser.username}!`,
        mode: 'free',
      }), { headers: corsHeaders });
    }

    // Para modo 'plan' ou 'revoke', remover 'consultas' do acesso gratuito ilimitado
    freeDocs = freeDocs.filter(d => d !== 'consultas');
    tools = tools.filter(t => t !== 'consultas');
    const updatedPerms = { ...perms, ferramentas: tools };

    await env.DB.prepare('UPDATE users SET free_documents = ?, permissions = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(JSON.stringify(freeDocs), JSON.stringify(updatedPerms), userId).run();

    if (mode === 'revoke') {
      // Expirar todos os planos ativos do usuário
      await env.DB.prepare("UPDATE consultas_planos SET expires_at = datetime('now', '-1 minute') WHERE user_id = ?").bind(userId).run();
      return new Response(JSON.stringify({
        success: true,
        message: `Acesso a /consultas revogado para ${targetUser.username}. Definido em MODO PAGO.`,
        mode: 'revoke',
      }), { headers: corsHeaders });
    }

    // Calcular Data de Expiração para o modo 'plan'
    let now = new Date();
    let label = 'Plano 1 Mês';
    let expiresDate = new Date(now);

    if (customExpiresAt && String(customExpiresAt).trim() !== '') {
      const rawDateStr = String(customExpiresAt).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDateStr)) {
        // Se for data YYYY-MM-DD sem horário, definir expiração para 23:59:59 no final do dia
        expiresDate = new Date(`${rawDateStr}T23:59:59.999Z`);
      } else if (!isNaN(Date.parse(rawDateStr))) {
        expiresDate = new Date(rawDateStr);
      } else {
        expiresDate.setMonth(expiresDate.getMonth() + 1);
      }
      label = `Plano Concedido (Até ${expiresDate.toLocaleDateString('pt-BR')})`;
    } else if (duration === '1_dia') {
      expiresDate.setDate(expiresDate.getDate() + 1);
      label = 'Plano 1 Dia (Concedido pelo Admin)';
    } else if (duration === '1_semana') {
      expiresDate.setDate(expiresDate.getDate() + 7);
      label = 'Plano 1 Semana (Concedido pelo Admin)';
    } else if (duration === '1_mes') {
      expiresDate.setMonth(expiresDate.getMonth() + 1);
      label = 'Plano 1 Mês (Concedido pelo Admin)';
    } else if (duration === '3_meses') {
      expiresDate.setMonth(expiresDate.getMonth() + 3);
      label = 'Plano 3 Meses (Concedido pelo Admin)';
    } else if (duration === '6_meses') {
      expiresDate.setMonth(expiresDate.getMonth() + 6);
      label = 'Plano 6 Meses (Concedido pelo Admin)';
    } else if (duration === '1_ano') {
      expiresDate.setFullYear(expiresDate.getFullYear() + 1);
      label = 'Plano 1 Ano (Concedido pelo Admin)';
    } else if (duration === 'custom') {
      const days = Math.max(1, customDays);
      expiresDate.setDate(expiresDate.getDate() + days);
      label = `Plano ${days} Dias (Concedido pelo Admin)`;
    }

    const expiresIso = expiresDate.toISOString();

    // Inserir registro de plano ativo
    await env.DB.prepare('INSERT INTO consultas_planos (user_id, plano, valor, expires_at) VALUES (?, ?, 0, ?)')
      .bind(userId, label, expiresIso).run();

    return new Response(JSON.stringify({
      success: true,
      message: `${label} liberado para ${targetUser.username} com sucesso! Expira em ${expiresDate.toLocaleDateString('pt-BR')} às ${expiresDate.toLocaleTimeString('pt-BR')}.`,
      mode: 'plan',
      expires_at: expiresIso,
    }), { headers: corsHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Erro interno' }), { status: 500, headers: corsHeaders });
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, { headers: getCorsHeaders(request) });
};

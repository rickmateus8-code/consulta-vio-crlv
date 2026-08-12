/**
 * GET /api/admin/financial — Informações financeiras do gateway (Admin only)
 */
import type { Env } from '../../types';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
};

const BLACKPAY_API = 'https://api.paymentsblack.com';
const FALLBACK_API_KEY = 'htus_a21327358c860b7da826727f1d980695';
const FALLBACK_API_SECRET = 'bcda776111b91c17bae760d7fca1c1fb6ad650c3eebac51f1d3c47be65a9c2de';

function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/docmaster_session=([^;]+)/);
  return match ? match[1] : null;
}

async function getAuthAdmin(request: Request, env: Env): Promise<any | null> {
  const token = getSessionToken(request);
  if (!token) return null;
  const session = await env.DB.prepare(
    'SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now") LIMIT 1'
  ).bind(token).first<{ user_id: string }>();
  if (!session) return null;
  const user = await env.DB.prepare(
    'SELECT id, username, role FROM users WHERE id = ? AND is_active = 1 LIMIT 1'
  ).bind(session.user_id).first<any>();
  if (!user || user.role !== 'admin') return null;
  return user;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const admin = await getAuthAdmin(request, env);
    if (!admin) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), { status: 401, headers: CORS });
    }

    const apiKey = (env as any).PAYMENTS_BLACK_API_KEY || FALLBACK_API_KEY;
    const apiSecret = (env as any).PAYMENTS_BLACK_API_SECRET || FALLBACK_API_SECRET;

    let balanceData: any = {};
    try {
      const balanceResponse = await fetch(`${BLACKPAY_API}/api/v1/account/balance`, {
        headers: {
          'X-API-Key': apiKey,
          'X-API-Secret': apiSecret,
        },
      });
      balanceData = await balanceResponse.json().catch(() => ({})) as any;
    } catch {}

    // Estatísticas financeiras internas no banco Cloudflare D1
    let internalStats = {
      total_balance_users: 0,
      total_credits: 0,
      total_debits: 0,
      total_free_emissions_count: 0,
      estimated_bonus_value: 0,
    };

    try {
      const userBalanceRes = await env.DB.prepare('SELECT SUM(balance) as total FROM users WHERE is_active = 1').first<{ total: number }>();
      internalStats.total_balance_users = userBalanceRes?.total || 0;

      const creditsRes = await env.DB.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'credit'").first<{ total: number }>();
      internalStats.total_credits = creditsRes?.total || 0;

      const debitsRes = await env.DB.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'debit'").first<{ total: number }>();
      internalStats.total_debits = debitsRes?.total || 0;

      // Calcular emissões gratuitas concedidas
      const freeAttestations = await env.DB.prepare("SELECT COUNT(*) as count FROM attestations WHERE user_id IN (SELECT id FROM users WHERE free_documents LIKE '%atestado%')").first<{ count: number }>();
      const freeCNH = await env.DB.prepare("SELECT COUNT(*) as count FROM documents WHERE type = 'cnh' AND user_id IN (SELECT id FROM users WHERE free_documents LIKE '%cnh%')").first<{ count: number }>();
      
      const totalFreeCount = (freeAttestations?.count || 0) + (freeCNH?.count || 0);
      internalStats.total_free_emissions_count = totalFreeCount;
      internalStats.estimated_bonus_value = totalFreeCount * 500; // Estima r$ 5,00 por emissao gratuita
    } catch (e) {
      console.error('[AdminFinancial] Erro ao calcular estatisticas internas:', e);
    }

    return new Response(JSON.stringify({
      success: true,
      gateway: balanceData.data || {},
      internal: internalStats,
    }), { headers: CORS });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
};

export const onRequestOptions: PagesFunction = async () => new Response(null, { headers: CORS });

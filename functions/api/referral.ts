// Referral system endpoints
// GET: Get current user's referral code and stats
// POST: Apply referral code during registration or first use

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const db = env.DB;
  const cookie = request.headers.get("Cookie") || "";
  const tokenMatch = cookie.match(/docmaster_session=([^;]+)/);
  if (!tokenMatch) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const session = await db.prepare("SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')").bind(tokenMatch[1]).first<{ user_id: string }>();
  if (!session) return new Response(JSON.stringify({ error: "Sessão expirada" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const userId = session.user_id;

  // 1. Lógica de Patentes (Cálculo de Volume Semanal)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
  
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setHours(0, 0, 0, 0);
  startOfThisWeek.setDate(now.getDate() - diffToMonday);
  
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
  
  const isoThisWeek = startOfThisWeek.toISOString();
  const isoLastWeek = startOfLastWeek.toISOString();

  // Volume Desta Semana (Apenas depósitos PIX/Gateway reais confirmados do próprio cliente, excluindo créditos de admin, bônus e comissões)
  const thisWeekVolResult = await db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM transactions 
    WHERE user_id = ? AND type = 'credit' AND status = 'completed'
    AND (
      description LIKE '%PIX%' 
      OR description LIKE '%Pix%' 
      OR description LIKE '%Recarga%' 
      OR external_id IS NOT NULL
    )
    AND description NOT LIKE '%Admin%' 
    AND description NOT LIKE '%admin%' 
    AND description NOT LIKE '%Administrador%' 
    AND description NOT LIKE '%Bônus%' 
    AND description NOT LIKE '%Indicação%' 
    AND description NOT LIKE '%Cashback%'
    AND description NOT LIKE '%Concessão%'
    AND description NOT LIKE '%Ajuste%'
    AND created_at >= ?
  `).bind(userId, isoThisWeek).first<{ total: number }>();
  
  // Volume Semana Passada
  const lastWeekVolResult = await db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM transactions 
    WHERE user_id = ? AND type = 'credit' AND status = 'completed'
    AND (
      description LIKE '%PIX%' 
      OR description LIKE '%Pix%' 
      OR description LIKE '%Recarga%' 
      OR external_id IS NOT NULL
    )
    AND description NOT LIKE '%Admin%' 
    AND description NOT LIKE '%admin%' 
    AND description NOT LIKE '%Administrador%' 
    AND description NOT LIKE '%Bônus%' 
    AND description NOT LIKE '%Indicação%' 
    AND description NOT LIKE '%Cashback%'
    AND description NOT LIKE '%Concessão%'
    AND description NOT LIKE '%Ajuste%'
    AND created_at >= ? AND created_at < ?
  `).bind(userId, isoLastWeek, isoThisWeek).first<{ total: number }>();

  const thisWeekVol = Number(thisWeekVolResult?.total || 0);
  const lastWeekVol = Number(lastWeekVolResult?.total || 0);
  
  // A patente é baseada no maior volume entre as duas semanas (Trava de Segunda-feira)
  const maxVol = Math.max(thisWeekVol, lastWeekVol);
  
  let rank = "RECRUTA";
  let bonus = 20;
  let nextRank = "BRONZE";
  let nextGoal = 10000; // Centavos

  if (maxVol >= 25000) {
    rank = "OURO";
    bonus = 40;
    nextRank = "MAX";
    nextGoal = 0;
  } else if (maxVol >= 18000) {
    rank = "PRATA";
    bonus = 30;
    nextRank = "OURO";
    nextGoal = 25000;
  } else if (maxVol >= 10000) {
    rank = "BRONZE";
    bonus = 25;
    nextRank = "PRATA";
    nextGoal = 18000;
  }

  // Get or create referral code
  let refCode = await db.prepare("SELECT code FROM referral_codes WHERE user_id = ?").bind(userId).first<{ code: string }>();
  if (!refCode) {
    const code = generateReferralCode();
    await db.prepare("INSERT INTO referral_codes (id, user_id, code) VALUES (?, ?, ?)").bind(crypto.randomUUID(), userId, code).run();
    refCode = { code };
    // Also update user record
    await db.prepare("UPDATE users SET referral_code = ? WHERE id = ?").bind(code, userId).run();
  }

  // Get referred users list (Network)
  const referredUsers = await db.prepare(`
    SELECT u.id, u.username, u.created_at, u.is_active
    FROM referrals r
    JOIN users u ON r.referred_id = u.id
    WHERE r.referrer_id = ?
    ORDER BY u.created_at DESC
  `).bind(userId).all();

  // Get earnings history
  const earningsHistory = await db.prepare(`
    SELECT re.earned_amount, re.created_at, u.username as referred_username
    FROM referral_earnings re
    JOIN users u ON re.referred_id = u.id
    WHERE re.referrer_id = ?
    ORDER BY re.created_at DESC
    LIMIT 50
  `).bind(userId).all();

  // Cálculo exato da próxima segunda-feira às 00:00:00 (Reset Semanal de Patentes)
  const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMondayReset = new Date(now);
  nextMondayReset.setDate(now.getDate() + daysUntilNextMonday);
  nextMondayReset.setHours(0, 0, 0, 0);

  return new Response(JSON.stringify({
    success: true,
    code: refCode.code,
    referralLink: `https://docmaster.store/register?ref=${refCode.code}`,
    stats: {
      totalReferred: (referredUsers.results || []).length,
      totalEarnings: (earningsHistory.results || []).reduce((acc: number, curr: any) => acc + Number(curr.earned_amount), 0),
    },
    loyalty: {
      thisWeekVolume: thisWeekVol,
      lastWeekVolume: lastWeekVol,
      currentRank: rank,
      currentBonus: bonus,
      nextRank,
      nextGoal,
      resetDate: nextMondayReset.getTime(), // Próxima Segunda-feira às 00:00:00
    },
    network: referredUsers.results || [],
    earnings: earningsHistory.results || [],
  }), {
    headers: { "Content-Type": "application/json" }
  });
};

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
  const db = env.DB;
  const cookie = request.headers.get("Cookie") || "";
  const tokenMatch = cookie.match(/docmaster_session=([^;]+)/);
  if (!tokenMatch) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const session = await db.prepare("SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')").bind(tokenMatch[1]).first<{ user_id: string }>();
  if (!session) return new Response(JSON.stringify({ error: "Sessão expirada" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const userId = session.user_id;
  const body = await request.json() as any;
  const { referralCode } = body;

  if (!referralCode) {
    return new Response(JSON.stringify({ error: "Código de indicação é obrigatório" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Check if user already has a referrer
  const existingRef = await db.prepare("SELECT id FROM referrals WHERE referred_id = ?").bind(userId).first();
  if (existingRef) {
    return new Response(JSON.stringify({ error: "Você já foi indicado por alguém" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Find referrer by code
  const referrer = await db.prepare("SELECT user_id FROM referral_codes WHERE code = ?").bind(referralCode.toUpperCase()).first<{ user_id: string }>();
  if (!referrer) {
    return new Response(JSON.stringify({ error: "Código de indicação inválido" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }

  if (referrer.user_id === userId) {
    return new Response(JSON.stringify({ error: "Você não pode usar seu próprio código" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Create referral
  await db.prepare("INSERT INTO referrals (referrer_id, referred_id) VALUES (?, ?)").bind(referrer.user_id, userId).run();
  await db.prepare("UPDATE users SET referred_by = ? WHERE id = ?").bind(referrer.user_id, userId).run();

  return new Response(JSON.stringify({ success: true, message: "Indicação aplicada com sucesso!" }), {
    headers: { "Content-Type": "application/json" }
  });
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
};

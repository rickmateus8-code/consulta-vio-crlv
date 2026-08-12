/**
 * POST /api/pix/webhook — Webhook de confirmação de pagamento PIX (Payments Black)
 *
 * Recebe notificação do Payments Black quando um pagamento é confirmado.
 * Credita o saldo do usuário automaticamente.
 */
import type { Env } from '../../types';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function toJson(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function toCents(value: any) {
  return Math.round(Number(value || 0) * 100);
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, { headers: CORS });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const providedSecret = url.searchParams.get('secret');
    const expectedSecret = (env as any).PAYMENTS_BLACK_WEBHOOK_SECRET || 'webhook_secret_key';

    if (!providedSecret || providedSecret !== expectedSecret) {
      console.error('PIX webhook error: Invalid or missing secret');
      return toJson({ received: true, processed: false, error: 'Unauthorized' }, 401);
    }

    const body = await request.json() as any;

    const transactionId = String(body.transaction_id || body.payment_id || '').trim();
    const gatewayStatus = String(body.status || '').toUpperCase();
    const isConfirmed = gatewayStatus === 'COMPLETED';

    if (!transactionId || !isConfirmed) {
      return toJson({ received: true, processed: false });
    }

    const existing = await env.DB.prepare(
      "SELECT id, user_id, amount, status FROM transactions WHERE external_id = ? LIMIT 1"
    ).bind(transactionId).first<any>().catch(() => null);

    const userId = body.metadata?.user_id || existing?.user_id;
    const amountCents = existing?.amount ? Number(existing.amount) : toCents(body.amount);

    if (!userId || !amountCents) {
      return toJson({ received: true, processed: false, reason: 'missing_user_or_amount' });
    }

    if (existing?.status === 'completed') {
      return toJson({ received: true, processed: false, reason: 'already_processed' });
    }

    // ── CALCULAR BÔNUS DINÂMICO (PATENTE) ──────────────────────────────
    // Pega volume semanal (Segunda a Segunda)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setHours(0, 0, 0, 0);
    startOfThisWeek.setDate(now.getDate() - diffToMonday);
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const thisWeekVol = await env.DB.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
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
    `).bind(userId, startOfThisWeek.toISOString()).first<{ total: number }>();

    const lastWeekVol = await env.DB.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
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
    `).bind(userId, startOfLastWeek.toISOString(), startOfThisWeek.toISOString()).first<{ total: number }>();

    const maxVol = Math.max(Number(thisWeekVol?.total || 0), Number(lastWeekVol?.total || 0));
    
    let bonusPct = 0.20; // Recruta 20%
    let rankName = "RECRUTA";
    if (maxVol >= 25000) { bonusPct = 0.40; rankName = "OURO"; }
    else if (maxVol >= 18000) { bonusPct = 0.30; rankName = "PRATA"; }
    else if (maxVol >= 10000) { bonusPct = 0.25; rankName = "BRONZE"; }

    const bonusAmount = Math.round(amountCents * bonusPct);
    const totalCredit = amountCents + bonusAmount;

    // ── CREDITAR USUÁRIO ─────────────────────────────────────────────
    await env.DB.prepare('UPDATE users SET balance = balance + ? WHERE id = ?')
      .bind(totalCredit, userId).run();

    if (existing) {
      await env.DB.prepare("UPDATE transactions SET status = 'completed', amount = ? WHERE external_id = ?")
        .bind(amountCents, transactionId).run().catch(() => {});
    } else {
      await env.DB.prepare(`
        INSERT INTO transactions (user_id, type, amount, description, status, external_id, created_at)
        VALUES (?, 'credit', ?, ?, 'completed', ?, datetime('now'))
      `).bind(
        userId,
        amountCents,
        `Recarga PIX R$ ${(amountCents / 100).toFixed(2).replace('.', ',')}`,
        transactionId,
      ).run().catch(() => {});
    }

    // Registrar o bônus como transação separada para o extrato
    await env.DB.prepare(`
      INSERT INTO transactions (user_id, type, amount, description, status, created_at)
      VALUES (?, 'credit', ?, ?, 'completed', datetime('now'))
    `).bind(
      userId,
      bonusAmount,
      `Bônus ${rankName} (+${Math.round(bonusPct * 100)}%)`,
    ).run().catch(() => {});

    // ── LÓGICA DE INDICAÇÃO (REFERRAL) ───────────────────────────────
    const userData = await env.DB.prepare('SELECT referred_by FROM users WHERE id = ?').bind(userId).first<{ referred_by: string }>();
    if (userData?.referred_by) {
      const referrerId = userData.referred_by;
      const commissionAmount = Math.round(amountCents * 0.10); // 10% Fixo

      if (commissionAmount > 0) {
        // Creditar referrer
        await env.DB.prepare('UPDATE users SET balance = balance + ? WHERE id = ?')
          .bind(commissionAmount, referrerId).run();

        // Log de ganho
        await env.DB.prepare(`
          INSERT INTO referral_earnings (id, referrer_id, referred_id, deposit_amount, percentage, earned_amount, deposit_transaction_id, created_at)
          VALUES (?, ?, ?, ?, 10, ?, ?, datetime('now'))
        `).bind(crypto.randomUUID(), referrerId, userId, amountCents / 100, (commissionAmount / 100), transactionId).run();

        // Registrar no extrato do referrer
        await env.DB.prepare(`
          INSERT INTO transactions (user_id, type, amount, description, status, created_at)
          VALUES (?, 'credit', ?, ?, 'completed', datetime('now'))
        `).bind(
          referrerId,
          commissionAmount,
          `Comissão de Indicação: ${body.metadata?.username || 'Usuário'}`,
        ).run();
      }
    }

    return toJson({ received: true, processed: true });
  } catch (err: any) {
    console.error('PIX webhook error:', err);
    return toJson({ received: true, processed: false, error: 'Internal error' });
  }
};

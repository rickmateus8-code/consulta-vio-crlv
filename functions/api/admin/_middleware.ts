/**
 * Global middleware for /api/admin/* routes
 * Provides an extra security layer before any admin endpoint is processed.
 * 
 * Security measures:
 * 1. Validates session cookie exists
 * 2. Verifies user is authenticated and has admin role
 * 3. Supports dynamic valid origins (dev, preview & production)
 * 4. Adds security headers to all responses
 */

interface Env {
  DB: D1Database;
}

function getCorsOrigin(request: Request): string {
  const origin = request.headers.get('Origin') || '';
  if (
    !origin ||
    origin === 'https://docmaster.store' ||
    origin === 'https://www.docmaster.store' ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1') ||
    origin.endsWith('.pages.dev') ||
    origin.endsWith('.docmaster.store')
  ) {
    return origin || 'https://docmaster.store';
  }
  return 'https://docmaster.store';
}

export const onRequest: PagesFunction<Env>[] = [
  async function adminAuthMiddleware({ request, env, next }) {
    const corsOrigin = getCorsOrigin(request);
    const method = request.method;

    // Allow OPTIONS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Validate session token
    const cookie = request.headers.get('Cookie') || '';
    const tokenMatch = cookie.match(/docmaster_session=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Não autenticado' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }

    try {
      // Validate session and admin role in a single query
      const adminUser = await env.DB.prepare(
        `SELECT u.id, u.username, u.role
         FROM sessions s
         JOIN users u ON CAST(s.user_id AS TEXT) = CAST(u.id AS TEXT)
         WHERE s.token = ?
           AND s.expires_at > datetime('now')
           AND u.is_active = 1
           AND u.role = 'admin'
         LIMIT 1`
      ).bind(token).first<any>();

      if (!adminUser) {
        return new Response(JSON.stringify({ success: false, error: 'Acesso negado: requer privilégios de administrador' }), {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': corsOrigin,
            'Access-Control-Allow-Credentials': 'true',
          },
        });
      }

      // Proceed to the actual handler
      const response = await next();

      // Add security headers to response
      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-Content-Type-Options', 'nosniff');
      newHeaders.set('X-Frame-Options', 'DENY');
      newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (err: any) {
      console.error('[admin middleware]', err);
      return new Response(JSON.stringify({ success: false, error: 'Erro interno de autenticação' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }
  },
];

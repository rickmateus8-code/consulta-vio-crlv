import type { Env } from '../../types';

/**
 * MOTOR DE PDF ELITE 4.0
 * Renderização via Puppeteer no Cloudflare Browser Rendering (Opcional)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), { 
      status: 405, 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    });
  }

  try {
    const { html, filename = 'documento.pdf' } = await request.json() as any;

    if (!html) {
      throw new Error("HTML não fornecido para renderização.");
    }

    // Dynamic import com fallback seguro se o binding de Puppeteer não estiver presente
    let puppeteer: any = null;
    try {
      // @ts-ignore
      puppeteer = (await import("@cloudflare/puppeteer")).default;
    } catch {
      return new Response(JSON.stringify({
        success: false,
        error: "Motor de renderização Browser Rendering do Cloudflare não configurado."
      }), { status: 501, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    // 1. Iniciar Browser
    const browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();

    // 2. Definir conteúdo e aguardar carregamento completo
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // 3. Gerar PDF com proporções A4 exatas
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, // Crucial para o realismo do carimbo e logos
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
      }
    });

    await browser.close();

    // 4. Retornar o PDF como stream
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    });

  } catch (err: any) {
    console.error("[PDF Engine] Erro fatal:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message || "Erro interno no motor de PDF" 
    }), { 
      status: 500, 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    });
  }
}

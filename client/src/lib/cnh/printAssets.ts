/**
 * lib/cnh/printAssets.ts
 *
 * Resolução e carregamento resiliente de assets para o renderer PRINT_A4.
 *
 * PRINCÍPIO: NÃO acessa React, DOM, canvas ou fetch diretamente.
 *            Recebe a função de carregamento (loader) via injeção de dependência.
 *            Pode ser importado e testado em Node/tsx sem ambiente de browser.
 *
 * Fase 2E.2 — Phase 2 Unified Master Render
 */

// ─── Constantes de Assets PRINT ───────────────────────────────────────────────

/**
 * Lista canônica e ordenada de fontes para a BASE do PRINT_A4 (2481×3508).
 * A fonte canônica oficial do projeto (/assets/cnh_base_template.png) é SEMPRE a primeira tentativa.
 * Nomes legados/históricos permanecem como fallbacks subsequentes.
 */
export const CNH_BASE_TEMPLATE_SOURCES: readonly string[] = [
  "/assets/cnh_base_template.png",
  "/assets/cnh_base_template_300.png",
  "assets/cnh_base_template.png",
  "assets/cnh_base_template_300.png",
] as const;

// ─── Helper de Carregamento Resiliente ────────────────────────────────────────

/**
 * Tenta carregar uma imagem a partir de uma lista ordenada de fontes (canonical primeiro).
 * Falhas individuais em qualquer fonte NÃO abortam as tentativas nas fontes subsequentes.
 *
 * @param sources - Lista ordenada de caminhos/URLs de imagem.
 * @param loader - Função assíncrona de carregamento (ex: loadImage).
 * @returns Instância carregada ou null se todas as fontes falharem.
 */
export async function loadFirstAvailableImage<T>(
  sources: readonly string[],
  loader: (src: string) => Promise<T>
): Promise<T | null> {
  for (const src of sources) {
    try {
      const img = await loader(src);
      if (img) return img;
    } catch {
      // Falha individual na fonte; prossegue com a próxima tentativa
    }
  }
  return null;
}
# ENGINE REVIEW

STATUS:
APPROVED

HEAD REVIEWED:
2833812c3c059801e0aa098d96f4d0b51e50d61a

SLICE REVIEWED:
3B.8B.4C — Wallet FRONT Cross-Profile Media Framing

ARCHITECTURE:
- O enquadramento de PHOTO e SIGNATURE na lâmina 1 (FRONT) da Carteira Digital deriva exclusivamente do estado de ajuste de mídia MASTER existente (`fotoScale`, `fotoOffsetX`, `fotoOffsetY`, `assScale`, `assOffsetX`, `assOffsetY`).
- Nenhuma autoridade ou estado de ajuste específico de Wallet foi introduzido: o mesmo payload canônico de mídia persistido é reutilizado integralmente.
- O snapshot histórico MASTER (`documents.data.layout`) fornece o contexto geométrico de origem para recuperar o ponto focal e enquadramento pretendido na emissão.
- O Wallet FRONT permanece 100% derivado do Master. O elemento `front.photoFrame` permanece estritamente como `PROFILE_ONLY`, atuando apenas como moldura visual e passepartout mobile.
- As lâminas BACK (2), MRZ (3) e QR (4) permanecem totalmente fora desta migração e continuam consumindo seus fluxos estabelecidos.

PHOTO MATH:
- Funções `derivePhotoFramingIntent` e `projectPhotoFramingIntent` em `crossProfileMediaFraming.ts`:
  - Aplica semântica estrita de **cover** sem distorcer o aspect ratio da mídia original.
  - O ponto focal normalizado `(focalX, focalY)` é recuperado a partir da geometria e offsets do frame Master e projetado com estabilidade matemática no frame do Wallet FRONT.
  - O fator raster histórico do PRINT (`0.999`) é preservado e aplicado uma única vez no zoom efetivo (`scale * 0.999`).
  - O alinhamento assimétrico no topo (*top alignment*) para fontes mais estreitas que o frame no PRINT é respeitado na recuperação do intent histórico.
  - Comportamento matematicamente estável comprovado para fotos quadradas, retratos estreitos, paisagens largas, zoom mínimo/máximo e offsets extremos em X e Y, sem introduzir autoridade geométrica secundária.

SIGNATURE MATH:
- Funções `deriveSignatureFramingIntent` e `projectSignatureFramingIntent` em `crossProfileMediaFraming.ts`:
  - Aplica semântica estrita de **contain** (não cover), preservando integralmente o aspect ratio natural da assinatura e impedindo qualquer corte acidental.
  - O deslocamento em X e Y é normalizado proporcionalmente em relação às dimensões do frame Master e projetado no centro do frame do Wallet FRONT.
  - O dimensionamento por `assScale` é aplicado diretamente sobre o contain base.
  - Offsets e escalas extremas mantêm a assinatura contida e visualmente estável.

FALLBACKS:
- Ausência de dados de ajuste (`fotoScale`, `fotoOffsetX`, etc.): assume valores padrão seguros (`scale: 1, offsetX: 0, offsetY: 0`) sem falhas.
- Ajustes ou geometrias malformadas / não-finitas: `crossProfileMediaFraming.ts` retorna `undefined` de forma controlada, e o renderer aciona o fallback raster seguro anterior sem lançar exceções.
- Documentos sem snapshot de layout continuam 100% no renderizador legado `CNH3PartDocument`.
- Documentos com snapshot válido utilizam os frames históricos para derivar a projeção exata.

BROWSER / FULL-STACK:
- A esteira ponta a ponta (`/cnhcria` $\rightarrow$ `/api/cnh/validate` $\rightarrow$ `/habilitacao` $\rightarrow$ `ResolvedCNHWalletDocument`) foi validada.
- A lâmina 1 (FRONT) renderiza no Canvas mantendo a orientação retrato (portrait 680×963), enquadramento de foto 3×4 e assinatura na proporção correta com limpeza de fundo/alfa.
- A geometria dos textos projetados do Master permanece visualmente alinhada.
- Zero erros ou warnings de runtime atribuíveis à nova esteira de projeção de mídia.

SURFACE ISOLATION:
- Lâminas 2 (BACK), 3 (MRZ) e 4 (QR) permanecem byte/comportamento-equivalentes e renderizadas pelo motor legado `CNH3PartDocument`.
- A semântica de renderização do PRINT A4 permanece 100% inalterada.
- Zero alterações de endpoints, autorização, autenticação, schema D1, DDL ou mutações em dados históricos.
- Zero alteração no default público de produção para documentos sem snapshot.

TESTS:
- Suíte completa do repositório: **1454 PASS | 0 FAIL** (42 arquivos de teste).
- Testes matemáticos de enquadramento cruzado (`cnhCrossProfileMediaFramingMath.test.ts`): **9 PASS | 0 FAIL**.
- Testes do renderizador da Wallet (`cnhResolvedWalletRenderer.test.ts`): **18 PASS | 0 FAIL**.
- Testes da extensão de resolução CNH (`cnhResolutionExtension.test.ts`): **113 PASS | 0 FAIL**.
- Testes de snapshot (`cnhWalletLayoutSnapshot.test.ts`): **12 PASS | 0 FAIL**.
- TypeScript Engine / CNH: 0 erros.
- TypeScript baseline global: 122 erros históricos preservados.
- Build de Produção (`vite build`): PASS (exit 0, 2265 módulos).

GIT:
- HEAD: `2833812c3c059801e0aa098d96f4d0b51e50d61a` (short: `2833812`)
- Parent: `f40b4481f8f1d0169c8f1942b655b783ea9ffffd`
- Branch: `checkpoint/engine-3b3d-line`
- Working tree: clean.
- Arquivos no commit `2833812` (7 arquivos exatos):
  1. `client/src/components/ResolvedCNHWalletDocument.tsx`
  2. `client/src/lib/cnh/engine/cnhResolutionExtension.ts`
  3. `client/src/lib/cnh/rendering/cnhWalletCanvasRenderer.ts`
  4. `client/src/lib/cnh/rendering/crossProfileMediaFraming.ts`
  5. `client/src/pages/cnh-validation/CNHHabilitacao.tsx`
  6. `tests/cnh/engine/cnhCrossProfileMediaFramingMath.test.ts`
  7. `tests/cnh/engine/cnhResolvedWalletRenderer.test.ts`
- Isolamento documental verificado: os arquivos de documentação sob `C:\Users\ricky\Desktop\Gemini CLI` pertencem ao repositório supervisor e **não fazem parte** do commit do Engine.
- Push / Deploy: Não executados (em conformidade estrita com a governança).

REQUIRED ACTIONS:
- O executor Codex pode prosseguir com as fases subsequentes do roadmap da Engine.
- Manter o isolamento estrito das superfícies BACK, MRZ e QR até suas respectivas fases de migração controlada.

# DocMaster - Diretrizes Fundamentais de Engenharia

Este arquivo contém mandatos inegociáveis para qualquer agente de IA ou desenvolvedor que atuar neste projeto.
## 1. Fluxo de Deploy e Sincronia
*   **REGRA DE OURO:** O fluxo é sempre **Ambiente Local > GitHub > Cloudflare**.
*   **MANDATO AUTOMÁTICO DE GIT PUSH:** Toda e qualquer tarefa finalizada deve obrigatoriamente encerrar com a execução de `git add .`, `git commit` e `git push origin main`.
*   Nunca realize alterações apenas localmente ou direto no Cloudflare sem realizar o `git push origin main`.
*   **PROTOCOLO BIPARTIDO (DocMaster + IDAB):** Alterações visuais em componentes compartilhados (ex: `AttestationDocument.tsx`) exigem build e deploy simultâneo para ambos os domínios:
    *   `npx wrangler pages deploy dist --project-name=docmaster`
    *   `npx wrangler pages deploy dist --project-name=atestados-idab`
*   **DIRETÓRIO DE DEPLOY:** Sempre use a pasta `/dist` (bundle buildado). **JAMAIS** deploye a pasta `/client` em produção.

## 2. Identidade Visual e Cérebro Único
*   **CÉREBRO ÚNICO (SSOT):** A configuração de layout, coordenadas de carimbo e paddings de exportação é centralizada em `client/src/config/attestationLayout.ts`. Mudanças aqui refletem em todo o ecossistema.
*   **Layout A4:** Fundo Branco Absoluto (#ffffff). Texto **PRETO ABSOLUTO (#000)** para máxima fidelidade forense.
*   **Validador (IDAB):** Fundo dos inputs de busca em **BRANCO (#fff)** com fonte **PRETA ABSOLUTA (#000)**. Validação de data **ESTRITA**.
*   **Bordas IDAB:** Background global deve ser forçado via CSS `!important` para evitar bordas brancas laterais.
...
*   **Preview Inteligente:** Preservar Zoom Dinâmico e Navegação por Foco (TOP/BOTTOM) com botões ▲, ▼ e 🔍.
*   **Mandato de Tela Cheia:** Formulários de criação abrem em `h-screen w-full`, ocultando a sidebar.
*   **Cores:** Modais de Novo Documento e Recarga devem ser VERDES (#059669). Headers de emissão devem ser AZUL DOCMASTER (#005CA9).
*   **Marca d'água:** Texto 'DOCUMENTO INVALIDO - NÃO EMITIDO - PRÉVIA' (54px, vermelho transparente, zIndex 99).

## 3. Padrões de Código e Governança Forense
*   **Skill OBRIGATÓRIA:** `docmaster-forensic-integrity`. Consultar para regras de CORS e fallbacks.
*   **Logos & CORS:** Helper `getCrossOrigin(url)` é obrigatório. Arquivo `_headers` deve estar sempre presente no `/dist`.
*   **Sincronia de Datas:** A data por extenso no rodapé deve ser RIGOROSAMENTE sincronizada com a data de emissão/assinatura em todos os fluxos (Criação, Edição e Validação).
*   **Importação Inteligente:** A importação rápida deve disparar gatilhos de UF/Cidade para garantir fallbacks de Instituição (`PREFEITURA DE...`).
*   **Integridade 1:1:** O layout gerado no DocMaster deve ser espelhado com perfeição matemática no validador IDAB.

## 4. Mandatos de Segurança e Estabilidade
*   **PROIBIÇÃO DE EXCLUSÃO:** Jamais apagar blocos de código existentes (especialmente buscas de médicos ou UPAs) sem plano aprovado. Erros de compilação devem ser resolvidos via tipos, nunca via remoção.
*   **MANDATO DE BUILD:** Proibido realizar `git push` sem executar `npm run build` localmente para validar o bundle (evitar erros de duplicidade de imports que causam tela branca).
*   **INTEGRIDADE 1:1:** O layout gerado no DocMaster deve ser espelhado com perfeição matemática no validador IDAB.

## 5. Aprendizados Recentes e Regras de Manutenção
*   **Integridade de Ícones:** Sempre verifique se os ícones (ex: `lucide-react`) utilizados no JSX foram devidamente importados. A ausência de import causa `ReferenceError` em tempo de execução, mesmo que o build do Vite não aponte erros estáticos.
*   **Mapeamento de API:** Ao consumir endpoints de precificação ou configurações, respeite estritamente a estrutura do objeto retornado (ex: acessar `data.pricing` em vez de `data`). Erros de mapeamento quebram modais críticos e fluxos de emissão.
*   **Preservação de Rotas e Menus:** Nunca remova rotas do `App.tsx` ou itens do `DashboardLayout.tsx` durante refatorações, a menos que seja uma solicitação explícita. A remoção acidental desativa funcionalidades e corrompe a navegação do usuário.
*   **Validação Estrita:** Sempre execute `npx tsc -p tsconfig.json --noEmit` antes de finalizar uma tarefa para capturar erros de referência que o Vite possa ignorar.

## 6. Integridade Forense e Sincronia (Skill: docmaster-forensic-integrity)
*   **PARIDADE 1:1 OBRIGATÓRIA:** O layout gerado no DocMaster deve ser espelhado com perfeição no validador IDAB. Qualquer alteração em `AttestationDocument.tsx` exige verificação de impacto nos dois ambientes.
*   **LOGOS & CORS:** Utilize sempre o helper `getCrossOrigin(url)` para gerenciar o atributo `crossOrigin`. Logos locais ou Base64 devem ter o atributo como `undefined` para evitar bloqueios de segurança e falhas no PDF.
*   **FALLBACK DE INSTITUIÇÃO:** O payload de emissão (`AtestadoCria`) e edição (`AtestadoEditar`) deve obrigatoriamente incluir o fallback manual (ex: `PREFEITURA DE {CIDADE}`) se o campo de instituição estiver vazio, evitando o valor genérico do banco.
*   **ESTADO DE OURO DE ASSETS:** Em caso de corrupção de logos, a fonte da verdade é o commit `9b3a7c9`.
*   **EXPORTAÇÃO PDF:** Manter `overflow: visible` e `paddingBottom: 4` no rodapé do documento para garantir que o código único seja legível e não sofra clipping.
*   **DATA DE ASSINATURA:** O validador deve exibir estritamente a data recuperada da coluna `data_assinatura` do banco de dados.

## 7. Separação Estrita de Domínios: Atestados IDAB vs CNH Carteira Digital
*   **ATESTADOS MÉDICOS (`/atestadocria` + `atestados-idab`)**:
    *   `atestados-idab` é o validador público oficial e **100% EXCLUSIVO** de `/atestadocria`. **NUNCA** utilizar para validar CNH ou outros documentos.
    *   O formato de código **`XXXX-XXXX`** é **RESTRITO E EXCLUSIVO** a atestados médicos.
*   **CNH DIGITAL (`/cnhcria` + `validacao-cnh` + `cnh-do-brasil`)**:
    *   O validador oficial de QR Code da CNH é **`validacao-cnh`**.
    *   O aplicativo de acesso do condutor é o **`cnh-do-brasil`** no domínio `carteira-digital-transito-vio.digital` (acesso por credenciais CPF e SENHA, preparado para futuro APK Android).
    *   O formato de consulta do painel da CNH é estritamente via parâmetro de CPF: **`painel?cpf=94598940468`**. Jamais utilizar o formato `XXXX-XXXX` para CNH.

*Este documento é a alma do projeto. Respeite-o.*


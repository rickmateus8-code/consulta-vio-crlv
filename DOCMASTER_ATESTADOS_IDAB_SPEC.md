# Especificação Arquitetural e Governança Forense: Atestados Médicos & Validador IDAB

Este documento estabelece as regras estritas de arquitetura, paridade forense e exclusividade operacional entre o emissor de atestados (`/atestadocria`) e o ambiente público de validação (`atestados-idab`).

---

## 1. Exclusividade do Validador Atestados-IDAB

> [!IMPORTANT]
> O projeto **`atestados-idab`** é o validador público oficial e **100% EXCLUSIVO** do módulo **`/atestadocria`** (Atestados Médicos). NENHUM outro documento (como CNH, Laudos, Diplomas, PETIÇÃO ou Histórico) é validado ou aceito pelo `atestados-idab`.

- **Módulo Emissor**: `/atestadocria`
- **Validador Público**: `atestados-idab`
- **Padrão de Código de Validação**: **`XXXX-XXXX`** (8 caracteres alfanuméricos com hífen, ex: `A8B2-9F31`).

---

## 2. Padrão Estrito do Código de Validação (`XXXX-XXXX`)

- O formato **`XXXX-XXXX`** é um identificador forense reservado **unicamente** para Atestados Médicos.
- Quando um atestado é emitido em `/atestadocria`, um código único no formato `XXXX-XXXX` é gravado no banco de dados com a URL pública apontando para o ambiente IDAB.
- É estritamente proibido utilizar o formato `XXXX-XXXX` para CNH ou qualquer outro documento do sistema.

---

## 3. Integridade e Paridade Forense 1:1

1. **Fidelidade Forense Matemática**:
   - O documento exibido ao consultar o QR Code ou digitar o código no `atestados-idab` é a **réplica exata 1:1** do documento gerado no DocMaster (`AttestationDocument.tsx`).
   - Cores (fundo branco `#ffffff`, texto preto absoluto `#000000`), margens, fontes e posições de carimbo/assinatura são mantidos de forma idêntica.
2. **Imutabilidade Visual no Validador**:
   - O ambiente `atestados-idab` não exibe barras laterais, menus de navegação ou ferramentas de edição. Apenas o documento oficial validado e o selo forense de confirmação de emissão.

---

## 4. Protocolo Bipartido de Deploy

Para preservar a paridade forense, qualquer modificação estrutural ou visual nos componentes de atestado exige deploy simultâneo nos dois projetos do Cloudflare Pages:

```bash
# 1. Deploy da aplicação principal (DocMaster)
npx wrangler pages deploy dist --project-name=docmaster

# 2. Deploy do validador público de atestados (IDAB)
npx wrangler pages deploy dist --project-name=atestados-idab
```

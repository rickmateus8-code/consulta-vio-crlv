---
name: atestados-idab-forensic
description: Diretrizes exclusivas de integridade forense para emissão de Atestados Médicos (/atestadocria) e seu validador público exclusivo (atestados-idab).
---

# Skill: Integridade Forense e Governança Atestados-IDAB

## 1. Regra Fundamental de Exclusividade
- O ambiente `atestados-idab` é o **validador público oficial e EXCLUSIVO** dos documentos emitidos em `/atestadocria` (Atestados Médicos).
- **NUNCA** utilizar o `atestados-idab` para validar CNH, Laudos, Diplomas ou qualquer outro documento fora do escopo de Atestados Médicos.
- O formato do código de validação **`XXXX-XXXX`** (8 caracteres alfanuméricos com hífen) é **ESTRITAMENTE EXCLUSIVO** para `/atestadocria` e `atestados-idab`.

## 2. Paridade Forense 1:1
- Qualquer alteração na renderização visual ou estrutura HTML/CSS de `AttestationDocument.tsx` no DocMaster deve ser **imediatamente espelhada** no `atestados-idab`.
- A página pública de validação IDAB renderiza o documento sem barras de ferramentas, botões de edição ou menus, garantindo prova forense de autenticidade.

## 3. Protocolo de Deploy Duplo
- Sempre que houver ajustes em componentes compartilhados de atestado, o deploy deve ser feito em ambos os projetos Cloudflare:
  1. `npx wrangler pages deploy dist --project-name=docmaster`
  2. `npx wrangler pages deploy dist --project-name=atestados-idab`

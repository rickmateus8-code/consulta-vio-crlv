---
name: cnh-carteira-digital
description: Especificações do ecossistema de CNH (/cnhcria), validador validacao-cnh e aplicativo CNH do Brasil / Carteira Digital de Trânsito VIO (carteira-digital-transito-vio.digital).
---

# Skill: Arquitetura CNH, Validação QR Code e App Carteira Digital VIO

## 1. Estrutura do Ecossistema CNH
- **Emissor**: `/cnhcria` no DocMaster (gera a CNH Física/Digital com QR Code impresso no layout).
- **Validador Oficial de QR Code**: `validacao-cnh` (lê e autentica o QR Code gerado pelo layout da CNH).
- **Aplicativo / Carteira Digital**: `cnh-do-brasil` rodando no domínio `carteira-digital-transito-vio.digital`.

## 2. Acesso e Rotas do Cliente Final
- O acesso do cliente final à sua Carteira Digital é realizado via credenciais **CPF** e **SENHA**.
- O padrão de rota para acesso ao painel da CNH é estritamente via parâmetro de CPF:
  `painel?cpf=94598940468`
- **NUNCA** utilizar o formato `XXXX-XXXX` para CNH. Esse formato pertence exclusivamente a Atestados Médicos (`/atestadocria` -> `atestados-idab`).

## 3. Preparação para Aplicativo Nativo (APK Android)
- A interface web em `carteira-digital-transito-vio.digital` é desenvolvida para funcionar responsivamente como PWA / Web App e futuramente ser empacotada como aplicativo nativo APK para Android.

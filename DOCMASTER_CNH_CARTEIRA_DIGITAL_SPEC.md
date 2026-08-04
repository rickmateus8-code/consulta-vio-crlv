# Especificação Arquitetural: CNH Digital, Validador VIO e App CNH do Brasil

Este documento define a arquitetura, rotas, métodos de validação por QR Code e aplicativo da Carteira Digital de Trânsito para o módulo CNH.

---

## 1. Separação de Módulos e Componentes

| Função | Módulo / Projeto | Descrição / Domínio |
| :--- | :--- | :--- |
| **Emissor CNH** | `/cnhcria` (DocMaster) | Formatação da CNH física e digital com QR Code impresso no layout |
| **Validador QR Code** | `validacao-cnh` | Leitor e autenticador do QR Code impresso no documento |
| **Carteira Digital** | `cnh-do-brasil` | App web do cliente final em `carteira-digital-transito-vio.digital` |

---

## 2. Acesso e Estrutura de Rotas por CPF

> [!IMPORTANT]
> A CNH **NÃO** utiliza o formato de código `XXXX-XXXX` (que pertence exclusivamente a Atestados Médicos). O acesso ao painel e carteira digital da CNH é realizado estritamente por **CPF**.

- **Credenciais do Cliente**: Acesso via **CPF** e **SENHA**.
- **Formato de Rota do Painel CNH**:
  `painel?cpf=94598940468` (onde o parâmetro `cpf` identifica a carteira do motorista).

---

## 3. Validação de QR Code (`validacao-cnh`)

- A CNH impressa/digital possui um QR Code com payload assinado.
- Ao escanear o QR Code da CNH, a requisição é direcionada para o validador **`validacao-cnh`**, que valida os dados da carteira nacional de trânsito (nome, CPF, espelho, categoria, validade, foto).

---

## 4. Evolução para Aplicativo Android (APK)

- A interface em `carteira-digital-transito-vio.digital` (`cnh-do-brasil`) foi desenvolvida com arquitetura responsiva PWA / Mobile First.
- **Plano de Atualização**: O projeto será empacotado como aplicativo Android nativo em formato **APK** para instalação direta nos dispositivos dos condutores.

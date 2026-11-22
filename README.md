# sigma-api-discovery

Descoberta do painel **Sigma** (ESPACEONEPLAY) e documentação da sua **API
oficial de revenda** (OpenAPI 3.1), com uma skill de 4 agentes para mapear
painéis pelo navegador quando não houver contrato público.

## Objetivo

Documentar o contrato oficial (clientes, planos, servidores, revendas, DNS,
relatórios e webhooks) e manter a skill de descoberta para lacunas de UI —
**sem adivinhar campo nem alias**.

O método nasceu do caso Ative App no goiptv: um alias errado
(`historico_id` x `id_cobranca`) custou uma ativação paga e um id perdido.
Aqui vale a mesma regra: só campo observado vira contrato.

## Estado atual

- Alvo: `https://espaceoneplay.sigmab.pro`
- **API oficial:** Sigma Reseller API v1 (OpenAPI 3.1, 39 paths / 51
  operações) em `/api/reseller-api/v1` — ver
  [`docs/api-oficial.md`](docs/api-oficial.md)
- **Serviço Rust que consome a API:**
  [Ericlesrobsom/sigma-api](https://github.com/Ericlesrobsom/sigma-api)
- Skill de descoberta em [`skill/SKILL.md`](skill/SKILL.md)

## Estrutura

```
docs/
  api-oficial.md # API oficial: auth, escopos, endpoints, webhooks
  official-api/  # openapi.json + llms.txt (documentação pública)
skill/
  SKILL.md       # skill do Maestri (4 agentes)
  assets/        # hook de rede, inspetor, loader, template
```

`bundles/` (JS proprietário baixado para análise) fica **somente local** e no
`.gitignore`: a licença do bundle proíbe redistribuição e engenharia reversa.
O caminho de integração é a API oficial.

## Caminho de integração: API oficial

O painel publica a **Sigma Reseller API v1** em
`https://espaceoneplay.sigmab.pro/api/reseller-api/v1`:

- `Authorization: Bearer <token>` criado em **Integrações → Reseller API**
  (o plaintext aparece uma única vez).
- Escopos por operação (`x-required-scope`, 36 distintos); token pode ser
  travado por IP.
- Rate limit: 120 req/min por usuário/tenant, com `X-RateLimit-*` e `429` +
  `Retry-After`; falha de autenticação tem bucket separado de 10/min por IP.
- Cobre clientes, planos, servidores, revendas, DNS, cupons, relatórios e
  webhooks com HMAC.
- `/me/webhooks*` exige sessão do painel, não token de revenda.
- Spec: [`docs/official-api/openapi.json`](docs/official-api/openapi.json) ·
  Doc: [`docs/official-api/llms.txt`](docs/official-api/llms.txt)

## A skill (Maestri)

`skill/SKILL.md` orquestra quatro papéis:

| Papel | Função | Toca o portal? |
|---|---|---|
| Batedor | opera o portal, captura e replay | sim, exclusivo |
| Cartógrafo | bundles/source maps e rotas | não |
| Auditor | confere evidência e caça alias inventado | não |
| Escriba | consolida o mapa | não |

Instalação local (Windows):

```powershell
Copy-Item -Recurse skill "$HOME\.agents\skills\sigma-api-discovery"
```

## Regras

- Somente leitura por padrão; escrita só em cliente descartável e com
  confirmação do dono.
- Nenhuma credencial, token ou dado pessoal neste repositório.
- Capturas são sanitizadas (`***`) e truncadas.
- Sem força bruta, sem bypass de 2FA/CAPTCHA, sem IDOR.

## Aviso

Este repositório documenta uma integração autorizada pelo dono do painel.
Não é ferramenta de acesso indevido. Se você não é o dono, não use.

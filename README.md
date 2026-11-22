# sigma-api-discovery

Descoberta e mapa da API interna do painel **Sigma** (ESPACEONEPLAY) feita
**somente pelo navegador**, sem acesso ao código-fonte, usando o portal do
Maestri e um time de 4 agentes.

## Objetivo

Reconstruir os endpoints, a autenticação e os shapes de request/response do
painel Sigma (clientes, planos, servidores, revendas, financeiro, relatórios)
com evidência real — **sem adivinhar campo nem alias**.

O método nasceu do caso Ative App no goiptv: um alias errado
(`historico_id` x `id_cobranca`) custou uma ativação paga e um id perdido.
Aqui vale a mesma regra: só campo observado vira contrato.

## Estado atual

- Alvo: `https://espaceoneplay.sigmab.pro`
- Sessão de teste autenticada (2FA desativada)
- SPA Vue + Vite; API interna em `/api`; token em `localStorage.token`
- **API oficial descoberta:** Sigma Reseller API v1 (OpenAPI 3.1, 39 paths /
  51 operações) em `/api/reseller-api/v1` — ver
  [`docs/api-oficial.md`](docs/api-oficial.md)
- Recon inicial e primeiros endpoints em [`docs/capturas.md`](docs/capturas.md)
- Mapa interno em construção em [`docs/mapa.md`](docs/mapa.md)

## Estrutura

```
docs/
  api-oficial.md # API oficial: auth, escopos, endpoints, webhooks
  official-api/  # openapi.json + llms.txt (documentação pública)
  mapa.md        # mapa da API interna (observado x inferido x pendente)
  capturas.md    # evidências sanitizadas por fluxo
  decisoes.md    # escopo, papéis e regras
  auditoria.md   # achados do Auditor
skill/
  SKILL.md       # skill do Maestri (4 agentes)
  assets/        # hook de rede, inspetor, loader, template
client/          # futuro cliente (Go) — ainda não iniciado
```

`bundles/` (JS proprietário baixado para análise) fica **somente local** e no
`.gitignore`: a licença do bundle proíbe redistribuição e engenharia reversa.
O caminho de integração é a API oficial.

## Caminho de integração: API oficial

O painel publica a **Sigma Reseller API v1** em
`https://espaceoneplay.sigmab.pro/api/reseller-api/v1`:

- `Authorization: Bearer <token>` criado em **Integrações → Reseller API**
  (o plaintext aparece uma única vez).
- Escopos por operação (`x-required-scope`); token pode ser travado por IP.
- Rate limit: 120 req/min por usuário/tenant, com `429` + `Retry-After`.
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

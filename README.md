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
- SPA Vue + Vite; API em `/api`; token em `localStorage.token`
- Recon inicial e primeiros endpoints em [`docs/capturas.md`](docs/capturas.md)
- Mapa em construção em [`docs/mapa.md`](docs/mapa.md)

## Estrutura

```
docs/
  mapa.md        # mapa da API (observado x inferido x pendente)
  capturas.md    # evidências sanitizadas por fluxo
  decisoes.md    # escopo, papéis e regras
skill/
  SKILL.md       # skill do Maestri (4 agentes)
  assets/        # hook de rede, inspetor, loader, template
client/          # futuro cliente (Go) — ainda não iniciado
```

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

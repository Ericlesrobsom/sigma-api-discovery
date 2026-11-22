---
name: sigma-api-discovery
description: Descobrir e mapear a API interna de um painel Sigma usando apenas o navegador do Maestri (portal), sem acesso ao código-fonte. Use quando o pedido for "mapear a API do Sigma", "descobrir os endpoints do painel", "integrar com o Sigma sem documentação" ou reproduzir pelo navegador a técnica de captura de shape usada no goiptv/Ative App.
user-invocable: true
---

# Descoberta da API do Sigma pelo navegador (Maestri)

Esta skill organiza um **time de 4 agentes** (um dono do portal + três
analistas) para reconstruir a API de um painel Sigma **sem código-fonte e
sem documentação**, usando só o portal do Maestri: navegação, snapshot,
`evaluate` e notas compartilhadas.

O princípio é o mesmo que resolveu o caso do Ative App: **não adivinhar
campo nem alias**. Primeiro observa-se a requisição/resposta real; só
depois se documenta ou implementa. Um alias errado (`id` x `data.id` x
`historico_id` x `id_cobranca`) custou uma ativação paga e um id perdido —
não repetir.

## Resultado esperado

Um relatório `sigma-api-map.md` (e uma nota no canvas) contendo, para cada
fluxo acordado:

1. método + path + query;
2. autenticação exigida (header/cookie) e como é obtida;
3. corpo de request com tipos;
4. resposta real (sanitizada) com status e tipos;
5. erros observados;
6. paginação/filtros/ordenação;
7. o que ficou **desconhecido** (sem inventar).

Tudo com carimbo de data/hora e origem (`observado` x `inferido`).

## Regras de ouro (não negociáveis)

1. **Só campo observado vira contrato.** Se não apareceu numa resposta real,
   fica em "desconhecido". Nunca preencher alias por analogia.
2. **Tipo importa.** Registrar `string` x `number` x `bool` x `null` x array.
   IDs de painel costumam ser string mesmo parecendo número.
3. **Somente leitura por padrão.** Criar/editar/renovar/apagar só no cliente
   de teste e **uma ação por vez, com confirmação explícita do dono**.
   Nunca mexer em conta de terceiro, cobrança, disparo ou configuração global.
4. **Segredo não entra em nota, log ou relatório.** Token, cookie, senha,
   `api_key`, CPF/CNPJ, e-mail e telefone são redigidos (`***`). Do login,
   registrar apenas o *nome* do campo e onde o token é guardado.
5. **Uma aba, uma sessão.** Não abrir dois portais no mesmo painel; estado
   concorrente contamina a captura.
6. **Evidência antes de conclusão.** Cada endpoint do relatório aponta o
   fluxo e o horário em que foi capturado.
7. **Sem força bruta, sem bypass.** Não testar IDOR, não trocar id de outro
   tenant, não burlar 2FA/CAPTCHA. Se aparecer dado de outro cliente na
   resposta, parar e reportar.

## Time e papéis (4 agentes)

O time padrão é o que já está conectado no canvas — na sessão de referência:
**Cobalt, Vesper, Kestrel e Onyx** — mais o Maestro. Rodar `maestri list`
antes de tudo e **reutilizar** esses agentes; não recrutar duplicata.

| Papel | Quem | Responsabilidade | Toca o portal? |
|---|---|---|---|
| **Batedor** | 1 agente | opera o portal, instala o hook, captura, replay | **sim, com exclusividade** |
| **Cartógrafo** | 1 agente | baixa bundles/source maps e extrai rotas a partir das URLs salvas | não |
| **Auditor** | 1 agente | confere cada afirmação contra a captura; caça alias inventado | não |
| **Escriba** | 1 agente | consolida `sigma-api-map.md` e a nota final | não |

O Maestro (você) coordena, cria as notas, distribui tarefas e cobra o
ask-back. Se o canvas tiver outros quatro agentes, mantêm-se os papéis e
trocam-se os nomes; o que não pode é **dois agentes dirigindo o mesmo
portal**.

## Pré-requisitos (pedir ao dono antes de começar)

- URL exata do painel (https).
- Conta de **teste** com o menor privilégio que ainda mostre os menus.
- Quais fluxos importam (ex.: login, clientes, planos, servidores,
  financeiro) e o que pode ser criado como descartável.
- Onde salvar o relatório (default: `sigma-api-map.md` no diretório atual).
- Autorização explícita para qualquer escrita. Sem ela: só leitura.

Se a conta exigir 2FA/CAPTCHA, o dono resolve no próprio portal quando
solicitado; o agente nunca tenta contornar.

## Fase 0 — preparação (5 min)

1. Confirmar o time conectado:

```bash
maestri list
```

2. Criar as notas duráveis (recarregar a página não pode apagar o que já
   foi descoberto):

```bash
maestri note create --name "Sigma API — capturas"
maestri note create --name "Sigma API — mapa"
maestri note create --name "Sigma API — decisões"
```

3. Criar o portal **"Sigma"** e ligar **somente o Batedor** a ele:

```bash
maestri portal create "https://URL_DO_SIGMA" "Sigma"
maestri connect "Cobalt" "Sigma"     # nome do Batedor no seu canvas
```

Os outros três **não** recebem o portal. Eles leem as notas e os arquivos
que o Batedor salvar.

4. Briefar cada um com o papel (uma vez, no começo). Se faltar alguém para
   um papel, criar o role e recrutar **um** substituto — o time continua com
   quatro:

```bash
maestri role create "Sigma Batedor" "Você opera o portal 'Sigma' com exclusividade: instala o hook, executa os fluxos e grava capturas sanitizadas na nota 'Sigma API — capturas'. Nunca escreve credencial. Não deixa outro agente clicar no portal." --scope global
maestri recruit "<codename>" --role "Sigma Batedor"
```

5. Registrar no topo da nota de capturas: URL, data/hora UTC, versão do
   painel se visível no rodapé, e o escopo autorizado pelo dono.

## Fase 1 — recon passivo (Batedor)

Instalar o farejador de ambiente (não altera a página; só lê). Use sempre o
loader — passar JS com aspas duplas direto pelo PowerShell faz o `maestri.exe`
receber o script corrompido:

```powershell
$S = "$HOME\.agents\skills\sigma-api-discovery"
& "$S\assets\avaliar.ps1" -Portal "Sigma" -Arquivo "$S\assets\inspecionar.js"
```

```bash
# bash / WSL
~/.agents/skills/sigma-api-discovery/assets/avaliar.sh "Sigma" ~/.agents/skills/sigma-api-discovery/assets/inspecionar.js
```

O retorno traz: frameworks (`__NEXT_DATA__`, `__NUXT__`, React/Vue),
**nomes** de chaves de `localStorage`/`sessionStorage`, **nomes** de cookies,
`<script src>` e recursos já carregados com cara de API.

Registrar na nota:

- base path aparente (`/api`, `/ajax`, `/rest`, `/graphql`);
- framework (define se o login é SPA ou form POST);
- nomes de storage que cheiram a sessão (`token`, `jwt`, `auth`);
- scripts candidatos a conter as rotas.

Complementos úteis:

```bash
maestri portal logs-start "Sigma"
maestri portal snapshot "Sigma"
maestri portal html "Sigma"
```

`html` é o melhor jeito de ler `action`/`method` de um form de login
clássico. `snapshot` dá os `@eN` para clicar.

## Fase 2 — captura de rede (Batedor)

O portal permite `evaluate`, então dá para **embrulhar `fetch` e
`XMLHttpRequest` antes de disparar o fluxo**. O hook é idempotente e
redige segredos sozinho; ele guarda no máximo 300 registros e corta corpos
em 4 KB.

Instalar **antes** de cada fluxo relevante (o hook morre em reload/navegação
completa):

```powershell
& "$S\assets\avaliar.ps1" -Portal "Sigma" -Arquivo "$S\assets\hook-rede.js"
```

Confirmar: deve responder `hook instalado`. Se responder
`hook ja instalado`, seguir.

Fluxo de captura, repetido para cada ação:

1. Limpar o buffer:
   `maestri portal evaluate "Sigma" "window.__sigmaCap = []; 'limpo'"`
2. Executar **uma** ação na UI (`click`, `fill`, `select`, `key`).
3. Ler o buffer com o loader:
   `& "$S\assets\avaliar.ps1" -Portal "Sigma" -Arquivo "$S\assets\exportar.js"`
4. Copiar para a nota de capturas, já sanitizado.
5. Limpar de novo antes do próximo fluxo.

Se a saída for grande, exportar em fatias:

```js
JSON.stringify(window.__sigmaCap.slice(0, 10))
```

e depois `slice(10, 20)`, etc. Não perder captura por truncamento de terminal.

### Login

- **SPA/API:** instalar o hook na tela de login, preencher e enviar; a
  requisição de login (path, body, resposta, onde o token aparece) é a
  evidência mais importante do mapa.
- **Form POST clássico:** o hook não vê navegação de form. Ler
  `action`/`method`/inputs no `html`, enviar, e depois inspecionar nomes de
  cookies/storage na página logada.

Depois do login, **reinstalar o hook** (provável reload) e rodar de novo o
`inspecionar.js`.

### O que capturar em cada endpoint

- método e path **exatos** (com query string);
- headers que importam (nome do header de auth; valor sempre `***`);
- body enviado (JSON real, não o que o formulário "parece" enviar);
- status HTTP e corpo da resposta;
- se o id do recurso é string/número e em que nível está;
- se a lista é paginada (`page`, `per_page`, `offset`, `total`).

## Fase 3 — fluxos do Sigma (Batedor)

Percorrer na ordem, marcando cada item como `observado`, `inferido` ou
`pendente`. O objetivo é cobrir o mesmo domínio do nosso painel, não
adivinhar nomes de rota.

1. **Auth:** login, logout, refresh/expiração, usuário atual, permissões.
2. **Dashboard:** métricas e endpoints que as alimentam.
3. **Clientes:** listar (página 1 e 2), buscar, filtrar, abrir detalhe.
4. **Cliente — escrita (só no descartável):** criar, editar, renovar,
   bloquear/desbloquear; registrar o shape de cada uma.
5. **Planos:** listar, detalhe, criar/editar (se autorizado).
6. **Servidores/DNS:** listar, testar conexão (se houver botão), detalhe.
7. **Bouquets/categorias:** listar e associação com plano/cliente.
8. **Revendas/sub-revendas:** listar, detalhe, créditos (leitura).
9. **Financeiro:** saldo, extrato, cobranças (leitura; nunca pagar).
10. **Relatórios:** parâmetros, paginação, exportações.
11. **Tickets/suporte:** listar e detalhe (leitura).
12. **Logs/auditoria:** filtros e shape.
13. **Configurações:** só leitura; não salvar nada global.

Para cada fluxo, usar o ciclo da Fase 2 e escrever na nota imediatamente.
Se um menu não existir na conta de teste, registrar `indisponível na conta`
— não inferir que o endpoint não existe.

## Fase 4 — bundles e source maps (Cartógrafo)

Quando a captura não cobre um fluxo (ex.: ação escondida), procurar as
rotas no JavaScript servido. Rodar no contexto da página:

```js
(async () => {
  const alvos = [...document.scripts].map(s => s.src).filter(Boolean);
  const saida = [];
  for (const src of alvos.slice(0, 20)) {
    try {
      const txt = await (await fetch(src)).text();
      const rotas = [...new Set((txt.match(/["'`](\/(?:api|ajax|rest|graphql)[a-zA-Z0-9_\-./{}:]*)/g) || [])
        .map(s => s.slice(1)))];
      saida.push({ src, bytes: txt.length, rotas: rotas.slice(0, 100) });
    } catch (e) { saida.push({ src, erro: String(e) }); }
  }
  return JSON.stringify(saida).slice(0, 20000);
})()
```

Se houver `//# sourceMappingURL=`, baixar o `.map` e procurar nomes
originais de função/rota — é o que mais aproxima de "ter o código".

Não confiar em nome minificado; a rota capturada na rede continua sendo a
fonte de verdade.

## Fase 5 — replay controlado (Batedor, a pedido do Auditor)

Só depois de capturar, repetir a chamada **pela própria página** (mesma
sessão, mesmos cookies) para confirmar que o endpoint é acessível direto e
que o shape se repete. Preferir GET; para POST, usar o mesmo body capturado
com valores de teste.

```js
window.__replay = null;
fetch('/CAMINHO_CAPTURADO', {
  method: 'GET',
  credentials: 'include',
  headers: { 'Accept': 'application/json' }
}).then(async r => {
  window.__replay = { status: r.status, body: (await r.text()).slice(0, 2000) };
}).catch(e => { window.__replay = { erro: String(e) }; });
'disparado'
```

Ler depois:

```bash
maestri portal evaluate "Sigma" "JSON.stringify(window.__replay)"
```

Regras do replay:

- um endpoint por vez; nada de varredura de IDs;
- se o endpoint original usava token em header, repetir o header (valor
  mascarado no relatório);
- divergência entre UI e replay é achado: registrar, não "corrigir" por
  conta própria;
- resposta com dado de outro tenant → parar.

## Fase 6 — relatório (Escriba)

Preencher `assets/relatorio-template.md` e salvar como `sigma-api-map.md`
(ou o caminho que o dono indicar). Espelhar o resumo na nota
"Sigma API — mapa" para ficar no canvas.

Qualidade mínima:

- todo endpoint tem request e response reais (sanitizados);
- todo campo tem tipo e exemplo;
- todo `id` relevante tem nome exato e formato (UUID? numérico? string?);
- erros têm status + corpo;
- "desconhecidos" listados explicitamente;
- nenhuma credencial, token ou dado pessoal no documento.

## Definition of Done

- Fluxos acordados cobertos ou marcados `indisponível`/`pendente`.
- Cada endpoint validado por replay (ou justificativa de por que não).
- Relatório salvo e resumo na nota.
- Riscos e limites ditos em voz alta (rate limit, ações irreversíveis,
  dependência de 2FA, dados de terceiros).
- Nada foi criado/cobrado/apagado fora do descartável autorizado.

## Condições de parada (parar e falar com o dono)

- 2FA/CAPTCHA que o agente não pode resolver.
- Qualquer resposta com dados de outro cliente/revenda.
- Ação que gere cobrança, envie mensagem ou apague registro.
- Bloqueio/rate limit (429) — esperar e reduzir o ritmo, não insistir.
- Login falhando repetidamente — não tentar senhas; pedir conferência.
- Mudança de comportamento no meio da captura (deploy do painel).

## Anexos

- `assets/hook-rede.js` — hook idempotente de `fetch`/XHR com redação.
- `assets/exportar.js` — exporta o buffer em JSON.
- `assets/inspecionar.js` — frameworks, storages, cookies, scripts, recursos.
- `assets/avaliar.ps1` / `assets/avaliar.sh` — loader base64 que executa um
  `.js` no portal sem o stripping de aspas do PowerShell.
- `assets/relatorio-template.md` — esqueleto do mapa.

Caminhos relativos ao diretório desta skill (`~/.agents/skills/sigma-api-discovery`).
**PowerShell:** nunca passar JS com aspas duplas direto para `maestri portal
evaluate` (o Windows come as aspas e o script chega corrompido). Usar sempre
`avaliar.ps1`. Refs (`@e3`) vão entre aspas simples, senão o `@` é splatting.

## Orquestração do time (4 agentes)

O Batedor é o gargalo: só ele toca o portal. As outras três frentes rodam
em paralelo porque trabalham sobre notas e arquivos, sem sessão no painel.

### Briefings (uma vez, no início)

- **Batedor:** “Você opera o portal `Sigma` com exclusividade. Fases 1–3:
  recon, hook, login e fluxos. Salve cada captura sanitizada em
  `capturas/<fluxo>.json` e resuma na nota `Sigma API — capturas`. Nunca
  escreva credencial. Não deixe outro agente clicar neste portal.”
- **Cartógrafo:** “Leia a lista de `<script src>` e URLs de API da nota de
  capturas. Baixe os bundles públicos com `curl`/`wget` (sem login), procure
  rotas `/api|/ajax|/rest|/graphql`, source maps e nomes originais. Grave
  `bundles/rotas.md`. Não toque no portal.”
- **Auditor:** “Leia `capturas/` e confira cada endpoint do relatório contra
  a evidência. Aponte: campo sem observação, alias inventado, tipo errado,
  segredo não redigido. Peça captura extra pelo Maestro. Não toque no portal.”
- **Escriba:** “Mantenha `sigma-api-map.md` a partir do template e das notas.
  Separe `observado` x `inferido` x `pendente`. Não invente campo nem
  endpoint para preencher lacuna. Não toque no portal.”

### Rodada 1 — em paralelo

```bash
maestri ask --batch '{
  "Cobalt":  "<briefing do Batedor + fases 1–3>",
  "Vesper":  "<briefing do Cartógrafo>",
  "Kestrel": "<briefing do Auditor>",
  "Onyx":    "<briefing do Escriba>"
}'
```

- Batedor: recon, hook, login, primeiros fluxos.
- Cartógrafo: bundles e rotas (assim que a lista de scripts estiver na nota).
- Auditor: protocolo de evidência + revisão da primeira leva.
- Escriba: esqueleto do relatório.

O `--batch` só retorna quando o mais lento terminar; dimensione o timeout
para o Batedor. Cada agente fecha a tarefa com
`maestri ask "OpenCode" "<resultado>"`.

### Rodada 2 — fechar lacunas

- Auditor lista o que falta; o Maestro pede ao Batedor a captura/replay
  específico (nunca o Auditor direto no portal).
- Cartógrafo confirma rotas que a UI não expôs.
- Escriba preenche o mapa com o que já tem evidência.

### Rodada 3 — passe final

- Auditor: alias? tipo? credencial vazada? endpoint sem replay?
- Escriba: fecha `sigma-api-map.md` e a nota `Sigma API — mapa`.
- Batedor: para de operar; **não fecha o portal** (o dono decide).

### Regras de comunicação

- Segredo só existe dentro do portal. Nunca em `ask`, nota ou arquivo.
- Pedido de captura extra passa pelo Maestro: Auditor → Maestro → Batedor.
- `maestri check "Nome"` para acompanhar sem interromper.
- Em floor, manter `maestri floor status` atualizado nos marcos.

### Artefatos

```
capturas/<fluxo>.json      # Batedor (sanitizado)
bundles/rotas.md           # Cartógrafo
sigma-api-map.md           # Escriba
notas: capturas | mapa | decisões
```

## Prompt de abertura (para o dono colar no Maestro)

```text
Use a skill sigma-api-discovery com o time de 4 agentes do canvas
(ajuste os nomes pelo `maestri list`).
Alvo: https://URL_DO_SIGMA
Conta: teste (peça usuário/senha no chat; não escreva em nota)
Papéis: Batedor = <agente 1>, Cartógrafo = <agente 2>,
        Auditor = <agente 3>, Escriba = <agente 4>.
Escopo: login, clientes, planos, servidores, revendas e financeiro (somente leitura;
criar/editar só no cliente descartável, com minha confirmação a cada ação).
Entrega: sigma-api-map.md + nota "Sigma API — mapa".
Não adivinhe campo: só o que aparecer em resposta real.
```

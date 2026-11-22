# Sigma Reseller API — mapa do contrato oficial

> **Fonte primária:** `docs/official-api/openapi.json` (OpenAPI **3.1.0**,
> `info.version` **1.0.0**). O `docs/official-api/llms.txt` repete o mesmo
> contrato e acrescenta, no cabeçalho, as regras de rate limit. Onde este
> documento diz `spec`, leia-se `openapi.json`; onde diz `llms.txt §`, leia-se
> o texto antes do bloco JSON.
>
> Contagens conferidas no spec: **39 paths**, **51 operações**, **36 escopos
> distintos**. Nenhuma chamada de rede foi feita para produzir este
> documento. Nenhum token real aparece aqui.

## 1. Identificação e URL base

- Título: `Sigma Reseller API` — `info.title`
- Versão: `1.0.0` — `info.version`
- OpenAPI: `3.1.0` — `openapi`
- **URL base:** `https://espaceoneplay.sigmab.pro/api/reseller-api/v1`
  (`servers[0].url`; descrição: “Current Sigma panel”)
- Todos os paths abaixo são relativos a essa base.
- Documentação publicada pelo próprio painel:
  - `https://espaceoneplay.sigmab.pro/api/reseller-api/v1/openapi.json`
  - `https://espaceoneplay.sigmab.pro/api/reseller-api/v1/llms.txt`

## 2. Autenticação Bearer

- Esquema global: `bearerAuth` — `type: http`, `scheme: bearer`,
  `bearerFormat: SigmaResellerApiToken` (`components.securitySchemes.bearerAuth`).
- Header em toda chamada:

```http
Authorization: Bearer <token>
```

- O token é criado na **página de integração da API de revenda** do painel
  (“Reseller API integration page”, `info.description`). O plaintext é
  **mostrado uma única vez**.
- Uma conta pode ter **vários tokens nomeados**, cada um editável e revogável
  de forma independente (`info.description`).
- Cada token carrega **escopos explícitos**; a operação só passa se o token
  tiver o `x-required-scope` daquela operação **e** a conta ainda tiver a
  permissão que o escopo exige.
- O token pode ser travado a endereços IPv4/IPv6 ou redes CIDR. Chamadas de
  outra origem recebem `403 ip_not_allowed`. Token **sem** lista de IPs
  funciona de qualquer endereço (`info.description`).
- Se o dono do painel remover a permissão `use reseller api` do papel da
  conta, **toda** chamada autenticada por token retorna
  `403 permission_denied`.
- Assinatura da integração ausente ou expirada → `402` (`IntegrationRequired`).

### 2.1 Duas autenticações que não se misturam

| Esquema | Usado por | Regra |
|---|---|---|
| `bearerAuth` | todas as operações exceto `/me/webhooks*` | token de API de revenda |
| `panelSessionAuth` | `/me/webhooks*` | credencial de sessão do painel (Sanctum); **token de API não é aceito** |

O `security` global é `bearerAuth`, mas cada operação de webhook declara
`security: [{"panelSessionAuth": []}]` no nível da operação
(`paths./me/webhooks.get.security` e irmãs). O próprio spec diz: “A Reseller
API token is NOT accepted here” (`components.securitySchemes.panelSessionAuth`).

## 3. Como criar o token em Integrações

O spec descreve a página, não o desenho da tela. O procedimento suportado
pelo contrato é:

1. Entrar no painel com um usuário que tenha a permissão `use reseller api`.
2. Abrir **Integrações** — a página que o spec chama de “Reseller API
   integration page”.
3. Criar um **token nomeado** e marcar apenas os escopos necessários
   (`x-required-scope` de cada operação — §4 e §6).
4. Opcionalmente, preencher a **allowlist de IPs/CIDRs**. Sem lista, o token
   funciona de qualquer IP.
5. Copiar o **plaintext uma única vez** e guardá-lo em variável de ambiente
   no servidor. O painel não mostra o valor de novo; para trocar, crie outro
   token e revogue o anterior.
6. Validar com `GET /me` (escopo `me.read`): além do perfil, a resposta traz
   `integrationStatus`, que indica o estado da assinatura (`resellerApi` →
   `active`, `past_due`, `canceled`, etc.).
7. Para desligar um acesso, **revogue** o token na mesma página. Tokens são
   independentes; revogar um não derruba os outros.

Boas práticas do `llms.txt § Integration guidance`: usar Bearer **no servidor**,
pedir o menor privilégio possível e nunca colar token real em chat, bundle de
browser ou repositório.

## 4. Escopos `x-required-scope`

Cada operação declara `x-required-scope`. São **36 escopos distintos**:

| Grupo | Escopos |
|---|---|
| Perfil | `me.read` |
| DNS próprio | `me.dns.read`, `me.dns.update` |
| Clientes | `customers.read`, `customers.create`, `customers.update`, `customers.delete`, `customers.renew`, `customers.change-package`, `customers.change-connections`, `customers.courtesy-days`, `customers.resync`, `customers.migrate-server` |
| Cupons | `coupons.read`, `coupons.create`, `coupons.delete` |
| Revendas | `resellers.read`, `resellers.create`, `resellers.update`, `resellers.credits.add`, `resellers.credits.remove`, `resellers.credits.recharge` |
| DNS de revendas | `resellers.dns.read`, `resellers.dns.update`, `resellers.dns.replace`, `resellers.dns.apply`, `resellers.dns.history`, `resellers.dns.revert` |
| Catálogos | `packages.read`, `servers.read` |
| Relatórios | `reports.customers-count`, `reports.resellers-count`, `reports.membership`, `reports.low-credits`, `reports.new-resellers`, `reports.expiring` |

Regra de decisão (`info.description`):

1. Token sem o escopo da operação → `403 insufficient_scope`.
2. Token com o escopo, mas conta sem a permissão correspondente (ou sem
   `use reseller api`) → `403 permission_denied`.
3. Token com escopo e permissão, mas IP fora da allowlist →
   `403 ip_not_allowed`.

As operações de `/me/webhooks*` **não têm** `x-required-scope`: são de sessão
do painel.

## 5. Rate limit e tratamento de 429

Fonte: `llms.txt § Rate limits and response headers` e
`components.responses.RateLimited`.

- **120 requisições por minuto por usuário por tenant**, somando **todos** os
  tokens daquele usuário. Trocar/rotacionar token **não** zera a cota.
- Respostas normais que passam pelo throttle trazem:

| Header | Significado |
|---|---|
| `X-RateLimit-Limit` | máximo de requisições por minuto (ex.: `120`) |
| `X-RateLimit-Remaining` | requisições restantes depois desta chamada |

- Em `429` por quota da aplicação, além dos anteriores:

| Header | Significado |
|---|---|
| `Retry-After` | segundos a esperar antes de tentar de novo |
| `X-RateLimit-Reset` | timestamp Unix (segundos) do reset da cota |

- `Retry-After` e `X-RateLimit-Reset` **não** aparecem em respostas normais.
- Falha de autenticação tem **bucket separado** de **10 tentativas/minuto por
  IP**, cujo `429` traz **somente** `Retry-After`. O spec não afirma se
  requisições `401`/`403` também consomem a cota autenticada de 120/min.
- Documentação pública e o gerenciamento de webhooks por sessão do painel
  **não** usam a cota de token.
- Se os headers não vierem, **não** assuma cota ilimitada: falha de
  autenticação e respostas de Nginx/Cloudflare podem omiti-los. Use backoff
  limitado com jitter quando não houver atraso informado.
- Nunca repita mutações às cegas; honre `Retry-After` em vez de tentar
  imediatamente (`llms.txt`).

## 6. Endpoints — 39 paths, 51 operações

Distribuição por grupo (contagem derivada de `paths`):

| Grupo | Paths | Operações |
|---|---:|---:|
| `me` | 1 | 1 |
| `customers` | 9 | 12 |
| `coupons` | 2 | 4 |
| `resellers` | 5 | 7 |
| `dns` | 7 | 9 |
| `packages` | 1 | 1 |
| `servers` | 1 | 1 |
| `reports` | 6 | 6 |
| `webhooks` | 7 | 10 |
| **Total** | **39** | **51** |

> `scope` = `x-required-scope` da operação. `—` nas linhas de webhook significa
> “sem escopo de token; exige sessão do painel”.

### 6.1 Perfil (1)

| # | Método | Path | Resumo | Escopo |
|---:|---|---|---|---|
| 1 | GET | `/me` | Snapshot de perfil não sensível, usado por SDKs para bootstrap | `me.read` |

### 6.2 Clientes (9 paths / 12 operações)

| # | Método | Path | Resumo | Escopo |
|---:|---|---|---|---|
| 2 | GET | `/customers` | Lista clientes, mais novos primeiro; filtros combináveis | `customers.read` |
| 3 | POST | `/customers` | Cria cliente | `customers.create` |
| 4 | GET | `/customers/by-username/{username}` | Busca cliente por username **exato** | `customers.read` |
| 5 | GET | `/customers/{customer}` | Detalha cliente | `customers.read` |
| 6 | PUT | `/customers/{customer}` | Atualiza cliente | `customers.update` |
| 7 | DELETE | `/customers/{customer}` | Remove cliente | `customers.delete` |
| 8 | POST | `/customers/{customer}/renew` | Renova assinatura (pacote/conexões atuais ou informados) | `customers.renew` |
| 9 | PUT | `/customers/{customer}/package` | Troca o pacote | `customers.change-package` |
| 10 | PUT | `/customers/{customer}/connections` | Troca o número de conexões | `customers.change-connections` |
| 11 | POST | `/customers/{customer}/courtesy-days` | Adiciona dias de cortesia | `customers.courtesy-days` |
| 12 | POST | `/customers/{customer}/resync` | Ressincroniza com o servidor de provisionamento | `customers.resync` |
| 13 | PUT | `/customers/{customer}/server-migration` | Migra o cliente para outro servidor | `customers.migrate-server` |

Filtros de `GET /customers`: `page`, `per_page`, `username` (match parcial,
mínimo 3 caracteres), `status` (`ACTIVE`/`INACTIVE`/`EXPIRED`), `is_trial`
(`YES`/`NO`). `EXPIRED` usa `expires_at`; `ACTIVE`/`INACTIVE` só consideram
clientes não expirados (`paths./customers.get.parameters`).

### 6.3 Cupons (2 / 4)

| # | Método | Path | Resumo | Escopo |
|---:|---|---|---|---|
| 14 | GET | `/coupons` | Lista cupons, mais novos primeiro | `coupons.read` |
| 15 | POST | `/coupons` | Cria cupom; o código é gerado pela Sigma | `coupons.create` |
| 16 | GET | `/coupons/{coupon}` | Detalha cupom e uso | `coupons.read` |
| 17 | DELETE | `/coupons/{coupon}` | Apaga cupom; pedidos já feitos mantêm o desconto | `coupons.delete` |

Filtros: `status`, `customer_id`, `code` (`paths./coupons.get.parameters`).

### 6.4 Revendas (5 / 7)

| # | Método | Path | Resumo | Escopo |
|---:|---|---|---|---|
| 18 | GET | `/resellers` | Lista revendas downline; tamanho de página **fixo em 25** | `resellers.read` |
| 19 | POST | `/resellers` | Cria revenda | `resellers.create` |
| 20 | GET | `/resellers/{reseller}` | Detalha revenda | `resellers.read` |
| 21 | PUT | `/resellers/{reseller}` | Atualiza revenda | `resellers.update` |
| 22 | POST | `/resellers/{reseller}/credits/add` | Adiciona créditos | `resellers.credits.add` |
| 23 | POST | `/resellers/{reseller}/credits/remove` | Remove créditos | `resellers.credits.remove` |
| 24 | POST | `/resellers/{reseller}/credits/recharge` | Auto-recarga de créditos (top-up conduzido pela revenda) | `resellers.credits.recharge` |

`GET /resellers` aceita `page`; o spec não declara `per_page` nessa lista
(tamanho fixo em 25) (`paths./resellers.get`).

### 6.5 DNS (7 / 9)

| # | Método | Path | Resumo | Escopo |
|---:|---|---|---|---|
| 25 | GET | `/me/dns` | DNS próprio por servidor IPTV | `me.dns.read` |
| 26 | PUT | `/me/dns` | Define ou limpa (`null`) o DNS próprio de um servidor | `me.dns.update` |
| 27 | GET | `/resellers/dns` | Lista DNS das revendas **diretas** | `resellers.dns.read` |
| 28 | GET | `/resellers/{reseller}/dns` | DNS de uma revenda **direta** | `resellers.dns.read` |
| 29 | PUT | `/resellers/{reseller}/dns` | Define ou limpa o DNS de uma revenda direta | `resellers.dns.update` |
| 30 | POST | `/resellers/dns/replace` | Substitui `search` por `replace` em massa | `resellers.dns.replace` |
| 31 | POST | `/resellers/dns/apply` | Copia o DNS próprio para as revendas diretas | `resellers.dns.apply` |
| 32 | GET | `/resellers/dns/history` | Histórico de mudanças de DNS, mais recente primeiro | `resellers.dns.history` |
| 33 | POST | `/resellers/dns/history/{batch}/revert` | Reverte um lote de mudanças | `resellers.dns.revert` |

Regras explícitas do spec:

- Listagem e edição cobrem **somente revendas diretas**, “regardless of depth
  permissions”; qualquer outra revenda retorna `404`.
- `apply` tem modos `empty` (só quem não tem DNS) e `all` (sobrescreve todas).
- `revert` pula entradas alteradas depois; `404` se o lote não tocou você ou
  suas diretas; `403` se tocou alguém mais profundo; `422` se já foi revertido
  ou não há o que reverter.
- Em `PUT /me/dns` e `PUT /resellers/{reseller}/dns`, servidor indisponível
  retorna `403` **com apenas `message`** (sem o campo `error`).

### 6.6 Catálogos (2 / 2)

| # | Método | Path | Resumo | Escopo |
|---:|---|---|---|---|
| 34 | GET | `/packages` | Catálogo de pacotes (somente leitura) | `packages.read` |
| 35 | GET | `/servers` | Catálogo de servidores (somente leitura) | `servers.read` |

### 6.7 Relatórios (6 / 6)

| # | Método | Path | Resumo | Escopo |
|---:|---|---|---|---|
| 36 | GET | `/reports/customers-count` | Snapshot `{count}` de clientes | `reports.customers-count` |
| 37 | GET | `/reports/resellers-count` | Snapshot `{count}` de revendas | `reports.resellers-count` |
| 38 | GET | `/reports/membership` | Revendas **filhas diretas** com membership ativa e valor devido | `reports.membership` |
| 39 | GET | `/reports/low-credits` | Revendas com saldo baixo | `reports.low-credits` |
| 40 | GET | `/reports/new-resellers` | Revendas criadas recentemente | `reports.new-resellers` |
| 41 | GET | `/reports/expiring` | Clientes próximos do vencimento | `reports.expiring` |

Atenção: `low-credits`, `new-resellers` e `expiring` **não declaram**
parâmetros de paginação, embora a resposta use o envelope `GenericReport`
com `pagination`. `membership` aceita `page`/`per_page`
(`paths./reports.*.get.parameters`).

### 6.8 Webhooks (7 / 10) — sessão do painel

| # | Método | Path | Resumo | Escopo |
|---:|---|---|---|---|
| 42 | GET | `/me/webhooks` | Lista webhooks | — (sessão do painel) |
| 43 | POST | `/me/webhooks` | Cria webhook; retorna o `secret` **uma vez** | — |
| 44 | GET | `/me/webhooks/{webhook}` | Detalha webhook (sem secret) | — |
| 45 | PUT | `/me/webhooks/{webhook}` | Atualiza URL, eventos ou `active` | — |
| 46 | DELETE | `/me/webhooks/{webhook}` | Apaga webhook (`204`); entregas pendentes viram `cancelled_webhook_deleted` | — |
| 47 | POST | `/me/webhooks/{webhook}/rotate-secret` | Emite novo secret HMAC; o anterior para na hora | — |
| 48 | GET | `/me/webhooks/{webhook}/deliveries` | Lista entregas; filtro `status` | — |
| 49 | POST | `/me/webhooks/{webhook}/deliveries/replay` | Reenfileira até 100 entregas elegíveis | — |
| 50 | POST | `/me/webhooks/{webhook}/deliveries/{delivery}/replay` | Reenvia **uma** entrega | — |
| 51 | POST | `/me/webhooks/{webhook}/test` | Enfileira um `webhook.test` | — |

## 7. Envelopes, paginação e IDs

### 7.1 Envelope de resposta

- Recurso único: `{ "data": { ... } }` (`components.responses.*`).
- Lista: `{ "data": [ ... ], "meta"|"pagination": { ... } }`.
- Contagem: `{ "data": { "count": <integer> } }` (`CountReport`).

**Cuidado com o nome do metadado** — o spec não é uniforme:

| Resposta | Metadado |
|---|---|
| `CustomerCollection`, `CouponCollection`, `WebhookCollection`, `DeliveryCollection` | `meta` |
| listas de `Package` e `Server` | `meta` |
| `ResellerCollection`, `ResellerDnsCollection`, `DnsHistoryCollection` | `pagination` |
| `MembershipReport`, `GenericReport` | `pagination` |
| `OwnDnsCollection` | nenhum |

`PaginationMeta` = `{ current_page, per_page, total, last_page, from|null,
to|null }`. **Não** há `links` nesse schema (isso é do paginator do painel,
não do contrato oficial).

### 7.2 Parâmetros de paginação

- `page`: integer, mínimo 1, default **1**.
- `per_page`: integer, mínimo 1, **máximo 100**, default **25**.
- Exceção: `GET /resellers` tem página fixa de **25**; o spec só declara
  `page` para essa lista.

### 7.3 IDs e formatos

| Recurso | Campo | Formato no spec |
|---|---|---|
| Cliente | `id` / path `{customer}` | string; path descrito como **Hashid** |
| Cupom | `id` / path `{coupon}` | string; **Hashid** |
| Revenda | `id` / path `{reseller}` | string; **Hashid** |
| Lote de DNS | `batch_id` / path `{batch}` | string; **Hashid** |
| Webhook | `id` | string, `format: uuid` |
| Evento de webhook | envelope `id` | string **ULID**, igual em toda retentativa |
| Linha de DNS de revenda | `id` | `userHash:serverHash` |
| Data/hora | `*_at`, `expires_at`, `occurred_at` | string `date-time` (ISO 8601) |
| Dinheiro em centavos | `Coupon.value` (FIXED), `MembershipAmount.membership_total` e `membership_breakdown[].price/amount` | integer; unidade declarada em centavos no spec |

Campos `YES`/`NO` são **string**, não boolean (`Customer.is_trial`,
`Reseller.membership_active`, etc.). `Customer.connections` é integer;
`Reseller.credits` e `Package.credits` são number.

## 8. Schemas principais

### 8.1 `Me` — resposta de `GET /me`

```ts
Me {
  id: string
  username: string
  creditsBalance: integer
  integrationStatus: Array<{
    key: string                  // exemplo no spec: "resellerApi"
    status: "inactive" | "active" | "past_due" | "canceling" | "canceled" | "super_admin_bypass"
    expiresAt: string | null      // date-time
  }>
  membership: {
    membership_active: "YES" | "NO"
    membership_type: string | null
    membership_plan_type: string | null
    membership_expiry_date: string | null
    membership_expiry_time: string | null
    membership_expiry_at: string | null   // date-time
    membership_expiry_date_days: integer | null
  } & MembershipAmount
}
```

`MembershipAmount`: `membership_total` (integer|null, centavos; null quando
inativa), `membership_total_count` (integer), `membership_amount_locked`
(boolean), `membership_breakdown` (array de `{description, quantity, price,
amount, is_average_price, server_connections[]}`).

### 8.2 `Customer`

`required: []` — nenhum campo é declarado obrigatório na resposta.

```ts
Customer {
  id: string
  server_id: string | null
  package_id: string | null
  app_server_id: string | null
  app_package_id: string | null
  created_at: string | null          // date-time
  deleted_at: string | null          // date-time
  updated_at: string | null          // date-time
  expires_at: string | null          // date-time
  expires_at_tz: string | null
  username: string
  password: string | null
  mac_address: string | null
  name: string | null
  email: string | null               // format: email
  telegram: string | null
  whatsapp: string | null
  status: "ACTIVE" | "INACTIVE" | "EXPIRED"
  connection_type: string | null
  is_trial: "YES" | "NO"
  is_mag: "YES" | "NO"
  is_asnlock: "YES" | "NO"
  is_isplock: "YES" | "NO"
  is_migrated: "YES" | "NO"
  is_restreamer: "YES" | "NO"
  connections: integer
  has_multiple_connections: boolean
  server: string | null
  package: string | null
  package_is_adult: boolean
  note: string | null
  currency: string | null
  plan_price: integer | null
  renew_url: string | null
  playlist: string | null
  bouquets: unknown | null           // spec não declara o tipo
  m3u_url: string | null
  m3u_url_short: string | null
  is_multi_server: boolean
  additional_servers: Array<Record<string, unknown>>
}
```

### 8.3 `Package`

```ts
Package {
  id: string
  server_id: string
  server: string | null
  name: string
  status: string
  is_mag: "YES" | "NO" | null
  is_asnlock: "YES" | "NO" | null
  is_isplock: "YES" | "NO" | null
  is_trial: "YES" | "NO" | null
  is_adult: boolean
  is_restreamer: "YES" | "NO" | null
  plan_price: integer              // unidade não declarada no spec
  credits: number
  duration: integer
  duration_in: string
  connections: integer
}
```

### 8.4 `Server`

```ts
Server {
  id: string
  name: string
  type: string
  status: string
  timezone: string | null
  connection_type: string | null
  has_default_customer_password: boolean
  allowed_bouquets: unknown | null   // spec não declara o tipo
  will_count_membership: "YES" | "NO" | null
  is_isplock: "YES" | "NO" | null
  subtract_one_connection_when_calculating_membership: "YES" | "NO" | null
  cost_per_customer: unknown | null  // spec não declara o tipo
  max_customers: integer | null
  max_connections: integer | null
  api_version: string | null
}
```

### 8.5 `Reseller`

`required: []`.

```ts
Reseller {
  id: string
  created_at: string | null          // date-time
  updated_at: string | null
  last_login_at: string | null
  username: string
  name: string | null
  telegram: string | null
  whatsapp: string | null
  email: string | null               // format: email
  note: string | null
  status: "ACTIVE" | "INACTIVE"
  credits: number
  role: string | null
  role_label: string | null
  last_recharge_at: string | null
  disable_after_days_without_recharge: integer | null
  membership_active: "YES" | "NO" | null
  membership_type: string | null
  membership_plan_type: string | null
  membership_cost: unknown | null
  membership_cost_extra: unknown | null
  membership_credits_to_recharge: integer | null
  membership_days_recurrency: integer | null
  membership_min_customers_to_charge: unknown | null
  membership_max_number_of_customers: unknown | null
  membership_expiry_date: string | null
  membership_expiry_time: string | null
  membership_reset_credits_on_expiry_date: "YES" | "NO" | null
  membership_expiry_date_days: integer | null
  membership_expiry_at: string | null
  membership_expiry_at_formatted: string | null
  membership_seconds_remaining: integer | null
}
```

### 8.6 `Webhook` e `WebhookWithSecret`

```ts
Webhook {
  id: string                        // uuid
  url: string                       // uri
  events: WebhookEvent[]
  active: boolean
  consecutive_failures: integer
  paused_at: string | null          // date-time
  created_at: string                 // date-time
}

WebhookWithSecret = Webhook & {
  secret: string                    // HMAC; mostrado só no create/rotate
}
```

`WebhookCreate` exige `url` e `events`; `active` default `true`. A URL
**precisa ser HTTPS**; hosts internos e faixas de IP privadas são rejeitados
(`components.schemas.WebhookCreate`).

### 8.7 Bodies de escrita (resumo)

```ts
CustomerCreate {
  // required: server_id, package_id
  server_id: string
  package_id: string
  username?: string
  password?: string
  mac_address?: string | null
  plan_price?: unknown | null
  expires_at?: string | null
  trial_hours?: number | null
  connections?: integer            // default 1, mínimo 1
  name?, email?, telegram?, whatsapp?, note?: string | null
  playlist?: string | null
  bouquets?: unknown | null
  status?: "ACTIVE" | "INACTIVE" | null
  is_mag?, is_asnlock?, is_isplock?: "YES" | "NO" | null
}

CustomerUpdate { /* todos os campos opcionais; mesmos nomes, subconjunto */ }

ResellerCreate {
  // required: username, password, role, credits
  role: string
  credits: integer                 // mínimo 0
  username: string
  password: string
  email?, name?, telegram?, whatsapp?, note?: string | null
  membership_active?: "YES" | "NO" | null
  membership_type?: "FIXED" | "PER_ACTIVE_CUSTOMER" | "PLAN" | null
  membership_plan_type?: "FIXED" | "PER_ACTIVE_CUSTOMER" | null
  membership_cost?, membership_cost_extra?: unknown | null
  membership_days_recurrency?: integer | null   // 1..3650
  membership_min_customers_to_charge?: unknown | null
  membership_max_number_of_customers?: unknown | null
  membership_expiry_date?: string | null         // format: date
  membership_expiry_time?: string | null
  membership_credits_to_recharge?: integer | null
  membership_reset_credits_on_expiry_date?: "YES" | "NO" | null
}

CreditsBody {
  // required: credits
  credits: number                  // mínimo 1
  note?, private_note?: string | null    // maxLength 2000
  reference?: string | null              // maxLength 255
}

DnsUpdate  { server_id: string; dns: string | null }   // uri, maxLength 255
DnsReplace { search: string; replace: string; server_id?: string | null }
DnsApply   { server_id: string; mode: "empty" | "all" }
```

## 9. Webhooks

### 9.1 Quem pode gerenciar

Somente **sessão do painel** (`panelSessionAuth`). Token de API de revenda
**não é aceito**; a operação exige credencial de sessão do painel, e as
respostas documentadas incluem `401`. Não há escopo de token para
`/me/webhooks*`. O `llms.txt § Integration guidance` diz para configurar no
painel e **não automatizar o login do painel**.

### 9.2 Eventos

`WebhookEvent` (15 valores):

```text
customer.created            customer.updated            customer.deleted
customer.renewed            customer.expired
customer_order.created      customer_order.paid
reseller.created            reseller.updated            reseller.deleted
credits.added               credits.removed             credits.recharged
credit_order.created        credit_order.paid
```

Além desses, `webhook.test` é aceito em entregas de teste
(`WebhookDelivery.event` e `webhooks.webhook.test`). O evento de teste é
enfileirado “whatever events the webhook subscribes to”, mas o webhook
precisa estar ativo.

### 9.3 Envelope entregue

```json
{
  "id": "<ULID>",
  "event": "<nome do evento>",
  "occurred_at": "<ISO 8601 com offset>",
  "data": { }
}
```

`id` é **igual em toda retentativa** do mesmo evento; use-o para deduplicar.
`data` é específico do evento (`WebhookEnvelope`).

### 9.4 Assinatura HMAC (`x-hmac-verification`)

- Header: `X-Sigma-Signature: t=<unix_timestamp>,v1=<hex>`
- `t` = Unix time em segundos da tentativa; **cada retry assina de novo**.
- `v1` = hex **minúsculo** de `HMAC_SHA256(secret, t + "." + raw_body)`.
- Não há prefixo `sha256=`; **não** é HMAC só do body.
- Verificação:
  1. Parsear como pares `key=value` separados por vírgula; não depender da
     ordem; ignorar chaves desconhecidas.
  2. Rejeitar se `t` estiver a mais de **300 segundos** do relógio local.
  3. Calcular sobre os **bytes crus** recebidos; parsear e re-serializar o
     JSON quebra a assinatura.
  4. Comparar em tempo constante; ausente ou inválida → `401`.
- Outros headers: `X-Sigma-Event`, `X-Sigma-Delivery-Id` (único por
  tentativa) e `X-Sigma-Webhook-Id`.
- O secret é devolvido **uma vez** no create ou no rotate; rotacionar
  invalida o anterior imediatamente.

### 9.5 Entregas e replay

Status de `WebhookDelivery` (`components.schemas.WebhookDelivery.status`):

```text
pending | delivered | failed | dead_letter
cancelled_integration_expired | cancelled_webhook_deleted
```

Campos relevantes: `attempt` (mínimo 1), `http_status` (int|null),
`response_excerpt` (string|null), `latency_ms` (int|null), `dispatched_at`,
`delivered_at`, `failed_at`, `replay_count`, `replayed_at`, `replayable`
(boolean), `payload` (`WebhookEnvelope`), `created_at`.

**Replay em lote** — `POST /me/webhooks/{webhook}/deliveries/replay`:

- Enfileira as **100 mais antigas dos últimos 7 dias** com status
  `dead_letter`, `cancelled_integration_expired` ou
  `cancelled_webhook_deleted`, **ou** `pending` nunca enviadas e enfileiradas
  há mais de 1 hora.
- Reenvia com o **mesmo body**, inclusive o `id` do evento, e **nova
  assinatura**.
- Resposta: `{data:{queued, remaining}}`; chamar de novo enquanto
  `remaining > 0`.
- O webhook precisa estar ativo; caso contrário `422`.

**Replay individual** — `POST /me/webhooks/{webhook}/deliveries/{delivery}/replay`:

- Só `dead_letter`, cancelada, ou `pending` travada (nunca enviada, > 1 h).
- Mesmo body e nova assinatura.
- Qualquer outra entrega, ou webhook pausado, retorna `422`.

**Delete**: entregas pendentes passam a `cancelled_webhook_deleted`.

## 10. Erros

Fonte: `components.responses.*` e `components.schemas.Error`.

| HTTP | `error` | Corpo | Quando |
|---:|---|---|---|
| **401** | — | `{message: string}` | token Bearer ausente ou inválido (`Unauthorized`) |
| **402** | — | `{message: string}` | assinatura da integração ausente/expirada (`IntegrationRequired`) ou créditos insuficientes (`CreditsRequired`, em renew/add) |
| **403** | `insufficient_scope` | `{error, message}` | token não tem o `x-required-scope` da operação |
| **403** | `permission_denied` | `{error, message}` | conta não tem a permissão que o escopo exige, ou o dono removeu `use reseller api` do papel |
| **403** | `ip_not_allowed` | `{error, message}` | IP de origem fora da allowlist do token |
| **403** | — | `{message}` (só) | servidor indisponível para a conta em `PUT /me/dns` e `PUT /resellers/{reseller}/dns` |
| **404** | — | `{message: string}` | recurso inexistente **ou não pertencente ao ator** (`NotFound`) |
| **409** | — | `{message: string}` | username duplicado; `by-username` com mais de um cliente; conflito de replay de idempotência |
| **422** | — | `{message, errors: {campo: string[]}}` | validação do body (`ValidationError`) |
| **429** | — | `{message}` + headers | quota autenticada ou bucket de falha de auth |
| **400** | — | `{message}` | renovação ou migração recusada; a mensagem diz o motivo |

Detalhes que importam:

- `403` **nem sempre** tem `{error}`: nas duas operações de DNS citadas, o
  spec descreve “403 with only `message`”. Não assuma o campo `error` sempre.
- `404` é a resposta para recurso de outro ator; não é só “não existe”.
- `429` autenticado traz `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
  `Retry-After` e `X-RateLimit-Reset`. O `429` do bucket de falha de
  autenticação (10/min por IP) traz **somente** `Retry-After`.
- O texto de `message` não é contrato; só o status e o campo `error` (quando
  documentado) são.

## 11. Exemplo curl (placeholder)

```bash
export SIGMA_API_BASE_URL="https://espaceoneplay.sigmab.pro/api/reseller-api/v1"
export SIGMA_API_TOKEN="<SEU_TOKEN_AQUI>"

# Leitura segura: perfil + integrationStatus; -i mostra os headers de rate limit
curl -sS -i \
  -H "Authorization: Bearer $SIGMA_API_TOKEN" \
  "$SIGMA_API_BASE_URL/me"
```

Lista paginada de clientes ativos:

```bash
curl -sS \
  -H "Authorization: Bearer $SIGMA_API_TOKEN" \
  "$SIGMA_API_BASE_URL/customers?page=1&per_page=25&status=ACTIVE"
```

- `<SEU_TOKEN_AQUI>` é placeholder; nunca versione o valor real.
- O contrato define o token **apenas** no header `Authorization`; não há token
  em query string.
- Para inspecionar a cota sem mutar nada, use `GET /me` com `-i` (foi o
  exemplo do próprio `llms.txt`).

## 12. Limitações da conta `revenda-pos`

Esta seção combina **evidência do painel** (não do spec) com as regras que o
spec impõe a uma conta de revenda. As duas fontes estão separadas.

### 12.1 O que foi observado na conta (painel)

Fonte: `docs/auditoria.md` §A14/A17 e `NOTA-capturas.md`.

- Papel `revenda-pos`, `is_master=false`, `parent_user_id=null`, status
  `ACTIVE`, `membership_active=YES`; o snapshot auditado tem **54 permissões**
  (3 amostradas), conforme `docs/auditoria.md` §A14.
- É uma **revenda raiz**, não admin mestre do painel.
- Menus ausentes nessa conta: **Servidores** (o grupo Sistema só tem Planos e
  Pacote de Créditos), tickets/suporte, logs/auditoria e configurações
  globais.
- A tela “Novos Conteúdos” (`#/content`) consome `/api/servers` e fica em
  spinner, sem concluir a lista.
- Apesar do menu ausente, `GET /api/servers` do **painel** responde e é usado
  por outras telas. Ou seja: menu escondido ≠ endpoint inexistente.
- Volume visto na sessão: 253 clientes, 32 pacotes, 2 servidores, 255
  lançamentos de crédito. São **contagens da sessão**, não limites do
  contrato.

### 12.2 O que o contrato oficial restringe

- `/customers*` opera sobre “customers you own”; recurso de outro ator
  retorna `404` (`NotFound`: “not found (or not owned by the actor)”).
- `/resellers` é descrito como “downline resellers”. `/reports/membership`
  lista apenas **revendas filhas diretas** com membership ativa.
- Listagem/edição de DNS cobre **somente revendas diretas**, “regardless of
  depth permissions”; qualquer outra retorna `404`.
- `/packages` e `/servers` são **read-only**; não há operação de escrita de
  catálogo no contrato 1.0.0.
- Não existe, no contrato 1.0.0, endpoint para configuração do painel,
  usuários/papéis, gateways de pagamento, tickets, logs ou exportações.
- `/me/webhooks*` exige **sessão do painel**; token de API não é aceito.
- Cada chamada exige **escopo no token + permissão na conta**. Sem
  `use reseller api` → `403 permission_denied`; assinatura ausente/expirada →
  `402`; IP fora da allowlist → `403 ip_not_allowed`.

### 12.3 O que ainda não se pode afirmar (pendente)

- Se a conta consegue **criar token** — a página de integração pode não estar
  disponível para o papel `revenda-pos`.
- Quais dos **36 escopos** o papel concede. O token só recebe o que for
  marcado, e a conta só passa se tiver a permissão correspondente; o spec não
  publica o mapa papel → permissão.
- Status real da assinatura: confirmar em `GET /me` →
  `integrationStatus[key="resellerApi"].status`.
- Se `servers.read` e `GET /servers` funcionam para esta conta. O spec
  permite; a UI esconde o menu. Só um teste com token resolve.
- Se 120 req/min bastam para o volume da operação; medir
  `X-RateLimit-Remaining` em uso real.
- Quaisquer limites de profundidade além dos explicitamente citados
  (DNS e membership são “direct”; o resto não declara profundidade).

### 12.4 Não confundir os dois `/me`

| Este contrato | Painel |
|---|---|
| `GET /api/reseller-api/v1/me` | `GET /api/auth/me` |
| `{data:{id, username, creditsBalance, integrationStatus, membership}}` | objeto do usuário logado (`role`, `permissions`, `parent`, etc.) |
| token de API de revenda | token de sessão do painel (Sanctum) |

O `auth/me` do painel **não** é este contrato e não deve ser usado como
referência de shape para o cliente oficial.

## 13. O que o spec não afirma

Para evitar alias inventado, ficam explícitos os pontos sem contrato:

- Não há header de **idempotência** documentado; `409` menciona “idempotency
  replay mismatch”, mas o mecanismo não é descrito.
- Não há endpoint de **exportação** nem de download de relatório.
- Não há endpoint de **refresh** de token de API nem de revogação via API;
  revogação é pela página de integração.
- Não há `links` no `PaginationMeta` oficial.
- `bouquets`, `allowed_bouquets`, `cost_per_customer`, `plan_price` de
  create/update e alguns `membership_*` **não têm tipo declarado** no spec
  (`nullable: true` apenas). Não inferir string/array/centavos.
- Os relatórios `low-credits`, `new-resellers` e `expiring` não declaram
  parâmetros de paginação, apesar do envelope `GenericReport`.
- O texto de `message` dos erros não é contrato.
- O contrato não publica a lista de permissões de conta exigida por cada
  escopo; só o comportamento `403 permission_denied`.

---

Documento escrito em 2026-11-22 a partir de `docs/official-api/openapi.json`
e `docs/official-api/llms.txt`; a seção 12 usa também `docs/auditoria.md` e
`NOTA-capturas.md`, citados no texto. Nenhum token real foi incluído.

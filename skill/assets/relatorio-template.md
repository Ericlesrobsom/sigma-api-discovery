# Mapa da API — Sigma

> Preencher só com o que foi **observado** em resposta real. Marcar cada
> linha como `observado`, `inferido` ou `pendente`. Nenhuma credencial,
> token ou dado pessoal neste documento.

## 1. Ambiente e conta

- URL:
- Data/hora UTC da captura:
- Versão do painel (se visível):
- Conta de teste (perfil/permissões):
- Escopo autorizado pelo dono:

## 2. Autenticação

- Tipo (cookie de sessão / bearer / ambos):
- Endpoint de login:
- Campos do request:
- Onde o token é guardado (nome da chave, não o valor):
- Expiração/refresh observados:
- Como o logout invalida:

## 3. Endpoints

| # | Método | Path | Auth | Request (campos/tipos) | Resposta (status + shape) | Fluxo/evidência | Confiança |
|---|--------|------|------|------------------------|---------------------------|-----------------|-----------|
| 1 | | | | | | | |

## 4. Schemas observados

### 4.1 `<nome do recurso>`

```json
{}
```

Tipos:

| Campo | Tipo | Nulo? | Observação |
|-------|------|-------|------------|
| | | | |

## 5. Fluxos

### 5.1 Login

1.
2.

### 5.2 Listar clientes

- Paginação:
- Busca:
- Filtros:

### 5.3 Demais fluxos

(um subtítulo por fluxo coberto)

## 6. Erros observados

| Status | Corpo (sanitizado) | Quando acontece |
|--------|--------------------|-----------------|
| | | |

## 7. Paginação, filtros e ordenação

- Parâmetros:
- Default:
- Limite máximo observado:

## 8. IDs e chaves de correlação

| Recurso | Campo exato | Tipo/formato | Onde aparece | Usado por |
|---------|-------------|--------------|--------------|-----------|
| | | | | |

## 9. Desconhecidos / pendências

- [ ]
- [ ]

## 10. Riscos e limites

- Ações irreversíveis:
- Dados de terceiros vistos:
- Rate limit:
- Dependência de 2FA/CAPTCHA:
- Diferenças entre conta de teste e conta real:

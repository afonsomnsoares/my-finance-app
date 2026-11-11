# Personal Finances

Aplicação pessoal de gestão financeira: despesas, orçamentos por categoria,
relatórios, e uma carteira de investimentos com cotações em tempo real.

**Stack:** React 19 + Vite · Express 5 · PostgreSQL + Prisma 7

---

## Arranque rápido

```bash
# 1. Dependências
npm install
npm install --prefix backend

# 2. Configuração
cp backend/.env.example backend/.env
#    Preenche DATABASE_URL e gera o SESSION_SECRET:
openssl rand -base64 48

# 3. Base de dados
npx prisma migrate deploy --schema backend/prisma/schema.prisma

# 4. Cria a tua conta (nome, email, utilizador e password)
npm run create-user

# 5. Arranca tudo
npm run dev
```

Frontend em `http://localhost:3000`, API em `http://127.0.0.1:5000`.

---

## Scripts

### Raiz
| Comando | O que faz |
|---|---|
| `npm run dev` | Backend + frontend em simultâneo |
| `npm run start:frontend` | Só o Vite |
| `npm run build` | Build de produção para `dist/` |
| `npm test` | Testes do frontend (Vitest) |
| `npm run test:backend` | Testes do backend, incluindo os de integração |
| `npm run test:all` | Os dois |

### Backend (`npm run --prefix backend <script>`)
| Comando | O que faz |
|---|---|
| `dev` | Servidor com nodemon |
| `start` | Servidor de produção |
| `create-user` | (também na raiz) Cria a conta da aplicação, interativamente |
| `set-password` | (também na raiz) Muda a password da conta existente |
| `check:security` | (também na raiz) Audita as permissões da base de dados |
| `test` | Testes unitários + integração contra Postgres real |

### Estrutura do backend

```
backend/
  server.js        arranque e shutdown
  app.js           middleware e montagem das rotas
  routes/          auth, profile, transactions, budgets, reports, investments, market
  lib/             env, pool, prisma, sessão, datas, dinheiro, cotações
  middleware/      auth, validação, rate limiting, erros
  schemas/         validação Zod de todos os pedidos
```

### Testes de integração

`backend/test/api.integration.test.js` arranca a app e fala com ela por HTTP,
contra o Postgres do `DATABASE_URL`, mas num schema descartável (`pf_test`)
criado a partir das migrações e apagado no fim — as tabelas reais em `public`
nunca são tocadas. Sem base de dados acessível, o teste é saltado.

### Fuso horário

Os meses (relatórios, orçamentos, insights) contam-se no fuso de
`APP_TIMEZONE` (por omissão `Europe/Lisbon`), fixado no arranque. Sem isto, um
servidor em UTC punha uma despesa das 00:30 de 1 de outubro em setembro.

---

## Segurança

A app é de utilizador único e **toda a API exige sessão**. O que está montado:

| Área | Implementação |
|---|---|
| **Autenticação** | Password com `scrypt` (Node core). Sem registo público — a password define-se por CLI no servidor. |
| **Sessões** | `express-session` com store em Postgres. O cookie é `httpOnly`, `SameSite=Lax`, e `Secure` em produção. Carrega apenas um id opaco, por isso o logout revoga-o mesmo do lado do servidor. Dura **30 dias**, renovados a cada utilização (`rolling`) — quem usa a app regularmente nunca tem de voltar a entrar. Ajusta em `SESSION_DAYS` ([lib/session.js](backend/lib/session.js)). |
| **Isolamento de dados** | `requireAuth` está montado em todo o prefixo `/api`, logo uma rota nova nasce protegida. Todas as queries passam por `scopeToUser()`, que injeta o `userId` da sessão — nunca do pedido. |
| **Rate limiting** | 4 níveis: login (10 falhas/15min), escritas (60/min), mercado (30/min) e um teto global (600/15min). |
| **Validação** | Zod em todos os `body`, `query` e `params`. Valores são normalizados, limitados e truncados antes de chegarem a um handler. |
| **Erros** | Handler central. O cliente recebe uma mensagem genérica e um `errorId`; o stack trace fica no log, localizável por esse id. |
| **Logging** | `pino` estruturado, com redaction de cookies, passwords e DSNs. Eventos de segurança marcados com `security: true`. |
| **Cabeçalhos** | `helmet` (CSP, HSTS, nosniff, frame options). |
| **CORS** | Lista explícita de origens via `CORS_ORIGIN`. Nunca `*` — é incompatível com cookies. |

### Endurecer a base de dados

O Postgres traz defaults convenientes, não seguros. Corre uma vez, **como owner
da base de dados** (não como o role da app):

```bash
psql "$ADMIN_DATABASE_URL" -f backend/prisma/security/harden.sql
```

Revoga tudo o que está aberto a `PUBLIC`, fixa os default privileges para que
a próxima migração não reabra o que foi fechado, e retira ao role da app a
capacidade de criar bases de dados, criar roles ou ignorar RLS.

Para confirmar o estado a qualquer momento:

```bash
npm run check:security
```

### Deploy (Render)

O `render.yaml` na raiz descreve um Web Service privado. No painel da Render:
liga o repositório, confirma o blueprint, e preenche `DATABASE_URL` com o URL
pooled do Neon. O `SESSION_SECRET` é gerado pela Render. O endereço público
(`RENDER_EXTERNAL_URL`) entra sozinho na lista de CORS.

No telemóvel, abre o `https://….onrender.com` e usa **Adicionar ao ecrã inicial**.

### Notas de produção

- Serve sempre **por HTTPS**. O cookie de sessão é `Secure` quando
  `NODE_ENV=production` e um browser não o envia em texto simples.
- Define `CORS_ORIGIN` se o site for servido noutro domínio que não o da Render.
- Atrás de reverse proxy, o `trust proxy` está em `1` (um hop). Ajusta se
  tiveres mais, mas nunca para `true` — permitiria falsear o IP e contornar o
  rate limiting.
- `NODE_ENV=production` faz o Express servir o `dist/` e apanhar as rotas da SPA.

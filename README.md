# HR Suite — Bridge351

Sistema de Gestão de Recursos Humanos desenvolvido com **NestJS + React + TypeORM + PostgreSQL**.

## Visão Geral

O HR Suite é uma plataforma completa de RH que cobre:

- **Autenticação**: JWT com refresh token, MFA TOTP com códigos de recuperação (sem SSO — o Keycloak foi removido em P-094)
- **Organização**: Colaboradores, departamentos, cargos, equipas e organograma
- **Operações**: Projetos, alocações, timesheets, ausências, despesas
- **Processos**: Workflow de aprovações, notificações in-app e email
- **Financeiro**: Dashboards de margens, rentabilidade, receitas
- **Suporte**: Helpdesk interno, políticas internas, FAQs
- **Conformidade**: GDPR, consentimentos, pedidos de titular, auditoria
- **Talento**: Formações, avaliações de desempenho, matriz 9-box

## Pré-requisitos

| Ferramenta | Versão | Notas                 |
| ---------- | ------ | --------------------- |
| Node.js    | >= 20  | `nvm use 20`          |
| pnpm       | 9.15.9 | Ver nota abaixo       |
| Docker     | >= 24  | Com Docker Compose v2 |
| PostgreSQL | 16     | Fornecido pelo Docker |

> A versão do pnpm está fixada no campo `packageManager` do `package.json`. Não é preciso
> instalá-la à mão: com o corepack ativo (`corepack enable`, incluído no Node 20+) qualquer
> comando `pnpm` dentro deste repositório usa automaticamente a 9.15.9, seja qual for a versão
> global — e o pnpm 10+ faz o mesmo por si. O `pnpm-lock.yaml` é `lockfileVersion 9.0`, que o
> pnpm 8 não consegue ler.

## Quickstart

Existem **dois modos de desenvolvimento, mutuamente exclusivos** — escolhe um antes de
começar. O `infra/docker-compose.dev.yml` não define apenas infraestrutura: define também os
serviços `backend` e `frontend`. Subir tudo com `up -d` e depois correr `pnpm dev` deixa as
portas 3000 e 5173 ocupadas e o segundo arranque falha.

| Modo                                 | Quem corre a aplicação             | Quando usar                                           |
| ------------------------------------ | ---------------------------------- | ----------------------------------------------------- |
| **A** — tudo em Docker               | contentores `backend` e `frontend` | pôr o sistema a correr sem configurar nada no host    |
| **B** — infra em Docker, app no host | `pnpm dev`                         | desenvolver com hot reload, debugger e testes no host |

### Passos comuns aos dois modos

```bash
# 1. Instalar dependências (monorepo). Necessário nos dois modos: os comandos de
#    migração e de seed correm sempre a partir do host.
pnpm install

# 2. Criar o .env e gerar segredos reais.
cp .env.example .env
./scripts/generate-secrets.sh
```

O segundo comando do passo 2 não é opcional numa instalação nova: o `.env.example` traz
`JWT_ACCESS_PRIVATE_KEY=change_me_run_generate_secrets_sh`, que não é uma chave RSA. Como os
tokens são assinados com RS256, sem ele o login rebenta com `secretOrPrivateKey must be an
asymmetric key when using RS256`.

O script escreve **dentro** do `.env`, substituindo cada chave no sítio. Não uses `>> .env`:
isso acrescenta uma segunda cópia de cada chave e o `dotenv` passa a ler a última, o que
torna o ficheiro enganador.

Por omissão só preenche o que falta, por isso é seguro correr outra vez — um valor real já
definido é mantido. Para regenerar de propósito, usa `--rotate`:

```bash
./scripts/generate-secrets.sh --rotate jwt     # só as 4 chaves JWT
./scripts/generate-secrets.sh --rotate all     # tudo (pede confirmação)
```

`POSTGRES_PASSWORD` é o caso especial: o Postgres só a lê quando **inicializa** o volume, por
isso mudá-la no `.env` depois disso não muda a que está guardada — só parte o backend. Se o volume já existir, o script recusa-se a rodá-la e diz-te o que fazer (ver
[Troubleshooting](#password-authentication-failed-for-user-srh_user)).

### Modo A — tudo em Docker

```bash
# 3. Subir o stack completo (infraestrutura + backend + frontend)
docker compose -f infra/docker-compose.dev.yml --env-file .env up -d --build

# 4. Migrações e dados de base (a partir do host; o .env aponta POSTGRES_HOST=localhost)
pnpm --filter @bridge351/srh-backend run migration:run
pnpm --filter @bridge351/srh-backend run seed
```

Não corras `pnpm dev` neste modo — o passo 3 já arrancou o backend e o frontend.

### Modo B — infraestrutura em Docker, aplicação no host

```bash
# 3. Subir SÓ a infraestrutura, nomeando os serviços explicitamente
docker compose -f infra/docker-compose.dev.yml --env-file .env \
  up -d postgres redis rustfs createbuckets rabbitmq mailpit

# 4. O backend lê um .env relativo ao seu cwd (backend/), não o da raiz
cp .env backend/.env

# 5. O Vite também lê o .env a partir de frontend/, não da raiz
cp frontend/.env.example frontend/.env

# 6. Migrações e dados de base
pnpm --filter @bridge351/srh-backend run migration:run
pnpm --filter @bridge351/srh-backend run seed

# 7. Arrancar backend e frontend no host
pnpm dev
```

> **Porquê o passo 4:** `pnpm -r run dev` coloca o cwd em `backend/`, e o `ConfigModule`
> carrega `.env` a partir do cwd. O `.env` da raiz só é lido pelo `data-source.ts` e pelos
> seed runners, que resolvem o caminho de forma absoluta — por isso a base de dados liga, mas
> o `JwtService` rebenta no arranque. O mesmo vale para o frontend: o Vite carrega
> `frontend/.env`, e não o da raiz.

### Aceder

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000/api
- **Swagger** (dev/staging): http://localhost:3000/api/docs
- **Mailpit** (emails de dev): http://localhost:8025
- **RustFS** (consola): http://localhost:9001/rustfs/console/ — ver [Login na consola do RustFS](#login-na-consola-do-rustfs)

Credenciais criadas pelo `run seed`:

| Email                  | Password    | Papel |
| ---------------------- | ----------- | ----- |
| `admin@hr-suite.local` | `Admin123!` | admin |

Para uma organização fictícia completa com utilizadores de demonstração, ver
[Dados de Demo](#dados-de-demo).

#### Login na consola do RustFS

A consola não tem utilizadores próprios: o login é feito com as chaves de armazenamento do `.env`,
que o compose passa ao RustFS como credenciais de administrador.

| Campo da consola | Valor                                   |
| ---------------- | --------------------------------------- |
| **Access Key**   | valor de `STORAGE_ACCESS_KEY` no `.env` |
| **Secret Key**   | valor de `STORAGE_SECRET_KEY` no `.env` |

Para ver os valores:

```bash
grep -E '^STORAGE_(ACCESS|SECRET)_KEY=' .env
```

Copia só o que está depois do `=`. Se o `.env` não definir estas chaves, o compose de dev usa
`rustfsadmin` / `rustfsadmin`.

Se o login falhar depois de alterares as chaves no `.env` (à mão ou com
`./scripts/generate-secrets.sh storage`), o RustFS ainda está a correr com as antigas — recria-o
(e o backend, que usa as mesmas chaves):

```bash
# Modo A (tudo em Docker)
docker compose -f infra/docker-compose.dev.yml --env-file .env up -d --force-recreate rustfs backend

# Modo B (backend no host): recria só o RustFS e reinicia o `pnpm dev` depois de copiar o .env
docker compose -f infra/docker-compose.dev.yml --env-file .env up -d --force-recreate rustfs
cp .env backend/.env
```

Os ficheiros enviados pela aplicação ficam no bucket `srh-documents` (ou o valor de
`STORAGE_BUCKET`).

## Servidor de Desenvolvimento

Há um servidor de desenvolvimento partilhado, gerido pelo Portainer, que é atualizado
automaticamente a cada push para `develop` (alguns minutos depois). Inclui os dados de demo e o
Mailpit, que captura todos os emails. Configuração, acesso e operação em
[DEPLOY_PORTAINER.md](DEPLOY_PORTAINER.md).

## CI/CD

O pipeline de CI é o [`.gitlab-ci.yml`](.gitlab-ci.yml) e corre num GitLab Runner próprio (ver
[DEPLOY_PORTAINER.md](DEPLOY_PORTAINER.md#7-runner-do-gitlab-ci)):

- **Em cada merge request e push para `develop`/`main`:** lint, formatação, build do backend e do
  frontend, testes unitários e testes e2e do backend (PostgreSQL + Redis) — um MR só é integrado com
  estes jobs verdes. SAST, deteção de segredos, análise de IaC e `pnpm audit` só reportam.
- **Todas as segundas-feiras às 03:00:** o mesmo pipeline no `develop` e o Renovate, que abre MRs de
  atualização de dependências e imagens (majors só depois de aprovados no issue "Dependency
  Dashboard").

Opcional: para ver em segundos o que os jobs `lint` e `format` vão reportar, sem esperar pelo
pipeline (o hook de pre-commit já corrige a formatação e trava erros de lint nos ficheiros de cada
commit, pelo que na maioria dos casos estes jobs passam sem mais nada):

```bash
pnpm run lint:ci
pnpm run format:check
```

Detalhe dos jobs, do Renovate e da configuração no GitLab em
[CONTRIBUTING.md](CONTRIBUTING.md#ci). Build de imagens, releases e deploy automático ainda não
fazem parte do pipeline.

## Produção

```bash
# 1. Instalar dependências (o seed de demonstração, opcional, corre a partir do host)
pnpm install

# 2. Criar o .env e gerar segredos reais (as chaves JWT do .env.example são
#    placeholders e não são chaves RSA válidas — ver Quickstart)
cp .env.example .env
./scripts/generate-secrets.sh

# 3. Acrescentar os valores próprios de produção (ver aviso abaixo).
#    Trocar <ip-ou-domínio-do-servidor> pelo endereço real — num teste local, `localhost`.
cat <<'EOF' >> .env

RABBITMQ_USER=srh_app
RABBITMQ_PASSWORD=troca_esta_password
BACKEND_CORS_ORIGIN=http://<ip-ou-domínio-do-servidor>
EOF

# 4. Subir infraestrutura + backend + frontend
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --build
```

> **O passo 3 não é opcional.** Duas daquelas variáveis (`RABBITMQ_*`) não existem no `.env.example` — o compose de
> desenvolvimento tem valores por omissão para elas, o de produção não. E o Docker Compose
> **não falha** quando uma variável sem valor por omissão não está definida: substitui-a por
> string vazia e emite apenas um aviso (`variable is not set. Defaulting to a blank string.`).
> O resultado seria um RabbitMQ sem utilizador, a falhar em runtime em vez de dar um erro
> claro de configuração.

> **Três variáveis do `.env.example` não têm efeito nenhum em produção:**
>
> - `SMTP_*` — o `docker-compose.prod.yml` não as passa ao bloco `environment:` do serviço
>   `backend`, e em produção o backend não lê nenhum ficheiro `.env` (o `.dockerignore` exclui
>   `**/.env` da imagem). Como o `NotificationsService` só cria o transporte de email se
>   `SMTP_HOST` estiver definido, o envio de emails fica **desativado** — sem erro, e as
>   notificações in-app continuam a funcionar. Para ativar email em produção é preciso
>   acrescentar as `SMTP_*` ao `environment:` do serviço `backend`.
> - `SENTRY_DSN` — não é lida por nenhum ficheiro em `backend/src` nem `frontend/src`, e
>   `@sentry/*` não é dependência do projeto. É configuração morta.
> - `PROMETHEUS_ENABLED` — também não é lida em lado nenhum. O `AdminService` chama
>   `collectDefaultMetrics()` no construtor sem qualquer condição, por isso as métricas são
>   sempre recolhidas e a variável não liga nem desliga nada.

**Não é preciso correr migrações nem o seed à mão.** O `CMD` do `backend/Dockerfile` corre
`schema:create`, `migration:run:prod` e `seed:prod` sempre que o container do backend arranca,
antes de iniciar o servidor. Confirma nos logs:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env logs backend | grep -iE "seed|migration"
```

O Docker Compose espera encontrar o ficheiro `.env` através de `--env-file .env` (executado a partir da raiz do projecto).

Para dados de demonstração, ver [Dados de Demo](#dados-de-demo). Para instalar num servidor
Ubuntu limpo (firewall, Docker, TLS, etc.), seguir o [DEPLOY_UBUNTU.md](DEPLOY_UBUNTU.md).

## Variáveis de Ambiente

Para gerar valores aleatórios seguros para os segredos abaixo (`JWT_ACCESS_PRIVATE_KEY`, `MFA_ENCRYPTION_KEY`, `POSTGRES_PASSWORD`, etc.):

```bash
./scripts/generate-secrets.sh
```

### Root (`.env`)

| Variável                  | Descrição                                       | Exemplo                         |
| ------------------------- | ----------------------------------------------- | ------------------------------- |
| `POSTGRES_HOST`           | Host da base de dados                           | `localhost`                     |
| `POSTGRES_PORT`           | Porta da base de dados                          | `5432`                          |
| `POSTGRES_DB`             | Nome da base de dados                           | `srh`                           |
| `POSTGRES_USER`           | Utilizador da base de dados                     | `srh_user`                      |
| `POSTGRES_PASSWORD`       | Password da base de dados                       | `change_me`                     |
| `BACKEND_PORT`            | Porta do servidor backend                       | `3000`                          |
| `BACKEND_CORS_ORIGIN`     | Origem permitida para CORS                      | `http://localhost:5173`         |
| `JWT_ACCESS_PRIVATE_KEY`  | Chave privada RSA (PEM base64) do access token  | gerar via `generate-secrets.sh` |
| `JWT_ACCESS_PUBLIC_KEY`   | Chave pública RSA (PEM base64) do access token  | gerar via `generate-secrets.sh` |
| `JWT_REFRESH_PRIVATE_KEY` | Chave privada RSA (PEM base64) do refresh token | gerar via `generate-secrets.sh` |
| `JWT_REFRESH_PUBLIC_KEY`  | Chave pública RSA (PEM base64) do refresh token | gerar via `generate-secrets.sh` |
| `JWT_EXPIRES_IN`          | Expiração do access token                       | `15m`                           |
| `JWT_REFRESH_EXPIRES_IN`  | Expiração do refresh token                      | `7d`                            |
| `MFA_ENCRYPTION_KEY`      | Chave AES-256-GCM para MFA secrets              | `change_me_mfa_key_32_bytes`    |
| `VITE_API_URL`            | URL da API (frontend) — ver nota abaixo         | `http://localhost:3000/api`     |
| `STORAGE_ENDPOINT`        | Endpoint do RustFS/S3 (com esquema `http://`)   | `http://localhost:9000`         |
| `STORAGE_ACCESS_KEY`      | Access key do RustFS/S3                         | `change_me`                     |
| `STORAGE_SECRET_KEY`      | Secret key do RustFS/S3                         | `change_me`                     |
| `STORAGE_BUCKET`          | Bucket de documentos                            | `srh-documents`                 |
| `STORAGE_REGION`          | Região S3                                       | `eu-west-1`                     |
| `STORAGE_USE_SSL`         | Usar SSL para storage                           | `false`                         |
| `REDIS_HOST`              | Host do Redis                                   | `localhost`                     |
| `REDIS_PORT`              | Porta do Redis                                  | `6379`                          |
| `SENTRY_DSN`              | Não utilizada — ver [Produção](#produção)       | —                               |
| `PROMETHEUS_ENABLED`      | Não utilizada — ver [Produção](#produção)       | —                               |
| `SMTP_HOST`               | Host SMTP (só dev — ver [Produção](#produção))  | `localhost`                     |
| `SMTP_PORT`               | Porta SMTP                                      | `1025`                          |
| `SMTP_USER`               | Utilizador SMTP                                 | —                               |
| `SMTP_PASS`               | Password SMTP                                   | —                               |
| `SMTP_FROM`               | Remetente de emails                             | `noreply@srh.bridge351.com`     |

> **Nota sobre estas variáveis:**
>
> - As `VITE_*` são substituídas pelo Vite em tempo de _build_, não lidas em tempo de
>   execução. Em produção são passadas como `args` de build no `docker-compose.prod.yml` e o
>   `frontend/Dockerfile` recebe-as via `ARG`; mudá-las obriga a reconstruir a imagem do
>   frontend. Em produção, `VITE_API_URL` é `/api`, servido pelo proxy do nginx
>   (`frontend/nginx.conf`) — **nunca vazio**, porque `''` não aciona o valor por omissão do
>   código e os pedidos perderiam o prefixo `/api`.

## Dados de Demo

Depois de `pnpm run seed` (roles/RBAC, categorias, tipos de ausência — pré-requisito), correr:

```bash
pnpm --filter @bridge351/srh-backend run seed:demo
# Variante que força POSTGRES_HOST=localhost, para quando o .env aponta para um
# nome da rede Docker (ex.: `postgres`) mas o comando corre a partir do host:
pnpm --filter @bridge351/srh-backend run seed:demo:host
```

Popula a BD com uma organização fictícia pequena (~8 pessoas, 2 gestores/2 aprovadores/3 colaboradores + o admin base) e dados de simulação largos mas rasos em quase todos os módulos: departamentos/cargos/organograma, 2 equipas, 3 clientes/3 projetos com alocações, 7 contratos (incl. um a expirar em breve, para mostrar o alerta), timesheets de 2 meses, pedidos de ausência (pendente/aprovado) com saldos de férias, despesas (pendente/paga/rascunho), 3 políticas, 2 cursos com inscrições, 2 tickets de helpdesk, 2 eventos de calendário, itens de caixa de entrada e notificações correspondentes aos pedidos pendentes. **Idempotente** — pode ser corrido várias vezes sem duplicar dados.

Password de todos os utilizadores de demo: `Demo123!`.

| Email                             | Papel    | Cargo               | Departamento     |
| --------------------------------- | -------- | ------------------- | ---------------- |
| `mariana.ferreira@hr-suite.local` | Manager  | Head of Engineering | Engenharia       |
| `tiago.rocha@hr-suite.local`      | Manager  | Head of Consulting  | Consultoria      |
| `carla.mendes@hr-suite.local`     | Approver | Account Director    | Comercial        |
| `diogo.pinto@hr-suite.local`      | Approver | HR Lead             | Recursos Humanos |
| `sofia.almeida@hr-suite.local`    | Employee | Software Engineer   | Engenharia       |
| `rui.cardoso@hr-suite.local`      | Employee | Software Engineer   | Engenharia       |
| `beatriz.nunes@hr-suite.local`    | Employee | Consultant          | Consultoria      |

Para a caixa de entrada/aprovações, entra como `mariana.ferreira` — tem itens pendentes reais de `sofia.almeida` (timesheet de agosto + pedido de férias + despesa).

**Deliberadamente fora do âmbito** (não populado): Documents (requer upload real para o RustFS), GDPR (consentimentos/pedidos de titular, natureza sensível/irreversível), feriados públicos reais (dependem de importação externa via `POST /calendar/holidays/import`, correr manualmente se necessário para a demo).

## Estrutura do Monorepo

```
.
├── backend/          # API NestJS (TypeScript)
│   ├── src/          # Código fonte (26 módulos)
│   └── test/         # Testes e2e (jest + supertest)
├── frontend/         # SPA React 18 + Vite + Tailwind
│   ├── src/          # Código fonte
│   └── e2e/          # Testes e2e (Playwright)
├── shared/           # Tipos e constantes partilhadas
├── specs/            # Especificações técnicas (SDD)
├── infra/            # Docker Compose (dev/prod)
├── docs/             # ARCHITECTURE.md, AUDIT_PROCESS.md + openapi.json gerado
├── images/           # Recursos visuais
├── .gitlab-ci.yml    # Pipeline de CI (GitLab)
├── renovate.json     # Configuração do Renovate (atualização de dependências)
├── PROJECT_STATE.md  # Estado actual do projecto
└── AGENTS.md         # Instruções para agentes de IA
```

## Links Úteis

- [Especificações Técnicas](./specs/README.md)
- Documentação OpenAPI — servida em http://localhost:3000/api/docs e escrita em
  `docs/openapi.json` ao arrancar o backend em dev/staging (ficheiro gerado, não versionado)
- [Contribuir, CI e Renovate](./CONTRIBUTING.md)
- [Estado do Projecto](./PROJECT_STATE.md)
- [Arquitectura](./docs/ARCHITECTURE.md)
- [Processo de Auditoria](./docs/AUDIT_PROCESS.md)

## Troubleshooting

### `ERR_PNPM_OUTDATED_LOCKFILE`

O `pnpm-lock.yaml` não corresponde aos `package.json`. Regenerar e commitar o lockfile:

```bash
pnpm install --no-frozen-lockfile
```

A CI corre `pnpm install --frozen-lockfile` de propósito, para que um lockfile
dessincronizado falhe lá em vez de chegar a uma imagem de produção.

(`ERESOLVE` é um erro do **npm**, não do pnpm — se o vires, estás a correr `npm install` em
vez de `pnpm install`.)

### `relation "hr.users" does not exist`

As migrações não foram executadas:

```bash
pnpm --filter @bridge351/srh-backend run migration:run
```

### Contentor `srh-keycloak-dev` ainda a correr

O Keycloak foi removido em P-094, mas um ambiente criado antes disso continua com o contentor
e com a base de dados `keycloak` no volume do Postgres. Nenhum dos dois é usado. Para limpar:

```bash
docker compose -f infra/docker-compose.dev.yml --env-file .env up -d --remove-orphans
docker exec srh-postgres-dev psql -U srh_user -d postgres -c 'DROP DATABASE IF EXISTS keycloak;'
```

Em produção, o mesmo com `infra/docker-compose.prod.yml` e o contentor `srh-postgres-prod`.

### `password authentication failed for user "srh_user"`

O backend não liga à base de dados (fica de pé mas não responde na porta 3000).

Quase sempre significa que a `POSTGRES_PASSWORD` do `.env` deixou de bater certo com a que
está guardada no volume: o Postgres só a lê quando **inicializa** o volume, e a partir daí
ignora-a. O `generate-secrets.sh` já se recusa a rodá-la com o volume criado, mas o
desencontro ainda acontece se alguém editar o `.env` à mão, correr o script com `--force`,
ou usar `>> .env` (que acrescenta uma segunda `POSTGRES_PASSWORD` — o `dotenv` e o
`docker compose` leem a **última**, que não é a do volume).

Confirma primeiro se há chaves duplicadas no `.env`:

```bash
grep -oE '^[A-Z_]+=' .env | sort | uniq -d
```

Para manter os dados, sincroniza a password guardada com a do `.env` (a ligação pelo socket
local dentro do contentor não pede password):

```bash
docker exec srh-postgres-dev psql -U srh_user -d postgres \
  -c "ALTER USER srh_user WITH PASSWORD '$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2-)';"

docker compose -f infra/docker-compose.dev.yml --env-file .env \
  up -d --force-recreate backend
```

Se o `.env` tinha duplicados, corre o `./scripts/generate-secrets.sh` depois: colapsa cada
chave repetida numa linha só, mantendo o valor que estava a ser usado.

Em alternativa, para começar de raiz (**apaga a base de dados**):

```bash
docker compose -f infra/docker-compose.dev.yml --env-file .env down
docker volume rm srh-dev_postgres-data
docker compose -f infra/docker-compose.dev.yml --env-file .env up -d
pnpm --filter @bridge351/srh-backend run migration:run
pnpm --filter @bridge351/srh-backend run seed
```

### `JWT_ACCESS_PRIVATE_KEY não configurado`

Ou o ficheiro de ambiente não foi encontrado, ou as chaves nele são os _placeholders_ do
`.env.example`. São dois problemas diferentes:

**1. O backend a correr no host não encontra o `.env`** (Modo B). O `ConfigModule` carrega
`.env` a partir do cwd, e `pnpm -r run dev` coloca o cwd em `backend/`. Copiar o `.env` da
raiz não resolve — é preciso o ficheiro em `backend/`:

```bash
cp .env backend/.env
```

**2. As chaves são `change_me_run_generate_secrets_sh`.** Não são chaves RSA, e o RS256
exige um PEM assimétrico. O script substitui os placeholders no sítio e deixa o resto como
está, por isso serve tanto num stack novo como num que já existe:

```bash
./scripts/generate-secrets.sh
```

Se as chaves já forem reais e mesmo assim quiseres novas, pede a rotação explícita — isto
invalida todas as sessões ativas:

```bash
./scripts/generate-secrets.sh --rotate jwt
```

Depois recria o contentor — `docker restart` não chega, porque um contentor mantém o
ambiente com que foi criado:

```bash
docker compose -f infra/docker-compose.dev.yml --env-file .env up -d --force-recreate backend
```

### Porta 3000 ou 5173 já ocupada

Quase sempre significa que os dois modos do [Quickstart](#quickstart) foram misturados: o
`docker-compose.dev.yml` inclui os serviços `backend` e `frontend`, por isso um `up -d` sem
nomear serviços já arranca a aplicação, e o `pnpm dev` a seguir colide com ela. Ou paras os
contentores da aplicação (Modo B):

```bash
docker compose -f infra/docker-compose.dev.yml --env-file .env stop backend frontend
```

ou não corres `pnpm dev` (Modo A). Em alternativa, alterar `BACKEND_PORT` no `.env`.

### `docker compose` não encontrado

Certificar que o Docker Compose v2 está instalado:

```bash
docker compose version
```

### `NoSuchBucket` ou erro de permissões no RustFS

O bucket é criado pelo serviço one-shot `createbuckets` do `docker-compose.dev.yml`, que
corre uma vez e termina. Confirmar que correu bem:

```bash
docker compose -f infra/docker-compose.dev.yml --env-file .env logs createbuckets
```

Para o recriar manualmente (idempotente):

```bash
docker compose -f infra/docker-compose.dev.yml --env-file .env up createbuckets
```

Em produção existe o mesmo serviço no `docker-compose.prod.yml` — basta trocar `dev` por
`prod` nos comandos acima.

### Playwright — browser not found

```bash
cd frontend && pnpm exec playwright install chromium
```

### Testes e2e falham — base de dados de teste

O ficheiro `backend/.env.test` deve existir com as credenciais da base de dados de teste.

---

_HR Suite — Bridge351 © 2026_

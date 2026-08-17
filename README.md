# HR Suite — Bridge351

Sistema de Gestão de Recursos Humanos desenvolvido com **NestJS + React + TypeORM + PostgreSQL**.

## Visão Geral

O HR Suite é uma plataforma completa de RH que cobre:

- **Autenticação**: JWT com refresh token, MFA TOTP, SSO via Keycloak
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
| pnpm       | >= 9   | `npm i -g pnpm`       |
| Docker     | >= 24  | Com Docker Compose v2 |
| PostgreSQL | 16     | Fornecido pelo Docker |

## Quickstart

```bash
# 1. Instalar dependências (monorepo)
pnpm install

# 2. Criar .env (ver secção Variáveis de Ambiente)
cp .env.example .env

# 3. Iniciar serviços de infraestrutura
docker compose -f infra/docker-compose.dev.yml --env-file .env up -d

# 4. Executar migrações da base de dados
pnpm --filter @bridge351/srh-backend run migration:run

# 5. Popular dados de base (roles, permissões, admin)
pnpm --filter @bridge351/srh-backend run seed

# 6. Iniciar desenvolvimento
pnpm dev
```

Após iniciar:

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000/api
- **Swagger** (dev/staging): http://localhost:3000/api/docs
- **Keycloak**: http://localhost:8080

## Produção

```bash
# 1. Instalar dependências e fazer build
pnpm install

# 2. Criar e preencher .env
cp .env.example .env

# 3. Subir infraestrutura + backend + frontend via Docker
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d

# 4. Executar migrações e seed
pnpm --filter @bridge351/srh-backend run migration:run
pnpm --filter @bridge351/srh-backend run seed
```

O Docker Compose espera encontrar o ficheiro `.env` através de `--env-file .env` (executado a partir da raiz do projecto).

## Variáveis de Ambiente

Para gerar valores aleatórios seguros para os segredos abaixo (`JWT_SECRET`, `MFA_ENCRYPTION_KEY`, `POSTGRES_PASSWORD`, etc.):

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
| `KEYCLOAK_URL`            | URL do Keycloak                                 | `http://localhost:8080`         |
| `KEYCLOAK_REALM`          | Realm do Keycloak                               | `srh`                           |
| `KEYCLOAK_CLIENT_ID`      | Client ID do backend no Keycloak                | `srh-backend`                   |
| `VITE_API_BASE_URL`       | URL da API (frontend)                           | `http://localhost:3000/api`     |
| `VITE_KEYCLOAK_URL`       | URL do Keycloak (frontend)                      | `http://localhost:8080`         |
| `VITE_KEYCLOAK_REALM`     | Realm do Keycloak (frontend)                    | `srh`                           |
| `VITE_KEYCLOAK_CLIENT_ID` | Client ID do frontend no Keycloak               | `srh-frontend`                  |
| `STORAGE_ENDPOINT`        | Endpoint do MinIO/S3                            | `localhost:9000`                |
| `STORAGE_ACCESS_KEY`      | Access key do MinIO/S3                          | `change_me`                     |
| `STORAGE_SECRET_KEY`      | Secret key do MinIO/S3                          | `change_me`                     |
| `STORAGE_BUCKET`          | Bucket de documentos                            | `srh-documents`                 |
| `STORAGE_REGION`          | Região S3                                       | `eu-west-1`                     |
| `STORAGE_USE_SSL`         | Usar SSL para storage                           | `false`                         |
| `REDIS_HOST`              | Host do Redis                                   | `localhost`                     |
| `REDIS_PORT`              | Porta do Redis                                  | `6379`                          |
| `SENTRY_DSN`              | DSN do Sentry (opcional)                        | —                               |
| `PROMETHEUS_ENABLED`      | Activar métricas Prometheus                     | `false`                         |
| `SMTP_HOST`               | Host SMTP                                       | `localhost`                     |
| `SMTP_PORT`               | Porta SMTP                                      | `1025`                          |
| `SMTP_USER`               | Utilizador SMTP                                 | —                               |
| `SMTP_PASS`               | Password SMTP                                   | —                               |
| `SMTP_FROM`               | Remetente de emails                             | `noreply@srh.bridge351.com`     |

## Estrutura do Monorepo

```
.
├── backend/          # API NestJS (TypeScript)
│   ├── src/          # Código fonte (25 módulos)
│   └── test/         # Testes e2e (jest + supertest)
├── frontend/         # SPA React 18 + Vite + Tailwind
│   ├── src/          # Código fonte
│   └── e2e/          # Testes e2e (Playwright)
├── shared/           # Tipos e constantes partilhadas
├── spec/             # Especificações técnicas (SDD)
├── infra/            # Docker Compose (dev/prod)
├── docs/             # Documentação gerada (openapi.json)
├── images/           # Recursos visuais
├── .github/          # CI/CD workflows
├── PROJECT_STATE.md  # Estado actual do projecto
└── AGENTS.md         # Instruções para agentes de IA
```

## Links Úteis

- [Especificações Técnicas](./specs/README.md)
- [Documentação OpenAPI](./docs/openapi.json)
- [Estado do Projecto](./PROJECT_STATE.md)
- [Arquitectura](./docs/ARCHITECTURE.md)
- [Processo de Auditoria](./docs/AUDIT_PROCESS.md)

## Troubleshooting

### `ERESOLVE` ao instalar dependências

```bash
pnpm install --no-frozen-lockfile
```

### `relation "hr.user" does not exist`

As migrações não foram executadas:

```bash
pnpm --filter @bridge351/srh-backend run migration:run
```

### `JWT_ACCESS_PRIVATE_KEY não configurado`

O ficheiro `.env` não existe ou está incompleto:

```bash
cp .env.example .env
# editar .env com valores adequados
```

### Porta 3000 já ocupada

Alterar `BACKEND_PORT` no `.env` ou parar o processo em conflito.

### `docker compose` não encontrado

Certificar que o Docker Compose v2 está instalado:

```bash
docker compose version
```

### Erro de permissões no MinIO

Verificar se o bucket `srh-documents` foi criado:

```bash
docker compose -f infra/docker-compose.dev.yml exec minio mc mb data/srh-documents
```

### Playwright — browser not found

```bash
cd frontend && pnpm exec playwright install chromium
```

### Testes e2e falham — base de dados de teste

O ficheiro `backend/.env.test` deve existir com as credenciais da base de dados de teste.

---

_HR Suite — Bridge351 © 2026_

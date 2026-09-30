# Contributing

## Branches

| Nome        | Propósito                                           |
| ----------- | --------------------------------------------------- |
| `main`      | Produção. Apenos merges de `release/*`              |
| `develop`   | Integração contínua. Base para `feature/*`          |
| `feature/*` | Nova funcionalidade. Branch a partir de `develop`   |
| `fix/*`     | Correção de bug. Branch a partir de `develop`       |
| `release/*` | Preparação de release. Branch a partir de `develop` |

## Commits (Conventional Commits)

```
<type>(<scope>): <descrição>

[opcional: corpo]
[opcional: footer]
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`.

Exemplos:

- `feat(auth): add MFA TOTP enrollment`
- `fix(timesheets): correct overtime calculation on weekends`
- `docs(api): document absence endpoints`

## Novo Módulo — Checklist

- [ ] **Spec**: criar `specs/<MODULO>.md` com descrição funcional e técnica
- [ ] **Entities**: definir entidades TypeORM no `backend/src/<modulo>/entities/`
- [ ] **DTOs**: criar DTOs de validação com `class-validator` e `@ApiProperty()`
- [ ] **Service**: implementar lógica de negócio no `backend/src/<modulo>/services/`
- [ ] **Controller**: expor endpoints REST com `@ApiTags`, `@ApiBearerAuth`, guardas RBAC
- [ ] **Module**: registar no `AppModule` e configurar `TypeOrmModule.forFeature()`
- [ ] **Tests**: testes unitários (`*.spec.ts`) e e2e (`test/*.e2e-spec.ts`)
- [ ] **Migration**: gerar migration com `pnpm migration:generate`
- [ ] **Swagger**: verificar documentação em `/api/docs` (dev/staging)
- [ ] **Frontend**: páginas, componentes, rotas lazy-loaded, traduções PT

## Testes

```bash
# Todos os testes (unitários + e2e backend)
pnpm test

# Apenas testes unitários do backend
pnpm --filter @bridge351/srh-backend run test

# Testes e2e do backend (requer PostgreSQL — usa sempre a BD "srh_test", isolada da BD de
# desenvolvimento "srh"; o script já força POSTGRES_DB=srh_test e a suite tem uma guarda de
# segurança própria (test/jest-e2e.setup.ts) mesmo que seja invocada de outra forma — ver R-046)
pnpm --filter @bridge351/srh-backend run test:e2e

# Testes e2e do frontend (Playwright, requer servidor dev)
pnpm --filter @bridge351/srh-frontend run test:e2e

# Lint
pnpm run lint

# Build
pnpm run build
```

Os testes e2e do backend usam `--runInBand` e uma base de dados dedicada (`srh_test`).  
Configurar as credenciais em `backend/.env.test`.

## CI

O pipeline de CI é o `.gitlab-ci.yml` (GitLab CI, requer um runner com o executor Docker). Corre em
todos os merge requests e em cada push para `develop` e `main`:

| Stage    | Job                   | O que faz                                                       | Bloqueia |
| -------- | --------------------- | --------------------------------------------------------------- | -------- |
| `verify` | `lint`                | `pnpm run lint:ci` (ESLint sem `--fix`)                         | Sim      |
| `verify` | `format`              | `pnpm run format:check`                                         | Sim      |
| `verify` | `build:backend`       | build do backend                                                | Sim      |
| `verify` | `build:frontend`      | typecheck + build do frontend                                   | Sim      |
| `test`   | `test:unit`           | testes unitários do backend, com relatório JUnit e cobertura    | Sim      |
| `test`   | `test:e2e`            | testes e2e do backend com PostgreSQL + Redis (`services:`)      | Sim      |
| `test`   | `audit`               | `pnpm audit --prod --audit-level high`                          | Não      |
| `test`   | SAST/Secret Detection | templates do GitLab (`backend/.env.test` excluído de propósito) | Não      |

Antes de abrir um MR, `pnpm run lint:ci` e `pnpm run format:check` reproduzem localmente os dois
primeiros jobs. Os testes e2e do frontend (Playwright) ainda não correm no CI (`R-066`), nem a
verificação de migrações face às entidades (`R-069`).

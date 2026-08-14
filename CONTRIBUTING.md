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

- [ ] **Spec**: criar `specs/<modulo>/SPEC.md` com descrição funcional e técnica
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

# Testes e2e do backend (requer PostgreSQL)
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

O workflow de CI (`.github/workflows/ci.yml`) executa:

1. `lint` — lint de todo o monorepo + build backend
2. `backend-e2e` — testes e2e do backend com PostgreSQL + Redis
3. `frontend-e2e` — build frontend + Playwright tests

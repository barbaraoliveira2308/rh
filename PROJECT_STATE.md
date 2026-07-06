# Project State — HR Suite

> Ficheiro de estado para retoma futura do projecto.
> Actualizar sempre que uma fase é concluída.

---

## Estado Actual

| Campo | Valor |
|-------|-------|
| Fase corrente | Fase 1 — Fundação |
| Último passo concluído | P-001 · Infra Docker (T-001, T-002) |
| Estado | Docker Compose dev + prod configurados, PostgreSQL inicializado, TypeORM CLI pronto |
| Data última actualização | 2026-07-06 |

---

## Decisões Tomadas

| ID | Decisão | Valor | Impacto |
|----|---------|-------|---------|
| P000-01 | Organização | Bridge351 | Scope nos packages (`@bridge351/srh-*`) e metadados do projecto |
| P000-02 | Visibilidade | Privado | Sem ficheiro LICENSE; sem configuração de registry público |
| P001-01 | Portas Docker | Padrão | 5432, 6379, 8080, 9000/9001, 5672/15672 — sem conflitos |

---

## Histórico de Fases Concluídas

| Fase | Passo | Data | Descrição |
|------|-------|------|-----------|
| 0 | P-000 | 2026-07-06 | Bootstrap do monorepo: backend (NestJS), frontend (React 18 + Vite), shared (tipos), infra (Docker Compose dev/prod), ESLint, Prettier, Husky, lint-staged, .env.example, .gitignore |
| 1 | P-001 | 2026-07-06 | Infra Docker: docker-compose.dev.yml (postgres, redis, keycloak, minio, rabbitmq, backend, frontend + mailpit), docker-compose.prod.yml (com limites de recursos, restart unless-stopped), init.sql (uuid-ossp, schema hr, role hr_app), TypeORM CLI + data-source.ts + migrations/ vazio, keycloak realm-export.json (hr-suite, 4 roles, 2 clients) |

---

## Contexto para Retoma

- **Package manager:** pnpm workspaces
- **Monorepo dirs:** `backend/`, `frontend/`, `shared/`, `infra/`
- **Base de dados:** PostgreSQL 16 (dev via Docker Compose)
- **Cache:** Redis 7 (dev via Docker Compose)
- **Storage:** MinIO (dev via Docker Compose)
- **Mail dev:** Mailpit
- **Linguagem:** TypeScript strict mode em todos os workspaces
- **Próximos passos esperados:** P-002 — Configuração Keycloak + JWT + Autenticação (T-003, T-004)

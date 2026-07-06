# Project State — HR Suite

> Ficheiro de estado para retoma futura do projecto.
> Actualizar sempre que uma fase é concluída.

---

## Estado Actual

| Campo | Valor |
|-------|-------|
| Fase corrente | Fase 1 — Fundação |
| Último passo concluído | P-004 · Endpoints de Autenticação (T-004) |
| Estado | AuthService (login, refresh com rotação, logout, MFA, password), AuthController com 9 endpoints, rate limiting, audit interceptor, E2E tests. |
| Data última actualização | 2026-07-06 |

---

## Decisões Tomadas

| ID | Decisão | Valor | Impacto |
|----|---------|-------|---------|
| P000-01 | Organização | Bridge351 | Scope nos packages (`@bridge351/srh-*`) e metadados do projecto |
| P000-02 | Visibilidade | Privado | Sem ficheiro LICENSE; sem configuração de registry público |
| P001-01 | Portas Docker | Padrão | 5432, 6379, 8080, 9000/9001, 5672/15672 — sem conflitos |
| P002-01 | Cifragem mfa_secret | AES-256-GCM na app | EncryptionService criado com scrypt + AES-256-GCM; chave via env MFA_ENCRYPTION_KEY |
| P003-01 | APPROVER visibility | Apenas própria equipa | APPROVER vê apenas colaboradores da sua equipa/departamento; refletido no RolesGuard e filtros futuros |
| P004-01 | Refresh token rotation | Activada | Cada refresh gera novo par access+refresh; anterior é invalidado |

---

## Histórico de Fases Concluídas

| Fase | Passo | Data | Descrição |
|------|-------|------|-----------|
| 0 | P-000 | 2026-07-06 | Bootstrap do monorepo: backend (NestJS), frontend (React 18 + Vite), shared (tipos), infra (Docker Compose dev/prod), ESLint, Prettier, Husky, lint-staged, .env.example, .gitignore |
| 1 | P-001 | 2026-07-06 | Infra Docker: docker-compose.dev.yml (postgres, redis, keycloak, minio, rabbitmq, backend, frontend + mailpit), docker-compose.prod.yml (com limites de recursos, restart unless-stopped), init.sql (uuid-ossp, schema hr, role hr_app), TypeORM CLI + data-source.ts + migrations/ vazio, keycloak realm-export.json (hr-suite, 4 roles, 2 clients) |
| 1 | P-002 | 2026-07-06 | Módulo Auth: entidades TypeORM (User, Session, Role, Permission, RolePermission, UserRole, PasswordResetToken, ApiKey), DTOs (Login, Register, RefreshToken, MfaVerify), JwtService customizado (jsonwebtoken), EncryptionService (AES-256-GCM), JwtAuthGuard com verificação de sessão no Redis via CacheModule, migração inicial CreateAuthTables, testes unitários JwtService |
| 1 | P-003 | 2026-07-06 | Módulo RBAC: decorators @Roles e @Permissions, RolesGuard (valida roles na BD), PermissionsGuard (valida resource:action), RbacService (assignRole, revokeRole, getUserPermissions, hasPermission), seed rbac.seed.ts (4 roles, 30 permissões base em 6 resources × 5 actions, admin@hr-suite.local), permissões por perfil (admin:* → manager:crud+approve → approver:read+approve equipa → employee:self) |
| 1 | P-004 | 2026-07-06 | Endpoints de autenticação: AuthService (login com validação argon2, refresh com rotação automática, logout com revogação de sessão, MFA enable/verify/disable com TOTP+QR code, change/reset password, getProfile), RateLimitGuard (10 req/min/IP), AuthAuditInterceptor, ChangePasswordDto, MfaDisableDto, ResetPasswordDto, E2E test (login→refresh→logout→me) |

---

## Contexto para Retoma

- **Package manager:** pnpm workspaces
- **Monorepo dirs:** `backend/`, `frontend/`, `shared/`, `infra/`
- **Base de dados:** PostgreSQL 16 (dev via Docker Compose)
- **Cache:** Redis 7 (dev via Docker Compose)
- **Storage:** MinIO (dev via Docker Compose)
- **Mail dev:** Mailpit
- **Linguagem:** TypeScript strict mode em todos os workspaces
- **Próximos passos esperados:** P-005 — Módulo de Auditoria (AuditLog)

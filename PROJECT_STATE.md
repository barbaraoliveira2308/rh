# Project State — HR Suite

> Ficheiro de estado para retoma futura do projecto.
> Actualizar sempre que uma fase é concluída.

---

## Estado Actual

| Campo                    | Valor                                                                                                                                                                                                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fase corrente            | Fase 1 — Fundação                                                                                                                                                                                                                                                                                         |
| Último passo concluído   | P-006 · Keycloak SSO e MFA TOTP (T-003, T-006)                                                                                                                                                                                                                                                            |
| Estado                   | Módulo de auditoria (AuditLog), Keycloak SSO (KeycloakService, Passport OIDC strategy, endpoints sso/redirect e sso/callback), MFA TOTP com otpauth (MfaService, geração secret+QR code, validação ±1 window), mfa_secret cifrado AES-256-GCM, realm-export.json atualizado (clients com PKCE e mappers). |
| Data última actualização | 2026-07-07                                                                                                                                                                                                                                                                                                |

---

## Decisões Tomadas

| ID      | Decisão                 | Valor                           | Impacto                                                                                                  |
| ------- | ----------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| P000-01 | Organização             | Bridge351                       | Scope nos packages (`@bridge351/srh-*`) e metadados do projecto                                          |
| P000-02 | Visibilidade            | Privado                         | Sem ficheiro LICENSE; sem configuração de registry público                                               |
| P001-01 | Portas Docker           | Padrão                          | 5432, 6379, 8080, 9000/9001, 5672/15672 — sem conflitos                                                  |
| P002-01 | Cifragem mfa_secret     | AES-256-GCM na app              | EncryptionService criado com scrypt + AES-256-GCM; chave via env MFA_ENCRYPTION_KEY                      |
| P003-01 | APPROVER visibility     | Apenas própria equipa           | APPROVER vê apenas colaboradores da sua equipa/departamento; refletido no RolesGuard e filtros futuros   |
| P004-01 | Refresh token rotation  | Activada                        | Cada refresh gera novo par access+refresh; anterior é invalidado                                         |
| P005-01 | Audit logs immutability | Append-only                     | BR-AUD-001: sem UPDATE/DELETE na tabela audit_logs; permissão admin apenas para leitura/export           |
| P006-01 | Keycloak vs local auth  | Login local + Keycloak opcional | Keycloak como IdP alternativo; login local como fallback; alinhado com UC-AUTH-001 e UC-AUTH-002 da spec |

---

## Histórico de Fases Concluídas

| Fase | Passo | Data       | Descrição                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---- | ----- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | P-000 | 2026-07-06 | Bootstrap do monorepo: backend (NestJS), frontend (React 18 + Vite), shared (tipos), infra (Docker Compose dev/prod), ESLint, Prettier, Husky, lint-staged, .env.example, .gitignore                                                                                                                                                                                                                                                            |
| 1    | P-001 | 2026-07-06 | Infra Docker: docker-compose.dev.yml (postgres, redis, keycloak, minio, rabbitmq, backend, frontend + mailpit), docker-compose.prod.yml (com limites de recursos, restart unless-stopped), init.sql (uuid-ossp, schema hr, role hr_app), TypeORM CLI + data-source.ts + migrations/ vazio, keycloak realm-export.json (hr-suite, 4 roles, 2 clients)                                                                                            |
| 1    | P-002 | 2026-07-06 | Módulo Auth: entidades TypeORM (User, Session, Role, Permission, RolePermission, UserRole, PasswordResetToken, ApiKey), DTOs (Login, Register, RefreshToken, MfaVerify), JwtService customizado (jsonwebtoken), EncryptionService (AES-256-GCM), JwtAuthGuard com verificação de sessão no Redis via CacheModule, migração inicial CreateAuthTables, testes unitários JwtService                                                                |
| 1    | P-003 | 2026-07-06 | Módulo RBAC: decorators @Roles e @Permissions, RolesGuard (valida roles na BD), PermissionsGuard (valida resource:action), RbacService (assignRole, revokeRole, getUserPermissions, hasPermission), seed rbac.seed.ts (4 roles, 30 permissões base em 6 resources × 5 actions, admin@hr-suite.local), permissões por perfil (admin:* → manager:crud+approve → approver:read+approve equipa → employee:self)                                     |
| 1    | P-004 | 2026-07-06 | Endpoints de autenticação: AuthService (login com validação argon2, refresh com rotação automática, logout com revogação de sessão, MFA enable/verify/disable com TOTP+QR code, change/reset password, getProfile), RateLimitGuard (10 req/min/IP), AuthAuditInterceptor, ChangePasswordDto, MfaDisableDto, ResetPasswordDto, E2E test (login→refresh→logout→me)                                                                                |
| 1    | P-005 | 2026-07-07 | Módulo de Auditoria (AuditLog): entidade AuditLog (schema hr, 11 campos, 3 índices, FK users), migração append-only, AuditService com queue assíncrona, AuditInterceptor (REQUEST scope) com auto-log CRUD via @Audit decorator, controller GET /audit/logs com filtros e paginação cursor-based + GET /audit/logs/export CSV, mascaramento de campos sensíveis, permissão admin                                                                |
| 1    | P-006 | 2026-07-07 | Integração Keycloak SSO (KeycloakService com exchangeCodeForTokens/getUserInfo/syncUser JIT, KeycloakStrategy Passport OIDC, endpoints GET /auth/sso/redirect e /auth/sso/callback), MFA TOTP com otpauth (MfaService: geração secret+QR code, validação com janela ±1 período), substituição otplib → otpauth, EncryptionService testado, realm-export.json atualizado (client srh-backend com realm-roles mapper, srh-frontend com PKCE S256) |

---

## Contexto para Retoma

- **Package manager:** pnpm workspaces
- **Monorepo dirs:** `backend/`, `frontend/`, `shared/`, `infra/`
- **Base de dados:** PostgreSQL 16 (dev via Docker Compose)
- **Cache:** Redis 7 (dev via Docker Compose)
- **Storage:** MinIO (dev via Docker Compose)
- **Mail dev:** Mailpit
- **Linguagem:** TypeScript strict mode em todos os workspaces
- **Próximos passos esperados:** P-007 — CRUD de Utilizadores (T-007)

# Módulo 01 — Autenticação & Segurança

## Objetivo

Gerir a identidade dos utilizadores, autenticação segura, autorização baseada em perfis (RBAC), SSO e integração com provedores de identidade externos.

---

## Responsabilidades

1. Autenticar utilizadores via username/password, SSO (OIDC/SAML 2.0).
2. Emitir e validar tokens JWT.
3. Gerir sessões, expiração e timeout automático.
4. Suportar autenticação multifator (MFA).
5. Gerir recuperação de password.
6. Integrar com Keycloak como Identity Provider.
7. Implementar RBAC — Role-Based Access Control.
8. Registar logs de autenticação para auditoria.

---

## Entidades

### User (utilizador autenticado)

| Campo               | Tipo         | Validação                          | Notas                             |
| ------------------- | ------------ | ---------------------------------- | --------------------------------- |
| id                  | UUID         | PK, obrigatório                    | Gerado pelo sistema               |
| email               | VARCHAR(255) | Único, formato válido, obrigatório | Usado como login                  |
| username            | VARCHAR(100) | Único, obrigatório                 | Alternativa de login              |
| password_hash       | VARCHAR(512) | Bcrypt/Argon2, obrigatório         | Nunca armazenar em claro          |
| is_active           | BOOLEAN      | Default true                       | Desativação lógica                |
| mfa_enabled         | BOOLEAN      | Default false                      | MFA obrigatório para Admin/Gestor |
| mfa_secret          | VARCHAR(256) | Nullable                           | TOTP secret                       |
| last_login_at       | TIMESTAMP    | Nullable                           | Registo de auditoria              |
| failed_login_count  | INT          | Default 0, max 5                   | Bloqueio após falhas              |
| locked_until        | TIMESTAMP    | Nullable                           | Bloqueio temporário               |
| password_changed_at | TIMESTAMP    | Obrigatório                        | Política de rotação               |
| created_at          | TIMESTAMP    | Auto                               | —                                 |
| updated_at          | TIMESTAMP    | Auto                               | —                                 |

### Session

| Campo      | Tipo         | Validação   | Notas               |
| ---------- | ------------ | ----------- | ------------------- |
| id         | UUID         | PK          | —                   |
| user_id    | UUID         | FK → User   | —                   |
| token_hash | VARCHAR(512) | Único       | Hash do JWT         |
| ip_address | VARCHAR(45)  | IPv4/IPv6   | —                   |
| user_agent | TEXT         | Nullable    | —                   |
| expires_at | TIMESTAMP    | Obrigatório | —                   |
| revoked_at | TIMESTAMP    | Nullable    | Logout ou revogação |

### Role

| Campo       | Tipo        | Validação     | Notas                              |
| ----------- | ----------- | ------------- | ---------------------------------- |
| id          | UUID        | PK            | —                                  |
| name        | VARCHAR(50) | Único         | admin, manager, approver, employee |
| description | TEXT        | Nullable      | —                                  |
| is_system   | BOOLEAN     | Default false | Não editável pelo utilizador       |

### Permission

| Campo       | Tipo         | Validação   | Notas                                 |
| ----------- | ------------ | ----------- | ------------------------------------- |
| id          | UUID         | PK          | —                                     |
| resource    | VARCHAR(100) | Obrigatório | ex: "absences", "timesheets"          |
| action      | VARCHAR(50)  | Obrigatório | create, read, update, delete, approve |
| description | TEXT         | Nullable    | —                                     |

### RolePermission

| Campo         | Tipo | Notas           |
| ------------- | ---- | --------------- |
| role_id       | UUID | FK → Role       |
| permission_id | UUID | FK → Permission |

### UserRole

| Campo       | Tipo      | Notas     |
| ----------- | --------- | --------- |
| user_id     | UUID      | FK → User |
| role_id     | UUID      | FK → Role |
| assigned_at | TIMESTAMP | —         |
| assigned_by | UUID      | FK → User |

---

## Casos de Uso

> **Estado por caso de uso.** Esta tabela é a fonte de verdade sobre o que está por fazer neste módulo; atualizá-la faz parte das Acções de Fecho de qualquer fase que toque Auth. Um estado `⚠️ Parcial` **tem de nomear o passo** do fluxo principal que falha — um estado binário esconde exactamente o tipo de falha que este módulo já teve (UC-AUTH-001 funciona para quem não tem MFA, o que manteve a nota de implementação a dizer "Entregue" durante várias fases). A coluna de evidência aponta para um teste, não para código-fonte: um teste falha quando a realidade muda, uma nota em prosa não.

| UC          | Nome                          | Estado       | Evidência (e2e)                                                                                                                                                                          | Desvio / passo em falta                                                                                                                                                                                                                                                                                                                                     |
| ----------- | ----------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UC-AUTH-001 | Login com Username/Password   | ✅ Concluído | `test/auth.e2e-spec.ts` → "Login com MFA (UC-AUTH-001 passo 4 e fluxos 2a/4a)" (desafio + TOTP, código de recuperação, 4a com bloqueio, 2a com 403) e os cenários de login já existentes | Passo 1 aceita só `email`, não `username` — desvio registado, decisão P093-02. (Resolvido em P-093: desafio MFA em `POST /auth/login` + `POST /auth/login/mfa`, 403 na tentativa que bloqueia, 4a regista e conta a falha.)                                                                                                                                 |
| UC-AUTH-002 | Login via SSO (Keycloak/OIDC) | ⏸ Adiado     | —                                                                                                                                                                                        | **Removido em P-094** (decisão P094-01): o utilizador escolheu autenticação só na aplicação; Keycloak, `KeycloakService`/`KeycloakStrategy` e os endpoints `/auth/sso/*` foram apagados. O caso de uso volta quando o SSO for reintroduzido, desenhado de raiz — incluindo `state`/PKCE (ex-`R-063`) e sessões reais em `hr.sessions` (requisito de P-090). |
| UC-AUTH-003 | Recuperação de Password       | ✅ Concluído | `test/auth.e2e-spec.ts` → "Reset de password (UC-AUTH-003)" (3 cenários, incl. ponta a ponta com o token extraído do email)                                                              | — (resolvido em P-091; passo 7 já efetivo desde P-090)                                                                                                                                                                                                                                                                                                      |
| UC-AUTH-004 | Logout                        | ✅ Concluído | `test/auth.e2e-spec.ts` → "deve invalidar access token e refresh token após logout"                                                                                                      | — (resolvido em P-090)                                                                                                                                                                                                                                                                                                                                      |
| UC-AUTH-005 | Configurar MFA                | ✅ Concluído | `test/auth.e2e-spec.ts` → "Configurar MFA (UC-AUTH-005)" (ponta a ponta: segredo, confirmação, 10 códigos de recuperação, regeneração, desativação com código de recuperação)            | — (resolvido em P-092: página `/settings/security`, passo 6 implementado, decisões P092-01 a P092-05)                                                                                                                                                                                                                                                       |

### UC-AUTH-001 — Login com Username/Password

**Objetivo:** Autenticar um utilizador com credenciais locais.  
**Pré-condições:** Utilizador existe e está ativo.  
**Fluxo Principal:**

1. Utilizador submete username/password.
2. Sistema valida credenciais contra hash armazenado.
3. Sistema verifica se conta está ativa e não bloqueada.
4. Se MFA ativo, sistema solicita código TOTP.
5. Sistema emite JWT (access token + refresh token).
6. Sistema regista log de acesso.
7. Utilizador é redirecionado para dashboard.

**Fluxos Alternativos:**

- 2a. Password incorreta → incrementar `failed_login_count`; após 5 falhas, bloquear conta por 15 minutos.
- 3a. Conta inativa → retornar erro 403 com mensagem adequada.
- 4a. Código TOTP inválido → rejeitar login, registar tentativa falhada.

**Pós-condições:** Sessão criada; JWT emitido; log registado.  
**Erros:** 401 (credenciais inválidas), 403 (conta bloqueada/inativa), 429 (muitas tentativas).

---

### UC-AUTH-002 — Login via SSO (Keycloak/OIDC)

> **Adiado desde P-094 (decisão P094-01).** Não existe implementação: o Keycloak e todo o código de SSO foram removidos. O texto abaixo fica como requisito para quando o SSO for reintroduzido.

**Objetivo:** Autenticar via Identity Provider externo.  
**Pré-condições:** Keycloak configurado; utilizador existe no IdP.  
**Fluxo Principal:**

1. Utilizador clica "Login com SSO".
2. Sistema redireciona para Keycloak.
3. Keycloak autentica utilizador (inclui MFA se configurado).
4. Keycloak retorna authorization code.
5. Sistema troca code por tokens.
6. Sistema verifica/cria utilizador local (Just-In-Time provisioning).
7. Sistema emite sessão interna.

**Fluxos Alternativos:**

- 6a. Utilizador não existe → criar automaticamente com perfil "Colaborador" (JIT provisioning).
- 6b. Utilizador desativado localmente → rejeitar acesso mesmo com SSO válido.

**Pós-condições:** Sessão criada; utilizador sincronizado.  
**Erros:** 401, 503 (IdP indisponível).

---

### UC-AUTH-003 — Recuperação de Password

**Objetivo:** Permitir reset seguro de password.  
**Pré-condições:** Email registado no sistema.  
**Fluxo Principal:**

1. Utilizador submete email na página de recuperação.
2. Sistema valida se email existe.
3. Sistema gera token único de reset (TTL: 1 hora).
4. Sistema envia email com link de reset.
5. Utilizador acede ao link e define nova password.
6. Sistema valida token, força de password e atualiza hash.
7. Sistema invalida todas as sessões ativas.
8. Sistema regista evento de auditoria.

**Fluxos Alternativos:**

- 2a. Email não existe → responder com mensagem genérica (não revelar existência).
- 3a. Token expirado → informar utilizador e solicitar novo reset.

**Erros:** 400 (token inválido/expirado), 422 (password não cumpre política).

---

### UC-AUTH-004 — Logout

**Objetivo:** Encerrar sessão de forma segura.  
**Fluxo Principal:**

1. Utilizador clica "Logout".
2. Sistema revoga refresh token.
3. Sistema invalida sessão no servidor.
4. Sistema regista log de logout.
5. Utilizador é redirecionado para login.

---

### UC-AUTH-005 — Configurar MFA

**Objetivo:** Ativar autenticação multifator.  
**Pré-condições:** Utilizador autenticado.  
**Fluxo Principal:**

1. Utilizador acede a definições de segurança.
2. Sistema gera segredo TOTP e apresenta QR Code.
3. Utilizador configura aplicação autenticadora.
4. Utilizador submete código de confirmação.
5. Sistema valida código e ativa MFA.
6. Sistema apresenta códigos de recuperação de emergência.

---

## Regras de Negócio

| ID          | Regra                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| BR-AUTH-001 | MFA é obrigatório para perfis Administrador e Gestor.                                                     |
| BR-AUTH-002 | Após 5 tentativas de login falhadas, a conta é bloqueada por 15 minutos.                                  |
| BR-AUTH-003 | Tokens JWT de acesso expiram em 15 minutos; refresh tokens em 7 dias.                                     |
| BR-AUTH-004 | Passwords devem ter mínimo 10 caracteres, incluir maiúsculas, minúsculas, números e caracteres especiais. |
| BR-AUTH-005 | Sessões inativas por mais de 30 minutos são encerradas automaticamente.                                   |
| BR-AUTH-006 | Não é permitida reutilização das últimas 5 passwords.                                                     |
| BR-AUTH-007 | Um utilizador desativado não pode autenticar-se, mesmo com SSO válido.                                    |
| BR-AUTH-008 | Todos os eventos de autenticação devem ser registados (sucesso, falha, logout, bloqueio).                 |

---

## Requisitos Funcionais

| ID          | Descrição                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| RF-AUTH-001 | O sistema deve suportar autenticação via username/password com hash Bcrypt ou Argon2.                 |
| RF-AUTH-002 | O sistema deve suportar SSO via OpenID Connect (OIDC) com Keycloak.                                   |
| RF-AUTH-003 | O sistema deve suportar SAML 2.0 para integração empresarial.                                         |
| RF-AUTH-004 | O sistema deve emitir tokens JWT assinados (RS256 ou ES256).                                          |
| RF-AUTH-005 | O sistema deve suportar MFA via TOTP (RFC 6238).                                                      |
| RF-AUTH-006 | O sistema deve implementar recuperação de password segura por email.                                  |
| RF-AUTH-007 | O sistema deve suportar geração e revogação de API Keys para integrações.                             |
| RF-AUTH-008 | O sistema deve permitir configuração de políticas de password (comprimento, complexidade, expiração). |
| RF-AUTH-009 | O sistema deve suportar Just-In-Time provisioning de utilizadores via SSO.                            |
| RF-AUTH-010 | O sistema deve implementar timeout automático de sessão configurável.                                 |

---

## Requisitos Não Funcionais

| ID           | Descrição                                                           |
| ------------ | ------------------------------------------------------------------- |
| RNF-AUTH-001 | Autenticação deve completar em menos de 500ms em condições normais. |
| RNF-AUTH-002 | Passwords nunca devem ser armazenadas ou transmitidas em claro.     |
| RNF-AUTH-003 | Tokens JWT devem usar chaves RSA de mínimo 2048 bits.               |
| RNF-AUTH-004 | O sistema deve suportar rotação de chaves JWT sem downtime.         |
| RNF-AUTH-005 | Comunicação deve ser exclusivamente via HTTPS/TLS 1.2+.             |

---

## Permissões por Perfil

| Ação                                      | Administrador | Gestor | Aprovador | Colaborador |
| ----------------------------------------- | :-----------: | :----: | :-------: | :---------: |
| Login                                     |      ✅       |   ✅   |    ✅     |     ✅      |
| Configurar MFA próprio                    |      ✅       |   ✅   |    ✅     |     ✅      |
| Forçar reset password de outro utilizador |      ✅       |   ❌   |    ❌     |     ❌      |
| Revogar sessões de outros utilizadores    |      ✅       |   ❌   |    ❌     |     ❌      |
| Gerir API Keys                            |      ✅       |   ❌   |    ❌     |     ❌      |
| Configurar políticas de password          |      ✅       |   ❌   |    ❌     |     ❌      |
| Configurar SSO/OIDC                       |      ✅       |   ❌   |    ❌     |     ❌      |

---

## Eventos do Sistema

| Evento              | Trigger               | Payload                                |
| ------------------- | --------------------- | -------------------------------------- |
| `UserLoggedIn`      | Login com sucesso     | user_id, ip, timestamp, method         |
| `UserLoginFailed`   | Credenciais inválidas | username, ip, timestamp, attempt_count |
| `UserAccountLocked` | 5 falhas consecutivas | user_id, locked_until                  |
| `UserLoggedOut`     | Logout                | user_id, session_id, timestamp         |
| `PasswordChanged`   | Reset ou alteração    | user_id, timestamp                     |
| `MFAEnabled`        | Ativação MFA          | user_id, timestamp                     |
| `MFADisabled`       | Desativação MFA       | user_id, by_admin, timestamp           |
| `SessionExpired`    | Timeout inativo       | user_id, session_id                    |
| `ApiKeyCreated`     | Criação de API Key    | key_id, user_id, timestamp             |
| `ApiKeyRevoked`     | Revogação de API Key  | key_id, user_id, timestamp             |

---

## APIs

### POST /api/v1/auth/login

| Campo          | Valor                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| Método         | POST                                                                     |
| Endpoint       | `/api/v1/auth/login`                                                     |
| Auth           | Público                                                                  |
| **Entrada**    | `{ username, password, mfa_code? }`                                      |
| **Saída**      | `{ access_token, refresh_token, expires_in, user: { id, name, roles } }` |
| **Validações** | username obrigatório; password obrigatória; mfa_code se MFA ativo        |
| **HTTP**       | 200 OK, 401 Unauthorized, 403 Forbidden, 429 Too Many Requests           |

### POST /api/v1/auth/refresh

| Campo       | Valor                              |
| ----------- | ---------------------------------- |
| Método      | POST                               |
| Endpoint    | `/api/v1/auth/refresh`             |
| Auth        | Refresh Token                      |
| **Entrada** | `{ refresh_token }`                |
| **Saída**   | `{ access_token, expires_in }`     |
| **HTTP**    | 200, 401 (token inválido/expirado) |

### POST /api/v1/auth/logout

| Campo       | Valor                       |
| ----------- | --------------------------- |
| Método      | POST                        |
| Endpoint    | `/api/v1/auth/logout`       |
| Auth        | JWT                         |
| **Entrada** | Vazio (usa token do header) |
| **Saída**   | `{ message: "Logged out" }` |
| **HTTP**    | 200, 401                    |

### POST /api/v1/auth/password/reset-request

| Campo       | Valor                                     |
| ----------- | ----------------------------------------- |
| Método      | POST                                      |
| Endpoint    | `/api/v1/auth/password/reset-request`     |
| Auth        | Público                                   |
| **Entrada** | `{ email }`                               |
| **Saída**   | `{ message: "Email enviado se existir" }` |
| **HTTP**    | 200 (sempre, para não revelar existência) |

### POST /api/v1/auth/password/reset

| Campo       | Valor                                              |
| ----------- | -------------------------------------------------- |
| Método      | POST                                               |
| Endpoint    | `/api/v1/auth/password/reset`                      |
| Auth        | Token de reset                                     |
| **Entrada** | `{ token, new_password, confirm_password }`        |
| **Saída**   | `{ message: "Password alterada" }`                 |
| **HTTP**    | 200, 400 (token inválido), 422 (password inválida) |

### GET /api/v1/auth/sso/redirect

> **Não implementado desde P-094** — ver UC-AUTH-002.

| Campo     | Valor                       |
| --------- | --------------------------- |
| Método    | GET                         |
| Endpoint  | `/api/v1/auth/sso/redirect` |
| Auth      | Público                     |
| **Saída** | Redirect para IdP           |
| **HTTP**  | 302                         |

### POST /api/v1/auth/sso/callback

> **Não implementado desde P-094** — ver UC-AUTH-002.

| Campo       | Valor                             |
| ----------- | --------------------------------- |
| Método      | POST                              |
| Endpoint    | `/api/v1/auth/sso/callback`       |
| Auth        | Público                           |
| **Entrada** | `{ code, state }`                 |
| **Saída**   | `{ access_token, refresh_token }` |
| **HTTP**    | 200, 401, 503                     |

---

## Modelo de Dados (Schema)

```
Table: users
- id UUID PK
- email VARCHAR(255) UNIQUE NOT NULL
- username VARCHAR(100) UNIQUE NOT NULL
- password_hash VARCHAR(512)
- is_active BOOLEAN DEFAULT TRUE
- mfa_enabled BOOLEAN DEFAULT FALSE
- mfa_secret VARCHAR(256)
- last_login_at TIMESTAMP
- failed_login_count INT DEFAULT 0
- locked_until TIMESTAMP
- password_changed_at TIMESTAMP
- created_at TIMESTAMP DEFAULT NOW()
- updated_at TIMESTAMP DEFAULT NOW()

Indexes: idx_users_email, idx_users_username, idx_users_is_active

Table: sessions
- id UUID PK
- user_id UUID FK users(id)
- token_hash VARCHAR(512) UNIQUE
- ip_address VARCHAR(45)
- user_agent TEXT
- expires_at TIMESTAMP NOT NULL
- revoked_at TIMESTAMP
- created_at TIMESTAMP DEFAULT NOW()

Indexes: idx_sessions_user_id, idx_sessions_token_hash, idx_sessions_expires_at

Table: roles
- id UUID PK
- name VARCHAR(50) UNIQUE NOT NULL
- description TEXT
- is_system BOOLEAN DEFAULT FALSE
- created_at TIMESTAMP

Table: permissions
- id UUID PK
- resource VARCHAR(100) NOT NULL
- action VARCHAR(50) NOT NULL
- description TEXT
UNIQUE(resource, action)

Table: role_permissions
- role_id UUID FK roles(id)
- permission_id UUID FK permissions(id)
PK(role_id, permission_id)

Table: user_roles
- user_id UUID FK users(id)
- role_id UUID FK roles(id)
- assigned_at TIMESTAMP DEFAULT NOW()
- assigned_by UUID FK users(id)
PK(user_id, role_id)

Table: password_reset_tokens
- id UUID PK
- user_id UUID FK users(id)
- token_hash VARCHAR(512) UNIQUE
- expires_at TIMESTAMP NOT NULL
- used_at TIMESTAMP

Table: api_keys
- id UUID PK
- user_id UUID FK users(id)
- key_hash VARCHAR(512) UNIQUE
- name VARCHAR(100)
- last_used_at TIMESTAMP
- expires_at TIMESTAMP
- revoked_at TIMESTAMP
- created_at TIMESTAMP
```

---

## Critérios de Aceitação (Gherkin)

```gherkin
Feature: Login com credenciais válidas

  Scenario: Login com sucesso
    Given um utilizador ativo com email "user@empresa.pt" e password "Password123!"
    When o utilizador submete as credenciais corretas
    Then o sistema retorna HTTP 200
    And retorna um access_token JWT válido
    And retorna um refresh_token
    And regista um evento "UserLoggedIn" nos logs de auditoria

  Scenario: Login com password incorreta
    Given um utilizador ativo com email "user@empresa.pt"
    When o utilizador submete uma password incorreta
    Then o sistema retorna HTTP 401
    And incrementa o contador de tentativas falhadas
    And NÃO retorna qualquer token

  Scenario: Bloqueio após 5 falhas
    Given um utilizador com 4 tentativas falhadas
    When o utilizador submete uma 5ª password incorreta
    Then o sistema retorna HTTP 403
    And bloqueia a conta por 15 minutos
    And emite evento "UserAccountLocked"

  Scenario: MFA obrigatório para Administrador
    Given um utilizador Administrador sem MFA configurado
    When o utilizador faz login com credenciais corretas
    Then o sistema redireciona para configuração de MFA
    And NÃO concede acesso ao sistema sem MFA ativo

  Scenario: Timeout de sessão
    Given um utilizador autenticado com sessão inativa há 31 minutos
    When o utilizador tenta fazer qualquer pedido autenticado
    Then o sistema retorna HTTP 401
    And regista evento "SessionExpired"
```

---

## Casos Limite (Edge Cases)

1. Utilizador tenta login enquanto conta está em processo de reset de password.
2. Dois dispositivos fazem login simultâneo com o mesmo utilizador.
3. SSO retorna claims com email diferente do registado localmente.
4. Token JWT expirado é enviado em request — deve retornar 401 claro.
5. MFA secret perdido — processo de recuperação via admin.
6. Utilizador desativado tenta usar refresh token válido.
7. API Key usada após revogação do utilizador associado.

---

## Riscos

| ID         | Risco                                                      | Probabilidade | Impacto | Mitigação                                           |
| ---------- | ---------------------------------------------------------- | :-----------: | :-----: | --------------------------------------------------- |
| R-AUTH-001 | Keycloak indisponível bloqueia todos os logins SSO         |     Média     |  Alta   | Fallback para login local; health check com alertas |
| R-AUTH-002 | Ausência de rotação automática de JWT keys                 |     Baixa     |  Alta   | Implementar JWKS endpoint com rotação programada    |
| R-AUTH-003 | Política de MFA obrigatória pode bloquear onboarding       |     Média     |  Média  | Período de graça configurável pós-criação de conta  |
| R-AUTH-004 | JIT provisioning pode criar utilizadores com perfil errado |     Baixa     |  Alta   | Definir perfil default e processo de revisão        |

---

## Notas de Implementação

### Entregue

- **Entidades TypeORM:** `User`, `Session`, `Role`, `Permission`, `RolePermission`, `UserRole`, `PasswordResetToken`, `PasswordHistory`, `MfaRecoveryCode` (P-092), `ApiKey`.
- **DTOs:** `LoginDto`, `RegisterDto`, `RefreshTokenDto`, `MfaVerifyDto`, `MfaDisableDto`, `ChangePasswordDto`, `ResetPasswordDto`.
- **Serviços:** `AuthService`, `JwtService` (custom), `EncryptionService`, `MfaService`.
- **Controlador:** `AuthController`.
- **Guards:** `JwtAuthGuard`, `RateLimitGuard`.
- **Interceptor:** `AuthAuditInterceptor`.
- **Integração Keycloak:** ~~`KeycloakModule`, `KeycloakService`, `KeycloakStrategy` (OIDC/OAuth2).~~ **Removida em P-094** (decisão P094-01), juntamente com as dependências `@nestjs/passport`, `passport` e `passport-oauth2`, que só serviam a estratégia OIDC.
- **Endpoints implementados** (prefixo global `/api`):
  - `POST /api/auth/login`
  - `POST /api/auth/login/mfa` (P-093)
  - `POST /api/auth/logout`
  - `POST /api/auth/refresh`
  - `POST /api/auth/mfa/enable`
  - `POST /api/auth/mfa/verify`
  - `POST /api/auth/mfa/disable`
  - `POST /api/auth/mfa/recovery-codes` (P-092)
  - `POST /api/auth/password/change`
  - `POST /api/auth/password/reset`
  - `GET /api/auth/me`
- **Base de dados:** migração `CreateAuthTables1720000000000` cria todas as tabelas do módulo; seed `rbac.seed` cria roles (`admin`, `manager`, `approver`, `employee`), permissões e utilizador admin inicial.
- **Validação de sessão:** o `JwtAuthGuard` verifica atividade da sessão via `CacheService` (chaves `session:<hash>` e `refresh:<hash>`).
- **Auditoria:** `AuthAuditInterceptor` emite eventos de auditoria para o logger do NestJS em todas as rotas do `AuthController`.

### Simplificações/Decisões

- **`JwtService` customizado** em vez de `@nestjs/jwt`; usa a biblioteca `jsonwebtoken` com `jti` único por token. ~~Assinatura HMAC (segredo simétrico), sem RS256/ES256 nem JWKS.~~ **Resolvido em P-076** (achado Alto da auditoria de 2026-08-16, RNF-AUTH-003): access e refresh tokens passam a ser assinados com **RS256** (RSA 2048-bit), cada um com o seu próprio par de chaves (`JWT_ACCESS_PRIVATE_KEY`/`JWT_ACCESS_PUBLIC_KEY`, `JWT_REFRESH_PRIVATE_KEY`/`JWT_REFRESH_PUBLIC_KEY`), mantendo a separação já existente entre os 2 segredos. Chaves geradas via `openssl` (PKCS8/SPKI PEM), codificadas em base64 para caberem no formato `KEY=value` de uma linha do `.env` (decisão P076-02); `scripts/generate-secrets.sh` atualizado para as gerar. **Não implementado** (âmbito conscientemente deixado de fora, decisão P076-00): RNF-AUTH-004 ("rotação de chaves JWT sem downtime") — não há JWKS nem suporte a múltiplas chaves ativas (`kid`); rodar as chaves privadas invalida imediatamente todas as sessões ativas, sem transição gradual (decisão P076-03, aceite explicitamente pelo utilizador). Continua sem JWKS público. Ver `specs/GLOBAL-TASKS-RISKS.md` (`R-049`, novo risco/gap documentado) e `AUDIT_REPORT_2026-08-16.md`.
- **Hash de passwords** realizado com `argon2` (não Bcrypt).
- **Login por email:** o endpoint `POST /api/auth/login` recebe `email` e `password`; o campo `username` existe na entidade mas não é usado como credencial de login. **Mantido em P-093 como desvio registado** (decisão P093-02, escolhida pelo utilizador): o email é único, é o identificador que a recuperação de password já usa e o que os utilizadores conhecem.
- **Desafio MFA no login (P-093, UC-AUTH-001 passo 4, decisão P093-01):** o contrato da secção APIs (`{ username, password, mfa_code? }` num só pedido) foi substituído por dois passos. Com MFA ativo, `POST /auth/login` devolve **200** `{ mfaRequired: true, challengeToken }` sem emitir sessão; `POST /auth/login/mfa` recebe `{ challengeToken, code }` e devolve a mesma resposta de sucesso do login. O `code` pode ser TOTP ou um código de recuperação (consumido). O desafio é um token aleatório de 32 bytes, guardado em cache só como hash (`mfa-challenge:<sha256>`), válido **5 minutos**, de uso único, e sobrevive a um código errado para o utilizador poder corrigir. Antes, o backend devolvia 400 (`Código MFA obrigatório`) e o frontend esperava `requiresMfa` numa resposta de sucesso, pelo que o passo nunca aparecia; e a correção óbvia do frontend (reenviar email + password + código) obrigava o browser a guardar a password em memória entre os dois passos — o que deixa de acontecer.
- **Contador de falhas e MFA (P-093, fluxo alternativo 4a, decisão P093-04):** um código errado é registado na auditoria (`LOGIN_MFA_FAILED`) e conta para o **mesmo** contador que as passwords erradas (BR-AUTH-002): ao 5.º, a conta bloqueia e o desafio é invalidado. O contador só é reposto quando a sessão é efetivamente emitida — se fosse reposto no passo da password, alternar password certa e código errado dava tentativas ilimitadas ao código. O `loginMfa` partilha o `RateLimitGuard` do login (10 pedidos/minuto por IP, somados).
- **403 na tentativa que bloqueia (P-093, fluxo alternativo 2a):** até aqui a tentativa que atingia o limite devolvia 401 e só a seguinte recebia 403. A secção Erros pede 403 para conta bloqueada; passa a ser devolvido logo nessa tentativa (`registerFailedAttempt()`, antes `handleFailedLogin()`).
- **Mensagens de erro do login (P-093):** o frontend mostrava a mensagem genérica do axios ("Request failed with status code 401"); passa a mostrar a do servidor (`getErrorMessage`), como as páginas de reset já faziam.
- **Gestão de sessão:** o estado ativo das sessões é mantido em cache (`CacheService`); a tabela `sessions` regista metadados, hash do token e revogações. **Desde P-090** (UC-AUTH-004 passo 2), o `refresh()` deixou de confiar apenas na cache: carrega a sessão pelo `sessionId` guardado no valor da chave `refresh:<hash>` e rejeita o pedido se a sessão estiver revogada ou não existir (decisões P090-01 e P090-02). É este o mecanismo que torna o logout efetivo — o `logout()` não consegue apagar a chave `refresh:<hash>` porque só recebe o hash do access token, pelo que a revogação tem de ser verificada do lado do `refresh()` — e, pelo mesmo caminho, torna efetiva a revogação de sessões já feita por `changePassword()`/`confirmResetPassword()` (UC-AUTH-003 passo 7), que até aqui marcava `revokedAt` sem qualquer consequência prática.
- **Criptografia MFA:** `EncryptionService` utiliza **AES-256-GCM** com IV e tag de autenticação; a chave deriva de `MFA_ENCRYPTION_KEY` via `scryptSync`.
- **Rate limiting:** `RateLimitGuard` em memória, por IP, com limite de **10 pedidos por minuto** aplicado apenas ao login.
- **SSO:** ~~implementação OIDC manual com troca de `authorization_code` por tokens e sincronização JIT do utilizador. Não há suporte a SAML 2.0.~~ **Removido em P-094** — nunca chegou a completar em browser (ver a linha de UC-AUTH-002 antes de P-094 no histórico do git).
- **Callback SSO:** ~~implementado como `GET /api/auth/sso/callback` (especificação original indicava `POST`).~~ Removido em P-094.
- **Reset de password:** ~~`POST /api/auth/password/reset` apenas verifica se o email existe e retorna mensagem genérica; não gera token, não envia email e não existe endpoint de consumo do token de reset.~~ **Resolvido em P-072** (achado Crítico da auditoria de 2026-08-16): fluxo UC-AUTH-003 completo implementado — token aleatório de 32 bytes, hash SHA-256 em `password_reset_tokens` (TTL 1h), email via `NotificationsService`, novo `POST /auth/password/reset/confirm`, revogação de sessões ativas, eventos de auditoria `PASSWORD_RESET_REQUESTED`/`PASSWORD_RESET_COMPLETED`. Nota de processo: esta nota nunca tinha sido atualizada apesar da correção — backfill feito em P-075. **Fluxo completado em P-091** (UC-AUTH-003 fechado): até aqui o backend estava feito mas era inalcançável — o email apontava para `${APP_URL}/reset-password?token=`, ou seja para a origem do **backend** (`APP_URL` não está definida em lado nenhum, logo caía no default `http://localhost:3000`) e para um caminho que não correspondia a nenhuma rota da SPA; e nenhuma página consumia o token. P-091 resolveu os dois lados — ver as 5 notas seguintes.
- **`FRONTEND_URL` (novo em P-091, decisão P091-02):** o link do email passa a usar `FRONTEND_URL` (origem pública da SPA) e não `APP_URL`. As duas são precisas e são **origens diferentes**: `APP_URL` é a origem do backend e é usada pelo `redirect_uri` do SSO, que tem de apontar para uma rota do backend. Sobrecarregar `APP_URL` para servir o email teria partido o SSO de forma nova. Acrescentada a `.env`, `.env.example` e ao bloco `environment:` do serviço `backend` nos dois compose. _(Nota de P-094: com a remoção do SSO, `APP_URL` deixou de ser lida por qualquer código.)_
- **Nomes dos endpoints alinhados com a spec (P-091, decisão P091-03):** até aqui `POST /auth/password/reset` era o **pedido** e `POST /auth/password/reset/confirm` o **consumo** — exatamente ao contrário do que a secção APIs desta spec sempre descreveu. Renomeados para `POST /auth/password/reset-request` (pedido) e `POST /auth/password/reset` (consumo). Sem consumidores externos; o único chamador era `requestPasswordReset()` no frontend.
- **Página de consumo do token (P-091, decisão P091-01):** nova `ResetPasswordConfirmPage.tsx` em `/auth/reset-password/confirm`, separada da página de pedido em vez de um segundo modo da mesma. Os dois ecrãs não partilham praticamente nada (schema, chamada à API, estados de sucesso e erro) e são alcançados por caminhos distintos — o de confirmação vem de um email, possivelmente dias depois e noutro browser.
- **422 não é devolvido (P-091, decisão P091-04):** a secção Erros deste caso de uso prevê 422 para password fora da política, mas o `ValidationPipe` global do NestJS devolve **400**. Devolver 422 exigiria alterar o `errorHttpStatusCode` global — que muda o código de resposta de **todos os endpoints dos 23 módulos** e parte testes existentes — ou montar validação à medida só neste endpoint. Desvio consciente: ao contrário do 401/403 de UC-AUTH-001 (onde a distinção carrega significado real: credenciais erradas vs. conta bloqueada), 400 e 422 dizem aqui exatamente a mesma coisa.
- **`confirm_password` não existe no DTO (P-091, decisão P091-05):** a secção APIs indica `{ token, new_password, confirm_password }`; o `ConfirmResetPasswordDto` recebe só `{ token, newPassword }`. A confirmação é proteção contra gralhas, não um controlo de segurança, e é feita no formulário (`zod.refine()`); enviá-la ao servidor não acrescentaria nada e exigiria um validador cruzado à medida (o `class-validator` não traz nenhum).
- **SMTP nunca chegava ao container (P-091, decisão P091-07):** nenhum dos compose passava as `SMTP_*` ao serviço `backend`, pelo que `NotificationsService` ficava com `transporter: null` e descartava todos os emails com um simples `warn` — ou seja, o passo 4 deste caso de uso nunca acontecia em nenhum ambiente executável. Corrigido nos dois compose; em dev o `SMTP_HOST` é fixado em `mailpit` (nome do serviço), porque o valor de `.env` é `localhost`, correto para o backend a correr no host mas inalcançável de dentro do container. Fecha `R-056`, que registava a metade de produção deste mesmo problema.
- **API Keys:** existe a entidade `ApiKey`, mas não há serviço, controlador nem endpoints para criação/gestão de API keys.
- **RBAC:** roles e permissões são carregadas via seed, mas não existem endpoints para gestão de roles, permissões ou atribuições de utilizadores.
- **Histórico de passwords (BR-AUTH-006):** ~~não implementada validação de reutilização das últimas 5 passwords.~~ **Resolvido em P-075**: nova tabela `hr.password_history` (`user_id`, `password_hash`, `created_at`), guarda as 4 passwords mais recentes por utilizador — combinada com a password ativa, forma o pool das "últimas 5" (decisão P075-01, a atual conta como uma das 5). Aplicado em `AuthService.changePassword()` e `AuthService.confirmResetPassword()` (os 2 pontos onde uma nova password é definida por um utilizador) via `ensurePasswordNotReused()`; a password antiga é arquivada em `recordPasswordHistory()` só depois de a alteração ter sucesso, com poda para manter só as 4 entradas mais recentes.
- **MFA obrigatório:** ~~não existe validação automática que force MFA para perfis `admin`/`manager` no login.~~ **Resolvido em P-059** (via `mfaRequiredForAdmin`, `ADMIN.md`) — só para o perfil `admin`, não `manager` (decisão P059-01, o setting fala literalmente só em "Admin"; a divergência com BR-AUTH-001 abaixo, que menciona também "Gestor", foi resolvida a favor do nome do parâmetro). Ver `ADMIN.md` ("Wiring de Admin Settings ao runtime — Grupo C, `mfaRequiredForAdmin`") para o detalhe completo do mecanismo (token JWT de âmbito limitado, sem redirecionamento de frontend — decisão P059-04, só backend). Aplica-se só ao login local por password; `ssoLogin()`/Keycloak não é afetado.
- **Códigos de recuperação MFA (UC-AUTH-005 passo 6):** ~~não gerados nem expostos ao utilizador.~~ **Resolvido em P-092**: nova tabela `hr.mfa_recovery_codes` (`user_id`, `code_hash`, `used_at`, `created_at`; migração `CreateMfaRecoveryCodesTable1836000000000`). `POST /auth/mfa/verify` passa a devolver `{ message, recoveryCodes }` — os códigos só existem em claro nessa resposta. **10 códigos, SHA-256** (decisão P092-01): formato `XXXXX-XXXXX` num alfabeto Base32 sem `0/1/8/9` (50 bits de entropia cada), normalizados (maiúsculas, sem hífen/espaços) antes do hash; a entropia dispensa um hash lento, tal como nos tokens de reset. Uso único garantido por `UPDATE ... WHERE used_at IS NULL`. Novo `POST /auth/mfa/recovery-codes` substitui o conjunto inteiro e exige **código TOTP** (não aceita código de recuperação — um código de recuperação não pode servir para emitir outros). Desativar o MFA apaga os códigos.
- **Página de self-service do MFA (P-092, revoga a decisão P059-04):** nova `SecuritySettingsPage.tsx` em `/settings/security` (entrada "Segurança" na barra lateral): estado do MFA, configuração com QR code + chave manual, confirmação, apresentação dos códigos (copiar/descarregar), regeneração e desativação. O backend passou a devolver a imagem do QR (`qrCodeDataUrl`, via `qrcode`) em `POST /auth/mfa/enable`, para o frontend não precisar de uma biblioteca de QR. O `otpauth://` usa o **email** como etiqueta, não o UUID do utilizador (decisão P092-02) — é o que aparece na aplicação autenticadora.
- **`mfaSetupRequired` chega ao frontend (P-092, decisão P092-05):** a resposta do login passa a incluir `mfaSetupRequired`. Com o flag ativo, o `ProtectedRoute` redireciona qualquer rota para `/settings/security`, a barra lateral mostra só "Segurança" e as queries periódicas (caixa de entrada, notificações) ficam desligadas — antes, um admin com `mfaRequiredForAdmin` ativo (o valor por omissão) recebia 403 em todas as páginas sem forma de sair daí. Concluída a configuração, o frontend faz um refresh, que recalcula o âmbito do token a partir da BD.
- **`POST /auth/mfa/enable` recusa quando o MFA já está ativo (P-092, decisão P092-03):** antes, a chamada substituía o segredo e punha `mfaEnabled = false` — qualquer portador de um access token (p. ex. roubado) desligava o MFA do utilizador sem apresentar código, contornando a exigência de código de `/mfa/disable`.
- **Desativar aceita código de recuperação (P-092, decisão P092-04):** `POST /auth/mfa/disable` aceita um código TOTP de 6 dígitos **ou** um código de recuperação por usar (consumido). Sem isto, quem perde o telemóvel não conseguia voltar a configurar o MFA: a desativação exigia exatamente o código que já não tem.
- **Timeout por inatividade (P-096, BR-AUTH-005):** sessões sem atividade durante `sessionTimeoutMinutes` (Admin, 30 por omissão) terminam — regra deslizante, porque a BR fala de sessões _inativas_ (decisão P096-00, que reabre P053-05).
  - **Servidor:** novo `SessionActivityService`. Cada sessão tem uma chave `activity:<sessionId>` na cache com TTL igual ao timeout, criada no login e renovada pelo `JwtAuthGuard` em cada pedido; a chave `session:<hash>` passa a guardar o id da sessão (antes o do utilizador) para o guard a encontrar. Sem atividade, o guard recusa (401) e o `refresh()` recusa e revoga a sessão em `hr.sessions` (`Sessão terminada por inatividade`) — o refresh não conta como atividade. O timeout é relido da BD no máximo uma vez por minuto. Na cache em memória, como o resto das sessões (decisão P096-01; ver `R-061`).
  - **Pedidos automáticos não contam:** o polling do frontend (contadores da caixa de entrada e das notificações, estado de relatórios) envia `X-Background-Request: 1`; o guard valida a sessão mas não renova a atividade — sem isto, um separador aberto nunca ficava inativo (decisão P096-03).
  - **Browser (decisão P096-02):** `useIdleLogout` no `AppLayout` conta cliques, teclas, scroll e toques, partilhados entre separadores via `localStorage`; ao fim do timeout faz logout e mostra no login "A sessão terminou por inatividade". Como ler uma página não gera pedidos, a interação envia um heartbeat (`POST /auth/activity`, no `SessionActivityController`, fora do `AuthController` para não encher o log de auditoria) no máximo a cada 30 s. O login devolve `sessionTimeoutMinutes`.
- **Endurecimentos de MFA (P-095, fecha `R-065`):**
  - **Código TOTP de uso único (decisão P095-01):** nova coluna `users.mfa_last_used_step` (migração `AddMfaLastUsedStepToUsers1837000000000`). `MfaService.matchTotpStep()` devolve o passo (janela de 30 s) a que o código corresponde, e um `UPDATE ... WHERE mfa_last_used_step IS NULL OR mfa_last_used_step < :passo` grava-o — um código já aceite, ou de uma janela anterior à última aceite, é recusado. Aplica-se ao login, à confirmação da configuração, à regeneração de códigos e à desativação. Na BD e não na cache, porque as sessões em memória (`R-061`) perdem-se em cada reinício. Repõe-se a `null` ao ativar e ao desativar.
  - **Mudar o MFA termina as outras sessões (decisão P095-03):** `verifyMfa` e `disableMfa` revogam as restantes sessões ativas do utilizador (`revokedAt`) e apagam as chaves `session:<hash>` da cache, pelo que os access tokens desses dispositivos deixam de funcionar logo — e não só o refresh, como acontece em `changePassword()`, que não foi alterado. A sessão do pedido é mantida.
  - **Admin com MFA obrigatório (decisão P095-02):** pode desativar o MFA — é o caminho de quem perdeu o telemóvel —, mas nesse caso a sessão corrente também termina (`{ sessionEnded: true }`) e o login seguinte força a configuração. O frontend faz logout e avisa antes, através do novo `mfaRequired` em `GET /auth/me`.
- **Auditoria de MFA (BR-AUTH-008):** `disableMfa` → `MFA_DISABLED` e `regenerateRecoveryCodes` → `MFA_RECOVERY_CODES_REGENERATED`, além do `MFA_ENABLED` já existente.

### Testes

- **Unitários:**
  - `jwt.service.spec.ts` — cobre geração, verificação e hash de tokens.
  - `encryption.service.spec.ts` — cobre cifragem/decifragem AES-256-GCM.
  - `auth.service.spec.ts`, `mfa.service.spec.ts`, `employee-identity.service.spec.ts` e `auth-audit.interceptor.spec.ts` cobrem os respetivos serviços e o interceptor. _(A nota anterior — "não existem testes unitários para `AuthService`, `MfaService`, `KeycloakService`, guards ou interceptor" — estava desatualizada; corrigida em P-090.)_
  - **Continuam sem testes unitários os guards**: `JwtAuthGuard` e `RateLimitGuard`.
- **E2E:** `test/auth.e2e-spec.ts` cobre login, refresh, logout — incluindo a invalidação do access token e do refresh token após logout (P-090) —, perfil autenticado (`/me`), alteração de password e o fluxo completo de reset (P-091, incl. um cenário ponta a ponta que extrai o token do email através de um spy sobre `NotificationsService.sendEmail`) e a configuração completa do MFA (P-092, com códigos TOTP reais gerados via `otpauth`), e desde P-095 a recusa de um código TOTP já usado e o fim das outras sessões ao ativar o MFA. Desde P-092 o `RateLimitGuard` é reposto antes de cada teste — a suite já fazia exatamente 10 logins, o limite por minuto e por IP. Desde P-093 cobre também o desafio MFA no login (TOTP, código de recuperação, uso único do desafio) e o bloqueio de conta por passwords e por códigos MFA errados, e o timeout por inatividade (P-096): **20 cenários**. Não cobre o rate limiting em si (o SSO foi removido em P-094).

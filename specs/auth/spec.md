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
| Campo | Tipo | Validação | Notas |
|-------|------|-----------|-------|
| id | UUID | PK, obrigatório | Gerado pelo sistema |
| email | VARCHAR(255) | Único, formato válido, obrigatório | Usado como login |
| username | VARCHAR(100) | Único, obrigatório | Alternativa de login |
| password_hash | VARCHAR(512) | Bcrypt/Argon2, obrigatório | Nunca armazenar em claro |
| is_active | BOOLEAN | Default true | Desativação lógica |
| mfa_enabled | BOOLEAN | Default false | MFA obrigatório para Admin/Gestor |
| mfa_secret | VARCHAR(256) | Nullable | TOTP secret |
| last_login_at | TIMESTAMP | Nullable | Registo de auditoria |
| failed_login_count | INT | Default 0, max 5 | Bloqueio após falhas |
| locked_until | TIMESTAMP | Nullable | Bloqueio temporário |
| password_changed_at | TIMESTAMP | Obrigatório | Política de rotação |
| created_at | TIMESTAMP | Auto | — |
| updated_at | TIMESTAMP | Auto | — |

### Session
| Campo | Tipo | Validação | Notas |
|-------|------|-----------|-------|
| id | UUID | PK | — |
| user_id | UUID | FK → User | — |
| token_hash | VARCHAR(512) | Único | Hash do JWT |
| ip_address | VARCHAR(45) | IPv4/IPv6 | — |
| user_agent | TEXT | Nullable | — |
| expires_at | TIMESTAMP | Obrigatório | — |
| revoked_at | TIMESTAMP | Nullable | Logout ou revogação |

### Role
| Campo | Tipo | Validação | Notas |
|-------|------|-----------|-------|
| id | UUID | PK | — |
| name | VARCHAR(50) | Único | admin, manager, approver, employee |
| description | TEXT | Nullable | — |
| is_system | BOOLEAN | Default false | Não editável pelo utilizador |

### Permission
| Campo | Tipo | Validação | Notas |
|-------|------|-----------|-------|
| id | UUID | PK | — |
| resource | VARCHAR(100) | Obrigatório | ex: "absences", "timesheets" |
| action | VARCHAR(50) | Obrigatório | create, read, update, delete, approve |
| description | TEXT | Nullable | — |

### RolePermission
| Campo | Tipo | Notas |
|-------|------|-------|
| role_id | UUID | FK → Role |
| permission_id | UUID | FK → Permission |

### UserRole
| Campo | Tipo | Notas |
|-------|------|-------|
| user_id | UUID | FK → User |
| role_id | UUID | FK → Role |
| assigned_at | TIMESTAMP | — |
| assigned_by | UUID | FK → User |

---

## Casos de Uso

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

| ID | Regra |
|----|-------|
| BR-AUTH-001 | MFA é obrigatório para perfis Administrador e Gestor. |
| BR-AUTH-002 | Após 5 tentativas de login falhadas, a conta é bloqueada por 15 minutos. |
| BR-AUTH-003 | Tokens JWT de acesso expiram em 15 minutos; refresh tokens em 7 dias. |
| BR-AUTH-004 | Passwords devem ter mínimo 10 caracteres, incluir maiúsculas, minúsculas, números e caracteres especiais. |
| BR-AUTH-005 | Sessões inativas por mais de 30 minutos são encerradas automaticamente. |
| BR-AUTH-006 | Não é permitida reutilização das últimas 5 passwords. |
| BR-AUTH-007 | Um utilizador desativado não pode autenticar-se, mesmo com SSO válido. |
| BR-AUTH-008 | Todos os eventos de autenticação devem ser registados (sucesso, falha, logout, bloqueio). |

---

## Requisitos Funcionais

| ID | Descrição |
|----|-----------|
| RF-AUTH-001 | O sistema deve suportar autenticação via username/password com hash Bcrypt ou Argon2. |
| RF-AUTH-002 | O sistema deve suportar SSO via OpenID Connect (OIDC) com Keycloak. |
| RF-AUTH-003 | O sistema deve suportar SAML 2.0 para integração empresarial. |
| RF-AUTH-004 | O sistema deve emitir tokens JWT assinados (RS256 ou ES256). |
| RF-AUTH-005 | O sistema deve suportar MFA via TOTP (RFC 6238). |
| RF-AUTH-006 | O sistema deve implementar recuperação de password segura por email. |
| RF-AUTH-007 | O sistema deve suportar geração e revogação de API Keys para integrações. |
| RF-AUTH-008 | O sistema deve permitir configuração de políticas de password (comprimento, complexidade, expiração). |
| RF-AUTH-009 | O sistema deve suportar Just-In-Time provisioning de utilizadores via SSO. |
| RF-AUTH-010 | O sistema deve implementar timeout automático de sessão configurável. |

---

## Requisitos Não Funcionais

| ID | Descrição |
|----|-----------|
| RNF-AUTH-001 | Autenticação deve completar em menos de 500ms em condições normais. |
| RNF-AUTH-002 | Passwords nunca devem ser armazenadas ou transmitidas em claro. |
| RNF-AUTH-003 | Tokens JWT devem usar chaves RSA de mínimo 2048 bits. |
| RNF-AUTH-004 | O sistema deve suportar rotação de chaves JWT sem downtime. |
| RNF-AUTH-005 | Comunicação deve ser exclusivamente via HTTPS/TLS 1.2+. |

---

## Permissões por Perfil

| Ação | Administrador | Gestor | Aprovador | Colaborador |
|------|:---:|:---:|:---:|:---:|
| Login | ✅ | ✅ | ✅ | ✅ |
| Configurar MFA próprio | ✅ | ✅ | ✅ | ✅ |
| Forçar reset password de outro utilizador | ✅ | ❌ | ❌ | ❌ |
| Revogar sessões de outros utilizadores | ✅ | ❌ | ❌ | ❌ |
| Gerir API Keys | ✅ | ❌ | ❌ | ❌ |
| Configurar políticas de password | ✅ | ❌ | ❌ | ❌ |
| Configurar SSO/OIDC | ✅ | ❌ | ❌ | ❌ |

---

## Eventos do Sistema

| Evento | Trigger | Payload |
|--------|---------|---------|
| `UserLoggedIn` | Login com sucesso | user_id, ip, timestamp, method |
| `UserLoginFailed` | Credenciais inválidas | username, ip, timestamp, attempt_count |
| `UserAccountLocked` | 5 falhas consecutivas | user_id, locked_until |
| `UserLoggedOut` | Logout | user_id, session_id, timestamp |
| `PasswordChanged` | Reset ou alteração | user_id, timestamp |
| `MFAEnabled` | Ativação MFA | user_id, timestamp |
| `MFADisabled` | Desativação MFA | user_id, by_admin, timestamp |
| `SessionExpired` | Timeout inativo | user_id, session_id |
| `ApiKeyCreated` | Criação de API Key | key_id, user_id, timestamp |
| `ApiKeyRevoked` | Revogação de API Key | key_id, user_id, timestamp |

---

## APIs

### POST /api/v1/auth/login
| Campo | Valor |
|-------|-------|
| Método | POST |
| Endpoint | `/api/v1/auth/login` |
| Auth | Público |
| **Entrada** | `{ username, password, mfa_code? }` |
| **Saída** | `{ access_token, refresh_token, expires_in, user: { id, name, roles } }` |
| **Validações** | username obrigatório; password obrigatória; mfa_code se MFA ativo |
| **HTTP** | 200 OK, 401 Unauthorized, 403 Forbidden, 429 Too Many Requests |

### POST /api/v1/auth/refresh
| Campo | Valor |
|-------|-------|
| Método | POST |
| Endpoint | `/api/v1/auth/refresh` |
| Auth | Refresh Token |
| **Entrada** | `{ refresh_token }` |
| **Saída** | `{ access_token, expires_in }` |
| **HTTP** | 200, 401 (token inválido/expirado) |

### POST /api/v1/auth/logout
| Campo | Valor |
|-------|-------|
| Método | POST |
| Endpoint | `/api/v1/auth/logout` |
| Auth | JWT |
| **Entrada** | Vazio (usa token do header) |
| **Saída** | `{ message: "Logged out" }` |
| **HTTP** | 200, 401 |

### POST /api/v1/auth/password/reset-request
| Campo | Valor |
|-------|-------|
| Método | POST |
| Endpoint | `/api/v1/auth/password/reset-request` |
| Auth | Público |
| **Entrada** | `{ email }` |
| **Saída** | `{ message: "Email enviado se existir" }` |
| **HTTP** | 200 (sempre, para não revelar existência) |

### POST /api/v1/auth/password/reset
| Campo | Valor |
|-------|-------|
| Método | POST |
| Endpoint | `/api/v1/auth/password/reset` |
| Auth | Token de reset |
| **Entrada** | `{ token, new_password, confirm_password }` |
| **Saída** | `{ message: "Password alterada" }` |
| **HTTP** | 200, 400 (token inválido), 422 (password inválida) |

### GET /api/v1/auth/sso/redirect
| Campo | Valor |
|-------|-------|
| Método | GET |
| Endpoint | `/api/v1/auth/sso/redirect` |
| Auth | Público |
| **Saída** | Redirect para IdP |
| **HTTP** | 302 |

### POST /api/v1/auth/sso/callback
| Campo | Valor |
|-------|-------|
| Método | POST |
| Endpoint | `/api/v1/auth/sso/callback` |
| Auth | Público |
| **Entrada** | `{ code, state }` |
| **Saída** | `{ access_token, refresh_token }` |
| **HTTP** | 200, 401, 503 |

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

| ID | Risco | Probabilidade | Impacto | Mitigação |
|----|-------|:---:|:---:|-----------|
| R-AUTH-001 | Keycloak indisponível bloqueia todos os logins SSO | Média | Alta | Fallback para login local; health check com alertas |
| R-AUTH-002 | Ausência de rotação automática de JWT keys | Baixa | Alta | Implementar JWKS endpoint com rotação programada |
| R-AUTH-003 | Política de MFA obrigatória pode bloquear onboarding | Média | Média | Período de graça configurável pós-criação de conta |
| R-AUTH-004 | JIT provisioning pode criar utilizadores com perfil errado | Baixa | Alta | Definir perfil default e processo de revisão |

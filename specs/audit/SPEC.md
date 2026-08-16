# Módulo 21 — Auditoria

## Objetivo

Manter registo imutável de todas as operações realizadas no sistema, garantindo rastreabilidade, conformidade GDPR e suporte a análise forense.

## Entidades

### AuditLog

| Campo          | Tipo         | Validação         | Notas                           |
| -------------- | ------------ | ----------------- | ------------------------------- |
| id             | UUID         | PK                | —                               |
| user_id        | UUID         | FK User, Nullable | Null para processos automáticos |
| action         | VARCHAR(100) | Obrigatório       | ex: "employee.update"           |
| entity_type    | VARCHAR(100) | Obrigatório       | ex: "Employee"                  |
| entity_id      | UUID         | Obrigatório       | —                               |
| old_values     | JSONB        | Nullable          | Estado anterior                 |
| new_values     | JSONB        | Nullable          | Estado novo                     |
| ip_address     | VARCHAR(45)  | Nullable          | —                               |
| user_agent     | TEXT         | Nullable          | —                               |
| timestamp      | TIMESTAMP    | Obrigatório       | Imutável                        |
| correlation_id | UUID         | Nullable          | Agrupamento de operações        |
| module         | VARCHAR(50)  | Obrigatório       | Módulo de origem                |

## Regras de Negócio

| ID         | Regra                                                                       |
| ---------- | --------------------------------------------------------------------------- |
| BR-AUD-001 | Logs de auditoria são imutáveis — sem update ou delete.                     |
| BR-AUD-002 | Todos os campos sensíveis (NIF, IBAN, password) são mascarados nos logs.    |
| BR-AUD-003 | Logs de auditoria devem ser mantidos por mínimo 1 ano (recomendado 3 anos). |
| BR-AUD-004 | Logs devem ser indexados por user_id, entity_type, entity_id e timestamp.   |
| BR-AUD-005 | Logs de acesso a dados pessoais são rastreados com detalhe (req. GDPR).     |

## Eventos Auditados (Mínimo)

| Módulo       | Eventos                                                 |
| ------------ | ------------------------------------------------------- |
| Auth         | Login, Logout, LoginFailed, PasswordChanged, MFAEnabled |
| Utilizadores | Created, Updated, Deactivated, PermissionChanged        |
| Contratos    | Created, Updated, Terminated                            |
| Ausências    | Requested, Approved, Rejected, Cancelled                |
| Timesheets   | Submitted, Approved, Rejected                           |
| Despesas     | Submitted, Approved, Rejected, Paid                     |
| GDPR         | DataExported, DataAnonymized, ConsentChanged            |
| Admin        | ConfigChanged, UserCreated, RoleChanged                 |

## Requisitos Funcionais

| ID         | Descrição                                                              |
| ---------- | ---------------------------------------------------------------------- |
| RF-AUD-001 | O sistema deve registar todas as operações CRUD em entidades críticas. |
| RF-AUD-002 | O sistema deve registar o estado anterior e posterior em alterações.   |
| RF-AUD-003 | O sistema deve registar utilizador, IP, timestamp e entidade afetada.  |
| RF-AUD-004 | O sistema deve suportar exportação de logs para análise forense.       |
| RF-AUD-005 | O sistema deve implementar pesquisa e filtragem de logs de auditoria.  |
| RF-AUD-006 | O sistema deve gerar alertas para acessos suspeitos.                   |

## APIs

- GET /api/v1/audit-logs (Admin only)
  - Query: entity_type, entity_id, user_id, action, start_date, end_date
- GET /api/v1/audit-logs/export (CSV/JSON)

## Permissões

| Ação                            | Administrador | Gestor | Aprovador | Colaborador |
| ------------------------------- | :-----------: | :----: | :-------: | :---------: |
| Ver logs de auditoria           |      ✅       |   ❌   |    ❌     |     ❌      |
| Exportar logs                   |      ✅       |   ❌   |    ❌     |     ❌      |
| Configurar alertas de auditoria |      ✅       |   ❌   |    ❌     |     ❌      |

## Notas de Implementação

### Entregue

- **Entidades:** `AuditLog` (`backend/src/audit/entities/audit-log.entity.ts`) com os campos id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, timestamp, correlation_id, module e relação ManyToOne com `User`.
- **DTOs:** `CreateAuditLogDto`, `AuditFiltersDto`, `PaginatedResult<T>` e enum `ExportFormat` (`backend/src/audit/dto/`).
- **Service:** `AuditService` (`backend/src/audit/services/audit.service.ts`) com `log`, `findAll`, `findByResource`, `findAllForExport` e processamento assíncrono da fila.
- **Controller:** `AuditController` (`backend/src/audit/audit.controller.ts`) expõe `GET /audit/logs` e `GET /audit/logs/export`, restrito a ADMIN.
- **Interceptor:** `AuditInterceptor` (`backend/src/audit/interceptors/audit.interceptor.ts`) intercepta `POST`, `PUT`, `PATCH` e `DELETE` decorados com `@Audit(action, entityType)`.
- **Decoradores:** `@Audit(action, entityType)` e metadata `AUDIT_KEY` (`backend/src/audit/decorators/`).
- **Fila assíncrona:** `AuditService.log()` empurra entradas para uma fila em memória e dispara `processQueue` via `setImmediate`, escrevendo sequencialmente na base de dados.
- **Mascaramento:** campos sensíveis cujas chaves contenham `password`, `mfa_secret`, `nif`, `iban`, `token`, `refreshtoken` ou `secret` são substituídos por `***` antes de persistir em `old_values`/`new_values`.
- **Export CSV:** endpoint `/audit/logs/export` devolve CSV com as colunas id, user_id, action, entity_type, entity_id, ip_address, timestamp, module, correlation_id.

### Simplificações/Decisões

- **Rota base:** o controller usa `/audit/logs` em vez de `/api/v1/audit-logs` indicado no ponto inicial da spec.
- **Filtros:** `AuditFiltersDto` suporta `userId`, `entityType`, `action`, `dateFrom`, `dateTo`, `cursor` e `limit`; não existe filtro por `entity_id` isolado.
- **Formato de exportação:** apenas CSV está implementado (`ExportFormat.CSV`); JSON não está disponível.
- **Guarda de rotas:** utiliza `JwtAuthGuard` + `RolesGuard` com `RoleEnum.ADMIN`; a tabela de permissões reflete exclusividade administrativa.
- **Módulo de origem:** o interceptor preenche `module` com `entityType.toLowerCase()` quando cria o log automaticamente.
- **Old values:** o interceptor tenta carregar a entidade anterior apenas para `PUT`/`PATCH` quando existe `id` ou `entityId` nos parâmetros da rota, usando `DataSource.getRepository(entityType)`. Em caso de falha (entidade não registada ou erro), prossegue com `oldValues = null`.
- **Campos sensíveis removidos do old values:** o interceptor remove `passwordHash` e `mfaSecret` antes de capturar o estado anterior, complementando o mascaramento do service.
- **Alertas e retenção:** não existe implementação de alertas de acessos suspeitos nem mecanismo automático de retenção de logs por 1/3 anos.
- **GDPR:** os campos `ip_address` e `user_agent` são persistidos, mas não existe rastreamento específico adicional de acesso a dados pessoais.

### Testes

- Não foram encontrados testes unitários ou e2e dedicados ao módulo de auditoria em `backend/src/audit/`.

### Wiring parcial — módulo Auth (P-062)

**`R-044`** (descoberto em P-058): o mecanismo `@Audit(...)`/`AuditInterceptor` descrito acima nunca foi aplicado a nenhum controller — `hr.audit_logs` estava essencialmente vazia. Investigação em P-062 revelou que existe um **segundo mecanismo de auditoria, distinto e específico do módulo Auth**: `AuthAuditInterceptor` (`backend/src/auth/interceptors/auth-audit.interceptor.ts`), já montado em `AuthController` via `@UseInterceptors(AuthAuditInterceptor)` desde as fases iniciais — mas **completamente inerte**: o provider `AUDIT_EVENT_HANDLER` (que devia persistir os eventos) nunca era injetado no interceptor; este dependia de um método `setHandler()` que ninguém alguma vez chamava, pelo que nem sequer o `logger.log()` original corria.

Escolhido pelo utilizador entre 4 opções de âmbito (decisão P062-01) — **só Auth**, o ponto de partida mais contido, cobrindo os eventos de segurança mais sensíveis da lista mínima da spec (`LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `PASSWORD_CHANGED`, `MFA_ENABLED`). Corrigido:

- `AuthAuditInterceptor` passa a receber `AUDIT_EVENT_HANDLER` via construtor (DI padrão do NestJS), eliminando o padrão `setHandler()` morto.
- O `AUDIT_EVENT_HANDLER` (`backend/src/auth/auth.module.ts`) passa a injetar `AuditService`/`Repository<User>` (via novo import de `AuditModule`, não `@Global()`) e mapeia o nome do método do controller (`login`/`logout`/`changePassword`/`verifyMfa`) para a ação correspondente, chamando `AuditService.log()` com `entityType: 'User'`, `entityId` = o próprio utilizador.
- `LOGIN_FAILED` tratado à parte no branch de erro do `tap()` do interceptor (só na rota de login) — resolve o `User` pelo email submetido no corpo do pedido; se não corresponder a nenhum utilizador real, o evento não é persistido (sem entidade real para referenciar, dado `entity_id` ser `uuid NOT NULL` na tabela).
- 4 novos testes unitários em `backend/src/auth/interceptors/auth-audit.interceptor.spec.ts` (novo ficheiro).

**Verificação em ambiente real completa**: os 5 eventos confirmados via `psql` a escrever corretamente em `hr.audit_logs` (incl. `LOGIN_FAILED` contra o email real do admin com password errada); `GET /audit/logs` (endpoint de leitura já existente, nunca antes exercitado com dados reais) devolveu os eventos corretamente via API. Dados de teste eliminados, admin reposto ao estado original no fecho da sessão.

**Restam por ligar** os ~24 eventos nomeados na spec fora de Auth (Users, Contracts, Absences, Timesheets, Expenses, GDPR não-Auth, Admin) — via o mecanismo genérico `@Audit(...)`/`AuditInterceptor` descrito acima, ainda com zero controllers decorados. Ver `specs/GLOBAL-TASKS-RISKS.md` (`R-044`) para o detalhe.

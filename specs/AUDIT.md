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

### Wiring parcial — mapeamentos limpos fora de Auth (P-063)

Sessão seguinte, focada no mecanismo genérico `@Audit(...)`/`AuditInterceptor` (distinto do `AuthAuditInterceptor`, ver acima). Investigação prévia mostrou que nem todos os ~24 eventos nomeados na spec têm um endpoint correspondente já implementado — dividem-se em mapeamentos limpos (endpoint existe, ação óbvia) e eventos sem endpoint correspondente. Apresentados ao utilizador (decisão P063-01) — escolhido só os mapeamentos limpos, ~17 eventos: Users (`Created`/`Updated`/`Deactivated`), Contracts (`Created`/`Updated`), Absences (`Requested`/`Approved`/`Rejected`/`Cancelled`), Timesheets (`Submitted`/`Approved`/`Rejected`), Expenses (`Submitted`/`Approved`/`Rejected`), GDPR (`ConsentChanged`, via `recordConsent`/`revokeConsent`), Admin (`ConfigChanged`).

**Bug estrutural encontrado e corrigido antes de decorar qualquer controller** (decisão P063-02): `AuditInterceptor.extractEntityId()` só lia `params.id`/`params.entityId` da rota, resolvido **antes** do handler correr — funciona para transições sobre um recurso existente (`:id` na rota), mas falhava silenciosamente para qualquer criação pura sem `:id` na URL (`entityId` caía no fallback `'unknown'`, inválido como UUID; o `INSERT` falhava e o erro era engolido pelo `try/catch` de `AuditService.processQueue`, sem log em `hr.audit_logs` e sem aviso visível). Isto afetava 6 dos 17 eventos "limpos": Users `Created`, Contracts `Created`, Absences `Requested`, GDPR `ConsentChanged` (ambos os endpoints — `recordConsent` sem `:id`, `revokeConsent` com `:employeeId` em vez de `:id`/`:entityId`), Admin `ConfigChanged` (recurso singleton, sem `:id` na rota). Corrigido: `AuditInterceptor` agora resolve `entityId` também a partir de `responseBody.id` (novo `extractIdFromResponse()`), tentado no `tap()` **depois** do handler correr, como _fallback_ quando os params da rota não têm id. Quando nenhum id é resolvível de nenhuma das duas formas, o log é **omitido** (com `Logger.warn`) em vez de tentar um `INSERT` condenado — troca uma falha silenciosa por um aviso explícito e nenhum registo em vez de um registo corrompido.

Decoração: `@UseInterceptors(AuditInterceptor)` a nível de controller (mesmo padrão já usado por `AuthController`/`AuthAuditInterceptor`) + `@Audit(action, entityType)` por endpoint, nos 7 controllers (`UsersController`, `ContractsController`, `AbsencesController`, `TimesheetsController`, `ExpensesController`, `GdprController`, `AdminController`). `AuditModule` (não `@Global()`) importado explicitamente nos 7 módulos correspondentes para tornar `AuditInterceptor`/`AuditService` resolvíveis via DI.

5 novos testes unitários (`audit.interceptor.spec.ts`, novo ficheiro — cobre o `:id` da rota, o fallback ao id da resposta, e a omissão silenciosa quando nenhum id é resolvível). 408/408 testes unitários (antes 403/403). `pnpm run lint` (0 erros) e `pnpm run build` (raiz) green. Suite e2e 7/7 ficheiros a passar (51/51 testes), sem alteração face ao estado anterior.

**Verificação em ambiente real completa**, incl. os 6 casos que exigiam o fix: criado um colaborador de teste real (`Users: Created`), atualizado (`Updated`) e desativado (`Deactivated`); criado e atualizado um contrato real (`Contracts: Created`/`Updated`); pedido e aprovado um pedido de ausência real (`Absences: Requested`/`Approved`); submetida e aprovada uma folha de horas real (`Timesheets: Submitted`/`Approved`); submetido e aprovado um relatório de despesas real (`Expenses: Submitted`/`Approved`); registado e revogado um consentimento real via os dois endpoints (`GDPR: ConsentChanged` ×2); atualizadas as definições globais (`Admin: ConfigChanged`). Todos os 14 eventos exercitados confirmados via `psql` em `hr.audit_logs` com o `entity_id` correto (incl. os 6 que dependiam do fallback novo) e via `GET /audit/logs?entityType=Employee` (incl. `oldValues` capturado corretamente no `Updated`, com `nif`/`iban` mascarados como `***`). Todos os dados de teste eliminados, `mfaRequiredForAdmin` (temporariamente desligado para obter um token sem restrição, mesmo mecanismo de P-061) reposto a `true`, `hr.audit_logs` limpa no fecho da sessão.

**Restam por ligar**: os 6 eventos sem endpoint correspondente identificados na investigação — Users `PermissionChanged`, Contracts `Terminated`, Expenses `Paid`, GDPR `DataExported`/`DataAnonymized`, Admin `UserCreated`/`RoleChanged` — nenhum destes tem uma ação distinta já implementada no backend; ligá-los exigiria decidir primeiro se/como implementar a funcionalidade correspondente (fora do âmbito de "ligar auditoria"). Ver `specs/GLOBAL-TASKS-RISKS.md` (`R-044`) para o detalhe atualizado.

### Wiring parcial — GDPR DataExported/DataAnonymized (P-064)

Investigação prévia (agente de exploração) sobre os 6 eventos sem endpoint mostrou que 2 dos 6 não exigiam nenhuma funcionalidade nova — só alinhar o que já existia com o nome do evento da spec (decisão P064-01, escolhida pelo utilizador entre 3 opções: só estes 2, +1 funcionalidade nova, ou só documentar):

- **GDPR: DataAnonymized** — `GdprService.anonymizeEmployee()` já escrevia manualmente em `hr.audit_logs` (fora do mecanismo `@Audit(...)`/`AuditInterceptor`, chamado tanto por `createDataRequest()` para pedidos `ERASURE` como pelo cron mensal de retenção `runRetentionPolicies()`) mas com `action: 'ANONYMIZE'`, não `'DataAnonymized'`. Renomeado para alinhar com a spec; `getErasureAndAnonymizationReport()` (P-058) filtrava por esse mesmo literal — atualizado a par para não partir o relatório.
- **GDPR: DataExported** — `createDataRequest()` já emitia `gdpr.data.exported` para pedidos `ACCESS`/`PORTABILITY` (consumido só por `NotificationsService` para notificar o titular), mas nada escrevia em `hr.audit_logs`. Novo `GdprService.handleDataExported()` (`@OnEvent('gdpr.data.exported')`) grava `action: 'DataExported'`, `entityType: 'Employee'`, `entityId` = o titular, `module: 'gdpr'`.

2 novos/atualizados testes unitários em `gdpr.service.spec.ts` (rename do action esperado + novo teste para `handleDataExported`). 409/409 testes unitários (antes 408/408). `pnpm run lint` (0 erros) e `pnpm run build` (raiz) green. Suite e2e 7/7 (51/51), sem alteração.

**Verificação em ambiente real completa**: colaborador de teste real criado; pedido `ACCESS` submetido via API confirmado por `psql` a gravar `DataExported` em `hr.audit_logs`; pedido `ERASURE` submetido de seguida confirmado a gravar `DataAnonymized` (não mais `ANONYMIZE`); `GET /gdpr/reports/erasure-anonymization` e `GET /gdpr/reports/exports` confirmados a continuar a devolver os dados corretos após o rename. Dados de teste eliminados, `hr.audit_logs` limpa no fecho da sessão.

**Restam por ligar**: os 4 eventos que exigem funcionalidade nova — Users `PermissionChanged`/Admin `RoleChanged` (endpoint RBAC inexistente, apesar de `RbacService.assignRole()`/`revokeRole()` já implementados), Contracts `Terminated` (colunas `terminatedAt`/`terminationReason` existem na entidade mas nada as define), Expenses `Paid` (nem sequer existe um estado `PAID`), Admin `UserCreated` (não existe nenhum fluxo admin de criação de conta `User`, só provisionamento JIT via Keycloak no primeiro login SSO). Ver `specs/GLOBAL-TASKS-RISKS.md` (`R-044`) para o detalhe completo por evento.

### Wiring parcial — Expenses Paid (P-065)

Investigação prévia em `specs/EXPENSES.md` revelou que o fluxo de pagamento (`SENT_FOR_PAYMENT`/`PAID`, campo `paid_at`, 2 endpoints, BR-EXP-005) já estava totalmente especificado desde as fases iniciais mas nunca tinha sido construído — só `draft/pending/approved/rejected` existiam. Apresentada uma escolha ao utilizador (decisão P065-01) entre construir o fluxo completo de 2 passos da spec (`Approved → SentForPayment → Paid`) ou uma versão simplificada de 1 passo (`Approved → Paid` direto) — **escolhido o fluxo completo**, alinhado com o diagrama de estados e a tabela de permissões já documentados em `specs/EXPENSES.md`.

Novo `POST /expenses/:id/send-for-payment` (`APPROVED` → `SENT_FOR_PAYMENT`) e `POST /expenses/:id/mark-paid` (`SENT_FOR_PAYMENT` → `PAID`, define `paidAt`), ambos `RoleEnum.ADMIN` apenas. Só `mark-paid` decorado com `@Audit('Paid', 'ExpenseReport')` — `send-for-payment` não está na lista mínima de eventos da spec de auditoria, por isso fica sem decorador (mesmo critério de "só eventos nomeados" já usado em P-063). Ver `specs/EXPENSES.md` (secção "Notas de Implementação") para o detalhe completo da funcionalidade construída.

6 novos testes unitários (`sendForPayment`/`markPaid` em `expenses.service.spec.ts`). 415/415 testes unitários (antes 409/409). `pnpm run lint` (0 erros) e `pnpm run build` (raiz) green. Suite e2e 7/7 (51/51), sem alteração.

**Verificação em ambiente real completa**: migração `1831000000000-AddPaidAtToExpenseReports.ts` aplicada com sucesso no container real; relatório de despesas de teste criado, submetido e aprovado via API; `mark-paid` tentado antes de `send-for-payment` corretamente rejeitado (400, máquina de estados respeitada); `send-for-payment` seguido de `mark-paid` confirmados via API (`status: paid`, `paidAt` preenchido); confirmado via `psql` que `hr.audit_logs` só regista `Submitted`/`Approved`/`Paid` — `SentForPayment` corretamente ausente. Dados de teste eliminados, `hr.audit_logs` limpa no fecho da sessão.

**Restam por ligar**: os 3 eventos que ainda exigem funcionalidade nova — Users `PermissionChanged`/Admin `RoleChanged` (endpoint RBAC inexistente), Contracts `Terminated` (colunas existem, nada as define), Admin `UserCreated` (sem fluxo admin de criação de conta). Ver `specs/GLOBAL-TASKS-RISKS.md` (`R-044`) para o detalhe atualizado.

### Wiring parcial — RBAC PermissionChanged/RoleChanged (P-066)

Investigação prévia confirmou que `RbacService.assignRole()`/`revokeRole()` (P-003) estavam plenamente implementados mas sem nenhum endpoint HTTP — genuína ambiguidade de desenho, não coberta por nenhuma spec de módulo (ver `specs/USERS.md`, secção "Gestão de perfis de acesso — endpoints RBAC (P-066)" para o detalhe completo). Escolhido pelo utilizador (decisão P066-01): um único par de endpoints (`POST /users/:employeeId/roles`, `DELETE /users/:employeeId/roles/:role`), decorando `assignRole` com `@Audit('PermissionChanged', 'User')` e `revokeRole` com `@Audit('RoleChanged', 'User')` — cobrindo as duas entradas nomeadas na spec de auditoria com a mesma ação de negócio.

**Detalhe do fallback de `entityId` (P-063) validado num novo caso real**: como `assignRole`/`revokeRole` operam sobre `User.id`, não `Employee.id` (usado na URL de `UsersController`), o parâmetro da rota é `:employeeId` (não `:id`), forçando o `AuditInterceptor` a resolver `entity_id` a partir do corpo da resposta (`{ id: <User.id>, ... }`) em vez do `Employee.id` da URL — confirma que o mecanismo de fallback de P-063 generaliza corretamente para uma entidade auditada diferente da que aparece na URL.

4 novos testes unitários (`rbac.service.spec.ts`). 419/419 testes unitários (antes 415/415). `pnpm run lint` (0 erros) e `pnpm run build` (raiz) green. Suite e2e 7/7 (51/51), sem alteração.

**Verificação em ambiente real completa**: atribuição e revogação de um perfil (`manager`) a um colaborador de teste real confirmadas via `psql` em `hr.user_roles`; `hr.audit_logs` confirmado a registar `PermissionChanged`/`RoleChanged` com `entity_type: 'User'` e `entity_id` = o `User.id` correto (não o `Employee.id` da URL). Dados de teste eliminados, `hr.audit_logs` limpa no fecho da sessão.

**Restam por ligar**: os 2 eventos remanescentes — Contracts `Terminated` (colunas existem, nada as define), Admin `UserCreated` (sem fluxo admin de criação de conta). Ver `specs/GLOBAL-TASKS-RISKS.md` (`R-044`) para o detalhe atualizado.

### Wiring parcial — Contracts Terminated (P-067)

Ao contrário do caso RBAC (P-066), este já estava totalmente especificado em `specs/CONTRACTS.md`: `POST /contracts/:id/terminate` listado nas APIs, BR-CON-004 ("A rescisão de contrato deve registar motivo e data"), diagrama de estados (`Active → Terminated`, única transição válida) e tabela de permissões (só Administrador). A secção "Simplificações/Decisões" da própria spec já assinalava explicitamente este gap. Sem ambiguidade genuína — implementado diretamente.

Novo `ContractsService.terminate(id, dto)` (valida `status === ACTIVE`, mesmo padrão de `renew()`); novo `POST /contracts/:id/terminate` decorado com `@Audit('Terminated', 'Contract')`, `RoleEnum.ADMIN` apenas. Consistente com `create()`/`renew()` (que não emitem os eventos `ContractCreated`/`ContractActivated` da tabela "Eventos do Sistema" do módulo), `terminate()` também não emite `ContractTerminated` via `EventEmitter2` — decisão de manter o padrão já existente, não uma omissão nova.

2 novos testes unitários (`contracts.service.spec.ts`). 421/421 testes unitários (antes 419/419). `pnpm run lint` (0 erros) e `pnpm run build` (raiz) green. Suite e2e 7/7 (51/51), sem alteração.

**Verificação em ambiente real completa**: contrato de teste real criado (`draft`); `terminate` tentado antes de ativar corretamente rejeitado (400, máquina de estados); contrato ativado via `PATCH`; `terminate` confirmado a definir `status: terminated`, `terminatedAt` e `terminationReason`; `hr.audit_logs` confirmado via `psql` a registar `Created`/`Updated`/`Terminated` para o contrato de teste. Dados de teste eliminados, `hr.audit_logs` limpa no fecho da sessão.

**Restam por ligar**: só 1 evento — Admin `UserCreated` (sem fluxo admin de criação de conta `User`, só provisionamento JIT via Keycloak no primeiro login SSO). Ver `specs/GLOBAL-TASKS-RISKS.md` (`R-044`) para o detalhe atualizado.

### Wiring final — Admin UserCreated (P-068), `R-044` resolvido

Investigação confirmou que o único caminho que cria um `User` hoje é o provisionamento JIT via Keycloak no primeiro login SSO (`KeycloakService.syncUser()`); não existe nenhum fluxo admin de criação manual de conta, e nem `specs/USERS.md` nem `specs/ADMIN.md` alguma vez o descreveram — `Q-USR-001` ("onboarding formal") continua em aberto em `specs/USERS.md`. Apresentadas 4 opções ao utilizador (decisão P068-01): documentar sem correspondência real (mesmo padrão de `gdpr.incident.escalated` em P-048), um endpoint `User` isolado mínimo, reaproveitar `POST /users` (Employee) assumindo ser a mesma ação (mesmo raciocínio de RBAC em P-066), ou um endpoint completo `User`+`Employee` com fluxo de credenciais/convite. **Escolhido o endpoint `User` isolado mínimo** — reaproveitar `POST /users` foi descartado porque um `User` normalmente já existe via JIT _antes_ do `Employee` correspondente ser criado, pelo que "Employee criado" não corresponde de forma fiável a "User criado"; o endpoint completo foi descartado por arrastar `Q-USR-001` (decisão de produto maior, não pedida).

Duas sub-decisões fechadas com o utilizador antes de implementar — (P068-02) role por defeito do `User` criado: **`EMPLOYEE` automático**, alinhando com o que UC-AUTH-002 (`specs/AUTH.md`) já dizia dever acontecer no JIT mas nunca foi implementado (ver `R-AUTH-004`); (P068-03) email já existente via JIT prévio: **409 Conflict** (o evento chama-se `UserCreated`; dispará-lo sem uma criação real seria auditoria enganosa) — a mesma verificação aplica-se ao `username` derivado.

Novo `POST /admin/users` (`AdminController`, `RoleEnum.ADMIN` apenas) decorado com `@Audit('UserCreated', 'User')`; novo `CreateUserDto` (`email` obrigatório, `username` opcional — por omissão, o prefixo do email, mesma convenção do JIT). Novo `AdminService.createUser()` valida unicidade de email/username, cria o `User` com `passwordHash: ''` (compatível com JIT, sem password local) e atribui o perfil via `RbacService.assignRoleByName()` já existente (P-066). `AdminModule` passa a registar `TypeOrmModule.forFeature([..., User])` diretamente (mesmo padrão já usado em `GdprModule` para a mesma entidade).

4 novos testes unitários (`admin.service.spec.ts`). 425/425 testes unitários (antes 421/421). `pnpm run lint` (0 erros) e `pnpm run build` (raiz) green. Suite e2e 7/7 (51/51), sem alteração.

**Verificação em ambiente real completa**: utilizador de teste real criado via `POST /admin/users`; confirmado via `psql` que o perfil `employee` foi atribuído em `hr.user_roles` e que `hr.audit_logs` registou `UserCreated` com `entity_id` = o `User.id` novo; confirmado o mesmo evento via `GET /audit/logs` (API de leitura); email duplicado e username derivado duplicado (email diferente) ambos corretamente rejeitados com 409. Dados de teste eliminados, `hr.audit_logs` limpa, `mfaRequiredForAdmin` reposto a `true` no fecho da sessão.

**`R-044` está agora totalmente resolvido**: todos os eventos nomeados na tabela "Eventos Auditados (Mínimo)" (secção acima) estão ligados a um mecanismo real de auditoria (Auth via `AuthAuditInterceptor`, todos os restantes via `@Audit(...)`/`AuditInterceptor`). Ver `specs/GLOBAL-TASKS-RISKS.md` (`R-044`) para o fecho formal do risco.

# Módulo 23 — Administração do Sistema

## Objetivo

Gerir configurações globais do sistema, parâmetros organizacionais, entidades legais, perfis de calendário, tecnologia e infraestrutura.

## Responsabilidades

1. Configurar parâmetros globais do sistema.
2. Gerir entidades legais (Bridge351, NIVVOS).
3. Configurar tecnologia de fundo (SSO, storage, email).
4. Gerir calendários de feriados.
5. Configurar políticas de password e sessão.
6. Gerir limites e thresholds de alertas.
7. Suportar multi-tenant (se aplicável).

## Configurações do Sistema

| Categoria   | Parâmetro                               | Tipo    | Exemplo                 |
| ----------- | --------------------------------------- | ------- | ----------------------- |
| Organização | Nome da empresa                         | STRING  | "Bridge351"             |
| Organização | Entidades legais                        | LIST    | ["Bridge351", "NIVVOS"] |
| Organização | País por defeito                        | STRING  | "PT"                    |
| Organização | Moeda por defeito                       | STRING  | "EUR"                   |
| Ausências   | Dias de férias por defeito/ano          | INT     | 22                      |
| Ausências   | Dias transitáveis para próximo ano      | INT     | 5                       |
| Timesheets  | Prazo submissão (dia do mês seguinte)   | INT     | 5                       |
| Timesheets  | Horas diárias por defeito               | DECIMAL | 8.0                     |
| Alertas     | Dias antes para alertar fim de contrato | INT     | 30                      |
| Alertas     | Dias antes para alertar fim de projeto  | INT     | 30                      |
| Alertas     | Threshold de sub-alocação               | DECIMAL | 80.0                    |
| Segurança   | Timeout de sessão (minutos)             | INT     | 30                      |
| Segurança   | Tentativas de login antes de bloqueio   | INT     | 5                       |
| Segurança   | Período de bloqueio (minutos)           | INT     | 15                      |
| Segurança   | MFA obrigatório para Admin              | BOOLEAN | true                    |
| GDPR        | Período retenção pós-saída (anos)       | INT     | 5                       |
| Documentos  | Retenção na lixeira (dias)              | INT     | 30                      |

## Entidades Legais

O sistema suporta múltiplas entidades legais (Bridge351, NIVVOS) com:

- Nome e NIF da entidade.
- País e moeda.
- Perfil de calendário (feriados por país).
- Configurações específicas de férias e ausências.

## Requisitos Técnicos (Arquitectura)

### Stack Tecnológico

| Componente              | Tecnologia                              |
| ----------------------- | --------------------------------------- |
| Frontend                | React.js (preferido) / Vue.js / Angular |
| Backend                 | Node.js (NestJS) / Django / FastAPI     |
| Base de dados           | PostgreSQL                              |
| Cache                   | Redis                                   |
| Mensageria              | RabbitMQ ou Apache Kafka                |
| Armazenamento ficheiros | MinIO (compatível S3)                   |
| Identity Provider       | Keycloak                                |
| Monitorização           | Prometheus + Grafana                    |
| Logging                 | ELK Stack / OpenSearch                  |

### Containerização

- Implementação integralmente em Docker.
- Ficheiros Dockerfile e docker-compose obrigatórios.
- Suporte a Kubernetes ou Docker Swarm.
- Ambientes: Desenvolvimento, Testes, Staging, Produção.
- Configuração via variáveis de ambiente.

### API

- RESTful com OpenAPI/Swagger.
- Autenticação OAuth2 / OIDC / JWT.
- Rate limiting.
- Versionamento de API (v1, v2...).
- Logging de utilização da API.

### Compatibilidade

- Browsers modernos (Chrome, Firefox, Safari, Edge).
- Interface responsiva (desktop + mobile).
- Progressive Web App (PWA).
- Internacionalização (i18n) — múltiplos idiomas.

## Requisitos Não Funcionais do Sistema

| ID          | Categoria       | Requisito                                             |
| ----------- | --------------- | ----------------------------------------------------- |
| RNF-SYS-001 | Performance     | Tempo de resposta < 3s em operações correntes.        |
| RNF-SYS-002 | Disponibilidade | 99,5% de uptime mínimo.                               |
| RNF-SYS-003 | Backups         | Backups automáticos diários com restore automatizado. |
| RNF-SYS-004 | Escalabilidade  | Suporte a escalabilidade horizontal dos serviços.     |
| RNF-SYS-005 | DevOps          | CI/CD com pipelines automatizadas.                    |
| RNF-SYS-006 | Monitoring      | Health checks e métricas técnicas/funcionais.         |
| RNF-SYS-007 | Updates         | Rolling updates sem downtime significativo.           |
| RNF-SYS-008 | Open Source     | Sem dependências proprietárias obrigatórias.          |
| RNF-SYS-009 | Segurança       | Encriptação em repouso e em trânsito.                 |
| RNF-SYS-010 | i18n            | Múltiplos idiomas suportados.                         |

## Permissões

| Ação                               | Administrador | Outros |
| ---------------------------------- | :-----------: | :----: |
| Aceder às configurações do sistema |      ✅       |   ❌   |
| Gerir entidades legais             |      ✅       |   ❌   |
| Configurar SSO e integrações       |      ✅       |   ❌   |
| Configurar alertas e thresholds    |      ✅       |   ❌   |
| Gerir calendários de feriados      |      ✅       |   ❌   |

## APIs

- GET /api/v1/admin/settings
- PUT /api/v1/admin/settings
- GET /api/v1/admin/legal-entities
- POST /api/v1/admin/legal-entities
- PUT /api/v1/admin/legal-entities/:id
- GET /api/v1/admin/health (health check público)
- GET /api/v1/admin/metrics (Prometheus format)

## Notas de Implementação

Implementado em P-029 (`backend/src/admin/`). O âmbito ficou limitado às "Configurações do Sistema", "Entidades Legais" e aos endpoints `health`/`metrics` da secção APIs — a secção "Requisitos Técnicos (Arquitectura)" (stack, containerização, API design, compatibilidade/i18n/PWA) e "Requisitos Não Funcionais do Sistema" descrevem a arquitetura do sistema como um todo (já coberta transversalmente pelas fases anteriores: Docker em P-000/P-001, Swagger em P-025, rate limiting em P-004) e não constituem entregáveis próprios deste módulo — não têm equivalente em nenhum outro módulo já implementado.

- **`AdminController`** (`backend/src/admin/admin.controller.ts`) expõe `GET/PUT /admin/settings`, `GET/POST /admin/legal-entities`, `PATCH /admin/legal-entities/:id` (spec pedia `PUT` na atualização; usado `PATCH` por consistência com o padrão de atualização parcial de todos os outros módulos, ex. `PATCH /clients/:id`, `PATCH /helpdesk/tickets/:id` — o path mantém-se como especificado), todos `@Roles(ADMIN)`; e `GET /admin/health`, `GET /admin/metrics`, ambos públicos (sem guards), conforme "health check público" na spec.
- **Decisão do utilizador (QUESTÃO P029-01)**: os parâmetros de `SystemSetting` são apenas armazenados/geridos via CRUD — não são lidos em runtime por nenhum módulo existente (Auth, Capacity, Absences, Timesheets, Contracts/Projects, Documents, GDPR). Os valores fixos já hardcoded nesses módulos (ex. `UNDERALLOCATION_THRESHOLD_PERCENTAGE = 80` em `CapacityService`, decisão P028-04) mantêm-se inalterados; os campos correspondentes em `SystemSetting` documentam o valor pretendido mas não têm efeito. Nenhum módulo anterior foi alterado (regra 4). **Parcialmente revertida em P-052** (decisão P052-01): 5 dos 15 parâmetros — os de substituição direta e baixo risco — passaram a ser lidos em runtime (`defaultDailyHours`, `contractExpiryAlertDays`, `underallocationThresholdPercentage`, `maxLoginAttempts`, `lockoutPeriodMinutes`); os restantes 10 continuam só armazenados (ver Notas de Implementação de P-052 abaixo).
- **`SystemSetting`** (`backend/src/admin/entities/system-setting.entity.ts`, tabela `hr.system_settings`): entidade tipada de linha única (uma coluna por parâmetro do quadro "Configurações do Sistema" da spec — 15 dos 16 parâmetros; ver ponto seguinte), consistente com o padrão de entidades tipadas usado em todos os outros módulos (decisão do utilizador QUESTÃO P029-03, em vez de uma tabela key-value genérica). A migration `1830000000000-CreateAdminTables.ts` insere a linha única com os valores por defeito da spec; `AdminService.getSettings()`/`updateSettings()` operam sempre sobre essa linha (a mais antiga, se por algum motivo existir mais que uma).
- **Parâmetro "Entidades legais" (LIST)** do quadro de Configurações não foi replicado como coluna em `SystemSetting` — é dado derivado do catálogo `LegalEntity` (`GET /admin/legal-entities`), para não duplicar a mesma informação em dois sítios.
- **`LegalEntity`** (`backend/src/admin/entities/legal-entity.entity.ts`, tabela `hr.legal_entities`): catálogo standalone (decisão do utilizador QUESTÃO P029-04) — sem `legal_entity_id` em `Employee`/`Contract`/`Client` (regra 4). Migration semeia as duas entidades do exemplo da spec (Bridge351, NIVVOS), país/moeda `PT`/`EUR`, perfil de calendário `PT` (reaproveita `countryCode` já usado por `PublicHoliday` em Calendar, sem FK — apenas convenção de valor). `vacationDaysPerYearOverride` é opcional e, tal como os `SystemSetting`, é apenas armazenado (sem leitura em runtime por `AbsencesService`).
- **`GET /admin/metrics`**: decisão do utilizador (QUESTÃO P029-02) — métricas Prometheus reais via `prom-client` (`client.collectDefaultMetrics()`, métricas de processo/Node.js em formato de texto Prometheus válido), sem que Prometheus/Grafana estejam de facto implantados na infra (nunca configurados em nenhuma fase anterior — `docker-compose.dev.yml` não os inclui). Endpoint fica pronto a ser raspado quando/se essa infra for adicionada.
- **`GET /admin/health`**: endpoint próprio do módulo Admin (`{ status: 'ok', timestamp }`), distinto do `GET /health` já existente em `AppController` (P-000, fora de qualquer módulo) — mantido sem alteração, ambos coexistem.

### Frontend (P-031)

- **`AdminSettingsPage`** (`frontend/src/pages/AdminSettingsPage.tsx`), rota `/admin/settings`, item "Administração" na sidebar restrito a Admin (mesmo padrão de guarda usado em `FinancialDashboardPage`/`/analytics/financials`): duas abas.
  - **"Configurações"**: formulário único com os 15 parâmetros de `SystemSetting`, agrupados por categoria (Organização, Ausências, Timesheets, Alertas, Segurança, GDPR e Documentos) tal como no quadro da spec; `react-hook-form` + `zod`, `PUT /admin/settings` ao guardar.
  - **"Entidades Legais"**: `DataTable` com as `LegalEntity` existentes (nome, NIF, país, moeda, dias de férias, estado) e diálogo modal partilhado para criar (`POST /admin/legal-entities`) e editar (`PATCH /admin/legal-entities/:id`).
- Apenas a UI de gestão foi construída — reforça a decisão P029-01 (settings continuam sem leitura em runtime por outros módulos); esta fase não altera esse comportamento.

### Wiring de Admin Settings ao runtime (P-052)

Investigação prévia (agente de exploração, um grep dedicado por cada um dos 15 parâmetros) mostrou que a tarefa "ligar `SystemSetting` ao runtime" não era uniforme — dividia-se em 3 grupos por risco/complexidade: (A) substituição direta de uma constante hardcoded existente por leitura do setting, sem lógica nova; (B) estrutural — o hardcoded existe mas não é um simples swap (ex. `projectEndAlertDays` é hoje um campo por-registo `alertDaysBeforeEnd`, `sessionTimeoutMinutes` colidiria com o TTL da cache Redis que espelha `JWT_EXPIRES_IN`, um conceito diferente); (C) não existe lógica nenhuma ainda (ex. criação automática de saldo anual de férias, deadline de submissão de timesheets por dia, MFA obrigatório por papel, cron de purga de documentos — construir isto seria uma funcionalidade nova, não "wiring"). Apresentados os 3 grupos ao utilizador (decisão P052-01) — **escolhido só o Grupo A**, 5 parâmetros:

- **`AdminModule` passou a `@Global()`** (`backend/src/admin/admin.module.ts`), mesmo padrão já usado por `AuthModule`/`RbacModule` — `AdminService` injetável em qualquer serviço sem import adicional do módulo consumidor, já que `AdminModule` já estava registado em `AppModule` desde P-029.
- **`CapacityService.getAlerts()`**: substituída a constante de módulo `UNDERALLOCATION_THRESHOLD_PERCENTAGE = 80` por `(await this.adminService.getSettings()).underallocationThresholdPercentage`, lido a cada chamada (nunca em cache/constructor, para refletir alterações feitas via `PUT /admin/settings` sem reiniciar o processo).
- **`TimesheetsService.generateMonthlyPeriods()`**: `plannedHours = 8` hardcoded nas entradas de dia útil substituído por `settings.defaultDailyHours`, lido uma vez no início do método (reutilizado no loop sobre todos os colaboradores/dias do mês).
- **`ContractsService.scheduleExpirationAlerts()`** (cron diário): `findExpiringSoon(30)` passa a `findExpiringSoon(settings.contractExpiryAlertDays)`; a assinatura de `findExpiringSoon(days = 30)` mantém-se inalterada (sem outros chamadores no código).
- **`AuthService`**: os campos de constructor `maxFailedAttempts`/`lockoutDurationMs` (definidos uma única vez no arranque do processo) removidos — `handleFailedLogin()` passa a ler `settings.maxLoginAttempts`/`settings.lockoutPeriodMinutes` a cada tentativa falhada, para que uma alteração via `PUT /admin/settings` tenha efeito imediato no próximo login, sem reiniciar o backend.
- Todos os 4 serviços recebem `AdminService` injetado no constructor; os 4 spec files correspondentes (`capacity.service.spec.ts`, `timesheets.service.spec.ts`, `contracts.service.spec.ts`, `auth.service.spec.ts`) foram atualizados com um mock de `AdminService.getSettings()` a devolver os valores por defeito da spec. Novo teste unitário em `timesheets.service.spec.ts` (`generateMonthlyPeriods` usa `defaultDailyHours` de `SystemSetting`).
- **Verificação em ambiente real completa**: `PUT /admin/settings` com `underallocationThresholdPercentage: 5` fez um colaborador a 10.65% de alocação (antes classificado "sub-alocado" com o threshold 80 por defeito) desaparecer de `underallocations` em `GET /capacity/alerts`; `maxLoginAttempts: 2` bloqueou uma conta real ao fim de exatamente 2 tentativas falhadas (`locked_until` confirmado por `psql` a ~15 min à frente, `lockoutPeriodMinutes` por defeito); tentativa de login subsequente devolveu `403 Conta bloqueada temporariamente`. Todos os settings repostos aos valores por defeito e a conta de teste desbloqueada no fecho da sessão.
- Os restantes 10 parâmetros (Grupos B e C) continuam sem leitura em runtime — ver `specs/GLOBAL-TASKS-RISKS.md` para o detalhe por parâmetro.

### Wiring de Admin Settings ao runtime — Grupo B (P-053)

Escolhido pelo utilizador entre continuar o wiring (Grupo B) e aprofundar o relatório de conformidade GDPR (decisão P053-00). Dos 5 parâmetros do Grupo B, cada um tinha uma ambiguidade genuína por resolver antes de implementar — apresentadas ao utilizador (decisão P053-01) antes de tocar em código:

- **`defaultCountry`**: só ligado o valor por defeito de `CalendarService.findHolidays(year?, countryCode?)` — `countryCode` deixou de ter o literal `'PT'` como default de parâmetro (JS não permite um valor por defeito assíncrono) e passa a ser resolvido dentro do método: `countryCode ?? (await this.adminService.getSettings()).defaultCountry`. `importPortugalHolidays()` (cron anual, nome do método, URL da API externa `date.nager.at/.../PT`, `countryCode: 'PT'` hardcoded nas linhas importadas) **não foi generalizado** — mantém-se especificamente sobre Portugal, por decisão do utilizador (não havia consumidor real de outro país para justificar o âmbito maior).
- **`defaultCurrency`**: `ExpensesService.createReport()` (`currency: dto.items?.[0]?.currency ?? 'EUR'`) e `addItem()` (`currency: itemDto.currency ?? 'EUR'`) passam a usar `settings.defaultCurrency`. O `default: 'EUR'` ao nível da coluna em `ExpenseReport`/`ExpenseItem` (`hr.expense_reports`/`hr.expense_items`) não foi tocado (regra 4, migrations não alteradas) — na prática nunca é exercitado, já que o serviço define sempre `currency` explicitamente antes do insert.
- **`companyName`**: **não ligado** (decisão do utilizador) — só aparece como texto descritivo do Swagger UI em `main.ts`, construído uma única vez no arranque do processo (dev/staging), antes de `app.listen()`. Ligar implicaria uma chamada nova a `AdminService.getSettings()` durante o `bootstrap()`, introduzindo uma dependência de BD no arranque que não existe hoje e um novo modo de falha (`NotFoundException` se `SystemSetting` ainda não estiver semeado) por um ganho puramente cosmético.
- **`projectEndAlertDays`**: `ProjectsService.create()` (`Project.alertDaysBeforeEnd`, antes só o default `30` da coluna) e `allocateEmployee()` (`ProjectAllocation.alertDaysBeforeEnd`, antes hardcoded `?? 15`) passam ambos a `dto.alertDaysBeforeEnd ?? settings.projectEndAlertDays` — **valor único partilhado** entre `Project` e `ProjectAllocation` (decisão do utilizador) — a distinção anterior 30 (projeto)/15 (alocação) desaparece como default; quem quiser valores diferentes por registo continua a poder definir `alertDaysBeforeEnd` explicitamente no DTO. Só afeta a criação de novos registos — registos existentes mantêm o valor já gravado, tal como o padrão de `underallocationThresholdPercentage`/`defaultDailyHours` não se aplica aqui (o valor fica persistido por registo, não recalculado em cada leitura).
- **`sessionTimeoutMinutes`**: **não ligado** (decisão do utilizador) — não existe hoje nenhuma lógica de "timeout de sessão" a que ligar; o único hardcoded de 15 min encontrado em `auth.service.ts` (TTL da cache Redis `session:${hash}`) é na realidade o TTL que espelha `JWT_EXPIRES_IN` (variável de ambiente, também 15m por omissão — coincidência de valores, não a mesma coisa), usado como cache de verificação de sessão ativa, não como política de expiração por inatividade. Documentado como gap — implementar expiração de sessão por inatividade seria funcionalidade nova (Grupo C), não wiring.
- `CalendarService`, `ExpensesService` e `ProjectsService` passam a injetar `AdminService` (sem import adicional de módulo, `AdminModule` já `@Global()` desde P-052). 4 spec files atualizados com mock de `AdminService`; 5 novos testes unitários (`calendar.service.spec.ts` ×2 — default e override explícito de `findHolidays()`; `projects.service.spec.ts` ×3 — `create()` com/sem override, `allocateEmployee()` com fallback). 372/372 testes unitários (antes 367/367).
- **Verificação em ambiente real completa**: `PUT /admin/settings` com `defaultCountry: 'ES'` fez `GET /calendar/holidays?year=2026` (sem `countryCode` na query) devolver só o feriado `ES` inserido para o teste (antes devolvia os 18 feriados `PT`); `defaultCurrency: 'USD'` fez `POST /expenses` sem `currency` explícito criar um relatório com `currency: 'USD'`; `projectEndAlertDays: 99` fez `POST /projects` sem `alertDaysBeforeEnd` criar um projeto com `alertDaysBeforeEnd: 99`. Dados e settings de teste removidos/repostos no fecho da sessão.
- **Grupo C (5 parâmetros) continua por atacar**: `defaultVacationDaysPerYear`/`carryOverVacationDays` (sem criação automática de saldo anual), `timesheetSubmissionDeadlineDay` (cron ignora dia-do-mês), `mfaRequiredForAdmin` (sem imposição por papel), `documentsTrashRetentionDays` (sem cron de purga), `gdprPostExitRetentionYears` (possivelmente redundante face a `RetentionPolicy`) — todos exigiriam construir lógica nova, não só wiring.

### Wiring de Admin Settings ao runtime — Grupo C, `documentsTrashRetentionDays` (P-054)

Escolhido pelo utilizador entre continuar o wiring (Grupo C) e o relatório de conformidade GDPR (decisão P054-00); dentro do Grupo C, `documentsTrashRetentionDays` escolhido como único item desta sessão (decisão P054-01) — o mais contido dos 5, sem decisão de produto em aberto e sem risco de quebrar o seed de desenvolvimento, ao contrário de `mfaRequiredForAdmin` (afetaria o login do admin semeado) ou `defaultVacationDaysPerYear`/`timesheetSubmissionDeadlineDay` (âmbito "Large"/"Medium", exigem desenhar comportamento novo em vários pontos).

- **Achado durante a investigação**: `DocumentsService.purge(documentId)` já existia (elimina o objeto do storage + remove o registo), mas **nunca tinha sido invocado por nenhum caminho de código** — não há rota no `DocumentsController` que o chame; era código morto desde a implementação original do módulo. `Document.deletedAt` (já existente, coluna nullable) é exatamente o timestamp necessário para uma política de retenção.
- **`DocumentsService.purgeExpiredTrash()`** (novo, `@Cron('0 4 * * *')`, diário às 04:00 — horário escolhido para não colidir com os crons já existentes às 02:00 (`NotificationsService.cleanupExpiredNotifications`), 03:00 (`GdprService.runRetentionPolicies`) e 06:00–09:00 (Calendar/Contracts/Projects/Timesheets)): lê `settings.documentsTrashRetentionDays`, calcula `cutoff = now - N dias`, procura `Document` com `deletedAt < cutoff` e chama `this.purge(document.id)` para cada um — reutiliza o método já existente e testado em vez de duplicar a lógica de eliminação.
- `DocumentsService` passa a injetar `AdminService` (sem import adicional de módulo). 2 novos testes unitários em `documents.service.spec.ts` (purga documentos expirados; não faz nada quando não há nenhum expirado). 374/374 testes unitários (antes 372/372).
- **Verificação em ambiente real completa**: documento real submetido via `POST /documents`, movido para a lixeira via `DELETE /documents/:id`, `deleted_at` retrocedido para 60 dias via `psql` (a simular passagem de tempo, já que o cron só corre às 04:00 e não há endpoint manual para o disparar). Como não existe HTTP endpoint que exponha `purgeExpiredTrash()` (é só um método de cron, por desenho — nenhum outro cron deste módulo tem trigger manual), o método foi invocado diretamente dentro do container via `NestFactory.createApplicationContext(AppModule)` (script `ts-node` temporário, removido no final) — confirmado pelos logs de query SQL que o `WHERE deleted_at < $1` calculou corretamente o cutoff de 30 dias a partir do `documentsTrashRetentionDays` real da BD, encontrou o documento de teste, e executou `DELETE FROM hr.documents`; confirmado por `psql` que o registo desapareceu da tabela. Documento e ficheiro de teste eliminados como esperado (esse era o próprio objetivo do teste, não precisou de limpeza adicional).
- **Grupo C — 4 parâmetros continuam por atacar**: `defaultVacationDaysPerYear`/`carryOverVacationDays` (sem criação automática de saldo anual — âmbito "Large", exigiria cron novo + lógica de transição de ano + decisões sobre pro-rating de novos colaboradores), `timesheetSubmissionDeadlineDay` (cron de lembrete atual ignora dia-do-mês — precisa de decisão sobre o que "prazo" deve significar na prática), `mfaRequiredForAdmin` (sem imposição por papel — precisa de decisão entre recusar login ou forçar configuração de MFA, e tocaria no seed de desenvolvimento, já que o admin semeado não tem MFA configurado), `gdprPostExitRetentionYears` (possivelmente redundante face a `RetentionPolicy` por registo, sem nenhuma seedada por defeito — precisa de decisão de produto sobre se faz sentido ligar).

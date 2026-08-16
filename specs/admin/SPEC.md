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

### Wiring de Admin Settings ao runtime — Grupo C, `gdprPostExitRetentionYears` (P-055)

Escolhido pelo utilizador entre continuar o wiring (Grupo C) e o relatório de conformidade GDPR (decisão P055-00); dentro do Grupo C, `gdprPostExitRetentionYears` escolhido como único item desta sessão (decisão P055-01) — o mais pequeno dos 4 restantes.

- **Investigação revelou que este parâmetro não é redundante** — `GdprService.runRetentionPolicies()` (`@Cron('0 3 1 * *')`, mensal) já implementa exatamente o mecanismo que `gdprPostExitRetentionYears` descreve ("Período retenção pós-saída"): anonimiza colaboradores `INACTIVE` cujo `employmentEndDate` ultrapassa `cutoff = now - N anos`, para cada `RetentionPolicy` ativa com `actionAfterRetention: ANONYMIZE`. O problema real é que **nenhuma `RetentionPolicy` é semeada por defeito** — a tabela `retention_policies` fica vazia até um admin criar uma manualmente via `POST /gdpr/retention-policies`. Na prática, o cron mensal era sempre um no-op em qualquer BD nova.
- **Decisão do utilizador, com confirmação explícita antes de implementar** (dado tratar-se de uma ação real de anonimização, irreversível, não uma alteração cosmética): ligar `gdprPostExitRetentionYears` faria o cron mensal começar a anonimizar colaboradores de facto pela primeira vez — confirmado que era essa a intenção. Escolhido o mecanismo de **regra implícita embutida** (em vez de sincronizar uma `RetentionPolicy` dedicada a partir do setting, que exigiria escrita cruzada de `AdminService` para as tabelas do GDPR): `GdprService` só lê o setting, mesmo padrão de P-052/053/054.
- **`GdprService.runRetentionPolicies()`**: passa a injetar `AdminService` e, além de iterar as `RetentionPolicy` explícitas já existentes, aplica sempre uma regra adicional com `retentionYears = settings.gdprPostExitRetentionYears`. Lógica de "encontrar inativos + anonimizar" extraída para `anonymizeInactiveEmployeesPastCutoff(retentionYears)`, reutilizada tanto pela regra implícita como pelo loop de políticas explícitas — evita duplicar a lógica pré-existente.
- **Limitação pré-existente, não introduzida por esta fase, documentada aqui por transparência**: `anonymizeEmployee()` não verifica se o colaborador já foi anonimizado antes de o processar novamente — um colaborador inativo que continue a corresponder ao filtro `employmentEndDate < cutoff` seria reprocessado (sem efeito adicional nos dados, já anonimizados, mas reemitindo `gdpr.data.anonymized` e incrementando a contagem) em cada corrida mensal seguinte. Este comportamento já existia para qualquer `RetentionPolicy` explícita antes desta fase; a regra implícita nova herda a mesma característica, não introduz uma nova classe de problema.
- 2 testes unitários em `gdpr.service.spec.ts` atualizados/adicionados: o teste "sem políticas ativas" passou a confirmar `count === 0` também sem nenhum colaborador a corresponder à regra implícita; novo teste confirma que um colaborador inativo além do cutoff é anonimizado mesmo sem nenhuma `RetentionPolicy` explícita configurada. 375/375 testes unitários (antes 374/374).
- **Verificação em ambiente real completa, com cuidado adicional dado tratar-se de anonimização real**: confirmados os 3 colaboradores reais da BD de desenvolvimento (Ana Silva, Bruno Costa, Admin System) todos com `status: active` antes de qualquer alteração — fora do alcance da query independentemente do valor do setting. Criado um colaborador descartável dedicado ao teste (`user_id`/`id` com UUID reservado `...099`/`...098`, `status: inactive`, `employmentEndDate` 10 anos no passado) via `psql`. `runRetentionPolicies()` invocado diretamente dentro do container (mesma técnica de P-054, `NestFactory.createApplicationContext`) — logs de query confirmam o cutoff calculado corretamente (`2021-08-15`, exatamente `now - 5 anos`, o `gdprPostExitRetentionYears` por defeito), o colaborador de teste encontrado e anonimizado (`first_name`/`last_name`/`email` alterados, `User.email` também anonimizado, `AuditLog` de `ANONYMIZE` criado), `ANONYMIZED_COUNT=1`. Confirmado por `psql`, após a corrida, que os 3 colaboradores reais permaneceram inalterados. Colaborador, utilizador e audit log de teste eliminados por completo (não só anonimizados) no fecho da sessão.
- **Grupo C — 3 parâmetros continuam por atacar**: `defaultVacationDaysPerYear`/`carryOverVacationDays` (Large), `timesheetSubmissionDeadlineDay` (Medium), `mfaRequiredForAdmin` (Medium, tocaria no seed de dev).

### Wiring de Admin Settings ao runtime — Grupo C, `timesheetSubmissionDeadlineDay` (P-056)

Escolhido pelo utilizador entre continuar o wiring (Grupo C) e o relatório de conformidade GDPR (decisão P056-00); dentro do Grupo C, `timesheetSubmissionDeadlineDay` escolhido como único item desta sessão (decisão P056-01) — dos 3 restantes, o único sem risco de tocar o seed de desenvolvimento (ao contrário de `mfaRequiredForAdmin`) e sem exigir cron novo + lógica de transição de ano (ao contrário de `defaultVacationDaysPerYear`/`carryOverVacationDays`).

- **Ambiguidade genuína identificada e resolvida com o utilizador antes de implementar** (decisão P056-02): `TimesheetsService.alertPendingSubmissions()` (`@Cron('0 9 * * 1')`, semanal à segunda-feira) já existia desde P-044, mas emite `timesheet.pending-submission` para **todos** os períodos `IN_PROGRESS`, incondicionalmente — nenhum conceito de prazo/atraso. BR-TS-007 ("prazo configurável, ex. até dia 5 do mês seguinte") e RF-TS-012 ("o sistema deve alertar para submissões em atraso") descrevem um alerta condicionado ao prazo, não um lembrete semanal universal. Três abordagens apresentadas ao utilizador: (A) condicionar o cron existente ao prazo real (só emite quando `now` ultrapassa `settings.timesheetSubmissionDeadlineDay`), (B) manter o lembrete semanal como está e acrescentar um evento/cron novo e distinto só para atraso, (C) só expor o cálculo de atraso sem tocar em nenhum alerta. **Escolhida a opção A** — mais fiel à literalidade de RF-TS-012, sem duplicar a superfície de notificação.
- **`TimesheetsService.alertPendingSubmissions()`**: passa a ler `settings.timesheetSubmissionDeadlineDay` via `AdminService.getSettings()` (já injetado desde P-052) e só emite `timesheet.pending-submission` para períodos cujo prazo já passou — novo método privado `isSubmissionOverdue(period, deadlineDay, now)` calcula o prazo como `dia deadlineDay do mês seguinte ao período` (ex. período `2026-07` com `deadlineDay=5` → prazo `2026-08-05`, considerado em atraso a partir de `2026-08-06`) e compara com `now`. Mesmo evento (`timesheet.pending-submission`) e consumidor (`NotificationsService.handleTimesheetPendingSubmission()`) de sempre — só ganhou uma condição de atraso real antes de disparar.
- 2 novos testes unitários em `timesheets.service.spec.ts` (`alertPendingSubmissions`, com `jest.useFakeTimers().setSystemTime()` para controlar `now`): não emite quando o prazo ainda não passou; emite no dia seguinte ao prazo. 377/377 testes unitários (antes 375/375). `pnpm run lint` (0 erros) e `pnpm run build` (raiz) green.
- **Verificação em ambiente real completa**: criados 2 períodos `IN_PROGRESS` reais para Bruno Costa via `psql` — um para `2026-07` (prazo `2026-08-05` com o `timesheetSubmissionDeadlineDay` real da BD, já ultrapassado, dado que a data corrente é `2026-08-16`) e um para `2026-08` (prazo `2026-09-05`, ainda não ultrapassado). `alertPendingSubmissions()` invocado diretamente dentro do container (mesma técnica de P-054/P-055, `NestFactory.createApplicationContext`) — confirmado por logs de query que só o período de julho foi processado pelo handler de notificações; `psql` confirmou uma única notificação `timesheet.pending-submission` criada, com `reference_id` correspondente ao período de julho (o de agosto não gerou nenhuma). Períodos, notificação e preferência de notificação de teste eliminados por completo no fecho da sessão.
- **Grupo C — 2 parâmetros continuam por atacar**: `defaultVacationDaysPerYear`/`carryOverVacationDays` (Large), `mfaRequiredForAdmin` (Medium, tocaria no seed de dev).

### Wiring de Admin Settings ao runtime — Grupo C, `defaultVacationDaysPerYear`/`carryOverVacationDays` (P-057)

Escolhido pelo utilizador entre continuar o wiring (Grupo C) e o relatório de conformidade GDPR; dentro do Grupo C, o item "Large" restante (decisão P057-01, o maior dos 3 que restavam nessa altura).

- **Investigação confirmou o âmbito "Large"**: nenhum código em nenhum sítio (serviço, endpoint, seed) cria uma linha `LeaveBalance` — só existem leituras/atualizações. `AbsencesService.create()` só valida saldo `if (balance) { ... }`; sem linha, a validação é um no-op silencioso e qualquer pedido de férias era sempre aceite, independentemente do saldo real. Três decisões de produto genuínas identificadas e apresentadas ao utilizador antes de implementar:
  - **Criação da linha `LeaveBalance`** (decisão P057-02): cron anual (escolhido) vs. criação sob demanda (lazy) vs. ambos. Escolhido só o **cron anual**, mesmo padrão do cron anual já existente de importação de feriados em `CalendarService` (`@Cron('0 6 1 1 *')`).
  - **Pro-rating de colaboradores admitidos a meio do ano** (decisão P057-03): proporcional aos meses restantes (escolhido) vs. valor completo sempre. Escolhido **proporcional**, arredondado por mês inteiro, sem granularidade ao dia.
  - **Mecanismo de carry-over** (decisão P057-04): aplicado no mesmo cron anual (escolhido) vs. não implementar carry-over nesta sessão. Escolhido **aplicar no cron**, usando o `remainingDays` do ano anterior.
- **`AbsencesService.generateAnnualLeaveBalances()`** (novo, `@Cron('0 7 1 1 *')`, 1 de janeiro — 7h, uma hora depois do cron de feriados do Calendar para evitar sobreposição): para cada colaborador ativo sem uma linha `LeaveBalance` do tipo `VACATION` já existente para o ano corrente, cria uma nova com `entitledDays` = `computeEntitledVacationDays()` (`settings.defaultVacationDaysPerYear` completo se admitido em ano anterior; proporcional aos meses restantes — `round(defaultDaysPerYear × mesesRestantes / 12)` — se admitido no próprio ano corrente; `0`, sem criar linha, se a data de admissão for no futuro) e `carryOverDays` = `computeCarryOverDays()` (`min(settings.carryOverVacationDays, remainingDays da linha do ano anterior)`, `0` se não existir linha do ano anterior). `remainingDays` da nova linha = `entitledDays + carryOverDays`. Datas parseadas por `split('-')` (não `new Date()`), mesmo padrão já usado em `CalendarService` para `employmentStartDate`, evitando ambiguidade de fuso horário.
- **Limitação conhecida, documentada como `R-043`, não corrigida** (consequência direta de ter escolhido só o cron anual, sem fallback lazy): um colaborador admitido depois de o cron de 1 de janeiro já ter corrido nesse ano fica sem nenhuma linha `LeaveBalance` até ao cron do ano seguinte — o comportamento de no-op silencioso de hoje persiste para esse caso específico durante o resto do ano. Documentado em `specs/absences/SPEC.md` e `specs/GLOBAL-TASKS-RISKS.md`.
- `AbsencesService` passa a injetar `AdminService` (sem import adicional, `AdminModule` já `@Global()` desde P-052). 4 novos testes unitários em `absences.service.spec.ts` (entitlement completo para admissão em ano anterior; entitlement proporcional para admissão a meio do ano; carry-over limitado ao cap; idempotência — não duplica se a linha do ano já existir). 381/381 testes unitários (antes 377/377). `pnpm run lint` (0 erros) e `pnpm run build` (raiz) green.
- **Verificação em ambiente real completa**: 2 colaboradores descartáveis criados via `psql` (UUIDs reservados `...096`/`...097`) — um admitido em 2020 com uma linha `LeaveBalance` de 2025 pré-existente (`remainingDays: 9`, para testar o cap de carry-over de 5), outro admitido a meio de 2026 (`2026-07-15`, para testar o pro-rating). `generateAnnualLeaveBalances()` invocado diretamente dentro do container (mesma técnica de P-054/055/056) — confirmados os 3 colaboradores reais (Ana Silva, Bruno Costa, Admin System, todos admitidos antes de 2026) a receberem `entitledDays: 22`/`carryOverDays: 0`; o colaborador de carry-over a receber `entitledDays: 22`/`carryOverDays: 5` (`min(5, 9)`)/`remainingDays: 27`; o colaborador pro-rated a receber `entitledDays: 11` (`round(22×6/12)`, admitido em julho, 6 meses restantes)/`remainingDays: 11`. Segunda invocação confirmou idempotência (`0` linhas criadas, nenhuma duplicada). Exercitado também o efeito prático da correção via `AbsencesService.create()` diretamente: pedido de 15 dias úteis contra o saldo de 11 dias do colaborador pro-rated corretamente rejeitado (`BadRequestException`, "Saldo insuficiente"); pedido de 5 dias aceite. Todos os dados de teste (colaboradores, utilizadores, linhas `LeaveBalance`, incluindo as criadas para Ana Silva/Bruno Costa/Admin System) eliminados por completo no fecho da sessão, deixando a BD exatamente como estava antes da verificação.
- **Grupo C — 1 parâmetro continua por atacar**: `mfaRequiredForAdmin` (Medium, tocaria no seed de dev).

### Wiring de Admin Settings ao runtime — Grupo C, `mfaRequiredForAdmin` (P-059)

Escolhido pelo utilizador entre este último parâmetro do Grupo C e avaliar `R-044` (auditoria nunca ligada) — decisão P059-00. Investigação prévia (agente de exploração) confirmou que toda a infraestrutura de MFA já existia (entidade `User.mfaEnabled`/`mfaSecret`, `MfaService` baseado em `otpauth`, endpoints self-service `POST /auth/mfa/enable`\|`verify`\|`disable`) — faltava só a **imposição** ligada ao setting, exatamente como a spec descreve ("MFA obrigatório para Admin"). Três ambiguidades genuínas identificadas e resolvidas com o utilizador antes de implementar:

- **Âmbito de papéis** (decisão P059-01): `admin/SPEC.md` fala só em "Admin", mas `specs/auth/SPEC.md` (BR-AUTH-001) diz "obrigatório para perfis Administrador e Gestor" — as duas specs discordavam. Escolhido **só Admin**, seguindo o nome literal do parâmetro.
- **Mecanismo de imposição no login** (decisão P059-02): `POST /auth/mfa/enable` exige `JwtAuthGuard` (já autenticado) — um Admin sem MFA não tem forma de o configurar sem primeiro ter um token válido. Escolhido **token de âmbito limitado**: o `AuthService.login()`/`refresh()` calcula `isMfaSetupRequired(user, roles)` (verdadeiro quando o utilizador tem a role `admin`, `!user.mfaEnabled` e `settings.mfaRequiredForAdmin`) e passa essa flag a `JwtService.generateAccessToken()`, que a inclui no payload JWT como `mfaSetupRequired: true` só quando aplicável (claim omitida em caso contrário, para não alterar tokens normais). Novo decorator `@AllowMfaSetup()` (`backend/src/auth/decorators/allow-mfa-setup.decorator.ts`, `SetMetadata` + `Reflector`, mesmo padrão de `@Roles()` em `rbac/decorators`) marca as rotas que continuam acessíveis com um token restrito — aplicado a `POST /auth/mfa/enable`, `POST /auth/mfa/verify`, `GET /auth/me` e `POST /auth/logout`. `JwtAuthGuard` (agora também injeta `Reflector`) lança `ForbiddenException` (403, "Configuração de MFA obrigatória antes de aceder a este recurso") para qualquer rota protegida sem essa marca quando o token tem `mfaSetupRequired: true` — mecanismo centralizado num único guard, sem tocar em nenhum outro controller da aplicação.
- **Seed de desenvolvimento** (decisão P059-03): admin semeado (`admin@hr-suite.local`) continua sem MFA configurado, tal como antes — o mecanismo de token restrito aplica-se-lhe tal como a qualquer admin real, sem exigir alteração ao seed.
- **Âmbito frontend** (decisão P059-04, descoberta a meio da implementação): não existe nenhuma página frontend para completar o setup de MFA (scan QR + verificar código) — só os endpoints backend. Escolhido **só backend**, consistente com o tamanho das fases anteriores de wiring (P054-057); verificação em ambiente real feita via chamadas diretas à API (`curl` + geração de código TOTP via `otpauth` dentro do container). Um Admin real sem MFA fica, portanto, de facto bloqueado na UI da app até uma fase futura construir essa página — gap conhecido, não um bug.

Login/SSO via Keycloak (`AuthService.ssoLogin()`) não foi tocado — a imposição aplica-se só ao login local por password, mesmo limite que o próprio mecanismo de MFA self-service já tinha antes desta sessão (não é uma nova classe de gap).

**Gap pré-existente descoberto durante a verificação** (não relacionado com `mfaRequiredForAdmin`): nenhum dos 7 ficheiros `test/*.e2e-spec.ts` semeava uma linha `SystemSetting` — qualquer chamada a `AdminService.getSettings()` (todos os wirings desde P-052) lançava `NotFoundException` em e2e. Corrigido adicionando o seed da linha ao `beforeAll` dos 7 ficheiros. Isto revelou 2 outros gaps pré-existentes, não corrigidos por estarem fora do âmbito desta sessão — ver `R-045` em `specs/GLOBAL-TASKS-RISKS.md`.

8 novos testes unitários (5 em `auth.service.spec.ts` — token restrito para admin sem MFA, não restrito com MFA ativo/não-admin/setting desativado, recálculo no `refresh()`; 3 em `jwt.service.spec.ts` — claim `mfaSetupRequired` ausente por omissão, presente quando pedido, propagada por `generateTokenPair()`); 1 novo teste e2e em `auth.e2e-spec.ts` provando o bloqueio/permissão real da rota. 395/395 testes unitários (antes 387/387). `pnpm run lint` (0 erros) e `pnpm run build` (raiz) green.

**Verificação em ambiente real completa**: login real como `admin@hr-suite.local` (sem MFA, `mfaRequiredForAdmin: true` por defeito) devolveu um token com `mfaSetupRequired: true` no payload; `GET /auth/me` com esse token devolveu 200, `GET /users`/`GET /admin/settings` devolveram 403 com a mensagem esperada; `POST /auth/mfa/enable` devolveu o QR code real (200, mesmo com o token restrito); código TOTP gerado a partir do segredo real (via `otpauth` dentro do container) validado com sucesso em `POST /auth/mfa/verify`; login seguinte com o código MFA devolveu um token **sem** `mfaSetupRequired`, e `GET /users` passou a devolver 200. Testado também o recálculo em `POST /auth/refresh`: com MFA novamente desativado (`POST /auth/mfa/disable`), o `accessToken` obtido por refresh manteve `mfaSetupRequired: true` e continuou a bloquear rotas não permitidas. Estado do admin reposto exatamente ao original no fecho da sessão (`mfa_enabled: false`, `mfa_secret: null`, confirmado por `psql`).

Wiring de Admin Settings ao runtime **concluído**: os 15 parâmetros de `SystemSetting` estão todos ligados ao runtime (5 Grupo A em P-052, 3 Grupo B em P-053 + 2 conscientemente não ligados, 5 Grupo C em P-054–P-059). Só `LegalEntity` (fora de `SystemSetting`) permanece por ligar — não fazia parte do âmbito de nenhuma das decisões P052-01/P053-01/P054-01 em diante, que trataram sempre só dos 15 parâmetros de `SystemSetting`.

### Admin: criação manual de conta `User` — `POST /admin/users` (P-068)

Construído ao ligar o último evento de auditoria em falta, `R-044` (`Admin: UserCreated`, ver `specs/audit/SPEC.md` e `specs/GLOBAL-TASKS-RISKS.md`). Investigação confirmou que o único caminho que cria um `User` hoje é o provisionamento JIT via Keycloak no primeiro login SSO (`KeycloakService.syncUser()`) — não existe nenhum fluxo admin de criação manual de conta, e nem esta spec nem `specs/users/SPEC.md` alguma vez o descreveram (`Q-USR-001` em `specs/users/SPEC.md`, "onboarding formal", continua em aberto — este endpoint não a resolve, é deliberadamente mais estreito).

**4 opções apresentadas ao utilizador (decisão P068-01)**: documentar sem correspondência real (mesmo padrão de `gdpr.incident.escalated` em P-048); um endpoint `User` isolado mínimo; reaproveitar `POST /users` (Employee, já ligado a `Users: Created`) assumindo ser a mesma ação de negócio (mesmo raciocínio do caso RBAC em P-066); um endpoint completo `User`+`Employee` com fluxo de credenciais/convite. **Escolhido o endpoint `User` isolado mínimo** — reaproveitar `POST /users` foi descartado porque um `User` normalmente já existe via JIT _antes_ do `Employee` correspondente ser criado, pelo que "Employee criado" não corresponde de forma fiável a "User criado"; o endpoint completo foi descartado por arrastar `Q-USR-001`, uma decisão de produto maior e não pedida nesta sessão.

**Duas sub-decisões fechadas com o utilizador antes de implementar**:

- **(P068-02) Role por defeito**: `EMPLOYEE` atribuído automaticamente ao `User` criado, alinhando com o que UC-AUTH-002 (`specs/auth/SPEC.md`) já dizia dever acontecer no JIT mas nunca foi implementado (ver `R-AUTH-004`) — resolve a mesma lacuna nos dois caminhos de criação de `User` de forma consistente.
- **(P068-03) Email já existente (JIT prévio)**: `409 Conflict`, não idempotência — o evento chama-se literalmente `UserCreated`; dispará-lo quando não houve criação nenhuma seria auditoria enganosa. A mesma verificação aplica-se ao `username` derivado, caso colida com o de outro `User` já existente.

**Implementação**: novo `POST /admin/users` (`AdminController`, `RoleEnum.ADMIN` apenas) decorado `@Audit('UserCreated', 'User')`; novo `CreateUserDto` (`email` obrigatório, `username` opcional — por omissão, o prefixo do email antes do `@`, mesma convenção já usada em `KeycloakService.syncUser()`). Novo `AdminService.createUser()` valida unicidade de email e de username, cria o `User` com `passwordHash: ''` (compatível com login futuro via SSO, sem password local — mesmo padrão do JIT) e atribui o perfil `EMPLOYEE` via `RbacService.assignRoleByName()` (já existente desde P-066). `AdminModule` passa a registar `TypeOrmModule.forFeature([..., User])` diretamente (mesmo padrão já usado por `GdprModule` para a mesma entidade, em vez de depender da re-exportação `@Global()` de `AuthModule`) e injeta `RbacService` (já `@Global()`, sem import de módulo adicional).

4 novos testes unitários (`admin.service.spec.ts`). 425/425 testes unitários (antes 421/421). `pnpm run lint` (0 erros) e `pnpm run build` (raiz) green. Suite e2e 7/7 (51/51), sem alteração.

**Verificação em ambiente real completa**: utilizador de teste real criado via `POST /admin/users`; confirmado via `psql` que o perfil `employee` foi atribuído em `hr.user_roles` e que `hr.audit_logs` registou `UserCreated` com `entity_id` = o `User.id` novo; confirmado o mesmo evento via `GET /audit/logs` (API de leitura). Email duplicado e username derivado duplicado (email diferente) ambos corretamente rejeitados com `409`. Dados de teste eliminados, `hr.audit_logs` limpa, `mfaRequiredForAdmin` reposto a `true` no fecho da sessão. `specs/audit/SPEC.md` e `specs/GLOBAL-TASKS-RISKS.md` documentam o fecho de `R-044`.

**`R-044` está agora totalmente resolvido**: todos os eventos nomeados em `specs/audit/SPEC.md` ("Eventos Auditados (Mínimo)") estão ligados a um mecanismo real de auditoria.

### Ligar LegalEntity ao runtime — override por entidade legal em Contract/Expenses/Absences (P-069)

Escolhido pelo utilizador entre este item e tratar `R-042`/`R-043` (decisão P069-00). Investigação inicial mostrou que o âmbito era maior do que "pequeno" — não existia nenhuma ligação entre `LegalEntity` e o resto do sistema (nenhum FK de `Employee`/`Contract`/`Project` para `legal_entities`; `Contract.contracting_entity` era só um `VARCHAR(200)` livre) e `Q-USR-004` (`specs/users/SPEC.md`, "o organograma deve suportar múltiplas entidades legais?") continuava uma questão em aberto de prioridade Alta. Apresentadas 3 opções de âmbito ao utilizador (decisão P069-01) — escolhido **resolver `Q-USR-004` como decisão de produto primeiro**, antes de qualquer wiring.

**3 sub-decisões fechadas com o utilizador antes de implementar**:

- **(P069-02) Onde vive a ligação**: `Contract.legalEntityId` (novo), não `Employee` — evolução natural de `contracting_entity` já existente; permite que o mesmo colaborador tenha contratos sob entidades legais diferentes ao longo do tempo.
- **(P069-03) `contracting_entity` existente**: novo FK **a par**, sem substituir nem migrar os valores de texto livre já existentes.
- **(P069-04) Significado de "wiring ao runtime"**: override real — os campos específicos da `LegalEntity` (`currency`, `vacationDaysPerYearOverride`) substituem os defaults globais de `SystemSetting` para contratos ligados a essa entidade.

**Descoberta adicional durante a implementação (decisão P069-05, mesmo padrão de "âmbito maior do que estimado" de P-045)**: dos 3 pontos candidatos (mesmos 3 já ligados a `SystemSetting` em P-052/P-053/P-057), só 2 resolvem genuinamente por colaborador — `ExpensesService.createReport()`/`addItem()` (já recebem `employeeId`) e `AbsencesService.generateAnnualLeaveBalances()` (já itera colaborador a colaborador). `CalendarService.findHolidays()` é uma pesquisa genérica por país/ano (`GET /calendar/holidays?year=X`), sem nenhum colaborador associado — **escolhido deixar Calendar de fora**, sem alterar a forma da API pública deste endpoint.

**Implementação**: nova migração `1832000000000-AddLegalEntityIdToContracts.ts` (`ALTER TABLE hr.contracts ADD COLUMN legal_entity_id UUID NULL REFERENCES hr.legal_entities(id)`); `Contract` entity ganha `legalEntityId`/`legalEntity` (`ManyToOne` opcional); `CreateContractDto`/`UpdateContractDto` ganham `legalEntityId` opcional (passa através do `dto` genérico já usado por `ContractsService.create()`/`update()`, sem alteração ao service). Novo `AdminService.getEffectiveLegalEntity(employeeId)` resolve a `LegalEntity` do contrato `ACTIVE` do colaborador (`null` se não houver contrato ativo ou se não estiver ligado) — `AdminModule` regista também `Contract` via `TypeOrmModule.forFeature()` (mesmo padrão de `User` em P-068/`GdprModule`). `ExpensesService.createReport()`/`addItem()`: `legalEntity?.currency ?? settings.defaultCurrency` em vez de só o default global. `AbsencesService.generateAnnualLeaveBalances()`: `legalEntity?.vacationDaysPerYearOverride ?? settings.defaultVacationDaysPerYear` por colaborador dentro do loop — `carryOverVacationDays` continua só global, `LegalEntity` não tem campo equivalente.

7 novos testes unitários (3 `getEffectiveLegalEntity` em `admin.service.spec.ts`, 2 `addItem` em `expenses.service.spec.ts`, 1 override em `absences.service.spec.ts`). 431/431 testes unitários (antes 425/425). `pnpm run lint` (0 erros) e `pnpm run build` (raiz) green. Suite e2e 7/7 (51/51), sem alteração.

**Verificação em ambiente real completa**: migração aplicada com sucesso no container real; `LegalEntity` de teste real criada (`currency: USD`, `vacationDaysPerYearOverride: 25`); colaborador e contrato ativo de teste reais ligados a essa entidade via `POST /contracts` (`legalEntityId`), confirmado via `psql`/API; `AdminService.getEffectiveLegalEntity()`/`ExpensesService.createReport()` invocados diretamente dentro do container (mesma técnica de P-054/P-055) — relatório de despesas de teste confirmado com `currency: USD` (não `EUR`); `AbsencesService.generateAnnualLeaveBalances()` invocado da mesma forma — saldo do colaborador de teste confirmado com `entitledDays: 25` (não `22`, o default global). Efeito colateral esperado: a corrida do cron de ausências criou também um saldo real novo para o colaborador Admin System (sem saldo 2026 pré-existente) — eliminado no fecho da sessão para restaurar o estado exato anterior, mesmo cuidado já usado em P-057. Todos os dados de teste eliminados (`LegalEntity`, `Contract`, `Employee`, `User`, relatório de despesas, saldos de férias de 2026 incl. o do Admin System), `hr.audit_logs` limpa, `mfaRequiredForAdmin` reposto a `true` no fecho da sessão.

`Q-USR-004` (`specs/users/SPEC.md`) marcada como **parcialmente resolvida**: a ligação `Contract`→`LegalEntity` existe e tem efeito real em runtime (moeda de despesas, dias de férias); o organograma em si continua sem qualquer noção de entidade legal — fora do âmbito desta fase.

### Ligar Calendar à entidade legal — `AdminService.getEffectiveCountryCode()` (P-071)

Escolhido pelo utilizador como único candidato restante do backlog documentado (decisão P071-00, ver `specs/GLOBAL-TASKS-RISKS.md`). Novo `AdminService.getEffectiveCountryCode(employeeId?: string): Promise<string>` — `legalEntity?.calendarProfileCountryCode ?? settings.defaultCountry` quando `employeeId` é dado (via `getEffectiveLegalEntity()` já existente de P-069); só `settings.defaultCountry` quando omitido. Centraliza a mesma lógica de resolução de país que, de outra forma, teria de ser duplicada em 3 pontos diferentes (`CalendarController`, `AbsencesService`, `TimesheetsService`).

Ao investigar os 3 pontos candidatos a ligar (`GET /calendar/holidays`, `AbsencesService.calculateBusinessDays()`, `TimesheetsService.generateMonthlyPeriods()`), descoberto um gap maior e não relacionado (decisão P071-02): os últimos dois liam de `hr.holiday_calendars` (entidade `HolidayCalendar`, módulo Timesheets) — uma tabela órfã, sem seed, sem endpoint de import, sem CRUD admin, sempre vazia — em vez de `hr.public_holidays` (a tabela real, populada via `POST /calendar/holidays/import`, já usada por `CalendarService`). Na prática, feriados nunca eram excluídos do cálculo de dias úteis de ausências nem da geração de timesheets, para nenhum colaborador, desde sempre — não um caso de "país errado", mas de "nunca excluídos". Apresentadas 2 opções ao utilizador — escolhido **redirecionar os dois serviços para o Calendar real** em vez de só documentar. `HolidayCalendar` deixou de ser injetada em `AbsencesService`/`TimesheetsService` e foi removida de `TypeOrmModule.forFeature()` em `AbsencesModule`/`TimesheetsModule` — entidade e tabela ficam por remover (fora do âmbito). Ver `specs/absences/SPEC.md` e `specs/timesheets/SPEC.md` para o detalhe de cada serviço, e `specs/calendar/SPEC.md` para o `GET /calendar/holidays`.

5 novos testes unitários (3 `getEffectiveCountryCode` em `admin.service.spec.ts`, 1 em `absences.service.spec.ts`, 1 em `timesheets.service.spec.ts`). 439/439 testes unitários (antes 434/434). `pnpm run lint` (0 erros) e `pnpm run build` (raiz) green. Suite e2e 7/7 (51/51), sem alteração.

**Verificação em ambiente real completa**: 17 feriados PT reais importados via `POST /calendar/holidays/import`; `GET /calendar/holidays` sem `countryCode` confirmado a devolver PT para o admin (sem `LegalEntity` ligada); `LegalEntity`/colaborador/contrato de teste reais ligados a uma entidade US; `GET /calendar/holidays?employeeId=<teste>` confirmado a devolver só o feriado US de teste. `AbsencesService.calculateBusinessDays()`/`TimesheetsService.generateMonthlyPeriods()` invocados diretamente dentro do container (técnica de P-054/P-055) — com o `employeeId` do colaborador US, o feriado de teste foi corretamente excluído (4 dias úteis em vez de 5) e a entrada do timesheet correspondente marcada `entry_type: holiday`/`planned_hours: 0`; sem `employeeId` (fallback PT), o mesmo período continuou a contar 5 dias úteis, como esperado. Efeito colateral esperado (geração de períodos de julho 2026 criou também um período real novo para o Admin System) revertido no fecho, mesmo cuidado já usado em P-069/P-070. Todos os dados de teste eliminados, `hr.audit_logs` limpa, `mfaRequiredForAdmin` reposto a `true` no fecho da sessão.

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

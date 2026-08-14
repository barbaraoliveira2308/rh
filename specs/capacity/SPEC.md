# Módulo 06 — Capacidade & Alocação

## Objetivo

Planear e monitorizar a capacidade da equipa, detetar sobrealodação e sub-alocação, e visualizar o calendário de ocupação de recursos.

## Conceitos Chave

| Conceito         | Definição                                      |
| ---------------- | ---------------------------------------------- |
| Capacidade total | FTE × horas contratuais por período            |
| Horas alocadas   | Soma de horas comprometidas em projetos ativos |
| Taxa de ocupação | Horas alocadas / Capacidade total × 100%       |
| Sobrealodação    | Taxa de ocupação > 100%                        |
| Sub-alocação     | Taxa de ocupação < threshold (ex: 80%)         |

## Funcionalidades

1. Planeamento de capacidade da equipa por período (semanal/mensal/trimestral).
2. Visualização de calendário de ocupação (Gantt-like).
3. Alerta automático para sobrealodação de recursos.
4. Alerta automático para recursos sem alocação.
5. Tarifários por cargo/função para cálculo de rentabilidade.
6. Monitorização de lucro/custo por projeto.

## Regras de Negócio

| ID         | Regra                                                                              |
| ---------- | ---------------------------------------------------------------------------------- |
| BR-CAP-001 | Sobrealodação (>100%) gera alerta mas não bloqueia automaticamente.                |
| BR-CAP-002 | Colaboradores com alocação < 80% (configurável) são sinalizados como sub-alocados. |
| BR-CAP-003 | Colaboradores sem nenhuma alocação ativa geram alerta de recurso disponível.       |
| BR-CAP-004 | O cálculo de capacidade exclui ausências aprovadas.                                |

## Requisitos Funcionais

| ID         | Descrição                                                                 |
| ---------- | ------------------------------------------------------------------------- |
| RF-CAP-001 | O sistema deve apresentar taxa de ocupação por colaborador e equipa.      |
| RF-CAP-002 | O sistema deve detetar e alertar sobrealodação.                           |
| RF-CAP-003 | O sistema deve detetar e alertar sub-alocação e recursos livres.          |
| RF-CAP-004 | O sistema deve apresentar calendário visual de ocupação.                  |
| RF-CAP-005 | O sistema deve suportar planeamento futuro de alocações.                  |
| RF-CAP-006 | O sistema deve calcular rentabilidade por projeto com base em tarifários. |

## APIs

- GET /api/v1/capacity/overview
  - Query: period, team_id, employee_id
- GET /api/v1/capacity/calendar
  - Retorna: Estrutura para renderização de Gantt
- GET /api/v1/capacity/alerts
  - Retorna: overallocations + underallocations + available
- GET /api/v1/capacity/project-profitability/:project_id

## Dependências

```
Capacidade depende de:
- Projetos (alocações)
- Timesheets (horas reais)
- Ausências (períodos excluídos)
- Colaboradores (FTE, horário)
- Cargos (tarifários)
```

## Notas de Implementação

Implementado em P-028 (`backend/src/capacity/`), a partir de lógica que já existia dispersa em Teams, Projects e Analytics (decisão P028-01: módulo dedicado que reaproveita esses serviços como fonte de dados, sem duplicar as suas queries).

- **`CapacityController`** (`backend/src/capacity/capacity.controller.ts`) expõe os 4 endpoints da spec, todos `@Roles(ADMIN, MANAGER)`: `GET /capacity/overview`, `GET /capacity/calendar`, `GET /capacity/alerts`, `GET /capacity/project-profitability/:projectId`. Query params usam camelCase (`teamId`, `employeeId`), consistente com o resto do backend, em vez do `team_id`/`employee_id` (snake_case) da redação original da spec — o path dos endpoints mantém-se exatamente como especificado.
- **`GET /capacity/overview?period=&teamId=&employeeId=`**: `period` (YYYY-MM) é opcional, por omissão o mês atual. Se `employeeId` for dado, devolve ocupação de um único colaborador (via novo método `AnalyticsService.getEmployeeOccupancy()`, extensão aditiva ao serviço existente — não altera nenhum método já implementado). Se `teamId` for dado, delega em `AnalyticsService.getTeamOccupancy()`. Sem filtros, itera todos os colaboradores `ACTIVE` (mesmo padrão N+1 já usado em `AnalyticsService.getTopPerformingProjects()`), aceitável à escala atual do sistema.
- **BR-CAP-004 (excluir ausências aprovadas do cálculo)** — decisão do utilizador (QUESTÃO P028-05): implementada em `CapacityService.applyAbsenceAdjustment()`. Para cada colaborador, soma os dias de `AbsenceRequest` com `status = APPROVED` que se sobrepõem ao período; `availabilityFactor = (diasDoPeríodo − diasDeAusência) / diasDoPeríodo`; `adjustedAllocationPercentage = allocationPercentage / availabilityFactor` (quando `availabilityFactor > 0`, senão mantém o valor não ajustado). Interpretação: como o colaborador não está disponível durante a ausência, a mesma alocação planeada representa uma taxa de ocupação mais alta sobre o tempo realmente disponível. Cálculo em dias inteiros de sobreposição (não usa `total_days` fracionário de meio-dia do pedido de ausência — simplificação assumida).
- **`GET /capacity/alerts?period=&teamId=`**: parte de `getOverview()` e particiona por `adjustedAllocationPercentage`: `overallocations` (>100%), `underallocations` (>0% e <80% — threshold `UNDERALLOCATION_THRESHOLD_PERCENTAGE = 80`, hardcoded por decisão do utilizador P028-04, sem endpoint/UI de configuração), `available` (=0%). Partição mutuamente exclusiva entre as três listas.
- **`GET /capacity/calendar?period=&teamId=&employeeId=`**: devolve `CapacityCalendarEntryDto[]` — um intervalo por alocação (`employeeId`, `employeeName`, `projectId`, `projectName`, `startDate`, `endDate`, `allocationType`, `allocationValue`) via query direta a `ProjectAllocation`, pronto para um componente Gantt consumir. Decisão do utilizador (QUESTÃO P028-03): implementado apenas o endpoint de dados nesta fase — sem página frontend de calendário/Gantt.
- **`GET /capacity/project-profitability/:projectId`**: proxy direto para `AnalyticsService.getProjectProfitability()`, sem lógica adicional.
- **FTE / horas contratuais (conceito "Capacidade total")**: decisão do utilizador (QUESTÃO P028-02) — mantida a aproximação já existente no código (1.0 FTE por colaborador ativo, `WORKING_HOURS_PER_MONTH = 168` fixo). Não foi adicionado campo de FTE a `Employee` nem a `Contract` nesta fase; é uma limitação conhecida quando existirem colaboradores part-time.
- **Tarifários por cargo (RF-CAP-006)**: `JobTitle.hourlyRate` continua por usar (campo morto, como identificado na investigação P028) — a rentabilidade usa `Contract.monthlyCost` (custo) e `Project.hourlyRate` (receita), tal como já acontecia em `AnalyticsService`. Não alterado nesta fase.
- **Granularidade semanal/trimestral**: não implementada — todos os cálculos (overview, alerts, calendar) usam período mensal (`YYYY-MM`), mesma limitação já existente em `AnalyticsService`.
- **RF-CAP-005 (planeamento futuro)**: coberto indiretamente pelos endpoints existentes de Analytics (`GET /analytics/resources/forecast`), não duplicado em Capacity.

### Frontend (P-032)

Implementado `frontend/src/pages/CapacityPage.tsx` na rota `/capacity`, item "Capacidade" na sidebar (`AppLayout.tsx`) restrito a Admin ou Manager — novo filtro `managerOrAdminRoutes` (distinto de `adminOnlyRoutes`), condição `permissions.includes('admin') || permissions.includes('manager')`, alinhado com o guard `@Roles(ADMIN, MANAGER)` do `CapacityController`.

- Filtros partilhados pelas 3 abas: período (`<input type="month">`, por omissão o mês atual) e equipa (`Select` populado por `GET /teams`, opção "Todas as equipas" por omissão).
- **Aba "Visão Geral"**: `DataTable` de `GET /capacity/overview`, uma linha por colaborador (alocação planeada, dias de ausência, alocação ajustada, `StatusBadge` de estado — Sobrealocado `>100%`, Normal `80–100%`, Sub-alocado `>0% e <80%`, Disponível `0%`, espelhando os thresholds do `CapacityService`).
- **Aba "Alertas"**: 3 `Card` (Sobrealocados/Sub-alocados/Disponíveis) a partir de `GET /capacity/alerts`, cada um com contagem no título e lista dos colaboradores.
- **Aba "Calendário"** (RF-CAP-004): decisão do utilizador (QUESTÃO P032-01, entre timeline CSS / tabela de intervalos / adiar) — timeline construída em CSS puro (sem nova dependência de gráficos), uma linha por colaborador com barras posicionadas por `left%`/`width%` proporcional ao dia do mês, a partir de `GET /capacity/calendar`; tooltip nativo (`title`) com projeto/datas/valor de alocação ao passar o rato.
- Filtro por `employeeId` (suportado pelos endpoints `overview`/`calendar`) não exposto na UI nesta fase — apenas período e equipa, para manter o âmbito da fase contido; pesquisa por colaborador individual fica como possível extensão futura.
- `frontend/src/types/capacity.ts` e `frontend/src/api/capacity.api.ts` — novos ficheiros seguindo o padrão dos restantes módulos (`admin.api.ts`, `analytics.api.ts`); `fetchTeams()` chama `GET /teams` (endpoint já existente do módulo Teams, acessível a todos os perfis).
- **Validação em navegador real (Docker)**: ao contrário de P-031 (bloqueada por Docker inativo), nesta sessão o Docker estava ativo e a stack completa foi levantada (`docker compose -f infra/docker-compose.dev.yml --env-file .env up -d`, migrações, seed RBAC). Login como `admin@hr-suite.local`, navegação para `/capacity`, as 3 abas exercitadas e 0 erros de consola confirmados via Playwright headless. Como a base de dados de verificação só tinha a seed RBAC (sem colaboradores/projetos/alocações de exemplo), os 3 estados observados foram os "vazios" (nenhum colaborador/alerta/alocação) — o caminho de renderização com dados (linhas da tabela, badges, barras da timeline) não foi exercitado visualmente nesta sessão, apenas validado por `tsc`/lint e revisão de código contra os DTOs reais do backend.
- Decisão P032-02 (gaps de infra pré-existentes corrigidos para permitir a validação, não relacionados com o módulo Capacity): `infra/docker-compose.dev.yml` não passava `JWT_REFRESH_SECRET` nem `MFA_ENCRYPTION_KEY` ao container do backend (`EncryptionService` falhava a arrancar); `frontend/vite.config.ts` não tinha `server.host: true`, pelo que o Vite dev server só escutava em `::1` dentro do container e não era alcançável via a porta publicada; `infra/docker-compose.dev.yml` definia a variável `VITE_API_BASE_URL` no serviço frontend mas o código lê `VITE_API_URL` (`frontend/src/api/client.ts`), pelo que o pedido de login era feito via proxy do Vite para `http://localhost:3000` — dentro do container do frontend isso aponta para o próprio container, não para o backend, resultando em erro 500. As três correções tornam `pnpm dev`/Docker funcionais para qualquer módulo, não específicas do Capacity.

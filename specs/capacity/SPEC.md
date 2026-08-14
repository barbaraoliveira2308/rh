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

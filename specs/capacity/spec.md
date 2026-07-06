# Módulo 06 — Capacidade & Alocação

## Objetivo
Planear e monitorizar a capacidade da equipa, detetar sobrealodação e sub-alocação, e visualizar o calendário de ocupação de recursos.

## Conceitos Chave

| Conceito | Definição |
|----------|-----------|
| Capacidade total | FTE × horas contratuais por período |
| Horas alocadas | Soma de horas comprometidas em projetos ativos |
| Taxa de ocupação | Horas alocadas / Capacidade total × 100% |
| Sobrealodação | Taxa de ocupação > 100% |
| Sub-alocação | Taxa de ocupação < threshold (ex: 80%) |

## Funcionalidades

1. Planeamento de capacidade da equipa por período (semanal/mensal/trimestral).
2. Visualização de calendário de ocupação (Gantt-like).
3. Alerta automático para sobrealodação de recursos.
4. Alerta automático para recursos sem alocação.
5. Tarifários por cargo/função para cálculo de rentabilidade.
6. Monitorização de lucro/custo por projeto.

## Regras de Negócio

| ID | Regra |
|----|-------|
| BR-CAP-001 | Sobrealodação (>100%) gera alerta mas não bloqueia automaticamente. |
| BR-CAP-002 | Colaboradores com alocação < 80% (configurável) são sinalizados como sub-alocados. |
| BR-CAP-003 | Colaboradores sem nenhuma alocação ativa geram alerta de recurso disponível. |
| BR-CAP-004 | O cálculo de capacidade exclui ausências aprovadas. |

## Requisitos Funcionais

| ID | Descrição |
|----|-----------|
| RF-CAP-001 | O sistema deve apresentar taxa de ocupação por colaborador e equipa. |
| RF-CAP-002 | O sistema deve detetar e alertar sobrealodação. |
| RF-CAP-003 | O sistema deve detetar e alertar sub-alocação e recursos livres. |
| RF-CAP-004 | O sistema deve apresentar calendário visual de ocupação. |
| RF-CAP-005 | O sistema deve suportar planeamento futuro de alocações. |
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

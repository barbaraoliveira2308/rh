# Módulo 15 — Dashboard de Recursos & Indicadores

## Objetivo
Apresentar visão operacional em tempo real dos recursos humanos, ocupações, projetos e contratos, com filtros por período e equipa.

## Indicadores Apresentados

| Indicador | Fonte | Atualização |
|-----------|-------|-------------|
| Taxa global de ocupação | Alocações / FTE disponível | Diária |
| Recursos disponíveis (sem projeto) | Colaboradores sem alocação ativa | Diária |
| Recursos subalocados (< threshold) | Alocações < 80% (configurável) | Diária |
| Recursos sobrealodados (> 100%) | Alocações > 100% | Diária |
| Projetos em curso | Projetos com status active | Real-time |
| Projetos próximos do fim (N dias) | Projetos com end_date < hoje+N | Diária |
| Contratos próximos da expiração | Contratos com end_date < hoje+N | Diária |
| Ausências do dia | AbsenceRequests aprovados do dia | Real-time |
| Indicadores de férias (pendentes, aprovadas) | LeaveBalance | Real-time |

## Filtros

- Período (mês/trimestre/ano)
- Equipa/Departamento
- Entidade legal (Bridge351, NIVVOS)

## Requisitos Funcionais

| ID | Descrição |
|----|-----------|
| RF-DASH-001 | O sistema deve apresentar taxa global de ocupação com drill-down por equipa. |
| RF-DASH-002 | O sistema deve listar recursos sem alocação e com sobrealodação. |
| RF-DASH-003 | O sistema deve apresentar projetos em risco (próximos do fim). |
| RF-DASH-004 | O sistema deve apresentar contratos a expirar. |
| RF-DASH-005 | O sistema deve apresentar ausências do dia com visão por equipa. |
| RF-DASH-006 | O sistema deve suportar filtros por período e equipa. |
| RF-DASH-007 | O sistema deve apresentar gráficos e indicadores visuais. |

## Permissões

| Ação | Administrador | Gestor | Aprovador | Colaborador |
|------|:---:|:---:|:---:|:---:|
| Ver dashboard global | ✅ | ❌ | ❌ | ❌ |
| Ver dashboard da equipa | ✅ | ✅ | ❌ | ❌ |
| Ver próprios indicadores | ✅ | ✅ | ✅ | ✅ |

## APIs

- GET /api/v1/dashboard/resources
- GET /api/v1/dashboard/occupancy
- GET /api/v1/dashboard/alerts

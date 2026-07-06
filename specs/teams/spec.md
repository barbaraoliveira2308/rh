# Módulo 03 — Equipas & Organograma

## Objetivo
Gerir equipas e departamentos, definir líderes, suportar transferências de colaboradores e apresentar organograma visual.

## Entidades

### Team
| Campo | Tipo | Validação | Notas |
|-------|------|-----------|-------|
| id | UUID | PK | — |
| name | VARCHAR(100) | Único, Obrigatório | — |
| department_id | UUID | FK Department | — |
| leader_id | UUID | FK Employee, Nullable | Líder de equipa |
| description | TEXT | Nullable | — |
| is_active | BOOLEAN | Default true | — |
| created_at | TIMESTAMP | — |

### TeamMember
| Campo | Tipo | Notas |
|-------|------|-------|
| team_id | UUID | FK Team |
| employee_id | UUID | FK Employee |
| joined_at | DATE | — |
| left_at | DATE | Nullable — histórico |
| is_active | BOOLEAN | — |

## Regras de Negócio

| ID | Regra |
|----|-------|
| BR-TEAM-001 | Um colaborador pode pertencer a mais do que uma equipa (verificar Q-USR-005). |
| BR-TEAM-002 | O líder de equipa deve ser membro da equipa. |
| BR-TEAM-003 | Ao transferir colaborador, o histórico na equipa anterior é mantido com data de saída. |
| BR-TEAM-004 | Uma equipa inativa não aceita novos membros. |

## Requisitos Funcionais

| ID | Descrição |
|----|-----------|
| RF-TEAM-001 | O sistema deve permitir criar e gerir equipas com líderes. |
| RF-TEAM-002 | O sistema deve suportar associação de múltiplos colaboradores a equipas. |
| RF-TEAM-003 | O sistema deve suportar transferência de colaboradores entre equipas. |
| RF-TEAM-004 | O sistema deve apresentar organograma visual interativo. |
| RF-TEAM-005 | O sistema deve manter histórico de pertença a equipas. |

## APIs

- GET /api/v1/teams
- POST /api/v1/teams
- GET /api/v1/teams/:id
- PUT /api/v1/teams/:id
- GET /api/v1/teams/:id/members
- POST /api/v1/teams/:id/members
- DELETE /api/v1/teams/:id/members/:employee_id
- POST /api/v1/teams/:id/transfer (transferir membro para outra equipa)
- GET /api/v1/org-chart

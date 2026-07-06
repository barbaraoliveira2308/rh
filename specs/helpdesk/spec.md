# Módulo 19 — Helpdesk Interno

## Objetivo
Disponibilizar sistema de tickets internos para suporte a colaboradores, com gestão de SLA, categorias e equipas de resolução.

## Entidades

### Ticket
| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| title | VARCHAR(200) | — |
| description | TEXT | — |
| category_id | UUID | FK TicketCategory |
| submitter_id | UUID | FK Employee |
| assignee_id | UUID | FK Employee, Nullable |
| team_id | UUID | FK Team de resolução |
| priority | ENUM | low, normal, high, urgent |
| status | ENUM | open, in_progress, pending, resolved, closed |
| sla_deadline | TIMESTAMP | Calculado |
| sla_breached | BOOLEAN | Calculado |
| created_at | TIMESTAMP | — |
| resolved_at | TIMESTAMP | — |

### TicketCategory
| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| name | VARCHAR(100) | — |
| default_priority | ENUM | — |
| sla_hours | INT | Horas para resolução |
| resolution_team_id | UUID | FK Team |

## Regras de Negócio

| ID | Regra |
|----|-------|
| BR-HD-001 | O SLA é calculado com base na categoria e prioridade do ticket. |
| BR-HD-002 | Tickets com SLA ultrapassado são escalados automaticamente. |
| BR-HD-003 | Colaborador é notificado em todas as mudanças de estado. |
| BR-HD-004 | Tickets fechados não podem ser reabertos após 7 dias. |

## Requisitos Funcionais

| ID | Descrição |
|----|-----------|
| RF-HD-001 | O sistema deve suportar submissão de tickets por colaboradores. |
| RF-HD-002 | O sistema deve gerir SLA por categoria e prioridade. |
| RF-HD-003 | O sistema deve permitir atribuição a equipas de resolução configuráveis. |
| RF-HD-004 | O sistema deve escalar automaticamente tickets com SLA ultrapassado. |
| RF-HD-005 | O sistema deve suportar integração futura com IA para triagem automática. |

## APIs

- GET /api/v1/tickets
- POST /api/v1/tickets
- GET /api/v1/tickets/:id
- PUT /api/v1/tickets/:id
- POST /api/v1/tickets/:id/assign
- POST /api/v1/tickets/:id/resolve
- GET /api/v1/ticket-categories

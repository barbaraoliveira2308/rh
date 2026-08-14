# Módulo 19 — Helpdesk Interno

## Objetivo

Disponibilizar sistema de tickets internos para suporte a colaboradores, com gestão de SLA, categorias e equipas de resolução.

## Entidades

### Ticket

| Campo        | Tipo         | Notas                                        |
| ------------ | ------------ | -------------------------------------------- |
| id           | UUID         | PK                                           |
| title        | VARCHAR(200) | —                                            |
| description  | TEXT         | —                                            |
| category_id  | UUID         | FK TicketCategory                            |
| submitter_id | UUID         | FK Employee                                  |
| assignee_id  | UUID         | FK Employee, Nullable                        |
| team_id      | UUID         | FK Team de resolução                         |
| priority     | ENUM         | low, normal, high, urgent                    |
| status       | ENUM         | open, in_progress, pending, resolved, closed |
| sla_deadline | TIMESTAMP    | Calculado                                    |
| sla_breached | BOOLEAN      | Calculado                                    |
| created_at   | TIMESTAMP    | —                                            |
| resolved_at  | TIMESTAMP    | —                                            |

### TicketCategory

| Campo              | Tipo         | Notas                |
| ------------------ | ------------ | -------------------- |
| id                 | UUID         | PK                   |
| name               | VARCHAR(100) | —                    |
| default_priority   | ENUM         | —                    |
| sla_hours          | INT          | Horas para resolução |
| resolution_team_id | UUID         | FK Team              |

## Regras de Negócio

| ID        | Regra                                                           |
| --------- | --------------------------------------------------------------- |
| BR-HD-001 | O SLA é calculado com base na categoria e prioridade do ticket. |
| BR-HD-002 | Tickets com SLA ultrapassado são escalados automaticamente.     |
| BR-HD-003 | Colaborador é notificado em todas as mudanças de estado.        |
| BR-HD-004 | Tickets fechados não podem ser reabertos após 7 dias.           |

## Requisitos Funcionais

| ID        | Descrição                                                                 |
| --------- | ------------------------------------------------------------------------- |
| RF-HD-001 | O sistema deve suportar submissão de tickets por colaboradores.           |
| RF-HD-002 | O sistema deve gerir SLA por categoria e prioridade.                      |
| RF-HD-003 | O sistema deve permitir atribuição a equipas de resolução configuráveis.  |
| RF-HD-004 | O sistema deve escalar automaticamente tickets com SLA ultrapassado.      |
| RF-HD-005 | O sistema deve suportar integração futura com IA para triagem automática. |

## APIs

- GET /api/v1/tickets
- POST /api/v1/tickets
- GET /api/v1/tickets/:id
- PUT /api/v1/tickets/:id
- POST /api/v1/tickets/:id/assign
- POST /api/v1/tickets/:id/resolve
- GET /api/v1/ticket-categories

## Notas de Implementação

Implementado em P-020 (`backend/src/helpdesk/`), corrigido e documentado em P-027.

- **Entidade `TicketCategory`**: `default_priority` tem um valor por omissão de sistema (`TicketPriority.MEDIUM`) caso não seja definido na criação da categoria; `Ticket` sem categoria (`categoryId` null) usa a mesma prioridade e um SLA por omissão codificado em `DEFAULT_SLA_HOURS` (low: 120h, medium: 48h, high: 4h, urgent: 1h).
- **`TicketSla`**: entidade adicional face à spec original — regista um histórico de cada cálculo/recálculo de SLA (criação, escalonamento), incluindo se foi violado (`breached`) e quando foi notificado (`notifiedAt`). O campo `sla_deadline`/`sla_breached` do `Ticket` reflete sempre o estado mais recente.
- **`TicketComment`**: entidade adicional (RF não numerado na spec original) — comentários com `is_internal` (visível apenas a agentes/admin) associados a um ticket.
- **BR-HD-002 (escalonamento automático)**: implementado via cron `@Cron('*/30 * * * *')` (`checkSlaBreaches`), que marca `sla_breached = true` nos tickets abertos/em progresso/pendentes cujo `sla_deadline` já passou e regista uma entrada em `TicketSla`. O escalonamento manual (`POST /helpdesk/tickets/:id/escalate`, admin/manager) sobe a prioridade para `urgent` e recalcula o deadline.
- **BR-HD-004 (reabertura de tickets fechados)**: a leitura inicial da spec ("não podem ser reabertos após 7 dias") era ambígua quanto ao que acontece dentro da janela de 7 dias. Decisão do utilizador (QUESTÃO P027-02): implementar reabertura explícita. `update()` permite alterar um ticket `CLOSED` apenas quando o pedido muda `status` para um valor diferente de `closed` **e** o ticket foi fechado (via `resolved_at`, ou `updated_at` se nulo) há 7 dias ou menos — nesse caso `resolved_at` é limpo. Fora dessa janela, ou sem tentativa de mudança de estado, `update()` rejeita com `BadRequestException`. A mesma janela de 7 dias (helper privado `daysSinceClosed()`) é também usada em `addComment()` para bloquear comentários em tickets fechados há mais de 7 dias.
- **Rotas reais**: `GET /helpdesk/tickets`, `POST /helpdesk/tickets`, `GET /helpdesk/tickets/:id`, `PATCH /helpdesk/tickets/:id` (spec original listava `PUT`; serve também para reabertura, ver acima), `POST /helpdesk/tickets/:id/comments`, `POST /helpdesk/tickets/:id/assign` (admin), `POST /helpdesk/tickets/:id/escalate` (admin/manager), `POST /helpdesk/tickets/:id/close`, `GET /helpdesk/categories`, `POST /helpdesk/categories` (admin). Não existe um endpoint `POST /tickets/:id/resolve` dedicado como na spec original — o fecho é feito via `POST /tickets/:id/close`, e mudanças para o estado `resolved` (sem fechar) passam pelo `PATCH` genérico.
- **`findAll`**: colaboradores sem papel admin/manager só veem os seus próprios tickets (`submitter_id`); admin e manager veem todos, com filtros opcionais por `status`, `priority` e `categoryId`.
- **`close()`**: permitido a admin, manager, ou ao próprio submissor do ticket (não apenas agentes/admin).
- **RF-HD-005** (IA para triagem automática): não implementado — fora de âmbito v1, tal como a nota equivalente no módulo de Políticas.

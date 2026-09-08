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

**Bug corrigido em P-045 (`R-038`)**: `HelpdeskController` passava `req.user.sub` (JWT, `User.id`) onde se esperava `Employee.id` — em `findAll` (`Ticket.submitterId`, FK para `hr.employees`), `create`, `addComment` (`TicketComment.userId`, apesar do nome também FK para `hr.employees`) e `close`. Só funcionava para o admin; um colaborador real via a lista de tickets errada (ou vazia) e nunca conseguia criar/comentar um ticket com o próprio ID correto. Corrigido injetando o novo `EmployeeIdentityService` partilhado (`backend/src/auth/services/employee-identity.service.ts`). Verificado em runtime: Bruno Costa listou tickets com sucesso.

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

## Frontend (P-034)

- **`frontend/src/pages/HelpdeskListPage.tsx`** (rota `/helpdesk`, item "Helpdesk" na sidebar, visível a todos os utilizadores autenticados): duas abas para Admin (`Tabs` shadcn/ui) — "Tickets": `DataTable` de `GET /helpdesk/tickets` com filtros (estado, prioridade, categoria), `StatusBadge` de prioridade/estado/SLA violado, coluna "Submetido por" resolvida via `GET /users`, e diálogo modal "Novo Ticket" (`react-hook-form` + `zod`, `POST /helpdesk/tickets`); "Categorias" (só admin): `DataTable` de `GET /helpdesk/categories` + diálogo "Nova Categoria" (`POST /helpdesk/categories`). Utilizadores sem papel admin veem apenas a aba "Tickets" (sem `Tabs`), consistente com `findAll()` já filtrar tickets ao próprio submissor no backend.
- **`frontend/src/pages/TicketDetailPage.tsx`** (rota `/helpdesk/:id`): descrição, badges de estado/prioridade/SLA violado, painel de detalhes (submetido por, atribuído a, equipa, criado em, SLA, resolvido em) e ações condicionadas por papel/estado — "Atribuir" (admin, diálogo com `Select` de colaboradores, `POST /tickets/:id/assign`), "Escalar" (admin/manager, `POST /tickets/:id/escalate`), "Fechar Ticket" (admin/manager/próprio submissor, `POST /tickets/:id/close`), "Reabrir" (admin/manager, visível quando fechado, `PATCH /tickets/:id` com `status: open` — exercita BR-HD-004; falha com mensagem genérica se fora da janela de 7 dias, já que o backend não distingue o motivo do erro 400). Todas as ações usam `ConfirmDialog` partilhado exceto Atribuir/Reabrir.
- **Thread de comentários**: a spec original só tinha `POST /tickets/:id/comments` (sem forma de listar os já existentes). Adicionado nesta fase **`GET /helpdesk/tickets/:id/comments`** (`HelpdeskService.findComments()`) — decisão do utilizador (QUESTÃO P034-02) em vez de construir a UI sem histórico ou omitir comentários do âmbito. Comentários `isInternal` são filtrados no backend consoante o papel do requisitante (`RoleEnum.ADMIN`/`MANAGER` veem todos; outros só veem `isInternal: false`), replicando a nota já existente na secção "Notas de Implementação" sobre `TicketComment.is_internal`. A checkbox "Comentário interno" só é mostrada a admin/manager no formulário de comentário.
- **Resolução de nomes (submetido por / atribuído a / autor do comentário)**: `Ticket.submitterId`, `Ticket.assigneeId` e `TicketComment.userId` guardam o `sub` do JWT (`User.id`), não `Employee.id` — mesma convenção usada por `AbsencesService`. O frontend resolve nomes fazendo `GET /users?limit=100` e indexando por `Employee.userId` (não `Employee.id`). O diálogo "Atribuir" envia `agentId` = `Employee.userId` do colaborador selecionado, pela mesma razão.
- **Gap de dados de desenvolvimento descoberto ao verificar esta fase em navegador real**: a seed (`rbacSeed`) não cria nenhum `Employee` para `admin@hr-suite.local`, mas `tickets.submitter_id`/`assignee_id` e `ticket_comments.user_id` têm FK para `hr.employees(id)` — criar um ticket como admin falhava com violação de FK até se inserir manualmente um `Employee` com `id = user.id` (replicando a convenção usada em `test/absences.e2e-spec.ts`). Ver `R-034` em `specs/GLOBAL-TASKS-RISKS.md`.
- **`frontend/src/types/helpdesk.ts`** e **`frontend/src/api/helpdesk.api.ts`**: novos ficheiros seguindo o padrão dos restantes módulos, espelhando entidades/DTOs do backend (`Ticket`, `TicketCategory`, `TicketComment`, `TicketPriority`, `TicketStatus`).
- Verificação em navegador real (Playwright headless contra a stack Docker completa): login, criação de categoria, criação de ticket, adição de comentário, escalar, atribuir, fechar, reabertura visível — 0 erros de consola em todos os passos.

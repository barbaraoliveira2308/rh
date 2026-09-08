# Módulo 03 — Equipas & Organograma

## Objetivo

Gerir equipas e departamentos, definir líderes, suportar transferências de colaboradores e apresentar organograma visual.

## Entidades

### Team

| Campo         | Tipo         | Validação             | Notas           |
| ------------- | ------------ | --------------------- | --------------- |
| id            | UUID         | PK                    | —               |
| name          | VARCHAR(100) | Único, Obrigatório    | —               |
| department_id | UUID         | FK Department         | —               |
| leader_id     | UUID         | FK Employee, Nullable | Líder de equipa |
| description   | TEXT         | Nullable              | —               |
| is_active     | BOOLEAN      | Default true          | —               |
| created_at    | TIMESTAMP    | —                     |

### TeamMember

| Campo       | Tipo    | Notas                |
| ----------- | ------- | -------------------- |
| team_id     | UUID    | FK Team              |
| employee_id | UUID    | FK Employee          |
| joined_at   | DATE    | —                    |
| left_at     | DATE    | Nullable — histórico |
| is_active   | BOOLEAN | —                    |

## Regras de Negócio

| ID          | Regra                                                                                  |
| ----------- | -------------------------------------------------------------------------------------- |
| BR-TEAM-001 | Um colaborador pode pertencer a mais do que uma equipa (verificar Q-USR-005).          |
| BR-TEAM-002 | O líder de equipa deve ser membro da equipa.                                           |
| BR-TEAM-003 | Ao transferir colaborador, o histórico na equipa anterior é mantido com data de saída. |
| BR-TEAM-004 | Uma equipa inativa não aceita novos membros.                                           |

## Requisitos Funcionais

| ID          | Descrição                                                                |
| ----------- | ------------------------------------------------------------------------ |
| RF-TEAM-001 | O sistema deve permitir criar e gerir equipas com líderes.               |
| RF-TEAM-002 | O sistema deve suportar associação de múltiplos colaboradores a equipas. |
| RF-TEAM-003 | O sistema deve suportar transferência de colaboradores entre equipas.    |
| RF-TEAM-004 | O sistema deve apresentar organograma visual interativo.                 |
| RF-TEAM-005 | O sistema deve manter histórico de pertença a equipas.                   |

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

## Notas de Implementação

### Entregue

- **Entidades:** `Team` (`backend/src/teams/entities/team.entity.ts`) e `TeamMember` (`backend/src/teams/entities/team-member.entity.ts`), com barrel em `entities/index.ts`.
- **DTOs:** `CreateTeamDto`, `UpdateTeamDto` e `AddTeamMemberDto` (`backend/src/teams/dto/`), com barrel em `dto/index.ts`.
- **Serviço:** `TeamsService` (`backend/src/teams/services/teams.service.ts`), com barrel em `services/index.ts`.
- **Controlador:** `TeamsController` (`backend/src/teams/teams.controller.ts`), exposto pelo `TeamsModule`.
- **Endpoints implementados:**
  - `GET /teams`
  - `POST /teams`
  - `PATCH /teams/:id`
  - `GET /teams/:id/members`
  - `POST /teams/:id/members`
  - `DELETE /teams/:id/members/:employeeId`
  - `GET /teams/:id/capacity`
- **Eventos:** `TeamMemberChangedEvent` (`backend/src/teams/events/team-member-changed.event.ts`), emitido pelo serviço no tópico `team.member.changed` nas ações `added` e `removed`.
- **Migration:** `backend/src/database/migrations/1750000000000-CreateTeamsTables.ts` cria as tabelas `hr.teams` e `hr.team_members`, índices e foreign keys.

### Simplificações/Decisões

- A entidade `TeamMember` usa os campos `start_date` e `end_date` (em vez de `joined_at`/`left_at`) e inclui `role_in_team`; não possui o campo `is_active` previsto na spec, tendo recebido ainda uma chave primária `id` gerada.
- A entidade `Team` inclui `updated_at`, não listado na spec original.
- Não foi exposto o endpoint `GET /teams/:id` — o método `findOne` existe apenas para uso interno do serviço.
- Não foi implementado o endpoint `POST /teams/:id/transfer` (BR-TEAM-003); a remoção de membro apenas define `end_date`, sem criar automaticamente a nova associação noutra equipa.
- A regra BR-TEAM-002 ("o líder deve ser membro da equipa") não é validada no código atual.
- O endpoint de organograma (`GET /org-chart`) não está no módulo `teams`; existe um endpoint equivalente no módulo `users`: `GET /users/:id/org-chart`.
- Foi adicionado o endpoint `GET /teams/:id/capacity` (não previsto na spec original) para calcular capacidade da equipa num dado mês.

### Testes

- **Unitários:** não existem ficheiros `*.spec.ts` em `backend/src/teams/`.
- **E2E:** não existem testes e2e dedicados ao módulo `teams` em `backend/test/`.

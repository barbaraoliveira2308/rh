# Módulo 18 — Formação & Talento

## Objetivo

Gerir competências, avaliações de desempenho, objetivos/OKRs, cursos e progressão formativa dos colaboradores.

## Entidades

### Course (Curso/Formação)

| Campo          | Tipo         | Notas                       |
| -------------- | ------------ | --------------------------- |
| id             | UUID         | PK                          |
| name           | VARCHAR(200) | —                           |
| description    | TEXT         | —                           |
| provider       | VARCHAR(100) | Entidade formadora          |
| duration_hours | DECIMAL(5,1) | —                           |
| is_mandatory   | BOOLEAN      | —                           |
| category       | VARCHAR(100) | Técnica, Soft Skills, etc.  |
| start_date     | DATE         | —                           |
| end_date       | DATE         | —                           |
| status         | ENUM         | planned, ongoing, completed |

### CourseEnrollment

| Campo           | Tipo         | Notas                                              |
| --------------- | ------------ | -------------------------------------------------- |
| id              | UUID         | PK                                                 |
| course_id       | UUID         | FK Course                                          |
| employee_id     | UUID         | FK Employee                                        |
| status          | ENUM         | enrolled, started, in_progress, completed, no_show |
| completion_date | DATE         | —                                                  |
| score           | DECIMAL(5,2) | Nullable                                           |
| certificate_url | VARCHAR(512) | —                                                  |

### PerformanceReview

| Campo             | Tipo        | Notas                          |
| ----------------- | ----------- | ------------------------------ |
| id                | UUID        | PK                             |
| employee_id       | UUID        | FK Employee                    |
| reviewer_id       | UUID        | FK Employee                    |
| period            | VARCHAR(50) | ex: "Q1 2025"                  |
| status            | ENUM        | draft, submitted, acknowledged |
| overall_rating    | INT         | 1–5                            |
| strengths         | TEXT        | —                              |
| improvement_areas | TEXT        | —                              |
| objectives_next   | TEXT        | OKRs próximo período           |

### Competency

| Campo       | Tipo         | Notas |
| ----------- | ------------ | ----- |
| id          | UUID         | PK    |
| name        | VARCHAR(100) | —     |
| category    | VARCHAR(100) | —     |
| description | TEXT         | —     |

### EmployeeCompetency

| Campo         | Tipo | Notas         |
| ------------- | ---- | ------------- |
| employee_id   | UUID | FK Employee   |
| competency_id | UUID | FK Competency |
| level         | INT  | 1–5           |
| assessed_at   | DATE | —             |

## Estados de Formação

| Estado           | Descrição            |
| ---------------- | -------------------- |
| Inscrito         | Enrollment criado    |
| Iniciado         | Primeiro acesso      |
| Em curso         | Frequência ativa     |
| Concluído        | Aprovado com sucesso |
| Sem participação | Não compareceu       |

## Matriz de Talento 9-Box

A matriz 9-box avalia colaboradores em dois eixos:

- Performance (baixa/média/alta) — baseado em PerformanceReview
- Potencial (baixo/médio/alto) — avaliação subjetiva do gestor

## Requisitos Funcionais

| ID         | Descrição                                                            |
| ---------- | -------------------------------------------------------------------- |
| RF-TRN-001 | O sistema deve gerir cursos e formações com estados configuráveis.   |
| RF-TRN-002 | O sistema deve suportar inscrição e acompanhamento de progresso.     |
| RF-TRN-003 | O sistema deve suportar importação de cursos e participantes (CSV).  |
| RF-TRN-004 | O sistema deve gerir avaliações de desempenho com ciclos periódicos. |
| RF-TRN-005 | O sistema deve suportar gestão de objetivos/OKRs.                    |
| RF-TRN-006 | O sistema deve disponibilizar matriz de talento 9-box.               |
| RF-TRN-007 | O sistema deve gerir competências por colaborador.                   |
| RF-TRN-008 | O sistema deve suportar inquéritos de satisfação de formação.        |

## Permissões

| Ação                         | Administrador | Gestor | Colaborador |
| ---------------------------- | :-----------: | :----: | :---------: |
| Criar/gerir cursos           |      ✅       |   ❌   |     ❌      |
| Inscrever colaboradores      |      ✅       |   ✅   |   Próprio   |
| Ver avaliações de desempenho |      ✅       | Equipa |   Própria   |
| Gerir objetivos              |      ✅       | Equipa |  Próprios   |
| Aceder à 9-box               |      ✅       | Equipa |     ❌      |

## Questões em Aberto

| ID        | Questão                                                       | Prioridade |
| --------- | ------------------------------------------------------------- | ---------- |
| Q-TRN-001 | As avaliações de desempenho são 360 graus ou apenas top-down? | Alta       |
| Q-TRN-002 | Os OKRs são por colaborador, equipa ou empresa?               | Alta       |
| Q-TRN-003 | Existe integração com plataformas de e-learning (LMS)?        | Média      |

## Notas de Implementação

Implementado em P-019 (`backend/src/training/`), frontend em P-038.

- **Âmbito não implementado**: RF-TRN-003 (importação CSV de cursos/participantes), RF-TRN-005 (OKRs como entidade própria — `objectives_next` existe apenas como campo de texto livre em `PerformanceReview`) e RF-TRN-008 (inquéritos de satisfação) não foram implementados, consistente com Q-TRN-001..003 permanecerem por resolver.
- **`PerformanceReview.potential_rating`**: campo adicional (INT, 1–5) não listado na tabela de entidades da spec original, necessário para o eixo "Potencial" da matriz 9-box (a spec só documentava `overall_rating`).
- **Rotas reais**: `GET/POST /training/courses`, `POST /training/courses/:id/enroll`, `POST /training/enrollments/:id/complete`, `GET /training/records/:employeeId`, `GET/POST /training/reviews`, `PATCH /training/reviews/:id`, `POST /training/reviews/:id/submit`, `GET /training/nine-box`, `GET/POST /training/competencies`, `GET /training/competencies/matrix`, `POST /training/competencies/:employeeId/assess` (nova em P-038, ver abaixo).
- **Bug de backend corrigido em P-038** (decisão do utilizador): `TrainingController.ensureSelfOrAdmin()` verificava `req.user.role` (singular), mas o `JwtPayload` real usa `roles: string[]` (array) — `user.role` era sempre `undefined`, pelo que nenhum admin ou gestor conseguia inscrever outro colaborador (`POST /training/courses/:id/enroll`) nem ver o histórico de outro colaborador (`GET /training/records/:employeeId`); só o auto-serviço (`employeeId === user.sub`) funcionava. Renomeado para `ensureSelfOrPrivileged()`, corrigido para `user.roles.includes(RoleEnum.ADMIN) || user.roles.includes(RoleEnum.MANAGER)` — Gestor incluído porque a tabela de permissões já listava "Inscrever colaboradores: Gestor ✅" (não apenas Admin).
- **Gap de funcionalidade corrigido em P-038** (decisão do utilizador): não existia nenhum endpoint para atribuir/atualizar o nível de uma competência a um colaborador — só havia leitura (`GET /training/competencies`, `GET /training/competencies/matrix`). Adicionado `AssessCompetencyDto`, `TrainingService.assessCompetency()` (upsert por par colaborador/competência) e `POST /training/competencies/:employeeId/assess` (`@Roles(ADMIN, MANAGER)`), tornando a Matriz de Competências utilizável.
- **Gap conhecido, não corrigido nesta fase**: não existe nenhum endpoint para listar as inscrições (`CourseEnrollment`) em curso de um colaborador — apenas `TrainingRecord` (criado só quando `complete()` é chamado). O frontend não bloqueia a re-inscrição no cliente; o botão "Inscrever-me" fica sempre visível e o erro "já inscrito" devolvido pelo `TrainingService.enroll()` é apresentado tal e qual, em vez de o botão ficar desativado antecipadamente.

## Frontend (P-038)

- `frontend/src/pages/TrainingPage.tsx` (`/training`) — item "Formação" na sidebar, sem restrição de papel. Abas "Cursos" e "Meu Histórico" visíveis a todos; "Avaliações" e "9-Box" só admin/gestor (`@Roles(ADMIN, MANAGER)` dos respetivos endpoints); "Competências" visível a todos para a lista de definições, com secção "Matriz de Competências da Equipa" (incl. botão "Avaliar") só admin/gestor.
- "Cursos": tabela com botão "Inscrever-me" por linha (`POST /training/courses/:id/enroll` com o próprio `user.id`, convenção `Employee.id = User.id`); admin cria cursos via diálogo.
- "Meu Histórico": lista de `TrainingRecord` do próprio (`GET /training/records/:employeeId`), com pontuação e link de certificado quando existentes.
- "Avaliações": filtro por equipa, diálogo "Nova Avaliação" (admin/gestor, colaborador escolhido de `GET /employees`), ações "Editar"/"Submeter" só visíveis quando `review.status === draft` e `review.reviewerId === user.id` (espelha a validação já existente no `TrainingService`).
- "9-Box": grelha 3×3 (potencial × desempenho) construída em CSS puro a partir de `GET /training/nine-box?teamId=&reviewCycle=`, sem nova dependência de gráficos (mesma decisão de P032-01 para o Capacity).
- "Competências": tabela de definições + diálogo "Nova Competência" (admin); "Matriz de Competências da Equipa" com filtro de equipa e diálogo "Avaliar" (admin/gestor, `POST /training/competencies/:employeeId/assess`).
- 4 novos testes unitários em `training.service.spec.ts` para `assessCompetency()` (8/8 no ficheiro, 184/184 total, antes 180/180).
- `pnpm run lint` (0 erros) e `pnpm run build` (raiz) green; verificação em browser real via Playwright contra a stack Docker completa — criação de curso, auto-inscrição, criação de avaliação de desempenho (rascunho editável/submetível pelo próprio reviewer), criação de competência, avaliação de competência persistida corretamente, 0 erros de consola em todos os passos.

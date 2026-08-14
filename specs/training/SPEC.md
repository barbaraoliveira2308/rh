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

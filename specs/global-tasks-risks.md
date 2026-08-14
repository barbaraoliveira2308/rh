# Tarefas e Riscos Globais

## Tarefas

| ID    | Descrição                                                                                 | Estado    |
| ----- | ----------------------------------------------------------------------------------------- | --------- |
| T-011 | Módulo de Equipas (backend)                                                               | Concluido |
| T-012 | Módulo de Equipas (frontend)                                                              | Concluido |
| T-013 | Módulo de Utilizadores (backend)                                                          | Concluido |
| T-014 | Módulo de Utilizadores (frontend)                                                         | Concluido |
| T-015 | Módulo de Clientes (backend)                                                              | Concluido |
| T-016 | Módulo de Contratos (backend)                                                             | Concluido |
| T-017 | Configurar MinIO (armazenamento)                                                          | Concluido |
| T-018 | Gestão Documental (backend)                                                               | Concluido |
| T-019 | Módulo de Projetos (backend)                                                              | Concluido |
| T-020 | Módulo de Alocações (backend)                                                             | Concluido |
| T-022 | Módulo de Timesheets (backend)                                                            | Concluido |
| T-023 | Geração automática de folhas                                                              | Concluido |
| T-024 | Submissão e aprovação de folhas                                                           | Concluido |
| T-029 | Sincronização com ausências                                                               | Concluido |
| T-030 | CRUD Despesas por colaborador                                                             | Concluido |
| T-031 | Fluxo aprovação de Despesas                                                               | Concluido |
| T-032 | Deteção de duplicados                                                                     | Concluido |
| T-033 | Exportação Excel/CSV de despesas                                                          | Concluido |
| T-034 | Dashboard de Recursos (ocupação)                                                          | Concluido |
| T-035 | Dashboard Financeiro (margem consultor)                                                   | Concluido |
| T-036 | Configurar RabbitMQ/Kafka (mensagens)                                                     | Concluido |
| T-037 | Serviço de notificações por email                                                         | Concluido |
| T-038 | Notificações in-app                                                                       | Concluido |
| T-039 | Caixa de Entrada (Workflow Inbox)                                                         | Concluido |
| T-040 | Fluxos configuráveis multi-etapa                                                          | Concluido |
| T-021 | Calendário organizacional (visualização mensal)                                           | Concluido |
| T-041 | Importação automática de feriados                                                         | Concluido |
| T-043 | Motor de relatórios (PDF + Excel)                                                         | Concluido |
| T-044 | Filtros avançados em relatórios                                                           | Concluido |
| T-045 | Módulo GDPR — consentimentos                                                              | Concluido |
| T-046 | Pedidos de titulares (direitos RGPD)                                                      | Concluido |
| T-047 | Políticas de retenção e anonimização                                                      | Concluido |
| T-048 | Incidentes de segurança                                                                   | Concluido |
| T-049 | Relatórios de conformidade GDPR                                                           | Concluido |
| T-051 | Gestão de Cursos e Formações                                                              | Concluido |
| T-052 | Avaliações de Desempenho                                                                  | Concluido |
| T-053 | Gestão de Competências e 9-Box                                                            | Concluido |
| T-050 | Políticas Internas (backend)                                                              | Concluido |
| T-054 | Helpdesk Interno (backend)                                                                | Concluido |
| —     | Frontend setup (React, Tailwind, shadcn/ui, auth)                                         | Concluido |
| —     | UI módulos core (users, projects, timesheets, absences)                                   | Concluido |
| —     | UI dashboards financeiros (dashboard, inbox, financials, expenses)                        | Concluido |
| —     | Backend e2e tests (timesheets flow, absences flow, GDPR erasure)                          | Concluido |
| —     | Frontend Playwright e2e tests (login, timesheet, absence, upload)                         | Concluido |
| —     | CI workflow (lint, build, backend e2e, frontend e2e)                                      | Concluido |
| —     | Documentação final (Swagger, README, CONTRIBUTING, ARCHITECTURE)                          | Concluido |
| —     | Promoção specs Draft Policies (#17) e Helpdesk (#19) para Implemented; correção BR-HD-004 | Concluido |

## Riscos

| ID    | Risco   | Probabilidade | Impacto | Mitigação |
| ----- | ------- | ------------- | ------- | --------- |
| (n/a) | (vazio) |               |         |           |

## Ambiguidades

| ID      | Descrição                                                                                                                                         | Decisão                                                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P008-01 | Equipa pode ter colaboradores de departamentos diferentes?                                                                                        | Sim, sem restrição                                                                                                                                        |
| P009-01 | Contratos expirados: arquivamento automático ou ação manual?                                                                                      | Arquivamento automático no dia seguinte + alerta preventivo                                                                                               |
| P010-01 | Sobrealocação (>100%): bloquear, permitir com aviso ou notificar manager?                                                                         | Permitir com aviso (warning) + notificar manager                                                                                                          |
| P010-02 | Projeto closed pode ser reativado?                                                                                                                | Sim, admin pode reativar                                                                                                                                  |
| P011-01 | Submissão com entradas a 0h: válido ou obrigatório >0h?                                                                                           | 0h é válido como entrada preenchida                                                                                                                       |
| P027-02 | Helpdesk BR-HD-004: "não reabrir após 7 dias" — reabertura dentro de 7 dias estava por implementar (`update()` bloqueava sempre tickets fechados) | Implementar reabertura: `update()` permite reabrir ticket fechado há ≤7 dias (limpa `resolved_at`); rejeita fora da janela ou sem tentativa de reabertura |

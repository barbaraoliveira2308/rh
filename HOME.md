# HR Suite — Bridge351 · Wiki

> Página inicial da wiki do projeto. Ponto de entrada único para navegar toda a documentação — não duplica conteúdo, só aponta para a fonte de verdade de cada assunto.
>
> Se esta wiki for migrada para um repositório GitHub Wiki dedicado, este ficheiro corresponde a `Home.md` na raiz desse repositório.

## O que é o HR Suite

Plataforma de Gestão de Recursos Humanos — **NestJS + React 18 + TypeORM + PostgreSQL**, monorepo pnpm (`backend/`, `frontend/`, `shared/`). Cobre autenticação (com MFA), organograma, projetos/alocações, timesheets, ausências, despesas, workflow de aprovações, financeiro, helpdesk, políticas internas, GDPR, formação e auditoria — ver [README.md](README.md) para a visão geral completa e o quickstart de instalação.

## Começar aqui

| Preciso de...                                             | Ver                                                                  |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| Instalar e correr o projeto localmente                    | [README.md](README.md) — pré-requisitos, quickstart, troubleshooting |
| Perceber as regras de trabalho do agente de IA neste repo | [AGENTS.md](AGENTS.md)                                               |
| Retomar desenvolvimento numa nova sessão de agente        | [RESUME_PROMPT.md](RESUME_PROMPT.md)                                 |
| Contribuir (branches, commits, checklist de módulo novo)  | [CONTRIBUTING.md](CONTRIBUTING.md)                                   |
| Fazer deploy em servidor Ubuntu 24.04                     | [DEPLOY_UBUNTU.md](DEPLOY_UBUNTU.md)                                 |

## Estado do projeto

- **23/23 módulos** da spec implementados (backend + frontend) — ver índice completo abaixo.
- Histórico completo de fases, decisões e estado atual: [PROJECT_STATE.md](PROJECT_STATE.md) (fonte de verdade — o resumo em `RESUME_PROMPT.md` secção 2 pode estar desatualizado face a este ficheiro).
- Tarefas, riscos e ambiguidades já resolvidas ou em aberto: [specs/GLOBAL-TASKS-RISKS.md](specs/GLOBAL-TASKS-RISKS.md).
- Auditoria completa spec-vs-código (2026-08-16): [AUDIT_REPORT_2026-08-16.md](AUDIT_REPORT_2026-08-16.md) — processo documentado em [docs/AUDIT_PROCESS.md](docs/AUDIT_PROCESS.md).
- Instância de demo populada (`pnpm run seed:demo`): ver secção "Dados de Demo" do [README.md](README.md).

## Arquitetura

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — diagramas Mermaid, decisões de arquitetura (ADRs).

## Especificações por módulo

Cada módulo tem uma spec técnica (SDD) própria em `specs/<MÓDULO>.md`. Índice completo com estado (`Implemented`/`Draft`) e histórico de versões: [specs/README.md](specs/README.md).

| #   | Módulo                      | Spec                                             |
| --- | --------------------------- | ------------------------------------------------ |
| 01  | Autenticação & Segurança    | [specs/AUTH.md](specs/AUTH.md)                   |
| 02  | Utilizadores & RBAC         | [specs/USERS.md](specs/USERS.md)                 |
| 03  | Equipas & Organograma       | [specs/TEAMS.md](specs/TEAMS.md)                 |
| 04  | Clientes                    | [specs/CLIENTS.md](specs/CLIENTS.md)             |
| 05  | Projetos                    | [specs/PROJECTS.md](specs/PROJECTS.md)           |
| 06  | Capacidade & Alocação       | [specs/CAPACITY.md](specs/CAPACITY.md)           |
| 07  | Assiduidade & Timesheets    | [specs/TIMESHEETS.md](specs/TIMESHEETS.md)       |
| 08  | Ausências                   | [specs/ABSENCES.md](specs/ABSENCES.md)           |
| 09  | Despesas & Reembolsos       | [specs/EXPENSES.md](specs/EXPENSES.md)           |
| 10  | Gestão Documental           | [specs/DOCUMENTS.md](specs/DOCUMENTS.md)         |
| 11  | Contratos                   | [specs/CONTRACTS.md](specs/CONTRACTS.md)         |
| 12  | Workflow & Caixa de Entrada | [specs/WORKFLOW.md](specs/WORKFLOW.md)           |
| 13  | Calendário Organizacional   | [specs/CALENDAR.md](specs/CALENDAR.md)           |
| 14  | Relatórios                  | [specs/REPORTS.md](specs/REPORTS.md)             |
| 15  | Dashboard de Recursos       | [specs/DASHBOARD.md](specs/DASHBOARD.md)         |
| 16  | Dashboard Financeiro        | [specs/FINANCIALS.md](specs/FINANCIALS.md)       |
| 17  | Políticas Internas          | [specs/POLICIES.md](specs/POLICIES.md)           |
| 18  | Formação & Talento          | [specs/TRAINING.md](specs/TRAINING.md)           |
| 19  | Helpdesk Interno            | [specs/HELPDESK.md](specs/HELPDESK.md)           |
| 20  | Notificações & Alertas      | [specs/NOTIFICATIONS.md](specs/NOTIFICATIONS.md) |
| 21  | Auditoria                   | [specs/AUDIT.md](specs/AUDIT.md)                 |
| 22  | GDPR & Conformidade         | [specs/GDPR.md](specs/GDPR.md)                   |
| 23  | Administração do Sistema    | [specs/ADMIN.md](specs/ADMIN.md)                 |

## Manutenção desta página

Esta página deve ser atualizada quando surgirem novos documentos de topo (`*.md` na raiz) ou novos módulos em `specs/`. Não repetir aqui conteúdo que já vive noutro ficheiro — apenas ligar.

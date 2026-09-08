# HR Suite — Bridge351 · Wiki

> Página inicial da wiki do projeto. Ponto de entrada único para navegar toda a documentação — não duplica conteúdo, só aponta para a fonte de verdade de cada assunto.
>
> Se esta wiki for migrada para um repositório GitHub Wiki dedicado, este ficheiro corresponde a `Home.md` na raiz desse repositório.

## O que é o HR Suite

Plataforma de Gestão de Recursos Humanos — **NestJS + React 18 + TypeORM + PostgreSQL**, monorepo pnpm (`backend/`, `frontend/`, `shared/`). Cobre autenticação/SSO, organograma, projetos/alocações, timesheets, ausências, despesas, workflow de aprovações, financeiro, helpdesk, políticas internas, GDPR, formação e auditoria — ver [README.md](README.md) para a visão geral completa e o quickstart de instalação.

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

Cada módulo tem uma spec técnica (SDD) própria em `specs/<módulo>/SPEC.md`. Índice completo com estado (`Implemented`/`Draft`) e histórico de versões: [specs/README.md](specs/README.md).

| #   | Módulo                      | Spec                                                       |
| --- | --------------------------- | ---------------------------------------------------------- |
| 01  | Autenticação & Segurança    | [specs/auth/SPEC.md](specs/auth/SPEC.md)                   |
| 02  | Utilizadores & RBAC         | [specs/users/SPEC.md](specs/users/SPEC.md)                 |
| 03  | Equipas & Organograma       | [specs/teams/SPEC.md](specs/teams/SPEC.md)                 |
| 04  | Clientes                    | [specs/clients/SPEC.md](specs/clients/SPEC.md)             |
| 05  | Projetos                    | [specs/projects/SPEC.md](specs/projects/SPEC.md)           |
| 06  | Capacidade & Alocação       | [specs/capacity/SPEC.md](specs/capacity/SPEC.md)           |
| 07  | Assiduidade & Timesheets    | [specs/timesheets/SPEC.md](specs/timesheets/SPEC.md)       |
| 08  | Ausências                   | [specs/absences/SPEC.md](specs/absences/SPEC.md)           |
| 09  | Despesas & Reembolsos       | [specs/expenses/SPEC.md](specs/expenses/SPEC.md)           |
| 10  | Gestão Documental           | [specs/documents/SPEC.md](specs/documents/SPEC.md)         |
| 11  | Contratos                   | [specs/contracts/SPEC.md](specs/contracts/SPEC.md)         |
| 12  | Workflow & Caixa de Entrada | [specs/workflow/SPEC.md](specs/workflow/SPEC.md)           |
| 13  | Calendário Organizacional   | [specs/calendar/SPEC.md](specs/calendar/SPEC.md)           |
| 14  | Relatórios                  | [specs/reports/SPEC.md](specs/reports/SPEC.md)             |
| 15  | Dashboard de Recursos       | [specs/dashboard/SPEC.md](specs/dashboard/SPEC.md)         |
| 16  | Dashboard Financeiro        | [specs/financials/SPEC.md](specs/financials/SPEC.md)       |
| 17  | Políticas Internas          | [specs/policies/SPEC.md](specs/policies/SPEC.md)           |
| 18  | Formação & Talento          | [specs/training/SPEC.md](specs/training/SPEC.md)           |
| 19  | Helpdesk Interno            | [specs/helpdesk/SPEC.md](specs/helpdesk/SPEC.md)           |
| 20  | Notificações & Alertas      | [specs/notifications/SPEC.md](specs/notifications/SPEC.md) |
| 21  | Auditoria                   | [specs/audit/SPEC.md](specs/audit/SPEC.md)                 |
| 22  | GDPR & Conformidade         | [specs/gdpr/SPEC.md](specs/gdpr/SPEC.md)                   |
| 23  | Administração do Sistema    | [specs/admin/SPEC.md](specs/admin/SPEC.md)                 |

## Manutenção desta página

Esta página deve ser atualizada quando surgirem novos documentos de topo (`*.md` na raiz) ou novos módulos em `specs/`. Não repetir aqui conteúdo que já vive noutro ficheiro — apenas ligar.

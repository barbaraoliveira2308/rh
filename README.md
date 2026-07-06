# Sistema de Gestão de Recursos Humanos — Especificações Técnicas (SDD)

> **Versão:** 1.0  
> **Produzido por:** Software Architect / Technical Product Manager  
> **Metodologia:** Spec-Driven Development (SDD)  
> **Data:** 2026  
> **Estado:** Draft para revisão

---

## Ambiente de Execução

> ⚠️ **Todo o ambiente deve ser executado em Docker.**  
> Não instalar dependências directamente no sistema operativo anfitrião.  
> Utilizar `docker compose up` para iniciar todos os serviços (base de dados, cache, storage, backend, frontend).  
> Consultar `infra/docker-compose.dev.yml` para o ambiente de desenvolvimento e `infra/docker-compose.prod.yml` para produção.

---

## Índice de Módulos

| # | Módulo | Pasta | Estado |
|---|--------|-------|--------|
| 01 | Autenticação & Segurança | `specs/auth/spec.md` | Draft |
| 02 | Utilizadores & RBAC | `specs/users/spec.md` | Draft |
| 03 | Equipas & Organograma | `specs/teams/spec.md` | Draft |
| 04 | Clientes | `specs/clients/spec.md` | Draft |
| 05 | Projetos | `specs/projects/spec.md` | Draft |
| 06 | Capacidade & Alocação | `specs/capacity/spec.md` | Draft |
| 07 | Assiduidade & Timesheets | `specs/timesheets/spec.md` | Draft |
| 08 | Ausências | `specs/absences/spec.md` | Draft |
| 09 | Despesas & Reembolsos | `specs/expenses/spec.md` | Draft |
| 10 | Gestão Documental | `specs/documents/spec.md` | Draft |
| 11 | Contratos | `specs/contracts/spec.md` | Draft |
| 12 | Workflow & Caixa de Entrada | `specs/workflow/spec.md` | Draft |
| 13 | Calendário Organizacional | `specs/calendar/spec.md` | Draft |
| 14 | Relatórios | `specs/reports/spec.md` | Draft |
| 15 | Dashboard de Recursos | `specs/dashboard/spec.md` | Draft |
| 16 | Dashboard Financeiro | `specs/financials/spec.md` | Draft |
| 17 | Políticas Internas | `specs/policies/spec.md` | Draft |
| 18 | Formação & Talento | `specs/training/spec.md` | Draft |
| 19 | Helpdesk Interno | `specs/helpdesk/spec.md` | Draft |
| 20 | Notificações & Alertas | `specs/notifications/spec.md` | Draft |
| 21 | Auditoria | `specs/audit/spec.md` | Draft |
| 22 | GDPR & Conformidade | `specs/gdpr/spec.md` | Draft |
| 23 | Administração do Sistema | `specs/admin/spec.md` | Draft |

---

## Roadmap Técnico de Implementação

### Fase 1 — Fundação (Semanas 1–6)
- Autenticação & Segurança
- Utilizadores & RBAC
- Administração do Sistema
- Auditoria

### Fase 2 — Estrutura Organizacional (Semanas 7–10)
- Equipas & Organograma
- Clientes
- Contratos

### Fase 3 — Core Operacional (Semanas 11–18)
- Projetos
- Capacidade & Alocação
- Assiduidade & Timesheets
- Ausências

### Fase 4 — Processos Financeiros (Semanas 19–24)
- Despesas & Reembolsos
- Dashboard Financeiro
- Dashboard de Recursos

### Fase 5 — Comunicação & Documentação (Semanas 25–28)
- Gestão Documental
- Workflow & Caixa de Entrada
- Calendário Organizacional
- Notificações & Alertas

### Fase 6 — Reporting & Analytics (Semanas 29–32)
- Relatórios
- GDPR & Conformidade

### Fase 7 — Conhecimento & Talento (Semanas 33–38)
- Políticas Internas
- Formação & Talento
- Helpdesk Interno

---

## Dependências entre Módulos

```
Autenticação ← Todos os módulos
Utilizadores ← Equipas, Projetos, Contratos, Ausências, Timesheets, Despesas
Equipas ← Projetos, Capacidade, Calendário
Clientes ← Projetos
Projetos ← Capacidade, Timesheets, Despesas, Documentos
Contratos ← Utilizadores, Documentos
Ausências ← Workflow, Calendário, Notificações
Timesheets ← Projetos, Workflow, Notificações
Despesas ← Projetos, Workflow
Workflow ← Notificações, Auditoria
GDPR ← Auditoria, Utilizadores, Documentos
Dashboard Financeiro ← Projetos, Timesheets, Despesas, Contratos
```

---

## Questões em Aberto Globais

| ID | Questão | Módulo | Prioridade |
|----|---------|--------|------------|
| Q-G-001 | Qual o número esperado de utilizadores simultâneos? | Infra | Alta |
| Q-G-002 | Existe multi-tenant (múltiplas empresas na mesma instância)? | Arch | Alta |
| Q-G-003 | Que idiomas devem ser suportados na v1? | i18n | Alta |
| Q-G-004 | Existe integração com payroll na v1 ou é futura? | Integrações | Alta |
| Q-G-005 | "Bridge351" e "NIVVOS" são entidades legais distintas no sistema? | Admin | Alta |
| Q-G-006 | Qual a estratégia de migração de dados existentes? | Dados | Alta |
| Q-G-007 | Existe SLA definido para fluxos de aprovação? | Workflow | Média |
| Q-G-008 | Os tarifários por cargo são visíveis a todos ou apenas a Admin? | Financeiro | Média |
| Q-G-009 | A assinatura digital de contratos é na v1 ou futura? | Contratos | Média |
| Q-G-010 | Qual o período legal de retenção de dados em Portugal? | GDPR | Alta |

---

## Histórico de Alterações

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026 | Versão inicial — 23 módulos, 54 tasks, 10 questões em aberto |
| 1.1 | 2026-06-29 | Caminhos de specs actualizados para `specs/[módulo]/spec.md`; data corrigida para 2026; adicionada secção de Ambiente Docker; criado Roteiro OpenCode (OPENCODE-PLAYBOOK.md) |

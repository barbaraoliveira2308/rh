# Módulo 14 — Relatórios

## Objetivo
Gerar relatórios operacionais exportáveis sobre férias, ocupação, horas trabalhadas, ausências, reembolsos e contratos.

## Relatórios Disponíveis

| ID | Nome | Filtros | Formato |
|----|------|---------|---------|
| REP-001 | Férias por colaborador | Período, Colaborador | PDF, Excel |
| REP-002 | Férias por equipa | Período, Equipa | PDF, Excel |
| REP-003 | Taxa de ocupação individual | Período, Colaborador | PDF, Excel |
| REP-004 | Taxa de ocupação por equipa | Período, Equipa | PDF, Excel |
| REP-005 | Horas trabalhadas | Período, Colaborador, Projeto | PDF, Excel |
| REP-006 | Ausências | Período, Tipo, Colaborador | PDF, Excel |
| REP-007 | Reembolsos | Período, Estado, Colaborador | PDF, Excel |
| REP-008 | Contratos próximos da expiração | N dias, Tipo | PDF, Excel |

## Requisitos Funcionais

| ID | Descrição |
|----|-----------|
| RF-REP-001 | Os relatórios devem ser exportáveis em PDF e Excel. |
| RF-REP-002 | Os relatórios devem suportar filtros por período, equipa, colaborador e projeto. |
| RF-REP-003 | O sistema deve suportar geração assíncrona de relatórios grandes. |
| RF-REP-004 | O sistema deve notificar quando relatório assíncrono está pronto. |

## Permissões

| Relatório | Administrador | Gestor | Colaborador |
|-----------|:---:|:---:|:---:|
| Todos os relatórios globais | ✅ | ❌ | ❌ |
| Relatórios da equipa | ✅ | ✅ | ❌ |
| Próprios dados | ✅ | ✅ | ✅ |

## APIs

- GET /api/v1/reports/:type/generate
  - Query: filtros específicos por tipo
  - Retorna: job_id (assíncrono) ou ficheiro direto (síncrono para pequenos)
- GET /api/v1/reports/jobs/:job_id (estado da geração)
- GET /api/v1/reports/jobs/:job_id/download

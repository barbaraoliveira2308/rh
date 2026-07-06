# Módulo 21 — Auditoria

## Objetivo
Manter registo imutável de todas as operações realizadas no sistema, garantindo rastreabilidade, conformidade GDPR e suporte a análise forense.

## Entidades

### AuditLog
| Campo | Tipo | Validação | Notas |
|-------|------|-----------|-------|
| id | UUID | PK | — |
| user_id | UUID | FK User, Nullable | Null para processos automáticos |
| action | VARCHAR(100) | Obrigatório | ex: "employee.update" |
| entity_type | VARCHAR(100) | Obrigatório | ex: "Employee" |
| entity_id | UUID | Obrigatório | — |
| old_values | JSONB | Nullable | Estado anterior |
| new_values | JSONB | Nullable | Estado novo |
| ip_address | VARCHAR(45) | Nullable | — |
| user_agent | TEXT | Nullable | — |
| timestamp | TIMESTAMP | Obrigatório | Imutável |
| correlation_id | UUID | Nullable | Agrupamento de operações |
| module | VARCHAR(50) | Obrigatório | Módulo de origem |

## Regras de Negócio

| ID | Regra |
|----|-------|
| BR-AUD-001 | Logs de auditoria são imutáveis — sem update ou delete. |
| BR-AUD-002 | Todos os campos sensíveis (NIF, IBAN, password) são mascarados nos logs. |
| BR-AUD-003 | Logs de auditoria devem ser mantidos por mínimo 1 ano (recomendado 3 anos). |
| BR-AUD-004 | Logs devem ser indexados por user_id, entity_type, entity_id e timestamp. |
| BR-AUD-005 | Logs de acesso a dados pessoais são rastreados com detalhe (req. GDPR). |

## Eventos Auditados (Mínimo)

| Módulo | Eventos |
|--------|---------|
| Auth | Login, Logout, LoginFailed, PasswordChanged, MFAEnabled |
| Utilizadores | Created, Updated, Deactivated, PermissionChanged |
| Contratos | Created, Updated, Terminated |
| Ausências | Requested, Approved, Rejected, Cancelled |
| Timesheets | Submitted, Approved, Rejected |
| Despesas | Submitted, Approved, Rejected, Paid |
| GDPR | DataExported, DataAnonymized, ConsentChanged |
| Admin | ConfigChanged, UserCreated, RoleChanged |

## Requisitos Funcionais

| ID | Descrição |
|----|-----------|
| RF-AUD-001 | O sistema deve registar todas as operações CRUD em entidades críticas. |
| RF-AUD-002 | O sistema deve registar o estado anterior e posterior em alterações. |
| RF-AUD-003 | O sistema deve registar utilizador, IP, timestamp e entidade afetada. |
| RF-AUD-004 | O sistema deve suportar exportação de logs para análise forense. |
| RF-AUD-005 | O sistema deve implementar pesquisa e filtragem de logs de auditoria. |
| RF-AUD-006 | O sistema deve gerar alertas para acessos suspeitos. |

## APIs

- GET /api/v1/audit-logs (Admin only)
  - Query: entity_type, entity_id, user_id, action, start_date, end_date
- GET /api/v1/audit-logs/export (CSV/JSON)

## Permissões

| Ação | Administrador | Gestor | Aprovador | Colaborador |
|------|:---:|:---:|:---:|:---:|
| Ver logs de auditoria | ✅ | ❌ | ❌ | ❌ |
| Exportar logs | ✅ | ❌ | ❌ | ❌ |
| Configurar alertas de auditoria | ✅ | ❌ | ❌ | ❌ |

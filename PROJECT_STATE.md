# Project State

**Current Phase:** P-012 Absences (90% complete)
**Last Updated:** 2026-07-08

## Phase History

| Fase  | Passo | Data       | Descrição                                                           |
| ----- | ----- | ---------- | ------------------------------------------------------------------- |
| P-011 | 00-09 | 2026-07-08 | Timesheets module (entities, service, controller, tests, migration) |
| P-012 | 00-01 | 2026-07-08 | Absences module foundation                                          |
| P-012 | 00-02 | 2026-07-08 | Unit tests for approve(), reject(), cancel(), getLeaveBalance()     |

## Decisions

| ID      | Valor                          | Impacto                                        |
| ------- | ------------------------------ | ---------------------------------------------- |
| P011-01 | 0h completed entry is valid    | Allows zero-hour entries in timesheets         |
| P012-01 | Leave balance in business days | Balance calculation excludes weekends/holidays |

## Current State

### Completed

- P-011: Timesheets module (entities, service, controller, tests, migration, lint clean)
- P-012: Absences module structure (entities, events, DTOs, seed, service, controller, module, migration)
- P-012: Absences controller with all endpoints (findAll, create, findOne, approve, reject, cancel, uploadDocument, getBalance, getCalendar)
- P-012: Absences module registered in AppModule
- P-012: Migration with all absence tables (absence_types, absence_requests, absence_approvals, leave_balances)
- P-012: 9 unit tests passing for create() covering all validation scenarios
- P-012: 16 unit tests passing for approve(), reject(), cancel(), getLeaveBalance() covering success, validation, and balance update scenarios
- P-012: Lint clean on all absences files
- P-012: TypeScript compilation clean on absences files

### Remaining

- P-012: Integration/e2e tests (ficheiro `test/absences.e2e-spec.ts` criado com 16 cenários; necessita PostgreSQL a correr em localhost:5432)
- P-012: Update spec documentation

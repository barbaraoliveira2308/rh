# Project State

**Current Phase:** P-012 Absences (100% complete)
**Last Updated:** 2026-07-08

## Phase History

| Fase  | Passo | Data       | Descrição                                                                                                                                    |
| ----- | ----- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| P-011 | 00-09 | 2026-07-08 | Timesheets module (entities, service, controller, tests, migration)                                                                          |
| P-012 | 00-01 | 2026-07-08 | Absences module foundation                                                                                                                   |
| P-012 | 00-02 | 2026-07-08 | Unit tests for approve(), reject(), cancel(), getLeaveBalance()                                                                              |
| P-012 | 00-03 | 2026-07-08 | Integration/e2e tests passing (24 tests) after fixing cross-module compilation/DI issues                                                     |
| P-012 | 00-04 | 2026-07-08 | Updated spec documentation (specs/absences/spec.md and specs/README.md)                                                                      |
| P-012 | 00-05 | 2026-07-08 | Fixed unit test failures in Projects and Timesheets modules                                                                                  |
| P-012 | 00-06 | 2026-07-08 | Fixed all pre-existing backend lint errors and warnings                                                                                      |
| P-012 | 00-07 | 2026-07-08 | Updated specs of all implemented previous modules (auth, audit, users, teams, clients, contracts, documents, projects, timesheets, absences) |
| P-012 | 00-08 | 2026-07-08 | Added e2e tests for Projects and Timesheets; fixed decimal transformer and route order issues uncovered by tests                             |

## Decisions

| ID      | Valor                                                 | Impacto                                                                        |
| ------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| P011-01 | 0h completed entry is valid                           | Allows zero-hour entries in timesheets                                         |
| P012-01 | Leave balance in business days                        | Balance calculation excludes weekends/holidays                                 |
| P012-02 | AuthModule and RbacModule are @Global                 | Guards (JwtAuthGuard/RolesGuard) resolve in all feature modules                |
| P012-03 | Decimal columns use numeric transformer               | LeaveBalance/AbsenceRequest decimal fields return JS numbers                   |
| P012-04 | e2e tests run with --runInBand and MFA key            | Sequential execution and required env var for EncryptionService                |
| P012-05 | dotenv added as runtime dependency                    | Existing data-source/runner imports now satisfied; tests can bootstrap         |
| P012-06 | Numeric transformer on TimesheetPeriod/TimesheetEntry | Decimal fields return JS numbers instead of strings; avoids concatenation bugs |
| P012-07 | Timesheets export route before :id route              | Prevents `/timesheets/export` being matched as a period id                     |
| P012-08 | Allow allocation in draft projects                    | Enables natural draft → allocate → activate workflow                           |

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
- P-012: Integration/e2e tests passing (47 tests across auth, absences, projects and timesheets)
- P-012: dotenv runtime dependency added to satisfy existing imports
- P-012: Spec documentation updated (`specs/absences/spec.md` and `specs/README.md`)
- P-012: Unit test failures fixed in previous modules (`projects.service.spec.ts` / `projects.service.ts`, `timesheets.service.spec.ts`)
- P-012: All pre-existing backend lint errors/warnings fixed; `pnpm run lint` now green across shared, backend and frontend
- P-012: Specs of all implemented previous modules updated with implementation notes (`specs/auth/spec.md`, `specs/audit/spec.md`, `specs/users/spec.md`, `specs/teams/spec.md`, `specs/clients/spec.md`, `specs/contracts/spec.md`, `specs/documents/spec.md`, `specs/projects/spec.md`, `specs/timesheets/spec.md`, `specs/absences/spec.md`)
- P-012: e2e tests added for Projects (`test/projects.e2e-spec.ts`, 11 tests) and Timesheets (`test/timesheets.e2e-spec.ts`, 12 tests)
- P-012: Numeric transformer added to TimesheetPeriod/TimesheetEntry decimal columns to fix DB string/number conversion
- P-012: TimesheetsController route order fixed so `GET /timesheets/export` is resolved before `GET /timesheets/:id`
- P-012: ProjectsService draft-allocation restriction removed to allow natural draft → allocate → activate flow

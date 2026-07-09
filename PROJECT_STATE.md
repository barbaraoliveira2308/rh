# Project State

**Current Phase:** P-017 Reports (100% complete)
**Last Updated:** 2026-07-09

## Phase History

| Fase  | Passo | Data       | Descrição                                                                                                                                                                                                |
| ----- | ----- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-011 | 00-09 | 2026-07-08 | Timesheets module (entities, service, controller, tests, migration)                                                                                                                                      |
| P-012 | 00-01 | 2026-07-08 | Absences module foundation                                                                                                                                                                               |
| P-012 | 00-02 | 2026-07-08 | Unit tests for approve(), reject(), cancel(), getLeaveBalance()                                                                                                                                          |
| P-012 | 00-03 | 2026-07-08 | Integration/e2e tests passing (24 tests) after fixing cross-module compilation/DI issues                                                                                                                 |
| P-012 | 00-04 | 2026-07-08 | Updated spec documentation (specs/absences/spec.md and specs/README.md)                                                                                                                                  |
| P-012 | 00-05 | 2026-07-08 | Fixed unit test failures in Projects and Timesheets modules                                                                                                                                              |
| P-012 | 00-06 | 2026-07-08 | Fixed all pre-existing backend lint errors and warnings                                                                                                                                                  |
| P-012 | 00-07 | 2026-07-08 | Updated specs of all implemented previous modules (auth, audit, users, teams, clients, contracts, documents, projects, timesheets, absences)                                                             |
| P-012 | 00-08 | 2026-07-08 | Added e2e tests for Projects and Timesheets; fixed decimal transformer and route order issues uncovered by tests                                                                                         |
| P-013 | 00-01 | 2026-07-08 | Expenses module: entities, service, controller, DTOs, events, seed, migration, unit tests for detectDuplicates, exceljs dependency                                                                       |
| P-014 | 00-01 | 2026-07-08 | Analytics module: resource and financial dashboards, Redis cache decorator, monthly_cost field on Contract, ioredis dependency, basic unit tests                                                         |
| P-015 | 00-01 | 2026-07-08 | Notifications & Workflow modules: entities, @OnEvent handlers, email/in-app notifications, Handlebars templates, inbox/proxy endpoints, nodemailer/handlebars dependencies, basic unit tests             |
| P-016 | 00-01 | 2026-07-09 | Calendar module: PublicHoliday, CompanyEvent, BlockedPeriod entities, PT holiday import via date.nager.at, monthly view, cron job, integration with Timesheets/Absences for blocked periods, basic tests |
| P-017 | 00-01 | 2026-07-09 | Reports module: ScheduledReport/ReportJob entities, 8 operational reports, JSON/XLSX/PDF export, scheduled reports with cron, async RabbitMQ processing for large reports, endpoints, migration, tests   |

## Decisions

| ID      | Valor                                                  | Impacto                                                                        |
| ------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| P011-01 | 0h completed entry is valid                            | Allows zero-hour entries in timesheets                                         |
| P012-01 | Leave balance in business days                         | Balance calculation excludes weekends/holidays                                 |
| P012-02 | AuthModule and RbacModule are @Global                  | Guards (JwtAuthGuard/RolesGuard) resolve in all feature modules                |
| P012-03 | Decimal columns use numeric transformer                | LeaveBalance/AbsenceRequest decimal fields return JS numbers                   |
| P012-04 | e2e tests run with --runInBand and MFA key             | Sequential execution and required env var for EncryptionService                |
| P012-05 | dotenv added as runtime dependency                     | Existing data-source/runner imports now satisfied; tests can bootstrap         |
| P012-06 | Numeric transformer on TimesheetPeriod/TimesheetEntry  | Decimal fields return JS numbers instead of strings; avoids concatenation bugs |
| P012-07 | Timesheets export route before :id route               | Prevents `/timesheets/export` being matched as a period id                     |
| P012-08 | Allow allocation in draft projects                     | Enables natural draft → allocate → activate workflow                           |
| P013-01 | Expense category limit applies per report              | BR-EXP-002 validates each item against category limit within the same report   |
| P014-01 | Consultant margin uses active contract in period       | getConsultantMargin() selects the active Contract at the calculation period    |
| P014-02 | Add monthly_cost field to Contract entity              | New nullable decimal column supports hourly cost calculation                   |
| P014-03 | Use Redis for AnalyticsService cache                   | RedisCacheService + @CacheResult decorator with 5-minute TTL                   |
| P015-01 | In-app notifications use polling (60s)                 | Frontend polls GET /notifications instead of WebSocket/SSE                     |
| P016-01 | BlockedPeriod blocks absences and timesheets           | Validation applied in both AbsencesService and TimesheetsService               |
| P016-02 | Skip Bridge351/NIVVOS anniversary in this phase        | Treated as generic CompanyEvent created manually by admin                      |
| P017-01 | Async report processing uses RabbitMQ                  | Reports >1000 rows return 202 and are processed via report_jobs queue          |
| P017-02 | PDF generation uses pdfmake server-side with VFS fonts | Roboto fonts extracted to /tmp on first PDF generation; no extra system deps   |

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
- P-013: Expenses module entities (`ExpenseCategory`, `ExpenseReport`, `ExpenseItem`, `ExpenseApproval`) with TypeORM decorators and numeric transformer
- P-013: `ExpensesService` with `createReport`, `addItem`, `submit`, `approve`, `reject`, `detectDuplicates`, `exportToExcel`, `findAll`, `findOne`, `findCategories`, `createCategory`
- P-013: `ExpensesController` with endpoints `/expenses` (GET/POST), `/expenses/:id`, `/expenses/:id/items`, `/expenses/:id/submit`, `/expenses/:id/approve`, `/expenses/:id/reject`, `/expenses/export`, `/expenses/categories` (GET/POST)
- P-013: Seed of 8 default expense categories (`Alimentação`, `Transporte`, `Alojamento`, `Material de Escritório`, `Tecnologia`, `Formação`, `Entretenimento`, `Outros`)
- P-013: Migration `CreateExpensesTables1820000000000` creating `expense_categories`, `expense_reports`, `expense_items`, `expense_approvals` with indexes and foreign keys
- P-013: 10 unit tests passing for `detectDuplicates()` covering exact match, ±5% margin, date window, category mismatch, employee isolation, self-exclusion and multiple items
- P-013: `exceljs` added as runtime dependency for Excel export
- P-013: `specs/README.md` updated with P-013 entry; `specs/global-tasks-risks.md` and `global-tasks-risks.md` mark T-030, T-031, T-032, T-033 as completed
- P-014: Analytics module (`AnalyticsService`, `AnalyticsController`, `AnalyticsModule`) with resource dashboards (occupancy, unallocated, forecast) and financial dashboards (margins, profitability, revenue, top-projects)
- P-014: Endpoints `/analytics/resources/occupancy`, `/analytics/resources/unallocated`, `/analytics/resources/forecast`, `/analytics/financials/margins`, `/analytics/financials/project/:id/profitability`, `/analytics/financials/revenue`, `/analytics/financials/top-projects` with `?format=json|csv`
- P-014: `RedisCacheService` using `ioredis` and custom `@CacheResult(ttl)` decorator with 5-minute TTL applied to all `AnalyticsService` methods
- P-014: `monthly_cost` column added to `contracts` table via migration `AddMonthlyCostToContracts1821000000000`; `Contract` entity updated
- P-014: `ioredis` added as runtime dependency and `@types/ioredis` as dev dependency
- P-014: Basic unit tests for `AnalyticsService` (unallocated employees and null margin when contract has no monthly cost)
- P-014: `specs/README.md` updated with P-014 entry; `specs/global-tasks-risks.md` and `global-tasks-risks.md` mark T-034 and T-035 as completed
- P-017: Reports module entities (`ScheduledReport`, `ReportJob`) with TypeORM decorators
- P-017: `ReportsService` with 8 operational reports (timesheets, absences, expenses, project hours, team occupancy, margins, contracts expiring, audit)
- P-017: `ReportExportersService` generating XLSX with bold headers and zebra striping, and PDF with pdfmake
- P-017: `ScheduledReportsService` with CRUD of scheduled reports and cron job to run due schedules
- P-017: `ReportsRabbitmqService` and `ReportsConsumerService` for async report processing via RabbitMQ
- P-017: `ReportsController` with all endpoints (`/reports/*`, `/reports/jobs/:jobId`, `/reports/schedules`) and `Content-Disposition: attachment` for downloads
- P-017: Async threshold (>1000 rows) returns 202 Accepted with `jobId`; `GET /reports/jobs/:jobId` for status
- P-017: Migration `CreateReportsTables1825000000000` creating `scheduled_reports` and `report_jobs` with enums and indexes
- P-017: Dependencies `amqplib`, `pdfmake` and `@types/amqplib`, `@types/pdfmake` added
- P-017: Basic unit tests for `ReportsService` (createJob, columns, async threshold) and `ReportExportersService` (xlsx, pdf)
- P-017: `specs/README.md` updated with P-017 entry; `specs/global-tasks-risks.md` and `global-tasks-risks.md` mark T-043 and T-044 as completed
- P-017: Backend lint clean and all 92 unit tests passing

# Prompt de Retoma — HR Suite (Bridge351)

> Cola este ficheiro completo como primeira mensagem numa nova sessão de agente de IA para retomar o desenvolvimento deste projeto. Não avances para implementação sem completar os passos 1 e 4 abaixo.

## 1. Leitura obrigatória, por esta ordem

1. `AGENTS.md` — regras globais. Aplicam-se sem exceção a partir daqui.
2. `PROJECT_STATE.md` — histórico completo de fases, decisões tomadas e estado atual. É a fonte de verdade; o resumo na secção 2 pode estar desatualizado.
3. `specs/README.md` — índice de módulos e estado de cada um (`Implemented` / `Draft`).
4. `specs/GLOBAL-TASKS-RISKS.md` — tarefas, riscos e ambiguidades já resolvidas (para não repetir perguntas já respondidas).
5. Se o trabalho tocar arquitetura, segurança ou conformidade: `docs/ARCHITECTURE.md` e `docs/AUDIT_PROCESS.md`.

## 2. Estado atual (resumo — confirmar sempre contra o `PROJECT_STATE.md`)

- Stack: NestJS + React 18 + TypeORM + PostgreSQL, monorepo pnpm (`backend/`, `frontend/`, `shared/`).
- Última fase concluída: **P-046** (correção de `R-039` — bypass de admin quebrado em `validateApprover()` de Absences/Timesheets/Expenses, ver abaixo). Toca código de produção em Absences, Timesheets, Expenses e RBAC.
- **23 dos 23 módulos** da spec (`specs/README.md`) `Implemented` no backend — nenhum módulo em `Draft`.
- **Todos os 23 módulos têm frontend próprio** — Notificações (P-041) foi o último em falta.
- Settings (`SystemSetting`) e `LegalEntity` (módulo Admin, P-029) são apenas armazenados via CRUD — nenhum módulo existente os lê em runtime (decisão P029-01).
- Frontend com UI própria para: auth, users/org-chart, projects/allocations, timesheets, absences, expenses, dashboard, financial dashboard, workflow inbox, admin/settings (P-031), capacity (P-032), helpdesk (P-034), calendar (P-036), policies (P-037), training (P-038), reports (P-039), gdpr (P-040), notifications (P-041).
- Testes e2e (backend Jest + frontend Playwright) e CI (`ci.yml`) a correr verdes; **316/316 testes unitários do backend a passar (0 falhas)**.
- **Docker funciona nesta sandbox** — fluxo de arranque: `cp .env.example .env` + `scripts/generate-secrets.sh`, `docker compose -f infra/docker-compose.dev.yml --env-file .env up -d`, `pnpm --filter @bridge351/srh-backend run migration:run`, `pnpm --filter @bridge351/srh-backend run seed` (cria `admin@hr-suite.local` / `Admin123!`). **Duas notas de ambiente descobertas em P-044, ainda válidas**: (1) se o Keycloak entrar em crash-loop com "database keycloak does not exist", a BD/schema `keycloak` faltam no Postgres deste sandbox — corrigir com `CREATE DATABASE keycloak;` e `CREATE SCHEMA keycloak AUTHORIZATION srh_user;` (via `psql` no container `srh-postgres-dev`) e reiniciar o container do Keycloak; (2) se o backend ficar preso em `Cannot find module '/app/backend/dist/main'` após várias gravações rápidas de ficheiros (efeito de `deleteOutDir: true` em `nest-cli.json` + `nest start --watch` em bind-mount), apagar `backend/dist/` **e** `backend/tsconfig.build.tsbuildinfo` dentro do container e reiniciar.
- **P-031 a P-041**: todas as páginas principais (`AdminSettingsPage`, `CapacityPage`, `HelpdeskListPage`/`TicketDetailPage`, `CalendarPage`, `PoliciesListPage`/`PolicyDetailPage`, `TrainingPage`, `ReportsPage`, `GdprPage`, `NotificationsPage`) foram verificadas em browser real nas respetivas fases — mas essa verificação usou sempre a conta admin. **P-045 confirmou que isso escondia o bug `R-038`** (ver abaixo): funcionalidades de auto-serviço nestas páginas só funcionavam mesmo para o admin; agora funcionam para qualquer utilizador real.
- **Scanning automático de dependências (P-042)**: `.github/dependabot.yml`; 2 vulnerabilidades de runtime corrigidas; ~15 restantes (só build/dev tooling) deixadas para o Dependabot.
- **Reforço de cobertura de testes (P-043)**: 101 novos testes para os 9 serviços que não tinham nenhum.
- **P-044 — correção de gaps descobertos em P-039/P-040/P-041**: `R-036` resolvido (`docker-compose.prod.yml` `STORAGE_ENDPOINT`); `R-037` resolvido (download de Documents por streaming em vez de redirect); scoping de Manager/Employee em `GET /reports/timesheets`/`absences`/`expenses` (`ReportsService.resolveEmployeeScope()`); bug de nome de evento corrigido (alerta de fim de alocação); 4 novos handlers de notificação (`expense.approved`/`rejected`, `allocation.overallocation-detected`, `timesheet.pending-submission`); 3 eventos GDPR em falta emitidos (`gdpr.request.completed`, `gdpr.incident.escalated`, `gdpr.data.exported`). Foi durante a verificação em ambiente real desta fase que `R-038` foi descoberto.
- **P-045 — correção de `R-038`** (decisão P045-00, escolhida pelo utilizador): o bug — `req.user.sub` (JWT `sub` = `User.id`) comparado ou passado diretamente onde se esperava `Employee.id`, o que só coincide para o admin (convenção do seed de P-035) — afeta **10 módulos**, não só os 3 inicialmente suspeitos (decisão P045-01, confirmada por investigação sistemática de todos os usos de `user.sub` no backend, verificados um a um contra a FK real da entidade/migration alvo): **Training** (`ensureSelfOrPrivileged`, criação/edição/submissão de avaliações), **GDPR** (`ensureSelfOrAdmin`), **Expenses** (criar/listar/ver/editar/submeter/aprovar/rejeitar despesa), **Absences** (criar/listar/ver/aprovar/rejeitar/cancelar/anexar documento/saldo), **Timesheets** (ver/editar entrada/submeter/aprovar/rejeitar/aprovação em massa), **Users** (atualizar o próprio perfil), **Notifications** (lista própria, contagem de não lidas, marcar lida(s), preferências), **Helpdesk** (listar/criar/comentar/fechar ticket), **Workflow** (caixa de entrada, aprovar/rejeitar), **Documents** (upload — `uploadedBy`). Confirmados **não afetados**: `Team`/`Project` (`isTeamLeader`/`isProjectManager` já resolviam `Employee.userId → Employee.id` internamente — o padrão de referência copiado para a correção), `Calendar` (`createdBy` sem FK, campo de auditoria só-escrita), Auth/RBAC guards (corretamente `User.id`). Corrigido com um novo `EmployeeIdentityService` partilhado (`backend/src/auth/services/employee-identity.service.ts`, decisão P045-02) — `resolveEmployeeId(userId)`, exportado pelo `AuthModule` (já `@Global()` desde P012-02, injetável em qualquer controller sem import adicional). Nesta fase foi descoberto e deixado por corrigir o que veio a ser `R-039` (ver P-046).
- **P-046 — correção de `R-039`** (escolhida pelo utilizador entre 4 opções apresentadas): `AbsencesService`/`TimesheetsService`/`ExpensesService.validateApprover()` tinham um bypass de admin idêntico e quebrado — `approver.userId === 'admin'`, comparação de UUID contra string literal, nunca verdadeira — na prática ADMIN só aprovava/rejeitava se fosse o `managerId` direto do colaborador. Corrigido com um novo `RbacService.isAdmin(userId)` (`backend/src/rbac/services/rbac.service.ts`), que reutiliza o padrão já existente em `hasPermission()` (`userRoles.some(ur => ur.role.name === 'admin')`); injetado nos 3 serviços via `RbacModule` (já `@Global()`, mesmo padrão sem import adicional usado para `EmployeeIdentityService`). 4 novos testes unitários + 2 testes existentes de `timesheets.service.spec.ts` (`bulkApprove`) corrigidos, que só passavam antes por dependerem do bypass partido. 316/316 testes unitários (antes 312/312). `pnpm run lint` (0 erros) e `pnpm run build` (raiz) green. **Verificação em ambiente real**: ADMIN aprovou com sucesso (200) uma ausência, uma despesa e uma folha de horas de Bruno Costa (sem relação de `managerId` direto), antes impossível; confirmado que Ana Silva (manager, também sem `managerId` de Bruno) continua a receber 403 na mesma situação.
- **Sem falhas pré-existentes conhecidas nos testes.**
- Fixtures de teste na BD de desenvolvimento local (não afetam nenhum ambiente partilhado): Ana Silva, Bruno Costa, Cliente Demo, Projeto Alpha; fixtures específicos de Helpdesk/Calendar/Policies/Training/GDPR/Notifications de fases anteriores (ver `PROJECT_STATE.md` para a lista completa por fase). `password_hash` de Bruno Costa e Ana Silva está definido para um valor de teste conhecido desde P-044/P-045 (usado para logins genuínos durante verificação; `users.password_hash` é `NOT NULL`, não pôde ser limpo de volta a `null`) — inofensivo, BD só de desenvolvimento.

## 3. O que falta — candidatos à próxima fase

Não escolhas por conta própria; usa esta lista para apresentar opções ao utilizador (ver secção 4).

- **Cobertura de testes — mais fina**: `analytics`, `workflow` continuam com poucos cenários e sem cobertura de erro/edge case.
- **~15 vulnerabilidades de build/dev tooling ainda por resolver** (nanoid, postcss, brace-expansion, js-yaml, fast-uri via eslint/tailwind/vite — nunca correm em produção) — deixadas para o Dependabot (P-042) resolver progressivamente.
- **Wiring de Admin Settings** (fora do âmbito em P-029, decisão P029-01): módulos existentes teriam de ser revisitados para lerem `SystemSetting` — âmbito maior, envolve refactor de módulos já testados.
- **Gaps residuais de Reports, ainda não corrigidos** (ver `specs/reports/SPEC.md`): `project_hours`/`team_occupancy`/`margins`/`contracts_expiring`/`audit` continuam sem scoping de equipa para Manager; sem `PATCH` para editar um agendamento.
- **Gaps residuais de GDPR, ainda não corrigidos** (ver `specs/gdpr/SPEC.md`): relatório de conformidade continua com só 6 contadores agregados; os 3 eventos novos de P-044 não têm nenhum consumidor (`@OnEvent`) ainda.

## 4. Antes de avançar

Por regra 2 e 3 do `AGENTS.md`: não decidas sozinho qual destes itens atacar a seguir. Pergunta ao utilizador, no formato da regra 7:

```
QUESTÃO [ID]: Qual deve ser o foco desta sessão: aprofundar a cobertura de testes em analytics/workflow, rever manualmente as ~15 vulnerabilidades de build/dev tooling ainda por resolver, ligar Admin Settings ao runtime dos módulos existentes, ou fechar os gaps residuais de Reports/GDPR (scoping dos 5 tipos de relatório restantes, PATCH de agendamentos, consumidor dos 3 eventos GDPR novos)?
Opções sugeridas: [lista acima]
Impacto: define a área a trabalhar e o número de fase seguinte (P-047)
```

Só depois de teres resposta é que abres a spec correspondente e começas a implementar.

## 5. Regras críticas a não esquecer

- **Regra 8 (atualizada):** no final da sessão, faz apenas `git commit`. **Nunca** executes `git push` — é sempre manual, feito pelo utilizador humano.
- **Regra 9:** corre `pnpm run lint` antes de propores o commit e corrige todos os erros nos ficheiros alterados (imports não usados, `restrict-template-expressions`, `no-misused-spread`, `prefer-nullish-coalescing`, `no-unnecessary-type-conversion`, tipos em falta, unsafe member access).
- **Regra 2/3:** decisões de implementação não cobertas pela spec, ou ambiguidades na spec, param o trabalho e geram uma pergunta ao utilizador — nunca uma suposição. Se durante a investigação o âmbito real de um problema se revelar maior do que o inicialmente estimado (como aconteceu em P-045, de 6 para 10 módulos), volta a confirmar com o utilizador antes de alargar o trabalho.

## Acções de Fecho

- [ ] Atualizar `PROJECT_STATE.md`: nova entrada na tabela de fases (P-029+), decisões tomadas (ID + valor + impacto), secção "Current State" e data de "Last Updated"
- [ ] Se o módulo trabalhado tinha spec em `Draft`, promover para `Implemented` em `specs/README.md` e acrescentar notas de implementação no `specs/<módulo>/SPEC.md`
- [ ] Atualizar `specs/GLOBAL-TASKS-RISKS.md` se alguma tarefa/risco mudou de estado
- [ ] Correr `pnpm run lint` e `pnpm run build` (raiz, backend, frontend) — corrigir todos os erros
- [ ] **Atualizar este ficheiro (`RESUME_PROMPT.md`)** — secção 2 (última fase concluída, contagem de módulos, falhas pré-existentes conhecidas), secção 3 (remover itens resolvidos, acrescentar gaps novos descobertos na sessão) e o número de fase sugerido na secção 4. Fazer isto sempre que o estado do projeto mudar, não só quando pedido explicitamente.
- [ ] `git add` + `git commit` com mensagem em Conventional Commits — **nunca `git push`**
- [ ] Resumir ao utilizador, em poucas frases, o que foi feito e o que fica para a sessão seguinte

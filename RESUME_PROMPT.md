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
- Última fase concluída: **P-036** (frontend do módulo Calendário Organizacional, mais 4 gaps de backend pré-existentes corrigidos com aprovação do utilizador — ver abaixo).
- **23 dos 23 módulos** da spec (`specs/README.md`) `Implemented` no backend — nenhum módulo em `Draft`.
- Settings (`SystemSetting`) e `LegalEntity` (módulo Admin, P-029) são apenas armazenados via CRUD — nenhum módulo existente (Auth, Capacity, Absences, Timesheets, Contracts/Projects, Documents) os lê em runtime (decisão P029-01); valores hardcoded existentes (ex. `CapacityService.UNDERALLOCATION_THRESHOLD_PERCENTAGE`) mantêm-se.
- Frontend com UI própria para: auth, users/org-chart, projects/allocations, timesheets, absences, expenses, dashboard, financial dashboard, workflow inbox, admin/settings (P-031), capacity (P-032), helpdesk (P-034), calendar (P-036).
- Testes e2e (backend Jest + frontend Playwright) e CI (`ci.yml`: lint, backend e2e, frontend e2e) a correr verdes; **177/177 testes unitários do backend a passar (0 falhas)**.
- **Serviços ainda sem nenhum teste unitário** (candidatos naturais a uma próxima ronda de reforço de testes, decisão P030-01 deixou-os fora do âmbito): `TeamsService`, `ClientsService`, `ContractsService`, `DocumentsService`, `MfaService`, `KeycloakService`, `StorageService`, `CacheService`/`RedisCacheService`, `ScheduledReportsService`.
- **Docker funciona nesta sandbox** (deixou de ser o bloqueio que era em P-031) — em P-032 corrigiram-se 3 gaps de infra pré-existentes que impediam o stack dev de arrancar/ser alcançável: `infra/docker-compose.dev.yml` não passava `JWT_REFRESH_SECRET`/`MFA_ENCRYPTION_KEY` ao container do backend; `frontend/vite.config.ts` sem `server.host: true` (Vite só escutava em `::1` dentro do container); `infra/docker-compose.dev.yml` definia `VITE_API_BASE_URL` no serviço frontend mas o código lê `VITE_API_URL` (`frontend/src/api/client.ts`), causando erro 500 no login. Fluxo de arranque validado: `cp .env.example .env` + `scripts/generate-secrets.sh` para preencher segredos, `docker compose -f infra/docker-compose.dev.yml --env-file .env up -d`, `pnpm --filter @bridge351/srh-backend run migration:run`, `pnpm --filter @bridge351/srh-backend run seed` (cria `admin@hr-suite.local` / `Admin123!`).
- **`AdminSettingsPage` (P-031) e `CapacityPage` (P-032) totalmente verificadas em browser real (P-033)** — sem pendências de verificação conhecidas.
- **`HelpdeskListPage` e `TicketDetailPage` (P-034) totalmente verificadas em browser real** — criação de categoria, criação de ticket, comentário, escalar, atribuir, fechar, reabertura visível, filtro de lista por estado, 0 erros de consola em todos os passos.
- **Gap de seed do admin (`R-034`) corrigido em P-035**: `rbacSeed` (`backend/src/database/seeds/rbac.seed.ts`) passa a criar um `Employee` para `admin@hr-suite.local` logo após atribuir o papel `admin` (`id = userId = adminUser.id`, `employeeNumber: 'ADM-001'`, mesma convenção de `test/absences.e2e-spec.ts`), guardado por `findOneBy` para não duplicar em BDs que já tenham o registo manual inserido em P-034. Módulos self-service (Absences, Timesheets, Helpdesk) já funcionam para o admin em BDs novas sem intervenção manual.
- **`CalendarPage` (P-036) totalmente verificada em browser real** — grelha mensal, importação de feriados PT, criação/edição/remoção de feriado/evento/bloqueio, ausência rápida a partir do calendário, 0 erros de consola.
- **4 gaps de backend descobertos e corrigidos em P-036** (todos com aprovação prévia do utilizador): (1) `GET /calendar/events` e `GET /calendar/blocked-periods` em falta (serviço já existia, sem rota); (2) `GET /absences/types` em falta — quebrava a ausência rápida do Calendar **e** a página pré-existente `/absences/new` (desde P-022); (3) seed `runAbsenceTypesSeed` nunca ligado a `runner.ts`, tabela `absence_types` vazia — ligado e corrido em dev; (4) **bug de ordenação de rotas em `AbsencesController`** (`GET absences/:id` capturava `absences/calendar`) confirmado em browser a **quebrar a página `/absences` em produção** (erro 500 visível, lista de pedidos sempre vazia) — corrigido movendo `getCalendar()` antes de `findOne()`. Ver `specs/calendar/SPEC.md` (Notas de Implementação P-036) e `PROJECT_STATE.md` (fase P-036) para detalhe completo.
- **Sem falhas pré-existentes conhecidas.** A falha em `absences.service.spec.ts` (data hardcoded no passado) foi corrigida em P-030; a página `/absences` esteve quebrada em runtime (erro 500, sem relação com testes unitários) até esta sessão corrigir o gap 4 acima.
- Fixtures de teste na BD de desenvolvimento local (não afetam nenhum ambiente partilhado, remover se se quiser uma BD limpa): Ana Silva, Bruno Costa, Cliente Demo, Projeto Alpha (P-032/P-033); `Employee` do admin, 2 tickets "Computador não liga", categoria "Hardware" (P-034); 17 feriados PT 2026, 1 feriado manual, 1 evento "Reunião Anual Bridge351", 1 bloqueio "Encerramento de fim de ano", 1 pedido de ausência pendente do admin (P-036).

## 3. O que falta — candidatos à próxima fase

Não escolhas por conta própria; usa esta lista para apresentar opções ao utilizador (ver secção 4).

- **Todas as specs estão `Implemented`** — não há módulo de backend em falta. Próximas fases são sobre frontend, segurança/infra ou qualidade, não sobre novos módulos de spec.
- **Frontend ainda em falta** para módulos com backend pronto: GDPR (consentimentos, pedidos de titular), Training (cursos, avaliações, matriz 9-box), Policies (políticas internas), Reports (agendamento/download), página dedicada de Notificações (hoje só existe o sino/badge na sidebar). Admin (P-031), Capacity (P-032), Helpdesk (P-034) e Calendar (P-036) já têm frontend.
- **Gap de segurança identificado na Fase 5 do `AUDIT_PROCESS.md`**: sem Dependabot/Renovate nem scanning automático de dependências configurado no CI.
- **Cobertura de testes — restante**: os 9 serviços listados na secção 2 continuam sem nenhum teste unitário; módulos com "testes básicos" (analytics, gdpr, notifications, reports, training, workflow — poucos cenários, sem cobertura de erro/edge case) ver `PROJECT_STATE.md` para a lista exata.
- **Wiring de Admin Settings** (deixado fora do âmbito em P-029, decisão P029-01): se algum dia for pedido, os módulos Auth/Capacity/Absences/Timesheets/Contracts-Projects/Documents teriam de ser revisitados para lerem `SystemSetting` em vez dos valores fixos atuais — âmbito maior, envolve refactor de módulos já testados.

## 4. Antes de avançar

Por regra 2 e 3 do `AGENTS.md`: não decidas sozinho qual destes itens atacar a seguir. Pergunta ao utilizador, no formato da regra 7:

```
QUESTÃO [ID]: Qual deve ser o foco desta sessão — construir frontend em falta (GDPR/Training/Policies/Reports/Notificações), fechar o gap de scanning de dependências, continuar o reforço de testes (serviços ainda sem cobertura), ligar Admin Settings ao runtime dos módulos existentes, ou outra prioridade?
Opções sugeridas: [lista acima]
Impacto: define a área a trabalhar e o número de fase seguinte (P-037)
```

Só depois de teres resposta é que abres a spec correspondente e começas a implementar.

## 5. Regras críticas a não esquecer

- **Regra 8 (atualizada):** no final da sessão, faz apenas `git commit`. **Nunca** executes `git push` — é sempre manual, feito pelo utilizador humano.
- **Regra 9:** corre `pnpm run lint` antes de propores o commit e corrige todos os erros nos ficheiros alterados (imports não usados, `restrict-template-expressions`, `no-misused-spread`, `prefer-nullish-coalescing`, `no-unnecessary-type-conversion`, tipos em falta, unsafe member access).
- **Regra 2/3:** decisões de implementação não cobertas pela spec, ou ambiguidades na spec, param o trabalho e geram uma pergunta ao utilizador — nunca uma suposição.

## Acções de Fecho

- [ ] Atualizar `PROJECT_STATE.md`: nova entrada na tabela de fases (P-029+), decisões tomadas (ID + valor + impacto), secção "Current State" e data de "Last Updated"
- [ ] Se o módulo trabalhado tinha spec em `Draft`, promover para `Implemented` em `specs/README.md` e acrescentar notas de implementação no `specs/<módulo>/SPEC.md`
- [ ] Atualizar `specs/GLOBAL-TASKS-RISKS.md` se alguma tarefa/risco mudou de estado
- [ ] Correr `pnpm run lint` e `pnpm run build` (raiz, backend, frontend) — corrigir todos os erros
- [ ] **Atualizar este ficheiro (`RESUME_PROMPT.md`)** — secção 2 (última fase concluída, contagem de módulos, falhas pré-existentes conhecidas), secção 3 (remover itens resolvidos, acrescentar gaps novos descobertos na sessão) e o número de fase sugerido na secção 4. Fazer isto sempre que o estado do projeto mudar, não só quando pedido explicitamente.
- [ ] `git add` + `git commit` com mensagem em Conventional Commits — **nunca `git push`**
- [ ] Resumir ao utilizador, em poucas frases, o que foi feito e o que fica para a sessão seguinte

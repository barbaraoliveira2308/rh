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
- Última fase concluída: **P-031** (frontend do módulo Administração do Sistema — `AdminSettingsPage`, `/admin/settings`).
- **23 dos 23 módulos** da spec (`specs/README.md`) `Implemented` no backend — nenhum módulo em `Draft`.
- Settings (`SystemSetting`) e `LegalEntity` (módulo Admin, P-029) são apenas armazenados via CRUD — nenhum módulo existente (Auth, Capacity, Absences, Timesheets, Contracts/Projects, Documents) os lê em runtime (decisão P029-01); valores hardcoded existentes (ex. `CapacityService.UNDERALLOCATION_THRESHOLD_PERCENTAGE`) mantêm-se. P-031 apenas construiu a UI de gestão destes dados — não altera este comportamento.
- Frontend com UI própria para: auth, users/org-chart, projects/allocations, timesheets, absences, expenses, dashboard, financial dashboard, workflow inbox, **admin/settings (P-031)**.
- Testes e2e (backend Jest + frontend Playwright) e CI (`ci.yml`: lint, backend e2e, frontend e2e) a correr verdes; **173/173 testes unitários do backend a passar (0 falhas)**.
- **Sem falhas pré-existentes conhecidas.** A falha em `absences.service.spec.ts` (data hardcoded `2026-08-01` que ficou no passado) foi corrigida em P-030 — `startDate`/`endDate` do teste `cancel` passam a ser calculados relativamente a `Date.now()`.
- **Serviços ainda sem nenhum teste unitário** (candidatos naturais a uma próxima ronda de reforço de testes, decisão P030-01 deixou-os fora do âmbito): `TeamsService`, `ClientsService`, `ContractsService`, `DocumentsService`, `MfaService`, `KeycloakService`, `StorageService`, `CacheService`/`RedisCacheService`, `ScheduledReportsService`.
- **`AdminSettingsPage` (P-031) não foi verificada em browser real** — o sandbox onde P-031 foi implementada não tinha o daemon Docker ativo nem `sudo` para o iniciar, pelo que a stack completa (Postgres/Keycloak/Redis) não pôde ser levantada. Validação limitada a `tsc -b` + `vite build` + ESLint (0 erros). Recomenda-se correr `pnpm dev` localmente (após subir `infra/docker-compose.dev.yml`) e confirmar visualmente antes de dar este item como totalmente fechado.

## 3. O que falta — candidatos à próxima fase

Não escolhas por conta própria; usa esta lista para apresentar opções ao utilizador (ver secção 4).

- **Todas as specs estão `Implemented`** — não há módulo de backend em falta. Próximas fases são sobre frontend, segurança/infra ou qualidade, não sobre novos módulos de spec.
- **Frontend ainda em falta** para módulos com backend pronto: GDPR (consentimentos, pedidos de titular), Training (cursos, avaliações, matriz 9-box), Helpdesk (tickets), Policies (políticas internas), Calendar, Reports (agendamento/download), Capacity (overview/alerts/calendar — endpoints prontos desde P-028, sem página; decisão P028-03 deixou o Gantt só como dados), página dedicada de Notificações (hoje só existe o sino/badge na sidebar). Admin (settings e entidades legais) já tem frontend desde P-031.
- **Gap de segurança identificado na Fase 5 do `AUDIT_PROCESS.md`**: sem Dependabot/Renovate nem scanning automático de dependências configurado no CI.
- **Cobertura de testes — restante**: os 9 serviços listados na secção 2 continuam sem nenhum teste unitário; módulos com "testes básicos" (analytics, gdpr, notifications, reports, training, workflow — poucos cenários, sem cobertura de erro/edge case) ver `PROJECT_STATE.md` para a lista exata.
- **Wiring de Admin Settings** (deixado fora do âmbito em P-029, decisão P029-01): se algum dia for pedido, os módulos Auth/Capacity/Absences/Timesheets/Contracts-Projects/Documents teriam de ser revisitados para lerem `SystemSetting` em vez dos valores fixos atuais — âmbito maior, envolve refactor de módulos já testados.
- **Verificação em browser de `AdminSettingsPage` (P-031)**: se a próxima sessão tiver acesso a Docker funcional, vale a pena correr `pnpm dev` e confirmar visualmente login → `/admin/settings` → ambas as abas, antes de considerar P-031 totalmente validado.

## 4. Antes de avançar

Por regra 2 e 3 do `AGENTS.md`: não decidas sozinho qual destes itens atacar a seguir. Pergunta ao utilizador, no formato da regra 7:

```
QUESTÃO [ID]: Qual deve ser o foco desta sessão — construir frontend em falta (GDPR/Training/Helpdesk/Policies/Calendar/Reports/Capacity/Notificações), fechar o gap de scanning de dependências, continuar o reforço de testes (serviços ainda sem cobertura), ligar Admin Settings ao runtime dos módulos existentes, ou outra prioridade?
Opções sugeridas: [lista acima]
Impacto: define a área a trabalhar e o número de fase seguinte (P-032)
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

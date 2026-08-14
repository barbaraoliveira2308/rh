# Prompt de Retoma — HR Suite (Bridge351)

> Cola este ficheiro completo como primeira mensagem numa nova sessão de agente de IA para retomar o desenvolvimento deste projeto. Não avances para implementação sem completar os passos 1 e 4 abaixo.

## 1. Leitura obrigatória, por esta ordem

1. `AGENTS.md` — regras globais. Aplicam-se sem exceção a partir daqui.
2. `PROJECT_STATE.md` — histórico completo de fases, decisões tomadas e estado atual. É a fonte de verdade; o resumo na secção 2 pode estar desatualizado.
3. `specs/README.md` — índice de módulos e estado de cada um (`Implemented` / `Draft`).
4. `specs/global-tasks-risks.md` — tarefas, riscos e ambiguidades já resolvidas (para não repetir perguntas já respondidas).
5. Se o trabalho tocar arquitetura, segurança ou conformidade: `docs/ARCHITECTURE.md` e `docs/AUDIT_PROCESS.md`.

## 2. Estado atual (resumo — confirmar sempre contra o `PROJECT_STATE.md`)

- Stack: NestJS + React 18 + TypeORM + PostgreSQL, monorepo pnpm (`backend/`, `frontend/`, `shared/`).
- Última fase concluída: **P-026** (processo de auditoria faseado + script de geração de segredos).
- 23 módulos de domínio implementados no backend (auth, RBAC, users, teams, clients, contracts, documents, projects, timesheets, absences, expenses, analytics, notifications, workflow, calendar, reports, gdpr, training, policies, helpdesk, audit).
- Frontend com UI própria apenas para: auth, users/org-chart, projects/allocations, timesheets, absences, expenses, dashboard, financial dashboard, workflow inbox.
- Testes e2e (backend Jest + frontend Playwright) e CI (`ci.yml`: lint, backend e2e, frontend e2e) a correr verdes.

## 3. O que falta — candidatos à próxima fase

Não escolhas por conta própria; usa esta lista para apresentar opções ao utilizador (ver secção 4).

- **Specs em `Draft`** (`specs/README.md`): `capacity` (#06 — nunca virou módulo dedicado, hoje disperso entre Teams/Projects), `policies` (#17), `helpdesk` (#19) — estes dois últimos têm backend implementado desde a P-020, a spec é que ficou por promover — e `admin` (#23 — "Administração do Sistema" nunca chegou a ser implementado, não existe `backend/src/admin/`).
- **Frontend em falta** para módulos com backend pronto: GDPR (consentimentos, pedidos de titular), Training (cursos, avaliações, matriz 9-box), Helpdesk (tickets), Policies (políticas internas), Calendar, Reports (agendamento/download), página dedicada de Notificações (hoje só existe o sino/badge na sidebar).
- **Gap de segurança identificado na Fase 5 do `AUDIT_PROCESS.md`**: sem Dependabot/Renovate nem scanning automático de dependências configurado no CI.
- **Cobertura de testes**: vários módulos (analytics, gdpr, training, entre outros) têm apenas "testes básicos" — ver `PROJECT_STATE.md` para a lista exata.

## 4. Antes de avançar

Por regra 2 e 3 do `AGENTS.md`: não decidas sozinho qual destes itens atacar a seguir. Pergunta ao utilizador, no formato da regra 7:

```
QUESTÃO [ID]: Qual deve ser o foco desta sessão — completar specs em Draft, construir frontend em falta, fechar o gap de scanning de dependências, reforçar testes, ou outra prioridade?
Opções sugeridas: [lista acima]
Impacto: define o módulo/spec a abrir e o número de fase seguinte (P-027)
```

Só depois de teres resposta é que abres a spec correspondente e começas a implementar.

## 5. Regras críticas a não esquecer

- **Regra 8 (atualizada):** no final da sessão, faz apenas `git commit`. **Nunca** executes `git push` — é sempre manual, feito pelo utilizador humano.
- **Regra 9:** corre `pnpm run lint` antes de propores o commit e corrige todos os erros nos ficheiros alterados (imports não usados, `restrict-template-expressions`, `no-misused-spread`, `prefer-nullish-coalescing`, `no-unnecessary-type-conversion`, tipos em falta, unsafe member access).
- **Regra 2/3:** decisões de implementação não cobertas pela spec, ou ambiguidades na spec, param o trabalho e geram uma pergunta ao utilizador — nunca uma suposição.

## Acções de Fecho

- [ ] Atualizar `PROJECT_STATE.md`: nova entrada na tabela de fases (P-027+), decisões tomadas (ID + valor + impacto), secção "Current State" e data de "Last Updated"
- [ ] Se o módulo trabalhado tinha spec em `Draft`, promover para `Implemented` em `specs/README.md` e acrescentar notas de implementação no `specs/<módulo>/spec.md`
- [ ] Atualizar `specs/global-tasks-risks.md` se alguma tarefa/risco mudou de estado
- [ ] Correr `pnpm run lint` e `pnpm run build` (raiz, backend, frontend) — corrigir todos os erros
- [ ] `git add` + `git commit` com mensagem em Conventional Commits — **nunca `git push`**
- [ ] Resumir ao utilizador, em poucas frases, o que foi feito e o que fica para a sessão seguinte

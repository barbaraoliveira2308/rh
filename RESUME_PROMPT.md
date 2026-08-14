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
- Última fase concluída: **P-028** (módulo dedicado Capacidade & Alocação, `backend/src/capacity/`, com BR-CAP-004 implementada).
- 22 dos 23 módulos da spec (`specs/README.md`) implementados no backend — falta apenas **#23 Administração do Sistema** (`admin`, Draft, sem `backend/src/admin/`).
- Frontend com UI própria apenas para: auth, users/org-chart, projects/allocations, timesheets, absences, expenses, dashboard, financial dashboard, workflow inbox.
- Testes e2e (backend Jest + frontend Playwright) e CI (`ci.yml`: lint, backend e2e, frontend e2e) a correr verdes.
- **Falha pré-existente conhecida (não bloqueia o resto):** `backend/src/absences/services/absences.service.spec.ts`, teste `cancel` — usa `startDate: '2026-08-01'` como data "futura" (escrito em 2026-07-08); passou a estar no passado e o teste falha desde meados de agosto de 2026. Não relacionado com P-027/P-028; por corrigir quando o módulo Ausências for revisitado.

## 3. O que falta — candidatos à próxima fase

Não escolhas por conta própria; usa esta lista para apresentar opções ao utilizador (ver secção 4).

- **Spec em `Draft`**: apenas `admin` (#23 — "Administração do Sistema" nunca chegou a ser implementado, não existe `backend/src/admin/`). `capacity` (#06), `policies` (#17) e `helpdesk` (#19) já foram promovidas a `Implemented` em P-027/P-028.
- **Frontend em falta** para módulos com backend pronto: GDPR (consentimentos, pedidos de titular), Training (cursos, avaliações, matriz 9-box), Helpdesk (tickets), Policies (políticas internas), Calendar, Reports (agendamento/download), Capacity (overview/alerts/calendar — endpoints prontos desde P-028, sem página; decisão P028-03 deixou o Gantt só como dados), página dedicada de Notificações (hoje só existe o sino/badge na sidebar).
- **Gap de segurança identificado na Fase 5 do `AUDIT_PROCESS.md`**: sem Dependabot/Renovate nem scanning automático de dependências configurado no CI.
- **Cobertura de testes**: vários módulos (analytics, gdpr, training, entre outros) têm apenas "testes básicos" — ver `PROJECT_STATE.md` para a lista exata. Ver também a falha pré-existente em Ausências referida na secção 2.

## 4. Antes de avançar

Por regra 2 e 3 do `AGENTS.md`: não decidas sozinho qual destes itens atacar a seguir. Pergunta ao utilizador, no formato da regra 7:

```
QUESTÃO [ID]: Qual deve ser o foco desta sessão — implementar o módulo Admin (#23), construir frontend em falta, fechar o gap de scanning de dependências, reforçar testes, ou outra prioridade?
Opções sugeridas: [lista acima]
Impacto: define o módulo/spec a abrir e o número de fase seguinte (P-029)
```

Só depois de teres resposta é que abres a spec correspondente e começas a implementar.

## 5. Regras críticas a não esquecer

- **Regra 8 (atualizada):** no final da sessão, faz apenas `git commit`. **Nunca** executes `git push` — é sempre manual, feito pelo utilizador humano.
- **Regra 9:** corre `pnpm run lint` antes de propores o commit e corrige todos os erros nos ficheiros alterados (imports não usados, `restrict-template-expressions`, `no-misused-spread`, `prefer-nullish-coalescing`, `no-unnecessary-type-conversion`, tipos em falta, unsafe member access).
- **Regra 2/3:** decisões de implementação não cobertas pela spec, ou ambiguidades na spec, param o trabalho e geram uma pergunta ao utilizador — nunca uma suposição.

## Acções de Fecho

- [ ] Atualizar `PROJECT_STATE.md`: nova entrada na tabela de fases (P-029+), decisões tomadas (ID + valor + impacto), secção "Current State" e data de "Last Updated"
- [ ] Se o módulo trabalhado tinha spec em `Draft`, promover para `Implemented` em `specs/README.md` e acrescentar notas de implementação no `specs/<módulo>/spec.md`
- [ ] Atualizar `specs/global-tasks-risks.md` se alguma tarefa/risco mudou de estado
- [ ] Correr `pnpm run lint` e `pnpm run build` (raiz, backend, frontend) — corrigir todos os erros
- [ ] **Atualizar este ficheiro (`RESUME_PROMPT.md`)** — secção 2 (última fase concluída, contagem de módulos, falhas pré-existentes conhecidas), secção 3 (remover itens resolvidos, acrescentar gaps novos descobertos na sessão) e o número de fase sugerido na secção 4. Fazer isto sempre que o estado do projeto mudar, não só quando pedido explicitamente.
- [ ] `git add` + `git commit` com mensagem em Conventional Commits — **nunca `git push`**
- [ ] Resumir ao utilizador, em poucas frases, o que foi feito e o que fica para a sessão seguinte

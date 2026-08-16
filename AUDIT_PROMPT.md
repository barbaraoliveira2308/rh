# Prompt de Auditoria Completa — HR Suite (Bridge351)

> Cola este ficheiro completo como primeira mensagem numa nova sessão de agente de IA para correr uma auditoria completa, módulo a módulo, do sistema. Esta sessão é **só de leitura** — não implementa, não corrige, não commita. O único artefacto de saída é um relatório em Markdown.

## 0. O que é este documento

Este NÃO é o prompt de retoma de desenvolvimento (esse é `RESUME_PROMPT.md`, na raiz do repositório — não o uses para esta tarefa). Este prompt pede uma **auditoria**: uma leitura sistemática de cada um dos 23 módulos do sistema, comparando a spec (o que devia existir) com o código real (o que existe), à procura de:

- Divergências entre a spec e a implementação (endpoints em falta, endpoints a mais não documentados, regras de negócio não aplicadas).
- Código morto ou órfão (dependências injetadas mas nunca usadas, tabelas nunca populadas, métodos nunca chamados) — este projeto já encontrou várias destas em fases anteriores (ver exemplos na secção 4).
- Problemas de segurança (guardas de autenticação/autorização em falta, dados sensíveis não mascarados, IDOR).
- Cobertura de testes (unitários e e2e) para os caminhos críticos de cada módulo.
- Inconsistências entre módulos que deviam usar o mesmo padrão e não usam.

O resultado é um **relatório**, não um conjunto de correções. Não resolvas nada que encontrares — regista, com evidência concreta (ficheiro:linha), e segue para o módulo seguinte.

## 1. Leitura obrigatória antes de começar, por esta ordem

1. `AGENTS.md` — regras globais do projeto. Não se aplicam da mesma forma a esta tarefa (não vais implementar nada), mas dão-te o vocabulário e as convenções do projeto (ex: como uma "decisão" é registada, o que é uma "ambiguidade genuína").
2. `PROJECT_STATE.md` — histórico completo de fases (P-001 a P-071 à data de escrita deste prompt) e decisões já tomadas. **Fonte de verdade sobre o que já foi decidido e porquê.** Antes de reportares algo como "gap" ou "inconsistência", verifica aqui se não é uma decisão consciente de âmbito já documentada (ex: `companyName`/`sessionTimeoutMinutes` deliberadamente não ligados, `LegalEntity` no organograma deliberadamente fora de âmbito). Reportar como "bug" uma decisão de produto já tomada é um falso positivo caro de triar.
3. `specs/README.md` — índice dos 23 módulos e o ficheiro de spec de cada um.
4. `specs/GLOBAL-TASKS-RISKS.md` — riscos e ambiguidades já identificados e o seu estado (`R-001` a `R-047` à data de escrita). **Não repitas descobertas já aqui documentadas** — se encontrares algo que já está listado, confirma que ainda é válido (o código pode ter mudado) e segue; não o reportes como novo.
5. `docs/ARCHITECTURE.md` e `docs/AUDIT_PROCESS.md` — arquitetura e processo de auditoria/compliance do sistema.

Se algum destes ficheiros não existir ou tiver um caminho diferente do assumido aqui, adapta-te ao que encontrares — a estrutura real do repositório é sempre a autoridade.

## 2. Contexto do sistema (resumo — confirma sempre contra `PROJECT_STATE.md`)

- Stack: NestJS (backend) + React 18 (frontend) + TypeORM + PostgreSQL, monorepo pnpm (`backend/`, `frontend/`, `shared/`).
- 23 módulos, todos `Implemented` no backend (nenhum em `Draft`). Todos têm frontend próprio.
- Auditoria (`hr.audit_logs`) ligada em todos os eventos mínimos da spec (`specs/audit/SPEC.md`) desde P-068.
- Wiring de Admin Settings ao runtime concluído desde P-059 (15/15 parâmetros de `SystemSetting`).
- `LegalEntity` ligada a `Contract`/`Expenses`/`Absences`/`Calendar`/`Timesheets` desde P-069/P-071.
- 439/439 testes unitários do backend a passar; suite e2e 7/7 ficheiros (51/51 testes) a passar — à data de escrita deste prompt. Confirma o número atual correndo `pnpm test` (backend) e `pnpm run test:e2e` antes de reportar qualquer coisa sobre testes — pode ter mudado.

## 3. Metodologia — por cada um dos 23 módulos (ver `specs/README.md` para a lista completa)

Para cada módulo, nesta ordem:

1. **Lê a spec completa**: `specs/<módulo>/SPEC.md`, incluindo especialmente as secções "Notas de Implementação" (o que foi _de facto_ construído, muitas vezes diferente do desenho original), "Simplificações/Decisões" (âmbito deliberadamente reduzido) e "Questões em Aberto" (ambiguidades nunca resolvidas — não as reportes como bugs, já são conhecidas).
2. **Lê o código backend real**: `backend/src/<módulo>/` — controller(s), service(s), entities, DTOs, module. Confirma:
   - Todos os endpoints listados na spec existem no controller com o método HTTP certo?
   - Existem endpoints no controller que não estão documentados na spec? (pode ser normal — muitos módulos já adicionaram endpoints além da spec original, ex: `GET /timesheets/export`; verifica se está nas "Notas de Implementação" antes de o reportares como surpresa).
   - As regras de negócio (`BR-XXX-NNN`) da spec estão de facto implementadas no service, ou só documentadas?
   - As tabelas de permissões da spec correspondem aos decoradores `@Roles(...)` reais no controller?
   - Todas as entidades/repositórios injetados no construtor de um service são de facto usados nalgum método? Um `@InjectRepository(X)` nunca referenciado no corpo da classe é um sinal forte de código órfão (foi exatamente este o padrão do `HolidayCalendar` encontrado em P-071 — ver secção 4).
3. **Lê o frontend correspondente**: `frontend/src/pages/` — a página existe? Cobre os fluxos principais descritos na spec (ver `specs/README.md` e a lista de páginas em `RESUME_PROMPT.md`)? Não precisas de correr o browser — leitura de código chega para esta auditoria.
4. **Verifica testes**: `backend/src/<módulo>/**/*.spec.ts` existe? Cobre os métodos críticos do service (aprovação, validação de saldo/permissão, cálculos)? Existe cobertura e2e em `backend/test/*.e2e-spec.ts` para este módulo?
5. **Verifica segurança**: todos os endpoints que deviam exigir autenticação têm `@UseGuards(JwtAuthGuard, ...)`? Campos sensíveis (NIF, IBAN, password, mfaSecret — ver `GdprSensitive` decorator em `backend/src/users/decorators/`) estão mascarados nos logs de auditoria e nas respostas onde não deviam ser expostos?
6. **Cruza com `specs/GLOBAL-TASKS-RISKS.md`**: algum risco já listado (`R-001` a `R-047`) toca este módulo? Confirma que a resolução documentada ainda corresponde ao código atual.

## 4. Padrões de bugs já encontrados neste projeto (para calibrar o que procurar)

Estes são exemplos reais, já corrigidos, de problemas descobertos por auditorias anteriores nesta mesma base de código — servem para calibrar a profundidade e o tipo de problema que vale a pena procurar:

- **Tabela/entidade órfã, nunca populada**: `HolidayCalendar` (`hr.holiday_calendars`) era consultada por dois serviços (`AbsencesService`, `TimesheetsService`) mas nunca tinha nenhum mecanismo de escrita (sem seed, sem import, sem CRUD admin) — a tabela estava sempre vazia, tornando a lógica de feriados um no-op silencioso desde a implementação original (R-047, P-071).
- **Bug de identidade `User.id` vs `Employee.id`**: `req.user.sub` (JWT `sub` = `User.id`) usado onde se esperava `Employee.id` — só coincidia para o utilizador semeado por convenção, afetando 10 módulos (R-038, P-045).
- **Bypass de admin quebrado**: comparação de UUID contra a string literal `'admin'`, nunca verdadeira — só funcionava por coincidência quando o admin era também o manager direto (R-039, P-046).
- **Interceptor com resolução de ID silenciosamente falhada**: `AuditInterceptor.extractEntityId()` só lia `params.id`, falhando silenciosamente (fallback `'unknown'`, insert nunca escrito) para rotas de criação sem `:id` na URL (P-063).
- **Mecanismo montado mas nunca ligado**: `AuthAuditInterceptor` estava registado no controller mas o `AUDIT_EVENT_HANDLER` nunca era injetado — o interceptor corria e não fazia nada (P-062).
- **Cron nunca agendado**: `GdprService.runRetentionPolicies()` existia desde P-018 mas só ganhou o decorator `@Cron(...)` em P-040 — dois anos (em termos de fases) de código morto por falta de um decorator.
- **Reprocessamento por falta de marcador de estado**: `anonymizeInactiveEmployeesPastCutoff()` não tinha forma de saber que um colaborador já tinha sido anonimizado, reprocessando-o em cada corrida (R-042, P-070).

O padrão comum: **código que parece correto isoladamente mas nunca é de facto exercitado em produção** — dependências injetadas e nunca chamadas, crons sem decorator, interceptors sem handler, tabelas sem escrita. É precisamente este tipo de problema, mais do que erros óbvios de lógica, que vale a pena procurar — os erros óbvios já teriam sido apanhados pelos 439 testes unitários existentes.

## 5. O que NÃO fazer

- Não implementes nenhuma correção, por mais óbvia ou pequena que pareça. Regista o achado no relatório e segue.
- Não repitas no relatório decisões de âmbito já documentadas em `PROJECT_STATE.md`/`specs/GLOBAL-TASKS-RISKS.md`/nas secções "Simplificações/Decisões" de cada spec — verifica sempre antes de reportar.
- Não corras `pnpm run lint --fix` nem qualquer comando que altere ficheiros.
- Não uses o browser/Playwright nem precisas de o Docker estar de pé — esta auditoria é só leitura de código e specs. Se quiseres confirmar algo em runtime (ex: se uma tabela tem de facto dados), podes usar `psql` só para `SELECT`, nunca `INSERT`/`UPDATE`/`DELETE`.
- Não faças `git commit` nem `git push`.

## 6. Formato do relatório de saída

Cria o ficheiro `AUDIT_REPORT_<AAAA-MM-DD>.md` na raiz do repositório (usa a data real do dia em que a auditoria corre; o nome do ficheiro mantém-se só com a data — a hora vai dentro do documento, não no nome). Antes de escrever o relatório, corre `date "+%Y-%m-%d %H:%M"` (ou equivalente) para obteres a data **e hora** exatas do momento em que a auditoria foi executada — nunca só a data.

```markdown
# Relatório de Auditoria — HR Suite (<data>)

**Gerado em:** <AAAA-MM-DD HH:MM> — data e hora reais em que esta auditoria correu (usa o resultado de `date`, não uma estimativa).

## Resumo Executivo

[3-5 frases: quantos módulos auditados, quantos achados por severidade, padrão mais comum encontrado]

## Achados por Severidade

### Crítico (segurança, perda/corrupção de dados, bypass de permissões)

- [Módulo] Descrição do achado. Evidência: `ficheiro:linha`. Impacto: [...]

### Alto (funcionalidade documentada que não funciona; regra de negócio não aplicada)

- ...

### Médio (código órfão, inconsistência entre módulos, gap de testes em caminho crítico)

- ...

### Baixo (cosmético, gap de testes em caminho não crítico, documentação desatualizada)

- ...

## Por Módulo

### 01 — Autenticação & Segurança

Estado: [OK / Achados menores / Precisa de atenção]
[Achados específicos deste módulo, ou "Nenhum achado além do já documentado em R-XXX" se limpo]

### 02 — Utilizadores & RBAC

...

[... um bloco por cada um dos 23 módulos, mesma ordem de specs/README.md ...]

## Achados Transversais

[Problemas que atravessam múltiplos módulos — ex: um padrão repetido em vários services]

## Falsos Positivos Descartados

[Coisas que pareciam problemas mas afinal são decisões de âmbito já documentadas — regista aqui para a próxima auditoria não as re-investigar do zero]
```

Cada achado deve ter sempre evidência concreta (caminho de ficheiro + linha, ou nome de método/endpoint) — nunca uma afirmação vaga sem apontar para o código real.

## 6.1. Marcar achados como resolvidos (fora do âmbito desta auditoria, mas convenção a seguir)

Esta auditoria é só de leitura (secção 5) e não resolve nada — mas o `AUDIT_REPORT_<AAAA-MM-DD>.md` que produz é um documento vivo: fica no repositório e, quando uma sessão de desenvolvimento posterior corrige um achado aqui listado, deve voltar a este ficheiro e marcá-lo como resolvido. Para manter os relatórios de todas as auditorias consistentes, essa marcação segue sempre este formato:

```markdown
- ~~**[Módulo] Descrição original do achado.**~~ **RESOLVIDO (AAAA-MM-DD HH:MM).** [O que foi feito, evidência do fix: `ficheiro:linha`, testes que passaram a cobrir o caso.]
```

Regras:

- A data e hora **são sempre as do momento em que a correção foi aplicada e verificada** (testes a passar), não a data da auditoria original nem uma estimativa — usa `date "+%Y-%m-%d %H:%M"`.
- Risca (`~~...~~`) o texto original do achado em vez de o apagar — o relatório deve continuar a mostrar o que foi encontrado, não só o que ficou resolvido.
- Se várias correções acontecerem em sessões diferentes, cada achado resolvido tem a sua própria data/hora — não uses uma data única para o lote todo a menos que tenham sido de facto corrigidos e verificados na mesma sessão.
- Atualiza também o resumo executivo (contagens de achados por severidade) e a linha "Estado dos Testes" se os números de testes tiverem mudado, com a mesma data/hora entre parêntesis junto do número novo (ex: `439 → 451 (AAAA-MM-DD HH:MM)`).
- Isto aplica-se ao ficheiro `AUDIT_REPORT_<AAAA-MM-DD>.md` já existente — nunca cries um novo relatório só para registar uma resolução; isso é para uma nova ronda de auditoria completa.

## 7. Ações de fecho

- [ ] Gravar `AUDIT_REPORT_<AAAA-MM-DD>.md` na raiz do repositório, com a data e hora de geração (secção 6) no topo do documento.
- [ ] Não alterar nenhum outro ficheiro do repositório.
- [ ] Resumir ao utilizador, em poucas frases, quantos módulos foram auditados e o número de achados por severidade — sem repetir o relatório inteiro no chat.

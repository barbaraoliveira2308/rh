# Relatório de Auditoria — HR Suite (2026-08-16)

## Resumo Executivo

Auditoria completa dos 23 módulos do sistema HR Suite, comparando especificações técnicas com código real. Estado atual: 439/439 testes unitários a passar, 51/51 testes e2e a passar. Foram encontrados **4 achados Críticos**, **13 achados Altos**, **18 achados Médios** e **17 achados Baixos**. O padrão mais comum são permissões de controlo de acesso desalinhadas da spec (Managers/Approvers com acesso mais amplo do que documentado) e funcionalidade documentada na spec mas não implementada (Password reset, API Keys, bulk-approve workflow, flusos multi-etapa). Nenhum código órfão do tipo `@InjectRepository` nunca utilizado foi encontrado nesta ronda — o padrão já corrigido em fases anteriores (R-047, R-038) não se repetiu.

**Atualização 2026-08-17 00:17:** os 4 achados Críticos foram corrigidos (ver secção abaixo). 451/451 testes unitários e 51/51 e2e a passar após as correções.

**Atualização 2026-08-17 00:22:** a contagem original de "12 achados Altos" estava desalinhada com o conteúdo do relatório — a secção consolidada só listava 11, e 2 achados Altos existiam apenas nas secções "Por Módulo" (Teams, Financials) sem terem sido trazidos para a lista consolidada. Corrigido para **13 achados Altos** (contagem real após consolidação). Adicionalmente, o achado "3/5 regras de negócio e ApprovalFlow não implementadas" (Workflow) estava classificado como Crítico na secção "Por Módulo" mas como Alto na secção consolidada — resolvido a favor de Alto, por ser funcionalidade documentada não implementada e não um bypass de segurança/permissões ou perda de dados (ver definição de severidade acima de cada secção).

## Estado dos Testes

| Tipo                | Ficheiros | Testes                       | Estado            |
| ------------------- | --------- | ---------------------------- | ----------------- |
| Unitários (backend) | 35        | 439 → 451 (2026-08-17 00:17) | ✅ Todos a passar |
| E2E (backend)       | 7         | 51                           | ✅ Todos a passar |

## Achados por Severidade

### Crítico (segurança, perda/corrupção de dados, bypass de permissões)

Todos os 4 achados desta secção foram corrigidos em 2026-08-17 00:17.

- ~~**[Documents] Qualquer utilizador autenticado pode ler qualquer documento, incluindo privados.**~~ **RESOLVIDO (2026-08-17 00:17).** Não existia verificação de ownership/privacidade em `GET /documents/:id` nem em `GET /documents`. `DocumentsService.findOne`/`findAll` (e `getFileStream`, usado pelo download) passaram a receber `roles`/`userId` e aplicam a matriz da spec: Admin vê tudo; Manager vê públicos + privados da própria equipa (via `Employee.managerId`); Employee/Approver vê públicos + próprios. Documento inacessível devolve 404 (não revela existência). Evidência: `backend/src/documents/services/documents.service.ts` (`findOne`, `findAll`, `assertVisible`, `resolveVisibleOwnerIds`), `backend/src/documents/documents.controller.ts:56-90`. Testes: `documents.service.spec.ts` (`findOne (controlo de acesso)`, `findAll`).

- ~~**[Documents] Gestão de lixeira acessível a todos os papéis, spec restringe a Admin.**~~ **RESOLVIDO (2026-08-17 00:17).** `DELETE /documents/:id` e `POST /documents/:id/restore` passaram de `@Roles(ADMIN, MANAGER, EMPLOYEE)` para `@Roles(ADMIN)`. Evidência: `backend/src/documents/documents.controller.ts:86-95`.

- ~~**[Expenses] Filtro por mês usa `-31` hardcoded, quebra para meses com menos de 31 dias.**~~ **RESOLVIDO (2026-08-17 00:17).** Substituído por um helper `lastDayOfMonth(year, month)` (mesmo padrão já usado em `reports`, `capacity` e `analytics`) que calcula o último dia real do mês. Evidência: `backend/src/expenses/services/expenses.service.ts:462-464,547-555`.

- ~~**[Auth] `resetPassword` é um no-op.**~~ **RESOLVIDO (2026-08-17 00:17).** Implementado o fluxo UC-AUTH-003 completo: `resetPassword(email)` gera um token aleatório de 32 bytes, guarda o hash SHA-256 em `password_reset_tokens` com TTL de 1h, e envia email via `NotificationsService` (novo template `password-reset`). Novo endpoint `POST /auth/password/reset/confirm` (`ConfirmResetPasswordDto`) valida o token (existe, não usado, não expirado), atualiza a password, marca o token como usado e revoga todas as sessões ativas do utilizador — replica o comportamento já existente em `changePassword`. Eventos de auditoria `PASSWORD_RESET_REQUESTED`/`PASSWORD_RESET_COMPLETED` registados via `AuditService`. Evidência: `backend/src/auth/services/auth.service.ts` (`resetPassword`, `confirmResetPassword`), `backend/src/auth/auth.controller.ts:160-176`. Testes: `auth.service.spec.ts` (`resetPassword`, `confirmResetPassword`). **Nota:** BR-AUTH-006 (bloqueio de reutilização de passwords antigas) continua por implementar — ver achado Alto correspondente.

### Alto (funcionalidade documentada que não funciona; regra de negócio não aplicada)

- **[Auth] JWT usa HMAC (segredo simétrico), spec requer RS256/ES256 (assimétrico).** RNF-AUTH-003 exige RSA mínimo 2048-bit. Implementação usa `jwt.sign(payload, this.accessSecret)` com segredo partilhado. Evidência: `backend/src/auth/services/jwt.service.ts:41`. Impacto: se o segredo for comprometido, qualquer pessoa pode forjar tokens para todos os papéis.

- **[Auth] BR-AUTH-006 (verificação de reutilização de password) não implementada.** Não existe histórico de hashes anteriores. As "Notas de Implementação" reconhecem isto. Evidência: `backend/src/auth/services/auth.service.ts:263-267`. Impacto: utilizadores podem reutilizar passwords antigas.

- **[Users] @GdprSensitive existe mas não há interceptor de resposta que mascare campos sensíveis.** NIF, IBAN, birthDate, address, gender são retornados em claro em todas as respostas para qualquer utilizador autenticado. Evidência: `backend/src/users/entities/` — decorator presente, sem lógica de mascaramento. Impacto: exposição de dados pessoais sensíveis.

- **[Teams] `GET /teams/:id` não exposto no controller.** A spec lista o endpoint mas não há rota correspondente em `TeamsController` — só é possível obter uma equipa via `findAll()`. Evidência: `backend/src/teams/`. Impacto: frontend não consegue obter os detalhes de uma única equipa por ID diretamente da API. _(Achado só documentado na secção "Por Módulo" na versão original deste relatório; consolidado aqui em 2026-08-17.)_

- **[Expenses] Papel APPROVER com acesso demasiado amplo.** `GET /expenses` e `GET /expenses/export` tratam APPROVER como ADMIN/MANAGER (veem todas as despesas). A spec diz "Ver todas as despesas: Admin ✅, Manager ✅ (team), Approver ❌, Employee ❌ (own)". Evidência: `backend/src/expenses/expenses.controller.ts:48-79,91-116`. Impacto: aprovadores veem despesas de utilizadores fora do seu âmbito.

- **[Absences] Filtro `year` em `findAll()` aceite mas ignorado silenciosamente.** O parâmetro `year` é tipado no DTO mas nunca aplicado à query — retornam-se ausências de todos os anos. Evidência: `backend/src/absences/services/absences.service.ts:240-256`. Impacto: a UI filtra por ano mas recebe dados de todos os anos, causando confusão.

- **[Contracts] Valor do contrato visível para MANAGER, spec diz Admin only (GDPR).** BR-CON-005 classifica `value` como GDPR-sensível. Não existe mascaramento nem filtragem por papel — MANAGERs veem o valor de todos os contratos. Evidência: `backend/src/contracts/contracts.controller.ts:37,47` + `contracts.service.ts:56-82`. Impacto: exposição de dados financeiros a gestores sem necessidade.

- **[Workflow] 3 de 5 regras de negócio e a entidade ApprovalFlow não implementadas.** BR-WF-001 (auto-urgent), BR-WF-002 (multi-step), BR-WF-003 (bulk-approve) estão por implementar. Não existe endpoint de bulk-approve. A entidade `ApprovalFlow` não existe. Evidência: `backend/src/workflow/controllers/workflow.controller.ts` — apenas 4 endpoints (inbox, count, approve, reject). Impacto: o módulo funciona apenas como inbox simples, sem fluxos configuráveis multi-etapa que são o valor central da spec. _(A versão original deste relatório classificava este achado como Crítico na secção "Por Módulo" — corrigido aqui em 2026-08-17: é funcionalidade documentada não implementada, não um bypass de permissões/segurança nem perda de dados, pelo que a definição de severidade deste documento enquadra-o em Alto. A secção "Por Módulo" foi atualizada para condizer.)_

- **[Workflow] EMPLOYEE excluído de todos os endpoints.** Spec diz "Ver caixa de entrada" acessível a todos os papéis incluindo Colaborador. Todos os endpoints têm `@Roles(ADMIN, MANAGER, APPROVER)` sem EMPLOYEE. Evidência: `backend/src/workflow/controllers/workflow.controller.ts:37,50,61,75`. Impacto: colaboradores não conseguem ver nem responder a itens de workflow atribuídos diretamente a eles.

- **[Dashboard] Employee/APPROVER sem acesso a dados de dashboard.** Todos os endpoints de analytics são `@Roles(ADMIN, MANAGER)`. A spec diz "Próprios indicadores" acessíveis a todos os papéis. Evidência: `backend/src/analytics/controllers/analytics.controller.ts` — todos os endpoints restritos a ADMIN/MANAGER. Impacto: colaboradores e aprovadores não conseguem ver métricas de ocupação ou outras.

- **[Financials] Endpoint `financial-dashboard` e exportação PDF/Excel não implementados.** A spec define `GET /analytics/financial-dashboard` como endpoint principal e exportação PDF/Excel. Nenhum dos dois existe — funcionalidade fragmentada em endpoints individuais com export só CSV. Evidência: `backend/src/analytics/controllers/analytics.controller.ts:71-176`. Impacto: spec descreve funcionalidade que não existe.

- **[Financials] MANAGER com acesso a dados financeiros além do spec.** Endpoints de analytics financeiro não restringem MANAGER ao âmbito documentado, expondo dados financeiros fora do necessário. Evidência: `backend/src/analytics/`. Impacto: exposição de dados financeiros a gestores sem necessidade, mesmo padrão do achado equivalente em Contracts. _(Achado só documentado na secção "Por Módulo" na versão original deste relatório; consolidado aqui em 2026-08-17.)_

- **[Notifications] BR-NOT-004 (retry de email com max 3 tentativas) não implementado.** `sendEmail()` captura erros e faz log mas não tem lógica de retry. Evidência: `backend/src/notifications/services/notifications.service.ts:98-109`. Impacto: emails que falham são perdidos silenciosamente.

### Médio (código órfão, inconsistência entre módulos, gap de testes em caminho crítico)

- **[Auth] `configService` injetado mas nunca utilizado no AuthController.** Evidência: `backend/src/auth/auth.controller.ts:42`. Impacto: código morto, footprint desnecessário no construtor.

- **[Auth] Rate limiter em memória, ineficaz em multi-instância.** `RateLimitGuard` usa `Map` em memória. Evidência: `backend/src/auth/guards/rate-limit.guard.ts:17-19`. Impacto: em deploy horizontalizado, rate limiting é ineficaz.

- **[Users] BR-USR-003 (revogação de sessões na desativação) não implementada.** `DELETE /users/:id` atualiza `status` e `employmentEndDate` mas não revoga sessões ativas. Evidência: `backend/src/users/services/users.service.ts:168-181`. Impacto: utilizador desativado mantém sessões ativas até expiração natural.

- **[Teams] BR-TEAM-002 (líder deve ser membro da equipa) não validado.** Ao criar/atualizar equipa com `leader_id`, o serviço não verifica se o líder é membro ativo. Evidência: `backend/src/teams/services/teams.service.ts:30-39,60-73`. Impacto: equipa pode ter líder que não é membro.

- **[Clients] `softDelete` existe no serviço mas nunca é chamado pelo controller.** O `DELETE` chama `deactivate`, não `softDelete`. Evidência: `backend/src/clients/services/clients.service.ts:73-77`. Impacto: código morto.

- **[Clients] `GET /clients/:id/projects` retorna sempre `{ data: [] }`.** Sem integração com o módulo de projetos. Evidência: `backend/src/clients/services/clients.service.ts:79-82`. Impacto: endpoint existe mas é inútil.

- **[Projects] `ProjectTeamAllocation` importado mas nunca utilizado no service.** Entidade existe mas sem service/controller/endpoints. Evidência: `backend/src/projects/services/projects.service.spec.ts:8` importa, service não injeta. Impacto: entidade órfã (mesmo padrão de HolidayCalendar).

- **[Absences] `GET /absences/calendar` ignora parâmetro `month`.** Retorna todas as ausências aprovadas sem filtro temporal. Evidência: `backend/src/absences/controllers/absences.controller.ts:99-105`. Impacto: performance com grandes volumes de dados.

- **[Contracts] BR-CON-002 (contratos permanentes não devem ter endDate) não validado.** `create()` não verifica se `type === PERMANENT` impede `endDate`. Evidência: `backend/src/contracts/services/contracts.service.ts:34-53`. Impacto: dados inconsistentes na BD.

- **[Financials] `redisCacheService` injetado em `AnalyticsService` como `readonly` mas nunca referenciado diretamente.** O decorator `@CacheResult` pode aceder por reflexão. Evidência: `backend/src/analytics/services/analytics.service.ts:39`. Impacto: possivel código morto se o decorator não usar esta referência.

- **[Training] Colaboradores não conseguem ver as suas próprias avaliações de desempenho.** `GET /training/reviews` tem `@Roles(ADMIN, MANAGER)` — EMPLOYEE bloqueado. A spec diz "Ver avaliações: Colaborador: Própria". Evidência: `backend/src/training/controllers/training.controller.ts:79-99`. Impacto: colaboradores não acedem às suas avaliações.

- **[Training] BR-Gestão de objetivos não acessível a Colaborador.** `POST /training/reviews` e `PATCH /training/reviews/:id` requerem ADMIN/MANAGER. A spec diz "Gerir objetivos: Colaborador: Próprios". Evidência: `backend/src/training/controllers/training.controller.ts:101-118`. Impacto: colaboradores não gerem os seus OKRs.

- **[Helpdesk] `findOne` e `addComment` sem verificação de ownership.** `GET /tickets/:id` e `POST /tickets/:id/comments` não têm `@Roles` nem verificação de pertença. Qualquer utilizador pode ler/comentar em qualquer ticket. Evidência: `backend/src/helpdesk/controllers/helpdesk.controller.ts:69-73,91-98`. Impacto: fuga de informações de tickets de outros utilizadores.

- **[Audit] CSV export sem escaping.** `export()` concatena valores com vírgulas diretamente sem quoting. Campos com vírgulas/quebras de linha geram CSV malformado. Evidência: `backend/src/audit/controllers/audit.controller.ts:37-62`. Impacto: exportação de dados corrompida.

- **[Audit] BR-AUD-003 (retenção de logs) não implementado.** Logs crescem indefinidamente sem mecanismo de limpeza. Evidência: `backend/src/audit/services/audit.service.ts` — nenhum cron/limpeza. Impacto: crescimento não controlado da tabela `audit_logs`.

- **[Helpdesk] BR-HD-003 (notificação em mudanças de estado) não implementado.** Nenhum mecanismo de notificação no módulo Helpdesk. Evidência: `backend/src/helpdesk/services/helpdesk.service.ts` — sem emitEvent/notify. Impacto: utilizadores não são notificados de mudanças nos seus tickets.

### Baixo (cosmético, gap de testes em caminho não crítico, documentação desatualizada)

- **[Auth] MFA obrigatório só para Admin, spec diz Admin + Gestor (BR-AUTH-001).** Decisão P059-01 documentada, mas diverge da BR-AUTH-001.

- **[Auth] BR-AUTH-005 (timeout de sessão 30min) não implementado.** Sessões usam TTL da cache (15min) sem refresh por atividade. Decisão documentada.

- **[Users] `UpdateJobTitleDto` importado mas `PATCH /job-titles/:id` não existe no controller.** DTO morto.

- **[Timesheets] GET /timesheets/export não documentado na spec.** Adicionado durante implementação, reconhecido nas Notas.

- **[Timesheets] PATCH em vez de PUT para entries.** Escolha de implementação, documentada.

- **[Calendar] Vista mensal não suporta filtro por `employeeId`.** Limitação documentada.

- **[Calendar] Feriados mostrados sem filtro por país na vista mensal.** `getMonthView` busca todos os feriados.

- **[Calendar] GET /calendar/events e GET /calendar/blocked-periods` adicionados em P-036.** Documentados.

- **[Reports] Sem testes e2e.** Cobertura limitada a unitários.

- **[Training] Apenas 8 testes unitários.** Cobertura insuficiente para métodos como `findCourses`, `createReview`, `getCompetencyMatrix`.

- **[Helpdesk] Apenas 8 testes unitários.** Sem cobertura de `create`, `findAll`, `findOne`, `assign`, `escalate`, `close`.

- **[Audit] Sem frontend para visualização/exportação de logs.** API funcional mas sem UI.

- **[Audit] BR-AUD-005 parcialmente implementado.** Apenas mutações logadas, não leituras. Documentado como limitação.

- **[Notifications] BR-GDPR-006 (retenção de logs para auditoria) não implementado.** Partilhado com módulo Audit.

- **[Admin] PUT vs PATCH para legal entities.** Documentado como decisão de consistência.

- **[Auth] SSO callback é GET em vez de POST.** Documentado nas Notas de Implementação.

## Por Módulo

### 01 — Autenticação & Segurança

Estado: Precisa de atenção

- ~~Crítico: `resetPassword` é no-op~~ **RESOLVIDO 2026-08-17 00:17** — fluxo UC-AUTH-003 completo com token, email e endpoint de confirmação (`auth.service.ts`)
- Alto: JWT HMAC em vez de RSA (`jwt.service.ts:41`)
- Alto: BR-AUTH-006 (reutilização password) não implementado
- Médio: `configService` injetado mas não utilizado (`auth.controller.ts:42`)
- Médio: Rate limiter em memória (`rate-limit.guard.ts:17-19`)
- Baixo: MFA só Admin, não Gestor (decisão P059-01)
- Baixo: BR-AUTH-005 timeout não implementado
- Testes: ✅ Unitários (20 testes), ✅ E2E (14 cenários)
- Segurança: JwtAuthGuard presente em todos os endpoints protegidos ✅

### 02 — Utilizadores & RBAC

Estado: Precisa de atenção

- Alto: @GdprSensitive sem interceptor de mascaramento — dados expostos em claro
- Médio: BR-USR-003 (revogação de sessões) não implementada (`users.service.ts:168-181`)
- Médio: Gestor pode editar qualquer employee, não só da equipa
- Baixo: `UpdateJobTitleDto` importado sem endpoint correspondente
- Testes: ✅ Unitários (Users + RBAC), ❌ Sem e2e
- Segurança: JwtAuthGuard + RolesGuard presentes ✅

### 03 — Equipas & Organograma

Estado: Achados menores

- Alto: `GET /teams/:id` não exposto no controller
- Médio: BR-TEAM-002 (líder deve ser membro) não validado
- Testes: ✅ Unitários (9 testes), ❌ Sem e2e

### 04 — Clientes

Estado: Achados menores

- Médio: `softDelete` morto no service (`clients.service.ts:73-77`)
- Médio: `GET /clients/:id/projects` retorna sempre vazio (`clients.service.ts:79-82`)
- Testes: ✅ Unitários (8 testes), ❌ Sem e2e

### 05 — Projetos

Estado: Achados menores

- Médio: `ProjectTeamAllocation` entity importada mas não utilizada
- Médio: Upload de documentos e vista calendário não implementados
- Testes: ✅ Unitários (7 testes), ✅ E2E
- Segurança: JwtAuthGuard + RolesGuard presentes ✅

### 06 — Capacidade & Alocação

Estado: OK

- Nenhum achado significativo. Todos os endpoints, permissões e regras de negócio alinhados com a spec. Todas as dependências injetadas são utilizadas.
- Testes: ✅ Unitários (8 testes), ❌ Sem e2e

### 07 — Assiduidade & Timesheets

Estado: Achados menores

- Baixo: GET /timesheets/export não documentado na spec (adicionado em implementação)
- Baixo: PATCH em vez de PUT para entries
- Testes: ✅ Unitários (13 testes), ✅ E2E
- Segurança: JwtAuthGuard + RolesGuard presentes ✅

### 08 — Ausências

Estado: Precisa de atenção

- Alto: Filtro `year` em `findAll()` aceite mas ignorado (`absences.service.ts:240-256`)
- Médio: `GET /absences/calendar` ignora parâmetro `month` (`absences.controller.ts:99-105`)
- Testes: ✅ Unitários (29 testes), ✅ E2E (2 ficheiros)
- Segurança: JwtAuthGuard + RolesGuard presentes ✅

### 09 — Despesas & Reembolsos

Estado: Precisa de atenção

- ~~Crítico: Filtro por mês com `-31` hardcoded~~ **RESOLVIDO 2026-08-17 00:17** (`expenses.service.ts:462-464`)
- Alto: APPROVER com acesso demasiado amplo (`expenses.controller.ts:48-79,91-116`)
- Testes: ✅ Unitários (16 testes), ❌ Sem e2e
- Segurança: JwtAuthGuard + RolesGuard presentes ✅

### 10 — Gestão Documental

Estado: Achados menores (críticos resolvidos)

- ~~Crítico: Sem verificação de ownership/privacidade~~ **RESOLVIDO 2026-08-17 00:17** (`documents.service.ts`)
- ~~Crítico: Lixeira acessível a todos, spec diz Admin only~~ **RESOLVIDO 2026-08-17 00:17** (`documents.controller.ts:86-95`)
- Testes: ✅ Unitários (20 testes), ❌ Sem e2e
- Segurança: JwtAuthGuard presente ✅, controlo de acesso por ownership/equipa implementado ✅

### 11 — Contratos

Estado: Achados menores

- Alto: Valor do contrato exposto a MANAGER, spec diz Admin only (GDPR) (`contracts.controller.ts:37,47`)
- Médio: BR-CON-002 (permanent contracts sem endDate) não validado
- Testes: ✅ Unitários (7 testes), ❌ Sem e2e
- Segurança: JwtAuthGuard + RolesGuard presentes ✅

### 12 — Workflow & Caixa de Entrada

Estado: Precisa de atenção

- Alto: 3/5 regras de negócio e ApprovalFlow não implementados (corrigido de "Crítico" para "Alto" em 2026-08-17 — ver nota na secção consolidada)
- Alto: EMPLOYEE excluído de todos os endpoints
- Testes: ✅ Unitários (27 testes), ❌ Sem e2e

### 13 — Calendário Organizacional

Estado: OK (achados menores)

- Baixo: Vista mensal sem filtro por employeeId
- Baixo: Feriados sem filtro por país na vista mensal
- Testes: ✅ Unitários (6 testes), ❌ Sem e2e

### 14 — Relatórios

Estado: OK (achados menores)

- Baixo: Sem testes e2e
- Baixo: Audit report pode expor PII (admin only, aceitável)
- Testes: ✅ Unitários (11 testes), ❌ Sem e2e
- Segurança: Scoping por papel implementado via `resolveEmployeeScope()` ✅

### 15 — Dashboard de Recursos

Estado: Precisa de atenção

- Alto: Employee/APPROVER sem acesso a dados de dashboard
- Médio: Sem endpoint de alertas nem indicadores específicos (ausências do dia, contratos a expirar)
- Testes: ✅ Unitários (15 testes), ❌ Sem e2e

### 16 — Dashboard Financeiro

Estado: Precisa de atenção

- Alto: Endpoint `financial-dashboard` e export PDF/Excel não implementados
- Alto: MANAGER com acesso a dados financeiros além do spec
- Médio: `redisCacheService` possivelmente morto (`analytics.service.ts:39`)
- Testes: ✅ Unitários (10 testes), ❌ Sem e2e

### 17 — Políticas Internas

Estado: OK

- Nenhum achado significativo. Todos os endpoints, permissões e regras de negócio alinhados.
- Testes: ✅ Unitários (18 testes), ❌ Sem e2e

### 18 — Formação & Talento

Estado: Precisa de atenção

- Alto: Colaboradores bloqueados de ver as suas avaliações (`training.controller.ts:79-99`)
- Médio: Colaboradores bloqueados de gerir objetivos (`training.controller.ts:101-118`)
- Médio: Apenas 8 testes unitários
- Testes: ✅ Unitários (8 testes), ❌ Sem e2e

### 19 — Helpdesk Interno

Estado: Achados menores

- Médio: `findOne` e `addComment` sem verificação de ownership (`helpdesk.controller.ts:69-73,91-98`)
- Médio: BR-HD-003 (notificação em mudanças de estado) não implementado
- Médio: Apenas 8 testes unitários
- Testes: ✅ Unitários (8 testes), ❌ Sem e2e

### 20 — Notificações & Alertas

Estado: Achados menores

- Alto: BR-NOT-004 (retry de email) não implementado
- Médio: Cobertura de testes limitada (10 testes, sem handlers de eventos)
- Testes: ✅ Unitários (10 testes), ❌ Sem e2e

### 21 — Auditoria

Estado: Achados menores

- Médio: BR-AUD-003 (retenção de logs) não implementado
- Médio: BR-AUD-005 parcial (só mutações, não leituras)
- Médio: CSV export sem escaping
- Médio: Sem frontend para visualização
- Testes: ✅ Unitários (8+11 testes), ❌ Sem e2e

### 22 — GDPR & Conformidade

Estado: OK (achados menores)

- Médio: BR-GDPR-006 (retenção para auditoria) não implementado
- Baixo: BR-GDPR-002 parcial (revogação sem enforcement downstream)
- Testes: ✅ Unitários (496 linhas), ✅ E2E
- Segurança: JwtAuthGuard + RolesGuard presentes ✅

### 23 — Administração do Sistema

Estado: OK

- Nenhum achado significativo. Todos os endpoints e permissões alinhados.
- Testes: ✅ Unitários (14 testes), ❌ Sem e2e
- Segurança: JwtAuthGuard + RolesGuard presentes em endpoints protegidos, health/metrics públicos corretamente ✅

## Achados Transversais

### Padrão: Permissões mais largas que a spec

Encontrado em **6 módulos** (Expenses, Documents, Contracts, Dashboard, Financials, Training): endpoints com `@Roles` que incluem papéis que a spec não autoriza ou excluem papéis que a spec inclui. O padrão mais comum é Manager/APPROVER com acesso mais amplo do que documentado. Isto pode ser uma decisão de produto legítima (simplificar permissões para a v1) ou um gap de implementação — requer confirmação do produto.

### Padrão: Rotas com verificação de ownership inconsistente

Documents, Helpdesk e Contracts não verificam pertença do utilizador ao recurso. Outros módulos (Absences, Timesheets, Expenses) usam `EmployeeIdentityService` para resolver o Employee.id e comparar. O padrão não está uniforme.

### Padrão: Falta de testes e2e em módulos com backend maduro

15 dos 23 módulos não têm testes e2e. Os 8 módulos com e2e são: Auth, Projects, Timesheets, Absences, Expenses (parcial), GDPR, Reports (unit only), Capacity (unit only). Módulos financeiros e de workflow ficam sem validação end-to-end.

## Falsos Positivos Descartados

- **companyName/sessionTimeoutMinutes deliberadamente não ligados** — Decisão P053-04, documentada como gap aceite.
- **LegalEntity fora de Employee/Contract até P-069** — Decisão P029-04, superseded em P-069-02.
- **HolidayCalendar não removida da BD** — Fora do âmbito de P-071, confirmado com o utilizador.
- **API Keys não implementados** — Spec lista mas nunca foi priorizado; sem data de implementação.
- **PUT vs PATCH em vários módulos** — Decisão de consistência de implementação, documentada em specs individuais.
- **SSO callback GET vs POST** — Documentado nas Notas de Implementação do módulo Auth.
- **Bulk-approve de timesheets existe em Absences (não Workflow)** — `bulkApprove` em Timesheets é diferente do bulk-approve de Workflow da spec.
- **BR-AUTH-001 MFA só Admin** — Decisão P059-01 documentada explicitamente.

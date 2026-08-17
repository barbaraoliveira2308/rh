# Relatório de Auditoria — HR Suite (2026-08-16)

## Resumo Executivo

Auditoria completa dos 23 módulos do sistema HR Suite, comparando especificações técnicas com código real. Estado atual: 439/439 testes unitários a passar, 51/51 testes e2e a passar. Foram encontrados **4 achados Críticos**, **13 achados Altos**, **24 achados Médios** e **14 achados Baixos**. O padrão mais comum são permissões de controlo de acesso desalinhadas da spec (Managers/Approvers com acesso mais amplo do que documentado) e funcionalidade documentada na spec mas não implementada (Password reset, API Keys, bulk-approve workflow, flusos multi-etapa). Nenhum código órfão do tipo `@InjectRepository` nunca utilizado foi encontrado nesta ronda — o padrão já corrigido em fases anteriores (R-047, R-038) não se repetiu.

**Atualização 2026-08-17 00:17:** os 4 achados Críticos foram corrigidos (ver secção abaixo). 451/451 testes unitários e 51/51 e2e a passar após as correções.

**Atualização 2026-08-17 00:22:** a contagem original de "12 achados Altos" estava desalinhada com o conteúdo do relatório — a secção consolidada só listava 11, e 2 achados Altos existiam apenas nas secções "Por Módulo" (Teams, Financials) sem terem sido trazidos para a lista consolidada. Corrigido para **13 achados Altos** (contagem real após consolidação). Adicionalmente, o achado "3/5 regras de negócio e ApprovalFlow não implementadas" (Workflow) estava classificado como Crítico na secção "Por Módulo" mas como Alto na secção consolidada — resolvido a favor de Alto, por ser funcionalidade documentada não implementada e não um bypass de segurança/permissões ou perda de dados (ver definição de severidade acima de cada secção).

**Atualização 2026-08-17 00:40:** contagens de Médios e Baixos também estavam desalinhadas com o conteúdo real do relatório. Duas causas: (1) 6 achados existiam só na secção "Por Módulo", nunca trazidos para a lista consolidada — [Users] Gestor edita qualquer employee, [Projects] upload/calendário não implementados, [Dashboard] sem endpoint de alertas, [Notifications] cobertura de testes limitada (todos Médio), [Reports] PII em relatório e [GDPR] BR-GDPR-002 parcial (Baixo) — mesmo tipo de gap já corrigido para os Altos em 2026-08-17 00:22; (2) 4 achados tinham severidade diferente entre as duas secções — Training/Helpdesk "apenas 8 testes unitários" e Audit BR-AUD-005 estavam Médio em "Por Módulo" mas Baixo na consolidada, e BR-GDPR-006 estava atribuído ao módulo errado ([Notifications] em vez de [GDPR]) e também como Baixo. Resolvido a favor de Médio nestes 4 casos — gap de testes em caminho crítico / regra de negócio de auditoria parcialmente aplicada, conforme a definição de severidade de cada secção, mesmo padrão já usado para BR-AUD-003/BR-CON-002/BR-TEAM-002 — exceto **[Audit] Sem frontend para visualização**, mantido Baixo (limitação cosmética de UI, não gap de testes nem inconsistência de código), cuja classificação em "Por Módulo" foi corrigida de Médio para Baixo para condizer. Corrigido para **24 achados Médios** e **14 achados Baixos** (52 → 55 achados no total).

**Atualização 2026-08-17 08:57 (P-073):** 7 dos 13 achados Altos foram corrigidos — o grupo de "scoping/permissões" (Teams, Expenses, Absences, Contracts, Workflow, Financials `MANAGER`) mais o `Dashboard` (resolvido parcialmente — novo endpoint `my-occupancy`, os 3 endpoints agregados por equipa mantêm-se `ADMIN`/`MANAGER`). 453/453 testes unitários e 51/51 e2e a passar após as correções. **Restam 6 achados Altos** (todos "funcionalidade a construir", maiores): Auth (JWT RS256, BR-AUTH-006), Users (mascaramento `@GdprSensitive`), Workflow (`ApprovalFlow` multi-etapa), Financials (`financial-dashboard`+export), Notifications (BR-NOT-004).

**Atualização 2026-08-17 09:13 (P-074):** o achado "[Financials] Endpoint `financial-dashboard` e exportação PDF/Excel não implementados" foi resolvido parcialmente — investigação revelou âmbito maior do que estimado (só 2 de 6 KPIs da spec têm cálculo, `cost_center` não existe no schema, `Q-FIN-001` a `Q-FIN-005` continuam por resolver); escolhido com o utilizador (decisão P074-01) o âmbito mínimo — só exportação PDF/Excel dos 4 endpoints financeiros já existentes, reaproveitando `ReportExportersService` do módulo Reports. O endpoint `financial-dashboard` consolidado e os 4 KPIs sem cálculo continuam por implementar. **Restam 5 achados Altos** (Auth JWT RS256, Auth BR-AUTH-006, Users `@GdprSensitive`, Workflow `ApprovalFlow`, Notifications BR-NOT-004).

**Atualização 2026-08-17 09:52 (P-075):** o achado "[Auth] BR-AUTH-006 (verificação de reutilização de password) não implementada" foi corrigido — nova tabela `hr.password_history`, janela deslizante das últimas 5 passwords (atual + 4 históricas), aplicada em `changePassword()` e `confirmResetPassword()`. 457/457 testes unitários e 51/51 e2e a passar após a correção. **Restam 4 achados Altos**: Auth (JWT HMAC→RS256, mudança de infraestrutura maior), Users (mascaramento `@GdprSensitive`), Workflow (`ApprovalFlow` multi-etapa), Notifications (BR-NOT-004).

**Atualização 2026-08-17 (P-076):** o achado "[Auth] JWT usa HMAC, spec requer RS256/ES256" foi corrigido — access e refresh tokens passam a ser assinados com RS256 (RSA 2048-bit), cada um com o seu próprio par de chaves. Âmbito escolhido com o utilizador (decisão P076-00): só a troca de algoritmo, sem construir suporte a rotação de chaves (RNF-AUTH-004, registado como `R-049`, gap novo e distinto deste achado). 457/457 testes unitários (inalterado) e 51/51 e2e a passar após a correção; verificação em ambiente real completa (login, `/auth/me`, refresh, token adulterado corretamente rejeitado). **Restam 3 achados Altos**: Users (mascaramento `@GdprSensitive`), Workflow (`ApprovalFlow` multi-etapa), Notifications (BR-NOT-004).

## Estado dos Testes

| Tipo                | Ficheiros | Testes                                                                         | Estado            |
| ------------------- | --------- | ------------------------------------------------------------------------------ | ----------------- |
| Unitários (backend) | 35        | 439 → 451 (2026-08-17 00:17) → 453 (2026-08-17 08:57) → 457 (2026-08-17 09:52) | ✅ Todos a passar |
| E2E (backend)       | 7         | 51                                                                             | ✅ Todos a passar |

## Achados por Severidade

### Crítico (segurança, perda/corrupção de dados, bypass de permissões)

Todos os 4 achados desta secção foram corrigidos em 2026-08-17 00:17.

- ~~**[Documents] Qualquer utilizador autenticado pode ler qualquer documento, incluindo privados.**~~ **RESOLVIDO (2026-08-17 00:17).** Não existia verificação de ownership/privacidade em `GET /documents/:id` nem em `GET /documents`. `DocumentsService.findOne`/`findAll` (e `getFileStream`, usado pelo download) passaram a receber `roles`/`userId` e aplicam a matriz da spec: Admin vê tudo; Manager vê públicos + privados da própria equipa (via `Employee.managerId`); Employee/Approver vê públicos + próprios. Documento inacessível devolve 404 (não revela existência). Evidência: `backend/src/documents/services/documents.service.ts` (`findOne`, `findAll`, `assertVisible`, `resolveVisibleOwnerIds`), `backend/src/documents/documents.controller.ts:56-90`. Testes: `documents.service.spec.ts` (`findOne (controlo de acesso)`, `findAll`).

- ~~**[Documents] Gestão de lixeira acessível a todos os papéis, spec restringe a Admin.**~~ **RESOLVIDO (2026-08-17 00:17).** `DELETE /documents/:id` e `POST /documents/:id/restore` passaram de `@Roles(ADMIN, MANAGER, EMPLOYEE)` para `@Roles(ADMIN)`. Evidência: `backend/src/documents/documents.controller.ts:86-95`.

- ~~**[Expenses] Filtro por mês usa `-31` hardcoded, quebra para meses com menos de 31 dias.**~~ **RESOLVIDO (2026-08-17 00:17).** Substituído por um helper `lastDayOfMonth(year, month)` (mesmo padrão já usado em `reports`, `capacity` e `analytics`) que calcula o último dia real do mês. Evidência: `backend/src/expenses/services/expenses.service.ts:462-464,547-555`.

- ~~**[Auth] `resetPassword` é um no-op.**~~ **RESOLVIDO (2026-08-17 00:17).** Implementado o fluxo UC-AUTH-003 completo: `resetPassword(email)` gera um token aleatório de 32 bytes, guarda o hash SHA-256 em `password_reset_tokens` com TTL de 1h, e envia email via `NotificationsService` (novo template `password-reset`). Novo endpoint `POST /auth/password/reset/confirm` (`ConfirmResetPasswordDto`) valida o token (existe, não usado, não expirado), atualiza a password, marca o token como usado e revoga todas as sessões ativas do utilizador — replica o comportamento já existente em `changePassword`. Eventos de auditoria `PASSWORD_RESET_REQUESTED`/`PASSWORD_RESET_COMPLETED` registados via `AuditService`. Evidência: `backend/src/auth/services/auth.service.ts` (`resetPassword`, `confirmResetPassword`), `backend/src/auth/auth.controller.ts:160-176`. Testes: `auth.service.spec.ts` (`resetPassword`, `confirmResetPassword`). **Nota:** BR-AUTH-006 (bloqueio de reutilização de passwords antigas) continua por implementar — ver achado Alto correspondente.

### Alto (funcionalidade documentada que não funciona; regra de negócio não aplicada)

- ~~**[Auth] JWT usa HMAC (segredo simétrico), spec requer RS256/ES256 (assimétrico).**~~ **RESOLVIDO (2026-08-17, P-076).** `JwtService.generateAccessToken()`/`generateRefreshToken()` passam a assinar com `algorithm: 'RS256'` (RSA 2048-bit); `verifyAccessToken()`/`verifyRefreshToken()` passam a verificar com a chave pública correspondente (`algorithms: ['RS256']`), rejeitando qualquer outro algoritmo. Access e refresh mantêm a separação já existente em 2 pares de chaves distintos (`JWT_ACCESS_PRIVATE_KEY`/`PUBLIC_KEY`, `JWT_REFRESH_PRIVATE_KEY`/`PUBLIC_KEY`), codificados em base64 (PEM tem quebras de linha, incompatível com o formato de uma linha do `.env`); `scripts/generate-secrets.sh` gera os 2 pares via `openssl genrsa`/`openssl rsa -pubout`. **Não implementado, âmbito consciente (decisão P076-00):** RNF-AUTH-004 (rotação de chaves sem downtime) — sem JWKS nem suporte a múltiplas chaves ativas (`kid`); rodar uma chave privada invalida imediatamente todas as sessões ativas (decisão P076-03, aceite pelo utilizador). Novo risco `R-049` documenta este gap. Evidência: `backend/src/auth/services/jwt.service.ts`. Testes: `jwt.service.spec.ts` (14 cenários, chaves de teste geradas via `crypto.generateKeyPairSync`). **Verificação em ambiente real completa**: login real do admin devolveu token com header `{"alg":"RS256","typ":"JWT"}`; `GET /auth/me` e `POST /auth/refresh` com o token real (200); token adulterado corretamente rejeitado (401, prova que a assinatura RSA é validada, não só o formato); `.env` de desenvolvimento rodado para as novas chaves, backend reiniciado.

- ~~**[Auth] BR-AUTH-006 (verificação de reutilização de password) não implementada.**~~ **RESOLVIDO (2026-08-17 09:52).** Nova tabela `hr.password_history` (migração `1834000000000-CreatePasswordHistoryTable.ts`) guarda as 4 passwords mais recentes por utilizador; combinada com a password ativa forma o pool das "últimas 5" (decisão P075-01, a atual conta como uma das 5, escolhida entre o utilizador entre essa opção e "5 anteriores + atual = 6"). `AuthService.ensurePasswordNotReused()` valida contra esse pool em `changePassword()` e `confirmResetPassword()` (os 2 pontos onde um utilizador define uma nova password); `recordPasswordHistory()` arquiva a password antiga só depois da alteração ter sucesso, com poda para manter só as 4 entradas mais recentes (janela deslizante — a password mais antiga sai do pool assim que uma 5ª mudança acontece). Evidência: `backend/src/auth/services/auth.service.ts`, `backend/src/auth/entities/password-history.entity.ts`. Testes: `auth.service.spec.ts` (`changePassword`, `confirmResetPassword`, 5 novos). **Verificação em ambiente real completa**: utilizador de teste real fez 6 alterações de password sequenciais — reutilizar a password imediatamente anterior ou a password 2 posições atrás foi corretamente rejeitado (400); reutilizar a própria password atual (sem alterar nada) também rejeitado; a 1ª password (`FirstPass1!`), já fora da janela das últimas 5 ao fim da 6ª alteração, foi corretamente aceite de novo; o mesmo teste repetido via `POST /auth/password/reset/confirm` (token de reset real, gerado e validado via SHA-256) confirmou a mesma validação nesse fluxo. Dados de teste eliminados (utilizador, histórico, tokens de reset, `hr.audit_logs`) no fecho da sessão.

- **[Users] @GdprSensitive existe mas não há interceptor de resposta que mascare campos sensíveis.** NIF, IBAN, birthDate, address, gender são retornados em claro em todas as respostas para qualquer utilizador autenticado. Evidência: `backend/src/users/entities/` — decorator presente, sem lógica de mascaramento. Impacto: exposição de dados pessoais sensíveis.

- ~~**[Teams] `GET /teams/:id` não exposto no controller.**~~ **RESOLVIDO (2026-08-17 08:57).** Novo `GET teams/:id` em `TeamsController`, reaproveitando o `TeamsService.findOne()` já existente (usado internamente por `update`/`addMember`/etc.). Mesmos 4 papéis (`ADMIN`, `MANAGER`, `APPROVER`, `EMPLOYEE`) e sem scoping adicional, seguindo o padrão já usado pelos outros `GET` do mesmo controller (`GET teams`, `GET teams/:id/members`, `GET teams/:id/capacity`). Evidência: `backend/src/teams/teams.controller.ts`. Verificado em ambiente real: `GET /teams/:id` devolve 200 para ADMIN e EMPLOYEE, 404 para id inexistente.

- ~~**[Expenses] Papel APPROVER com acesso demasiado amplo.**~~ **RESOLVIDO (2026-08-17 08:57).** `GET /expenses` e `GET /expenses/export` deixaram de tratar APPROVER como ADMIN/MANAGER — `isAdminOrManager` passou a considerar só `ADMIN`/`MANAGER`; APPROVER cai no mesmo ramo de scoping "própria" já usado para EMPLOYEE. Adicionalmente, `GET /expenses/export` tinha `@Roles(ADMIN, MANAGER, APPROVER)` sem `EMPLOYEE`, contrariando a linha "Exportar despesas: Colaborador ✅ (próprias)" da mesma tabela de permissões — corrigido para `@Roles(ADMIN, MANAGER, EMPLOYEE)` (APPROVER, que a spec marca ❌ mesmo para "próprias" neste endpoint, perde acesso à rota). Evidência: `backend/src/expenses/expenses.controller.ts`. Verificado em ambiente real: APPROVER em `GET /expenses` só vê o próprio relatório (não o de outro colaborador); `GET /expenses/export` devolve 403 para APPROVER e 200 para EMPLOYEE (antes o inverso).

- ~~**[Absences] Filtro `year` em `findAll()` aceite mas ignorado silenciosamente.**~~ **RESOLVIDO (2026-08-17 08:57).** A spec não documenta este parâmetro para este endpoint nem define semântica de "ausência no ano X" — decisão tomada com o utilizador (P073-01): overlap entre `[startDate, endDate]` e o ano pedido (`startDate <= 31-Dez-X` AND `endDate >= 1-Jan-X`), em vez de só `startDate.getFullYear() === X`, para não excluir ausências que atravessem a virada do ano. Evidência: `backend/src/absences/services/absences.service.ts` (`findAll`). Testes: `absences.service.spec.ts` (`findAll`). Verificado em ambiente real: duas ausências reais (2025 e 2026) — `?year=2026` e `?year=2025` devolveram cada uma só a sua.

- ~~**[Contracts] Valor do contrato visível para MANAGER, spec diz Admin only (GDPR).**~~ **RESOLVIDO (2026-08-17 08:57).** `value` passa a ser mascarado (`null`) para quem não é ADMIN em `GET /contracts` e `GET /contracts/:id` — âmbito mínimo escolhido com o utilizador (P073-02): só mascarar, sem abrir as rotas a APPROVER/EMPLOYEE (que hoje não têm acesso nenhum a estas rotas, apesar da linha "Ver próprio contrato (sem valor)" da spec cobrir os 4 papéis — gap adjacente identificado mas deixado fora do âmbito desta correção, ver `specs/GLOBAL-TASKS-RISKS.md`). Sem precedente de masking de campo já existente no backend (`@GdprSensitive` só mascara logs de auditoria, não respostas de API) — implementado com um helper `maskContractValue()` no controller. Evidência: `backend/src/contracts/contracts.controller.ts`. Verificado em ambiente real: `value` visível para ADMIN, `null` para MANAGER, tanto em `GET /contracts/:id` como em `GET /contracts`.

- **[Workflow] 3 de 5 regras de negócio e a entidade ApprovalFlow não implementadas.** BR-WF-001 (auto-urgent), BR-WF-002 (multi-step), BR-WF-003 (bulk-approve) estão por implementar. Não existe endpoint de bulk-approve. A entidade `ApprovalFlow` não existe. Evidência: `backend/src/workflow/controllers/workflow.controller.ts` — apenas 4 endpoints (inbox, count, approve, reject). Impacto: o módulo funciona apenas como inbox simples, sem fluxos configuráveis multi-etapa que são o valor central da spec. _(A versão original deste relatório classificava este achado como Crítico na secção "Por Módulo" — corrigido aqui em 2026-08-17: é funcionalidade documentada não implementada, não um bypass de permissões/segurança nem perda de dados, pelo que a definição de severidade deste documento enquadra-o em Alto. A secção "Por Módulo" foi atualizada para condizer.)_

- ~~**[Workflow] EMPLOYEE excluído de todos os endpoints.**~~ **RESOLVIDO (2026-08-17 08:57).** `GET /workflow/inbox` e `GET /workflow/inbox/count` passaram a incluir `RoleEnum.EMPLOYEE` em `@Roles()` (mantendo `approve`/`reject` sem EMPLOYEE, que a spec marca ❌). Não foi necessária lógica de scoping nova — `WorkflowService.findInbox()`/`countPending()` já filtram por `assigneeId === employeeId do chamador`. Evidência: `backend/src/workflow/workflow.controller.ts`. Verificado em ambiente real: EMPLOYEE passou a receber 200 (antes 403) em `inbox`/`inbox/count`; `approve` continua 403 para EMPLOYEE; item de workflow real gerado por um pedido de ausência apareceu na caixa do MANAGER (`assigneeId`), não na do EMPLOYEE que o submeteu — scoping intacto.

- ~~**[Dashboard] Employee/APPROVER sem acesso a dados de dashboard.**~~ **RESOLVIDO PARCIALMENTE (2026-08-17 08:57).** Nenhum dos 3 endpoints de recursos (`occupancy`/`unallocated`/`forecast`) tinha noção de "próprio" — todos agregados por equipa ou globais; abrir o `@Roles()` sem lógica nova exporia dados de qualquer equipa a qualquer colaborador. Decisão com o utilizador (P073-03): novo `GET analytics/resources/my-occupancy`, aberto aos 4 papéis, que resolve o `employeeId` do próprio chamador (`EmployeeIdentityService`, padrão de P-045/P-071) e reaproveita `AnalyticsService.getEmployeeOccupancy()` — método já existente mas sem rota nenhuma até agora. Os 3 endpoints agregados mantêm-se `ADMIN`/`MANAGER`-only (correspondem a "dashboard da equipa", não a "próprios indicadores"). Evidência: `backend/src/analytics/analytics.controller.ts`. Verificado em ambiente real: `GET /analytics/resources/my-occupancy` devolve 200 para EMPLOYEE com os seus próprios dados.

- ~~**[Financials] Endpoint `financial-dashboard` e exportação PDF/Excel não implementados.**~~ **RESOLVIDO PARCIALMENTE (2026-08-17 09:13).** Investigação revelou âmbito maior do que o achado sugeria — dos 6 KPIs da spec, só 2 (margem, receita) têm cálculo implementado; `cost_center` (um dos 6 filtros exigidos) não existe em lado nenhum do schema (`Q-FIN-003` continua por resolver); os 4 métodos de `AnalyticsService` têm assinaturas de filtro incompatíveis entre si, nenhum aceita os filtros da spec. Apresentadas 3 opções ao utilizador (decisão P074-01) — **escolhido o âmbito mínimo**: só a exportação PDF/Excel dos 4 endpoints já existentes (`margins`/`project/:id/profitability`/`revenue`/`top-projects`), reaproveitando `ReportExportersService` (já usado pelo módulo Reports, `generateExcel`/`generatePdf`, 100% genérico — tabela de linhas+colunas). `sendResponse()` do controller passa a aceitar `format=xlsx|pdf` a par do `csv`/JSON já existentes, com colunas definidas por endpoint; endpoints sem configuração de export (os 3 de `resources`) devolvem `400` claro se pedido `pdf`/`xlsx`, em vez de falhar silenciosamente. **Não implementado nesta sessão** (âmbito explicitamente fora): o endpoint `GET /analytics/financial-dashboard` consolidado da spec, e os 4 KPIs sem cálculo (custo por colaborador, despesas pendentes, horas não faturáveis, `cost_center`) — candidatos a uma sessão futura maior, ver `Q-FIN-001` a `Q-FIN-005` em `specs/financials/SPEC.md`. Evidência: `backend/src/analytics/analytics.controller.ts`, `backend/src/analytics/analytics.module.ts`. **Verificação em ambiente real completa**: `GET .../revenue?format=xlsx` devolveu um `.xlsx` real válido (confirmado via `file`/inspeção do zip); `GET .../top-projects?format=pdf` devolveu um `.pdf` real válido (confirmado via `file`/`pdftotext`, título e colunas corretos); `.../margins?format=pdf` e `.../project/:id/profitability?format=xlsx` idem; `.../resources/occupancy?format=pdf` (endpoint sem export configurado) devolveu `400` limpo; `csv`/JSON sem `format` continuam a funcionar sem alteração.

- ~~**[Financials] MANAGER com acesso a dados financeiros além do spec.**~~ **RESOLVIDO (2026-08-17 08:57).** A tabela de permissões só dá ✅ a MANAGER em "Ver custos da própria equipa" — nenhum dos 4 endpoints reais (`margins`/`project/:id/profitability`/`revenue`/`top-projects`) corresponde a isso nem filtra por equipa do gestor. Decisão com o utilizador (P073-04): literal à spec — os 4 endpoints passaram de `@Roles(ADMIN, MANAGER)` para `@Roles(ADMIN)`. (Scoping por equipa para MANAGER ficou de fora, candidato a funcionalidade nova numa fase futura se houver razão de produto.) Evidência: `backend/src/analytics/analytics.controller.ts`. Verificado em ambiente real: os 4 endpoints devolvem 403 para MANAGER e 200 para ADMIN. Confirmado que o frontend já tratava `/analytics/financials` como rota admin-only (`adminOnlyRoutes` em `frontend/src/layouts/AppLayout.tsx`) — o backend estava a ficar atrás do que a UI já assumia, sem impacto em utilizadores reais.

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

- **[Users] Gestor pode editar qualquer employee, não só da equipa.** Não existe restrição de âmbito em `PATCH /users/:id` para o papel MANAGER. Evidência: `backend/src/users/`. Impacto: um gestor pode alterar dados de colaboradores fora do seu âmbito de gestão. _(Achado só documentado na secção "Por Módulo" na versão original deste relatório; consolidado aqui em 2026-08-17.)_

- **[Projects] Upload de documentos e vista calendário não implementados.** Funcionalidade descrita na spec do módulo sem implementação correspondente. Evidência: `backend/src/projects/`. Impacto: gap funcional face à spec. _(Achado só documentado na secção "Por Módulo" na versão original deste relatório; consolidado aqui em 2026-08-17.)_

- **[Dashboard] Sem endpoint de alertas nem indicadores específicos (ausências do dia, contratos a expirar).** Evidência: `backend/src/analytics/controllers/analytics.controller.ts`. Impacto: indicadores documentados na spec indisponíveis. _(Achado só documentado na secção "Por Módulo" na versão original deste relatório; consolidado aqui em 2026-08-17.)_

- **[Notifications] Cobertura de testes limitada (10 testes, sem handlers de eventos).** Evidência: `backend/src/notifications/`. Impacto: gap de testes num caminho crítico (handlers de eventos disparam notificações reais). _(Achado só documentado na secção "Por Módulo" na versão original deste relatório; consolidado aqui em 2026-08-17.)_

- **[GDPR] BR-GDPR-006 (retenção de logs para auditoria) não implementado.** Partilhado com módulo Audit (ver BR-AUD-003 acima). Evidência: `backend/src/gdpr/`. Impacto: regra de negócio de retenção não aplicada. _(Na versão original deste relatório este achado estava incorretamente atribuído a [Notifications] e classificado como Baixo na secção consolidada; corrigido em 2026-08-17 — o módulo correto é GDPR (nome da regra BR-GDPR-006), conforme já indicado corretamente na secção "Por Módulo", e a severidade foi alinhada com o padrão já usado para outras regras de negócio não aplicadas neste relatório — ex. BR-AUD-003, BR-CON-002, BR-TEAM-002, todas Médio.)_

- **[Training] Apenas 8 testes unitários.** Cobertura insuficiente para métodos como `findCourses`, `createReview`, `getCompetencyMatrix` — caminho crítico (submissão/gestão de avaliações). _(Classificado como Baixo na secção consolidada original deste relatório mas como Médio na secção "Por Módulo"; corrigido aqui em 2026-08-17 a favor de Médio — gap de testes em caminho crítico, conforme a definição de severidade desta secção.)_

- **[Helpdesk] Apenas 8 testes unitários.** Sem cobertura de `create`, `findAll`, `findOne`, `assign`, `escalate`, `close` — ciclo de vida completo do ticket, caminho crítico. _(Classificado como Baixo na secção consolidada original deste relatório mas como Médio na secção "Por Módulo"; corrigido aqui em 2026-08-17 a favor de Médio, mesma razão do achado equivalente em Training.)_

- **[Audit] BR-AUD-005 parcialmente implementado.** Apenas mutações logadas, não leituras. Evidência: `backend/src/audit/`. _(Classificado como Baixo na secção consolidada original deste relatório mas como Médio na secção "Por Módulo"; corrigido aqui em 2026-08-17 a favor de Médio — regra de negócio de auditoria parcialmente aplicada, mesmo padrão de BR-AUD-003 acima, já Médio.)_

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

- **[Audit] Sem frontend para visualização/exportação de logs.** API funcional mas sem UI.

- **[Admin] PUT vs PATCH para legal entities.** Documentado como decisão de consistência.

- **[Auth] SSO callback é GET em vez de POST.** Documentado nas Notas de Implementação.

- **[Reports] Audit report pode expor PII (admin only, aceitável).** Evidência: `backend/src/reports/`. Impacto: baixo, risco aceite (acesso já restrito a Admin). _(Achado só documentado na secção "Por Módulo" na versão original deste relatório; consolidado aqui em 2026-08-17.)_

- **[GDPR] BR-GDPR-002 parcial (revogação sem enforcement downstream).** Evidência: `backend/src/gdpr/`. Impacto: revogação de consentimento não propaga automaticamente para sistemas a jusante. _(Achado só documentado na secção "Por Módulo" na versão original deste relatório; consolidado aqui em 2026-08-17.)_

## Por Módulo

### 01 — Autenticação & Segurança

Estado: Precisa de atenção

- ~~Crítico: `resetPassword` é no-op~~ **RESOLVIDO 2026-08-17 00:17** — fluxo UC-AUTH-003 completo com token, email e endpoint de confirmação (`auth.service.ts`)
- ~~Alto: JWT HMAC em vez de RSA (`jwt.service.ts:41`)~~ **RESOLVIDO 2026-08-17 (P-076)** — RS256, 2 pares de chaves RSA 2048-bit (access/refresh)
- ~~Alto: BR-AUTH-006 (reutilização password) não implementado~~ **RESOLVIDO 2026-08-17 09:52** — tabela `hr.password_history`, janela deslizante das últimas 5 (`auth.service.ts`)
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

- ~~Alto: `GET /teams/:id` não exposto no controller~~ **RESOLVIDO 2026-08-17 08:57**
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

- ~~Alto: Filtro `year` em `findAll()` aceite mas ignorado (`absences.service.ts:240-256`)~~ **RESOLVIDO 2026-08-17 08:57**
- Médio: `GET /absences/calendar` ignora parâmetro `month` (`absences.controller.ts:99-105`)
- Testes: ✅ Unitários (29 testes), ✅ E2E (2 ficheiros)
- Segurança: JwtAuthGuard + RolesGuard presentes ✅

### 09 — Despesas & Reembolsos

Estado: Precisa de atenção

- ~~Crítico: Filtro por mês com `-31` hardcoded~~ **RESOLVIDO 2026-08-17 00:17** (`expenses.service.ts:462-464`)
- ~~Alto: APPROVER com acesso demasiado amplo (`expenses.controller.ts:48-79,91-116`)~~ **RESOLVIDO 2026-08-17 08:57**
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

- ~~Alto: Valor do contrato exposto a MANAGER, spec diz Admin only (GDPR) (`contracts.controller.ts:37,47`)~~ **RESOLVIDO 2026-08-17 08:57**
- Médio: BR-CON-002 (permanent contracts sem endDate) não validado
- Testes: ✅ Unitários (7 testes), ❌ Sem e2e
- Segurança: JwtAuthGuard + RolesGuard presentes ✅

### 12 — Workflow & Caixa de Entrada

Estado: Precisa de atenção

- Alto: 3/5 regras de negócio e ApprovalFlow não implementados (corrigido de "Crítico" para "Alto" em 2026-08-17 — ver nota na secção consolidada)
- ~~Alto: EMPLOYEE excluído de todos os endpoints~~ **RESOLVIDO 2026-08-17 08:57**
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

- ~~Alto: Employee/APPROVER sem acesso a dados de dashboard~~ **RESOLVIDO PARCIALMENTE 2026-08-17 08:57** (novo endpoint `my-occupancy`, ver secção consolidada)
- Médio: Sem endpoint de alertas nem indicadores específicos (ausências do dia, contratos a expirar)
- Testes: ✅ Unitários (15 testes), ❌ Sem e2e

### 16 — Dashboard Financeiro

Estado: Precisa de atenção

- ~~Alto: Endpoint `financial-dashboard` e export PDF/Excel não implementados~~ **RESOLVIDO PARCIALMENTE 2026-08-17 09:13** (só export PDF/Excel dos 4 endpoints existentes; endpoint `financial-dashboard` consolidado e 4 KPIs sem cálculo continuam por implementar, ver secção consolidada)
- ~~Alto: MANAGER com acesso a dados financeiros além do spec~~ **RESOLVIDO 2026-08-17 08:57**
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
- Baixo: Sem frontend para visualização _(corrigido de Médio para Baixo em 2026-08-17, para condizer com a reconciliação da secção consolidada)_
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

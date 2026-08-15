# Módulo 20 — Notificações & Alertas

## Objetivo

Gerir o envio de notificações automáticas e alertas para utilizadores em resposta a eventos do sistema.

## Entidades

### Notification

| Campo          | Tipo         | Notas                       |
| -------------- | ------------ | --------------------------- |
| id             | UUID         | PK                          |
| recipient_id   | UUID         | FK Employee                 |
| type           | VARCHAR(100) | ex: "absence.approved"      |
| title          | VARCHAR(200) | —                           |
| body           | TEXT         | —                           |
| channel        | ENUM         | email, in_app, push         |
| status         | ENUM         | pending, sent, failed, read |
| reference_id   | UUID         | Entidade relacionada        |
| reference_type | VARCHAR(50)  | —                           |
| sent_at        | TIMESTAMP    | —                           |
| read_at        | TIMESTAMP    | —                           |
| metadata       | JSONB        | Dados adicionais            |

## Canais de Notificação

| Canal               | Suporte v1     |
| ------------------- | -------------- |
| Email               | ✅ Obrigatório |
| In-App (sino/badge) | ✅ Obrigatório |
| Push (PWA)          | 🔄 Fase 2      |
| SMS                 | 🔄 Futuro      |

## Eventos que Geram Notificações

| Evento                       | Destinatário         | Canal          |
| ---------------------------- | -------------------- | -------------- |
| Ausência submetida           | Aprovador            | Email + In-App |
| Ausência aprovada/rejeitada  | Colaborador          | Email + In-App |
| Timesheet submetida          | Gestor               | Email + In-App |
| Timesheet aprovada/rejeitada | Colaborador          | Email + In-App |
| Despesa aprovada/rejeitada   | Colaborador          | Email + In-App |
| Contrato a expirar (N dias)  | Admin + Colaborador  | Email          |
| Projeto a terminar (N dias)  | Gestor               | Email + In-App |
| Alocação a terminar (N dias) | Gestor + Colaborador | Email          |
| Sobrealodação detectada      | Gestor               | Email + In-App |
| Submissão de horas em atraso | Colaborador          | Email + In-App |
| Fim de alocação sem projeto  | Gestor               | Email          |

## Regras de Negócio

| ID         | Regra                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| BR-NOT-001 | Notificações por email usam templates configuráveis com branding da empresa. |
| BR-NOT-002 | Utilizador pode configurar preferências de notificação (canal, frequência).  |
| BR-NOT-003 | Notificações in-app expiram após 90 dias.                                    |
| BR-NOT-004 | Falhas de envio de email devem ter retry automático (máximo 3 tentativas).   |
| BR-NOT-005 | Alertas de prazo são enviados diariamente pelo processo de scheduling.       |

## Requisitos Funcionais

| ID         | Descrição                                                                |
| ---------- | ------------------------------------------------------------------------ |
| RF-NOT-001 | O sistema deve enviar notificações por email para eventos críticos.      |
| RF-NOT-002 | O sistema deve disponibilizar centro de notificações in-app.             |
| RF-NOT-003 | O sistema deve suportar templates de email configuráveis.                |
| RF-NOT-004 | O sistema deve permitir ao utilizador gerir preferências de notificação. |
| RF-NOT-005 | O sistema deve gerir fila de envio com retry em caso de falha.           |

## APIs

- GET /api/v1/notifications (do utilizador autenticado)
- PUT /api/v1/notifications/:id/read
- PUT /api/v1/notifications/read-all
- GET /api/v1/notification-preferences
- PUT /api/v1/notification-preferences

## Tecnologia Recomendada

- Fila de mensagens: RabbitMQ ou Apache Kafka
- Email: SMTP configurável (Sendgrid/SES compatível)
- Templates: Handlebars ou MJML

## Notas de Implementação (P-015 backend, P-041 backend fixes + frontend, P-044 eventos em falta)

**Desvios face a este documento confirmados em P-041 (implementação real desde P-015):**

- Prefixo de rota real é `/api/notifications/...`, sem `/v1`, consistente com o resto do backend.
- `GET/PUT /notification-preferences` (recurso de topo, spec) é na realidade `GET/PATCH /notifications/preferences` (aninhado sob `notifications`, `PATCH` em vez de `PUT`). O corpo de `PATCH` é um array de `{ notificationType, emailEnabled?, inAppEnabled? }` — uma preferência **por tipo de evento** (`notification_type`), não uma preferência global de "canal/frequência" como a spec sugere vagamente; não existe nenhum conceito de frequência/digest.
- ~~Só 9 dos ~11 eventos da tabela "Eventos que Geram Notificações" têm handler `@OnEvent` implementado~~. **Corrigido em P-044**: os 4 eventos que pareciam sem handler já eram, na maioria, um problema de wiring em falta em vez de eventos por implementar — `Despesa aprovada`/`rejeitada` e `Sobrealocação detetada` já eram emitidos por `ExpensesService`/`ProjectsService` desde as suas fases originais, só faltava o `@OnEvent` correspondente em `NotificationsService`; `Submissão de horas em atraso` idem, o cron `TimesheetsService.alertPendingSubmissions()` já emitia `timesheet.pending-submission` (como objeto simples, não uma classe de evento — única inconsistência face à convenção do resto do módulo). Agora todos os 13 eventos têm handler: `expense.approved`, `expense.rejected`, `allocation.overallocation-detected`, `timesheet.pending-submission` (novos) + os 9 anteriores. 4 novos templates de email (`expense-approved`, `expense-rejected`, `overallocation-detected`, `timesheet-pending`.hbs) registados em `notifications-templates.seed.ts`.
- **`Fim de alocação sem projeto` não era um handler em falta, era um bug de nome de evento** (descoberto e corrigido em P-044): `ProjectsService.checkEndingProjects()` emitia a string `'allocation.ending-alert'`, mas `NotificationsService` escutava `'project.allocation-ending-alert'` — nunca coincidiam (`EventEmitter2` faz correspondência exata de string, sem wildcard), pelo que este alerta nunca disparava desde que ambos os lados foram escritos, apesar de o handler `handleAllocationEndingAlert()` sempre ter existido e parecer "já implementado" (a nota de P-041 abaixo estava incorreta ao contá-lo entre os 9 eventos funcionais). Corrigido alinhando o `emit()` com o nome já usado pelo `@OnEvent`.
- Canal `push` existe no enum mas não tem nenhuma implementação (só `email`/`in_app` funcionam).
- **2 novos handlers em P-048** (fora da tabela "Eventos que Geram Notificações" da spec original, que não cobre GDPR): `handleGdprRequestCompleted()` (`gdpr.request.completed`) e `handleGdprDataExported()` (`gdpr.data.exported`), ambos emitidos por `GdprService` (ver `specs/gdpr/SPEC.md`), notificam o titular dos dados (`event.subjectId`, já um `Employee.id`). 2 novos templates (`gdpr-request-completed`, `gdpr-data-exported`.hbs) registados em `notifications-templates.seed.ts`. `gdpr.incident.escalated` não tem consumidor aqui, por decisão consciente (P048-03, ver `specs/GLOBAL-TASKS-RISKS.md`) — o DPO já recebe email direto via `GdprService.notifyDpo()`.

**Correções de backend em P-041 (aprovadas pelo utilizador):**

- **BR-NOT-003 (expirar notificações in-app ao fim de 90 dias) corrigida (decisão P041-02, "corrigir agora")**: `NotificationsService.cleanupExpiredNotifications()` já existia desde P-015 mas nunca estava ligado a nenhum agendador — nunca corria. Adicionado `@Cron(CronExpression.EVERY_DAY_AT_2AM)`.
- **Novo endpoint `GET /notifications/unread-count` (decisão P041-01, "adicionar contagem + ligar o sino")**: antes desta fase não existia nenhuma forma de contar notificações por ler sem paginar a lista completa — necessário para o badge do sino na sidebar. Conta notificações `channel=in_app AND status=sent` do utilizador autenticado.
- 2 novos testes unitários em `notifications.service.spec.ts` (196/196 total, antes 194/194).
- **Bug corrigido em P-045 (`R-038`)**: `NotificationsController` passava `req.user.sub` (JWT, `User.id`) diretamente onde se esperava `Employee.id` — `Notification.recipientId` e `NotificationPreference.employeeId` são sempre preenchidos com `Employee.id` pelos handlers `@OnEvent` (ex. `managerId = request.employee.managerId`), nunca com `User.id`. `findByUser`, `countUnread`, `markAsRead`, `markAllAsRead`, `getPreferences` e `updatePreferences` nunca encontravam as notificações/preferências certas para um colaborador real — a lista e a contagem de não lidas ficavam sempre vazias/zero. Corrigido injetando o novo `EmployeeIdentityService` partilhado (`backend/src/auth/services/employee-identity.service.ts`). Verificado em runtime: Bruno Costa (colaborador real) viu corretamente as suas 3 notificações reais (incl. as geradas pelos novos eventos de P-044) e a contagem de não lidas.

## Frontend (P-041)

Nova `frontend/src/pages/NotificationsPage.tsx` na rota `/notifications`, item "Notificações" na sidebar sem restrição de papel — escolhido pelo utilizador como último módulo com backend pronto e frontend em falta. O sino no cabeçalho (antes puramente decorativo, sem contagem nem clique — o badge existente pertence à Caixa de Entrada/Workflow, uma entidade `WorkflowItem` sem relação com `Notification`) passa a mostrar um badge com a contagem real de não lidas (`GET /notifications/unread-count`, poll a cada 60s, mesmo padrão do contador da Caixa de Entrada) e a navegar para `/notifications` ao clicar.

Duas abas: "Notificações" — lista com paginação do lado do servidor (`page`/`limit`/`total` da API, sem reaproveitar o `DataTable` partilhado porque este só pagina em memória — não existia nenhum padrão de paginação server-side na base de código antes desta fase), indicador visual "Nova" para não lidas, botão "Marcar como lida" por item e "Marcar todas como lidas"; "Preferências" — tabela com um tipo de notificação por linha (`NOTIFICATION_TYPE_LABELS`, `frontend/src/types/notifications.ts`, com os 13 tipos realmente implementados desde P-044 — os 4 novos eventos ligados nesta fase foram acrescentados ao mapa para continuarem visíveis nesta tabela) e checkboxes In-App/Email, `PATCH /notifications/preferences` por alteração.

Tipos e cliente API já existiam parcialmente de uma sessão anterior (`frontend/src/types/notifications.ts`, `frontend/src/api/notifications.api.ts` com `fetchNotifications`/`markNotificationRead`/`markAllNotificationsRead`); completados com `NotificationPreference`, `fetchUnreadCount`, `fetchNotificationPreferences`, `updateNotificationPreferences`. `pnpm run lint` (0 erros) e `pnpm run build` (raiz) green; 196/196 testes unitários do backend. **Verificação em browser real completa via Playwright contra a stack Docker completa**: badge do sino a mostrar a contagem correta (2 notificações de teste inseridas via fixture), navegação por clique no sino, marcar uma notificação como lida, marcar todas como lidas (badge volta a 0), alternar uma preferência In-App (persistida e confirmada via novo pedido) — 0 erros de consola em todos os passos.

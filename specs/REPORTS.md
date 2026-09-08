# Módulo 14 — Relatórios

## Objetivo

Gerar relatórios operacionais exportáveis sobre férias, ocupação, horas trabalhadas, ausências, reembolsos e contratos.

## Relatórios Disponíveis

| ID      | Nome                            | Filtros                       | Formato    |
| ------- | ------------------------------- | ----------------------------- | ---------- |
| REP-001 | Férias por colaborador          | Período, Colaborador          | PDF, Excel |
| REP-002 | Férias por equipa               | Período, Equipa               | PDF, Excel |
| REP-003 | Taxa de ocupação individual     | Período, Colaborador          | PDF, Excel |
| REP-004 | Taxa de ocupação por equipa     | Período, Equipa               | PDF, Excel |
| REP-005 | Horas trabalhadas               | Período, Colaborador, Projeto | PDF, Excel |
| REP-006 | Ausências                       | Período, Tipo, Colaborador    | PDF, Excel |
| REP-007 | Reembolsos                      | Período, Estado, Colaborador  | PDF, Excel |
| REP-008 | Contratos próximos da expiração | N dias, Tipo                  | PDF, Excel |

## Requisitos Funcionais

| ID         | Descrição                                                                        |
| ---------- | -------------------------------------------------------------------------------- |
| RF-REP-001 | Os relatórios devem ser exportáveis em PDF e Excel.                              |
| RF-REP-002 | Os relatórios devem suportar filtros por período, equipa, colaborador e projeto. |
| RF-REP-003 | O sistema deve suportar geração assíncrona de relatórios grandes.                |
| RF-REP-004 | O sistema deve notificar quando relatório assíncrono está pronto.                |

## Permissões

| Relatório                   | Administrador | Gestor | Colaborador |
| --------------------------- | :-----------: | :----: | :---------: |
| Todos os relatórios globais |      ✅       |   ❌   |     ❌      |
| Relatórios da equipa        |      ✅       |   ✅   |     ❌      |
| Próprios dados              |      ✅       |   ✅   |     ✅      |

## APIs

- GET /api/v1/reports/:type/generate
  - Query: filtros específicos por tipo
  - Retorna: job_id (assíncrono) ou ficheiro direto (síncrono para pequenos)
- GET /api/v1/reports/jobs/:job_id (estado da geração)
- GET /api/v1/reports/jobs/:job_id/download

## Notas de Implementação (P-017 backend, P-039 backend fixes + frontend, P-044 scoping)

**Desvios face a este documento (implementação real desde P-017, confirmados em P-039):**

- Prefixo de rota real é `/api/reports/...`, sem `/v1` — consistente com todos os outros módulos do backend (`app.setGlobalPrefix('api')`), não é uma particularidade deste módulo.
- Não existe uma rota genérica `GET /reports/:type/generate`. Em vez disso há 8 rotas dedicadas: `GET /reports/timesheets`, `/absences`, `/expenses`, `/projects/:id/hours`, `/teams/:id/occupancy`, `/financials/margins`, `/contracts/expiring`, `/audit`.
- O catálogo de relatórios implementado (enum `ReportType`) não corresponde ao catálogo REP-001..008 desta tabela: não existem relatórios distintos de "férias por colaborador/equipa" nem "ocupação individual"; em vez disso existem `project_hours` (não listado aqui) e `margins`/`audit` (também não listados aqui). O frontend (P-039) foi construído sobre os 8 tipos reais, não sobre REP-001..008 (decisão do utilizador P039-03).
- Permissões reais: `GET /reports/timesheets`, `/absences`, `/expenses` exigem `ADMIN`, `MANAGER` ou `EMPLOYEE` (`/projects/:id/hours`, `/teams/:id/occupancy`, `/financials/margins`, `/contracts/expiring` continuam `ADMIN`/`MANAGER`; `/audit` e `/schedules/*` continuam só `ADMIN`) — o gap "papel EMPLOYEE sem acesso a relatórios próprios" documentado em P039-02 foi corrigido em **P-044**, limitado aos 3 tipos com filtro `employeeId`. **Scoping (P-044)**: `ReportsService.resolveEmployeeScope(roles, callerUserId, requestedEmployeeId)` resolve o `Employee` do chamador a partir do `userId` do JWT (nunca compara `sub` diretamente com `Employee.id` — ver `R-038` em `specs/GLOBAL-TASKS-RISKS.md`); ADMIN sem restrição; MANAGER sem `employeeId` fica limitado a si próprio + subordinados diretos (`Employee.managerId`, novo filtro `employeeIds` com `IN`), com `employeeId` explícito só se pertencer à equipa (403 caso contrário); EMPLOYEE sempre limitado aos próprios dados (403 se pedir outro `employeeId`).
- **Scoping de `project_hours`/`team_occupancy`/`margins`/`contracts_expiring` (P-048, decisões P048-01/P048-02)**: `project_hours` e `team_occupancy` (relatórios de um único projeto/equipa, sem "equipa própria" natural) restringem MANAGER ao próprio — `ReportsController` chama `ProjectsService.isProjectManager(id, user.sub)`/`TeamsService.isTeamLeader(id, user.sub)` (mesmos métodos já usados internamente por Projects/Teams desde P-045) e lança `ForbiddenException` se o MANAGER não for o gestor do projeto/a líder da equipa pedidos; ADMIN sem restrição. `margins`/`contracts_expiring` (listas globais, sem projeto/equipa no pedido) reutilizam `resolveEmployeeScope()` — `ReportsService.generateMarginReport`/`generateContractsExpiringReport` ganharam um parâmetro `employeeIds` opcional que filtra por `In(employeeIds)` quando presente (MANAGER) e não filtra quando vazio (ADMIN). `audit` continua `ADMIN`-only, não afetado por este scoping. Verificado em runtime: MANAGER (Ana Silva) só viu o contrato do seu subordinado direto (Bruno Costa) em `contracts/expiring`, ADMIN viu ambos; MANAGER com o papel mas sem ser o project manager recebeu 403 em `project_hours`, o project manager real (200); mesmo padrão confirmado em `team_occupancy`.
- **Gap descoberto durante a verificação de P-048, corrigido em P-049 (`R-040`)**: `generateTeamOccupancyReport()` verificava se a equipa existia via `TeamMember.findOne({ where: { teamId } })` (existência de membro, não de equipa) — uma equipa válida sem membros no período devolvia 404 "Equipa não encontrada" em vez do relatório vazio esperado. Corrigido consultando a entidade `Team` diretamente (`dataSource.getRepository(Team).findOne({ where: { id: teamId } })`). Verificado em runtime: equipa real sem membros devolve `200 []`, equipa inexistente continua a devolver 404.
- **`PATCH /reports/schedules/:id` (P-048)**: gap "sem forma de editar um agendamento" fechado — `UpdateScheduledReportDto` (todos os campos opcionais, incl. `isActive`) e `ScheduledReportsService.update()`; se `frequency` for alterada, `nextRunAt` é recalculado a partir de agora (mesma lógica de `calculateNextRun()` usada em `create()`), caso contrário mantém-se inalterado.
- `/reports/schedules` (GET/POST) e `/reports/schedules/:id` (DELETE) existem e são geridos pelo frontend, mas não têm equivalente nesta spec; não existe `PATCH` para editar um agendamento (só criar/listar/apagar) — gap conhecido, não corrigido nesta fase (decisão P039-02).

**Correções de backend em P-039 (aprovadas pelo utilizador, decisão P039-01 — "corrigir agora"):**

Antes de P-039, o fluxo assíncrono (`RF-REP-003`/`RF-REP-004`) estava incompleto: `GET /reports/jobs/:job_id/download` não existia, `ReportJob.resultUrl` nunca era preenchido (o buffer gerado era descartado após o envio do email de agendamento, quando aplicável) e `rowCount` ficava sempre a 0. Corrigido:

- `ReportsService.generateBuffer()` passa a devolver `{ buffer, rowCount }` (antes só `Buffer`).
- Novo `ReportsService.persistJobResult()` — faz upload do buffer gerado para o MinIO via `StorageService` (`reports/{jobId}/{filename}`), reaproveitando o serviço já usado por Documents.
- `ReportsConsumerService.handleMessage()` chama `persistJobResult()` e passa `resultUrl`/`rowCount` reais a `updateJobStatus()`.
- Novo endpoint `GET /reports/jobs/:jobId/download` (`ADMIN`/`MANAGER`) — **transmite o ficheiro diretamente pelo backend** (`StorageService.getObjectStream()` + `stream.pipe(res)`), em vez de redirecionar (302) para um URL pré-assinado do MinIO. Motivo: o endpoint interno do MinIO (`http://minio:9000`, resolúvel só dentro da rede Docker) tornava um redirect inacessível a partir de um browser real fora dessa rede — o mesmo problema afeta silenciosamente o download de Documents (`GET /documents/:id/download`, nunca exercitado por um frontend real), que continua a usar redirect e não foi alterado nesta fase (decisão do utilizador — "proxy via backend" só para Reports, sem alterar a convenção de Documents).
- Corrigido um bug de latência de arranque descoberto durante a verificação: `ReportsConsumerService.onModuleInit()` chamava `rabbitmq.consume()` antes de `ReportsRabbitmqService` ter terminado de estabelecer a ligação, pelo que o consumidor nunca se inscrevia na fila `report_jobs` (confirmado com `consumers: 0` na API de gestão do RabbitMQ) — todos os jobs assíncronos ficavam presos em `PENDING` para sempre. Corrigido trocando o hook de `OnModuleInit` para `OnApplicationBootstrap` (que o NestJS garante correr depois de todos os `onModuleInit` da aplicação).
- `main.ts`: `app.enableCors()` passa a expor `Content-Disposition` (`exposedHeaders: ['Content-Disposition']`) — sem isto, o browser não consegue ler o nome de ficheiro sugerido pelo backend em downloads via `axios`/`fetch` (`responseType: 'blob'`), necessário para o download síncrono no frontend.
- 5 novos testes unitários em `reports.service.spec.ts` (`generateBuffer` com `rowCount`, `persistJobResult`, `getJobFile` completo/rejeitado) — 188/188 testes totais.

**Gaps de infraestrutura de desenvolvimento corrigidos em P-039 (não específicos deste módulo, bloqueavam a verificação em browser real):**

- `infra/docker-compose.dev.yml` e `.env.example`: `STORAGE_ENDPOINT` não incluía o esquema (`minio:9000` em vez de `http://minio:9000`), causando `EndpointError: Custom endpoint 'minio://9000' was not a valid URI` no AWS SDK v3 (afeta qualquer uso de `StorageService`, incl. Documents, nunca antes exercitado com um browser real). Corrigido só em `docker-compose.dev.yml`; **`docker-compose.prod.yml` tem o mesmo problema e não foi alterado** (fora do âmbito desta sessão, produção não está a correr neste sandbox) — gap registado em `specs/GLOBAL-TASKS-RISKS.md`.
- O bucket MinIO `srh-documents` (nome por omissão de `STORAGE_BUCKET`) nunca tinha sido criado no ambiente de desenvolvimento local — criado manualmente via `mc mb` durante a verificação desta fase; não há nenhum script de arranque que o crie automaticamente (gap registado, mesma causa: Documents/Reports nunca antes testados via upload/download real).

## Frontend (P-039)

Nova `frontend/src/pages/ReportsPage.tsx` na rota `/reports`, item "Relatórios" na sidebar restrito a Admin/Manager (`managerOrAdminRoutes`, mesmo padrão de Capacity) — escolhido pelo utilizador entre os módulos com backend pronto e frontend em falta (GDPR/Reports/Notificações, decisão P039-00). Duas abas: "Gerar Relatório" (Admin+Manager) e "Agendamentos" (só Admin, `isAdmin` derivado de `permissions`, mesmo padrão de Admin/Capacity).

- **Gerar Relatório**: formulário com os 8 tipos reais de relatório (`ReportType`), campos de filtro dinâmicos por tipo (período/de-até, colaborador, projeto, equipa, categoria, tipo de ausência, dias, ação/utilizador — todos os `<select>` populados via `GET /users`, `/projects`, `/teams`, `/expenses/categories`, `/absences/types`) e seletor de formato (JSON/Excel/PDF). Resultado tratado de três formas consoante a resposta do backend: JSON → pré-visualização em `DataTable` genérica (colunas derivadas de `Object.keys` da primeira linha); ficheiro síncrono (Excel/PDF ≤1000 linhas) → download imediato via `Blob`+`URL.createObjectURL`; job assíncrono (>1000 linhas) → adicionado a uma lista "Relatórios em Processamento", cada linha faz `useQuery` com `refetchInterval` de 3s até `completed`/`failed`, com botão "Descarregar" quando pronto.
- **Agendamentos**: `DataTable` de `GET /reports/schedules`, diálogo "Novo Agendamento" (`react-hook-form`+`zod`) com nome, tipo, formato (Excel/PDF), frequência, destinatários (emails separados por vírgula) e filtros como textarea JSON livre (sem UI dedicada por tipo de relatório — decisão de implementação, dado que a spec não cobre agendamentos; documentado como possível melhoria futura), remoção com `ConfirmDialog`.

Novos `frontend/src/types/reports.ts` e `frontend/src/api/reports.api.ts`. `pnpm run lint` (0 erros) e `pnpm run build` (raiz) green; 188/188 testes unitários do backend. **Verificação em browser real completa via Playwright contra a stack Docker completa**: geração síncrona (JSON e XLSX, incl. nome de ficheiro correto após a correção de CORS), geração assíncrona de ponta a ponta (job PENDING→PROCESSING→COMPLETED via fixture temporária de 1500 linhas em `audit_logs`, removida após o teste; download do ficheiro completo confirmado — 132KB, `.xlsx` válido), criação e remoção de agendamento — 0 erros de consola em todos os passos.

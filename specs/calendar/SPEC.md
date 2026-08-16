# Módulo 13 — Calendário Organizacional

## Objetivo

Disponibilizar calendário centralizado com ausências, feriados, aniversários e eventos organizacionais.

## Funcionalidades

1. Múltiplos perfis de calendário por país (Portugal, outros).
2. Visualização mensal organizacional.
3. Visão de ausências por colaborador e por equipa.
4. Feriados nacionais e locais/regionais.
5. Aniversários (nascimento e entrada na empresa).
6. Aniversários específicos Bridge351 e NIVVOS.
7. Adição rápida de ausências diretamente do calendário.
8. Visão das ausências em cada dia.
9. Atribuição de perfis de calendário por colaborador.

## Eventos Apresentados no Calendário

| Tipo                      | Cor         | Fonte                          |
| ------------------------- | ----------- | ------------------------------ |
| Férias aprovadas          | Verde       | AbsenceRequest (VACATION)      |
| Ausência aprovada         | Amarelo     | AbsenceRequest                 |
| Feriado nacional          | Cinza       | HolidayCalendar                |
| Feriado local             | Cinza claro | HolidayCalendar                |
| Aniversário de nascimento | Rosa        | Employee.birth_date            |
| Aniversário de empresa    | Azul        | Employee.employment_start_date |
| Evento Bridge351/NIVVOS   | Roxo        | Configurável                   |

## Ambiguidade Identificada

> "Aniversário Bridge351 e NIVVOS" — Interpretação: aniversário de fundação das entidades legais a apresentar como evento recorrente no calendário.
> **Confiança: 60%** — necessita confirmação.

## Requisitos Funcionais

| ID         | Descrição                                                                    |
| ---------- | ---------------------------------------------------------------------------- |
| RF-CAL-001 | O sistema deve apresentar calendário mensal com todos os eventos relevantes. |
| RF-CAL-002 | O sistema deve suportar filtro por colaborador e por equipa.                 |
| RF-CAL-003 | O sistema deve suportar múltiplos perfis de calendário por país.             |
| RF-CAL-004 | O sistema deve apresentar feriados nacionais e locais.                       |
| RF-CAL-005 | O sistema deve apresentar aniversários de colaboradores.                     |
| RF-CAL-006 | O sistema deve permitir adicionar ausência diretamente do calendário.        |
| RF-CAL-007 | O sistema deve atualizar automaticamente feriados anualmente.                |

## APIs

- GET /api/v1/calendar/events
  - Query: year, month, team_id, employee_id, country
- GET /api/v1/calendar/holidays
  - Query: country_code, year
- POST /api/v1/calendar/quick-absence

## Notas de Implementação (P-036 — Frontend)

O backend deste módulo foi implementado em P-016 (`backend/src/calendar/`) com uma forma diferente da descrita acima — em vez de `GET /calendar/events`, a vista mensal é servida por `GET /calendar` (query `year`, `month`, `teamId`), que já devolve feriados, eventos de empresa, ausências aprovadas da equipa filtrada e aniversários (nascimento/empresa) num único array `CalendarEvent[]`. Não existe filtro por `employeeId` nem por `country` na vista mensal (apenas `teamId`) — limitação já existente, não alterada nesta fase (mesma decisão de âmbito de P032-03 para o filtro individual do Capacity).

- **Frontend**: `frontend/src/pages/CalendarPage.tsx` (rota `/calendar`, item "Calendário" na sidebar, visível a todos os utilizadores autenticados — sem restrição de papel, como o Helpdesk). Aba "Calendário" (visível a todos): grelha mensal (Segunda a Domingo) construída em CSS puro a partir de `GET /calendar`, com legenda de cores conforme a tabela "Eventos Apresentados no Calendário" acima, filtro de equipa (`GET /teams`) e botão "+" por dia para RF-CAL-006 (ausência rápida — reutiliza `POST /absences` já existente, sem endpoint dedicado `quick-absence`). Abas adicionais só para admin: "Feriados" (lista por ano + `POST /calendar/holidays/import` + criação manual), "Eventos" (CRUD completo de `CompanyEvent`) e "Bloqueios" (CRUD de `BlockedPeriod`, exceto edição — o backend não suporta `PATCH`).
- **Gaps de backend encontrados e corrigidos nesta fase** (decisão do utilizador P036-01, mesmo padrão de P034-02): `CalendarService.findCompanyEvents()` e `CalendarService.findBlockedPeriods()` já existiam mas não estavam ligados a nenhuma rota do `CalendarController` — sem eles, não era possível construir uma UI de gestão (listar para editar/remover). Adicionados `GET /calendar/events` e `GET /calendar/blocked-periods` (ambos `@Roles(ADMIN)`), sem alterar lógica de serviço existente.
- **Gap não relacionado descoberto durante a verificação em browser** (decisão do utilizador P036-02/03): a ausência rápida do calendário chama `GET /absences/types`, que não existia em `AbsencesController` — o pedido caía na rota `GET /absences/:id`, tentando interpretar `"types"` como UUID e falhando com 500. Isto também bloqueava a página já existente `/absences/new` (desde P-022) sem que tivesse sido detetado antes. Adicionado `AbsencesService.findTypes()` (lista tipos ativos) e `GET /absences/types`, registado **antes** de `GET /absences/:id` no controller para não repetir o mesmo problema de ordenação de rotas. Adicionalmente, o seed `runAbsenceTypesSeed` (`backend/src/absences/absences.seed.ts`, 10 tipos) existia mas nunca tinha sido ligado a `backend/src/database/seeds/runner.ts` — corrigido, e o seed foi corrido na BD de desenvolvimento. Ao investigar este gap descobriu-se ainda que `GET /absences/calendar` sofria do mesmo problema de ordenação de rotas (capturado por `absences/:id`), confirmado a quebrar em runtime a página `/absences` (erro visível + lista de pedidos sempre vazia); corrigido também (decisão P036-04, `R-035`), movendo `getCalendar()` para antes de `findOne()` no `AbsencesController`, sem alterar lógica.
- `pnpm run lint` (0 erros) e `pnpm test` (177/177, +1 face a P-035) e `pnpm run build` (raiz) green; verificação em browser real via Playwright contra a stack Docker — grelha mensal com feriados importados, criação de feriado/evento/bloqueio, edição e remoção de evento, ausência rápida submetida com sucesso a partir do calendário e da página `/absences/new`, 0 erros de consola em todos os passos.
- **P-053**: `CalendarService.findHolidays(year?, countryCode?)` passa a resolver `countryCode` via `SystemSetting.defaultCountry` quando omitido (antes hardcoded `'PT'` como default de parâmetro). `importPortugalHolidays()` (cron anual) mantém-se especificamente sobre Portugal, sem alteração. Ver `specs/admin/SPEC.md` ("Wiring de Admin Settings ao runtime — Grupo B") para o detalhe completo.
- **P-071 — `GET /calendar/holidays` ligado à entidade legal do colaborador**: o `CalendarService.findHolidays()` em si não mudou; a resolução do país passou a viver no `CalendarController`. Sem `countryCode` explícito na query, o controller auto-resolve a `LegalEntity` do **próprio** colaborador autenticado — via `EmployeeIdentityService.resolveEmployeeId(user.sub)` (mesmo padrão de P-045) seguido de `AdminService.getEffectiveCountryCode(employeeId)` — com fallback silencioso (`.catch(() => undefined)`) para qualquer `User` sem `Employee` ligado, para não bloquear a consulta de feriados por esse motivo. Novo parâmetro `employeeId` opcional na query permite a um admin/manager consultar o calendário de outro colaborador sem precisar de saber a `LegalEntity` associada. Ambiguidade genuína resolvida com o utilizador antes de implementar (decisão P071-01): a proposta original de P069-05 previa só um `employeeId` explícito; escolhida a auto-resolução para o próprio colaborador como comportamento por defeito, mais o `employeeId` opcional como extra, em vez de exigir sempre o parâmetro manual. Ver `specs/admin/SPEC.md` (`AdminService.getEffectiveCountryCode`) e `specs/GLOBAL-TASKS-RISKS.md` para o detalhe completo, incl. o gap relacionado descoberto em Absences/Timesheets (`hr.holiday_calendars` órfã, nunca ligada a `hr.public_holidays`).

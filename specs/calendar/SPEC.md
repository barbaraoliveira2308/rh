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

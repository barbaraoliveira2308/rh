# Módulo 08 — Gestão Avançada de Ausências

## Objetivo
Gerir pedidos de ausência, férias e licenças com políticas configuráveis, fluxos de aprovação multi-etapa e controlo automático de saldos.

---

## Responsabilidades
1. Gerir tipos de ausência configuráveis.
2. Controlar saldo de férias por colaborador.
3. Suportar fluxos de aprovação multi-etapa.
4. Exigir documentos justificativos para tipos específicos.
5. Integrar com calendário organizacional.
6. Configurar períodos bloqueados para pedidos.

---

## Entidades

### AbsenceType (Tipo de Ausência)
| Campo | Tipo | Validação | Notas |
|-------|------|-----------|-------|
| id | UUID | PK | — |
| name | VARCHAR(100) | Único, Obrigatório | — |
| code | VARCHAR(20) | Único | — |
| unit | ENUM | days, hours | — |
| limit_per_year | DECIMAL(6,2) | Nullable | Null = sem limite |
| requires_document | BOOLEAN | Default false | — |
| is_paid | BOOLEAN | Default true | — |
| affects_balance | BOOLEAN | Default true | Conta para saldo férias |
| color | VARCHAR(7) | Hex color | Para calendário |
| is_system | BOOLEAN | Default false | Tipos do sistema não elimináveis |
| is_active | BOOLEAN | Default true | — |
| allowed_roles | JSONB | Nullable | Quem pode usar este tipo |
| blocked_periods | JSONB | Nullable | Períodos onde não se pode pedir |

### AbsenceRequest (Pedido de Ausência)
| Campo | Tipo | Validação | Notas |
|-------|------|-----------|-------|
| id | UUID | PK | — |
| employee_id | UUID | FK → Employee | — |
| absence_type_id | UUID | FK → AbsenceType | — |
| start_date | DATE | Obrigatório | — |
| end_date | DATE | Obrigatório, ≥ start_date | — |
| start_half | BOOLEAN | Default false | Início em meio-dia |
| end_half | BOOLEAN | Default false | Fim em meio-dia |
| total_days | DECIMAL(5,2) | Calculado | — |
| total_hours | DECIMAL(6,2) | Calculado | — |
| status | ENUM | pending, approved, rejected, cancelled | — |
| reason | TEXT | Nullable | — |
| rejection_reason | TEXT | Nullable | — |
| document_url | VARCHAR(512) | Nullable | Comprovativo |
| created_at | TIMESTAMP | Auto | — |
| updated_at | TIMESTAMP | Auto | — |

### AbsenceApprovalStep (Etapa de Aprovação)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| request_id | UUID | FK → AbsenceRequest |
| step_order | INT | Ordem da etapa |
| approver_id | UUID | FK → Employee |
| status | ENUM | pending, approved, rejected |
| decision_at | TIMESTAMP | — |
| comments | TEXT | — |

### LeaveBalance (Saldo de Férias)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| employee_id | UUID | FK → Employee |
| absence_type_id | UUID | FK → AbsenceType |
| year | INT | — |
| entitled_days | DECIMAL(5,2) | Dias com direito |
| used_days | DECIMAL(5,2) | Dias utilizados |
| pending_days | DECIMAL(5,2) | Pedidos pendentes |
| remaining_days | DECIMAL(5,2) | Calculado |
| carry_over_days | DECIMAL(5,2) | Transitados do ano anterior |

---

## Tipos de Ausência Sistema (Pré-definidos)

| Código | Nome | Documento Obrigatório | Pago |
|--------|------|-----------------------|------|
| VACATION | Férias | Não | Sim |
| SICK | Baixa médica | Sim | Sim |
| BEREAVEMENT | Falecimento | Sim | Sim |
| LEAVE | Licença | Sim | Conforme tipo |
| TRAINING | Formação | Não | Sim |
| GIFT_DAY | Dia oferecido | Não | Sim |
| FAMILY | Assistência à família | Não | Conforme legislação |
| MARRIAGE | Casamento | Sim | Sim |
| MEDICAL_APPT | Consulta médica | Sim | Sim |
| OTHER | Outras (configurável) | Configurável | Configurável |

---

## Casos de Uso

### UC-ABS-001 — Solicitar Ausência
**Objetivo:** Colaborador submete pedido de ausência.  
**Pré-condições:** Colaborador ativo; tipo de ausência ativo.  
**Fluxo Principal:**
1. Colaborador acede a "Pedir Ausência".
2. Seleciona tipo, datas e adiciona motivo (opcional).
3. Se tipo requer documento, sistema exige upload.
4. Sistema calcula dias úteis no período.
5. Sistema verifica saldo disponível.
6. Sistema verifica períodos bloqueados.
7. Sistema cria pedido com status `pending`.
8. Sistema cria etapas de aprovação.
9. Sistema notifica aprovadores.
10. Emite `AbsenceRequested`.

**Fluxos Alternativos:**
- 5a. Saldo insuficiente → aviso; colaborador pode continuar (exceto se regra bloquear).
- 6a. Período bloqueado → impedir submissão; informar colaborador.
- 3a. Documento não enviado para tipo obrigatório → erro de validação.

---

### UC-ABS-002 — Aprovar/Rejeitar Ausência
**Objetivo:** Aprovador decide sobre pedido de ausência.  
**Pré-condições:** Pedido em `pending`; aprovador da etapa atual.  
**Fluxo Principal:**
1. Aprovador recebe notificação.
2. Aprovador acede ao pedido na caixa de entrada.
3. Aprovador revê detalhes, saldo e calendário da equipa.
4. Aprovador aprova ou rejeita com comentário.
5. Se aprovação multi-etapa e há próxima etapa → notificar próximo aprovador.
6. Se última etapa aprovada → status = `approved`; saldo é debitado.
7. Colaborador é notificado.
8. Emite `AbsenceApproved` ou `AbsenceRejected`.

---

### UC-ABS-003 — Cancelar Ausência
**Objetivo:** Colaborador cancela pedido antes ou durante período.  
**Pré-condições:** Pedido em `pending` ou `approved` (antes do início).  
**Fluxo Principal:**
1. Colaborador cancela pedido.
2. Se `approved` → saldo é restituído.
3. Aprovadores são notificados.
4. Emite `AbsenceCancelled`.

---

### UC-ABS-004 — Gerir Saldo de Férias
**Objetivo:** Controlar e ajustar saldos anuais.  
**Pré-condições:** Admin autenticado.  
**Fluxo Principal:**
1. Admin acede a "Saldos de Férias".
2. Sistema apresenta saldo por colaborador e tipo.
3. Admin pode ajustar manualmente (com motivo e auditoria).
4. No início do ano, sistema cria novos saldos e aplica transitados.

---

## Regras de Negócio

| ID | Regra |
|----|-------|
| BR-ABS-001 | Baixa médica, Falecimento, Licença, Casamento e Consulta exigem documento justificativo obrigatório. |
| BR-ABS-002 | Não é possível submeter pedido de ausência em período bloqueado pela empresa. |
| BR-ABS-003 | O saldo de férias é debitado apenas após aprovação final. |
| BR-ABS-004 | Pedidos de ausência sobrepostos com ausência já aprovada não são permitidos. |
| BR-ABS-005 | Fins de semana e feriados não contam para o total de dias de ausência. |
| BR-ABS-006 | O cancelamento de ausência aprovada só é possível antes do início do período. |
| BR-ABS-007 | Dias de férias não gozados podem ser transitados para o ano seguinte (configurável por empresa). |
| BR-ABS-008 | Para aprovação multi-etapa, cada etapa deve ser aprovada pela ordem definida. |
| BR-ABS-009 | Um colaborador inativo não pode submeter novos pedidos de ausência. |

---

## Requisitos Funcionais

| ID | Descrição |
|----|-----------|
| RF-ABS-001 | O sistema deve suportar tipos de ausência configuráveis com limites e regras. |
| RF-ABS-002 | O sistema deve controlar automaticamente saldo de férias por colaborador. |
| RF-ABS-003 | O sistema deve suportar fluxos de aprovação multi-etapa configuráveis. |
| RF-ABS-004 | O sistema deve exigir documento justificativo para tipos específicos. |
| RF-ABS-005 | O sistema deve calcular dias úteis excluindo feriados e fins de semana. |
| RF-ABS-006 | O sistema deve permitir configurar períodos bloqueados para pedidos. |
| RF-ABS-007 | O sistema deve integrar ausências aprovadas no calendário organizacional. |
| RF-ABS-008 | O sistema deve integrar ausências aprovadas na folha de horas. |
| RF-ABS-009 | O sistema deve permitir consulta de histórico de ausências por colaborador. |
| RF-ABS-010 | O sistema deve suportar pedido de meio-dia de ausência. |

---

## Diagrama de Estados do Pedido de Ausência

```mermaid
stateDiagram-v2
    [*] --> Pending : Colaborador submete
    Pending --> Approved : Aprovador(es) aprovam
    Pending --> Rejected : Aprovador rejeita
    Approved --> Cancelled : Colaborador cancela (antes do início)
    Pending --> Cancelled : Colaborador cancela
    Rejected --> [*]
    Cancelled --> [*]
    Approved --> [*]
```

---

## Permissões

| Ação | Administrador | Gestor | Aprovador | Colaborador |
|------|:---:|:---:|:---:|:---:|
| Submeter própria ausência | ✅ | ✅ | ✅ | ✅ |
| Aprovar ausência da equipa | ✅ | ✅ | ✅ | ❌ |
| Rejeitar ausência | ✅ | ✅ | ✅ | ❌ |
| Ver ausências da equipa | ✅ | ✅ | ✅ | ❌ |
| Ver próprias ausências | ✅ | ✅ | ✅ | ✅ |
| Gerir tipos de ausência | ✅ | ❌ | ❌ | ❌ |
| Ajustar saldos manualmente | ✅ | ❌ | ❌ | ❌ |
| Configurar períodos bloqueados | ✅ | ❌ | ❌ | ❌ |

---

## Eventos do Sistema

| Evento | Trigger |
|--------|---------|
| `AbsenceRequested` | Pedido submetido |
| `AbsenceApproved` | Aprovação final |
| `AbsenceRejected` | Rejeição |
| `AbsenceCancelled` | Cancelamento |
| `LeaveBalanceUpdated` | Alteração de saldo |
| `LeaveBalanceAlert` | Saldo baixo (configurável) |

---

## APIs

### GET /api/v1/absence-requests
- **Query:** `employee_id`, `status`, `type`, `start_date`, `end_date`
### POST /api/v1/absence-requests
### GET /api/v1/absence-requests/:id
### POST /api/v1/absence-requests/:id/approve
### POST /api/v1/absence-requests/:id/reject
- **Entrada:** `{ reason }`
### POST /api/v1/absence-requests/:id/cancel
### GET /api/v1/absence-types
### POST /api/v1/absence-types
### GET /api/v1/leave-balances
- **Query:** `employee_id`, `year`
### PUT /api/v1/leave-balances/:id (admin only)

---

## Critérios de Aceitação (Gherkin)

```gherkin
Feature: Pedido de Ausência

  Scenario: Submeter pedido de férias com saldo suficiente
    Given um colaborador com 15 dias de férias disponíveis
    When o colaborador submete pedido de 5 dias de férias
    Then o pedido fica com status "pending"
    And 5 dias ficam em "pending_days" no saldo
    And o aprovador é notificado

  Scenario: Documento obrigatório em baixa médica
    Given um colaborador a submeter pedido de "Baixa médica"
    When o colaborador tenta submeter sem anexar documento
    Then o sistema retorna erro de validação
    And o pedido NÃO é criado

  Scenario: Impedir ausência em período bloqueado
    Given a empresa definiu Dezembro como período bloqueado para férias
    When um colaborador tenta pedir férias em Dezembro
    Then o sistema rejeita o pedido
    And informa o colaborador do período bloqueado

  Scenario: Saldo restituído após cancelamento
    Given um pedido de férias aprovado com 3 dias
    And o período ainda não começou
    When o colaborador cancela o pedido
    Then os 3 dias são restituídos ao saldo
    And o pedido fica com status "cancelled"
```

---

## Questões em Aberto

| ID | Questão | Prioridade |
|----|---------|------------|
| Q-ABS-001 | Quantos dias de férias tem direito cada colaborador por ano (22 dias por lei portuguesa)? É configurável? | Alta |
| Q-ABS-002 | Os dias de férias transitados do ano anterior têm prazo de validade? | Alta |
| Q-ABS-003 | A aprovação multi-etapa é configurável por tipo de ausência ou global? | Alta |
| Q-ABS-004 | Quem é o aprovador por defeito quando não há gestor definido? | Alta |
| Q-ABS-005 | Existe limite máximo de dias de ausência consecutivos sem aprovação especial? | Média |

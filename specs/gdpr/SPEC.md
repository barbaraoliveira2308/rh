# Módulo 22 — GDPR & Conformidade

## Objetivo

Garantir conformidade com o RGPD (Regulamento Geral sobre a Proteção de Dados) em todos os módulos do sistema, implementando privacidade por design, gestão de consentimentos, direitos dos titulares e auditoria de dados pessoais.

---

## Responsabilidades

1. Gerir bases legais de tratamento de dados pessoais.
2. Registar e gerir consentimentos dos titulares.
3. Implementar direitos dos titulares (acesso, retificação, apagamento, portabilidade).
4. Gerir políticas de retenção e eliminação de dados.
5. Registar incidentes de segurança.
6. Produzir relatórios de conformidade.
7. Garantir anonimização e pseudonimização.

---

## Entidades

### ConsentRecord

| Campo        | Tipo         | Validação                                                                                 | Notas                    |
| ------------ | ------------ | ----------------------------------------------------------------------------------------- | ------------------------ |
| id           | UUID         | PK                                                                                        | —                        |
| subject_id   | UUID         | FK Employee/User                                                                          | —                        |
| purpose      | VARCHAR(200) | Obrigatório                                                                               | Finalidade do tratamento |
| legal_basis  | ENUM         | consent, contract, legal_obligation, vital_interest, public_interest, legitimate_interest | —                        |
| granted_at   | TIMESTAMP    | Nullable                                                                                  | —                        |
| revoked_at   | TIMESTAMP    | Nullable                                                                                  | —                        |
| is_active    | BOOLEAN      | Default true                                                                              | —                        |
| ip_address   | VARCHAR(45)  | Nullable                                                                                  | —                        |
| collected_by | VARCHAR(100) | —                                                                                         | Sistema ou responsável   |

### DataRetentionPolicy

| Campo                  | Tipo         | Notas                        |
| ---------------------- | ------------ | ---------------------------- |
| id                     | UUID         | PK                           |
| data_category          | VARCHAR(100) | ex: "employee_personal_data" |
| retention_years        | INT          | Período de retenção          |
| legal_reference        | TEXT         | Base legal                   |
| action_after_retention | ENUM         | delete, anonymize            |
| is_active              | BOOLEAN      | —                            |

### DataSubjectRequest (Pedido de Titular)

| Campo          | Tipo      | Notas                                                               |
| -------------- | --------- | ------------------------------------------------------------------- |
| id             | UUID      | PK                                                                  |
| subject_id     | UUID      | FK Employee/User                                                    |
| request_type   | ENUM      | access, rectification, erasure, restriction, portability, objection |
| status         | ENUM      | pending, in_progress, completed, rejected                           |
| requested_at   | TIMESTAMP | —                                                                   |
| deadline       | TIMESTAMP | Legalmente 30 dias                                                  |
| completed_at   | TIMESTAMP | —                                                                   |
| response_notes | TEXT      | —                                                                   |

### SecurityIncident

| Campo                    | Tipo         | Notas                         |
| ------------------------ | ------------ | ----------------------------- |
| id                       | UUID         | PK                            |
| title                    | VARCHAR(200) | —                             |
| description              | TEXT         | —                             |
| severity                 | ENUM         | low, medium, high, critical   |
| detected_at              | TIMESTAMP    | —                             |
| reported_to_authority_at | TIMESTAMP    | CNPD — 72h para graves        |
| affected_subjects        | INT          | Número de titulares           |
| status                   | ENUM         | open, investigating, resolved |
| resolution_notes         | TEXT         | —                             |

---

## Dados Pessoais Sensíveis Identificados no Sistema

| Dado                          | Módulo       | Base Legal                   | Retenção         |
| ----------------------------- | ------------ | ---------------------------- | ---------------- |
| NIF                           | Utilizadores | Obrigação legal              | 10 anos          |
| IBAN                          | Utilizadores | Execução contrato            | 7 anos           |
| Data de nascimento            | Utilizadores | Execução contrato            | 5 anos pós-saída |
| Morada                        | Utilizadores | Execução contrato            | 5 anos pós-saída |
| Dados de saúde (baixa médica) | Ausências    | Obrigação legal              | 5 anos           |
| Logs de acesso                | Auditoria    | Interesse legítimo           | 1 ano            |
| Dados biométricos (ponto)     | Timesheets   | Consentimento (se aplicável) | 1 ano            |
| Salário/Remuneração           | Contratos    | Execução contrato            | 10 anos          |

---

## Casos de Uso

### UC-GDPR-001 — Pedido de Acesso aos Dados

**Objetivo:** Titular solicita acesso aos seus dados pessoais.
**Prazo legal:** 30 dias.
**Fluxo:**

1. Titular submete pedido de acesso (portal ou email).
2. Sistema regista pedido e notifica DPO/Admin.
3. Admin recolhe todos os dados do titular nos módulos.
4. Sistema exporta relatório completo em formato estruturado.
5. Admin responde ao titular dentro do prazo.

### UC-GDPR-002 — Direito ao Apagamento

**Objetivo:** Titular solicita eliminação dos seus dados.
**Pré-condições:** Não existem obrigações legais que impeçam a eliminação.
**Fluxo:**

1. Titular submete pedido de apagamento.
2. Sistema verifica se dados estão sujeitos a retenção legal.
3. Para dados retidos por lei: informar titular; manter dados pelo período obrigatório.
4. Para dados sem retenção legal: anonimizar ou eliminar.
5. Sistema regista operação de apagamento com auditoria completa.

### UC-GDPR-003 — Portabilidade de Dados

**Objetivo:** Exportar dados do titular em formato estruturado.
**Saída:** JSON ou CSV com todos os dados pessoais do colaborador.
**Fluxo:**

1. Titular ou Admin solicita exportação.
2. Sistema recolhe dados de todos os módulos.
3. Sistema gera ficheiro exportável.
4. Admin entrega ao titular.

### UC-GDPR-004 — Registo de Incidente de Segurança

**Objetivo:** Registar e gerir incidente de violação de dados.
**Fluxo:**

1. Admin regista incidente com severidade e titulares afetados.
2. Sistema calcula deadline de reporte (72h para autoridade se graves).
3. Se incidente grave: notificar automaticamente para reporte à CNPD.
4. Após resolução: registar notas e arquivar.

---

## Regras de Negócio

| ID          | Regra                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------- |
| BR-GDPR-001 | Todos os dados pessoais devem ter base legal definida.                                   |
| BR-GDPR-002 | Consentimento revogado impede uso dos dados para a finalidade em causa.                  |
| BR-GDPR-003 | Pedidos de titulares devem ser respondidos em máximo 30 dias (art. 12 RGPD).             |
| BR-GDPR-004 | Incidentes graves devem ser reportados à autoridade em 72 horas.                         |
| BR-GDPR-005 | Dados anonimizados não são considerados dados pessoais — não sujeitos a RGPD.            |
| BR-GDPR-006 | Logs de auditoria de dados pessoais devem ser mantidos por mínimo 1 ano.                 |
| BR-GDPR-007 | Dados de colaboradores inativos devem ser anonimizados após período de retenção.         |
| BR-GDPR-008 | Ambientes não produtivos (desenvolvimento/testes) não devem conter dados pessoais reais. |
| BR-GDPR-009 | Transferências de dados para fora da UE requerem registo e base legal adequada.          |
| BR-GDPR-010 | As políticas de retenção devem ser parametrizáveis por tipo de dado.                     |

---

## Requisitos Funcionais

| ID          | Descrição                                                                           |
| ----------- | ----------------------------------------------------------------------------------- |
| RF-GDPR-001 | O sistema deve registar base legal para tratamento de cada categoria de dados.      |
| RF-GDPR-002 | O sistema deve permitir registo e revogação de consentimentos.                      |
| RF-GDPR-003 | O sistema deve suportar pedidos de acesso, retificação, apagamento e portabilidade. |
| RF-GDPR-004 | O sistema deve permitir configurar políticas de retenção por tipo de dado.          |
| RF-GDPR-005 | O sistema deve suportar anonimização automática após período de retenção.           |
| RF-GDPR-006 | O sistema deve registar e gerir incidentes de segurança.                            |
| RF-GDPR-007 | O sistema deve disponibilizar relatórios de conformidade.                           |
| RF-GDPR-008 | O sistema deve implementar timeout de sessão e políticas de acesso mínimo.          |
| RF-GDPR-009 | O sistema deve permitir pseudonimização para ambientes de teste.                    |
| RF-GDPR-010 | O sistema deve implementar MFA para Administradores (dados sensíveis).              |

---

## Requisitos Não Funcionais GDPR

| ID           | Descrição                                                             |
| ------------ | --------------------------------------------------------------------- |
| RNF-GDPR-001 | Dados em repouso devem ser encriptados (AES-256 ou equivalente).      |
| RNF-GDPR-002 | Dados em trânsito devem usar TLS 1.2 ou superior.                     |
| RNF-GDPR-003 | Backups devem ser encriptados.                                        |
| RNF-GDPR-004 | Dados pessoais não devem aparecer em logs de sistema em claro.        |
| RNF-GDPR-005 | O sistema deve suportar configuração da região de armazenamento (EU). |

---

## Permissões

| Ação                        | Administrador | Gestor | Aprovador |   Colaborador    |
| --------------------------- | :-----------: | :----: | :-------: | :--------------: |
| Ver todos os dados pessoais |      ✅       |   ❌   |    ❌     |     Próprios     |
| Gerir consentimentos        |      ✅       |   ❌   |    ❌     |     Próprios     |
| Processar pedido de titular |      ✅       |   ❌   |    ❌     | Submeter próprio |
| Configurar retenção         |      ✅       |   ❌   |    ❌     |        ❌        |
| Registar incidente          |      ✅       |   ❌   |    ❌     |        ❌        |
| Exportar relatório GDPR     |      ✅       |   ❌   |    ❌     |        ❌        |
| Anonimizar dados            |      ✅       |   ❌   |    ❌     |        ❌        |

---

## Relatórios de Conformidade

1. Consentimentos ativos por titular e finalidade.
2. Histórico de acessos a dados pessoais (por utilizador, período).
3. Pedidos de eliminação e anonimização (estado e prazo).
4. Incidentes de segurança (severidade, estado, reporte).
5. Exportações de dados pessoais realizadas.
6. Auditoria GDPR geral (conformidade por módulo).

---

## Eventos do Sistema

| Evento                        | Trigger                      |
| ----------------------------- | ---------------------------- |
| `ConsentGranted`              | Consentimento registado      |
| `ConsentRevoked`              | Consentimento revogado       |
| `DataSubjectRequestCreated`   | Novo pedido de titular       |
| `DataSubjectRequestCompleted` | Pedido processado            |
| `DataAnonymized`              | Dados anonimizados           |
| `SecurityIncidentRegistered`  | Novo incidente               |
| `SecurityIncidentEscalated`   | Incidente grave — prazo 72h  |
| `PersonalDataExported`        | Exportação de dados pessoais |

---

## Critérios de Aceitação

```gherkin
Feature: Conformidade GDPR

  Scenario: Pedido de acesso aos dados
    Given um colaborador solicita acesso aos seus dados pessoais
    When o admin processa o pedido
    Then o sistema gera relatório com todos os dados do titular
    And o pedido é marcado como concluído dentro de 30 dias
    And o evento "DataSubjectRequestCompleted" é emitido

  Scenario: Anonimização automática após retenção
    Given existe uma política de retenção de 5 anos para dados de colaboradores inativos
    And um colaborador saiu há mais de 5 anos
    When o processo de retenção diário executa
    Then os dados pessoais do colaborador são anonimizados
    And o evento "DataAnonymized" é registado na auditoria

  Scenario: Incidente grave — prazo 72h
    Given um incidente de segurança com severidade "critical"
    When o admin regista o incidente
    Then o sistema calcula o deadline de reporte (72h)
    And envia alerta ao responsável de conformidade
```

---

## Notas de Implementação (P-018 backend, P-040 backend fixes + frontend, P-044 eventos)

**Desvios face a este documento confirmados em P-040 (implementação real desde P-018):**

- Prefixo de rota real é `/api/gdpr/...`, consistente com o resto do backend.
- O relatório de conformidade (`GET /gdpr/reports/compliance`) não devolve os 6 relatórios detalhados descritos na secção "Relatórios de Conformidade" acima — devolve um objeto plano com 6 contadores agregados (`activeConsents`, `pendingRequests`, `overdueRequests`, `openIncidents`, `criticalIncidentsPendingAuthority`, `activeRetentionPolicies`). O frontend (P-040) foi construído como um dashboard sobre estes contadores, não como um seletor dos 6 relatórios da spec (decisão do utilizador P040-03).
- ~~3 dos 8 eventos listados na secção "Eventos do Sistema" nunca são emitidos: `DataSubjectRequestCompleted`, `SecurityIncidentEscalated`, `PersonalDataExported`~~. **Corrigido em P-044**: `gdpr.request.completed` (`GdprService.completeRequest()`, dispara para todos os tipos de pedido, incl. ERASURE/ACCESS/PORTABILITY concluídos automaticamente em `createDataRequest()`), `gdpr.incident.escalated` (`reportIncident()`, mesmo ponto onde já se notifica o DPO por email para severidade HIGH/CRITICAL — sem novo valor `ESCALATED` no enum `SecurityIncidentStatus`, decisão P044-03) e `gdpr.data.exported` (`createDataRequest()`, ramos ACCESS/PORTABILITY, emitido a par de `gdpr.request.completed`). Novas classes `DataSubjectRequestCompletedEvent`, `SecurityIncidentEscalatedEvent`, `PersonalDataExportedEvent` em `backend/src/gdpr/events/`. Nenhum destes eventos tem consumidor (`@OnEvent`) ainda — nenhuma funcionalidade de UI depende deles, mas passam a estar disponíveis para um futuro handler (ex. em Notifications).
- A matriz de permissões acima mostra Gestor/Aprovador como ❌ para todas as ações; a implementação real usa uma verificação `ensureSelfOrAdmin` nas 3 rotas de self-service (consentimentos e submissão de pedidos), pelo que Gestor/Aprovador têm o mesmo acesso "aos próprios dados" que um Colaborador, não um ❌ absoluto. Comportamento considerado razoável e mantido tal como está.

**Correções de backend em P-040 (aprovadas pelo utilizador, exceto a última):**

- **Bug corrigido sem pedir aprovação separada** (confirmado por inspeção de código, mesmo padrão exato de `TrainingController.ensureSelfOrAdmin()` corrigido em P038-01): `GdprController`'s `RequestWithUser` interface declarava `user?: { sub: string; role: RoleEnum }` (singular), mas o `JwtPayload` real usa `roles: string[]` (array) — `user.role` era sempre `undefined`, pelo que nenhum admin conseguia consultar/gerir consentimentos de outro colaborador nem submeter um pedido de titular em nome de outro através das 3 rotas self-service (`GET /gdpr/consents/:employeeId`, `POST /gdpr/consents/:employeeId/revoke`, `POST /gdpr/requests`) — só o auto-serviço funcionava. Corrigido para `user.roles.includes(RoleEnum.ADMIN)`. Confirmado por teste manual (admin a consultar/gerir dados de outro colaborador via `curl`, antes 403, depois 200/201).
- ~~Gap descoberto em P-044, não corrigido (registado como `R-038`)~~: a mesma `ensureSelfOrAdmin()` comparava `user.sub` (JWT, `User.id`) diretamente com `employeeId` (`Employee.id`) para decidir se era "auto-serviço" — só coincidiam para o admin (convenção deliberada do seed de P-035); um colaborador real nunca passava na verificação ao tentar aceder aos seus **próprios** dados via estas 3 rotas. **Corrigido em P-045**: `ensureSelfOrAdmin()` passa a resolver o `Employee.id` do chamador via o novo `EmployeeIdentityService` partilhado (`backend/src/auth/services/employee-identity.service.ts`, `resolveEmployeeId(userId)`) antes de comparar. Verificado em runtime com um colaborador real (Bruno Costa): `GET /gdpr/consents/:employeeId` dos próprios dados devolve 200, dos de outro colaborador devolve 403.
- **RF-GDPR-005/BR-GDPR-007 (decisão P040-01, "corrigir agora")**: `GdprService.runRetentionPolicies()` existia desde P-018 mas nunca estava ligado a nenhum agendador (`@Cron`) — o `PROJECT_STATE.md` afirmava incorretamente que existia um cron mensal. Adicionado `@Cron('0 3 1 * *')` (dia 1 de cada mês, 3h) ao método, mesmo padrão de outros crons do projeto (Contracts, Timesheets, Calendar).
- **Endpoints em falta (decisão P040-02, "adicionar agora")**: adicionados `PATCH /gdpr/incidents/:id` (`UpdateIncidentDto`: `status`, `resolutionNotes`, `reportedToAuthorityAt`), `PATCH /gdpr/retention-policies/:id` (`UpdateRetentionPolicyDto`: `isActive`) e `PATCH /gdpr/requests/:id/reject` (`RejectRequestDto`: `notes`, obrigatório) — sem estes, a UI de admin não tinha forma de fechar o ciclo de vida de incidentes (UC-GDPR-004: "após resolução: registar notas e arquivar"), desativar uma política de retenção, ou rejeitar um pedido de titular que não seja processado automaticamente (retificação/limitação/oposição).
- 6 novos testes unitários em `gdpr.service.spec.ts` (194/194 total, antes 188/188).

## Frontend (P-040)

Nova `frontend/src/pages/GdprPage.tsx` na rota `/gdpr`, item "Privacidade" na sidebar sem restrição de papel (mesmo padrão de Helpdesk/Calendar/Políticas/Formação — self-service para todos, gestão restrita a admin dentro da página) — escolhido pelo utilizador entre os módulos com backend pronto e frontend em falta (GDPR/Notificações, decisão P040-00). Seis abas: "Os Meus Dados" (todos — consentimentos próprios com revogação, submissão de pedido de titular com os 6 tipos, resultado mostrado de imediato incl. dados exportados para acesso/portabilidade) e, só admin, "Consentimentos" (por colaborador selecionado, registar/revogar), "Pedidos de Titulares" (lista global, completar/rejeitar), "Retenção" (criar política, ativar/desativar), "Incidentes" (registar, geridos via diálogo com estado/notas/reporte à CNPD) e "Conformidade" (dashboard de cards sobre os 6 contadores de `GET /gdpr/reports/compliance`).

Novos `frontend/src/types/gdpr.ts` e `frontend/src/api/gdpr.api.ts`. `pnpm run lint` (0 erros) e `pnpm run build` (raiz) green; 194/194 testes unitários do backend. **Verificação em browser real completa via Playwright contra a stack Docker completa**: submissão de pedido de retificação próprio, admin a consultar e registar consentimento para outro colaborador (Bruno Costa, confirmando a correção do bug `user.role`→`user.roles`), criação e desativação de política de retenção, criação e resolução de incidente (com notas), conclusão de pedido de titular pendente, dashboard de conformidade a refletir corretamente todas as ações — 0 erros de consola em todos os passos.

## Questões em Aberto

| ID         | Questão                                                                               | Prioridade |
| ---------- | ------------------------------------------------------------------------------------- | ---------- |
| Q-GDPR-001 | Existe um DPO (Data Protection Officer) designado?                                    | Alta       |
| Q-GDPR-002 | Os dados são armazenados exclusivamente na UE?                                        | Alta       |
| Q-GDPR-003 | Qual o período de retenção legal definido pela empresa para cada categoria?           | Alta       |
| Q-GDPR-004 | Existe já um registo de atividades de tratamento (RAT)?                               | Média      |
| Q-GDPR-005 | O sistema de ponto regista dados biométricos? Se sim, requer consentimento explícito. | Alta       |

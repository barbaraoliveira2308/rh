# Tarefas & Riscos Globais — Sistema de Gestão de RH

## Tasks Globais de Implementação

### FASE 1 — Fundação

| ID | Tarefa | Módulo | Dependências | Prioridade | Estimativa | Critério de Conclusão | Estado |
|----|--------|--------|-------------|------------|------------|----------------------|--------|
| T-001 | Configurar infraestrutura Docker (dev/staging/prod) | Admin | — | Crítica | 3d | docker-compose funcional em todos os ambientes | ✅ Concluído |
| T-002 | Configurar PostgreSQL com migrações | Admin | T-001 | Crítica | 2d | Esquema base criado; migrações automatizadas | ✅ Concluído |
| T-003 | Configurar Keycloak (SSO + OIDC) | Auth | T-001 | Crítica | 3d | Login SSO funcional | ⬜ Pendente |
| T-004 | Implementar autenticação JWT | Auth | T-002, T-003 | Crítica | 3d | Login/Logout/Refresh funcional | ⬜ Pendente |
| T-005 | Implementar RBAC (Roles + Permissions) | Users | T-004 | Crítica | 2d | Permissões aplicadas por perfil | ⬜ Pendente |
| T-006 | Implementar MFA (TOTP) | Auth | T-004 | Alta | 2d | MFA funcional para Admin | ⬜ Pendente |
| T-007 | Criar CRUD de Utilizadores | Users | T-005 | Alta | 3d | Admin pode gerir utilizadores | ⬜ Pendente |
| T-008 | Implementar auditoria base (AuditLog) | Audit | T-004 | Alta | 2d | Todos os CRUD registam audit log | ⬜ Pendente |
| T-009 | Configurar ELK Stack para logging | Admin | T-001 | Alta | 2d | Logs centralizados | ⬜ Pendente |
| T-010 | Configurar Prometheus + Grafana | Admin | T-001 | Média | 2d | Métricas básicas disponíveis | ⬜ Pendente |

### FASE 2 — Estrutura Organizacional

| ID | Tarefa | Módulo | Dependências | Prioridade | Estimativa | Critério de Conclusão | Estado |
|----|--------|--------|-------------|------------|------------|----------------------|--------|
| T-011 | CRUD Departamentos e Organograma | Teams | T-007 | Alta | 3d | Organograma visual funcional | ⬜ Pendente |
| T-012 | CRUD Equipas e membros | Teams | T-011 | Alta | 2d | Transferência de colaboradores funcional | ⬜ Pendente |
| T-013 | CRUD Colaboradores (Employee) | Users | T-011 | Crítica | 4d | Perfil completo do colaborador | ⬜ Pendente |
| T-014 | CRUD Cargos (JobTitle) com tarifários | Users | T-011 | Alta | 1d | Tarifários por cargo | ⬜ Pendente |
| T-015 | CRUD Clientes | Clients | T-007 | Alta | 2d | Clientes com histórico de projetos | ⬜ Pendente |
| T-016 | CRUD Contratos | Contracts | T-013 | Alta | 3d | Contratos com alertas de expiração | ⬜ Pendente |
| T-017 | Configurar MinIO (armazenamento) | Documents | T-001 | Alta | 1d | Upload/download funcional | ⬜ Pendente |
| T-018 | Gestão Documental (repositório) | Documents | T-017 | Alta | 3d | Upload, permissões, lixeira | ⬜ Pendente |

### FASE 3 — Core Operacional

| ID | Tarefa | Módulo | Dependências | Prioridade | Estimativa | Critério de Conclusão | Estado |
|----|--------|--------|-------------|------------|------------|----------------------|--------|
| T-019 | CRUD Projetos com estados | Projects | T-015, T-013 | Crítica | 4d | Projetos com draft/active/closed | ⬜ Pendente |
| T-020 | Alocações de colaboradores a projetos | Projects | T-019 | Crítica | 3d | Alocações com alertas de sobrealodação | ⬜ Pendente |
| T-021 | Calendário de feriados por país | Calendar | T-002 | Alta | 2d | Feriados PT importados | ⬜ Pendente |
| T-022 | Geração automática de Timesheets | Timesheets | T-021, T-013 | Crítica | 3d | Pré-preenchimento mensal automático | ⬜ Pendente |
| T-023 | CRUD entradas de Timesheet | Timesheets | T-022, T-019 | Crítica | 3d | Colaborador edita horas com projeto | ⬜ Pendente |
| T-024 | Fluxo submissão/aprovação Timesheet | Timesheets | T-023 | Crítica | 3d | Aprovação individual e em massa | ⬜ Pendente |
| T-025 | Tipos de Ausência configuráveis | Absences | T-002 | Alta | 2d | 10 tipos base criados | ⬜ Pendente |
| T-026 | CRUD pedidos de Ausência | Absences | T-025, T-013 | Crítica | 4d | Pedido com validação de saldo | ⬜ Pendente |
| T-027 | Fluxo de aprovação de Ausências | Absences | T-026 | Crítica | 3d | Multi-etapa funcional | ⬜ Pendente |
| T-028 | Saldos de Férias (LeaveBalance) | Absences | T-026 | Alta | 2d | Saldo automático e manual | ⬜ Pendente |
| T-029 | Integração Ausências → Timesheets | Timesheets | T-027, T-023 | Alta | 2d | Ausências refletidas na folha | ⬜ Pendente |

### FASE 4 — Financeiro e Despesas

| ID | Tarefa | Módulo | Dependências | Prioridade | Estimativa | Critério de Conclusão | Estado |
|----|--------|--------|-------------|------------|------------|----------------------|--------|
| T-030 | CRUD Despesas por colaborador | Expenses | T-013, T-019 | Alta | 3d | Submissão com categorias | ⬜ Pendente |
| T-031 | Fluxo aprovação de Despesas | Expenses | T-030 | Alta | 2d | Aprovação + estados | ⬜ Pendente |
| T-032 | Deteção de duplicados | Expenses | T-030 | Média | 1d | Alerta automático de duplicado | ⬜ Pendente |
| T-033 | Exportação Excel/CSV de despesas | Expenses | T-031 | Média | 1d | Export funcional | ⬜ Pendente |
| T-034 | Dashboard de Recursos (ocupação) | Dashboard | T-020, T-028 | Alta | 4d | Indicadores em tempo real | ⬜ Pendente |
| T-035 | Dashboard Financeiro (margem consultor) | Financials | T-034, T-016 | Alta | 4d | Cálculo de margem por consultor | ⬜ Pendente |

### FASE 5 — Comunicação e Workflow

| ID | Tarefa | Módulo | Dependências | Prioridade | Estimativa | Critério de Conclusão | Estado |
|----|--------|--------|-------------|------------|------------|----------------------|--------|
| T-036 | Configurar RabbitMQ/Kafka | Notifications | T-001 | Alta | 1d | Fila de mensagens funcional | ⬜ Pendente |
| T-037 | Serviço de notificações por email | Notifications | T-036 | Alta | 2d | Templates de email enviados | ⬜ Pendente |
| T-038 | Notificações in-app | Notifications | T-036 | Alta | 2d | Centro de notificações funcional | ⬜ Pendente |
| T-039 | Caixa de Entrada (Workflow Inbox) | Workflow | T-037, T-038 | Alta | 3d | Centro unificado de aprovações | ⬜ Pendente |
| T-040 | Fluxos configuráveis multi-etapa | Workflow | T-039 | Média | 3d | Admin configura fluxos | ⬜ Pendente |
| T-041 | Calendário Organizacional | Calendar | T-028, T-021 | Alta | 3d | Visão mensal com ausências e feriados | ⬜ Pendente |
| T-042 | Alertas agendados (cron jobs) | Notifications | T-037 | Alta | 2d | Alertas de contrato, projeto, timesheet | ⬜ Pendente |

### FASE 6 — Relatórios e GDPR

| ID | Tarefa | Módulo | Dependências | Prioridade | Estimativa | Critério de Conclusão | Estado |
|----|--------|--------|-------------|------------|------------|----------------------|--------|
| T-043 | Motor de relatórios (PDF + Excel) | Reports | T-034 | Alta | 4d | 8 relatórios operacionais funcionais | ⬜ Pendente |
| T-044 | Filtros avançados em relatórios | Reports | T-043 | Média | 2d | Filtros por período, equipa, colaborador | ⬜ Pendente |
| T-045 | Módulo GDPR — consentimentos | GDPR | T-007 | Alta | 3d | Registo e revogação de consentimentos | ⬜ Pendente |
| T-046 | Pedidos de titulares (direitos RGPD) | GDPR | T-045 | Alta | 3d | Acesso, apagamento, portabilidade | ⬜ Pendente |
| T-047 | Políticas de retenção e anonimização | GDPR | T-045 | Alta | 3d | Anonimização automática | ⬜ Pendente |
| T-048 | Incidentes de segurança | GDPR | T-008 | Alta | 2d | Registo e alertas de incidentes | ⬜ Pendente |
| T-049 | Relatórios de conformidade GDPR | GDPR | T-047 | Média | 2d | 6 relatórios GDPR | ⬜ Pendente |

### FASE 7 — Conhecimento e Talento

| ID | Tarefa | Módulo | Dependências | Prioridade | Estimativa | Critério de Conclusão | Estado |
|----|--------|--------|-------------|------------|------------|----------------------|--------|
| T-050 | Políticas Internas (editor e pesquisa) | Policies | T-018 | Média | 3d | Publicação e pesquisa funcional | ⬜ Pendente |
| T-051 | Gestão de Cursos e Formações | Training | T-013 | Média | 4d | CRUD cursos + estados inscrição | ⬜ Pendente |
| T-052 | Avaliações de Desempenho | Training | T-013 | Média | 3d | Ciclos de avaliação | ⬜ Pendente |
| T-053 | Gestão de Competências e 9-Box | Training | T-052 | Baixa | 3d | Matriz 9-box funcional | ⬜ Pendente |
| T-054 | Helpdesk Interno (tickets) | Helpdesk | T-037 | Baixa | 4d | CRUD tickets com SLA | ⬜ Pendente |

---

## Riscos Globais

| ID | Risco | Probabilidade | Impacto | Módulos Afetados | Mitigação |
|----|-------|:---:|:---:|-----------------|-----------|
| R-001 | Ausência de definição clara de multi-tenant (Bridge351 vs NIVVOS) | Alta | Alta | Todos | Clarificar arquitetura multi-tenant antes da Fase 1 |
| R-002 | Integração com Keycloak pode atrasar Fase 1 | Média | Alta | Auth | Ter fallback de login local pronto primeiro |
| R-003 | Cálculo de margem por consultor sem acesso ao salário real | Alta | Alta | Financials | Definir modelo de custo antes da Fase 4 |
| R-004 | Sobrealodação permitida sem bloqueio pode gerar problemas operacionais | Média | Média | Projects, Capacity | Documentar comportamento e obter sign-off |
| R-005 | Falta de definição legal do período de retenção de dados (GDPR) | Alta | Alta | GDPR | Consultar jurídico antes da Fase 6 |
| R-006 | Ponto biométrico pode exigir tratamento especial GDPR | Média | Alta | Timesheets, GDPR | Confirmar se é biométrico; se sim, exige consentimento |
| R-007 | Migração de dados existentes não está especificada | Alta | Média | Todos | Definir estratégia de migração antes de arrancar |
| R-008 | Calendário de feriados por país requer atualização anual | Baixa | Baixa | Calendar | Integrar com API de feriados ou processo manual definido |
| R-009 | Regra "Aprovador tem mesmas permissões que Colaborador exceto aprovações" é ambígua | Alta | Média | Auth, Workflow | Ver Q-PERM-001 |
| R-010 | Ausência de SLA definido para aprovações pode causar tickets em atraso | Média | Média | Workflow | Definir SLAs por tipo antes da Fase 5 |

---

## Ambiguidades e Interpretações

| ID | Texto Original | Ambiguidade | Interpretação Proposta | Confiança |
|----|----------------|-------------|----------------------|-----------|
| AMB-001 | "Perfis de Utilizador – O admin tem permissões exclusivas, todos os outros terão as mesmas autorizações é necessário apenas poder alterar as permissões em caso de managers para aprovações" | Gestor, Aprovador e Colaborador têm as mesmas permissões base? | Existem 4 perfis distintos: Admin (tudo), Gestor (gestão de equipa + aprovações), Aprovador (só aprovações), Colaborador (self-service). Gestor pode ter permissões de aprovação ativadas pelo Admin. | 65% |
| AMB-002 | "Aniversário Bridge351 e NIVVOS" | Aniversário de fundação das empresas ou aniversário dos colaboradores? | Aniversário de fundação das entidades legais, apresentado como evento recorrente no calendário. | 60% |
| AMB-003 | "Margem em cada consultor, tendo em conta a rate do projeto" | Como é calculado o custo do consultor? | Custo hora = Valor contrato / (Horas mensais × 12). Margem = (Rate projeto - Custo hora consultor) × Horas no projeto. | 70% |
| AMB-004 | "Definir fim do projeto (para consultor) e criar alerta" | "Para consultor" significa alerta específico da alocação do consultor no projeto? | Alerta separado: (1) fim do projeto em geral; (2) fim da alocação do consultor no projeto — ambos configuráveis. | 80% |
| AMB-005 | "Configuração de horários fixos e flexíveis. Configuração de turnos noturnos. Configuração de políticas de assiduidade por grupo." | Âmbito completo de gestão de horários | Sistema de horários com tipos: fixo (horas definidas), flexível (banco de horas), turno noturno. Políticas de assiduidade por grupo/equipa. | 75% |

---

## Estado do Projecto

**Estado actual:** Setup iniciado — Bootstrap do monorepo concluído (P-000)

---

## Conformidade e Rastreabilidade

### Funcionalidades sem Módulo Claro (Órfãos)
Nenhuma funcionalidade foi identificada como órfã.

### Funcionalidades Duplicadas Identificadas

| Funcionalidade | Módulos | Resolução |
|---------------|---------|-----------|
| Logs de auditoria | Auth + GDPR + Audit | Centralizar em Módulo Audit; outros módulos emitem eventos |
| Alertas automáticos | Projects + Contracts + Timesheets + Notifications | Centralizar em Módulo Notifications; cada módulo emite evento |
| Upload de documentos | Documents + Contracts + Expenses + Absences | Usar Módulo Documents como serviço; outros módulos referenciam document_url |

### Entidades sem Testes (A Definir)
Todos os módulos têm critérios de aceitação Gherkin base. Os cenários de testes unitários e de integração devem ser expandidos nas tasks.md de cada módulo.


---

## Histórico de Actualizações do Documento

| Data | Alteração |
|------|-----------|
| 2026-06-29 | Criado roteiro de prompts OpenCode (OPENCODE-PLAYBOOK.md) com 26 prompts, modo estrito, questões interactivas por prompt, e acções de fecho automáticas para actualização de README e global-tasks-risks |


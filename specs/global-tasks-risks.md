# Tarefas e Riscos Globais

## Tarefas

| ID    | Descrição                         | Estado    |
| ----- | --------------------------------- | --------- |
| T-011 | Módulo de Equipas (backend)       | Concluido |
| T-012 | Módulo de Equipas (frontend)      | Concluido |
| T-013 | Módulo de Utilizadores (backend)  | Concluido |
| T-014 | Módulo de Utilizadores (frontend) | Concluido |
| T-015 | Módulo de Clientes (backend)      | Concluido |
| T-016 | Módulo de Contratos (backend)     | Concluido |
| T-017 | Configurar MinIO (armazenamento)  | Concluido |
| T-018 | Gestão Documental (backend)       | Concluido |
| T-019 | Módulo de Projetos (backend)      | Concluido |
| T-020 | Módulo de Alocações (backend)     | Concluido |
| T-022 | Módulo de Timesheets (backend)    | Concluido |
| T-023 | Geração automática de folhas      | Concluido |
| T-024 | Submissão e aprovação de folhas   | Concluido |
| T-029 | Sincronização com ausências       | Concluido |
| T-030 | CRUD Despesas por colaborador     | Concluido |
| T-031 | Fluxo aprovação de Despesas       | Concluido |
| T-032 | Deteção de duplicados             | Concluido |
| T-033 | Exportação Excel/CSV de despesas  | Concluido |

## Riscos

| ID    | Risco   | Probabilidade | Impacto | Mitigação |
| ----- | ------- | ------------- | ------- | --------- |
| (n/a) | (vazio) |               |         |           |

## Ambiguidades

| ID      | Descrição                                                                 | Decisão                                                     |
| ------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| P008-01 | Equipa pode ter colaboradores de departamentos diferentes?                | Sim, sem restrição                                          |
| P009-01 | Contratos expirados: arquivamento automático ou ação manual?              | Arquivamento automático no dia seguinte + alerta preventivo |
| P010-01 | Sobrealocação (>100%): bloquear, permitir com aviso ou notificar manager? | Permitir com aviso (warning) + notificar manager            |
| P010-02 | Projeto closed pode ser reativado?                                        | Sim, admin pode reativar                                    |
| P011-01 | Submissão com entradas a 0h: válido ou obrigatório >0h?                   | 0h é válido como entrada preenchida                         |

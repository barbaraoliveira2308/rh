# Módulo 04 — Clientes

## Objetivo

Registar e gerir clientes associados a projetos, com dados de contacto, estado e histórico.

## Entidades

### Client

| Campo          | Tipo         | Validação                | Notas               |
| -------------- | ------------ | ------------------------ | ------------------- |
| id             | UUID         | PK                       | —                   |
| name           | VARCHAR(200) | Obrigatório              | —                   |
| nif            | VARCHAR(20)  | Único, Nullable          | Número fiscal       |
| contact_name   | VARCHAR(100) | Nullable                 | —                   |
| email          | VARCHAR(255) | Formato válido, Nullable | —                   |
| phone          | VARCHAR(20)  | Nullable                 | —                   |
| address        | TEXT         | Nullable                 | —                   |
| responsible_id | UUID         | FK Employee, Nullable    | Responsável interno |
| status         | ENUM         | active, inactive         | Default active      |
| created_at     | TIMESTAMP    | Auto                     | —                   |
| updated_at     | TIMESTAMP    | Auto                     | —                   |

## Regras de Negócio

| ID         | Regra                                                                       |
| ---------- | --------------------------------------------------------------------------- |
| BR-CLI-001 | Um cliente inativo pode ser consultado mas não pode receber novos projetos. |
| BR-CLI-002 | NIF deve ser único quando fornecido.                                        |
| BR-CLI-003 | Histórico de projetos é mantido mesmo após inativação do cliente.           |

## Requisitos Funcionais

| ID         | Descrição                                                    |
| ---------- | ------------------------------------------------------------ |
| RF-CLI-001 | O sistema deve permitir criar, editar e desativar clientes.  |
| RF-CLI-002 | O sistema deve associar projetos a clientes.                 |
| RF-CLI-003 | O sistema deve apresentar histórico de projetos por cliente. |
| RF-CLI-004 | O sistema deve suportar pesquisa e filtragem de clientes.    |

## Permissões

| Ação                 | Administrador | Gestor | Colaborador |
| -------------------- | :-----------: | :----: | :---------: |
| Criar/editar cliente |      ✅       |   ✅   |     ❌      |
| Ver clientes         |      ✅       |   ✅   |     ❌      |
| Desativar cliente    |      ✅       |   ❌   |     ❌      |

## APIs

- GET /api/v1/clients
- POST /api/v1/clients
- GET /api/v1/clients/:id
- PUT /api/v1/clients/:id
- GET /api/v1/clients/:id/projects

## Notas de Implementação

### Entregue

- **Entidades:** `Client` (TypeORM), com os campos definidos na spec mais `deletedAt` para soft-delete.
- **DTOs:** `CreateClientDto`, `UpdateClientDto`.
- **Service:** `ClientsService` com métodos `create`, `findAll`, `findOne`, `update`, `deactivate`, `softDelete`, `getProjects`.
- **Controller:** `ClientsController` expõe os endpoints:
  - `GET /clients`
  - `GET /clients/:id`
  - `POST /clients`
  - `PATCH /clients/:id`
  - `DELETE /clients/:id` (desativação via alteração de `status` para `inactive`)
  - `GET /clients/:id/projects`
- **Soft-delete:** existe o campo `deletedAt`, mas o endpoint `DELETE` implementa apenas desativação lógica por `status`; existe método `softDelete` no serviço, não exposto no controller.
- **Eventos / Cron jobs:** não implementados.
- **Tipos/estados/renovações:** não aplicáveis a este módulo.

### Simplificações/Decisões

- O endpoint `GET /clients/:id/projects` retorna sempre `{ data: [] }`; ainda não existe integração com o módulo de projetos.
- A desativação (`DELETE`) altera o `status` para `INACTIVE` em vez de preencher `deletedAt`.
- O endpoint de update usa `PATCH` em vez de `PUT`.
- Não existe validação de NIF por formato, apenas unicidade quando fornecido.

### Testes

- Não existem testes unitários nem E2E para o módulo `clients`.

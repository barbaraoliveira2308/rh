# Módulo 17 — Políticas Internas

## Objetivo

Publicar, organizar e disponibilizar políticas internas e conhecimento organizacional num repositório centralizado e pesquisável.

## Entidades

### Policy

| Campo        | Tipo         | Notas                                         |
| ------------ | ------------ | --------------------------------------------- |
| id           | UUID         | PK                                            |
| title        | VARCHAR(200) | —                                             |
| content      | TEXT         | Conteúdo em formato rich text (HTML/Markdown) |
| category     | VARCHAR(100) | —                                             |
| status       | ENUM         | draft, published, archived                    |
| author_id    | UUID         | FK Employee                                   |
| published_at | TIMESTAMP    | —                                             |
| updated_at   | TIMESTAMP    | —                                             |
| version      | INT          | Incrementado a cada edição                    |
| tags         | JSONB        | Para pesquisa                                 |

## Requisitos Funcionais

| ID         | Descrição                                                                        |
| ---------- | -------------------------------------------------------------------------------- |
| RF-POL-001 | O sistema deve permitir publicação de políticas internas com editor de conteúdo. |
| RF-POL-002 | O sistema deve suportar pesquisa por palavras-chave.                             |
| RF-POL-003 | O sistema deve manter histórico de versões das políticas.                        |
| RF-POL-004 | O sistema deve suportar categorização e tags.                                    |
| RF-POL-005 | O sistema deve suportar integração futura com IA para pesquisa contextual.       |

## Permissões

| Ação                     | Administrador | Gestor | Colaborador |
| ------------------------ | :-----------: | :----: | :---------: |
| Criar/editar política    |      ✅       |   ❌   |     ❌      |
| Publicar política        |      ✅       |   ❌   |     ❌      |
| Ver políticas publicadas |      ✅       |   ✅   |     ✅      |
| Pesquisar políticas      |      ✅       |   ✅   |     ✅      |

## APIs

- GET /api/v1/policies
- POST /api/v1/policies
- GET /api/v1/policies/:id
- PUT /api/v1/policies/:id
- POST /api/v1/policies/:id/publish
- GET /api/v1/policies/search?q=

## Nota sobre IA

O documento menciona "integração futura com mecanismos de IA para pesquisa contextual" — esta funcionalidade é explicitamente futura e não faz parte do âmbito v1.

## Notas de Implementação

Implementado em P-020 (`backend/src/policies/`), documentado em P-027.

- **Entidade `Policy`**: campos conforme a spec, mais `parent_id` (UUID, nullable) — liga uma versão publicada à sua versão original, usado por `findVersions()` para reconstruir o histórico. `status` é `varchar(20)` com valores do enum `PolicyStatus` (draft, published, archived), em vez de um `ENUM` nativo do Postgres.
- **Pesquisa (RF-POL-002)**: implementada com `tsvector`/`plainto_tsquery('portuguese', ...)` do Postgres sobre `title || content`, aplicada diretamente em `GET /policies?q=`. Não existe um endpoint `GET /policies/search` separado como listado na spec original — a pesquisa é um filtro opcional do mesmo endpoint de listagem, junto com `category`.
- **Versionamento (RF-POL-003)**: `update()` nunca faz UPDATE em linha existente — cria sempre uma nova linha com `version + 1` e `status = draft`, preservando a versão publicada anterior imutável. `GET /policies/:id/versions` (extra face à spec original, admin-only) devolve todas as versões de uma política.
- **Rotas reais**: `POST /policies`, `GET /policies` (lista publicadas, com `q`/`category`), `GET /policies/:id`, `GET /policies/:id/versions` (admin), `PATCH /policies/:id` (a spec original listava `PUT`), `POST /policies/:id/publish`, `DELETE /policies/:id` (arquiva — não apaga; corresponde ao estado `archived` do enum).
- **Permissões**: `findAll`/`findOne` sem `@Roles` — qualquer utilizador autenticado pode ver/pesquisar políticas publicadas, conforme a tabela de permissões. Criar, editar, publicar e arquivar exigem `RoleEnum.ADMIN`, tal como especificado (Gestor sem acesso de escrita).
- **RF-POL-005** (IA para pesquisa contextual): não implementado, conforme já assinalado como fora de âmbito v1.

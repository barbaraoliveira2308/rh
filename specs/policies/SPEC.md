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
| Criar/editar política    |      ✅       |   ✅   |     ❌      |
| Publicar política        |      ✅       |   ❌   |     ❌      |
| Arquivar política        |      ✅       |   ❌   |     ❌      |
| Ver políticas publicadas |      ✅       |   ✅   |     ✅      |
| Pesquisar políticas      |      ✅       |   ✅   |     ✅      |

**`Criar/editar política` alargada a Gestor em P-086** — decisão direta do utilizador ("Adiciona os gestores como criadores e editores de políticas"). Publicar/arquivar continuam exclusivos de Administrador (confirmado explicitamente com o utilizador antes de implementar). Ver secção "Notas de Implementação".

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
- **Permissões**: `findAll`/`findOne` sem `@Roles` — qualquer utilizador autenticado pode ver/pesquisar políticas publicadas, conforme a tabela de permissões. Criar e editar exigem `RoleEnum.ADMIN` ou `RoleEnum.MANAGER` (alargado a Gestor em P-086); publicar e arquivar continuam exclusivos de `RoleEnum.ADMIN`.
- **RF-POL-005** (IA para pesquisa contextual): não implementado, conforme já assinalado como fora de âmbito v1.

## Frontend (P-037)

- `frontend/src/pages/PoliciesListPage.tsx` (`/policies`) — item "Políticas" na sidebar, visível a todos os utilizadores autenticados (sem restrição de papel, conforme "Ver políticas publicadas" ✅ para Admin/Gestor/Colaborador). Não-admin vê diretamente a tabela de políticas publicadas com pesquisa (`q`) e filtro de categoria (texto livre, campo `category` não é um enum fixo no backend). Admin vê `Tabs` "Publicadas"/"Rascunhos"/"Arquivadas" e botão "Nova Política" (diálogo com título/categoria/conteúdo em `<textarea>` simples — sem editor rich-text, por não haver nenhuma biblioteca deste tipo no frontend nem ter sido pedida; conteúdo tratado como texto simples também na leitura, com `white-space: pre-wrap`, para evitar risco de XSS ao injetar HTML gerado pelo admin).
- `frontend/src/pages/PolicyDetailPage.tsx` (`/policies/:id`) — título, badges de estado/versão, categoria, tags, autor (resolvido via `GET /employees` cruzando `Employee.userId` com `Policy.authorId`, mesmo padrão do Helpdesk) e conteúdo. Ações admin: "Editar (nova versão)" (chama `PATCH /policies/:id`, que devolve uma nova linha/versão — a página navega para o novo `id`, mantendo a versão anterior imutável), "Publicar" (se `draft`), "Arquivar" (se `published`, com `ConfirmDialog`). Secção "Histórico de Versões" (admin, via `GET /policies/:id/versions`) lista todas as versões com link para cada uma.
- **Gap de backend encontrado e corrigido nesta fase** (decisão do utilizador P037-01): `PoliciesService.findAll()` filtrava sempre por `PUBLISHED`, sem forma de listar rascunhos — intencional para o público, mas impedia uma UI de gestão (um rascunho só era visível pela UI logo a seguir a ser criado, através do `id` devolvido na resposta; se o admin saísse da página antes de publicar, o rascunho ficava inacessível). `findAll()` ganhou um 4º parâmetro `status` mais um 5º `isAdmin` — só quando `isAdmin` é `true` e `status` é fornecido é que o filtro deixa de ser forçado a `PUBLISHED`; a verificação de admin é feita no `PoliciesController` a partir do JWT (`user.roles.includes(RoleEnum.ADMIN)`), nunca confiando no valor enviado pelo cliente. `GET /policies?status=` passa a aceitar o parâmetro (Swagger `@ApiQuery`), usado pela aba "Rascunhos"/"Arquivadas" do frontend. 3 novos testes unitários (180/180 total, antes 177/177).
- `pnpm run lint` (0 erros) e `pnpm run build` (raiz — shared, backend, frontend) green; verificação em browser real via Playwright contra a stack Docker completa — criação de política (rascunho), publicação, edição (nova versão em rascunho mantendo a v1 publicada imutável), histórico de versões, aba "Rascunhos" a mostrar corretamente a v2, pesquisa full-text a devolver o resultado esperado, 0 erros de consola em todos os passos.

## P-086 — Gestor como criador/editor de políticas

Pedido direto do utilizador: "Adiciona os gestores como criadores e editores de políticas." Ambiguidade genuína levantada e resolvida com o utilizador antes de implementar — backend e frontend tratavam "editar"/"publicar"/"arquivar" como um único bloco `@Roles(ADMIN)`/`isAdmin`, não como permissões separadas; confirmado explicitamente que Gestor **não** deve poder publicar nem arquivar, só criar/editar (fica em rascunho até um Administrador publicar).

- **Backend**: `POST /policies` (criar) e `PATCH /policies/:id` (editar — cria nova versão) passam a `@Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)`; `GET /policies/:id/versions` (histórico de versões) alargado da mesma forma, como capacidade companheira natural de quem edita. `POST /policies/:id/publish` e `DELETE /policies/:id` (arquivar) mantêm-se `@Roles(RoleEnum.ADMIN)`, sem alteração. `PoliciesController.findAll()` passa a computar `canManage = isAdmin || isManager` (antes só `isAdmin`) para decidir se o filtro de `status` do pedido é respeitado (em vez de forçado sempre a `PUBLISHED`) — sem isto, um Gestor nunca veria o rascunho que acabou de criar. `PoliciesService.findAll()` teve o 4º parâmetro renomeado de `isAdmin` para `canManage` (só semântica, mesmo comportamento, mesma assinatura posicional — testes existentes inalterados).
- **Frontend**: `PoliciesListPage.tsx`/`PolicyDetailPage.tsx` passam a distinguir `isAdmin` (Publicar/Arquivar, mantido exclusivo) de `canManage = isAdmin || permissions.includes('manager')` (botão "Nova Política", abas "Rascunhos"/"Arquivadas", botão "Editar (nova versão)", histórico de versões, resolução do nome do autor via `GET /users`) — mesmo padrão `permissions.includes('manager')` já usado em `AppLayout.tsx`/`DashboardPage.tsx` desde P-080/P-081.
- Sem migração, sem alteração aos modelos de dados nem à máquina de estados (`draft → published → archived`). `pnpm run lint` (0 erros) e `pnpm run build` (raiz, backend, frontend) green.

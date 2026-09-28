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

- GET /api/v1/policies?q=&category=&status=
- POST /api/v1/policies
- GET /api/v1/policies/:id
- GET /api/v1/policies/:id/versions
- PATCH /api/v1/policies/:id
- POST /api/v1/policies/:id/publish
- DELETE /api/v1/policies/:id (arquiva, não elimina)
- GET /api/v1/policies/acceptance/pending
- POST /api/v1/policies/:id/accept
- GET /api/v1/policies/acceptance/logs

## Nota sobre IA

O documento menciona "integração futura com mecanismos de IA para pesquisa contextual" — esta funcionalidade é explicitamente futura e não faz parte do âmbito v1.

## Notas de Implementação

Implementado em P-020 (`backend/src/policies/`), documentado em P-027.

- **Entidade `Policy`**: campos conforme a spec, mais `parent_id` (UUID, nullable) — liga uma versão publicada à sua versão original, usado por `findVersions()` para reconstruir o histórico. `status` é `varchar(20)` com valores do enum `PolicyStatus` (draft, published, archived), em vez de um `ENUM` nativo do Postgres.
- **Pesquisa (RF-POL-002)**: implementada com `tsvector`/`plainto_tsquery('portuguese', ...)` do Postgres sobre `title || content`, aplicada diretamente em `GET /policies?q=`. Não existe um endpoint `GET /policies/search` separado como listado na spec original — a pesquisa é um filtro opcional do mesmo endpoint de listagem, junto com `category`.
- **Versionamento (RF-POL-003)**: `update()` nunca faz UPDATE em linha existente — cria sempre uma nova linha com `version + 1` e `status = draft`, preservando a versão publicada anterior imutável. `GET /policies/:id/versions` devolve todas as versões e está disponível para Administrador e Gestor.
- **Rotas reais**: `POST /policies`, `GET /policies` (lista publicadas por omissão, com `q`/`category`; `status` permite ao Administrador/Gestor consultar rascunhos e arquivadas), `GET /policies/:id`, `GET /policies/:id/versions`, `PATCH /policies/:id`, `POST /policies/:id/publish`, `DELETE /policies/:id` (arquiva — não apaga; corresponde ao estado `archived` do enum), e as rotas de aceite obrigatório listadas acima.
- **Permissões**: `findAll`/`findOne` sem `@Roles` — qualquer utilizador autenticado pode ver/pesquisar políticas publicadas, conforme a tabela de permissões. Criar e editar exigem `RoleEnum.ADMIN` ou `RoleEnum.MANAGER` (alargado a Gestor em P-086); publicar e arquivar continuam exclusivos de `RoleEnum.ADMIN`.
- **Aceite obrigatório**: `PolicyAcceptance` regista utilizador, política, versão e data de aceite em `hr.policy_acceptances`, com unicidade por par utilizador/política. O frontend bloqueia a continuação enquanto existirem políticas publicadas pendentes e permite aceitar individualmente ou em lote.
- **RF-POL-005** (IA para pesquisa contextual): não implementado, conforme já assinalado como fora de âmbito v1.

## Frontend (P-037)

- `frontend/src/pages/PoliciesListPage.tsx` (`/policies`) — item "Políticas" na sidebar, visível a todos os utilizadores autenticados (sem restrição de papel, conforme "Ver políticas publicadas" ✅ para Admin/Gestor/Colaborador). A tabela usa o toolbar do DataGrid para filtragem local das colunas carregadas; não envia `q` para a pesquisa full-text nem pesquisa o conteúdo integral. Administrador e Gestor veem as abas "Publicadas"/"Rascunhos"/"Arquivadas" e o botão "Nova Política" (diálogo com título/categoria/conteúdo em `<textarea>` simples — sem editor rich-text; conteúdo tratado como texto simples também na leitura, com `white-space: pre-wrap`).
- `frontend/src/pages/PolicyDetailPage.tsx` (`/policies/:id`) — título, metadados de estado/versão/categoria, tags, autor, ações e histórico. A visualização do conteúdo usa uma página de manual institucional, com ambiente acinzentado, folha central clara, cabeçalho formal, divisórias, margens e tipografia sóbria. Administrador e Gestor podem editar; apenas Administrador pode publicar ou arquivar. O histórico de versões está disponível para ambos.
- `frontend/src/components/PolicyAcceptanceGate.tsx` — modal bloqueante de "Leitura e aceite obrigatório", apresentado a utilizadores autenticados com políticas publicadas pendentes. Usa a mesma linguagem visual de manual institucional, com cabeçalho de conformidade, instruções, Accordion por política, checkbox individual, opção "marcar todas" e ação "Aceitar e continuar".
- **Gap de backend encontrado e corrigido nesta fase** (decisão do utilizador P037-01): `PoliciesService.findAll()` filtrava sempre por `PUBLISHED`, sem forma de listar rascunhos — intencional para o público, mas impedia uma UI de gestão (um rascunho só era visível pela UI logo a seguir a ser criado, através do `id` devolvido na resposta; se o admin saísse da página antes de publicar, o rascunho ficava inacessível). `findAll()` ganhou um 4º parâmetro `status` mais um 5º `isAdmin` — só quando `isAdmin` é `true` e `status` é fornecido é que o filtro deixa de ser forçado a `PUBLISHED`; a verificação de admin é feita no `PoliciesController` a partir do JWT (`user.roles.includes(RoleEnum.ADMIN)`), nunca confiando no valor enviado pelo cliente. `GET /policies?status=` passa a aceitar o parâmetro (Swagger `@ApiQuery`), usado pela aba "Rascunhos"/"Arquivadas" do frontend. 3 novos testes unitários (180/180 total, antes 177/177).
- `pnpm run lint` (0 erros) e `pnpm run build` (raiz — shared, backend, frontend) green; verificação em browser real via Playwright contra a stack Docker completa — criação de política (rascunho), publicação, edição (nova versão em rascunho mantendo a v1 publicada imutável), histórico de versões, aba "Rascunhos" a mostrar corretamente a v2, pesquisa full-text a devolver o resultado esperado, 0 erros de consola em todos os passos.

## P-086 — Gestor como criador/editor de políticas

Pedido direto do utilizador: "Adiciona os gestores como criadores e editores de políticas." Ambiguidade genuína levantada e resolvida com o utilizador antes de implementar — backend e frontend tratavam "editar"/"publicar"/"arquivar" como um único bloco `@Roles(ADMIN)`/`isAdmin`, não como permissões separadas; confirmado explicitamente que Gestor **não** deve poder publicar nem arquivar, só criar/editar (fica em rascunho até um Administrador publicar).

- **Backend**: `POST /policies` (criar) e `PATCH /policies/:id` (editar — cria nova versão) passam a `@Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)`; `GET /policies/:id/versions` (histórico de versões) alargado da mesma forma, como capacidade companheira natural de quem edita. `POST /policies/:id/publish` e `DELETE /policies/:id` (arquivar) mantêm-se `@Roles(RoleEnum.ADMIN)`, sem alteração. `PoliciesController.findAll()` passa a computar `canManage = isAdmin || isManager` (antes só `isAdmin`) para decidir se o filtro de `status` do pedido é respeitado (em vez de forçado sempre a `PUBLISHED`) — sem isto, um Gestor nunca veria o rascunho que acabou de criar. `PoliciesService.findAll()` teve o 4º parâmetro renomeado de `isAdmin` para `canManage` (só semântica, mesmo comportamento, mesma assinatura posicional — testes existentes inalterados).
- **Frontend**: `PoliciesListPage.tsx`/`PolicyDetailPage.tsx` passam a distinguir `isAdmin` (Publicar/Arquivar, mantido exclusivo) de `canManage = isAdmin || permissions.includes('manager')` (botão "Nova Política", abas "Rascunhos"/"Arquivadas", botão "Editar (nova versão)", histórico de versões, resolução do nome do autor via `GET /users`) — mesmo padrão `permissions.includes('manager')` já usado em `AppLayout.tsx`/`DashboardPage.tsx` desde P-080/P-081.
- Sem migração, sem alteração aos modelos de dados nem à máquina de estados (`draft → published → archived`). `pnpm run lint` (0 erros) e `pnpm run build` (raiz, backend, frontend) green.

## Verificação 2026-09-23

- **Conforme**: entidade, estados, versionamento imutável, tags/categorias, permissões diferenciadas para Administrador/Gestor/Colaborador, publicação exclusiva de Administrador, arquivo exclusivo de Administrador e pesquisa full-text no backend (`GET /policies?q=`).
- **Conforme após ajuste visual**: `PolicyDetailPage` e `PolicyAcceptanceGate` usam a mesma linguagem de manual institucional, com ambiente cinza, folha central clara, cabeçalho formal, divisórias, margens e tipografia sóbria. O detalhe separa breadcrumb/cabeçalho, metadados, tags, ações, conteúdo e histórico de versões; o aceite mantém Accordion, checkbox individual e “marcar todas”, com modal de conformidade, instruções e rodapé de confirmação destacados.
- **Gap RF-POL-001**: a criação/edição usa `<textarea>` de texto simples, não um editor rich-text HTML/Markdown.
- **Gap RF-POL-002 no frontend**: a lista exibe o toolbar do DataGrid, mas a pesquisa é local sobre as colunas carregadas e não envia `q` para a pesquisa full-text do backend; o conteúdo integral não é pesquisado nessa interface.
- **Desvios de contrato documentados**: a atualização real é `PATCH /policies/:id` (não `PUT`) e a pesquisa é um filtro opcional de `GET /policies` (não uma rota separada `/policies/search`).
- **RF-POL-005** continua fora do âmbito v1 por ser integração futura com IA.
- Validação desta revisão: lint completo sem erros, com 12 avisos preexistentes; o build completo continua bloqueado por erro de tipagem preexistente em `frontend/src/components/DataTable.tsx`, não relacionado às políticas.

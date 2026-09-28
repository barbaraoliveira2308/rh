# Review da branch `feature002-politicas-review`

## Comparação

- Branch: `feature002-politicas-review`.
- Base desta MR: `feature002-ui-foundation`, que contém a fundação visual compartilhada e deve ser revisada primeiro contra `develop`.
- Diff desta MR sobre a base: 19 arquivos, 946 inserções e 121 remoções.
- O fluxo de colaboradores pertence à branch `feature003-colaboradores` e não faz parte desta revisão.

## Descrição para o reviewer

Esta MR implementa o aceite obrigatório das políticas publicadas e completa a experiência de gestão e consulta do módulo de Políticas Internas. Ela depende da MR-base `feature002-ui-foundation` para os componentes compartilhados MUI/DataGrid.

## Alterações

- Adiciona `PolicyAcceptance` e a migration `1839000000000-CreatePolicyAcceptances`, registrando utilizador, política, versão e data do aceite, com unicidade por utilizador/política.
- Adiciona `GET /policies/acceptance/pending`, `POST /policies/:id/accept` e `GET /policies/acceptance/logs`.
- A consulta de pendências considera políticas publicadas ainda não aceitas pelo utilizador autenticado. O aceite só é permitido para política publicada e é idempotente para o mesmo utilizador/política.
- A consulta dos logs de aceite é restrita a Administrador e Gestor.
- Adiciona o gate de aceite obrigatório no layout autenticado, com aceite individual ou em lote antes de continuar para o conteúdo da aplicação.
- Atualiza as páginas de listagem e detalhe, incluindo gestão de rascunhos e versões, histórico de aceites e apresentação institucional do documento.
- Mantém criação/edição para Administrador e Gestor; publicação e arquivamento permanecem exclusivos de Administrador.
- Atualiza `specs/POLICIES.md`, `PROJECT_STATE.md` e `RESUME_PROMPT.md`.

## Foco da revisão

- Migration, relações e unicidade de `hr.policy_acceptances`.
- Política em rascunho/arquivada não deve aparecer como pendente nem ser aceita.
- Aceite individual e em lote, repetição idempotente e liberação do conteúdo após concluir todos os aceites pendentes.
- Acesso aos logs restrito a Administrador/Gestor e publicação/arquivamento restritos a Administrador.
- Comportamento do aceite quando uma nova versão da política é publicada.

## Validação

- `pnpm --dir frontend run build`: passou; Vite reportou avisos de exports internos (`isJSDOM`/`isFirefox`) do MUI X, sem impedir o build.
- `pnpm --dir backend run build`: passou.
- `pnpm --dir backend run test -- --runInBand policies/policies.service.spec.ts`: 17 testes passaram.
- `git diff --check`: passou.

## Dependência de integração

Revisar e integrar primeiro `feature002-ui-foundation` em `develop`. Depois, alterar o destino desta MR para `develop` e integrar `feature002-politicas-review`.

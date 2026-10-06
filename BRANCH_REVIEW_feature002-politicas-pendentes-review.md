# Revisão: Pendências de Aceite de Políticas

## Branch e base

- Branch: `feature002-politicas-pendentes-review`
- Destino: `develop`
- Base: `origin/develop` (`e4c33ff`)
- Commit: `b9d1c72` (`feat(policies): list users pending policy acceptance`)
- Escopo: listagem de colaboradores com políticas pendentes e envio de lembrete individual.

## Descrição

Esta alteração permite que Administradores e Gestores identifiquem os colaboradores ativos que ainda não aceitaram políticas publicadas e enviem um lembrete in-app individual. O acesso à lista é registado na auditoria.

## Alterações

- Adiciona `GET /policies/acceptance/pending-users` para listar colaboradores e respetivas políticas publicadas ainda não aceites.
- Adiciona `POST /policies/acceptance/remind/:userId` para enviar um lembrete in-app ao colaborador selecionado.
- Restringe ambas as operações a Administrador e Gestor.
- Regista a consulta da lista como `PolicyAcceptancePendingReviewed` no módulo de auditoria.
- Adiciona a tabela `PolicyPendingAcceptanceTable` à página de Políticas, incluindo contagem de pendências e ação individual de lembrete.
- Mantém os fluxos existentes de aceite, publicação e logs de aceite.

## Foco da revisão

- Apenas colaboradores ativos e políticas publicadas devem entrar no cálculo de pendências.
- Um aceite existente deve excluir somente o par correspondente colaborador/política.
- Utilizadores sem pendências não devem receber lembretes.
- A rota não deve ser acessível a funcionários comuns.
- A consulta deve continuar a gerar o evento de auditoria esperado.

## Validação

- `pnpm --dir backend run test -- --runInBand policies/policies.service.spec.ts`: 22 testes passaram.
- `pnpm --dir backend run build`: passou.
- `pnpm --dir frontend run build`: passou; permanecem avisos conhecidos de exports internos do MUI X (`isJSDOM`/`isFirefox`).
- `git diff --check`: passou.

## Banco de dados

Não adiciona migration. Usa as tabelas de políticas, aceites, funcionários, auditoria e notificações já existentes em `develop`.

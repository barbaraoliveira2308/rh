# Revisão: Perfil e Autosserviço do Colaborador

## Branch e base

- Branch: `feature003-perfil-colaborador-review`
- Destino: `develop`
- Base: `origin/develop` (`e4c33ff`)
- Commit: `0283caa` (`feat(profile): add employee self-service profile`)
- Escopo: perfil próprio do colaborador, autosserviço, ausência, formação e documentos.

## Descrição

Adiciona a área **Perfil** ao menu lateral e disponibiliza dados pessoais, laborais, contratos, formações, ausências e documentos do colaborador autenticado. Os dados pessoais são editáveis pelo próprio usuário; Administradores e Gestores também podem editar as informações laborais e contratuais do seu próprio perfil.

## Alterações

- Cria `GET/PATCH /users/me`, resolvendo o funcionário pelo usuário autenticado. O payload retorna relações resumidas e não expõe dados pessoais do gestor.
- Persiste os campos adicionais em `hr.employee_profile_details`, com marcação dos dados sensíveis para GDPR.
- Cria `GET/PATCH /contracts/me/:id`, com verificação de propriedade antes de atualizar o contrato.
- Cria `GET /teams/me` para listar somente as equipas do colaborador atual.
- Filtra folhas de horas e ausências pelo `employee_id` esperado pelo backend.
- Autoaprova pedidos de ausência criados por Admin/Gestor, mantendo atualização de saldo, histórico e evento de aprovação. A configuração de aprovador específico tem precedência sobre o gestor direto.
- Importa feriados nacionais de Portugal sob demanda quando o ano consultado ainda não está na base.
- Adiciona cursos, inscrições próprias, edição de cursos por Admin/Gestor, histórico e upload de materiais associado ao curso.
- Adiciona upload privado de documentos próprios e visualização de imagens/PDF; os demais formatos permanecem disponíveis para download.
- Altera todos os campos de data para entrada `DD/MM/AAAA`, persistindo ISO `YYYY-MM-DD` nas APIs.
- Integra os novos dados pessoais e documentos privados ao processo de anonimização GDPR.

## Foco da revisão

- `users/me` e `contracts/me/:id` devem usar exclusivamente a identidade do token e nunca aceitar acesso a outro colaborador.
- Funcionários comuns só podem editar dados pessoais; os campos laborais devem ser ignorados pelo backend para esses papéis.
- Os pedidos de ausência privilegiados devem ficar aprovados, com saldo e histórico consistentes, sem tarefa pendente no workflow.
- O aprovador configurado deve ser usado no workflow; sem configuração, deve valer o gestor direto.
- Upload pessoal deve sempre forçar o proprietário autenticado e manter o documento privado.
- A anonimização deve remover detalhes pessoais e documentos privados, sem apagar materiais partilhados de cursos.
- Datas inválidas ou incompletas não devem substituir silenciosamente o valor anterior.

## Validação

- Builds frontend e backend: passaram.
- Lint frontend dos arquivos alterados: passou.
- Lint backend: sem erros; permanecem 14 avisos de retorno explícito em métodos do módulo Training.
- Testes focais: 170 testes em 8 suítes passaram (`users`, `absences`, `contracts`, `documents`, `training`, `workflow`, `gdpr` e `calendar`).
- `git diff --check`: passou.

## Migrations

- `1840000000000-CreateEmployeeProfileDetails`: cria os campos pessoais adicionais e o aprovador de ausências.
- `1841000000000-AddCourseIdToDocuments`: adiciona o vínculo de documentos a cursos.
- Ambas foram aplicadas no banco local durante a validação. Não remover nem renumerar migrations já aplicadas.

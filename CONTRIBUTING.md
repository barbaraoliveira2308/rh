# Contributing

## Branches

| Nome        | Propósito                                           |
| ----------- | --------------------------------------------------- |
| `main`      | Produção. Apenos merges de `release/*`              |
| `develop`   | Integração contínua. Base para `feature/*`          |
| `feature/*` | Nova funcionalidade. Branch a partir de `develop`   |
| `fix/*`     | Correção de bug. Branch a partir de `develop`       |
| `release/*` | Preparação de release. Branch a partir de `develop` |

## Commits (Conventional Commits)

```
<type>(<scope>): <descrição>

[opcional: corpo]
[opcional: footer]
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`.

Exemplos:

- `feat(auth): add MFA TOTP enrollment`
- `fix(timesheets): correct overtime calculation on weekends`
- `docs(api): document absence endpoints`

## Novo Módulo — Checklist

- [ ] **Spec**: criar `specs/<MODULO>.md` com descrição funcional e técnica
- [ ] **Entities**: definir entidades TypeORM no `backend/src/<modulo>/entities/`
- [ ] **DTOs**: criar DTOs de validação com `class-validator` e `@ApiProperty()`
- [ ] **Service**: implementar lógica de negócio no `backend/src/<modulo>/services/`
- [ ] **Controller**: expor endpoints REST com `@ApiTags`, `@ApiBearerAuth`, guardas RBAC
- [ ] **Module**: registar no `AppModule` e configurar `TypeOrmModule.forFeature()`
- [ ] **Tests**: testes unitários (`*.spec.ts`) e e2e (`test/*.e2e-spec.ts`)
- [ ] **Migration**: gerar migration com `pnpm migration:generate`
- [ ] **Swagger**: verificar documentação em `/api/docs` (dev/staging)
- [ ] **Frontend**: páginas, componentes, rotas lazy-loaded, traduções PT

## Testes

```bash
# Todos os testes (unitários + e2e backend)
pnpm test

# Apenas testes unitários do backend
pnpm --filter @bridge351/srh-backend run test

# Testes e2e do backend (requer PostgreSQL — usa sempre a BD "srh_test", isolada da BD de
# desenvolvimento "srh"; o script já força POSTGRES_DB=srh_test e a suite tem uma guarda de
# segurança própria (test/jest-e2e.setup.ts) mesmo que seja invocada de outra forma — ver R-046)
pnpm --filter @bridge351/srh-backend run test:e2e

# Testes e2e do frontend (Playwright, requer servidor dev)
pnpm --filter @bridge351/srh-frontend run test:e2e

# Lint
pnpm run lint

# Build
pnpm run build
```

Os testes e2e do backend usam `--runInBand` e uma base de dados dedicada (`srh_test`).  
Configurar as credenciais em `backend/.env.test`.

## CI

O pipeline de CI é o `.gitlab-ci.yml` (GitLab CI, requer um runner com o executor Docker — instalação
e operação em [DEPLOY_PORTAINER.md](DEPLOY_PORTAINER.md#7-runner-do-gitlab-ci)). Corre em
todos os merge requests e em cada push para `develop` e `main`:

| Stage    | Job                   | O que faz                                                                                                                                                         | Bloqueia           |
| -------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `verify` | `lint`                | `pnpm run lint:ci` (ESLint sem `--fix`)                                                                                                                           | Sim                |
| `verify` | `format`              | `pnpm run format:check`                                                                                                                                           | Sim                |
| `verify` | `build:backend`       | build do backend                                                                                                                                                  | Sim                |
| `verify` | `build:frontend`      | typecheck + build do frontend                                                                                                                                     | Sim                |
| `verify` | `versions`            | Node no major esperado (20) e pnpm igual ao `packageManager`, no CI e em todas as imagens declaradas                                                              | Sim                |
| `test`   | `test:unit`           | testes unitários do backend, com relatório JUnit e cobertura                                                                                                      | Sim                |
| `test`   | `test:e2e`            | testes e2e do backend com PostgreSQL + Redis (`services:`)                                                                                                        | Sim                |
| `test`   | `audit`               | `pnpm audit --prod --audit-level high`                                                                                                                            | Não                |
| `test`   | SAST/Secret Detection | templates do GitLab (`backend/.env.test` excluído de propósito)                                                                                                   | Não                |
| `test`   | `kics-iac-sast`       | análise dos Dockerfiles e composes (template SAST-IaC)                                                                                                            | Não                |
| `test`   | `renovate`            | só no pipeline agendado — ver abaixo                                                                                                                              | Não                |
| `images` | `build-images`        | só em pushes para o `develop`, depois de verificações e testes verdes: constrói o backend e o frontend e envia-os para o registry (DEPLOY_PORTAINER.md, secção 9) | Sim (no `develop`) |
| `deploy` | `deploy:devserver`    | só em pushes para o `develop`: pede ao Portainer o redeploy do servidor de dev com as imagens novas                                                               | Sim (no `develop`) |
| `.post`  | `collect-metrics`     | só no `develop`: grava os resultados para o Grafana (DEPLOY_PORTAINER.md, secção 8)                                                                               | Não                |

Antes de abrir um MR, `pnpm run lint:ci` e `pnpm run format:check` reproduzem localmente os dois
primeiros jobs. Os testes e2e do frontend (Playwright) ainda não correm no CI (`R-066`), nem a
verificação de migrações face às entidades (`R-069`).

**Mudar de versão do Node ou do pnpm** — o job `versions` falha até tudo bater certo:

- Node (novo major): atualizar a imagem `node:` nos 4 Dockerfiles e no `.gitlab-ci.yml` **e** a variável
  `EXPECTED_NODE_MAJOR` do job `versions`, no mesmo MR. Localmente:
  `EXPECTED_NODE_MAJOR=20 sh scripts/ci/check-versions.sh`.
- pnpm: atualizar o `packageManager` do `package.json` e os `corepack prepare pnpm@…` dos Dockerfiles,
  no mesmo MR (o pnpm do CI vem sempre do `packageManager`).

Os relatórios de segurança (SAST, Secret Detection, IaC) são ficheiros JSON nos artefactos de cada
job; não bloqueiam o MR.

### Pipeline semanal e Renovate

> **Estado atual: o Renovate está desativado** (variável `RENOVATE_TOKEN` apagada a 2026-10-01) até
> o nginx à frente de `git.redstout.com` deixar de descodificar `%2F` — ver `R-071` em
> `specs/GLOBAL-TASKS-RISKS.md` e o troubleshooting no fim desta secção. O resto do pipeline
> semanal corre normalmente.

Todas as segundas-feiras às 03:00 corre um pipeline agendado no `develop`: os mesmos jobs acima
(apanha vulnerabilidades novas em código que não mudou) e ainda o `renovate`, que trata as
dependências npm e as imagens Docker (Dockerfiles, composes e `.gitlab-ci.yml`) contra o `develop`:

- minor e patch agrupados num único MR (`chore(deps): update all non-major dependencies`);
- **majors não abrem MR**: ficam listados no issue **"Dependency Dashboard"** (secção "Pending
  Approval"); marcar a caixa de um major faz o Renovate criar o MR na execução seguinte (ou logo, ao
  correr o agendamento à mão). Subscrever as notificações desse issue para saber de majors novos;
- os MRs de major do `postgres` e do `rabbitmq` trazem um aviso: **não integrar sem procedimento de
  migração** — não arrancam sobre os volumes de dados existentes, embora o pipeline passe;
- os overrides do `pnpm` nunca sobem de major; o `nginx` só segue a linha estável (minor par);
  a versão do pnpm nos Dockerfiles (`corepack prepare pnpm@…`) sobe no mesmo MR que o
  `packageManager` do `package.json`;
- todas as imagens têm de ter uma tag com versão (nunca `latest`, `stable` ou semelhantes), senão
  o Renovate não as consegue seguir
- nada é integrado automaticamente — cada MR passa pelo pipeline e é revisto por uma pessoa;
- no máximo 10 MRs do Renovate abertos em simultâneo.

O issue "Dependency Dashboard" precisa das Issues ativas no projeto (_Settings → General →
Visibility, project features, permissions_).

A configuração do repositório está em `renovate.json`; as opções globais (branch base, sem MR de
onboarding) estão no job `renovate` do `.gitlab-ci.yml`.

**Configuração (uma vez, no GitLab):**

1. **Token:** _Settings → Access tokens → Add new token_ — nome `renovate`, role **Developer**,
   scopes **`api`** e **`write_repository`**, com data de expiração (máximo permitido pela
   instância). Copiar o valor.
2. **Variável:** _Settings → CI/CD → Variables → Add variable_ — chave `RENOVATE_TOKEN`, valor do
   passo 1, **Masked** e **Protected** (o `develop` tem de ser um branch protegido).
3. **Agendamento:** _Build → Pipeline schedules → New schedule_ — descrição `Semanal`, padrão
   `0 3 * * 1`, fuso horário `Lisbon`, branch `develop`, ativo.
4. **Teste:** na lista de agendamentos, _Run schedule pipeline_ (▶) — confirmar que o job
   `renovate` corre e que aparecem os MRs e o issue "Dependency Dashboard".

Sem a variável `RENOVATE_TOKEN`, o pipeline agendado corre na mesma, só sem o job `renovate`.

**`ERROR: Repository is not found` no job `renovate`, com um token válido:** o nginx à frente de
`git.redstout.com` está a descodificar `%2F` nos URLs (descoberto em P-104/02). O Renovate pede o
projeto pelo caminho codificado (`projects/bridge351%2Fsrh`), que chega ao GitLab como
`projects/bridge351/srh` e dá 404 com qualquer token; pelo número (`projects/13`) funciona.
Confirmar com:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "PRIVATE-TOKEN: <token>" \
  "https://git.redstout.com/api/v4/projects/bridge351%2Fsrh"   # tem de dar 200
```

A correção é no nginx (administrador do servidor): `proxy_pass` sem caminho depois do endereço,
para o pedido passar sem alterações. Até lá, apagar a variável `RENOVATE_TOKEN` desativa o job sem
deixar o pipeline semanal vermelho.
Quando o token expirar, o job deixa de conseguir autenticar-se: criar um novo e atualizar a
variável.

# Servidor de desenvolvimento via Portainer (deploy automático do `develop`)

Guia para montar o servidor de desenvolvimento partilhado do HR Suite num host Docker gerido pelo
**Portainer Community Edition** (testado para 2.45.1 LTS), sem acesso SSH ao servidor. A cada push
para o `develop`, o CI constrói as imagens do backend e do frontend, envia-as para o GitLab Container
Registry e pede ao Portainer o redeploy do stack (secção 9); o Portainer já não constrói imagens.

O stack usa `infra/docker-compose.devserver.yml`, derivado do compose de produção:

| Serviço                                    | Acesso                                              |
| ------------------------------------------ | --------------------------------------------------- |
| Frontend (SPA + proxy de `/api`)           | `http://<host>:8888/`                               |
| Mailpit (emails capturados)                | `http://<host>:8025/`                               |
| Backend, Postgres, Redis, RustFS, RabbitMQ | só na rede interna do stack (sem portas publicadas) |

Diferenças face a produção (`DEPLOY_UBUNTU.md`):

- Todos os emails ficam capturados no Mailpit — nada é enviado para fora.
- O backend corre o **seed de dados de demo** a cada arranque, depois das migrações e do seed base.
- Os contentores chamam-se `srh-*-devserver`, por isso não colidem com um stack de produção no
  mesmo host.
- O serviço one-shot `prune` limpa imagens antigas e **toda** a cache de build do host no fim de
  cada deploy (ver "Espaço em disco").

O armazenamento de ficheiros usa, aqui como em produção e no dev local, o **RustFS**
(`rustfs/rustfs`, Apache-2.0), compatível com S3, que substituiu o MinIO (projeto
descontinuado). O bucket é criado pelo serviço one-shot `createbuckets`, com a AWS CLI
(`public.ecr.aws/aws-cli/aws-cli`, descarregada do registo público da AWS e não do Docker Hub). As
versões estão fixadas nos composes e são atualizadas pelo Renovate (ver `CONTRIBUTING.md`); ao
integrar uma atualização do RustFS, volta a validar upload, download e remoção de documentos.

> **Migração do MinIO (uma vez):** os dados do MinIO não são migrados — o RustFS arranca com um
> volume novo (`rustfs-data`) e o bucket é recriado vazio. Depois do primeiro deploy com o RustFS,
> remove no Portainer o contentor `srh-minio-devserver` (se ainda existir) e o volume
> `srh-devserver_minio-data`.

---

## 1. Pré-requisitos

1. No Portainer, o ambiente (_environment_) tem de ser **Docker Standalone**, não Swarm — stacks
   Swarm não suportam `build:`.
2. O servidor do Portainer tem de conseguir aceder a `https://git.redstout.com`.
3. As portas **8888** e **8025** têm de estar livres no host.
4. O ficheiro `infra/docker-compose.devserver.yml` tem de existir no branch `develop` do GitLab.

## 2. Token de leitura do GitLab

No GitLab, projeto `bridge351/srh` → **Settings → Repository → Deploy tokens**:

- Nome: `portainer-devserver`
- Scope: `read_repository`

Guarda o _username_ e o _token_ gerados — o token só é mostrado uma vez. (Um _project access
token_ com role Reporter e scope `read_repository` também serve.)

## 3. Gerar os segredos

Numa máquina com o repositório clonado:

```bash
./scripts/generate-secrets.sh --stdout
```

Imprime `JWT_*` (4 chaves), `MFA_ENCRYPTION_KEY`, `POSTGRES_PASSWORD`, `STORAGE_ACCESS_KEY` e
`STORAGE_SECRET_KEY` sem mexer no teu `.env`. Usa um conjunto **exclusivo** para este servidor —
nunca os valores do teu `.env` local nem os de produção.

## 4. Criar o stack

No Portainer: **Stacks → Add stack**.

1. **Name:** `srh-devserver`
2. **Build method:** Repository
3. **Repository URL:** `https://git.redstout.com/bridge351/srh.git`
4. **Repository reference:** `refs/heads/develop`
5. **Compose path:** `infra/docker-compose.devserver.yml`
6. **Authentication:** ativo, com o username e o token do passo 2
7. **GitOps updates:** **desligado** depois de configurar a secção 9 (passo 8 dessa secção, pela API) — quem pede o redeploy é o CI,
   já com as imagens novas no registry. Com o polling ligado, cada commit gera um redeploy extra
   (com as imagens ainda antigas) e, no Portainer, qualquer redeploy reinicia todos os serviços do
   stack. Até a secção 9 estar configurada, pode ficar ligado (polling, `5m`, **Force
   redeployment** desligado).
8. **Environment variables** → _Advanced mode_ → cola (substituindo os `<...>`):

```
SRH_REGISTRY_IMAGE=<caminho do registry do projeto — secção 9, passo 1>
POSTGRES_DB=srh
POSTGRES_USER=srh_user
POSTGRES_PASSWORD=<passo 3>
STORAGE_ACCESS_KEY=<passo 3>
STORAGE_SECRET_KEY=<passo 3>
STORAGE_BUCKET=srh-documents
STORAGE_REGION=eu-west-1
JWT_ACCESS_PRIVATE_KEY=<passo 3>
JWT_ACCESS_PUBLIC_KEY=<passo 3>
JWT_REFRESH_PRIVATE_KEY=<passo 3>
JWT_REFRESH_PUBLIC_KEY=<passo 3>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MFA_ENCRYPTION_KEY=<passo 3>
RABBITMQ_USER=srh_app
RABBITMQ_PASSWORD=<uma password forte à tua escolha>
SMTP_FROM=noreply@hr-suite.local
BACKEND_CORS_ORIGIN=http://<host>:8888
FRONTEND_URL=http://<host>:8888
```

`FRONTEND_URL` é usado nos links dos emails (ex.: recuperação de password) — tem de ser o endereço
pelo qual os utilizadores abrem a aplicação.

9. **Deploy the stack.** O primeiro deploy demora vários minutos (instalação de dependências e build
   do backend e do frontend no próprio servidor).

## 5. Verificação

1. **Stacks → srh-devserver:** todos os contentores em _running_, exceto `srh-createbuckets-devserver`,
   que termina com código 0 depois de criar o bucket.
2. **Logs do `srh-backend-devserver`**, por esta ordem: `Schema hr created`, as migrações, os seeds
   base (`RBAC seed completed.` …), `Demo seed completo.` e `Nest application successfully started`.
3. `http://<host>:8888/api/admin/health` responde `{"status":"ok",...}`.
4. `http://<host>:8888/` mostra o ecrã de login:
   - Admin: `admin@hr-suite.local` / `Admin123!` (pede configuração de MFA no primeiro login)
   - Utilizadores de demo: `mariana.ferreira`, `tiago.rocha`, `carla.mendes`, `diogo.pinto`,
     `sofia.almeida`, `rui.cardoso`, `beatriz.nunes` — todos `@hr-suite.local` / `Demo123!`
5. `srh-prune-devserver` termina com código 0; os logs mostram o espaço recuperado.
6. Pede uma recuperação de password e confirma que o email aparece em `http://<host>:8025/`.
7. Faz um push para `develop` e confirma que, no fim do pipeline, o job `deploy:devserver` passou e
   que os contentores `srh-backend-devserver` e `srh-frontend-devserver` foram recriados (secção 9).

## 6. Operação

### Como funciona o redeploy

A cada push para o `develop`, depois de as verificações e os testes passarem, o job `build-images`
constrói as imagens e envia-as para o registry, e o job `deploy:devserver` pede ao Portainer um
**Pull and redeploy**: o Portainer atualiza o clone, descarrega as imagens `:develop` e recria os
contentores. Se o pipeline falhar antes, nada muda no servidor de dev.

No Portainer, um redeploy de um stack Git **recria todos os serviços** (Postgres, Redis, RustFS,
RabbitMQ, Mailpit, backend, frontend), mesmo os que não mudaram — confirmado com o Portainer CE
2.45.1. Os dados ficam nos volumes; conta com alguns segundos a dezenas de segundos de
indisponibilidade por deploy. O backend volta a correr migrações, seed base e seed de demo. No fim,
o `prune` corre uma vez e termina.

### Dados de demo

O seed de demo corre a cada arranque do backend. Verifica o que já existe antes de criar, por isso:

- Não duplica dados, mesmo que testadores alterem o estado dos registos (ex.: aprovar uma ausência
  pendente de demo não faz aparecer outra pendente no deploy seguinte).
- **Registos de demo apagados voltam a ser criados** no deploy seguinte.
- Dados criados pelos testadores não são tocados.

### Repor a base de dados do zero

1. **Stacks → srh-devserver → Stop this stack**
2. **Volumes** → remove `srh-devserver_postgres-data`
3. **Stacks → srh-devserver → Start this stack**

O backend recria o schema, corre as migrações e volta a semear os dados base e de demo sozinho.

### Alterar variáveis de ambiente

Edita-as no stack e carrega em **Update the stack**. Um contentor mantém o ambiente com que foi
criado, por isso é preciso este update (um simples _restart_ não chega).

⚠️ Não alteres `POSTGRES_PASSWORD` depois do primeiro deploy: o Postgres só a lê quando inicializa o
volume, e o backend deixa de conseguir autenticar-se. Se precisares mesmo de a mudar, repõe a base de
dados (secção anterior).

⚠️ Mudar as chaves `JWT_*` termina todas as sessões; mudar `MFA_ENCRYPTION_KEY` obriga todos os
utilizadores com MFA a reconfigurá-lo.

### Espaço em disco

O serviço `srh-prune-devserver` corre no fim de cada deploy, depois de o backend e o frontend terem
sido recriados, e termina:

- `docker image prune` das imagens do CI (label `srh.ci-image`) que ficaram sem tag e já não têm
  contentores — as versões anteriores do backend e do frontend. O job `build-images` faz o mesmo;
  isto é uma rede de segurança.
- `docker builder prune --filter until=168h`: remove só a cache de build sem uso há mais de 7 dias.
  A cache recente fica de propósito: é ela que permite ao `build-images` reaproveitar a instalação
  de dependências quando o `pnpm-lock.yaml` não mudou.

Para isso o contentor monta `/var/run/docker.sock`, o que lhe dá controlo total do Docker do host
(equivale a acesso root). Só corre os dois comandos acima, a partir da imagem oficial
`docker:<versão>-cli` fixada no compose, e termina.

Volumes e imagens de outros stacks não são tocados. Se precisares de libertar mais espaço, usa
**Images → Unused → Remove** no Portainer.

---

## 7. Runner do GitLab CI

O pipeline de CI (`.gitlab-ci.yml`, ver `CONTRIBUTING.md`) corre num GitLab Runner com o executor
Docker, instalado como um stack próprio neste mesmo host. O runner arranca um contentor por job
através do socket do Docker do host (acesso equivalente a root — aceite, a equipa é pequena e todos
são Owners do projeto).

### Criar o stack

1. No GitLab: **Settings → CI/CD → Runners → New project runner** — sem tags, com **Run untagged
   jobs** marcado (os jobs do pipeline não têm tags). Copiar o token (`glrt-…`); só é mostrado uma
   vez.
2. No Portainer: **Stacks → Add stack**, nome `gitlab-runner`, **Web editor**:

```yaml
services:
  gitlab-runner:
    # Fixar na versão do GitLab (19.4 à data de escrita — ver https://git.redstout.com/help)
    image: gitlab/gitlab-runner:v19.4.0
    container_name: gitlab-runner
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - gitlab-runner-config:/etc/gitlab-runner

volumes:
  gitlab-runner-config:
```

3. Registar, na consola do contentor (**Containers → gitlab-runner → Console**, `/bin/bash`),
   trocando o token:

```bash
gitlab-runner register --non-interactive \
  --url "https://git.redstout.com" \
  --token "glrt-<token-do-passo-1>" \
  --executor docker \
  --docker-image node:20.20.2-alpine \
  --docker-pull-policy if-not-present \
  --docker-volumes /cache \
  --docker-volumes /var/run/docker.sock:/var/run/docker.sock \
  --docker-cpus 2 \
  --docker-memory 4g \
  --docker-service-cpus 1 \
  --docker-service-memory 1g \
  --description "srh-docker-devserver"
sed -i 's/^concurrent = .*/concurrent = 4/' /etc/gitlab-runner/config.toml
```

A configuração fica no volume `gitlab-runner-config`: recriar ou atualizar o stack não obriga a
registar de novo. O runner relê o `config.toml` sozinho ao fim de alguns segundos.

O socket do Docker (`--docker-volumes /var/run/docker.sock:…`) é usado pelo job `build-images`
(secção 9) para construir as imagens no Docker do host. Num runner já registado sem ele, acrescentar
na consola do contentor `gitlab-runner` (o runner relê o ficheiro sozinho):

```bash
sed -i 's|volumes = \["/cache"\]|volumes = ["/cache", "/var/run/docker.sock:/var/run/docker.sock"]|' /etc/gitlab-runner/config.toml
grep volumes /etc/gitlab-runner/config.toml
```

### Recursos

Dimensionado para este host (8 núcleos, 33 GB de RAM), partilhado com o servidor de dev:

| Parâmetro                                           | Valor            | Porquê                                                                    |
| --------------------------------------------------- | ---------------- | ------------------------------------------------------------------------- |
| `concurrent`                                        | 4                | Jobs em simultâneo; um pipeline demora ≈ 3–4 min                          |
| CPU / memória por job                               | 2 / 4 GB         | 4 × 4 GB + serviços + servidor de dev ≈ 23 GB no pior caso                |
| CPU / memória por serviço (Postgres, Redis dos e2e) | 1 / 1 GB         | Chega para a base de dados de teste                                       |
| `pull_policy`                                       | `if-not-present` | Poupa descargas do Docker Hub; as imagens estão fixadas em versões exatas |

### Operação

- **Ver o que um job está a fazer:** no GitLab, **Build → Pipelines** → pipeline → job (log em tempo
  real). No Portainer, os jobs aparecem como contentores `runner-…`; **Stats** mostra CPU e memória.
- **Espaço em disco:** o runner guarda imagens e volumes de cache `runner-…` (cache do pnpm, ≈ 110 MB
  por versão do lockfile e por job em paralelo) que nada limpa automaticamente — crescimento estimado
  de alguns GB por ano, aceite. Se faltar espaço: remover os volumes `runner-…` e as imagens sem uso
  (**Volumes** e **Images → Unused**); são só cache e voltam a ser criados.
- **Atualizar o runner:** mudar a tag da imagem no stack para a versão nova do GitLab e **Update the
  stack**.

### Troubleshooting do runner

| Sintoma                                                       | Causa provável                                   | Correção                                                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Jobs ficam em _pending_                                       | Runner offline, ou sem **Run untagged jobs**     | Ver o estado em **Settings → CI/CD → Runners**; ver os logs do contentor `gitlab-runner`                                      |
| `test:e2e` com `Exceeded timeout … for a hook`                | Host sobrecarregado durante o pipeline (`R-070`) | Baixar `concurrent` para 3: `sed -i 's/^concurrent = .*/concurrent = 3/' /etc/gitlab-runner/config.toml` na consola do runner |
| Job falha com `Job failed (system failure)` / `AlreadyExists` | Falha do Docker/runner, não do código            | O pipeline repete estes jobs sozinho (até 2 vezes); se for frequente, alinhar a versão do runner com a do GitLab              |
| Job termina com código 137                                    | Memória esgotada no job                          | Subir `memory` no `config.toml` (ex. `"6g"`)                                                                                  |

## 8. Métricas do CI (Grafana)

Cada pipeline do `develop` (push ou agendado) grava os seus resultados numa base de dados própria —
estado e duração dos jobs, testes, cobertura e todos os achados de segurança (Semgrep, Secret
Detection, KICS, `pnpm audit`) — e o Grafana mostra-os em três dashboards: **Segurança**, **Testes
e cobertura** e **Pipelines**. Cada dashboard tem um seletor de execução para ver qualquer pipeline
passado; o histórico é mantido por inteiro (≈ 100–300 MB por ano).

```
pipeline do develop ── job collect-metrics (último, nunca bloqueia) ──► metrics-db :5433
                                                                             ▲
                                                 Grafana :3300 (só leitura) ─┘
```

Stack `srh-observability` (`infra/docker-compose.observability.yml`): `metrics-db` (Postgres) e
`grafana`, ambos construídos a partir do repositório, com a fonte de dados e os dashboards
incluídos na imagem do Grafana.

### Criar o stack

1. Gerar quatro passwords (só hexadecimal: entram num URL e numa variável mascarada do GitLab):

   ```bash
   for i in 1 2 3 4; do openssl rand -hex 24; done
   ```

2. No Portainer: **Stacks → Add stack**, nome `srh-observability`, **Repository**, com o mesmo
   URL, autenticação (deploy token do passo 2 da secção 4) e referência `refs/heads/develop` do
   stack do servidor de dev; **Compose path** `infra/docker-compose.observability.yml`; **GitOps
   updates** por polling, para os dashboards alterados no repositório chegarem sozinhos.
3. **Environment variables**:

   ```
   METRICS_DB_ADMIN_PASSWORD=<password 1>
   METRICS_WRITER_PASSWORD=<password 2>
   METRICS_READER_PASSWORD=<password 3>
   GRAFANA_ADMIN_PASSWORD=<password 4>
   ```

4. **Deploy the stack.** As portas **5433** (base de dados) e **3300** (Grafana) têm de estar
   livres no host.

### Ligar o CI

5. No GitLab: **Settings → Access tokens → Add new token** — nome `metrics`, role **Reporter**,
   scope **`read_api`**, com data de expiração (serve para o job listar os jobs do pipeline).
6. **Settings → CI/CD → Variables**, as duas **Masked** e **Protected**:

   | Chave                  | Valor                                                            |
   | ---------------------- | ---------------------------------------------------------------- |
   | `METRICS_DB_URL`       | `postgres://metrics_writer:<password 2>@<host>:5433/srh_metrics` |
   | `METRICS_GITLAB_TOKEN` | o token do passo 5                                               |

   `<host>` é o endereço do host na rede (não `localhost`: os jobs correm noutros contentores).

7. No pipeline seguinte do `develop`, o job `collect-metrics` (stage `.post`) termina com
   `Pipeline <n> gravado: estado …, … achados …`. Sem as duas variáveis, o job não aparece.

### Usar

- `http://<host>:3300/` — abre o dashboard **Segurança**, sem login; os outros dois estão na
  pasta **SRH CI** e nos botões do topo.
- O login (`/login`, utilizador `admin`, password 4) só serve para administrar o Grafana.
- Os dashboards são lidos do repositório (`infra/observability/grafana/dashboards/*.json`) e não
  se gravam pela interface. Para mudar um: fazer as alterações numa cópia na interface (como admin,
  **Save as** noutra pasta), **Export → JSON**, substituir o ficheiro no repositório e integrar no
  `develop`; o Portainer reconstrói a imagem do Grafana.

### Base de dados

- Tabelas no schema `ci` (`runs`, `jobs`, `tests`, `coverage`, `findings`), definidas em
  `infra/observability/metrics-db/schema.sql` e aplicadas pelo próprio job a cada execução — uma
  tabela ou coluna nova chega sozinha. Só alterações aditivas; nunca apagar dados.
- Utilizadores: `metrics_writer` (CI, escreve) e `metrics_reader` (Grafana, só lê), criados só
  quando o volume é criado. Mudar as passwords depois disso exige `ALTER ROLE` na consola do
  contentor `srh-metrics-db` (`psql -U metrics_admin -d srh_metrics`) e atualizar a variável do
  stack ou do GitLab correspondente.
- O histórico vive só no volume `srh-observability_metrics-db-data`: apagá-lo perde-o.

### Troubleshooting das métricas

| Sintoma                                                    | Causa provável                                                                                         | Correção                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Job `collect-metrics` não aparece no pipeline do `develop` | Falta `METRICS_DB_URL` ou `METRICS_GITLAB_TOKEN`, ou o `develop` não é protegido (variáveis Protected) | Rever o passo 6 e os branches protegidos                           |
| Job falha com `connection refused` / timeout               | A porta 5433 não é alcançável a partir dos jobs                                                        | Confirmar o `<host>` do URL e firewalls; `localhost` não serve     |
| `password authentication failed for user "metrics_writer"` | Password do URL diferente da do stack (ou mudada depois da criação do volume)                          | Corrigir a variável, ou `ALTER ROLE` (ver acima)                   |
| Job falha com `401` / `403` na API do GitLab               | Token expirado ou sem `read_api`                                                                       | Novo token e atualizar `METRICS_GITLAB_TOKEN`                      |
| Um scanner não aparece numa execução                       | O job desse scanner não correu ou não produziu relatório                                               | No log do `collect-metrics`: `Sem <ficheiro> — <scanner> ignorado` |
| Dashboards com _No data_                                   | Ainda nenhum pipeline do `develop` gravado                                                             | Esperar pelo próximo pipeline, ou correr o agendamento à mão       |

## 9. Imagens no registry e redeploy pelo CI

Desde P-106, o Portainer deixou de construir as imagens do servidor de dev. Em cada push para o
`develop`, depois de todas as verificações e testes passarem:

1. o job `build-images` constrói o backend e o frontend no Docker do host, com a cache de build
   mantida entre pipelines (se o `pnpm-lock.yaml` não mudou, a instalação de dependências vem da
   cache), e envia-os para o GitLab Container Registry com as tags `develop` e o SHA do commit;
2. o job `deploy:devserver` chama a API do Portainer — o mesmo que **Pull and redeploy** — para
   atualizar o stack `srh-devserver` com as imagens novas. O Portainer CE não tem webhooks.

O job lê primeiro as variáveis do stack e reenvia-as sem alterações (a API substitui-as pelas que o
pedido traz) e falha se mudarem. A autenticação do Git guardada no stack mantém-se.

### Configurar (uma vez)

1. **Caminho do registry:** no GitLab, **Deploy → Container registry** mostra o caminho do projeto
   (ex.: `registry.<domínio>/bridge351/srh`). É o valor de `SRH_REGISTRY_IMAGE`.
2. **Runner:** montar o socket do Docker (secção 7, "Recursos").
3. **Acesso do Portainer ao registry:** no GitLab, **Settings → Repository → Deploy tokens** — nome
   `portainer-registry`, scope **`read_registry`**. No Portainer, **Registries → Add registry →
   Custom registry**: URL = o host do registry (sem o caminho), autenticação com o username e o
   token gerados.
4. **Variável do stack:** em **Stacks → srh-devserver → Environment variables**, acrescentar
   `SRH_REGISTRY_IMAGE=<caminho do passo 1>` e **Update the stack**. (Antes de existir a primeira
   imagem no registry, o update falha no pull — fazer este passo depois do primeiro `build-images`
   verde, ou correr o pipeline do `develop` antes.)
5. **Access token do Portainer:** **My account → Access tokens → Add access token** (nome
   `gitlab-ci`). Copiar o valor; só é mostrado uma vez.
6. **IDs:** abrir o stack no Portainer; o URL tem a forma
   `…/#!/<endpoint id>/docker/stacks/srh-devserver?id=<stack id>&…`.
7. **Variáveis de CI/CD no GitLab** (**Settings → CI/CD → Variables**), **Protected**; o token também
   **Masked**:

   | Chave                    | Valor                                                                     |
   | ------------------------ | ------------------------------------------------------------------------- |
   | `PORTAINER_URL`          | endereço do Portainer visto do host (ex.: `https://<host>:9443`)          |
   | `PORTAINER_TOKEN`        | o token do passo 5                                                        |
   | `PORTAINER_STACK_ID`     | o `id` do passo 6                                                         |
   | `PORTAINER_ENDPOINT_ID`  | o endpoint do passo 6                                                     |
   | `PORTAINER_INSECURE_TLS` | `true` só se o Portainer usar o certificado autoassinado de origem (9443) |

8. **Desligar o polling (GitOps updates) do stack.** Na página do stack do Portainer CE 2.45.1 não há
   interruptor para isto; faz-se pela API, com o token do passo 5 (reenvia as variáveis e as
   definições do Git tal como estão — a API substitui as variáveis pelas que o pedido traz). Numa
   máquina com `curl` e `jq` que chegue ao Portainer:

   ```bash
   PURL=https://<host>:9443   # o endereço do Portainer no browser, sem /#!/…
   PTOKEN=ptr_<token>         # access token do passo 5
   SID=<stack id>; EID=<endpoint id>   # passo 6
   curl -sk -H "X-API-Key: $PTOKEN" "$PURL/api/stacks/$SID" > stack.json
   jq -c '{autoUpdate: null, env: (.Env // []), prune: false,
           repositoryReferenceName: .GitConfig.ReferenceName,
           repositoryAuthentication: (.GitConfig.Authentication != null),
           repositoryUsername: (.GitConfig.Authentication.Username // "")}' stack.json > payload.json
   curl -sk -o /dev/null -w "HTTP %{http_code}\n" -X POST -H "X-API-Key: $PTOKEN" \
     -H 'Content-Type: application/json' --data @payload.json "$PURL/api/stacks/$SID/git?endpointId=$EID"
   curl -sk -H "X-API-Key: $PTOKEN" "$PURL/api/stacks/$SID" | jq -c '{AutoUpdate, vars: (.Env | length)}'
   rm stack.json payload.json
   ```

   Esperado: `HTTP 200` e depois `{"AutoUpdate":null,"vars":<o mesmo número de antes>}`. Não reinicia
   os contentores e mantém a autenticação do Git (testado com o Portainer CE 2.45.1). **Não usar o
   botão "Detach from Git"**: converte o stack num stack sem Git e o `deploy:devserver` deixa de
   funcionar.

9. **Testar:** correr um pipeline no `develop` (`…/-/pipelines/new`). No fim, `build-images` e
   `deploy:devserver` verdes, e no Portainer os contentores do stack recriados com as imagens novas.

Sem as variáveis `PORTAINER_*`, o `deploy:devserver` não aparece e as imagens ficam só no registry.

### Voltar a uma versão anterior

Cada imagem fica também com a tag do SHA curto do commit. Para voltar atrás no servidor de dev, a
forma mais simples é reverter o commit no `develop` (o pipeline volta a construir e a fazer deploy).

## Limitações conhecidas

- **Métricas do CI expostas na rede.** O Grafana (3300) é de leitura anónima e a base de dados (5433)
  está publicada no host, protegida só por password: quem chegar ao host vê os achados de
  segurança, incluindo ficheiros e linhas.
- **Sem TLS/HTTPS.** A aplicação é servida em HTTP simples na porta 8888. Não a exponhas à internet
  pública sem um reverse proxy com TLS à frente.
- **Credenciais conhecidas.** O admin base e os utilizadores de demo têm passwords publicadas neste
  repositório — aceitável para um servidor de desenvolvimento interno, não para dados reais.
- **Acesso ao Docker do host.** O serviço `prune` monta o socket do Docker (ver "Espaço em disco").
- **Cada deploy reinicia todo o stack.** É o comportamento do redeploy do Portainer para stacks Git
  (incluindo Postgres e RabbitMQ), não só dos serviços com imagem nova — ver secção 6.

## Troubleshooting

| Sintoma                                                              | Causa provável                                                                                                                                 | Correção                                                                                                                                |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| O stack não é criado: erro ao clonar                                 | Token sem `read_repository`, expirado, ou Portainer sem acesso ao GitLab                                                                       | Rever o passo 2 e a conectividade para `git.redstout.com`                                                                               |
| O stack não é criado: `build` não suportado                          | O ambiente é Swarm                                                                                                                             | Usar um ambiente Docker Standalone                                                                                                      |
| Porta já em uso ao fazer deploy                                      | Outro serviço usa a 8888 ou a 8025 no host                                                                                                     | Libertar a porta (mudar as portas implica alterar `infra/docker-compose.devserver.yml` no repositório)                                  |
| Login falha com erro 500 genérico                                    | Chaves `JWT_*` em falta ou inválidas                                                                                                           | Gerar de novo (passo 3), atualizar as variáveis e **Update the stack**                                                                  |
| Backend reinicia sem nunca ficar pronto                              | Falha numa migração ou num seed                                                                                                                | Ver os logs do `srh-backend-devserver`; o erro está logo antes do reinício                                                              |
| `password authentication failed for user "srh_user"`                 | `POSTGRES_PASSWORD` mudou depois do primeiro deploy                                                                                            | Repor o valor antigo, ou repor a base de dados do zero                                                                                  |
| `srh-prune-devserver` com código de saída ≠ 0                        | Sem acesso ao socket do Docker, ou erro do Docker durante a limpeza                                                                            | Ver os logs do contentor; a aplicação não é afetada, só a limpeza                                                                       |
| Build falha com `toomanyrequests`                                    | Limite de downloads anónimos do Docker Hub: como a cache de build é apagada, cada deploy volta a descarregar as imagens base (`node`, `nginx`) | Em **Registries**, adicionar uma conta do Docker Hub (as imagens passam a ser descarregadas autenticadas) e fazer **Pull and redeploy** |
| Push para `develop` não gera deploy                                  | `build-images` ou `deploy:devserver` não correram (pipeline falhou antes, ou faltam as variáveis `PORTAINER_*`)                                | Ver o pipeline do `develop`; forçar com **Pull and redeploy** no stack                                                                  |
| `deploy:devserver` falha com `401`                                   | Access token do Portainer inválido ou apagado                                                                                                  | Novo token (secção 9, passo 5) e atualizar `PORTAINER_TOKEN`                                                                            |
| `build-images` falha com `Cannot connect to the Docker daemon`       | O runner não monta o socket do Docker                                                                                                          | Secção 7, "Recursos"                                                                                                                    |
| Redeploy falha com `pull access denied` / `unauthorized` no registry | O Portainer não tem as credenciais do registry                                                                                                 | Secção 9, passo 3                                                                                                                       |
| `required variable SRH_REGISTRY_IMAGE is missing`                    | Falta a variável do stack                                                                                                                      | Secção 9, passo 4                                                                                                                       |
| Upload de documento falha                                            | O `createbuckets` não criou o bucket                                                                                                           | Ver os logs do `srh-createbuckets-devserver` e fazer **Update the stack**                                                               |

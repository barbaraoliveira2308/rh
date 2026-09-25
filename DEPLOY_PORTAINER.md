# Servidor de desenvolvimento via Portainer (deploy automático do `develop`)

Guia para montar o servidor de desenvolvimento partilhado do HR Suite num host Docker gerido pelo
**Portainer Community Edition** (testado para 2.45.1 LTS), sem acesso SSH ao servidor. O Portainer
acompanha o branch `develop` do repositório e, a cada commit novo, volta a buildar as imagens e a
fazer redeploy do stack.

O stack usa `infra/docker-compose.devserver.yml`, derivado do compose de produção:

| Serviço                                   | Acesso                                              |
| ----------------------------------------- | --------------------------------------------------- |
| Frontend (SPA + proxy de `/api`)          | `http://<host>:8888/`                               |
| Mailpit (emails capturados)               | `http://<host>:8025/`                               |
| Backend, Postgres, Redis, MinIO, RabbitMQ | só na rede interna do stack (sem portas publicadas) |

Diferenças face a produção (`DEPLOY_UBUNTU.md`):

- Todos os emails ficam capturados no Mailpit — nada é enviado para fora.
- O backend corre o **seed de dados de demo** a cada arranque, depois das migrações e do seed base.
- Os contentores chamam-se `srh-*-devserver`, por isso não colidem com um stack de produção no
  mesmo host.
- O MinIO usa as imagens do fork da Pigsty, fixadas numa versão validada
  (`pgsty/minio:RELEASE.2026-08-04T00-00-00Z` e `pgsty/mc:RELEASE.2026-09-16T00-00-00Z`): a
  MinIO deixou de publicar imagens da edição comunitária, e `minio/minio` (Docker Hub) e
  `quay.io/minio/*` já não se descarregam sem autenticação. Para mudar de versão, altera a tag no
  compose e volta a validar upload, download e remoção de documentos.

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
7. **GitOps updates:** ativo
   - **Mechanism:** Polling, **Fetch interval:** `5m`
   - **Force redeployment:** ativo
   - Se a tua versão oferecer a opção **Webhook**, podes usá-la em vez do polling: copia o URL
     mostrado pelo Portainer e, no GitLab, em **Settings → Webhooks**, cria um webhook com
     _Trigger_ **Push events** filtrado ao branch `develop`. Só funciona se o GitLab conseguir
     chegar ao Portainer.
8. **Environment variables** → _Advanced mode_ → cola (substituindo os `<...>`):

```
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
5. Pede uma recuperação de password e confirma que o email aparece em `http://<host>:8025/`.
6. Faz um push para `develop` e confirma que, dentro do intervalo de polling, as imagens
   `srh-devserver-backend` e `srh-devserver-frontend` (em **Images**) têm uma data de criação nova.

## 6. Operação

### Como funciona o redeploy

A cada commit novo em `develop`, o Portainer atualiza o clone e corre o compose. `pull_policy: build`
obriga a rebuildar as duas imagens em cada redeploy. Se o build falhar, os contentores antigos
continuam a correr. O backend é recriado e volta a correr migrações, seed base e seed de demo — conta
com algumas dezenas de segundos de indisponibilidade por deploy.

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

Cada build deixa imagens antigas sem uso. Limpa-as periodicamente em **Images → Unused → Remove**.
A cache de build do Docker também cresce e não é possível limpá-la pela UI do Portainer CE.

---

## Limitações conhecidas

- **Sem TLS/HTTPS.** A aplicação é servida em HTTP simples na porta 8888. Não a exponhas à internet
  pública sem um reverse proxy com TLS à frente.
- **Credenciais conhecidas.** O admin base e os utilizadores de demo têm passwords publicadas neste
  repositório — aceitável para um servidor de desenvolvimento interno, não para dados reais.
- **Cache de build.** Ver "Espaço em disco" acima.

## Troubleshooting

| Sintoma                                              | Causa provável                                                           | Correção                                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| O stack não é criado: erro ao clonar                 | Token sem `read_repository`, expirado, ou Portainer sem acesso ao GitLab | Rever o passo 2 e a conectividade para `git.redstout.com`                                              |
| O stack não é criado: `build` não suportado          | O ambiente é Swarm                                                       | Usar um ambiente Docker Standalone                                                                     |
| Porta já em uso ao fazer deploy                      | Outro serviço usa a 8888 ou a 8025 no host                               | Libertar a porta (mudar as portas implica alterar `infra/docker-compose.devserver.yml` no repositório) |
| Login falha com erro 500 genérico                    | Chaves `JWT_*` em falta ou inválidas                                     | Gerar de novo (passo 3), atualizar as variáveis e **Update the stack**                                 |
| Backend reinicia sem nunca ficar pronto              | Falha numa migração ou num seed                                          | Ver os logs do `srh-backend-devserver`; o erro está logo antes do reinício                             |
| `password authentication failed for user "srh_user"` | `POSTGRES_PASSWORD` mudou depois do primeiro deploy                      | Repor o valor antigo, ou repor a base de dados do zero                                                 |
| Push para `develop` não gera deploy                  | GitOps updates desligado, ou ainda dentro do intervalo de polling        | Confirmar a configuração no stack; forçar com **Pull and redeploy**                                    |
| Upload de documento falha                            | O `createbuckets` não criou o bucket                                     | Ver os logs do `srh-createbuckets-devserver` e fazer **Update the stack**                              |

# Deploy num servidor Ubuntu 24.04 limpo

Guia passo a passo para subir o HR Suite (backend + frontend + Postgres + Redis + Keycloak + MinIO +
RabbitMQ) via Docker Compose de produção (`infra/docker-compose.prod.yml`) num servidor Ubuntu 24.04
recém-instalado, sem nada pré-configurado.

No final, o sistema fica acessível em `http://<ip-ou-domínio-do-servidor>/` (porta 80), com o frontend a
servir a SPA e a fazer proxy de `/api/*` para o backend internamente — só a porta 80 precisa de estar
aberta ao exterior.

> Este documento assume acesso root/sudo ao servidor e que vais aceder via `http://IP` (sem TLS). Para
> produção real com domínio próprio, ver a secção "Limitações conhecidas" no final antes de expor o
> serviço à internet pública.

---

## 1. Preparar o servidor

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git ufw
```

## 2. Instalar Docker Engine + Compose plugin

```bash
# Repositório oficial do Docker para Ubuntu
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Correr docker sem sudo (faz logout/login, ou `newgrp docker`, depois deste passo)
sudo usermod -aG docker "$USER"
newgrp docker

# Confirmar
docker --version
docker compose version
```

## 3. Instalar Node.js 20 + pnpm

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
corepack enable
corepack prepare pnpm@9 --activate

node --version   # deve ser >= 20
pnpm --version   # deve ser >= 9
```

## 4. Clonar o repositório

```bash
cd /opt   # ou outra localização à tua escolha
sudo git clone <url-do-repositório> srh
sudo chown -R "$USER":"$USER" srh
cd srh
pnpm install
```

## 5. Configurar o `.env`

```bash
cp .env.example .env
./scripts/generate-secrets.sh >> .env
```

⚠️ **Passo obrigatório, não opcional.** Os placeholders do `.env.example` (`JWT_ACCESS_PRIVATE_KEY=change_me_run_generate_secrets_sh`,
etc.) não são chaves RSA válidas — sem este passo o Docker sobe sem erro aparente, mas o primeiro login
falha com um erro genérico do servidor. O script gera pares de chaves RSA reais (JWT) e os restantes
segredos (Postgres, MFA, MinIO); como o `dotenv` usa o valor mais recente de cada variável no ficheiro,
`>>` (acrescentar ao fim) é suficiente para sobrepor os placeholders.

O `.env.example` **não inclui** algumas variáveis exigidas só pelo `docker-compose.prod.yml` (o compose
de desenvolvimento tem valores por omissão para estas, o de produção não). Acrescenta-as manualmente ao
`.env`:

```bash
cat <<'EOF' >> .env

# ─── Produção: obrigatórias, sem valor por omissão ──────
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=troca_esta_password
KEYCLOAK_HOSTNAME=<ip-ou-domínio-do-servidor>
RABBITMQ_USER=srh_app
RABBITMQ_PASSWORD=troca_esta_password
EOF
```

Depois, edita o `.env` e ajusta ao teu servidor:

- `BACKEND_CORS_ORIGIN` → `http://<ip-ou-domínio-do-servidor>` (na prática tem pouco efeito aqui, já
  que o nginx do frontend faz proxy de `/api` no mesmo porto/origem — mas mantém correto por higiene)
- `VITE_KEYCLOAK_URL` → deixa como está por agora (ver limitação sobre SSO abaixo); não afeta o login
  normal por email/password

## 6. Subir a stack (Docker Compose de produção)

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --build
```

Isto builda as imagens do backend e frontend (via `backend/Dockerfile`/`frontend/Dockerfile`) e sobe
Postgres, Redis, Keycloak, MinIO, RabbitMQ, backend e frontend. O primeiro build demora alguns minutos.

Confirma que tudo arrancou:

```bash
docker compose -f infra/docker-compose.prod.yml ps
```

## 7. Base de dados do Keycloak (automático num volume novo)

O Keycloak precisa de uma base de dados `keycloak` própria. É criada pelo
`infra/postgres/init-prod.sql`, que o serviço `postgres` monta em
`/docker-entrypoint-initdb.d/`. **Num servidor novo não há nada a fazer** — confirma apenas que o
container não está em crash-loop:

```bash
docker compose -f infra/docker-compose.prod.yml ps keycloak
```

O Docker só corre os scripts de inicialização na **primeira** criação do volume. Se o volume
`postgres-data` já existia antes desta versão, o script é ignorado e o `srh-keycloak-prod` fica em
crash-loop com `database "keycloak" does not exist`. Nesse caso, criar à mão, uma só vez:

```bash
docker exec -it srh-postgres-prod psql -U srh_user -d srh -c "CREATE DATABASE keycloak;"
docker exec -it srh-postgres-prod psql -U srh_user -d keycloak -c "CREATE SCHEMA keycloak AUTHORIZATION srh_user;"
docker compose -f infra/docker-compose.prod.yml restart keycloak
```

(Substitui `srh_user` pelo valor real de `POSTGRES_USER` no teu `.env`, se o tiveres alterado.)

## 8. Bucket de documentos no MinIO (automático)

O bucket é criado pelo serviço one-shot `createbuckets` do `docker-compose.prod.yml`, que arranca
com o stack, cria o bucket e termina. Confirma que correu bem:

```bash
docker compose -f infra/docker-compose.prod.yml logs createbuckets
```

Se for preciso criar à mão (o cliente `mc` vem incluído na imagem do MinIO):

```bash
docker exec srh-minio-prod mc alias set local http://localhost:9000 <STORAGE_ACCESS_KEY> <STORAGE_SECRET_KEY>
docker exec srh-minio-prod mc mb --ignore-existing local/srh-documents
```

(Usa os valores reais de `STORAGE_ACCESS_KEY`/`STORAGE_SECRET_KEY` do teu `.env`, gerados no passo 5;
o nome do bucket deve corresponder a `STORAGE_BUCKET`, `srh-documents` por omissão.)

## 9. Dados de demo (opcional)

Ao contrário do fluxo de desenvolvimento do `README.md`, **não precisas de correr migrações nem o seed
base manualmente** — o `CMD` do `backend/Dockerfile` já corre `schema:create` + `migration:run:prod` +
`seed:prod` (RBAC, roles, admin base) sozinho sempre que o container `srh-backend-prod` arranca, antes
de iniciar o servidor. Confirma nos logs:

```bash
docker compose -f infra/docker-compose.prod.yml logs backend | grep -i "seed\|migration"
```

O seed de **dados de demo** (colaboradores, projetos, timesheets, etc. — ver `README.md` "Dados de
Demo") não faz parte deste arranque automático (por ser opcional), e corre a partir do host — só
funciona a correr diretamente no próprio servidor, já que a porta do Postgres está publicada apenas em
`127.0.0.1:5432`:

```bash
POSTGRES_HOST=localhost pnpm --filter @bridge351/srh-backend run seed:demo
```

## 10. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw enable
```

Não abras as portas 3000 (backend), 5432 (Postgres), 6379 (Redis), 8080 (Keycloak), 9000 (MinIO) ou
5672 (RabbitMQ) ao exterior — todas já estão corretamente restritas a `127.0.0.1` no
`docker-compose.prod.yml`, exceto a 80.

## 11. Verificação final

```bash
curl -I http://localhost/
curl http://localhost/api/admin/health
```

A partir de outra máquina, abre `http://<ip-do-servidor>/` no browser — deve aparecer o ecrã de login.

Credenciais (ver `README.md`/mensagens anteriores para a lista completa):

- Admin: `admin@hr-suite.local` / `Admin123!` (pede configuração de MFA no primeiro login)
- Utilizadores de demo (se correste o passo 9 opcional): `nome.apelido@hr-suite.local` / `Demo123!`

---

## Limitações conhecidas

- **Login SSO (Keycloak) não funciona a partir de outra máquina "out of the box".** O frontend é
  construído com `VITE_KEYCLOAK_URL=http://keycloak:8080` — um nome só resolúvel _dentro_ da rede
  Docker do servidor, não a partir do browser de quem acede remotamente. O login normal por
  email/password **não é afetado** (não passa pelo Keycloak). Para ativar SSO a partir de fora, é
  preciso expor o Keycloak com um hostname público real e reconstruir o frontend com
  `VITE_KEYCLOAK_URL` apontado para esse hostname — fora do âmbito deste guia.
- **Sem TLS/HTTPS.** Este guia expõe a aplicação em HTTP simples na porta 80. Para produção real,
  coloca um reverse proxy com TLS (Caddy, nginx+certbot, Traefik) à frente do serviço `frontend`.
- **Segredos guardados em `.env` local**, não num cofre de segredos — aceitável para uma demo isolada,
  não recomendado para produção com dados reais sem endurecer conforme `docs/AUDIT_PROCESS.md`
  ("Fase 5 — Infraestrutura e Segredos").
- **Rodar as chaves JWT** (`scripts/generate-secrets.sh` de novo) **invalida imediatamente todas as
  sessões ativas** — não há suporte a rotação com sobreposição de chaves (ver `R-049` em
  `specs/GLOBAL-TASKS-RISKS.md`).

## Troubleshooting

| Sintoma                                     | Causa provável                                                                                                                        | Correção                                                                                                                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login falha com erro 500 genérico           | Passo 5 (`generate-secrets.sh`) não foi feito, chaves JWT inválidas                                                                   | Repetir o passo 5 e `docker compose -f infra/docker-compose.prod.yml --env-file .env up -d --force-recreate backend` — `restart` não chega, um contentor mantém o ambiente com que foi criado  |
| `srh-keycloak-prod` reinicia em loop        | Base de dados `keycloak` não existe — volume `postgres-data` criado antes de existir o `init-prod.sql`, que só corre em volumes novos | Aplicar o passo 7 à mão                                                                                                                                                                        |
| Upload de documento falha                   | Bucket `srh-documents` não existe — o serviço `createbuckets` falhou                                                                  | Ver `docker compose -f infra/docker-compose.prod.yml logs createbuckets`; em alternativa criar à mão (passo 8)                                                                                 |
| `docker compose up` falha por porta ocupada | Outro serviço já usa a porta 80 no servidor                                                                                           | Parar esse serviço ou mudar `ports: '80:80'` do serviço `frontend` no compose                                                                                                                  |
| `seed:demo` não consegue ligar à BD         | A correr a partir de outra máquina, não do próprio servidor                                                                           | Este comando só funciona localmente no servidor (Postgres só ouve em `127.0.0.1`)                                                                                                              |
| Backend reinicia sem nunca ficar pronto     | `seed:prod` falhou no arranque (ex.: schema ainda não pronto)                                                                         | `docker compose -f infra/docker-compose.prod.yml logs backend`; normalmente resolve-se com `docker compose -f infra/docker-compose.prod.yml restart backend` depois do Postgres estar saudável |

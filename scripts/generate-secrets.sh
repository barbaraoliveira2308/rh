#!/usr/bin/env bash
# Gera valores aleatórios para os segredos do .env (JWT, MFA, Postgres, MinIO).
# Uso: ./scripts/generate-secrets.sh            imprime para o ecrã
#      ./scripts/generate-secrets.sh >> .env    acrescenta ao .env existente
set -euo pipefail

if ! command -v openssl >/dev/null 2>&1; then
  echo "Erro: openssl não encontrado. Instala-o para gerar segredos aleatórios." >&2
  exit 1
fi

cat <<EOF
# Gerado por scripts/generate-secrets.sh em $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Usa um conjunto DIFERENTE por ambiente (dev/staging/produção).
# Nunca reutilizes estes valores entre ambientes nem os commites no repositório.

JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
MFA_ENCRYPTION_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 24)
STORAGE_ACCESS_KEY=$(openssl rand -hex 10)
STORAGE_SECRET_KEY=$(openssl rand -hex 32)
EOF

cat <<'EOF' >&2

Não incluídos (não são gerados localmente):
  KEYCLOAK_CLIENT_ID / client secret  -> consola de administração do Keycloak
  SMTP_USER / SMTP_PASS               -> fornecedor de email
  SENTRY_DSN                          -> definições do projeto no Sentry

Aviso sobre MFA_ENCRYPTION_KEY:
  Rodar este valor torna ilegíveis os secrets TOTP já cifrados na base de dados
  (ver backend/src/auth/services/encryption.service.ts). Todos os colaboradores
  com MFA ativo terão de reconfigurar o MFA do zero. Nunca rodar em produção
  sem avisar a equipa antecipadamente.
EOF

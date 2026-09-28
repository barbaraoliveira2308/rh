#!/usr/bin/env bash
# Gera e escreve os segredos aleatórios do .env (JWT, MFA, Postgres, RustFS).
#
# Por omissão só preenche o que falta: uma chave já definida com um valor real
# é mantida, por isso correr o script duas vezes é seguro e não parte nada.
# Para regenerar deliberadamente uma chave, usa --rotate.
#
# Uso:
#   ./scripts/generate-secrets.sh                      preenche o que falta no .env
#   ./scripts/generate-secrets.sh --rotate jwt         regenera as 4 chaves JWT
#   ./scripts/generate-secrets.sh --rotate all         regenera tudo (pede confirmação)
#   ./scripts/generate-secrets.sh --stdout             imprime, não escreve (CI)
#   ./scripts/generate-secrets.sh --env-file caminho   usa outro ficheiro
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ENV_FILE="$REPO_ROOT/.env"
ROTATE=""
FORCE=0
STDOUT=0

die() { echo "Erro: $*" >&2; exit 1; }

usage() { sed -n '2,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0; }

while [ $# -gt 0 ]; do
  case "$1" in
    --rotate)   ROTATE="${2:-}"; [ -n "$ROTATE" ] || die "--rotate precisa de uma lista (ex.: jwt, postgres, all)"; shift 2 ;;
    --rotate=*) ROTATE="${1#*=}"; shift ;;
    --env-file)   ENV_FILE="${2:-}"; [ -n "$ENV_FILE" ] || die "--env-file precisa de um caminho"; shift 2 ;;
    --env-file=*) ENV_FILE="${1#*=}"; shift ;;
    --force)  FORCE=1; shift ;;
    --stdout) STDOUT=1; shift ;;
    -h|--help) usage ;;
    *) die "opção desconhecida: $1 (usa --help)" ;;
  esac
done

command -v openssl >/dev/null 2>&1 || die "openssl não encontrado. Instala-o para gerar segredos aleatórios."

# ─── Grupos de segredos ─────────────────────────────────────────────────────
# Os pares JWT têm de ser gerados em conjunto: a chave pública deriva da privada,
# rodar só metade do par deixa tokens que não validam.
ALL_KEYS="JWT_ACCESS_PRIVATE_KEY JWT_ACCESS_PUBLIC_KEY JWT_REFRESH_PRIVATE_KEY JWT_REFRESH_PUBLIC_KEY MFA_ENCRYPTION_KEY POSTGRES_PASSWORD STORAGE_ACCESS_KEY STORAGE_SECRET_KEY"

group_keys() {
  case "$1" in
    jwt)          echo "JWT_ACCESS_PRIVATE_KEY JWT_ACCESS_PUBLIC_KEY JWT_REFRESH_PRIVATE_KEY JWT_REFRESH_PUBLIC_KEY" ;;
    jwt-access)   echo "JWT_ACCESS_PRIVATE_KEY JWT_ACCESS_PUBLIC_KEY" ;;
    jwt-refresh)  echo "JWT_REFRESH_PRIVATE_KEY JWT_REFRESH_PUBLIC_KEY" ;;
    mfa)          echo "MFA_ENCRYPTION_KEY" ;;
    postgres)     echo "POSTGRES_PASSWORD" ;;
    storage)      echo "STORAGE_ACCESS_KEY STORAGE_SECRET_KEY" ;;
    all)          echo "$ALL_KEYS" ;;
    # Um nome de chave individual arrasta o par JWT a que pertence.
    JWT_ACCESS_PRIVATE_KEY|JWT_ACCESS_PUBLIC_KEY)   group_keys jwt-access ;;
    JWT_REFRESH_PRIVATE_KEY|JWT_REFRESH_PUBLIC_KEY) group_keys jwt-refresh ;;
    MFA_ENCRYPTION_KEY|POSTGRES_PASSWORD|STORAGE_ACCESS_KEY|STORAGE_SECRET_KEY) echo "$1" ;;
    *) die "grupo/chave desconhecido: $1 (usa: jwt, jwt-access, jwt-refresh, mfa, postgres, storage, all)" ;;
  esac
}

ROTATE_KEYS=" "
if [ -n "$ROTATE" ]; then
  IFS=',' read -r -a _items <<< "$ROTATE"
  for item in "${_items[@]}"; do
    item=$(echo "$item" | tr -d '[:space:]')
    [ -n "$item" ] || continue
    for k in $(group_keys "$item"); do
      case "$ROTATE_KEYS" in *" $k "*) ;; *) ROTATE_KEYS="$ROTATE_KEYS$k " ;; esac
    done
  done
fi
wants_rotate() { case "$ROTATE_KEYS" in *" $1 "*) return 0 ;; *) return 1 ;; esac; }

# ─── Leitura do .env ────────────────────────────────────────────────────────
# O dotenv e o docker compose usam sempre a ÚLTIMA ocorrência de uma chave
# duplicada, por isso é essa que conta como valor efetivo.
current_value() {
  [ -f "$ENV_FILE" ] || { echo ""; return; }
  awk -v k="$1" 'index($0, k "=") == 1 { v = substr($0, length(k) + 2) } END { print v }' "$ENV_FILE"
}

key_present() {
  [ -f "$ENV_FILE" ] || return 1
  awk -v k="$1" 'index($0, k "=") == 1 { found = 1 } END { exit found ? 0 : 1 }' "$ENV_FILE"
}

# Conta as linhas a mais das chaves geridas (duplicados de execuções antigas).
count_duplicates() {
  local k n total=0
  for k in $ALL_KEYS; do
    n=$(awk -v k="$k" 'index($0, k "=") == 1 { n++ } END { print n + 0 }' "$ENV_FILE")
    [ "$n" -gt 1 ] && total=$((total + n - 1))
  done
  echo "$total"
}

# Um valor é placeholder se estiver vazio ou vier do .env.example (change_me*).
is_placeholder() {
  [ -z "$1" ] && return 0
  case "$1" in change_me*) return 0 ;; esac
  return 1
}

# ─── Guarda do volume do Postgres ───────────────────────────────────────────
# O Postgres só lê POSTGRES_PASSWORD quando INICIALIZA o volume. Se o volume já
# existe, escrever uma password nova no .env não muda a que está guardada — só
# parte o backend com `password authentication failed`.
postgres_volume() {
  command -v docker >/dev/null 2>&1 || return 1
  docker volume ls -q 2>/dev/null | grep -E '^srh-(dev|prod)_postgres-data$' | head -1
}

# ─── Geradores ──────────────────────────────────────────────────────────────
# PEM tem quebras de linha, incompatível com o formato KEY=value de uma linha
# do .env — daí o base64 -A.
_jwt_access_priv=""; _jwt_access_pub=""; _jwt_refresh_priv=""; _jwt_refresh_pub=""
gen_jwt_access() {
  [ -n "$_jwt_access_priv" ] && return
  local pem; pem=$(openssl genrsa 2048 2>/dev/null)
  _jwt_access_priv=$(printf '%s' "$pem" | openssl base64 -A)
  _jwt_access_pub=$(printf '%s' "$pem" | openssl rsa -pubout 2>/dev/null | openssl base64 -A)
}
gen_jwt_refresh() {
  [ -n "$_jwt_refresh_priv" ] && return
  local pem; pem=$(openssl genrsa 2048 2>/dev/null)
  _jwt_refresh_priv=$(printf '%s' "$pem" | openssl base64 -A)
  _jwt_refresh_pub=$(printf '%s' "$pem" | openssl rsa -pubout 2>/dev/null | openssl base64 -A)
}
# Pré-gera na shell principal os pares necessários para a lista de chaves dada.
# Tem de ser aqui: generate() é invocada dentro de $(...), um subshell, e uma
# variável atribuída lá dentro morre com ele — o par sairia desemparelhado.
pregenerate() {
  local k
  for k in "$@"; do
    case "$k" in
      JWT_ACCESS_PRIVATE_KEY|JWT_ACCESS_PUBLIC_KEY)   gen_jwt_access ;;
      JWT_REFRESH_PRIVATE_KEY|JWT_REFRESH_PUBLIC_KEY) gen_jwt_refresh ;;
    esac
  done
}

generate() {
  case "$1" in
    JWT_ACCESS_PRIVATE_KEY)  printf '%s' "$_jwt_access_priv" ;;
    JWT_ACCESS_PUBLIC_KEY)   printf '%s' "$_jwt_access_pub" ;;
    JWT_REFRESH_PRIVATE_KEY) printf '%s' "$_jwt_refresh_priv" ;;
    JWT_REFRESH_PUBLIC_KEY)  printf '%s' "$_jwt_refresh_pub" ;;
    MFA_ENCRYPTION_KEY)      openssl rand -hex 32 ;;
    POSTGRES_PASSWORD)       openssl rand -hex 24 ;;
    STORAGE_ACCESS_KEY)      openssl rand -hex 10 ;;
    STORAGE_SECRET_KEY)      openssl rand -hex 32 ;;
  esac
}

# ─── Modo --stdout (comportamento antigo, para CI) ──────────────────────────
if [ "$STDOUT" -eq 1 ]; then
  echo "# Gerado por scripts/generate-secrets.sh em $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "# Usa um conjunto DIFERENTE por ambiente (dev/staging/produção)."
  echo "# Nunca reutilizes estes valores entre ambientes nem os commites no repositório."
  echo
  pregenerate $ALL_KEYS
  for k in $ALL_KEYS; do echo "$k=$(generate "$k")"; done
  echo >&2
  echo "Aviso: --stdout não escreve no .env. Redirecionar com '>>' cria chaves DUPLICADAS" >&2
  echo "(o dotenv usa a última) e roda a POSTGRES_PASSWORD. Corre sem --stdout para" >&2
  echo "escrever no .env em segurança." >&2
  exit 0
fi

# ─── Decidir o que escrever ─────────────────────────────────────────────────
[ -f "$ENV_FILE" ] || die "$ENV_FILE não existe. Cria-o primeiro: cp .env.example .env"

PG_VOLUME=$(postgres_volume || true)
declare -a WRITE_KEYS=() WRITE_VALS=()
declare -a SKIPPED=() BLOCKED=()

for key in $ALL_KEYS; do
  value=$(current_value "$key")

  if wants_rotate "$key"; then
    # Rodar a password do Postgres sobre um volume já inicializado é a causa
    # mais comum de `password authentication failed for user "srh_user"`.
    if [ "$key" = "POSTGRES_PASSWORD" ] && [ -n "$PG_VOLUME" ] && [ "$FORCE" -eq 0 ]; then
      BLOCKED+=("$key")
      continue
    fi
  elif ! is_placeholder "$value"; then
    SKIPPED+=("$key")
    continue
  elif [ "$key" = "POSTGRES_PASSWORD" ] && [ -n "$PG_VOLUME" ] && [ "$FORCE" -eq 0 ]; then
    # Placeholder no .env mas o volume já foi inicializado com outra password:
    # gerar aqui não a descobre. Bloquear em vez de partir o stack.
    BLOCKED+=("$key")
    continue
  fi

  WRITE_KEYS+=("$key")
done

if [ ${#WRITE_KEYS[@]} -gt 0 ]; then
  pregenerate "${WRITE_KEYS[@]}"
  for key in "${WRITE_KEYS[@]}"; do WRITE_VALS+=("$(generate "$key")"); done
fi

if [ ${#BLOCKED[@]} -gt 0 ]; then
  echo "BLOQUEADO: o volume '$PG_VOLUME' já foi inicializado." >&2
  echo >&2
  echo "O Postgres só lê POSTGRES_PASSWORD quando inicializa o volume. Escrever uma" >&2
  echo "password nova no .env não muda a que está guardada — parte o backend." >&2
  echo >&2
  echo "Para rodar mesmo assim (mantém os dados): escreve primeiro no .env e só" >&2
  echo "depois sincroniza o Postgres com esse mesmo valor." >&2
  echo >&2
  echo "  ./scripts/generate-secrets.sh --rotate postgres --force" >&2
  echo "  NOVA=\$(grep '^POSTGRES_PASSWORD=' $ENV_FILE | cut -d= -f2-)" >&2
  echo "  docker exec srh-postgres-dev psql -U srh_user -d postgres \\" >&2
  echo "    -c \"ALTER USER srh_user WITH PASSWORD '\$NOVA';\"" >&2
  echo "  docker compose -f infra/docker-compose.dev.yml --env-file $ENV_FILE \\" >&2
  echo "    up -d --force-recreate backend" >&2
  echo >&2
  echo "Para começar de raiz (APAGA a base de dados): ver README > Troubleshooting." >&2
  echo >&2
fi

DUPES=$(count_duplicates)

if [ ${#WRITE_KEYS[@]} -eq 0 ] && [ "$DUPES" -eq 0 ]; then
  for k in "${SKIPPED[@]}"; do printf '  %-24s mantido\n' "$k"; done
  for k in "${BLOCKED[@]}"; do printf '  %-24s BLOQUEADO (ver acima)\n' "$k"; done
  echo
  if [ ${#BLOCKED[@]} -gt 0 ]; then
    echo "O .env não foi alterado."
    exit 1
  fi
  echo "Nada a fazer: todos os segredos já estão definidos."
  exit 0
fi

# Confirmação para rotações destrutivas: só avisa para chaves que já tinham um
# valor real, porque só aí é que a substituição destrói alguma coisa.
warn_rotation() {
  local k v
  for k in "${WRITE_KEYS[@]}"; do
    v=$(current_value "$k")
    is_placeholder "$v" && continue
    case "$k" in
      MFA_ENCRYPTION_KEY)
        echo "  MFA_ENCRYPTION_KEY: torna ilegíveis os secrets TOTP já cifrados na base de" >&2
        echo "    dados. Todos os colaboradores com MFA ativo têm de reconfigurar do zero." >&2
        : ;;
      JWT_ACCESS_PRIVATE_KEY|JWT_REFRESH_PRIVATE_KEY)
        echo "  ${k}: invalida imediatamente todas as sessões ativas — não há rotação" >&2
        echo "    com sobreposição de chaves (RNF-AUTH-004). Todos terão de fazer login." >&2
        : ;;
      POSTGRES_PASSWORD)
        echo "  POSTGRES_PASSWORD: corre o ALTER USER no Postgres, senão a auth parte." >&2
        : ;;
      STORAGE_ACCESS_KEY|STORAGE_SECRET_KEY)
        echo "  ${k}: reinicia o RustFS depois (docker restart srh-rustfs-dev)." >&2
        : ;;
    esac
  done
}

WARNINGS=$(warn_rotation 2>&1 || true)
if [ -n "$WARNINGS" ]; then
  echo "Vai substituir valores já definidos:" >&2
  printf '%s\n' "$WARNINGS" >&2
  echo >&2
  if [ "$FORCE" -eq 0 ] && [ -t 0 ]; then
    printf 'Continuar e substituir estes valores? [s/N] ' >&2
    read -r answer
    case "$answer" in [sSyY]*) ;; *) echo "Abortado. O .env não foi alterado." >&2; exit 1 ;; esac
  fi
fi

# ─── Escrita: substitui no sítio, nunca acrescenta duplicados ───────────────
# Os valores base64 contêm '/' e '+', por isso a substituição é feita com awk -v
# (comparação literal) e nunca com `sed s|...|` — um '/' no valor corromperia o
# padrão. Chaves duplicadas de execuções antigas são colapsadas numa só linha.
TMP=$(mktemp "${ENV_FILE}.tmp.XXXXXX")
trap 'rm -f "$TMP"' EXIT

VALFILE=$(mktemp "${ENV_FILE}.val.XXXXXX")
trap 'rm -f "$TMP" "$VALFILE"' EXIT
chmod 600 "$VALFILE"

# Chaves regeneradas: valor novo.
for i in "${!WRITE_KEYS[@]}"; do printf '%s=%s\n' "${WRITE_KEYS[$i]}" "${WRITE_VALS[$i]}" >> "$VALFILE"; done

# Chaves mantidas que já existem no ficheiro: valor efetivo, só para colapsar
# eventuais duplicados numa linha só. Não muda o que o dotenv leria.
MANAGED=" $(printf '%s ' "${WRITE_KEYS[@]}")"
for k in $ALL_KEYS; do
  case "$MANAGED" in *" $k "*) continue ;; esac
  key_present "$k" || continue
  printf '%s=%s\n' "$k" "$(current_value "$k")" >> "$VALFILE"
  MANAGED="$MANAGED$k "
done

KEYLIST=$(cut -d= -f1 "$VALFILE")

awk -v keylist="$KEYLIST" -v valfile="$VALFILE" '
  BEGIN {
    n = split(keylist, ks, "\n")
    for (i = 1; i <= n; i++) if (ks[i] != "") managed[ks[i]] = 1
    while ((getline line < valfile) > 0) {
      eq = index(line, "=")
      newval[substr(line, 1, eq - 1)] = substr(line, eq + 1)
    }
    close(valfile)
  }
  {
    eq = index($0, "=")
    key = (eq > 1 && $0 ~ /^[A-Za-z_][A-Za-z0-9_]*=/) ? substr($0, 1, eq - 1) : ""
    if (key != "" && (key in managed)) {
      if (!(key in written)) { print key "=" newval[key]; written[key] = 1 }
      next   # ocorrências seguintes (duplicados antigos) são descartadas
    }
    print
  }
  END {
    for (k in managed) if (!(k in written)) print k "=" newval[k]
  }
' "$ENV_FILE" > "$TMP"

# Preservar permissões do ficheiro original em vez das do mktemp.
chmod --reference="$ENV_FILE" "$TMP" 2>/dev/null || chmod 600 "$TMP"

BACKUP="${ENV_FILE}.bak.$(date +%Y%m%d-%H%M%S)"
cp -a "$ENV_FILE" "$BACKUP"
mv "$TMP" "$ENV_FILE"
trap - EXIT
rm -f "$VALFILE"

for k in "${WRITE_KEYS[@]}"; do printf '  %-24s gerado\n' "$k"; done
for k in "${SKIPPED[@]}"; do printf '  %-24s mantido (já definido)\n' "$k"; done
for k in "${BLOCKED[@]}"; do printf '  %-24s BLOQUEADO (volume já inicializado)\n' "$k"; done
echo
if [ "$DUPES" -gt 0 ]; then
  echo "$ENV_FILE atualizado (${#WRITE_KEYS[@]} chave(s), $DUPES duplicado(s) removido(s))."
else
  echo "$ENV_FILE atualizado (${#WRITE_KEYS[@]} chave(s))."
fi
echo "Cópia de segurança: $(basename "$BACKUP")"
echo
echo "Não incluídos (não são gerados localmente):"
echo "  SMTP_USER / SMTP_PASS               -> fornecedor de email"
echo "  SENTRY_DSN                          -> definições do projeto no Sentry"

[ ${#BLOCKED[@]} -gt 0 ] && exit 1
exit 0

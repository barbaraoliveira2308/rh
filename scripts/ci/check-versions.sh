#!/bin/sh
# Confirma as versões do Node e do pnpm (P-105). Corre no job `versions` do CI e localmente:
#   EXPECTED_NODE_MAJOR=20 sh scripts/ci/check-versions.sh
#
# 1. O Node em execução tem o major esperado (EXPECTED_NODE_MAJOR, definido no .gitlab-ci.yml).
# 2. O pnpm em execução é exatamente o do campo `packageManager` do package.json.
# 3. Todas as imagens `node:` declaradas nos Dockerfiles e no .gitlab-ci.yml são desse major.
# 4. Todos os `corepack prepare pnpm@…` dos Dockerfiles usam a versão do `packageManager`.
#
# Para mudar de major do Node: atualizar as imagens e EXPECTED_NODE_MAJOR no mesmo MR.
# Para mudar de pnpm: atualizar o `packageManager` e os Dockerfiles no mesmo MR.
set -eu

: "${EXPECTED_NODE_MAJOR:?defina EXPECTED_NODE_MAJOR (ex.: 20)}"
ERRORS=0
ok() { echo "  OK    $1"; }
bad() { echo "  ERRO  $1"; ERRORS=$((ERRORS + 1)); }

# Ficheiros onde se declaram imagens/pnpm. Sem `git ls-files`: a imagem node:alpine do CI não
# tem git. Pastas geradas ficam de fora.
DOCKERFILES=$(find . \( -name node_modules -o -name .git -o -name dist -o -name .pnpm-store \) -prune \
  -o -type f -name 'Dockerfile*' -print | sed 's|^\./||' | sort)
FILES="$DOCKERFILES .gitlab-ci.yml"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

PM=$(node -p "require('./package.json').packageManager || ''")
PNPM_EXPECTED=$(echo "$PM" | sed -n 's/^pnpm@\([0-9][0-9.]*\).*$/\1/p')

echo "Esperado: Node $EXPECTED_NODE_MAJOR.x · pnpm $PNPM_EXPECTED (packageManager: \"$PM\")"
echo

echo "Em execução:"
NODE_RUNNING=$(node --version | sed 's/^v//')
if [ "${NODE_RUNNING%%.*}" = "$EXPECTED_NODE_MAJOR" ]; then
  ok "node $NODE_RUNNING"
else
  bad "node $NODE_RUNNING (esperado $EXPECTED_NODE_MAJOR.x)"
fi

if [ -z "$PNPM_EXPECTED" ]; then
  bad "package.json: packageManager \"$PM\" não tem a forma pnpm@X.Y.Z"
else
  PNPM_RUNNING=$(pnpm --version)
  if [ "$PNPM_RUNNING" = "$PNPM_EXPECTED" ]; then
    ok "pnpm $PNPM_RUNNING"
  else
    bad "pnpm $PNPM_RUNNING (esperado $PNPM_EXPECTED)"
  fi
fi

echo
echo "Imagens node: declaradas:"
for f in $FILES; do
  # Linhas com uma imagem node:<versão> (FROM node:…, image: node:…, - name: node:…).
  grep -nE '(^|[[:space:]])node:[0-9]' "$f" | while IFS= read -r line; do
    tag=$(echo "$line" | sed -n 's/.*node:\([0-9][^[:space:]"'"'"']*\).*/\1/p')
    major=$(echo "$tag" | sed 's/[.-].*//')
    if [ "$major" = "$EXPECTED_NODE_MAJOR" ]; then ok "$f:${line%%:*}  node:$tag"
    else echo "  ERRO  $f:${line%%:*}  node:$tag (esperado $EXPECTED_NODE_MAJOR.x)"; fi
  done
done > "$TMP/images.txt"
cat "$TMP/images.txt"
FOUND=$(grep -c . "$TMP/images.txt" || true)
ERRORS=$((ERRORS + $(grep -c 'ERRO' "$TMP/images.txt" || true)))
[ "$FOUND" -gt 0 ] || bad "nenhuma imagem node: encontrada — o padrão de procura deixou de servir?"

echo
echo "corepack prepare pnpm@… nos Dockerfiles:"
for f in $DOCKERFILES; do
  grep -nE 'corepack prepare pnpm@' "$f" | while IFS= read -r line; do
    v=$(echo "$line" | sed -n 's/.*pnpm@\([0-9][0-9.]*\).*/\1/p')
    if [ "$v" = "$PNPM_EXPECTED" ]; then ok "$f:${line%%:*}  pnpm@$v"
    else echo "  ERRO  $f:${line%%:*}  pnpm@$v (esperado $PNPM_EXPECTED)"; fi
  done
done > "$TMP/pnpm.txt"
if [ -s "$TMP/pnpm.txt" ]; then cat "$TMP/pnpm.txt"; else echo "  (nenhum)"; fi
ERRORS=$((ERRORS + $(grep -c 'ERRO' "$TMP/pnpm.txt" || true)))

echo
if [ "$ERRORS" -gt 0 ]; then
  echo "$ERRORS divergência(s) — ver as linhas ERRO acima."
  exit 1
fi
echo "Versões do Node e do pnpm consistentes."

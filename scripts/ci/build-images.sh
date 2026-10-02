#!/bin/sh
# Constrói as imagens do backend e do frontend para o servidor de dev (P-106), no Docker do host
# (socket montado pelo runner). O servidor de dev corre no mesmo host e usa estas imagens locais
# diretamente (`pull_policy: never`), sem registry: o GitLab Container Registry
# (git.redstout.com:5050) não está acessível a partir do host — ver R-072.
#
# A cache de build persiste entre pipelines: se o pnpm-lock.yaml não mudou, o `pnpm install` vem
# da cache. Tags por imagem: `develop` (a que o servidor de dev usa) e o SHA curto do commit; ficam
# as KEEP versões mais recentes com SHA, para voltar atrás à mão.
set -eu

: "${CI_COMMIT_SHORT_SHA:?}"
REPO=srh-local
TAG=develop
LABEL=srh.ci-image=true
KEEP=5

build() { # $1 = backend | frontend; restantes argumentos vão para o docker build
  name=$1
  shift
  img="$REPO/$name"
  echo "=== $img:$TAG ($CI_COMMIT_SHORT_SHA)"
  docker build --label "$LABEL" -f "$name/Dockerfile" \
    -t "$img:$TAG" -t "$img:$CI_COMMIT_SHORT_SHA" "$@" .

  # Versões antigas: apaga as tags de SHA para lá das KEEP mais recentes (a `develop` fica sempre).
  docker image ls "$img" --format '{{.CreatedAt}}\t{{.Tag}}' | sort -r | cut -f2 \
    | grep -vx "$TAG" | tail -n +$((KEEP + 1)) | while read -r old; do
      docker rmi "$img:$old" > /dev/null && echo "  removida $img:$old"
    done
}

build backend
# O mesmo build arg que o docker-compose.devserver.yml usava (o nginx do frontend faz proxy de /api).
build frontend --build-arg VITE_API_URL=/api

# Imagens deste job que ficaram sem tag e que nenhum contentor usa.
docker image prune --force --filter "label=$LABEL"

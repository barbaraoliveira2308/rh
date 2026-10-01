#!/bin/sh
# Constrói as imagens do backend e do frontend e envia-as para o GitLab Container Registry (P-106).
# Corre no job `build-images`, no Docker do host (socket montado pelo runner), pelo que a cache de
# build persiste entre pipelines: se o pnpm-lock.yaml não mudou, o `pnpm install` vem da cache.
#
# Tags por imagem: `develop` (a que o servidor de dev usa) e o SHA curto do commit (para voltar a
# uma versão concreta). Localmente fica só a `develop`; as versões anteriores são apagadas.
set -eu

: "${CI_REGISTRY:?}" "${CI_REGISTRY_IMAGE:?}" "${CI_REGISTRY_USER:?}" "${CI_REGISTRY_PASSWORD:?}"
: "${CI_COMMIT_SHORT_SHA:?}"
TAG=develop
LABEL=srh.ci-image=true

echo "$CI_REGISTRY_PASSWORD" | docker login --username "$CI_REGISTRY_USER" --password-stdin "$CI_REGISTRY"

build() { # $1 = backend | frontend; restantes argumentos vão para o docker build
  name=$1
  shift
  img="$CI_REGISTRY_IMAGE/$name"
  echo "=== $img:$TAG ($CI_COMMIT_SHORT_SHA)"
  docker build --label "$LABEL" -f "$name/Dockerfile" \
    -t "$img:$TAG" -t "$img:$CI_COMMIT_SHORT_SHA" "$@" .
  docker push "$img:$TAG"
  docker push "$img:$CI_COMMIT_SHORT_SHA"
  docker rmi "$img:$CI_COMMIT_SHORT_SHA" > /dev/null
}

build backend
# O mesmo build arg que o docker-compose.devserver.yml usava (o nginx do frontend faz proxy de /api).
build frontend --build-arg VITE_API_URL=/api

# Imagens deste job que ficaram sem tag (versões anteriores) e que nenhum contentor usa.
docker image prune --force --filter "label=$LABEL"
docker logout "$CI_REGISTRY" > /dev/null

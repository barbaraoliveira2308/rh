#!/bin/sh
# Constrói as imagens do backend e do frontend e envia-as para o GitLab Container Registry (P-106).
# Corre no job `build-images`, no Docker do host (socket montado pelo runner), pelo que a cache de
# build persiste entre pipelines: se o pnpm-lock.yaml não mudou, o `pnpm install` vem da cache.
#
# O registry é usado pelo endereço interno SRH_REGISTRY (ex.: 10.1.30.40:50050, pelo túnel), em HTTP
# simples: o endereço público anunciado pelo GitLab não responde (R-072). Por isso o Docker do host
# do servidor de dev tem esse endereço em `insecure-registries`. O login usa as credenciais do
# próprio job (CI_REGISTRY_USER/CI_REGISTRY_PASSWORD), que o serviço de login do GitLab aceita
# qualquer que seja o endereço do registry.
#
# Tags por imagem: `develop` (a que o servidor de dev usa) e o SHA curto do commit (para voltar a
# uma versão concreta). Localmente fica só a `develop`; as versões anteriores são apagadas.
#
# `--provenance=false --sbom=false`: sem eles, o Docker 29 envia um índice (imagem + atestação de
# proveniência) que o registry do GitLab recusa com "blob unknown to registry" (P106-12).
set -eu

: "${SRH_REGISTRY:?}" "${CI_PROJECT_PATH:?}" "${CI_REGISTRY_USER:?}" "${CI_REGISTRY_PASSWORD:?}"
: "${CI_COMMIT_SHORT_SHA:?}"
REGISTRY_IMAGE="$SRH_REGISTRY/$CI_PROJECT_PATH"
TAG=develop
LABEL=srh.ci-image=true

echo "$CI_REGISTRY_PASSWORD" | docker login --username "$CI_REGISTRY_USER" --password-stdin "$SRH_REGISTRY"

build() { # $1 = backend | frontend; restantes argumentos vão para o docker build
  name=$1
  shift
  img="$REGISTRY_IMAGE/$name"
  echo "=== $img:$TAG ($CI_COMMIT_SHORT_SHA)"
  docker build --provenance=false --sbom=false --label "$LABEL" -f "$name/Dockerfile" \
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
docker logout "$SRH_REGISTRY" > /dev/null

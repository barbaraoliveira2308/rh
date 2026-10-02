#!/bin/sh
# Pede ao Portainer um "Pull and redeploy" do stack do servidor de dev (P-106), o mesmo que o botão
# na interface: atualiza o stack a partir do Git, descarrega as imagens novas e recria os
# contentores cuja imagem mudou. O Portainer CE não tem webhooks; isto usa a API dele.
#
# A API de redeploy substitui as variáveis de ambiente do stack pelas que o pedido traz: por isso
# lêem-se primeiro as atuais e reenviam-se sem alterações, e no fim confirma-se que não mudaram.
#
# Requer: curl, jq. Variáveis de CI/CD: PORTAINER_URL (ex.: https://<host>:9443), PORTAINER_TOKEN
# (access token do Portainer), PORTAINER_STACK_ID, PORTAINER_ENDPOINT_ID; opcional
# PORTAINER_INSECURE_TLS=true se o Portainer usar o certificado autoassinado de origem.
set -eu

: "${PORTAINER_URL:?}" "${PORTAINER_TOKEN:?}" "${PORTAINER_STACK_ID:?}" "${PORTAINER_ENDPOINT_ID:?}"
API="${PORTAINER_URL%/}/api"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

api() { # $1 = método, $2 = caminho, $3 = corpo (opcional)
  set -- "$1" "$2" "${3:-}"
  if [ "${PORTAINER_INSECURE_TLS:-false}" = true ]; then insecure=--insecure; else insecure=; fi
  curl --fail-with-body --silent --show-error $insecure \
    --header "X-API-Key: $PORTAINER_TOKEN" --header 'Content-Type: application/json' \
    --request "$1" ${3:+--data "$3"} "$API$2"
}

api GET "/stacks/$PORTAINER_STACK_ID" > "$WORK/before.json"
jq -e '.GitConfig != null' "$WORK/before.json" > /dev/null \
  || { echo "O stack $PORTAINER_STACK_ID não é um stack Git do Portainer."; exit 1; }
echo "Stack: $(jq -r '.Name' "$WORK/before.json") · ref $(jq -r '.GitConfig.ReferenceName' "$WORK/before.json") · $(jq '.Env // [] | length' "$WORK/before.json") variáveis"
# O stack do servidor de dev tem sempre variáveis (passwords, chaves JWT, …). Se a API não devolver
# nenhuma, reenviar a lista vazia apagava-as e o redeploy partia o backend: parar sem tocar em nada.
jq -e '(.Env // []) | length > 0' "$WORK/before.json" > /dev/null || {
  echo "ERRO: a API do Portainer não devolveu variáveis para este stack — redeploy cancelado."
  echo "Verificar as variáveis do stack no Portainer (DEPLOY_PORTAINER.md, secção 9)."
  exit 1
}

# Reenvia as variáveis atuais; a autenticação do Git fica a que está guardada no stack.
PAYLOAD=$(jq -c '{
    env: (.Env // []),
    prune: false,
    pullImage: true,
    repositoryReferenceName: .GitConfig.ReferenceName,
    repositoryAuthentication: (.GitConfig.Authentication != null),
    repositoryUsername: (.GitConfig.Authentication.Username // "")
  }' "$WORK/before.json")

api PUT "/stacks/$PORTAINER_STACK_ID/git/redeploy?endpointId=$PORTAINER_ENDPOINT_ID" "$PAYLOAD" > /dev/null
api GET "/stacks/$PORTAINER_STACK_ID" > "$WORK/after.json"

# As variáveis têm de ter ficado exatamente iguais.
if [ "$(jq -cS '.Env // [] | sort_by(.name)' "$WORK/before.json")" != \
     "$(jq -cS '.Env // [] | sort_by(.name)' "$WORK/after.json")" ]; then
  echo "ERRO: as variáveis de ambiente do stack mudaram com o redeploy — verificar no Portainer."
  exit 1
fi
# O Portainer responde logo e faz o pull e a recriação dos contentores em segundo plano (alguns
# segundos); o resultado vê-se no stack, no Portainer.
echo "Redeploy pedido ao Portainer (corre em segundo plano); variáveis do stack intactas."

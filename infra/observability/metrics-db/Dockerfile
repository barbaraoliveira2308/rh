# Postgres das métricas do CI. O script de inicialização vai dentro da imagem porque o stack do
# Portainer corre a partir do clone do Git, sem bind mounts de ficheiros do repositório.
FROM postgres:16.15-alpine
COPY --chmod=0755 init-roles.sh /docker-entrypoint-initdb.d/10-init-roles.sh

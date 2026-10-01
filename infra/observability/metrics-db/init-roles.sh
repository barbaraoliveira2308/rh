#!/bin/sh
# Corre uma única vez, quando o volume da base de dados é criado (docker-entrypoint-initdb.d).
# Cria os dois utilizadores e o schema `ci`; as tabelas são criadas pelo job collect-metrics
# (schema.sql), que é o dono do schema.
#   metrics_writer — usado pelo CI: cria as tabelas e escreve.
#   metrics_reader — usado pelo Grafana: só lê.
set -eu

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v writer_pw="$METRICS_WRITER_PASSWORD" \
  -v reader_pw="$METRICS_READER_PASSWORD" <<'SQL'
CREATE ROLE metrics_writer LOGIN PASSWORD :'writer_pw';
CREATE ROLE metrics_reader LOGIN PASSWORD :'reader_pw';

CREATE SCHEMA ci AUTHORIZATION metrics_writer;
GRANT USAGE ON SCHEMA ci TO metrics_reader;
ALTER DEFAULT PRIVILEGES FOR ROLE metrics_writer IN SCHEMA ci
  GRANT SELECT ON TABLES TO metrics_reader;
SQL

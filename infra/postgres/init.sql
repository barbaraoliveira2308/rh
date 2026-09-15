CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS hr;

-- Base de dados isolada para a suite e2e do backend (mesmo nome usado em ci.yml) — nunca
-- a mesma base de dados usada pelo stack de desenvolvimento (ver R-046 em GLOBAL-TASKS-RISKS.md).
CREATE DATABASE srh_test;

\c srh_test
CREATE SCHEMA IF NOT EXISTS hr;
\c srh

-- Base de dados própria do Keycloak, requerida por KC_DB_URL_DATABASE no docker-compose.dev.yml.
CREATE DATABASE keycloak;

\c keycloak
CREATE SCHEMA IF NOT EXISTS keycloak;
\c srh

CREATE ROLE hr_app WITH LOGIN PASSWORD 'change_me';

GRANT CONNECT ON DATABASE srh TO hr_app;
GRANT USAGE ON SCHEMA hr TO hr_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA hr TO hr_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA hr TO hr_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA hr
  GRANT ALL ON TABLES TO hr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr
  GRANT ALL ON SEQUENCES TO hr_app;

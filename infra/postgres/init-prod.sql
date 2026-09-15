-- Inicialização mínima do Postgres em produção.
--
-- ATENÇÃO: o Docker só corre os scripts de `docker-entrypoint-initdb.d` na PRIMEIRA
-- inicialização do volume. Num volume que já exista, este ficheiro é ignorado — nesse caso
-- aplicar o passo 7 do DEPLOY_UBUNTU.md à mão.
--
-- Ao contrário do `init.sql` do ambiente de desenvolvimento, este script NÃO cria:
--   * o schema `hr` — o CMD do `backend/Dockerfile` corre `schema:create`,
--     `migration:run:prod` e `seed:prod` sempre que o container do backend arranca;
--   * a base de dados `srh_test` — a suite e2e nunca corre em produção;
--   * o role `hr_app` — tem password fixa (`change_me`), aceitável só em desenvolvimento.

-- Base de dados própria do Keycloak. O serviço `keycloak` do docker-compose aponta para
-- KC_DB_URL_DATABASE=keycloak e KC_DB_SCHEMA=keycloak; sem ambos, o contentor entra em
-- crash loop com `FATAL: database "keycloak" does not exist`.
CREATE DATABASE keycloak;

\c keycloak
CREATE SCHEMA IF NOT EXISTS keycloak;

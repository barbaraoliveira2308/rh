-- Schema das métricas do CI (P-104). Idempotente: o job `collect-metrics` aplica-o a cada
-- execução, pelo que uma tabela ou coluna nova chega à base de dados sem passos manuais.
-- Só acrescentar (`CREATE ... IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`); nunca apagar dados:
-- o histórico é mantido por inteiro.

-- Uma linha por pipeline do `develop` (push ou agendado).
CREATE TABLE IF NOT EXISTS ci.runs (
  pipeline_id   bigint PRIMARY KEY,
  pipeline_url  text        NOT NULL,
  ref           text        NOT NULL,
  commit_sha    text        NOT NULL,
  commit_title  text,
  source        text        NOT NULL,  -- push, schedule, web, ...
  status        text        NOT NULL,  -- success, success_with_warnings, failed, canceled
  started_at    timestamptz NOT NULL,
  duration_s    integer,               -- até ao início do job collect-metrics
  collected_at  timestamptz NOT NULL DEFAULT now()
);

-- Uma linha por job do pipeline (sem o próprio collect-metrics).
CREATE TABLE IF NOT EXISTS ci.jobs (
  pipeline_id    bigint  NOT NULL REFERENCES ci.runs ON DELETE CASCADE,
  job_id         bigint  NOT NULL,
  name           text    NOT NULL,
  stage          text    NOT NULL,
  status         text    NOT NULL,
  allow_failure  boolean NOT NULL,
  duration_s     numeric,
  web_url        text,
  PRIMARY KEY (pipeline_id, job_id)
);

-- Totais por suite de testes (unit, e2e).
CREATE TABLE IF NOT EXISTS ci.tests (
  pipeline_id  bigint NOT NULL REFERENCES ci.runs ON DELETE CASCADE,
  suite        text   NOT NULL,
  total        integer NOT NULL,
  failures     integer NOT NULL,
  errors       integer NOT NULL,
  skipped      integer NOT NULL,
  duration_s   numeric,
  PRIMARY KEY (pipeline_id, suite)
);

-- Cobertura dos testes unitários do backend.
CREATE TABLE IF NOT EXISTS ci.coverage (
  pipeline_id    bigint PRIMARY KEY REFERENCES ci.runs ON DELETE CASCADE,
  line_pct       numeric NOT NULL,
  branch_pct     numeric,
  lines_covered  integer,
  lines_valid    integer
);

-- Um achado por linha, de todos os scanners (semgrep, secrets, kics, pnpm-audit).
CREATE TABLE IF NOT EXISTS ci.findings (
  id           bigserial PRIMARY KEY,
  pipeline_id  bigint NOT NULL REFERENCES ci.runs ON DELETE CASCADE,
  scanner      text   NOT NULL,
  severity     text   NOT NULL,  -- Critical, High, Medium, Low, Info, Unknown
  rule         text,
  title        text,
  location     text,             -- ficheiro, ou pacote@versão no pnpm-audit
  line         integer,
  url          text
);

CREATE INDEX IF NOT EXISTS findings_pipeline_idx ON ci.findings (pipeline_id, scanner, severity);

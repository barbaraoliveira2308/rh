#!/bin/sh
# Recolhe os resultados de um pipeline do `develop` e grava-os na base de dados de métricas do CI
# (infra/docker-compose.observability.yml), lida pelo Grafana. Corre no job `collect-metrics`
# (stage .post), depois de todos os outros jobs, com os artefactos deles na diretoria de trabalho.
#
# Requer: psql, jq, curl.
# Variáveis de CI/CD: METRICS_DB_URL (utilizador metrics_writer) e METRICS_GITLAB_TOKEN
# (project access token, role Reporter, scope read_api — para listar os jobs do pipeline).
# Um ficheiro em falta (ex.: job que não correu) não é erro: essa parte fica simplesmente vazia.
set -eu

WORK=$(mktemp -d)
P="$CI_PIPELINE_ID"

# ─── Jobs do pipeline (estado e duração) ───────────────────────────────────────────
curl --fail --silent --show-error \
  --header "PRIVATE-TOKEN: $METRICS_GITLAB_TOKEN" \
  "$CI_API_V4_URL/projects/$CI_PROJECT_ID/pipelines/$P/jobs?per_page=100" \
  | jq --argjson self "$CI_JOB_ID" '[.[] | select(.id != $self)]' > "$WORK/jobs.json"

jq -r --arg p "$P" '.[] |
  [$p, .id, .name, .stage, .status, .allow_failure, .duration, .web_url] | @csv' \
  "$WORK/jobs.json" > "$WORK/jobs.csv"

# Estado global, como o GitLab o mostraria no fim (sem o collect-metrics, que não bloqueia).
STATUS=$(jq -r '
  if any(.[]; .status == "failed" and (.allow_failure | not)) then "failed"
  elif any(.[]; .status == "canceled") then "canceled"
  elif any(.[]; .status == "failed") then "success_with_warnings"
  else "success" end' "$WORK/jobs.json")

# ─── Achados de segurança ──────────────────────────────────────────────────────────
# Relatórios no formato de segurança do GitLab (vulnerabilities[]).
: > "$WORK/findings.csv"
gitlab_report() { # $1 = ficheiro, $2 = nome do scanner
  [ -f "$1" ] || { echo "Sem $1 — $2 ignorado"; return 0; }
  jq -r --arg p "$P" --arg s "$2" '.vulnerabilities[]? | [
      $p, $s, (.severity // "Unknown"),
      (.identifiers[0].name // .identifiers[0].value // .id),
      ((.name // .message // .description // "") | .[0:500]),
      (.location.file // .location.dependency.package.name),
      .location.start_line,
      .identifiers[0].url
    ] | @csv' "$1" >> "$WORK/findings.csv"
}
gitlab_report gl-sast-semgrep-report.json semgrep
gitlab_report gl-secret-detection-report.json secret-detection
gitlab_report gl-sast-iac-report.json kics

# pnpm audit --json (severidades em minúsculas; moderate = Medium).
if [ -f audit.json ]; then
  jq -r --arg p "$P" '.advisories // {} | .[] | [
      $p, "pnpm-audit",
      ({critical: "Critical", high: "High", moderate: "Medium", low: "Low", info: "Info"}[.severity] // "Unknown"),
      (.github_advisory_id // (.id | tostring)),
      (.title | .[0:500]),
      (.module_name + "@" + (.findings[0].version // "")),
      null,
      .url
    ] | @csv' audit.json >> "$WORK/findings.csv"
else
  echo "Sem audit.json — pnpm-audit ignorado"
fi

# ─── Testes (JUnit do jest-junit) ──────────────────────────────────────────────────
: > "$WORK/tests.csv"
junit() { # $1 = ficheiro, $2 = suite
  [ -f "$1" ] || { echo "Sem $1 — testes $2 ignorados"; return 0; }
  root=$(grep -o '<testsuites [^>]*>' "$1" | head -1)
  attr() { echo "$root" | sed -n "s/.* $1=\"\([^\"]*\)\".*/\1/p"; }
  skipped=$(grep -o '<testsuite [^>]*>' "$1" | sed -n 's/.* skipped="\([0-9]*\)".*/\1/p' \
    | awk '{ s += $1 } END { print s + 0 }')
  echo "$P,$2,$(attr tests),$(attr failures),$(attr errors),$skipped,$(attr time)" >> "$WORK/tests.csv"
}
junit backend/junit-unit.xml unit
junit backend/junit-e2e.xml e2e

# ─── Cobertura (Cobertura XML) ─────────────────────────────────────────────────────
: > "$WORK/coverage.csv"
COB=backend/coverage/cobertura-coverage.xml
if [ -f "$COB" ]; then
  root=$(grep -o '<coverage [^>]*>' "$COB" | head -1)
  attr() { echo "$root" | sed -n "s/.* $1=\"\([^\"]*\)\".*/\1/p"; }
  awk -v p="$P" -v l="$(attr line-rate)" -v b="$(attr branch-rate)" \
      -v c="$(attr lines-covered)" -v v="$(attr lines-valid)" \
    'BEGIN { printf "%s,%.2f,%.2f,%s,%s\n", p, l * 100, b * 100, c, v }' > "$WORK/coverage.csv"
else
  echo "Sem $COB — cobertura ignorada"
fi

# ─── Gravar ────────────────────────────────────────────────────────────────────────
# O schema é aplicado primeiro (idempotente). Tudo o resto numa única transação; um job
# repetido substitui o que o anterior gravou para o mesmo pipeline.
PGOPTIONS='-c client_min_messages=warning' \
  psql "$METRICS_DB_URL" -v ON_ERROR_STOP=1 --quiet -f infra/observability/metrics-db/schema.sql

psql "$METRICS_DB_URL" -v ON_ERROR_STOP=1 --quiet \
  -v p="$P" -v url="$CI_PIPELINE_URL" -v ref="$CI_COMMIT_REF_NAME" \
  -v sha="$CI_COMMIT_SHA" -v title="$CI_COMMIT_TITLE" -v src="$CI_PIPELINE_SOURCE" \
  -v status="$STATUS" -v started="$CI_PIPELINE_CREATED_AT" <<SQL
BEGIN;
DELETE FROM ci.runs WHERE pipeline_id = :p;
INSERT INTO ci.runs (pipeline_id, pipeline_url, ref, commit_sha, commit_title, source, status, started_at, duration_s)
VALUES (:p, :'url', :'ref', :'sha', :'title', :'src', :'status', :'started',
        extract(epoch FROM now() - :'started'::timestamptz)::integer);
\copy ci.jobs (pipeline_id, job_id, name, stage, status, allow_failure, duration_s, web_url) FROM '$WORK/jobs.csv' WITH (FORMAT csv)
\copy ci.findings (pipeline_id, scanner, severity, rule, title, location, line, url) FROM '$WORK/findings.csv' WITH (FORMAT csv)
\copy ci.tests (pipeline_id, suite, total, failures, errors, skipped, duration_s) FROM '$WORK/tests.csv' WITH (FORMAT csv)
\copy ci.coverage (pipeline_id, line_pct, branch_pct, lines_covered, lines_valid) FROM '$WORK/coverage.csv' WITH (FORMAT csv)
COMMIT;
SQL

echo "Pipeline $P gravado: estado $STATUS, $(wc -l < "$WORK/jobs.csv") jobs, $(wc -l < "$WORK/findings.csv") achados, $(wc -l < "$WORK/tests.csv") suites de testes."

# Processo de Auditoria — HR Suite

Guia interno para a equipa técnica conduzir uma auditoria completa ao sistema: segurança, conformidade RGPD, integridade de dados, trilha de auditoria, infraestrutura e qualidade de código.

## Quando usar

- Antes de cada `release/*` para produção com alterações em auth, RBAC, GDPR ou dados financeiros
- Trimestralmente, como auditoria de rotina
- Após qualquer incidente de segurança ou fuga de dados

## Como funciona

O processo tem 8 fases (0–7), pensadas para correr sequencialmente — cada fase parte do resultado da anterior. Cada fase tem um objetivo, uma checklist acionável e um entregável concreto. Um item falhado é registado como _finding_ (modelo no fim deste documento) e não bloqueia a fase seguinte, exceto findings **Críticos**, que devem ser corrigidos antes de avançar.

## Severidade

| Nível       | Critério                                                                 | Prazo de remediação             |
| ----------- | ------------------------------------------------------------------------ | ------------------------------- |
| **Crítico** | Exposição de dados pessoais/segredos, bypass de autenticação/autorização | Imediato — bloqueia a auditoria |
| **Alto**    | Falha de controlo com exploração plausível, incumprimento RGPD direto    | 7 dias                          |
| **Médio**   | Falha de controlo com exploração pouco provável, dívida técnica de risco | 30 dias                         |
| **Baixo**   | Boa prática não seguida, sem impacto direto                              | Próximo ciclo de sprint         |

---

## Fase 0 — Preparação e Âmbito

**Objetivo:** delimitar o que entra na auditoria e criar as condições para que seja repetível.

- [ ] Fixar o commit/branch auditado (`git rev-parse HEAD`) e o(s) ambiente(s) — dev, staging, produção
- [ ] Confirmar a versão de `docs/openapi.json` corresponde ao commit auditado
- [ ] Inventariar os 25 módulos de `backend/src/` e assinalar quais entram no âmbito desta ronda
- [ ] Inventariar os serviços de infraestrutura envolvidos (`infra/docker-compose.{dev,prod}.yml`): PostgreSQL, Redis, RustFS, RabbitMQ, SMTP
- [ ] Identificar quem tem acesso de produção (base de dados, RustFS, `.env`) neste momento
- [ ] Abrir o registo de findings desta ronda (cópia do modelo no fim deste documento)

**Entregável:** ficha de âmbito com commit, ambientes e responsáveis por fase.

---

## Fase 1 — Autenticação e Controlo de Acessos

**Objetivo:** confirmar que só entra quem deve entrar, e que só se faz o que o papel permite.

- [ ] `JwtAuthGuard`/`RolesGuard` (`auth/guards`, `rbac/guards`) aplicados a todos os controllers — procurar endpoints sem `@UseGuards`/`@Roles`/`@Permissions`
- [ ] Expiração de `JWT_EXPIRES_IN`/`JWT_REFRESH_EXPIRES_IN` adequada ao perfil de risco (curta para access token); confirmar rotação/revogação de refresh tokens em `session.entity.ts`
- [ ] `rate-limit.guard.ts` ativo no endpoint de login e testado contra força bruta
- [ ] MFA TOTP: secrets gerados por `mfa.service.ts` são cifrados via `encryption.service.ts` (AES-256-GCM) antes de persistir — nunca em texto plano
- [ ] `MFA_ENCRYPTION_KEY` tem 32 bytes reais em produção (não o valor de exemplo `change_me_mfa_key_32_bytes`)
- [ ] Códigos de recuperação MFA (`mfa_recovery_codes`) guardados só em hash e de uso único; desafio MFA do login (`POST /auth/login/mfa`) de uso único e com expiração curta
- [ ] `password-reset-token.entity.ts`: tokens de uso único, com expiração curta e invalidados após uso
- [ ] `api-key.entity.ts`: chaves de API têm escopo, expiração e podem ser revogadas sem rotação de segredo global
- [ ] Matriz RBAC (`rbac/enums/role.enum.ts`, `rbac/constants.ts`) revista — nenhum papel tem permissões além do necessário (princípio do menor privilégio)
- [ ] `BACKEND_CORS_ORIGIN` restrito ao(s) domínio(s) reais em produção, nunca `*`

**Entregável:** matriz de endpoints × guardas aplicados, com gaps assinalados como findings.

---

## Fase 2 — Proteção de Dados e Conformidade RGPD

**Objetivo:** confirmar que o módulo GDPR cumpre o que promete, na prática.

- [ ] Cada finalidade de tratamento de dados pessoais tem uma base legal documentada (`legal-basis.enum.ts`)
- [ ] Fluxo de consentimento: `recordConsent`/`revokeConsent` (`gdpr.service.ts`) refletido de imediato em `findConsents`
- [ ] Pedido de **acesso**/**portabilidade** gera o payload JSON completo e correto dos dados do titular
- [ ] Pedido de **apagamento**: correr `anonymizeEmployee()` num colaborador de teste e confirmar que campos pessoais (nome, email, morada, documentos) ficam anonimizados mas dados estatísticos (horas, custos, histórico de projetos) permanecem — testar contra `test/gdpr-erasure.e2e-spec.ts`
- [ ] Pedido de **retificação** abre corretamente um ticket pendente e não é auto-aplicado
- [ ] Política de retenção: confirmar se há políticas ativas configuradas (decisão P018-01 assume que não há período default) — se não houver, decidir explicitamente se isso é aceitável ou é um gap
- [ ] Cron mensal de retenção (`@Cron('0 3 1 * *')`) corre e regista o resultado; simular execução em staging
- [ ] `AuditInterceptor` mascara corretamente todos os campos marcados `@GdprSensitive` — amostrar audit logs reais e confirmar que não há PII em claro
- [ ] Processo de registo e resposta a `SecurityIncident` testado: da deteção ao `reportIncident()` até ao relatório de compliance
- [ ] `getComplianceReport()` gerado e revisto por quem responde legalmente pelo RGPD na empresa

**Entregável:** relatório de conformidade RGPD assinado, com evidência de teste do fluxo de apagamento.

---

## Fase 3 — Integridade de Dados e Lógica de Negócio

**Objetivo:** confirmar que os números e as regras de negócio críticas estão corretos, não só que "correm sem erro".

- [ ] Saldo de férias em dias úteis (decisão P012-01) — validar contra um calendário real com feriados e fins de semana
- [ ] Deteção de sobreposição de alocações (`ProjectAllocationsPage` / `projects` service) — testar alocações fronteira (mesmo dia de início/fim)
- [ ] Deteção de duplicados em despesas (`detectDuplicates()`) — confirmar a margem de ±5%, janela de datas e isolamento por colaborador ainda correspondem à política atual da empresa
- [ ] Cálculo de margem de consultor (`getConsultantMargin()`) — confirmar que seleciona sempre o contrato ativo correto no período, incluindo casos de troca de contrato a meio do mês
- [ ] Transformers numéricos (decimal → number) em timesheets, despesas e contratos — sem perda de precisão em valores financeiros, sem concatenação de strings
- [ ] Migrations aplicadas correspondem 1:1 ao histórico em `backend/src/database/migrations/` — sem alterações manuais à schema fora de migration
- [ ] Suite e2e completa corre verde: `timesheets-flow`, `absences-flow`, `gdpr-erasure` (`backend/test/`)
- [ ] Matriz 9-box (`getNineBoxMatrix()`) recalculada com dados de teste e validada manualmente contra 2–3 casos conhecidos

**Entregável:** lista de discrepâncias entre regra de negócio documentada (`specs/`) e comportamento real observado.

---

## Fase 4 — Trilha de Auditoria e Observabilidade

**Objetivo:** confirmar que, se algo correr mal, há como descobrir o quê, quando e por quem.

- [ ] `@Audit()` (`audit/decorators/audit.decorator.ts`) aplicado em todas as operações sensíveis: users, contracts, gdpr, absences, expenses, rbac
- [ ] Audit logs são apenas de escrita para os administradores — confirmar que não existe endpoint que permita apagar ou alterar `audit_log` diretamente
- [ ] Retenção dos audit logs definida e alinhada com a política de retenção RGPD (Fase 2)
- [ ] `SENTRY_DSN` configurado em staging/produção e a capturar exceções reais (validar com um erro provocado deliberadamente)
- [ ] `PROMETHEUS_ENABLED=true` em produção, métricas a expor em `/metrics` (ou endpoint equivalente) e recolhidas
- [ ] Amostra de logs de aplicação (backend) não contém `JWT_ACCESS_PRIVATE_KEY`/`JWT_REFRESH_PRIVATE_KEY`, passwords, tokens ou payloads completos de PII
- [ ] Notificações críticas (falha de cron, falha de fila RabbitMQ) chegam a alguém, não só ao log

**Entregável:** confirmação de que um evento simulado (erro 500, falha de cron) é detetável em Sentry/Prometheus/logs dentro de minutos.

---

## Fase 5 — Infraestrutura e Segredos

**Objetivo:** confirmar que a base sobre a qual tudo corre está fechada.

- [ ] Nenhuma variável de `.env` em produção mantém o valor de exemplo do `.env.example` (`change_me`, `change_me_run_generate_secrets_sh`, `srh_user`/password fraca, etc.) — usar `scripts/generate-secrets.sh` para gerar substitutos
- [ ] Segredos (`JWT_ACCESS_PRIVATE_KEY`, `JWT_REFRESH_PRIVATE_KEY`, `MFA_ENCRYPTION_KEY`, `STORAGE_SECRET_KEY`, `POSTGRES_PASSWORD`) geridos fora do repositório (cofre de segredos / CI secrets), não só num `.env` local
- [ ] `JWT_ACCESS_PRIVATE_KEY`, `JWT_REFRESH_PRIVATE_KEY`, `MFA_ENCRYPTION_KEY`, `POSTGRES_PASSWORD`, `STORAGE_ACCESS_KEY`/`STORAGE_SECRET_KEY` têm valores **distintos** entre dev, staging e produção (não é o mesmo `.env` copiado)
- [ ] **Antes de rodar `MFA_ENCRYPTION_KEY`:** confirmar que a equipa foi avisada — a rotação torna ilegíveis os secrets TOTP já cifrados na base de dados e obriga todos os colaboradores com MFA ativo a reconfigurar do zero (ver `EncryptionService.decrypt()`)
- [ ] **Antes de rodar `JWT_ACCESS_PRIVATE_KEY`/`JWT_REFRESH_PRIVATE_KEY`:** confirmar que a equipa foi avisada — não há suporte a rotação com sobreposição de chaves (RNF-AUTH-004 continua por implementar), pelo que rodar estas chaves invalida imediatamente todas as sessões ativas e força novo login a todos os utilizadores
- [ ] `docker-compose.prod.yml` usa imagens fixadas por tag de versão (não `latest`) e não expõe portas de infraestrutura (Postgres, Redis, RabbitMQ) publicamente
- [ ] Bucket `srh-documents` no RustFS/S3: política de acesso privada por omissão, `STORAGE_USE_SSL=true` em produção
- [ ] Backups de PostgreSQL: existe rotina agendada, e já foi feito um teste de restauro nos últimos 90 dias
- [ ] RabbitMQ: fila de `report_jobs` com dead-letter queue ou reprocessamento definido para jobs falhados
- [x] `pnpm audit` (ou equivalente) corrido sobre backend e frontend — **corrido em P-042**: 21 vulnerabilidades (4 moderate, 17 high), 2 altas de runtime corrigidas (`multer` 2.1.1→2.2.0 via `pnpm.overrides` em `package.json`, `react-router-dom` 7.18.1→7.18.2), as restantes ~15 classificadas nessa altura como "só ferramentas de build/dev, nunca correm em produção", deixadas para o Dependabot. **Revisto em P-050 (`R-041`, ver `specs/GLOBAL-TASKS-RISKS.md`)**: essa classificação estava incorreta — `typeorm` (dependência de produção direta), `uuid` (via `exceljs`, produção) e `brace-expansion` (via `typeorm`/`exceljs`, produção) são de facto alcançáveis por código de produção, ainda que a exploração prática avaliada seja baixa nos 3 casos. **Corrigido em P-051**: `typeorm` atualizado para `0.3.31` (`pnpm update` dentro do range já declarado `^0.3.20`); `pnpm.overrides` adicionados para `uuid` (`^11.1.1`), `brace-expansion` (`@1`→`^1.1.18`, `@2`→`^2.1.4`, `@5`→`^5.0.9`), `js-yaml` (`@3`→`^3.15.1`, `@4`→`^4.3.1`) e `fast-uri` (`^3.1.5`) — mesmo padrão já usado para `multer`. `pnpm audit` pós-fix: só restam `nanoid`/`postcss`, confirmados build-time-only do frontend, nunca incluídos no bundle enviado ao browser
- [x] Scanning automático de dependências (Dependabot) — **configurado em P-042**: `.github/dependabot.yml`, ecossistemas `npm` (workspace pnpm) e `github-actions`, atualizações semanais agrupadas por minor/patch (decisão P042-01/02); imagens Docker (`Dockerfile`/`docker-compose.*.yml`) deixadas fora do âmbito nesta ronda

**Entregável:** lista de segredos/configuração que ainda dependem de valores de exemplo ou processo manual.

---

## Fase 6 — Qualidade de Código e Testes

**Objetivo:** confirmar que a base de código sustenta as garantias das fases anteriores ao longo do tempo, não só neste commit.

- [ ] `pnpm run lint` e `pnpm run build` (raiz, backend, frontend) verdes no commit auditado
- [ ] Cobertura de testes por módulo revista — assinalar módulos com apenas "testes básicos" (per `PROJECT_STATE.md`: analytics, gdpr, training entre outros) como candidatos a reforço
- [ ] CI (`ci.yml`) cobre lint, e2e backend e e2e frontend em todos os PRs para `main`
- [ ] Nenhum `TODO`/`FIXME` relacionado com segurança ou dados pessoais em código de produção sem issue associada
- [ ] `specs/GLOBAL-TASKS-RISKS.md` e `specs/README.md` refletem o estado real dos módulos (nenhum módulo marcado como "Implemented" com gaps conhecidos por documentar)

**Entregável:** lista de módulos com cobertura de testes abaixo do padrão da equipa, priorizada por criticidade (financeiro/RGPD primeiro).

---

## Fase 7 — Relatório Final e Remediação

**Objetivo:** fechar o ciclo — findings viram trabalho com dono e prazo, não uma lista esquecida.

- [ ] Consolidar todos os findings das Fases 1–6 num único relatório, ordenado por severidade
- [ ] Atribuir responsável e prazo a cada finding (ver tabela de prazos na secção Severidade)
- [ ] Findings **Críticos** e **Altos** viram issues/tickets antes de a auditoria ser dada como fechada
- [ ] Agendar re-teste dos findings corrigidos (não basta o autor da correção confirmar — outro membro da equipa valida)
- [ ] Atualizar `PROJECT_STATE.md` com as decisões resultantes da auditoria (nova entrada em "Decisions" se alterar comportamento do sistema)
- [ ] Guardar o relatório final e a data da próxima auditoria agendada

**Entregável:** relatório de auditoria assinado + issues abertas para todos os findings Crítico/Alto.

---

## Modelo de Registo de Finding

```
ID: AUD-<ano>-<sequencial>
Fase: <0-7>
Severidade: Crítico | Alto | Médio | Baixo
Módulo/ficheiro: <caminho>
Descrição: <o que foi encontrado>
Evidência: <log, screenshot, comando executado>
Risco: <o que pode correr mal se não for corrigido>
Responsável:
Prazo:
Estado: Aberto | Em correção | Corrigido | Re-testado | Fechado
```

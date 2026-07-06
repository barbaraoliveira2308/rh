# Módulo 23 — Administração do Sistema

## Objetivo
Gerir configurações globais do sistema, parâmetros organizacionais, entidades legais, perfis de calendário, tecnologia e infraestrutura.

## Responsabilidades
1. Configurar parâmetros globais do sistema.
2. Gerir entidades legais (Bridge351, NIVVOS).
3. Configurar tecnologia de fundo (SSO, storage, email).
4. Gerir calendários de feriados.
5. Configurar políticas de password e sessão.
6. Gerir limites e thresholds de alertas.
7. Suportar multi-tenant (se aplicável).

## Configurações do Sistema

| Categoria | Parâmetro | Tipo | Exemplo |
|-----------|-----------|------|---------|
| Organização | Nome da empresa | STRING | "Bridge351" |
| Organização | Entidades legais | LIST | ["Bridge351", "NIVVOS"] |
| Organização | País por defeito | STRING | "PT" |
| Organização | Moeda por defeito | STRING | "EUR" |
| Ausências | Dias de férias por defeito/ano | INT | 22 |
| Ausências | Dias transitáveis para próximo ano | INT | 5 |
| Timesheets | Prazo submissão (dia do mês seguinte) | INT | 5 |
| Timesheets | Horas diárias por defeito | DECIMAL | 8.0 |
| Alertas | Dias antes para alertar fim de contrato | INT | 30 |
| Alertas | Dias antes para alertar fim de projeto | INT | 30 |
| Alertas | Threshold de sub-alocação | DECIMAL | 80.0 |
| Segurança | Timeout de sessão (minutos) | INT | 30 |
| Segurança | Tentativas de login antes de bloqueio | INT | 5 |
| Segurança | Período de bloqueio (minutos) | INT | 15 |
| Segurança | MFA obrigatório para Admin | BOOLEAN | true |
| GDPR | Período retenção pós-saída (anos) | INT | 5 |
| Documentos | Retenção na lixeira (dias) | INT | 30 |

## Entidades Legais

O sistema suporta múltiplas entidades legais (Bridge351, NIVVOS) com:
- Nome e NIF da entidade.
- País e moeda.
- Perfil de calendário (feriados por país).
- Configurações específicas de férias e ausências.

## Requisitos Técnicos (Arquitectura)

### Stack Tecnológico

| Componente | Tecnologia |
|-----------|-----------|
| Frontend | React.js (preferido) / Vue.js / Angular |
| Backend | Node.js (NestJS) / Django / FastAPI |
| Base de dados | PostgreSQL |
| Cache | Redis |
| Mensageria | RabbitMQ ou Apache Kafka |
| Armazenamento ficheiros | MinIO (compatível S3) |
| Identity Provider | Keycloak |
| Monitorização | Prometheus + Grafana |
| Logging | ELK Stack / OpenSearch |

### Containerização

- Implementação integralmente em Docker.
- Ficheiros Dockerfile e docker-compose obrigatórios.
- Suporte a Kubernetes ou Docker Swarm.
- Ambientes: Desenvolvimento, Testes, Staging, Produção.
- Configuração via variáveis de ambiente.

### API

- RESTful com OpenAPI/Swagger.
- Autenticação OAuth2 / OIDC / JWT.
- Rate limiting.
- Versionamento de API (v1, v2...).
- Logging de utilização da API.

### Compatibilidade

- Browsers modernos (Chrome, Firefox, Safari, Edge).
- Interface responsiva (desktop + mobile).
- Progressive Web App (PWA).
- Internacionalização (i18n) — múltiplos idiomas.

## Requisitos Não Funcionais do Sistema

| ID | Categoria | Requisito |
|----|-----------|-----------|
| RNF-SYS-001 | Performance | Tempo de resposta < 3s em operações correntes. |
| RNF-SYS-002 | Disponibilidade | 99,5% de uptime mínimo. |
| RNF-SYS-003 | Backups | Backups automáticos diários com restore automatizado. |
| RNF-SYS-004 | Escalabilidade | Suporte a escalabilidade horizontal dos serviços. |
| RNF-SYS-005 | DevOps | CI/CD com pipelines automatizadas. |
| RNF-SYS-006 | Monitoring | Health checks e métricas técnicas/funcionais. |
| RNF-SYS-007 | Updates | Rolling updates sem downtime significativo. |
| RNF-SYS-008 | Open Source | Sem dependências proprietárias obrigatórias. |
| RNF-SYS-009 | Segurança | Encriptação em repouso e em trânsito. |
| RNF-SYS-010 | i18n | Múltiplos idiomas suportados. |

## Permissões

| Ação | Administrador | Outros |
|------|:---:|:---:|
| Aceder às configurações do sistema | ✅ | ❌ |
| Gerir entidades legais | ✅ | ❌ |
| Configurar SSO e integrações | ✅ | ❌ |
| Configurar alertas e thresholds | ✅ | ❌ |
| Gerir calendários de feriados | ✅ | ❌ |

## APIs

- GET /api/v1/admin/settings
- PUT /api/v1/admin/settings
- GET /api/v1/admin/legal-entities
- POST /api/v1/admin/legal-entities
- PUT /api/v1/admin/legal-entities/:id
- GET /api/v1/admin/health (health check público)
- GET /api/v1/admin/metrics (Prometheus format)

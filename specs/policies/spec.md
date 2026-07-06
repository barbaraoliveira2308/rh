# Módulo 17 — Políticas Internas

## Objetivo
Publicar, organizar e disponibilizar políticas internas e conhecimento organizacional num repositório centralizado e pesquisável.

## Entidades

### Policy
| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| title | VARCHAR(200) | — |
| content | TEXT | Conteúdo em formato rich text (HTML/Markdown) |
| category | VARCHAR(100) | — |
| status | ENUM | draft, published, archived |
| author_id | UUID | FK Employee |
| published_at | TIMESTAMP | — |
| updated_at | TIMESTAMP | — |
| version | INT | Incrementado a cada edição |
| tags | JSONB | Para pesquisa |

## Requisitos Funcionais

| ID | Descrição |
|----|-----------|
| RF-POL-001 | O sistema deve permitir publicação de políticas internas com editor de conteúdo. |
| RF-POL-002 | O sistema deve suportar pesquisa por palavras-chave. |
| RF-POL-003 | O sistema deve manter histórico de versões das políticas. |
| RF-POL-004 | O sistema deve suportar categorização e tags. |
| RF-POL-005 | O sistema deve suportar integração futura com IA para pesquisa contextual. |

## Permissões

| Ação | Administrador | Gestor | Colaborador |
|------|:---:|:---:|:---:|
| Criar/editar política | ✅ | ❌ | ❌ |
| Publicar política | ✅ | ❌ | ❌ |
| Ver políticas publicadas | ✅ | ✅ | ✅ |
| Pesquisar políticas | ✅ | ✅ | ✅ |

## APIs

- GET /api/v1/policies
- POST /api/v1/policies
- GET /api/v1/policies/:id
- PUT /api/v1/policies/:id
- POST /api/v1/policies/:id/publish
- GET /api/v1/policies/search?q=

## Nota sobre IA
O documento menciona "integração futura com mecanismos de IA para pesquisa contextual" — esta funcionalidade é explicitamente futura e não faz parte do âmbito v1.

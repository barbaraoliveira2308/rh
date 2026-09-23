# Architecture

## Current Architecture

![Arquitetura atual do HR Suite](./architecture-current.png)

O diagrama acima representa o estado atual do sistema: frontend React/Vite, API NestJS,
módulos de negócio, serviços transversais e infraestrutura Docker. O SVG é vetorial e pode
ser reutilizado em documentação técnica, apresentações e exportações para PDF.

## Current Component Diagram

```mermaid
flowchart LR
    subgraph FE[Frontend React / Vite]
        APP[App.tsx<br/>ErrorBoundary · Suspense]
        ROUTES[React Router<br/>PublicRoute · ProtectedRoute]
        LAYOUTS[Layouts<br/>AuthLayout · AppLayout]
        PAGES[Páginas lazy-loaded<br/>domínios RH]
        UI[Components / UI<br/>MUI · Tailwind · shadcn/ui]
        STATE[Estado<br/>Zustand · React Query]
        API[API clients<br/>Axios · JWT Bearer]
        APP --> ROUTES --> LAYOUTS --> PAGES
        PAGES --> UI
        PAGES --> STATE
        STATE --> API
    end

    SHARED[shared<br/>tipos e constantes]

    subgraph BE[Backend NestJS]
        HTTP[Controllers / REST API<br/>/api]
        CORE[Guards · DTOs · Services<br/>TypeORM · EventEmitter2]
        MODULES[Módulos de negócio<br/>Auth · Users · Teams · Clients · Contracts<br/>Projects · Timesheets · Absences · Expenses<br/>Analytics · Calendar · Capacity · Admin<br/>Announcements · Helpdesk · Policies · Reports<br/>Training · GDPR · Notifications · Workflow<br/>Opportunities · Audit · Documents]
        CROSS[Serviços transversais<br/>RBAC · Cache · Storage · Auth/Keycloak]
        HTTP --> CORE --> MODULES
        CORE --> CROSS
    end

    subgraph INFRA[Infraestrutura Docker]
        PG[(PostgreSQL 16)]
        REDIS[(Redis 7)]
        RABBIT[(RabbitMQ)]
        MINIO[(MinIO / S3)]
        KC[Keycloak IDP]
        SMTP[Mailpit / SMTP]
    end

    API -->|HTTP| HTTP
    SHARED -.-> API
    SHARED -.-> CORE
    MODULES -->|persistência| PG
    CROSS -->|cache / sessões| REDIS
    CROSS -->|ficheiros| MINIO
    AUTH[Auth] -.->|OIDC / SSO opcional| KC
    REPORTS[Reports] -.->|jobs assíncronos| RABBIT
    NOTIFY[Notifications] -.->|email| SMTP
```

O frontend está documentado em detalhe no diagrama [frontend-architecture.png](./frontend-architecture.png).
O Keycloak é uma integração opcional para SSO; o login por email/password usa diretamente o módulo
de autenticação do backend. Redis é usado por cache e sessões, RabbitMQ por relatórios assíncronos,
MinIO por armazenamento S3 e Mailpit/SMTP por notificações de email.

## Auth Sequence

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Backend
    participant Database
    participant Redis

    User->>Frontend: Login (email + password)
    Frontend->>Backend: POST /api/auth/login
    Backend->>Database: Verify credentials (argon2)
    alt MFA enabled
        Backend-->>Frontend: { requiresMfa: true, sessionToken }
        Frontend->>User: Prompt MFA code
        User->>Frontend: Enter TOTP code
        Frontend->>Backend: POST /api/auth/mfa/verify
        Backend->>Backend: Validate TOTP code
    end
    Backend->>Database: Create session
    Backend->>Redis: Cache session
    Backend-->>Frontend: { accessToken, refreshToken }
    Frontend->>Frontend: Store tokens (Zustand)
    Frontend-->>User: Redirect to dashboard
    Note over Frontend,Redis: Subsequent requests include Bearer token
    Frontend->>Backend: GET /api/ (Authorization: Bearer ...)
    Backend->>Redis: Validate session
    Backend->>Database: Check RBAC permissions
    Backend-->>Frontend: Response
```

## Simplified ER Diagram

```mermaid
erDiagram
    User ||--o{ Employee : has
    Employee ||--o| Department : belongs_to
    Employee ||--o| JobTitle : has
    Department ||--o{ Employee : contains
    Team ||--o{ TeamMember : has
    Employee ||--o{ TeamMember : member_of
    Client ||--o{ Project : owns
    Project ||--o{ ProjectAllocation : allocates
    Employee ||--o{ ProjectAllocation : allocated_to
    Project ||--o{ TimesheetPeriod : tracks
    Employee ||--o{ TimesheetPeriod : submits
    TimesheetPeriod ||--o{ TimesheetEntry : contains
    Employee ||--o{ AbsenceRequest : requests
    AbsenceType ||--o{ AbsenceRequest : typed
    Employee ||--o{ LeaveBalance : has
    Employee ||--o{ ExpenseReport : creates
    ExpenseReport ||--o{ ExpenseItem : contains
    ExpenseCategory ||--o{ ExpenseItem : categorizes
    Employee ||--o{ Contract : has
    Contract ||--o{ ContractRenewal : renews
    User ||--o{ Session : has
    Role ||--o{ UserRole : grants
    UserRole ||--o{ User : assigns
    Role ||--o{ RolePermission : has
    Permission ||--o{ RolePermission : assigned_to
```

## ADRs (Architecture Decision Records)

| ID      | Decisão                                            | Contexto                                                    | Consequências                                           |
| ------- | -------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| ADR-001 | Monorepo com pnpm workspaces                       | Partilha de tipos entre backend e frontend                  | Dependências centralizadas, `@bridge351/srh-shared`     |
| ADR-002 | NestJS + TypeORM + PostgreSQL                      | Framework maduro, decorators, integração nativa com TypeORM | Módulos bem estruturados, migrations automáticas        |
| ADR-003 | React 18 + Vite + Tailwind                         | Performance, DX, ecossistema moderno                        | Build rápido (~8s), bundle otimizado                    |
| ADR-004 | JWT + Redis para sessões                           | Stateless por padrão, revogação via Redis                   | `accessToken` 15min, `refreshToken` 7d com rotação      |
| ADR-005 | Keycloak para SSO corporativo                      | Suporte a OIDC, SAML, federacao de identidade               | Opcional — login direto funciona sem Keycloak           |
| ADR-006 | RBAC com 4 roles (admin/manager/approver/employee) | Hierarquia simples, 30 permissoes base                      | Fácil de auditar, extensível via tabela `permissions`   |
| ADR-007 | MinIO para armazenamento de documentos             | Compatível com S3, auto-hospedado                           | Presigned URLs para upload/download seguro              |
| ADR-008 | RabbitMQ para relatorios assincronos               | Processamento em background de relatorios grandes           | Retorno 202 Accepted, polling de status                 |
| ADR-009 | Redis para cache (TTL 5min)                        | Analytics e dashboards com dados agregados                  | Cache decorator `@CacheResult`, invalidação manual      |
| ADR-010 | Notificacoes por polling (60s)                     | Simplicidade vs WebSocket/SSE                               | Endpoint `GET /notifications`, badge na sidebar         |
| ADR-011 | Swagger apenas em dev/staging                      | Seguranca — nao expor docs em producao                      | Condicional `NODE_ENV === 'development' \|\| 'staging'` |
| ADR-012 | Layout fixo para dashboard v1                      | Sem widgets arrastaveis                                     | Menos complexidade, sem persistencia de layout          |
| ADR-013 | Playwright headless sempre                         | Consistencia entre ambientes                                | `headless: true` na config, CI e local                  |
| ADR-014 | Portugues PT como lingua unica v1                  | Sem biblioteca i18n nesta fase                              | Todo o UI em PT, sem suporte multi-idioma               |
| ADR-015 | Testes e2e com `--runInBand` e `dropSchema`        | Base de dados limpa por execucao                            | Testes isolados, sequenciais, sem interferencia         |

---

_HR Suite — Bridge351 © 2026_

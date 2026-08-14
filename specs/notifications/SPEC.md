# Módulo 20 — Notificações & Alertas

## Objetivo

Gerir o envio de notificações automáticas e alertas para utilizadores em resposta a eventos do sistema.

## Entidades

### Notification

| Campo          | Tipo         | Notas                       |
| -------------- | ------------ | --------------------------- |
| id             | UUID         | PK                          |
| recipient_id   | UUID         | FK Employee                 |
| type           | VARCHAR(100) | ex: "absence.approved"      |
| title          | VARCHAR(200) | —                           |
| body           | TEXT         | —                           |
| channel        | ENUM         | email, in_app, push         |
| status         | ENUM         | pending, sent, failed, read |
| reference_id   | UUID         | Entidade relacionada        |
| reference_type | VARCHAR(50)  | —                           |
| sent_at        | TIMESTAMP    | —                           |
| read_at        | TIMESTAMP    | —                           |
| metadata       | JSONB        | Dados adicionais            |

## Canais de Notificação

| Canal               | Suporte v1     |
| ------------------- | -------------- |
| Email               | ✅ Obrigatório |
| In-App (sino/badge) | ✅ Obrigatório |
| Push (PWA)          | 🔄 Fase 2      |
| SMS                 | 🔄 Futuro      |

## Eventos que Geram Notificações

| Evento                       | Destinatário         | Canal          |
| ---------------------------- | -------------------- | -------------- |
| Ausência submetida           | Aprovador            | Email + In-App |
| Ausência aprovada/rejeitada  | Colaborador          | Email + In-App |
| Timesheet submetida          | Gestor               | Email + In-App |
| Timesheet aprovada/rejeitada | Colaborador          | Email + In-App |
| Despesa aprovada/rejeitada   | Colaborador          | Email + In-App |
| Contrato a expirar (N dias)  | Admin + Colaborador  | Email          |
| Projeto a terminar (N dias)  | Gestor               | Email + In-App |
| Alocação a terminar (N dias) | Gestor + Colaborador | Email          |
| Sobrealodação detectada      | Gestor               | Email + In-App |
| Submissão de horas em atraso | Colaborador          | Email + In-App |
| Fim de alocação sem projeto  | Gestor               | Email          |

## Regras de Negócio

| ID         | Regra                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| BR-NOT-001 | Notificações por email usam templates configuráveis com branding da empresa. |
| BR-NOT-002 | Utilizador pode configurar preferências de notificação (canal, frequência).  |
| BR-NOT-003 | Notificações in-app expiram após 90 dias.                                    |
| BR-NOT-004 | Falhas de envio de email devem ter retry automático (máximo 3 tentativas).   |
| BR-NOT-005 | Alertas de prazo são enviados diariamente pelo processo de scheduling.       |

## Requisitos Funcionais

| ID         | Descrição                                                                |
| ---------- | ------------------------------------------------------------------------ |
| RF-NOT-001 | O sistema deve enviar notificações por email para eventos críticos.      |
| RF-NOT-002 | O sistema deve disponibilizar centro de notificações in-app.             |
| RF-NOT-003 | O sistema deve suportar templates de email configuráveis.                |
| RF-NOT-004 | O sistema deve permitir ao utilizador gerir preferências de notificação. |
| RF-NOT-005 | O sistema deve gerir fila de envio com retry em caso de falha.           |

## APIs

- GET /api/v1/notifications (do utilizador autenticado)
- PUT /api/v1/notifications/:id/read
- PUT /api/v1/notifications/read-all
- GET /api/v1/notification-preferences
- PUT /api/v1/notification-preferences

## Tecnologia Recomendada

- Fila de mensagens: RabbitMQ ou Apache Kafka
- Email: SMTP configurável (Sendgrid/SES compatível)
- Templates: Handlebars ou MJML

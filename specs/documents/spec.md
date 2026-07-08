# Módulo 10 — Gestão Documental

## Objetivo

Disponibilizar repositório centralizado de documentos organizacionais e pessoais, com controlo de acessos, versões, templates e lixeira.

## Entidades

### Document

| Campo        | Tipo         | Validação                                                         | Notas                           |
| ------------ | ------------ | ----------------------------------------------------------------- | ------------------------------- |
| id           | UUID         | PK                                                                | —                               |
| name         | VARCHAR(200) | Obrigatório                                                       | —                               |
| category     | ENUM         | contract, id, training, absence, insurance, onboarding, equipment | —                               |
| storage_path | VARCHAR(512) | Obrigatório                                                       | Caminho no MinIO                |
| file_type    | VARCHAR(20)  | pdf, doc, docx, xls, xlsx, png, jpg, zip                          | —                               |
| size_bytes   | BIGINT       | —                                                                 | —                               |
| owner_id     | UUID         | FK Employee, Nullable                                             | Null = documento organizacional |
| is_public    | BOOLEAN      | Default false                                                     | Repositório público vs privado  |
| is_template  | BOOLEAN      | Default false                                                     | —                               |
| uploaded_by  | UUID         | FK Employee                                                       | —                               |
| deleted_at   | TIMESTAMP    | Nullable                                                          | Lixeira (soft delete)           |
| created_at   | TIMESTAMP    | Auto                                                              | —                               |

### DocumentPermission

| Campo        | Tipo    | Notas                |
| ------------ | ------- | -------------------- |
| document_id  | UUID    | FK Document          |
| entity_type  | ENUM    | employee, team, role |
| entity_id    | UUID    | —                    |
| can_read     | BOOLEAN | —                    |
| can_download | BOOLEAN | —                    |

## Formatos Suportados

PDF, DOC/DOCX, XLS/XLSX, PNG/JPG, ZIP

## Categorias Documentais

| Categoria    | Descrição                                     |
| ------------ | --------------------------------------------- |
| Contratos    | Contratos de trabalho                         |
| IDs          | Documentos de identificação                   |
| Formação     | Certificados e materiais                      |
| Ausências    | Justificativos de ausência                    |
| Seguros      | Apólices e declarações                        |
| Onboarding   | Documentos de integração                      |
| Equipamentos | Termos de responsabilidade (ficha de entrega) |

## Regras de Negócio

| ID         | Regra                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------- |
| BR-DOC-001 | Documentos na lixeira são eliminados definitivamente após 30 dias (configurável).            |
| BR-DOC-002 | Documentos GDPR sensíveis só são acessíveis com permissão explícita.                         |
| BR-DOC-003 | Templates são visíveis a todos os utilizadores autorizados para criação de novos documentos. |
| BR-DOC-004 | A distribuição massiva cria uma cópia do documento para cada destinatário.                   |
| BR-DOC-005 | Ficheiros armazenados no MinIO com acesso por URL assinada (pre-signed URL).                 |

## Requisitos Funcionais

| ID         | Descrição                                                                  |
| ---------- | -------------------------------------------------------------------------- |
| RF-DOC-001 | O sistema deve disponibilizar repositório público e privado de documentos. |
| RF-DOC-002 | O sistema deve suportar documentos associados a colaboradores.             |
| RF-DOC-003 | O sistema deve suportar templates reutilizáveis.                           |
| RF-DOC-004 | O sistema deve suportar distribuição massiva de documentos.                |
| RF-DOC-005 | O sistema deve disponibilizar lixeira com recuperação.                     |
| RF-DOC-006 | O sistema deve gerir permissões de acesso por documento.                   |

## Permissões

| Ação                    | Administrador | Gestor |  Colaborador  |
| ----------------------- | :-----------: | :----: | :-----------: |
| Upload de documentos    |      ✅       |   ✅   | ✅ (próprios) |
| Ver documentos públicos |      ✅       |   ✅   |      ✅       |
| Ver documentos privados |      ✅       | Equipa |   Próprios    |
| Distribuição massiva    |      ✅       |   ❌   |      ❌       |
| Gerir lixeira           |      ✅       |   ❌   |      ❌       |

## APIs

- GET /api/v1/documents
- POST /api/v1/documents (upload)
- GET /api/v1/documents/:id
- GET /api/v1/documents/:id/download (pre-signed URL)
- DELETE /api/v1/documents/:id (move para lixeira)
- POST /api/v1/documents/:id/restore
- POST /api/v1/documents/bulk-distribute

## Notas de Implementação

### Entregue

- **Entidade `Document`** com os campos da spec (`id`, `name`, `category`, `storage_path`, `file_type`, `size_bytes`, `owner_id`, `is_public`, `is_template`, `uploaded_by`, `deleted_at`, `created_at`) e relações `ManyToOne` com `Employee` para `owner` e `uploader`.
- **DTOs:** `UploadDocumentDto` com validação via `class-validator`.
- **`DocumentsService`** com operações de upload, listagem, obtenção, geração de presigned URL, lixeira (`moveToTrash`), restauração (`restore`) e eliminação definitiva (`purge`).
- **`DocumentsController`** com os endpoints:
  - `POST /documents` — upload multipart com `file` + metadados.
  - `GET /documents` — listar documentos, com filtros opcionais `category` e `ownerId`.
  - `GET /documents/:id` — obter documento por ID.
  - `GET /documents/:id/download` — redireciona para presigned URL do MinIO.
  - `DELETE /documents/:id` — move o documento para a lixeira (soft delete).
  - `POST /documents/:id/restore` — restaura documento da lixeira.
- **`StorageService`** global (`backend/src/storage/services/storage.service.ts`) baseado no AWS SDK para S3, configurado para MinIO, com `upload`, `getPresignedUrl` e `delete`.
- **Presigned URLs:** o download utiliza URL assinada gerada pelo `StorageService` (expiração configurável, omissão de 300s).
- **Lixeira/restore/purge:** soft delete via `deleted_at`; `purge` remove o objeto do MinIO e o registo da base de dados (não exposto ainda num endpoint).

### Simplificações/Decisões

- **Não foi implementada** a entidade `DocumentPermission`; permissões por documento, equipa ou role não estão contempladas nesta fase.
- **Não foi implementado** o endpoint de distribuição massiva (`POST /api/v1/documents/bulk-distribute`).
- **Não existe** controlo explícito de documentos GDPR sensíveis nem fluxo de permissões explícitas.
- **Não existe** versão automática da lixeira: purge e retenção de 30 dias não estão agendados; `purge` existe apenas no serviço para uso futuro.
- **Não existe** distinção em runtime entre repositório público e privado na listagem; filtros são meramente por `isPublic`/`ownerId` quando fornecidos.
- **Tipos de ficheiro** aceites no upload derivam da extensão do ficheiro enviado; validação de conteúdo MIME não está implementada.

### Testes

- Não existem testes unitários nem E2E para o módulo Documents nesta fase.

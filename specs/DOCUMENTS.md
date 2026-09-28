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
| storage_path | VARCHAR(512) | Obrigatório                                                       | Caminho no RustFS               |
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
| BR-DOC-005 | Ficheiros armazenados no RustFS com acesso por URL assinada (pre-signed URL).                |

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

**Bug corrigido em P-045 (`R-038`)**: `DocumentsController.upload()` passava `req.user.sub` (JWT, `User.id`) como `uploadedBy`, coluna com FK para `hr.employees(id)` (`Document.uploader`) — só funcionava para o admin; um colaborador real a fazer upload de um documento recebia uma violação de FK. Corrigido injetando o novo `EmployeeIdentityService` partilhado (`backend/src/auth/services/employee-identity.service.ts`). Verificado em runtime: Bruno Costa fez upload de um documento com sucesso (`uploadedBy` corretamente igual ao seu `Employee.id`).

### Entregue

- **Entidade `Document`** com os campos da spec (`id`, `name`, `category`, `storage_path`, `file_type`, `size_bytes`, `owner_id`, `is_public`, `is_template`, `uploaded_by`, `deleted_at`, `created_at`) e relações `ManyToOne` com `Employee` para `owner` e `uploader`.
- **DTOs:** `UploadDocumentDto` com validação via `class-validator`.
- **`DocumentsService`** com operações de upload, listagem, obtenção, geração de presigned URL, lixeira (`moveToTrash`), restauração (`restore`) e eliminação definitiva (`purge`).
- **`DocumentsController`** com os endpoints:
  - `POST /documents` — upload multipart com `file` + metadados.
  - `GET /documents` — listar documentos, com filtros opcionais `category` e `ownerId`.
  - `GET /documents/:id` — obter documento por ID.
  - `GET /documents/:id/download` — redireciona para presigned URL do RustFS.
  - `DELETE /documents/:id` — move o documento para a lixeira (soft delete).
  - `POST /documents/:id/restore` — restaura documento da lixeira.
- **`StorageService`** global (`backend/src/storage/services/storage.service.ts`) baseado no AWS SDK para S3, configurado para RustFS, com `upload`, `getPresignedUrl` e `delete`. Desde P-101, `getObjectStream` converte um objeto em falta (`NoSuchKey`) em `404 Ficheiro não disponível` (antes: 500) — aplica-se a Documents, Comunicados e Relatórios.
- **Presigned URLs:** o download utiliza URL assinada gerada pelo `StorageService` (expiração configurável, omissão de 300s).
- **Lixeira/restore/purge:** soft delete via `deleted_at`; `purge` remove o objeto do RustFS e o registo da base de dados (não exposto ainda num endpoint).

### Simplificações/Decisões

- **Não foi implementada** a entidade `DocumentPermission`; permissões por documento, equipa ou role não estão contempladas nesta fase.
- **Não foi implementado** o endpoint de distribuição massiva (`POST /api/v1/documents/bulk-distribute`).
- **Não existe** controlo explícito de documentos GDPR sensíveis nem fluxo de permissões explícitas.
- **P-054**: purga automática da lixeira implementada — `DocumentsService.purgeExpiredTrash()` (`@Cron('0 4 * * *')`, diário) usa `SystemSetting.documentsTrashRetentionDays` (por defeito 30 dias) para encontrar documentos com `deletedAt` além do prazo e chama o `purge()` já existente (que antes desta fase nunca tinha nenhum caminho de código a invocá-lo). Ver `specs/ADMIN.md` ("Wiring de Admin Settings ao runtime — Grupo C") para o detalhe completo.
- **Não existe** distinção em runtime entre repositório público e privado na listagem; filtros são meramente por `isPublic`/`ownerId` quando fornecidos.
- **Tipos de ficheiro** aceites no upload derivam da extensão do ficheiro enviado; validação de conteúdo MIME não está implementada.

### Testes

- `documents.service.spec.ts` cobre `upload`, `getFileStream`, `moveToTrash`, `restore`, `purge`, `purgeExpiredTrash` (P-054) e `findAll` (14 testes). Não existem testes E2E para o módulo.

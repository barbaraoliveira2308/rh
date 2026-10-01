# APP-ROLES — guia simples do que tens de fazer

| Campo    | Valor                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estado   | **Draft / em execução — FASE 1 CONCLUÍDA (Passos 1–3, 2026-10-01, fase P-105, migração `1842000000000`)** · verificação de fim de Fase 1 passou (lint 0 erros, `migration:run` + `seed`, `hr.roles` = 10 linhas) · **próxima: Fase 2 (Passos 4–5), inseparável da Fase 1** · 18/18 questões respondidas (§7 e §8); ordem: 1 → 2 → resto. Os Passos 10+ da Fase 5.2 escrevem-se no fim da Fase 4 |
| Decisões | 2026-09-29 — A ordem: **F1+F2 primeiro** · B F4: **fazer tudo agora** · C 31 rotas ambíguas: **ficam como estão** · D escopo: **entra agora** · E permissões: **não apagar** · E2 marcador: **não** · H mapa: **manter** · J 45 rotas: **não mexer** · F incoerências: **alinhar tudo** · G `Proj.`: **leitura + aprovações** · I testes: **sim** · K atribuição: **não atribuir ninguém**      |
| Data     | 2026-09-29                                                                                                                                                                                                                                                                                                                                                                                      |
| Âmbito   | **Apenas backend.** Frontend é fase seguinte.                                                                                                                                                                                                                                                                                                                                                   |
| Origem   | Meeting 09/2026 — proposta "App roles na nova aplicação de RH" (Bridge351)                                                                                                                                                                                                                                                                                                                      |
| Anterior | Versão anterior apagada pelo utilizador (2026-09-29) por estar desactualizada.                                                                                                                                                                                                                                                                                                                  |

---

## 0. O que muda, em 3 frases

1. Hoje o sistema tem **4 roles** (`admin`, `manager`, `approver`, `employee`).
2. A proposta pede **7 roles de negócio**: `director`, `people_manager`, `account_manager`,
   `hr`, `office_finance`, `system_admin` — e `employee` mantém-se.
3. Para **não partir nada em produção**, os 10 roles coexistem durante uma fase de transição:
   os novos são criados **às lado** dos antigos e as rotas passam a aceitar **ambos**.

**Não apagas nada do que já existe.** Só acrescentas.

---

## 1. Ponto de partida (verificado por mim em 2026-09-29, código real)

| Dado                                          | Valor                                                          |
| --------------------------------------------- | -------------------------------------------------------------- |
| Roles actuais                                 | 4 (`backend/src/rbac/enums/role.enum.ts`)                      |
| Controllers                                   | 26 (23 com `@Roles`, 3 sem: `auth`, `session-activity`, `app`) |
| Declarações `@Roles(...)`                     | **169** em 23 ficheiros                                        |
| Combinações distintas                         | **5** (tabela abaixo)                                          |
| Linhas `roles.includes(...)` (fora de testes) | **43** em 15 ficheiros                                         |
| Última migração                               | `1838000000000-BackfillAnnouncementAssetUrls.ts`               |
| `PermissionsGuard`                            | existe, **não está aplicado a nenhuma rota**                   |

As 5 combinações (isto é a chave para simplificar o Passo 6 — não são 169 edições diferentes):

| Nº  | `@Roles(...)` actual                   |
| --- | -------------------------------------- |
| 64  | `(ADMIN)`                              |
| 44  | `(ADMIN, MANAGER, APPROVER, EMPLOYEE)` |
| 43  | `(ADMIN, MANAGER)`                     |
| 11  | `(ADMIN, MANAGER, APPROVER)`           |
| 7   | `(ADMIN, MANAGER, EMPLOYEE)`           |
| 169 | **total**                              |

---

## 2. Mapa das fases

| Fase  | O que ganhas                                             | Passos | Depende de decisão tua? |
| ----- | -------------------------------------------------------- | ------ | ----------------------- |
| **1** | Os 6 roles novos **existem** e podem ser atribuídos      | 1–3    | Não                     |
| **2** | Atribuir um role novo **arrasta** o legado equivalente   | 4–5    | Não                     |
| **3** | As **rotas** passam a aceitar os roles novos             | 6      | **Sim — 5 grupos**      |
| **4** | As verificações deixam de ler o token velho e leem a BD  | 7–8    | Não (recomendada)       |
| **5** | Escopo `Linha`/`Proj.` + limpeza da camada de permissões | —      | **Sim — por definir**   |

> **Ordem importa.** Fases 1 e 2 são inseparáveis (faz as duas seguidas).
> **Não atribuas** `hr`, `director` ou `office_finance` a ninguém antes de terminares a Fase 3 —
> esses três **não arrastam** o `admin`, ficariam sem acesso a nada.

---

# FASE 1 — os 6 roles novos passam a existir

> Ao fim desta fase os roles já podem ser atribuídos, mas são **inertes** — nenhuma rota os pede
> ainda. Isto é esperado.

---

### PASSO 1

**Ficheiro:** `backend/src/rbac/enums/role.enum.ts`

**Antes:**

```ts
export enum RoleEnum {
  ADMIN = 'admin',
  MANAGER = 'manager',
  APPROVER = 'approver',
  EMPLOYEE = 'employee',
}
```

**Depois:**

```ts
export enum RoleEnum {
  // --- legados: serão removidos numa fase futura ---
  ADMIN = 'admin',
  MANAGER = 'manager',
  APPROVER = 'approver',

  // --- app roles novos ---
  DIRECTOR = 'director',
  PEOPLE_MANAGER = 'people_manager',
  ACCOUNT_MANAGER = 'account_manager',
  HR = 'hr',
  OFFICE_FINANCE = 'office_finance',
  SYSTEM_ADMIN = 'system_admin',

  // --- comum aos dois modelos: nunca é removido ---
  EMPLOYEE = 'employee',
}
```

**Motivo:** os valores do enum têm de ser **idênticos** aos da coluna `hr.roles.name`, porque o
`RolesGuard` compara strings (`roles.guard.ts:40`). Com este passo, `@Roles(RoleEnum.HR)` já
compila e o `AssignRoleDto` (`@IsEnum(RoleEnum)`) passa a aceitar os roles novos **sem mudares o
DTO**. Não muda comportamento nenhum: nenhuma rota os referencia ainda.

**Verificação:** `pnpm -r run lint` (tem de compilar sem erros).

---

### PASSO 2 — novo ficheiro

**Ficheiro:** `backend/src/database/migrations/1842000000000-AddAppRoles.ts`

> **Ajuste à spec (2026-10-01, decisão do utilizador):** o timestamp `1839000000000` previsto aqui
> já não está livre — passou a ser usado por `1839000000000-CreatePolicyAcceptances.ts` (há também
> `1840…` e `1841…`). Escolhido o seguinte livre, `1842000000000`, mantendo o resto da migração
> igual. A BD de dev tem ainda a linha `AddAppRoles1839000000000` da primeira execução (ficheiro
> entretanto perdido) — é inofensiva: o TypeORM identifica migrações pelo nome e não volta a
> executá-la.

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppRoles1842000000000 implements MigrationInterface {
  name = 'AddAppRoles1842000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO hr.roles (name, description, is_system) VALUES
         ('director',        'Director - toda a empresa', true),
         ('people_manager',  'People Manager - a sua linha hierarquica', true),
         ('account_manager', 'Account Manager - os seus clientes e projectos', true),
         ('hr',              'RH - admissoes, saidas, dados pessoais, GDPR', true),
         ('office_finance',  'Office and Finance - pagamentos, calendario, documentos', true),
         ('system_admin',    'System Admin - SSO, MFA, API keys, app roles', true)
       ON CONFLICT (name) DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM hr.user_roles ur
        USING hr.roles r
        WHERE ur.role_id = r.id
          AND r.name IN ('director', 'people_manager', 'account_manager',
                         'hr', 'office_finance', 'system_admin')`,
    );
    await queryRunner.query(
      `DELETE FROM hr.roles
        WHERE name IN ('director', 'people_manager', 'account_manager',
                       'hr', 'office_finance', 'system_admin')`,
    );
  }
}
```

**Motivo:** os roles têm de existir na BD **antes** de qualquer atribuição. `1842000000000` é o
timestamp seguinte livre à data desta execução (ver o ajuste acima: `1839000000000` já não estava
livre).
`hr.roles.name` é `UNIQUE`, por isso `ON CONFLICT DO NOTHING` torna a migração **idempotente**
(correr duas vezes não duplica nem falha). O `down` apaga primeiro `hr.user_roles` porque tem
chave estrangeira para `hr.roles` — sem isso o `DELETE` falhava.

**Nota:** `employee` **não** é criado — já existe. E não tens de registar o ficheiro em
lado nenhum: `data-source.ts:30` faz `migrations: [__dirname + '/migrations/*.{ts,js}']`.

**Verificação:** `cd backend && pnpm migration:run` → tens de ver
`AddAppRoles1842000000000` na tabela `migrations`.

---

### PASSO 3

**Ficheiro:** `backend/src/database/seeds/rbac.seed.ts` (linhas 75–78)

**Antes:**

```ts
const existingRoles = await roleRepo.find();
if (existingRoles.length > 0) {
  return;
}
```

**Depois:**

```ts
const existingAdminRole = await roleRepo.findOneBy({ name: 'admin' });
if (existingAdminRole) {
  return;
}
```

**Motivo:** a guarda actual diz "_se já existirem roles quaisquer, paro tudo_". A migração do
Passo 2 acaba de **criar 6 roles**, por isso numa base de dados **nova** a ordem é
`migration:run` → `seed`: a migração mete 6 linhas em `hr.roles`, o seed vê `length > 0` e faz
`return` — e o **utilizador `admin@hr-suite.local`, as permissões e o employee nunca são criados**.

A guarda correcta é perguntar pela coisa que o seed realmente garante: o role `admin`.
Assim:

- base **nova** (migração primeiro): `admin` não existe → o seed corre inteiro ✅
- base **já existente**: `admin` já lá está → o seed pára, exactamente como hoje ✅

**Verificação:** `cd backend && pnpm seed` → sem erro.

---

### ✅ Verificação de fim de Fase 1

```bash
pnpm -r run lint
cd backend && pnpm migration:run && pnpm seed
```

Consulta a BD: `SELECT name FROM hr.roles ORDER BY name;` deve devolver **10 linhas** —
`account_manager, admin, approver, director, employee, hr, manager, office_finance, people_manager,
system_admin`.

---

# FASE 2 — atribuir um role novo arrasta o legado

> Sem esta fase, o primeiro utilizador com `system_admin` **não teria acesso a nada**: as rotas
> actuais continuam a pedir `admin`, e `system_admin` ainda não está em lado nenhum.

---

### PASSO 4 — novo ficheiro

**Ficheiro:** `backend/src/rbac/role-equivalence.ts`

```ts
/**
 * Arrasto legado -> app role.
 *
 * Atribuir a chave arrasta automaticamente o valor, salvo se o valor ja
 * esta atribuido. Se a chave nao tem entrada, nao arrasta nada.
 *
 *   system_admin    -> admin     (sinonimo: "o system_admin e o admin")
 *   people_manager  -> manager
 *   account_manager -> manager
 *   director        -> (nenhum)  role distinto: acesso vem so das rotas
 *   hr              -> (nenhum)  idem
 *   office_finance  -> (nenhum)  idem
 *   employee        -> (nenhum)  comum aos dois modelos
 */
export const LEGACY_EQUIVALENT: Readonly<Record<string, string | undefined>> = {
  system_admin: 'admin',
  people_manager: 'manager',
  account_manager: 'manager',
  director: undefined,
  hr: undefined,
  office_finance: undefined,
  employee: undefined,
  // Chaves legadas: nada a arrastar
  admin: undefined,
  manager: undefined,
  approver: undefined,
};
```

**Motivo:** o arrasto decide-se **no momento da atribuição**, na BD — não em cada pedido. Um mapa
puro é testável isoladamente e fácil de revogar. Está tipado com `string` porque
`assignRoleByName` recebe `roleName: string` vindo do DTO; usar `RoleEnum` obrigar a casts.

---

### PASSO 5

**Ficheiro:** `backend/src/rbac/services/rbac.service.ts` (linhas 55–63)

**Antes:**

```ts
async assignRoleByName(userId: string, roleName: string, assignedBy: string): Promise<void> {
  const role = await this.roleRepository.findOneBy({ name: roleName });

  if (!role) {
    throw new NotFoundException('Perfil não encontrado');
  }

  await this.assignRole(userId, role.id, assignedBy);
}
```

**Depois:**

```ts
async assignRoleByName(userId: string, roleName: string, assignedBy: string): Promise<void> {
  const role = await this.roleRepository.findOneBy({ name: roleName });

  if (!role) {
    throw new NotFoundException('Perfil não encontrado');
  }

  await this.assignRole(userId, role.id, assignedBy);

  const legacyName = LEGACY_EQUIVALENT[roleName];
  if (legacyName && legacyName !== roleName) {
    const legacyRole = await this.roleRepository.findOneBy({ name: legacyName });
    if (!legacyRole) return;

    const alreadyHas = await this.userRoleRepository.findOne({
      where: { userId, roleId: legacyRole.id },
    });
    if (alreadyHas) return;

    await this.userRoleRepository.save(
      this.userRoleRepository.create({
        userId,
        roleId: legacyRole.id,
        assignedBy,
      }),
    );
  }
}
```

E acrescenta no topo do ficheiro:

```ts
import { LEGACY_EQUIVALENT } from '../role-equivalence';
```

**Motivo:**

| Escolha                            | Porquê                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| Arrasto **depois** de `assignRole` | se o role principal falhar (não existe), não se cria lixo legado               |
| `if (alreadyHas) return;`          | **idempotência** — atribuir `system_admin` a quem já é `admin` não pode falhar |
| `if (!legacyRole) return;`         | defensivo — se a BD não tiver `admin`, a atribuição principal não rebenta      |
| Só em `assignRoleByName`           | é o caminho público (o controller); `assignRole` (por id) é uso interno        |
| `revokeRoleByName` **não** muda    | sem cascata — quem revoga tem de revogar os dois explicitamente                |

**Efeito:** `POST /users/:employeeId/roles { role: "system_admin" }` grava `system_admin` **e**
`admin`. Quem recebe `hr` **não** ganha `admin` — o acesso dele vem das rotas (Fase 3).

**Verificação:** `pnpm -r run lint && cd backend && pnpm test`.

---

# FASE 3 — as rotas passam a aceitar os roles novos

> É aqui que `director`, `hr` e `office_finance` começam a ter acesso.
> **Antes de atribuíres esses três roles a alguém, termina esta fase.**

### PASSO 6 — acrescentar os roles novos às 93 rotas da §3.1

**O que fazes:** em cada uma das linhas `@Roles` listadas na tabela §3.1, acrescentas os roles que
a matriz lhe dá. Não crias nem apagas rotas — só acrescentas enums ao array.

**Verificação:** as duas contagens da §"✅ Verificação de fim de Fase 3" (169 e 64) e a lista de 45
linhas da §3.2 intacta.

### Regra única

> Acrescenta um role novo **apenas** quando a matriz da proposta lhe dá
> `Todos` / `Ver todos` / `Ver` / `Empresa` nessa área.
> **`ADMIN` nunca é removido** — senão qualquer `admin` actual ficava bloqueado de imediato.
> Recurso **sem linha na matriz** → **não se mexe**.

### Legenda

| Sigla | Enum                      | Estado   |
| ----- | ------------------------- | -------- |
| `A`   | `RoleEnum.ADMIN`          | legado   |
| `M`   | `RoleEnum.MANAGER`        | legado   |
| `P`   | `RoleEnum.APPROVER`       | legado   |
| `E`   | `RoleEnum.EMPLOYEE`       | comum    |
| `D`   | `RoleEnum.DIRECTOR`       | **novo** |
| `H`   | `RoleEnum.HR`             | **novo** |
| `F`   | `RoleEnum.OFFICE_FINANCE` | **novo** |
| `S`   | `RoleEnum.SYSTEM_ADMIN`   | **novo** |

`PEOPLE_MANAGER` e `ACCOUNT_MANAGER` **nunca** são acrescentados — arrastam `manager` (Passo 4)
e por isso já passam.

---

### Exemplo completo, para perceberes o formato

**Ficheiro:** `backend/src/absences/absences.controller.ts:46`

**Antes:**

```ts
@Get('absences')
@Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
```

**Depois:**

```ts
@Get('absences')
@Roles(
  RoleEnum.ADMIN,
  RoleEnum.MANAGER,
  RoleEnum.APPROVER,
  RoleEnum.EMPLOYEE,
  RoleEnum.DIRECTOR,
  RoleEnum.HR,
)
```

**Motivo:** a linha _Aprovar ausências_ da matriz dá **HR = Todos** e **Director = Todos**. Hoje
o `hr` nem sequer passa pelo guard nesta rota.

---

### 3.1 Grupos para alterar JÁ — leitura directa da matriz (93 rotas)

| Ficheiro                              | Linhas `@Roles`                                                                                | Depois (acrescenta) | Linha da matriz                 |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------- | ------------------------------- |
| `absences/absences.controller.ts`     | 46, 81, 92, 100, 108, 130, 145, 160, 171, 195                                                  | `D, H` (todas)      | Aprovar ausências               |
| `timesheets/timesheets.controller.ts` | 48, 83, 125, 150, 165, 176, 191, 206                                                           | `D, H` (todas)      | Aprovar timesheets              |
| `training/training.controller.ts`     | 49, 65, 80, 102, 112, 121, 131, 144, 152, 159                                                  | `D, H` (todas)      | Formações e avaliações          |
| `contracts/contracts.controller.ts`   | 47, 62, 73, 82, 91, 99, 108                                                                    | `D, H` (todas)      | Contratos / Valor dos contratos |
| `clients/clients.controller.ts`       | 31, 39, 47, 55, 63, 71                                                                         | `D` (todas)         | Clientes, projectos, alocações  |
| `projects/projects.controller.ts`     | 39, 51, 59, 67, 89, 97, 105, 113, 124, 136                                                     | `D` (todas)         | Clientes, projectos, alocações  |
| `gdpr/gdpr.controller.ts`             | **todas as 16** (80, 92, 110, 120, 130, 137, 145, 155, 162, 170, 180, 187, 194, 207, 219, 226) | `H`                 | Tratar pedidos GDPR             |
| `documents/documents.controller.ts`   | 41, 57, 70, 79, 95, 104                                                                        | `D, H, F` (todas)   | Documentos privados             |
| `audit/audit.controller.ts`           | 23 (classe)                                                                                    | `D, S`              | Audit log                       |
| `reports/reports.controller.ts`       | 146 (`GET /reports/audit`)                                                                     | `D, S`              | Audit log                       |
| `analytics/analytics.controller.ts`   | 184, 210, 245, 269 (os 4 `financials`)                                                         | `D`                 | Financeiro, margens, tarifas    |
| `admin/admin.controller.ts`           | 51, 60 (`settings` GET/PUT)                                                                    | `S`                 | SSO, MFA, API keys, app roles   |
| `admin/admin.controller.ts`           | 97 (`POST /admin/users`)                                                                       | `H`                 | Admitir e desativar             |
| `users/users.controller.ts`           | 72 (`POST /users`), 191 (`DELETE /users/:id`)                                                  | `H`                 | Admitir e desativar             |
| `users/users.controller.ts`           | 109, 118 (atribuir/revoke roles)                                                               | `S`                 | SSO, MFA, app roles             |
| `users/users.controller.ts`           | 54, 64 (`GET users`, `GET users/:id`), 81 (`PATCH`)                                            | `D, H`              | Ver e editar perfis             |
| `expenses/expenses.controller.ts`     | 200, 215 (approve/reject)                                                                      | `D, F`              | Aprovar despesas (**HR = —**)   |
| `expenses/expenses.controller.ts`     | 230, 238 (send-for-payment, mark-paid)                                                         | `F`                 | Pagar despesas                  |

**Nota importante:** em _Aprovar despesas_ a matriz dá ao **HR = `—`**, por isso `H` **não** entra
nas linhas 200/215 — ao contrário de ausências e timesheets.

---

### 3.2 Grupos SEM linha na matriz — ✅ MERCADOS, **não se mexe** (45 rotas)

> **QUESTÃO J = (a), confirmado a 2026-09-29.** Estas 45 rotas ficam exactamente como estão hoje
> (só `A`/`M`/`P`/`E`). A lista está **com a linha exacta de cada `@Roles`**, para que a
> verificação de fim de Fase 3 as consiga listar de uma vez.

| Ficheiro                                    | Linhas `@Roles`                                                     |     Nº |
| ------------------------------------------- | ------------------------------------------------------------------- | -----: |
| `announcements/announcements.controller.ts` | 38 (classe)                                                         |      1 |
| `calendar/calendar.controller.ts`           | 45, 57 (rede) · 88, 97, 105, 113, 125, 136, 144, 156, 164 (`ADMIN`) |     11 |
| `capacity/capacity.controller.ts`           | 18 (classe)                                                         |      1 |
| `helpdesk/helpdesk.controller.ts`           | 76, 101, 109, 137                                                   |      4 |
| `notifications/notifications.controller.ts` | 38, 55, 66, 76, 86, 96                                              |      6 |
| `opportunities/opportunities.controller.ts` | 13 (classe)                                                         |      1 |
| `policies/policies.controller.ts`           | 59, 66, 75, 82, 90                                                  |      5 |
| `teams/teams.controller.ts`                 | 38, 46, 54, 62, 84, 92, 114, 136                                    |      8 |
| `workflow/workflow.controller.ts`           | 38, 51, 62, 76, 90                                                  |      5 |
| `expenses/expenses.controller.ts`           | 80, 163, 183 (submeter despesa — _todos submetem as suas_)          |      3 |
| **total**                                   |                                                                     | **45** |

**Motivo de não mexer:** a proposta não tem linha para estes módulos. Não decidir é mais seguro
do que inventar — se deres acesso a quem não deve, é difícil de detetar.

**Verificação (depois do Passo 6):** as 45 linhas acima têm de continuar a **não** conter nenhum
role novo. Podes confirmar com um grep por cada linha da tabela.

---

### 3.3 Grupos AMBÍGUOS — **precisam da tua decisão** (31 rotas)

Estas **não** têm leitura directa na matriz. Ver secção 7, QUESTÕES C a E.

| Grupo                                | Ficheiro:linhas                                                                               |  Nº |
| ------------------------------------ | --------------------------------------------------------------------------------------------- | --: |
| Legal entities                       | `admin/admin.controller.ts:70, 79, 88`                                                        |   3 |
| Departamentos e job-titles           | `users/users.controller.ts:134, 148, 156, 164, 172`                                           |   5 |
| Organograma                          | `users/users.controller.ts:183`                                                               |   1 |
| Ver despesas / exportar / categorias | `expenses/expenses.controller.ts:49, 90, 125, 133, 141`                                       |   5 |
| Analytics de ocupação/capacidade     | `analytics/analytics.controller.ts:127, 143, 157, 170`                                        |   4 |
| Relatórios (exceto audit)            | `reports/reports.controller.ts:59, 88, 117, 176, 206, 227, 249, 275, 283, 294, 302, 310, 321` |  13 |

**Recomendação:** deixa estas **como estão** até responderes às questões. Não mudam nada por
esperarem — e mudá-las errado abre acesso indevido.

---

### ✅ Verificação de fim de Fase 3

```bash
# as 169 continuam a ser 169 (nenhuma rota acrescentada nem removida)
grep -rn "@Roles(" backend/src --include=*.controller.ts | wc -l

# nenhum ADMIN foi removido (tem de continuar a ser 64)
grep -rn "@Roles(RoleEnum.ADMIN)$" backend/src --include=*.controller.ts | wc -l

pnpm -r run lint
```

---

# FASE 4 — as verificações deixam de ler o token velho

> Podes saltar esta fase no primeiro dia. Mas sem ela, `hr`, `director` e `office_finance`
> passam pelo guard e depois são **tratados como `employee` lá dentro**.

### O problema (G4)

O `RolesGuard` vai à **BD** a cada pedido. Mas lá dentro dos handlers, as verificações manuais
leem `user.roles`, que vem do **token** — e o token só é relido no login/refresh (15 min).

**Cenário:** retiras `manager` a alguém → o guard nega as rotas `@Roles(MANAGER)` de imediato,
mas a pessoa continua a entrar nas 44 rotas `@Roles(A, M, P, E)` e
`absences.controller.ts:57-60` (que lê o token) continua a devolver `true` → vê as ausências de
toda a equipa até ao refresh.

---

### PASSO 7 — novo ficheiro

**Ficheiro:** `backend/src/rbac/rbac-roles.ts`

```ts
import { Request } from 'express';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleEnum } from './enums/role.enum';

/** Roles resolvidos uma unica vez por pedido; preenchidos por RbacService.resolveRoles(). */
export interface RbacRequest extends Request {
  user?: JwtPayload;
  rbacRoles?: string[];
}

/** Ponto unico de consulta das verificacoes de role. */
export function hasRole(roles: readonly string[], ...candidates: string[]): boolean {
  return candidates.some((candidate) => roles.includes(candidate));
}

export function hasAdmin(roles: readonly string[]): boolean {
  return hasRole(roles, RoleEnum.ADMIN);
}

export function hasManager(roles: readonly string[]): boolean {
  return hasRole(roles, RoleEnum.MANAGER);
}

export function hasAdminOrManager(roles: readonly string[]): boolean {
  return hasRole(roles, RoleEnum.ADMIN, RoleEnum.MANAGER);
}

export function hasAdminOrManagerOrApprover(roles: readonly string[]): boolean {
  return hasRole(roles, RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER);
}
```

**Motivo:** interface **nova** e não mexer no `JwtPayload` — o payload vem do token e os roles da
BD podem divergir dele; misturar os dois no mesmo objecto é exactamente o problema que estamos a
resolver. Os predicados dão **uma única definição** para as expressões repetidas.

---

### PASSO 8 — duas alterações em `backend/src/rbac/services/rbac.service.ts`

**8a — acrescenta o método:**

```ts
async resolveRoles(request: RbacRequest): Promise<string[]> {
  if (request.rbacRoles) {
    return request.rbacRoles;
  }

  const user = request.user as JwtPayload | undefined;
  if (!user?.sub) {
    throw new NotFoundException('Utilizador não autenticado');
  }

  const userRoles = await this.userRoleRepository.find({
    where: { userId: user.sub },
    relations: { role: true },
  });

  const names = userRoles.map((ur) => ur.role.name);
  request.rbacRoles = names;

  return names;
}
```

**Motivo:** resolve **uma vez por pedido** e cacheia no próprio `request`. No máximo 1 query —
e 0 se ninguém precisar. `RbacService` é de um módulo `@Global()`, por isso qualquer controller
já o tem injetado sem importar módulo nenhum.

**8b — faz o `RolesGuard` usar a mesma fonte.**

**Ficheiro:** `backend/src/rbac/guards/roles.guard.ts`

**Antes (linhas 27–40):**

```ts
const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
const user = request.user;

if (!user) {
  throw new ForbiddenException('Utilizador não autenticado');
}

const userRoles = await this.userRoleRepository.find({
  where: { userId: user.sub },
  relations: { role: true },
});

const userRoleNames = userRoles.map((ur) => ur.role.name);
const hasRole = requiredRoles.some((role) => userRoleNames.includes(role));
```

**Depois:**

```ts
const request = context.switchToHttp().getRequest<RbacRequest>();
const user = request.user;

if (!user) {
  throw new ForbiddenException('Utilizador não autenticado');
}

const userRoleNames = await this.rbacService.resolveRoles(request);
const hasRole = requiredRoles.some((role) => userRoleNames.includes(role));
```

E no constructor troca o repositório pelo serviço:

**Antes:**

```ts
constructor(
  private readonly reflector: Reflector,
  @InjectRepository(UserRole)
  private readonly userRoleRepository: Repository<UserRole>,
) {}
```

**Depois:**

```ts
constructor(
  private readonly reflector: Reflector,
  private readonly rbacService: RbacService,
) {}
```

**Motivo:** uma **única fonte de verdade** por pedido. Com o Passo 8a+8b, o guard e as 43
verificações manuais leem **o mesmo array**, vindo da BD.

---

### PASSO 9 — trocar as 43 verificações (15 ficheiros)

**Antes** (exemplo real — `backend/src/absences/absences.controller.ts:56-60`):

```ts
const user = req.user as JwtPayload;
const isAdminOrManager =
  user.roles.includes(RoleEnum.ADMIN) ||
  user.roles.includes(RoleEnum.MANAGER) ||
  user.roles.includes(RoleEnum.APPROVER);
```

**Depois:**

```ts
const roles = await this.rbacService.resolveRoles(req as RbacRequest);
const isAdminOrManager = hasAdminOrManagerOrApprover(roles);
```

**Motivo:** corrige o G4 — esta linha hoje lê a cópia do token (até 15 min desactualizada)
enquanto o guard lê a BD. Se revogares `manager` a alguém, ele continua a ver as ausências de
toda a equipa até ao refresh.

**Os 15 ficheiros** (contagem verificada hoje):

| Ficheiro                                  | Linhas |
| ----------------------------------------- | -----: |
| `absences/absences.controller.ts`         |      9 |
| `timesheets/timesheets.controller.ts`     |      6 |
| `expenses/expenses.controller.ts`         |      5 |
| `helpdesk/helpdesk.controller.ts`         |      5 |
| `teams/teams.controller.ts`               |      3 |
| `reports/reports.controller.ts`           |      2 |
| `reports/services/reports.service.ts`     |      2 |
| `users/users.controller.ts`               |      2 |
| `documents/services/documents.service.ts` |      2 |
| `contracts/contracts.controller.ts`       |      2 |
| `training/training.controller.ts`         |      1 |
| `policies/policies.controller.ts`         |      1 |
| `auth/services/auth.service.ts`           |      1 |
| `gdpr/gdpr.controller.ts`                 |      1 |
| `projects/projects.controller.ts`         |      1 |

**Duas excepções:**

- `auth/services/auth.service.ts:694` (`if (!roles.includes('admin'))`) — **não mexer**: já recebe
  os roles da BD.
- Nas funções que **já recebem `roles: string[]` como parâmetro** (`documents.service`,
  `reports.service`, `helpdesk.service`) — só muda quem calcula o array (o controller), não a
  função.

**Verificação:** `grep -rn "user.roles.includes" backend/src --include=*.ts | grep -v spec` →
tem de devolver **0**.

---

# FASE 5 — escopo `Linha`/`Proj.` + camada de permissões

> **5.1 (camada de permissões)** — já decidido e **não exige trabalho nenhum**: não se apaga nada.
> Só fica a lista de remoção para o futuro.
> **5.2 (escopo `Linha`/`Proj.`)** — decisões tomadas, **Passos 10+ por escrever**: entram aqui ao
> fim da Fase 4, quando já estiveres com o contexto todo do código.

## 5.1 Camada de permissões — ✅ DECIDIDO (2026-09-29): **não apagar agora**

> **Motivo do utilizador:** o projecto não é dele e é novo no projecto — não quer mexer em pontos
> que não são necessários para o objectivo desta fase.

Em vez de apagar, deixa-se **documentado para ser fácil de apagar no futuro**. Nada disto interfere
com o que está nos passos 1–9: `PermissionsGuard` está registado mas aplicado a **0** rotas e
`@Permissions(` tem **0** ocorrências em `backend/src`.

> **QUESTÃO E2 = (a), confirmado a 2026-09-29:** **nenhum marcador no código.** Zero comentários
> novos, zero `@deprecated`. Esta secção é o único sítio a consultar — quem for apagar no futuro
> começa por aqui.

### Lista de remoção exacta (para quem for apagar no futuro)

| #   | O que remover                                                                                                    | Onde                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | Guard nunca usado                                                                                                | `rbac/guards/permissions.guard.ts` (apagar ficheiro)                                                         |
| 2   | Decorator nunca usado                                                                                            | `rbac/decorators/permissions.decorator.ts` (apagar ficheiro)                                                 |
| 3   | Entidade                                                                                                         | `auth/entities/permission.entity.ts` (apagar ficheiro)                                                       |
| 4   | Entidade                                                                                                         | `auth/entities/role-permission.entity.ts` (apagar ficheiro)                                                  |
| 5   | Constante                                                                                                        | `rbac/constants.ts:2` (`PERMISSIONS_KEY`)                                                                    |
| 6   | Import, `forFeature`, provider, export                                                                           | `rbac/rbac.module.ts:4, 7, 9, 13, 14, 15`                                                                    |
| 7   | Re-exports                                                                                                       | `rbac/index.ts:4,6` · `rbac/guards/index.ts:2` · `rbac/decorators/index.ts:2` · `auth/entities/index.ts:4,5` |
| 8   | Relação `rolePermissions`                                                                                        | `auth/entities/role.entity.ts:2, 22-23`                                                                      |
| 9   | Lista de entidades do módulo                                                                                     | `auth/auth.module.ts:30-31, 56-57`                                                                           |
| 10  | Imports, repositório injectado, `getUserPermissions()` (75-101), `hasPermission()` (112-137)                     | `rbac/services/rbac.service.ts:5, 7, 16-17`                                                                  |
| 11  | `RESOURCES`, `ACTIONS`, `Resource`, `Action`, `RoleName`, `rolePermissionsMap`, repositórios e bloco de inserção | `database/seeds/rbac.seed.ts:4-5, 10-65, 69-70, 92-131`                                                      |
| 12  | Testes de `getUserPermissions`/`hasPermission`                                                                   | `rbac/services/rbac.service.spec.ts`                                                                         |
| 13  | **Nova migração** `...-DropPermissionTables.ts`                                                                  | larga `hr.role_permissions` primeiro (tem FK) e depois `hr.permissions`                                      |

**Nunca tocar:**

- `users.controller.ts:119` — `@Audit('PermissionChanged', 'User')` é um **nome de acção de
  auditoria**, não a entidade `Permission`.
- `1720000000000-CreateAuthTables.ts` — migração histórica.

**Verificação de que nada está ligado:**
`grep -rn "PermissionsGuard\|@Permissions(" backend/src` → só devolve `rbac.module.ts`,
`rbac/index.ts` e o próprio ficheiro.

---

## 5.2 Escopo `Linha` / `Proj.` — ✅ DECIDIDO (2026-09-29): **entra agora**

A matriz usa qualificadores (`Próprio`, `Linha`, `Proj.`, `Empresa`) que o `@Roles` sozinho não
resolve. Isto é **a parte mais grande de todo o projecto** — os passos concretos serão escritos no
final da Fase 4 (não estão neste documento ainda).

### O que é hoje (estado verificado no código)

Não existe um "serviço de escopo" único. O modelo é **binário e reimplementado à mão em cada
controller**: `isAdminOrManager ? verTudo : verSóOPróprio`.

Decisões de escopo encontradas: **~15 em 10 módulos**.

| Módulo                                                                          | Como decide hoje                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `absences.controller.ts`                                                        | `isAdminOrManager` em `findAll`; `GET /calendar` **não tem check nenhum** |
| `expenses.controller.ts`                                                        | `isAdminOrManager`                                                        |
| `timesheets.controller.ts`                                                      | `roles.includes([ADMIN, MANAGER, APPROVER])` (inclui APPROVER!)           |
| `contracts.controller.ts`                                                       | `isAdmin`                                                                 |
| `users.controller.ts`                                                           | `isAdmin` + `ensureSelfOrAdmin`                                           |
| `documents.controller.ts`                                                       | `resolveVisibleOwnerIds`                                                  |
| `reports.service.ts`                                                            | `resolveEmployeeScope` → manager vê **só nível 1**                        |
| `teams.controller.ts`                                                           | `isAdmin` + `isTeamLeader`                                                |
| `projects.controller.ts`                                                        | `isAdmin` + `isProjectManager` (só em 2 rotas)                            |
| `training.controller.ts` / `helpdesk.controller.ts` / `analytics.controller.ts` | `isAdmin`                                                                 |

### O que falta construir

1. **Primitiva `Linha`** — boa notícia: **já existe** `EmployeeRepository.findWithHierarchy()`
   (devolve a árvore completa incluindo o próprio) e está **morto** (nobody calls it). É
   exactamente a base: bastará chamar + remover o próprio do resultado.
2. **Primitiva `Proj.`** — existe `ProjectsService.isProjectManager` (boolean, 2 chamadas);
   **não** existe "devolve-me os projectos que eu gere".
3. **Aplicar em ~15 locais** — cada um passa de "tudo ou nada" para "próprio / linha / projeto /
   tudo", conforme a matriz.
4. **Resolver 6 incoerências** onde hoje a profundidade diverge entre módulos (ex.: `ReportsService`
   dá só directos, `DocumentsService` idem, mas `UsersService.isManagerOfEmployee` dá a cadeia
   inteira; `absences` só dá _aprovação_ ao directo enquanto `timesheets` também).
5. **Testes** — hoje existem **0 testes de controller**; os testes de scoping são a maior lacuna.

### ✅ QUESTÃO F — incoerências: **(a) alinhar tudo** (confirmado a 2026-09-29)

Decisão: em **todos** os ~15 locais passa a existir a mesma regra — `Linha` = directos **e**
indirectos — e cada módulo deixa de inventar a sua. Isto resolve de uma vez as 6 divergências
actuais (`reports`/`documents` só davam directos; `users` dava a cadeia toda; `absences` e
`timesheets` aprovavam em profundidades diferentes; `GET /absences/calendar` não tinha verificação
nenhuma).

A lista dos ~15 locais e os passos concretos serão escritos aqui ao fim da Fase 4.

### ✅ QUESTÃO G — escopo `Proj.`: **(b) leitura + aprovações** (confirmado a 2026-09-29)

O gestor de um projecto passa a **ver e aprovar** ausências, timesheets e despesas de quem está
alocado aos projectos que gere, **acrescentando-se** a quem já aprova por hierarquia (ninguém perde
o direito de aprovar que tem hoje).

Código que vai ter de mudar:

| O quê                              | Onde hoje                                                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Regra de aprovação de ausências    | `absences/services/absences.service.ts:524-536` (admin passa, senão só `employee.managerId === approverId`) |
| Regra de aprovação de timesheets   | `timesheets/services/timesheets.service.ts:377` (igual)                                                     |
| Regra de aprovação de despesas     | `expenses/services/expenses.service.ts:541` (igual)                                                         |
| Atribuição da tarefa + notificação | `workflow/services/workflow.service.ts:249-273` (manda para `employee.managerId`)                           |
| **Falta criar**                    | "dá-me as pessoas dos projectos que eu gere" (baseado em `project_allocations`)                             |

Os pontos de detalhe **L, M, N, O** estão decididos e registados em §7 e §8:

- **L** — conta **qualquer** `project_allocations`, sem filtro de datas.
- **M** — o `account_manager` vê **só** as pessoas dos seus projectos (não tudo, apesar do arrasto
  de `manager`).
- **N** — `Proj.` só em **ausências, timesheets e despesas**.
- **O** — `workflow` e `notifications` **não** são tocados: a tarefa continua do chefe hierárquico.

---

## 6. Verificação final

```bash
pnpm -r run lint          # sem erros (AGENTS.md, regra 9)
pnpm -r run test          # nenhum teste pode deixar de passar
cd backend && pnpm migration:run && pnpm seed
```

Critérios mínimos:

- [ ] `hr.roles` tem **10** linhas.
- [ ] A migração `AddAppRoles1842000000000` corre duas vezes sem falhar nem duplicar.
- [ ] Ambiente novo (`migration:run` + `seed`) continua a criar o `admin@hr-suite.local`.
- [ ] Atribuir `system_admin` grava também `admin`; atribuir `director` **não** grava `admin`.
- [ ] As 169 rotas `@Roles` continuam a ser 169; os 64 `@Roles(RoleEnum.ADMIN)` puros continuam 64.
- [ ] As **45** rotas marcadas na secção 3.2 continuam **sem** nenhum role novo.
- [ ] `grep "user.roles.includes"` em `backend/src` (fora testes) devolve 0.
- [ ] `pnpm -r run test` passa, **incluindo os testes novos** (QUESTÃO Q = b): arrasto de roles,
      `resolveRoles`, escopo `Linha`/`Proj.` e os testes de controller dos módulos alterados.

---

## 7. Questões — estado

> **Respondidas em 2026-09-29: as 18 — A, B, C, D, E, E2, F, G, H, I, J, K, L, M, N, O, P, Q.**
> **Nenhuma questão em aberto**: o guia está fechado e o Passo 1 pode começar.
> (Os commits faz o utilizador — regra 8 suspensa por decisão dele.)

**✅ QUESTÃO A — Ordem. DECIDIDO: (a) Fases 1 e 2 primeiro**, e só depois o resto.
**✅ QUESTÃO B — Fase 4. DECIDIDO: fazer tudo agora.** As 43 verificações entram na mesma ronda.
**✅ QUESTÃO C — 31 rotas ambíguas (secção 3.3). DECIDIDO: (a) ficam como estão.**
Não se mexe nada na secção 3.3 até haver decisão de negócio nova. Mudá-las errado abriria acesso
indevido; deixá-las não muda nada.
**✅ QUESTÃO D — Escopo `Linha`/`Proj.`. DECIDIDO: entra agora.** Ver a dimensão real na secção 5.2.
**✅ QUESTÃO E — Camada de permissões. DECIDIDO: não apagar agora.**
Em vez de apagar, fica a **lista de remoção exacta** na secção 5.1 para quem for apagar no futuro —
são 13 pontos, nenhum deles ligado a comportamento nenhum hoje.
**✅ QUESTÃO E2 — marcador no código. DECIDIDO: (a) só a lista na spec.**
Zero alterações de código para marcar a camada de permissões. Se um dia for apagar, a lista da
secção 5.1 é o único sítio a consultar.
**✅ QUESTÃO H — mapa de arrasto (Passo 4). DECIDIDO: (a) manter como está.**
Confirmado pelo utilizador que os roles são exactamente os da imagem da meeting:
`director`, `people_manager`, `account_manager`, `hr`, `office_finance`, `system_admin` +
`employee` (mantido). O arrasto `system_admin → admin`, `people_manager → manager` e
`account_manager → manager` fica como está — garante que ninguém fica sem acesso na transição.
**✅ QUESTÃO J — 45 rotas sem linha na matriz (secção 3.2). DECIDIDO: (a) não se mexe.**
Estão **marcadas com a linha exacta de cada `@Roles`** na secção 3.2.
**✅ QUESTÃO F — incoerências de escopo (secção 5.2). DECIDIDO: (a) alinhar tudo.**
`Linha` = directos + indirectos em **todos** os ~15 locais, numa só regra.
**✅ QUESTÃO I — testes. DECIDIDO: (a) escrever testes novos** de escopo e de roles nesta fase.
**✅ QUESTÃO K — atribuição dos roles novos. DECIDIDO: (b) não atribuir ninguém por agora.**
A app continua a funcionar exactamente como hoje até decidires atribuir.
**✅ QUESTÃO G — escopo `Proj.`. DECIDIDO: (b) leitura + aprovações.**
O gestor de projecto passa a ver **e a aprovar** ausências, timesheets e despesas de quem está
alocado aos projectos que gere — em conjunto com quem já aprova por hierarquia.
Isto mexe em 3 validações iguais hoje:
`absences.service.ts:534`, `timesheets.service.ts:377`, `expenses.service.ts:541`
(as três dizem `if (employee.managerId !== approverId) throw ForbiddenException(...)`),
mais a atribuição de tarefas do workflow (`workflow.service.ts:249, 273`).
Os detalhes de implementação estão em **§5.2** e **§8**.

**✅ QUESTÃO L — definição de "estar no meu projecto". DECIDIDO: (b) qualquer alocação.**
Conta qualquer linha de `project_allocations`, mesmo que `start_date`/`end_date` já tenham
passado ou ainda não tenham começado — **sem filtro de datas**. Regra simples e previsível: quem
foi alocado a um projecto mantém o acesso daí para a frente.
**✅ QUESTÃO M — o que vê o `account_manager` nas listagens. DECIDIDO: (a) só as pessoas dos
projectos que gere.** É aqui que `Proj.` vira regra de **leitura**: deixando de passar pelo
`isAdminOrManager` genérico, e passando a filtrar pelo conjunto dos seus `project_allocations`.
**✅ QUESTÃO N — módulos do `Proj.`. DECIDIDO: (a) só os 3 de hoje** — ausências, timesheets e
despesas.
**✅ QUESTÃO O — tarefas/notificações do workflow. DECIDIDO: (a) não mudar.** A tarefa continua a
ser atribuída ao chefe hierárquico; o gestor de projecto aprova quando entra pela rota. `workflow`
e `notifications` **não** são tocados.
**✅ QUESTÃO P — frontend. DECIDIDO: (a) só backend.**
**✅ QUESTÃO Q — testes. DECIDIDO: (b) incluir testes de controller** dos módulos alterados, além
dos testes do comportamento novo (hoje existem **0** testes de controller).

---

## 8. Ronda final — ✅ RESPONDIDA (2026-09-29)

> Todas as 18 questões estão respondidas. O guia está **fechado**: podes começar pelo **Passo 1**.

| Q   | Pergunta                                    | Resposta                                                   |
| --- | ------------------------------------------- | ---------------------------------------------------------- |
| L   | O que conta como "estar no meu projecto"?   | **(b)** qualquer alocação, sem filtro de datas             |
| M   | O que vê o `account_manager` nas listagens? | **(a)** só as pessoas dos seus projectos                   |
| N   | Em que módulos se aplica o `Proj.`?         | **(a)** só ausências, timesheets e despesas                |
| O   | Tarefas/notificações do workflow?           | **(a)** não mudar — a tarefa continua do chefe             |
| P   | Frontend?                                   | **(a)** só backend                                         |
| Q   | Que testes?                                 | **(b)** incluir testes de controller dos módulos alterados |

**O que já existe hoje** (referência para a Fase 5.2):

- `projects.project.managerId` (`project.entity.ts:37`) — quem gere o projecto
- `ProjectsService.isProjectManager(projectId, userId)` → `true`/`false`, usado em 2 sítios
- `GET /projects?manager_id=` (`projects.controller.ts:45-47`) — já devolve os projectos de um gestor
- `project_allocations` (`projects/entities/project-allocation.entity.ts`) — liga pessoa ↔ projecto,
  com `start_date` e `end_date` (**pode ser nulo**). **Sem filtro de datas** (QUESTÃO L = b).
- **Não existe:** "dá-me as pessoas dos projectos que eu gere" nem "pode este gestor de projecto
  aprovar este pedido" — só existe `employee.managerId` (quem é chefe da pessoa)

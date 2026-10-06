# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: timesheet.spec.ts >> Timesheet Flow >> manager should bulk-approve timesheets
- Location: e2e\timesheet.spec.ts:20:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text=Timesheets')

```

# Page snapshot

```yaml
- generic [ref=e1]:
    - generic [ref=e3]:
        - complementary [ref=e4]:
            - link [ref=e6] [cursor=pointer]:
                - /url: /
                - text: HR Suite
            - navigation [ref=e7]:
                - link [ref=e8] [cursor=pointer]:
                    - /url: /settings/security
                    - img [ref=e9]
                    - text: Segurança
        - generic [ref=e12]:
            - banner [ref=e13]:
                - generic [ref=e14]:
                    - button [ref=e15] [cursor=pointer]:
                        - img [ref=e16]
                    - generic [ref=e17]: Bem-vindo, admin
                - generic [ref=e18]:
                    - button [ref=e19] [cursor=pointer]:
                        - img [ref=e20]
                    - button [ref=e23] [cursor=pointer]:
                        - img [ref=e24]
            - main [ref=e27]:
                - generic [ref=e29]:
                    - generic [ref=e31]:
                        - heading [level=1] [ref=e32]: Segurança
                        - paragraph [ref=e33]: Gerir a autenticação multifator (MFA) da sua conta
                    - generic [ref=e34]:
                        - img [ref=e35]
                        - paragraph [ref=e37]: A autenticação multifator é obrigatória para administradores. Configure-a para aceder ao resto da aplicação.
                    - generic [ref=e38]:
                        - generic [ref=e41]:
                            - generic [ref=e42]:
                                - img [ref=e43]
                                - heading [level=3] [ref=e46]: Autenticação multifator
                                - generic [ref=e48]: Inativo
                            - paragraph [ref=e49]: Além da palavra-passe, o login passa a pedir um código de 6 dígitos gerado por uma aplicação autenticadora (Google Authenticator, Microsoft Authenticator, Authy…).
                        - button [ref=e52] [cursor=pointer]: Configurar MFA
    - dialog "Leitura e aceite obrigatório Conformidade interna" [active] [ref=e55]:
        - heading "Leitura e aceite obrigatório Conformidade interna" [level=2] [ref=e56]:
            - generic [ref=e57]: Leitura e aceite obrigatório
            - paragraph [ref=e58]: Conformidade interna
        - generic [ref=e60]:
            - alert [ref=e61]:
                - img [ref=e63]
                - generic [ref=e65]: Configuração de MFA obrigatória antes de aceder a este recurso
            - button "Tentar novamente" [ref=e66] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test';
  2  | import { loginAsAdmin, loginAsEmployee } from './helpers';
  3  |
  4  | test.describe('Timesheet Flow', () => {
  5  |   test('employee should submit timesheet', async ({ page }) => {
  6  |     await loginAsEmployee(page);
  7  |
  8  |     await page.click('text=Timesheets');
  9  |     await page.waitForURL(/\/timesheets/);
  10 |
  11 |     await expect(page.locator('text=Timesheets')).toBeVisible();
  12 |
  13 |     const submitButton = page.locator('button:has-text("Submeter")').first();
  14 |     if (await submitButton.isVisible()) {
  15 |       await submitButton.click();
  16 |       await expect(page.locator('text=submetido')).toBeVisible();
  17 |     }
  18 |   });
  19 |
  20 |   test('manager should bulk-approve timesheets', async ({ page }) => {
  21 |     await loginAsAdmin(page);
  22 |
> 23 |     await page.click('text=Timesheets');
     |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  24 |     await page.waitForURL(/\/timesheets/);
  25 |
  26 |     const bulkApproveButton = page.locator('button:has-text("Aprovar Selecionados")');
  27 |     if (await bulkApproveButton.isVisible()) {
  28 |       const checkbox = page.locator('thead input[type="checkbox"]').first();
  29 |       if (await checkbox.isVisible()) {
  30 |         await checkbox.click();
  31 |       }
  32 |       await bulkApproveButton.click();
  33 |       await expect(page.locator('text=aprovado')).toBeVisible();
  34 |     }
  35 |   });
  36 | });
  37 |
```

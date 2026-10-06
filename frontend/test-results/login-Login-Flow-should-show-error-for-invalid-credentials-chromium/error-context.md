# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> Login Flow >> should show error for invalid credentials
- Location: e2e\login.spec.ts:13:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Erro')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Erro')

```

```yaml
- img "Bridge351 HR Suite"
- heading "HR Suite" [level=3]
- paragraph: Inicie sessão na sua conta
- text: Email
- textbox "Email":
    - /placeholder: nome@empresa.pt
    - text: invalid@test.com
- text: Palavra-passe
- textbox "Palavra-passe":
    - /placeholder: ••••••••
    - text: wrongpass
- link "Esqueci a palavra-passe":
    - /url: /auth/reset-password
- paragraph: Credenciais inválidas
- button "Iniciar sessão"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { loginAsAdmin } from './helpers';
  3  |
  4  | test.describe('Login Flow', () => {
  5  |   test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
  6  |     await loginAsAdmin(page);
  7  |
  8  |     await expect(page).toHaveURL(/\/$/);
  9  |     await expect(page.locator('text=Dashboard')).toBeVisible();
  10 |     await expect(page.locator('text=HR Suite')).toBeVisible();
  11 |   });
  12 |
  13 |   test('should show error for invalid credentials', async ({ page }) => {
  14 |     await page.goto('/login');
  15 |     await page.fill('input[type="email"]', 'invalid@test.com');
  16 |     await page.fill('input[type="password"]', 'wrongpass');
  17 |     await page.click('button[type="submit"]');
  18 |
> 19 |     await expect(page.locator('text=Erro')).toBeVisible();
     |                                             ^ Error: expect(locator).toBeVisible() failed
  20 |     await expect(page).toHaveURL(/\/login/);
  21 |   });
  22 |
  23 |   test('should redirect to login when accessing protected route without auth', async ({ page }) => {
  24 |     await page.goto('/users');
  25 |     await expect(page).toHaveURL(/\/login/);
  26 |   });
  27 | });
  28 |
```

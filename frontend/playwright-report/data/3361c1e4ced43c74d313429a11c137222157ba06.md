# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> Login Flow >> should login with valid credentials and redirect to dashboard
- Location: e2e\login.spec.ts:5:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/$/
Received string:  "http://localhost:5173/settings/security"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × unexpected value "http://localhost:5173/settings/security"

```

```yaml
- dialog "Leitura e aceite obrigatório Conformidade interna":
    - heading "Leitura e aceite obrigatório Conformidade interna" [level=2]:
        - text: Leitura e aceite obrigatório
        - paragraph: Conformidade interna
    - alert: Configuração de MFA obrigatória antes de aceder a este recurso
    - button "Tentar novamente"
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
> 8  |     await expect(page).toHaveURL(/\/$/);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
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
  19 |     await expect(page.locator('text=Erro')).toBeVisible();
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

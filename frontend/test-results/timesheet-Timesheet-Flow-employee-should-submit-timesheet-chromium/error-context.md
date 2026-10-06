# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: timesheet.spec.ts >> Timesheet Flow >> employee should submit timesheet
- Location: e2e\timesheet.spec.ts:5:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
    - img "Bridge351 HR Suite"
    - generic [ref=e5]:
        - generic [ref=e8]:
            - img [ref=e10]
            - heading "HR Suite" [level=3] [ref=e12]
            - paragraph [ref=e13]: Inicie sessão na sua conta
        - generic [ref=e15]:
            - generic [ref=e16]:
                - generic [ref=e17]: Email
                - generic [ref=e18]:
                    - textbox "Email" [ref=e19]:
                        - /placeholder: nome@empresa.pt
                        - text: employee@test.com
                    - group:
                        - generic: Email
            - generic [ref=e20]:
                - generic [ref=e21]: Palavra-passe
                - generic [ref=e22]:
                    - textbox "Palavra-passe" [ref=e23]:
                        - /placeholder: ••••••••
                        - text: Test123!
                    - group:
                        - generic: Palavra-passe
            - link "Esqueci a palavra-passe" [ref=e25] [cursor=pointer]:
                - /url: /auth/reset-password
            - paragraph [ref=e26]: Credenciais inválidas
            - button "Iniciar sessão" [ref=e27] [cursor=pointer]: Iniciar sessão
```

# Test source

```ts
  1  | import { type Page } from '@playwright/test';
  2  |
  3  | export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  4  |   await page.goto('/login');
  5  |   await page.fill('input[type="email"]', email);
  6  |   await page.fill('input[type="password"]', password);
  7  |   await page.click('button[type="submit"]');
> 8  |   await page.waitForURL(/\/$/);
     |              ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  9  | }
  10 |
  11 | export async function loginAsAdmin(page: Page): Promise<void> {
  12 |   await loginAs(page, 'admin@hr-suite.local', 'Admin123!');
  13 | }
  14 |
  15 | export async function loginAsEmployee(page: Page): Promise<void> {
  16 |   await loginAs(page, 'employee@test.com', 'Test123!');
  17 | }
  18 |
  19 | export async function getCsrfToken(page: Page): Promise<string | null> {
  20 |   return page.locator('meta[name="csrf-token"]').getAttribute('content');
  21 | }
  22 |
```

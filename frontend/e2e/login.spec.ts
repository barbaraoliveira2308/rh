import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Login Flow', () => {
  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=HR Suite')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Erro')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/\/login/);
  });
});

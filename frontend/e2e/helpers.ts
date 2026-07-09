import { type Page } from '@playwright/test';

export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$/);
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAs(page, 'admin@hr-suite.local', 'Admin123!');
}

export async function loginAsEmployee(page: Page): Promise<void> {
  await loginAs(page, 'employee@test.com', 'Test123!');
}

export async function getCsrfToken(page: Page): Promise<string | null> {
  return page.locator('meta[name="csrf-token"]').getAttribute('content');
}

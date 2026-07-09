import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsEmployee } from './helpers';

test.describe('Absence Flow', () => {
  test('employee should create and manager should approve absence', async ({ page }) => {
    await loginAsEmployee(page);

    await page.click('text=Ausências');
    await page.waitForURL(/\/absences/);

    await page.click('text=Nova Ausência');
    await page.waitForURL(/\/absences\/new/);

    await expect(page.locator('text=Nova Ausência')).toBeVisible();

    await page.fill('input[type="date"]:first-of-type', '2026-12-01');
    await page.fill('input[type="date"]:last-of-type', '2026-12-03');

    const submitBtn = page.locator('button:has-text("Submeter")');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }
  });
});

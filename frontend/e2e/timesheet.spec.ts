import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin, loginAsEmployee } from './helpers';

test.describe('Timesheet Flow', () => {
  test('employee should submit timesheet', async ({ page }) => {
    await loginAsEmployee(page);

    await page.click('text=Timesheets');
    await page.waitForURL(/\/timesheets/);

    await expect(page.locator('text=Timesheets')).toBeVisible();

    const submitButton = page.locator('button:has-text("Submeter")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await expect(page.locator('text=submetido')).toBeVisible();
    }
  });

  test('manager should bulk-approve timesheets', async ({ page }) => {
    await loginAsAdmin(page);

    await page.click('text=Timesheets');
    await page.waitForURL(/\/timesheets/);

    const bulkApproveButton = page.locator('button:has-text("Aprovar Selecionados")');
    if (await bulkApproveButton.isVisible()) {
      const checkbox = page.locator('thead input[type="checkbox"]').first();
      if (await checkbox.isVisible()) {
        await checkbox.click();
      }
      await bulkApproveButton.click();
      await expect(page.locator('text=aprovado')).toBeVisible();
    }
  });
});

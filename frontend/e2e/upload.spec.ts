import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Document Upload', () => {
  test('should upload a document for absence', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/absences');

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles({
        name: 'test-doc.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('fake pdf content'),
      });

      await expect(page.locator('text=test-doc.pdf')).toBeVisible();
    }
  });
});

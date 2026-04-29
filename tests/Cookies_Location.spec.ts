import { test, expect } from '@playwright/test';

test('Handle Cookies & Deliver-To pop-ups', async ({ page }) => {
  await page.goto('https://www.decathlon.my/');

  //Cookies Handler
  const acceptBtn = page.getByRole('button', { name: 'Accept All' });
  if (await acceptBtn.isVisible()) {
    await acceptBtn.click();
  }

  // "Deliver To" Handler - ensure the button is visible before clicking
  const deliverToBtn = page.getByRole('button', { name: /confirm|ok|shop now/i }).filter({ visible: true });
  if (await deliverToBtn.isVisible()) {
    await deliverToBtn.click();
    await page.waitForTimeout(1000);
  }
});


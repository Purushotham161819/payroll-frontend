import { test, expect } from '@playwright/test';
for (const width of [1440, 390])
  test('invitation notification, keyboard and modal variants at ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    let result: 'success' | 'warning' | 'error' = 'success';
    let posts = 0;
    await page.route('http://localhost:3000/**', (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/auth/me')
        return route.fulfill({ json: { id: 'admin', email: 'admin@example.test', role: 'admin' } });
      if (url.pathname === '/settings/organization')
        return route.fulfill({ json: { displayName: 'Example organization' } });
      if (url.pathname === '/users' && route.request().method() === 'GET')
        return route.fulfill({ json: [] });
      if (url.pathname === '/users' && route.request().method() === 'POST') {
        posts++;
        return route.fulfill(
          result === 'error'
            ? { status: 409, json: { message: 'Duplicate account' } }
            : {
                json: {
                  invitationSent: result === 'success',
                  message:
                    'Invitation request accepted by Microsoft Graph. Delivery is not yet confirmed.',
                },
              },
        );
      }
      if (url.pathname === '/auth/forgot-password')
        return route.fulfill({
          json: {
            message: 'If the account is eligible, a password reset email has been requested.',
          },
        });
      return route.fulfill({ json: [] });
    });
    async function create() {
      await page.getByRole('button', { name: 'Add User', exact: true }).click();
      const editor = page.getByRole('dialog', { name: 'Add User', exact: true });
      await editor.getByLabel('First Name', { exact: true }).fill('Asha');
      await editor.getByLabel('Last Name', { exact: true }).fill('Rao');
      await editor.getByLabel('Email address', { exact: true }).fill('asha@example.test');
      await editor.getByRole('button', { name: 'Save', exact: true }).click();
    }
    await page.goto('/users');
    await create();
    const notification = page.locator('ps-notification-host dialog');
    await expect(notification).toBeVisible();
    await expect(notification.getByRole('heading')).toHaveText('Success!');
    await expect(notification).toContainText('User invitation email has been sent successfully.');
    await expect(page.getByText('Delivery is not yet confirmed.', { exact: false })).toHaveCount(0);
    await expect(notification.getByRole('button', { name: 'OK', exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'test-results/notification-success-' + width + '.png',
      animations: 'disabled',
    });
    await page.keyboard.press('Escape');
    await expect(notification).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Add User', exact: true })).toBeFocused();
    result = 'warning';
    await create();
    await expect(notification.getByRole('heading')).toHaveText('Attention.');
    await expect(notification).toContainText('do not create the user again');
    await notification.getByRole('button', { name: 'OK', exact: true }).click();
    result = 'error';
    await create();
    await expect(notification.getByRole('heading')).toHaveText('Something went wrong.');
    await expect(page.locator('ps-notification-host dialog[open]')).toHaveCount(1);
    await notification.getByRole('button', { name: 'OK', exact: true }).click();
    expect(posts).toBe(3);
    await page.goto('/forgot-password');
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('unknown@example.test');
    await page.getByRole('button', { name: 'Request Reset Link', exact: true }).click();
    await expect(notification.getByRole('heading')).toHaveText('Information.');
    await expect(notification).toContainText('If the account is eligible');
    await notification.getByRole('button', { name: 'OK', exact: true }).click();
  });

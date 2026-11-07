import { test, expect } from '@playwright/test';

test('authentication forms remain usable on mobile and preserve forced password change', async ({
  page,
}) => {
  let changed = false;
  await page.route('**/auth/me', (r) =>
    r.fulfill({
      json: {
        id: 'preview',
        email: 'preview@example.test',
        role: 'admin',
        mustChangePassword: !changed,
      },
    }),
  );
  await page.route('http://localhost:3000/auth/change-password', (r) => {
    expect(r.request().postDataJSON()).toEqual({
      currentPassword: 'temporary-input',
      password: 'replacement-input',
    });
    changed = true;
    return r.fulfill({ json: {} });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/change-password');
  await expect(page.getByRole('button', { name: 'Change password', exact: true })).toBeDisabled();
  await page.getByLabel('Current password', { exact: true }).fill('temporary-input');
  await page.getByLabel('New password', { exact: true }).fill('replacement-input');
  await page.getByLabel('Confirm new password', { exact: true }).fill('mismatch-input');
  await expect(page.getByRole('button', { name: 'Change password', exact: true })).toBeDisabled();
  await page.getByLabel('Confirm new password', { exact: true }).fill('replacement-input');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.route('**/auth/me', (r) => r.fulfill({ status: 401, json: {} }));
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email address').fill('invalid');
  await page.getByLabel('Password', { exact: true }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByLabel('Email address')).toHaveAttribute('aria-invalid', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

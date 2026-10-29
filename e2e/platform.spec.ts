import { test, expect } from '@playwright/test';

test('Super Admin customer onboarding, account tabs, confirmed reset and responsive portal', async ({
  page,
}) => {
  let active = true,
    created = false,
    reset = false;
  const org = {
    organizationId: 'ORG000001',
    name: 'Acme Staffing',
    status: 'active',
    createdAt: '2026-10-01',
    admins: 1,
    users: 1,
  };
  await page.route('http://localhost:3000/**', async (r) => {
    const url = new URL(r.request().url()),
      path = url.pathname,
      method = r.request().method();
    if (path === '/auth/me')
      return active
        ? r.fulfill({ json: { id: 'super', email: 'platform@example.test', role: 'super_admin' } })
        : r.fulfill({ status: 401, json: { message: 'Authentication required' } });
    if (path === '/auth/logout') {
      active = false;
      return r.fulfill({ status: 204 });
    }
    if (path === '/super-admin/dashboard')
      return r.fulfill({
        json: {
          organizations: created ? 1 : 0,
          activeOrganizations: created ? 1 : 0,
          admins: created ? 1 : 0,
          users: 0,
        },
      });
    if (path === '/super-admin/organizations' && method === 'POST') {
      const body = r.request().postDataJSON();
      expect(body.name).toBe('Acme Staffing');
      expect(body.role).toBe('admin');
      expect(body.password.length).toBe(8);
      expect(body.organizationId).toBeUndefined();
      created = true;
      return r.fulfill({ status: 201, json: { organizationId: org.organizationId } });
    }
    if (path === '/super-admin/organizations')
      return r.fulfill({ json: { items: created ? [org] : [], total: created ? 1 : 0 } });
    if (path.endsWith('/audit')) return r.fulfill({ json: { items: [], total: 0 } });
    if (path.endsWith('/password')) {
      expect(r.request().headers()['x-payroll-request']).toBe('1');
      expect(r.request().postDataJSON().password.length).toBe(8);
      reset = true;
      return r.fulfill({ json: { message: 'Temporary password set' } });
    }
    if (path.endsWith('/accounts'))
      return r.fulfill({
        json: {
          items: [
            {
              id: 'account',
              email:
                url.searchParams.get('role') === 'admin' ? 'admin@acme.test' : 'user@acme.test',
              role: url.searchParams.get('role'),
              active: true,
              createdAt: '2026-10-01',
            },
          ],
          total: 1,
        },
      });
    if (path === '/super-admin/organizations/ORG000001') return r.fulfill({ json: org });
    throw new Error('Unexpected customer business API request ' + path);
  });
  await page.goto('/super-admin');
  await expect(page.getByRole('heading', { name: 'Platform overview' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Employees', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'View customers' }).click();
  await page.getByRole('button', { name: 'Add Customer', exact: true }).click();
  const editor = page.locator('dialog[open]');
  await editor.getByLabel('Organization name').fill('Acme Staffing');
  await editor.getByLabel('Initial administrator email').fill('admin@acme.test');
  await editor.getByLabel('Temporary password', { exact: true }).fill('1234567');
  await editor.getByLabel('Confirm temporary password').fill('1234567');
  await expect(editor.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await editor.getByLabel('Temporary password', { exact: true }).fill('12345678');
  await editor.getByLabel('Confirm temporary password').fill('12345678');
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.notice[role=status]')).toContainText('ORG000001');
  await expect(editor).toHaveCount(0);
  await page.getByRole('link', { name: 'Acme Staffing', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Organization details', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Organization users', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'user@acme.test', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'admin@acme.test', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset password', exact: true }).click();
  await editor.getByLabel('Temporary password', { exact: true }).fill('87654321');
  await editor.getByLabel('Confirm temporary password').fill('87654321');
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  const confirm = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: 'Confirm password reset' }) });
  await expect(confirm).toContainText('Acme Staffing');
  await expect(confirm).toContainText('user@acme.test');
  expect(reset).toBe(false);
  await confirm.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.locator('.notice[role=status]')).toContainText('Temporary password set');
  expect(reset).toBe(true);
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'artifacts/super-admin-accounts.png', fullPage: true });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/login/);
});

test('temporary credentials require a new password before entering the workspace', async ({
  page,
}) => {
  let changed = false;
  await page.route('http://localhost:3000/**', (r) => {
    const path = new URL(r.request().url()).pathname;
    if (path === '/auth/me')
      return r.fulfill({
        json: { id: 'admin', email: 'admin@acme.test', role: 'admin', mustChangePassword: true },
      });
    if (path === '/auth/change-password') {
      const body = r.request().postDataJSON();
      expect(body.currentPassword).toBe('12345678');
      expect(body.password).toBe('87654321');
      changed = true;
      return r.fulfill({ json: { message: 'Password changed' } });
    }
    throw new Error('Unexpected API ' + path);
  });
  await page.goto('/users');
  await expect(page).toHaveURL(/change-password/);
  await page.getByLabel('Current password').fill('12345678');
  await page.getByLabel('New password', { exact: true }).fill('8765432');
  await page.getByLabel('Confirm new password').fill('8765432');
  await expect(page.getByRole('button', { name: 'Change password' })).toBeDisabled();
  await page.getByLabel('New password', { exact: true }).fill('87654321');
  await page.getByLabel('Confirm new password').fill('87654321');
  // Once changed, the old cookie is no longer a valid authenticated session.
  await page.unroute('http://localhost:3000/**');
  await page.route('http://localhost:3000/**', (r) => {
    const path = new URL(r.request().url()).pathname;
    if (path === '/auth/change-password') {
      expect(r.request().postDataJSON().password).toBe('87654321');
      changed = true;
      return r.fulfill({ json: { message: 'Password changed' } });
    }
    return r.fulfill({ status: 401, json: { message: 'Authentication required' } });
  });
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(changed).toBe(true);
});

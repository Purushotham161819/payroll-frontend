import { test, expect } from './authenticated-test';
import { mkdirSync } from 'node:fs';
const artifacts = 'artifacts/phase4b-users';
mkdirSync(artifacts, { recursive: true });
const admin = { id: 'admin', email: 'admin@example.test', role: 'admin', organizationId: 'ORG000001' };
const users = [
  { ...admin, active: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'member', email: 'member.with.a.long.email.address@example.test', role: 'user', active: true, createdAt: '2026-09-15T00:00:00Z' },
  { id: 'inactive', email: 'inactive@example.test', role: 'user', active: false, createdAt: '2026-02-01T00:00:00Z' },
];
async function setup(page: any) {
  await page.route('**/auth/me', (r: any) => r.fulfill({ json: admin }));
  await page.route('http://localhost:3000/users', (r: any) => r.fulfill({ json: users }));
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'User Management', exact: true })).toBeVisible();
  await expect.poll(() => page.locator('main').evaluate(el => el.getAnimations().length)).toBe(0);
}
async function action(page: any, row: any, name: string) {
  if (process.env.PS_CAPTURE_BEFORE !== '1') await row.getByRole('button', { name: 'More actions for ' + users[1].email, exact: true }).click();
  await page.getByRole(process.env.PS_CAPTURE_BEFORE === '1' ? 'button' : 'menuitem', { name, exact: true }).click();
}
for (const width of [1440, 1280, 768, 390]) test('visual evidence at ' + width + 'px', async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 }); await setup(page);
  const prefix = process.env.PS_CAPTURE_BEFORE === '1' ? 'before' : 'after';
  await page.screenshot({ path: artifacts + '/' + prefix + '-directory-' + width + '.png', fullPage: true });
  const row = page.getByRole('row').filter({ hasText: users[1].email });
  await page.getByRole('button', { name: 'Add User', exact: true }).click();
  await page.screenshot({ path: artifacts + '/' + prefix + '-create-' + width + '.png', fullPage: true });
  await page.getByRole('dialog', { name: 'Add User', exact: true }).getByRole('button', { name: 'Cancel', exact: true }).click();
  await action(page, row, 'Edit ' + users[1].email);
  await page.screenshot({ path: artifacts + '/' + prefix + '-edit-' + width + '.png', fullPage: true });
  await page.getByRole('dialog', { name: 'Edit User', exact: true }).getByRole('button', { name: 'Cancel', exact: true }).click();
  if (prefix === 'after') await expect(row.getByRole('button', { name: 'More actions for ' + users[1].email, exact: true })).toBeFocused();
  await action(page, row, 'Deactivate ' + users[1].email);
  await page.screenshot({ path: artifacts + '/' + prefix + '-confirmation-' + width + '.png', fullPage: true });
  await page.getByRole('dialog').filter({ visible: true }).getByRole('button', { name: 'Cancel', exact: true }).click();
  if (prefix === 'before') return;
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const table = page.getByRole('table', { name: 'User directory', exact: true });
  await expect(table.getByRole('columnheader')).toHaveText(['Email', 'Role', 'Account status', 'Created date', 'Actions']);
  const created = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(users[1].createdAt)).replace('Sept', 'Sep');
  await expect(row).toContainText(created);
  await expect(row.locator('ps-status-badge')).toHaveAttribute('data-tone', 'success');
  await expect(table.getByRole('row').filter({ hasText: users[2].email }).locator('ps-status-badge')).toHaveAttribute('data-tone', 'neutral');
  expect((await row.boundingBox())!.height).toBeCloseTo(56, 2);
  const trigger = row.getByRole('button', { name: 'More actions for ' + users[1].email, exact: true });
  await trigger.scrollIntoViewIfNeeded(); expect((await trigger.boundingBox())!.width).toBe(32);
  expect((await trigger.locator('svg').boundingBox())!.width).toBe(16);
  await trigger.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem', { name: 'Edit ' + users[1].email, exact: true })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  await page.getByRole('button', { name: 'Add User', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add User', exact: true });
  const box = (await dialog.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
  for (const input of await dialog.locator('input:not([type=checkbox]),select').all()) expect((await input.boundingBox())!.height).toBe(40);
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Add User', exact: true })).toBeFocused();
});


test('existing account workflows retain payloads, confirmations and self protection', async ({ page }) => {
  let data = users.map(u => ({ ...u })); const writes: { url: string; body: any }[] = [];
  await page.route('**/auth/me', r => r.fulfill({ json: admin }));
  await page.route('http://localhost:3000/users**', async r => {
    if (r.request().method() === 'GET') return r.fulfill({ json: data });
    const body = r.request().postDataJSON(); const url = r.request().url(); writes.push({ url, body });
    if (r.request().method() === 'POST') data.push({ id: 'new', createdAt: '2026-01-01T00:00:00Z', ...body });
    else if (!url.endsWith('/password')) data = data.map(u => url.includes('/' + u.id) ? { ...u, ...body } : u);
    await r.fulfill({ json: { message: 'Saved' } });
  });
  await page.goto('/users');
  await page.getByRole('button', { name: 'Add User', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Add User', exact: true });
  await editor.getByLabel('Email address', { exact: true }).fill('NEW@EXAMPLE.TEST');
  await editor.getByLabel('Password', { exact: true }).fill('1234567');
  await editor.getByLabel('Confirm password', { exact: true }).fill('1234567');
  await expect(editor.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await editor.getByLabel('Password', { exact: true }).fill('12345678');
  await editor.getByLabel('Confirm password', { exact: true }).fill('different');
  await expect(editor.getByText('Passwords do not match.', { exact: true })).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await editor.getByLabel('Confirm password', { exact: true }).fill('12345678');
  await editor.getByLabel('Account active', { exact: true }).uncheck();
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(editor).not.toBeVisible();
  expect(writes[0].body).toEqual({ email: 'new@example.test', password: '12345678', role: 'user', active: false });
  const row = page.getByRole('row').filter({ hasText: users[1].email });
  await action(page, row, 'Edit ' + users[1].email);
  const edit = page.getByRole('dialog', { name: 'Edit User', exact: true });
  await edit.getByLabel('Role', { exact: true }).click();await page.locator('.ps-select-panel').getByRole('option',{name:'Admin',exact:true}).click();
  await edit.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(edit).not.toBeVisible(); expect(writes[1].body).toEqual({ email: users[1].email, role: 'admin' });
  await expect(row.getByRole('cell', { name: 'Admin', exact: true })).toBeVisible();
  await action(page,row,'Edit '+users[1].email);await expect(edit.getByLabel('Role',{exact:true})).toHaveValue('admin');await edit.getByRole('button',{name:'Cancel',exact:true}).click();
  await action(page, row, 'Reset password ' + users[1].email);
  const reset = page.getByRole('dialog', { name: 'Reset password', exact: true });
  await reset.getByLabel('Password', { exact: true }).fill('abcdefgh');
  await reset.getByLabel('Confirm password', { exact: true }).fill('abcdefgh');
  await reset.getByRole('button', { name: 'Review reset', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Confirm password reset', exact: true });
  expect(writes).toHaveLength(2);
  await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(reset).toBeVisible(); expect(writes).toHaveLength(2);
  await reset.getByRole('button', { name: 'Review reset', exact: true }).click();
  await confirm.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(reset).not.toBeVisible(); expect(writes[2].body).toEqual({ password: 'abcdefgh' });
  for (const [label, active] of [['Deactivate', false], ['Activate', true]] as const) {
    await action(page, row, label + ' ' + users[1].email);
    const confirmation = page.getByRole('dialog').filter({ visible: true });
    const count = writes.length;
    await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click(); expect(writes).toHaveLength(count);
    await action(page, row, label + ' ' + users[1].email);
    await confirmation.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(confirmation).toHaveCount(0); expect(writes.at(-1)!.body).toEqual({ active });
    await expect(row).toContainText(active ? 'Active' : 'Inactive');
  }
  const self = page.getByRole('row').filter({ hasText: admin.email });
  await self.getByRole('button', { name: 'More actions for ' + admin.email, exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'Deactivate ' + admin.email, exact: true })).toBeDisabled();
  await page.getByRole('menuitem', { name: 'Edit ' + admin.email, exact: true }).click();
  await expect(page.getByLabel('Role', { exact: true })).toBeDisabled();
});

for (const role of ['user', 'super_admin']) test(role + ' retains existing access boundary', async ({ page }) => {
  let reads = 0;
  await page.route('**/auth/me', r => r.fulfill({ json: { ...admin, role } }));
  await page.route('http://localhost:3000/users', r => { reads++; return r.fulfill({ json: users }); });
  await page.route('http://localhost:3000/employees', r => r.fulfill({ json: [] }));
  await page.route('**/platform/**', r => r.fulfill({ json: [] }));
  await page.goto('/users');
  await expect(page).toHaveURL(role === 'user' ? /\/$/ : /\/super-admin$/);
  await expect(page.getByRole('link', { name: 'User Management', exact: true })).toHaveCount(0);
  expect(reads).toBe(0);
});

test('empty, denied and duplicate states retain safe feedback and drafts', async ({ page }) => {
  await page.route('**/auth/me', r => r.fulfill({ json: admin }));
  let denied = false;
  await page.route('http://localhost:3000/users', r => {
    if (r.request().method() === 'POST') return r.fulfill({ status: 409, json: { message: 'An account with this email already exists' } });
    return r.fulfill(denied ? { status: 403, json: {} } : { json: [] });
  });
  await page.goto('/users'); await expect(page.getByText('No users found.', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add User', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add User', exact: true });
  await dialog.getByLabel('Email address', { exact: true }).fill('duplicate@example.test');
  await dialog.getByLabel('Password', { exact: true }).fill('12345678');
  await dialog.getByLabel('Confirm password', { exact: true }).fill('12345678');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('already exists');
  await expect(dialog.getByLabel('Email address', { exact: true })).toHaveValue('duplicate@example.test');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  denied = true; await page.getByRole('button', { name: 'Refresh users', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Administrator access is required.');
});

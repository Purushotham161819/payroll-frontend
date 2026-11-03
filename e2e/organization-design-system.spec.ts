import {productDropdownEvidence} from './product-dropdown-evidence';
﻿import { test, expect } from './authenticated-test';
import { mkdirSync } from 'node:fs';
const artifacts = 'artifacts/phase4c-organization';
mkdirSync(artifacts, { recursive: true });
const api = 'http://localhost:3000/settings/organization-profile';
const admin = { id: 'organization-admin', email: 'admin@example.test', role: 'admin', organizationId: 'ORG000001' };
const initial = { organizationName: 'Example Organization', addressVersion: 1, address: { addressLine1: '10 Example Street', addressLine2: 'Suite 12', city: 'Bengaluru', state: 'Karnataka', country: 'India', zipCode: '00123' } };
async function setup(page: any) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/auth/me', (r: any) => r.fulfill({ json: admin }));
  await page.route(api, (r: any) => r.fulfill({ json: initial }));
  await page.goto('/settings/organization');
  await expect(page.getByText(initial.organizationName, { exact: true })).toBeVisible();
}
for (const width of [1440, 1280, 768, 390]) test('Organization Settings visual and responsive evidence at ' + width + 'px', async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 }); await setup(page);
  const prefix = process.env.PS_CAPTURE_BEFORE === '1' ? 'before' : 'after';
  await page.screenshot({ path: artifacts + '/' + prefix + '-readonly-' + width + '.png', fullPage: true });
  await expect(page.locator('#addressLine1')).toHaveAttribute('readonly', '');
  await expect(page.locator('#country')).toBeDisabled();
  await page.getByRole('button', { name: 'Edit organization address', exact: true }).click();
  await page.screenshot({ path: artifacts + '/' + prefix + '-edit-' + width + '.png', fullPage: true });
  await productDropdownEvidence(page,'organization',width);
  await expect(page.locator('#zipCode')).toHaveValue('00123');
  await expect(page.locator('#addressLine1')).not.toHaveAttribute('readonly');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  if (prefix === 'before') return;
  const cards = page.locator('.organization-cards > ps-card');
  const [info, address] = await cards.evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height }; }));
  expect(info.width).toBeCloseTo(address.width, 2);
  if (width > 850) { expect(info.y).toBeCloseTo(address.y, 2); expect(info.height).toBeCloseTo(address.height, 2); }
  else expect(address.y).toBeGreaterThan(info.y + info.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const edit = page.getByRole('button', { name: 'Edit organization address', exact: true });
  expect((await edit.boundingBox())!.width).toBe(32); expect((await edit.locator('svg').boundingBox())!.width).toBe(16);
  await edit.focus(); await expect(page.getByRole('tooltip')).toHaveText('Edit organization address');
  await page.keyboard.press('Enter');
  for (const control of await page.locator('app-organization-settings input, app-organization-settings select').all()) {
    expect((await control.boundingBox())!.height).toBeCloseTo(40, 2);
    const box = (await control.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
  const save = page.locator('app-organization-settings button[type=submit]');
  const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
  await expect(save).toBeDisabled(); await expect(save).toHaveAttribute('data-variant', 'primary');
  await expect(cancel).toHaveAttribute('data-variant', 'secondary');
  await page.locator('#city').fill(''); await page.locator('#city').blur();
  await expect(page.getByText('Enter city.', { exact: true })).toBeVisible();
  await expect(page.locator('#city')).toHaveAttribute('aria-invalid', 'true');
  await page.screenshot({ path: artifacts + '/after-validation-' + width + '.png', fullPage: true });
  await cancel.click(); await expect(page.locator('#city')).toHaveValue(initial.address.city);
});

test('address saves only the existing versioned payload, preserves drafts on error and restores saved values', async ({ page }) => {
  let saved = structuredClone(initial); let fail = true; let release!: () => void;
  const writes: any[] = [];
  await page.route('**/auth/me', r => r.fulfill({ json: admin }));
  await page.route(api, r => r.fulfill({ json: saved }));
  await page.route(api + '/address', async r => {
    const body = r.request().postDataJSON(); writes.push(body);
    if (fail) { await new Promise<void>(resolve => { release = resolve; }); fail = false; return r.fulfill({ status: 400, json: { message: 'Review address details' } }); }
    const { version, ...address } = body; saved = { ...saved, addressVersion: version + 1, address };
    return r.fulfill({ json: saved });
  });
  await page.goto('/settings/organization');
  await expect(page.getByText(initial.organizationName, { exact: true })).toBeVisible();
  await expect(page.locator('[name=organizationName]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit organization address', exact: true }).click();
  await page.locator('#addressLine2').fill('');
  await page.locator('#city').fill('  Updated City  ');
  const save = page.locator('app-organization-settings button[type=submit]');
  await save.click(); await expect(save).toBeDisabled(); await expect(save).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
  expect(writes).toHaveLength(1);
  expect(writes[0]).toEqual({ ...initial.address, city: 'Updated City', addressLine2: '', version: 1 });
  expect(writes[0]).not.toHaveProperty('organizationName'); expect(writes[0]).not.toHaveProperty('organizationId');
  release(); await expect(page.getByRole('alert')).toContainText('Review address details');
  await expect(page.locator('#city')).toHaveValue('  Updated City  ');
  await expect(save).toBeEnabled(); await save.click();
  await expect(page.getByText('Organization address saved.', { exact: true })).toBeVisible();
  expect(writes).toHaveLength(2); expect(writes[1]).toEqual(writes[0]);
  await expect(page.locator('#city')).toHaveValue('Updated City');
  await expect(page.locator('#city')).toHaveAttribute('readonly', '');
  await page.reload(); await expect(page.locator('#zipCode')).toHaveValue('00123');
  await expect(page.locator('#city')).toHaveValue('Updated City');
  await page.getByRole('button', { name: 'Edit organization address', exact: true }).click();
  await page.locator('#city').fill('Discard this draft');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('#city')).toHaveValue('Updated City'); expect(writes).toHaveLength(2);
  await page.getByRole('button', { name: 'Edit organization address', exact: true }).click();
  await page.locator('#city').fill('Unsaved draft');
  page.once('dialog', d => d.dismiss());
  await page.getByRole('navigation', { name: 'Settings sections' }).getByRole('link', { name: 'Salary Components', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/organization$/); await expect(page.locator('#city')).toHaveValue('Unsaved draft');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
});

test('load error can retry and an empty address retains existing required and optional fields', async ({ page }) => {
  await page.route('**/auth/me', r => r.fulfill({ json: admin }));
  let failure = true;
  await page.route(api, r => { if (failure) return r.fulfill({ status: 503, json: {} }); return r.fulfill({ json: { ...initial, addressVersion: 0, address: { addressLine1:'', addressLine2:'', city:'', state:'', country:'', zipCode:'' } } }); });
  await page.goto('/settings/organization');
  await expect(page.getByRole('alert')).toContainText('could not complete'); failure = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText(initial.organizationName, { exact: true })).toBeVisible();
  await expect(page.locator('#country option')).toHaveCount(250);
  await page.getByRole('button', { name: 'Edit organization address', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await expect(page.locator('#addressLine2')).not.toHaveAttribute('required');
  for (const id of ['addressLine1','city','state','zipCode','country']) await expect(page.locator('#' + id)).toHaveAttribute('required');
});

for (const role of ['user','super_admin']) test('organization access boundary remains unchanged for ' + role, async ({ page }) => {
  let reads = 0;
  await page.route('**/auth/me', r => r.fulfill({ json: { ...admin, role } }));
  await page.route(api, r => { reads++; return r.fulfill({ json: initial }); });
  await page.route('http://localhost:3000/employees', r => r.fulfill({ json: [] }));
  await page.route('http://localhost:3000/platform/**', r => r.fulfill({ json: [] }));
  await page.goto('/settings/organization');
  await expect(page).toHaveURL(role === 'user' ? /\/$/ : /\/super-admin$/);
  expect(reads).toBe(0);
});

import { test, expect } from './authenticated-test';
import { mkdirSync } from 'node:fs';
const artifacts = 'artifacts/phase4a-employee-details';
mkdirSync(artifacts, { recursive: true });
const id = '507f1f77bcf86cd799439011';
const original = {
  _id: id, employeeId: 'EMP001', firstName: 'Ada', lastName: 'Example',
  email: 'ada.with.a.long.address@paystream.example.test', contactNumber: '+91 (98765) 43210',
  dateOfBirth: '1990-09-15', hireDate: '2020-01-01', annualCtc: 1000000,
  designation: '', payFrequency: 'Monthly', status: 'Active', city: 'Bengaluru',
  employmentHistory: [{ startDate: '2020-01-01', endDate: '2021-12-31', terminationReason: 'Retirement', explanation: 'Saved original period' }, { startDate: '2022-02-01' }],
};
const check = { employeeId: id, firstName: 'Ada', lastName: 'Example', period: '2026-09', paymentDate: '2026-10-05', grossPay: 125500.5, employerContributions: 7500, deductions: 12500.5, netPay: 113000, tds: 0, paymentStatus: 'Payment Pending' };

for (const width of [1440, 1280, 768, 390]) test(`Details and Pay Checks at ${width}px`, async ({ page }) => {
  const writes: string[] = [];
  page.on('request', req => { if (req.method() !== 'GET') writes.push(req.url()); });
  await page.route('**/employees', r => r.fulfill({ json: [original] }));
  await page.route('**/payroll/employees/*/checks', r => r.fulfill({ json: [check] }));
  {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/employees/' + id);
    const employment = page.getByRole('region', { name: 'Employment Information', exact: true });
    const personal = page.getByRole('region', { name: 'Personal Information', exact: true });
    await expect(employment.locator('.amount')).toHaveText('₹10,00,000');
    await expect(employment).toContainText('01 Jan 2020');
    await expect(personal).toContainText('15 Sep 1990');
    await expect(personal).toContainText(original.email);
    await expect(employment.locator('.optional-value')).toHaveText('—');
    await expect(page.locator('app-employment-history li')).toHaveCount(2);
    const [a, b] = await page.locator('.widgets').evaluate(grid => [...grid.querySelectorAll('app-profile-card')].slice(0, 2).map(card => { const r = card.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
    expect(a.width).toBeCloseTo(b.width, 3);
    if (width > 900) { expect(a.y).toBeCloseTo(b.y, 3); expect(a.height).toBeCloseTo(b.height, 3); }
    else expect(b.y).toBeGreaterThan(a.y + a.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${artifacts}/after-details-${width}.png`, fullPage: true });
    await page.getByRole('region', { name: 'Employment History', exact: true }).screenshot({ path: `${artifacts}/after-history-${width}.png` });
    await employment.getByRole('button', { name: 'Edit Employment Information', exact: true }).click();
    await employment.screenshot({ path: `${artifacts}/after-employment-edit-${width}.png` });
    await employment.getByRole('button', { name: 'Cancel Employment Information', exact: true }).click();
    await personal.getByRole('button', { name: 'Edit Personal Information', exact: true }).click();
    await personal.screenshot({ path: `${artifacts}/after-personal-edit-${width}.png` });
    await expect(personal.getByLabel('Contact Number', { exact: true })).toHaveValue(original.contactNumber);
    await expect(personal.getByLabel('Contact Number', { exact: true })).not.toHaveAttribute('required');
    for (const input of await personal.locator('input').all()) expect((await input.boundingBox())!.height).toBe(40);
    await expect(personal.locator('ps-form-field').filter({ has: page.locator('#profile-email') }).locator('.required')).toHaveText('*');
    await expect(personal.locator('ps-form-field').filter({ has: page.locator('#profile-contact') }).locator('.required')).toHaveCount(0);
    const cancel = personal.getByRole('button', { name: 'Cancel Personal Information', exact: true });
    const save = personal.getByRole('button', { name: 'Save Personal Information', exact: true });
    await expect(cancel).toHaveAttribute('data-variant', 'secondary');
    await expect(save).toHaveAttribute('data-variant', 'primary');
    expect((await cancel.boundingBox())!.x).toBeLessThan((await save.boundingBox())!.x);
    await cancel.click();
    const tabs = page.getByRole('tab', { name: 'Pay Checks', exact: true });
    expect((await tabs.boundingBox())!.height).toBe(40);
    await tabs.click();
    const table = page.getByRole('table', { name: 'Employee pay checks', exact: true });
    await expect(table.locator('tbody tr')).toHaveCount(1);
    const headers = table.getByRole('columnheader');
    await expect(headers.last()).toHaveText('Actions');
    expect((await headers.first().boundingBox())!.height).toBeCloseTo(44, 2);
    expect((await table.locator('tbody tr').boundingBox())!.height).toBeCloseTo(56, 2);
    await expect(table.locator('tbody td').nth(2)).toHaveText('₹1,25,500.50');
    await expect(table.locator('tbody td').nth(6).locator('ps-status-badge')).toHaveAttribute('data-tone', 'neutral');
    await page.screenshot({ path: `${artifacts}/after-checks-${width}.png`, fullPage: true });
    const tds = table.getByRole('button', { name: 'View TDS details', exact: true });
    await tds.scrollIntoViewIfNeeded(); await tds.click();
    const popover = page.getByRole('dialog', { name: 'Income Tax / TDS', exact: true });
    await expect(popover).toContainText('₹0.00');
    await page.screenshot({ path: `${artifacts}/after-tds-${width}.png`, fullPage: true });
    const box = (await popover.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    const download = table.getByRole('button', { name: 'Download Pay Check PDF', exact: true });
    await download.scrollIntoViewIfNeeded();
    const actionBox = (await download.boundingBox())!;
    expect(actionBox.x + actionBox.width).toBeLessThanOrEqual(width);
    expect(actionBox.width).toBe(32);
    expect(await download.locator('svg').evaluate(svg => svg.getBoundingClientRect().width)).toBe(16);
    expect(await table.locator('.num').first().evaluate(el => getComputedStyle(el).textAlign)).toBe('right');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(writes).toEqual([]);
  expect(original.annualCtc).toBe(1000000); expect(check.tds).toBe(0);
});

test('new card footers preserve validation, pending/error states, optional contact and isolated save payloads', async ({ page }) => {
  let saved: any = { ...original };
  const patches: any[] = []; let release!: () => void;
  await page.route('**/employees', r => r.fulfill({ json: [saved] }));
  await page.route('http://localhost:3000/employees/' + id, async r => {
    patches.push(r.request().postDataJSON());
    if (patches.length === 1) {
      await new Promise<void>(resolve => { release = resolve; });
      return r.fulfill({ status: 503, json: { message: 'Temporary failure' } });
    }
    saved = { ...saved, ...patches.at(-1) }; return r.fulfill({ json: saved });
  });
  await page.goto('/employees/' + id);
  const card = page.getByRole('region', { name: 'Personal Information', exact: true });
  await card.getByRole('button', { name: 'Edit Personal Information', exact: true }).click();
  const email = card.getByLabel('Email', { exact: true });
  const save = card.getByRole('button', { name: 'Save Personal Information', exact: true });
  await email.fill('bad'); await save.click();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(card.getByText('Enter a valid email address.', { exact: true })).toBeVisible();
  expect(patches).toEqual([]);
  await email.fill(original.email); await card.getByLabel('City', { exact: true }).fill('Updated City');
  await save.click(); await expect(save).toBeDisabled(); await expect(save).toHaveAttribute('aria-busy', 'true');
  await expect(email).toHaveAttribute('readonly');
  await expect(card.getByRole('button', { name: 'Cancel Personal Information', exact: true })).toBeDisabled();
  expect(patches).toHaveLength(1); release();
  await expect(card.getByRole('alert')).toContainText('could not complete');
  await expect(save).toBeEnabled();
  await expect(card.getByLabel('City', { exact: true })).toHaveValue('Updated City');
  await expect(card.getByLabel('Contact Number', { exact: true })).toHaveValue(original.contactNumber);
  await save.click();
  await expect(card.getByText('Personal information saved.', { exact: true })).toBeVisible();
  expect(patches).toHaveLength(2);
  expect(patches[1]).toEqual(patches[0]);
  expect(patches[1].contactNumber).toBe(original.contactNumber);
  for (const key of ['designation', 'annualCtc', 'payFrequency', 'hireDate', 'status', 'employmentHistory']) expect(patches[1]).not.toHaveProperty(key);
  await page.reload(); await expect(card).toContainText('Updated City'); await expect(card).toContainText(original.contactNumber);
});

test('Pay Checks empty and denied-PDF states keep the profile and saved amounts intact', async ({ page }) => {
  let history: any[] = []; const reads: string[] = [];
  await page.route('**/employees', r => r.fulfill({ json: [original] }));
  await page.route('**/payroll/employees/*/checks', r => { reads.push(r.request().url()); return r.fulfill({ json: history }); });
  await page.route('**/payroll/runs/*/checks/*/pdf', r => { reads.push(r.request().url()); return r.fulfill({ status: 403, json: {} }); });
  await page.goto('/employees/' + id + '?tab=checks');
  await expect(page.getByText('No finalized pay checks available.', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View Pay Check', exact: true })).toHaveCount(0);
  history = [check]; await page.reload();
  await page.getByRole('button', { name: 'View Pay Check', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('You do not have permission to view this pay check.');
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('app-pay-checks tbody td').nth(5)).toHaveText('₹1,13,000');
  expect(reads.filter(url => url.endsWith('/pdf'))).toHaveLength(1);
  await page.getByRole('tab', { name: 'Employee Details', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Employment Information', exact: true })).toContainText('₹10,00,000');
});

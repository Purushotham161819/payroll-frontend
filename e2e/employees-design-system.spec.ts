import { test, expect } from './authenticated-test';

const initial = () => [1000000, 75000, 125500.5].map((annualCtc, i) => ({
  _id: '507f1f77bcf86cd79943901' + i, employeeId: 'EMP00' + (i + 1),
  firstName: ['Ada', 'Grace', 'Alan'][i], lastName: 'Pilot', email: 'pilot' + i + '@example.test',
  dateOfBirth: '1990-09-15', hireDate: '2020-01-01', annualCtc,
  status: 'Active', payFrequency: 'Monthly', createdAt: '2026-10-30T18:00:00Z',
}));

test('Employees pilot renders the approved hierarchy, dimensions and display-only formatting', async ({ page }) => {
  const records = initial(); let reads = 0;
  await page.route('**/employees', r => { reads++; return r.fulfill({ json: records }); });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/');
  await expect(page.locator('td.number')).toHaveText(['₹10,00,000', '₹75,000', '₹1,25,500.50']);
  await expect(page.locator('th').last()).toHaveText('Actions');
  await expect(page.locator('ps-page-header button[data-variant=primary]')).toHaveCount(1);
  await expect(page.locator('#add-employee')).toHaveAttribute('data-variant', 'primary');
  await expect(page.getByRole('button', { name: 'Run Payroll', exact: true })).toHaveAttribute('data-variant', 'secondary');
  expect((await page.locator('tbody tr').first().boundingBox())?.height).toBe(56);
  expect((await page.locator('thead tr').boundingBox())?.height).toBe(44);
  const search = page.getByRole('searchbox', { name: 'Search employees' });
  expect((await search.boundingBox())?.width).toBe(320); expect((await search.boundingBox())?.height).toBe(40);
  const before = reads; await search.fill('missing');
  await expect(page.getByText('No employees match your search.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Clear employee search' }).click();
  await expect(search).toBeFocused(); await expect(page.locator('tbody tr')).toHaveCount(3);
  expect(reads).toBe(before); expect(records.map(e => e.annualCtc)).toEqual([1000000, 75000, 125500.5]);
  await page.route('**/salary-components', r => r.fulfill({ json: [] }));
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const generate = page.getByRole('button', { name: 'Generate Payroll', exact: true });
  await generate.click(); await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(generate).toBeFocused();
  expect(errors).toEqual([]);
});

test('existing deletion preserves cancellation, server errors, retry payload and refresh', async ({ page }) => {
  let records = initial(); let deletes = 0; let fail = true;
  await page.route('**/employees**', async route => {
    const req = route.request();
    if (req.method() === 'GET') return route.fulfill({ json: records });
    expect(req.method()).toBe('DELETE'); expect(req.url()).toContain('/employees/' + records[0]._id);
    deletes++;
    if (fail) return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
    records = records.slice(1); return route.fulfill({ json: { message: 'Employee deleted successfully.' } });
  });
  await page.goto('/');
  async function openDelete() {
    await page.getByRole('button', { name: 'Actions for Ada Pilot' }).click();
    await page.getByRole('menuitem', { name: 'Delete employee Ada Pilot' }).click();
  }
  await openDelete(); await page.getByRole('button', { name: 'Cancel', exact: true }).click(); expect(deletes).toBe(0);
  await openDelete(); await page.getByRole('button', { name: 'Confirm Delete', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('The server could not complete your request');
  expect(deletes).toBe(1); fail = false;
  await page.getByRole('button', { name: 'Confirm Delete', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByRole('cell', { name: 'EMP001', exact: true })).toHaveCount(0);
  await expect(page.locator('tbody tr')).toHaveCount(2); expect(deletes).toBe(2);
  await expect(page.getByText('Employee deleted successfully.', { exact: true })).toBeVisible();
});

test('responsive layout preserves every action and native CDK menu keyboard semantics', async ({ page }) => {
  await page.route('**/employees', r => r.fulfill({ json: initial() })); await page.goto('/');
  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const action = page.getByRole('button', { name: 'Actions for Ada Pilot' });
    await action.scrollIntoViewIfNeeded(); expect((await action.boundingBox())?.width).toBe(32);
    await action.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(page.getByRole('menuitem')).toHaveText(['Edit', 'Delete', 'Terminate', 'Employment history']);
    await page.keyboard.press('Escape'); await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(action).toBeFocused();
  }
});

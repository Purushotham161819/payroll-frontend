import { test, expect } from './authenticated-test';
import { mkdirSync } from 'node:fs';
test.setTimeout(60000);
const before = process.env.CAPTURE_CONTRACTOR_STATUS_BEFORE === '1';
const screenshotRoot = process.env.CONTRACTOR_STATUS_SCREENSHOT_ROOT ?? 'artifacts/contractor-status/screenshots';
const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
async function fixture(page: any, role = 'admin') {
  let rows: any[] = ids.map((_id, i) => ({ _id, contractorId: 'CON00' + (i + 1), firstName: ['Ada', 'Grace'][i], lastName: 'Consultant', email: ['ada', 'grace'][i] + '@example.test', componentIds: [], version: 0, status: 'Active' }));
  const history: Record<string, any[]> = Object.fromEntries(rows.map((c, i) => [c._id, [{ paymentId: 'CPAY00' + (i + 1), contractorId: c._id, contractorCode: c.contractorId, firstName: c.firstName, lastName: c.lastName, email: c.email, paymentDate: '2026-11-03', description: 'November services', grossPay: 50000, components: [{ componentId: 'retention', name: 'Retention', classification: 'deduction', amount: 5000, calculationType: 'percentage', calculationValue: 10 }], calculationVersion: 2, totalDeductions: 5000, netPayment: 45000, status: 'Recorded' }]]));
  let deletes = 0, failDelete = false;
  await page.route('**/auth/me', (r: any) => r.fulfill({ json: { id: 'qa', role, organizationId: 'ORG000901' } }));
  await page.route('http://localhost:3000/contractors**', (r: any) => {
    const req = r.request(), path = new URL(req.url()).pathname.replace('/contractors', '');
    if (path === '/components') return r.fulfill({ json: [] });
    if (!path) return r.fulfill({ json: rows });
    const id = path.split('/')[1], c = rows.find(c => c._id === id);
    if (!c) return r.fulfill({ status: 404, json: { message: 'Contractor not found.' } });
    if (path.endsWith('/payments')) return r.fulfill({ json: history[id] ?? [] });
    if (req.method() === 'DELETE') {
      deletes++;
      if (failDelete) return r.fulfill({ status: 503, json: { message: 'Safe contractor deletion requires MongoDB transactions (a replica set or sharded deployment). No records were changed.' } });
      rows = rows.filter(c => c._id !== id); delete history[id]; return r.fulfill({ json: { deleted: true } });
    }
    if (req.method() === 'PATCH') Object.assign(c, req.postDataJSON(), { version: c.version + 1 });
    return r.fulfill({ json: c });
  });
  return { rows: () => rows, deletes: () => deletes, fail: (v: boolean) => failDelete = v };
}
for (const width of [1440, 1280, 768, 390]) test('Contractor status and directory workflow ' + width, async ({ page }) => {
  const state = await fixture(page);
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const dir = `${screenshotRoot}/${before ? 'before' : 'after'}`;
  mkdirSync(dir, { recursive: true });
  const shot = async (name: string) => { await page.mouse.move(0, 0); if(!before)await expect(page.locator('ps-tooltip-panel')).toHaveCount(0); await page.screenshot({ path: `${dir}/${name}-${width}.png`, fullPage: true }); };
  await page.goto('/contractors');
  await expect(page.getByRole('link', { name: 'Ada', exact: true })).toBeVisible();
  await shot('directory');
  if (!before) {
    const filter = page.getByRole('combobox', { name: 'Contractor Status', exact: true });
    await expect(filter.locator('option')).toHaveText(['All', 'Active', 'Inactive']);
    const row = page.getByRole('table', { name: 'Contractor directory', exact: true }).locator('tbody tr').first();
    const weights = await row.locator('td').evaluateAll(cells => cells.slice(1, 3).map(c => getComputedStyle(c.querySelector('a')!).fontWeight));
    expect(Number(weights[0])).toBeGreaterThan(Number(weights[1]));
    await page.getByRole('button', { name: 'Actions for Ada Consultant', exact: true }).click();
    await expect(page.getByRole('menu')).toBeVisible(); await shot('kebab');
    await page.getByRole('menuitem', { name: 'Edit Contractor Ada Consultant', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Edit Contractor', exact: true })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  }
  await page.goto('/contractors/' + ids[0]);
  await expect(page.getByRole('tabpanel')).toContainText('Contractor Payment Components');
  await shot('profile');
  if (!before) {
    const cards = page.getByRole('tabpanel').locator(':scope > ps-card');
    const a = await cards.nth(0).boundingBox(), b = await cards.nth(1).boundingBox();
    if (width >= 1280) { expect(Math.abs(a!.height - b!.height)).toBeLessThan(2); expect(Math.abs(a!.y - b!.y)).toBeLessThan(2); expect(Math.abs(a!.width - b!.width)).toBeLessThan(2); }
    await page.getByRole('button', { name: 'Edit Contractor Status', exact: true }).click();
    const status = page.getByRole('combobox', { name: 'Contractor Status', exact: true });
    await status.selectOption('Inactive'); await shot('status-edit');
    await page.getByRole('button', { name: 'Cancel Status', exact: true }).click();
    expect(state.rows()[0].status).toBe('Active');
    await page.getByRole('button', { name: 'Edit Contractor Status', exact: true }).click();
    await status.selectOption('Inactive'); await page.getByRole('button', { name: 'Save Status', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('status saved');
    await page.reload(); await expect(cards.nth(0)).toContainText('Inactive'); await shot('inactive-profile');
  }
  await page.getByRole('tab', { name: 'Payments', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Contractor payments', exact: true })).toContainText('November services');
  await shot('payments');
  if (!before) {
    await expect(page.getByRole('button', { name: 'Pay Contractor', exact: true })).toBeDisabled();
    await expect(page.getByRole('tabpanel')).toContainText('Inactive contractors cannot receive new payments.');
  }
  await page.getByRole('button', { name: 'View payment CPAY001', exact: true }).click();
  const detail = page.getByRole('dialog', { name: 'Payment CPAY001', exact: true });
  await expect(detail).toContainText('45,000'); await shot('payment-detail');
  if (!before) {
    await expect(detail).toContainText('Contractor First Name'); await expect(detail).toContainText('Contractor Last Name');
    await expect(detail.getByRole('button', { name: 'Close Payment Details', exact: true })).toHaveCount(0);
    await expect(page.getByRole('tooltip', { name: 'Close', exact: true })).toHaveCount(0);
    await expect(detail.getByRole('button', { name: 'Close', exact: true })).toHaveCount(1);
  }
  await page.keyboard.press('Escape');
  if (before) return;
  await page.goto('/contractors');
  const filter = page.getByRole('combobox', { name: 'Contractor Status', exact: true });
  await filter.selectOption('Inactive'); await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);
  await page.reload(); await expect(filter).toHaveValue('Inactive');
  await page.getByRole('searchbox', { name: 'Search contractors', exact: true }).fill('Grace');
  await expect(page.getByRole('status')).toContainText('No contractors found');
  await page.getByRole('searchbox', { name: 'Search contractors', exact: true }).fill('');
  await page.getByRole('button', { name: 'Refresh Contractors', exact: true }).click(); await expect(filter).toHaveValue('Inactive'); await shot('filter');
  await page.getByRole('button', { name: 'Actions for Ada Consultant', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'Pay Contractor Ada Consultant', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Pay Contractors', exact: true }).click();
  const pay = page.getByRole('dialog', { name: 'Pay Contractors', exact: true });
  await expect(pay.getByRole('checkbox', { name: 'Select Ada Consultant', exact: true })).toBeDisabled();
  await expect(pay).toContainText('Inactive contractors cannot receive new payments.');
  await pay.getByRole('checkbox', { name: 'Select all eligible contractors', exact: true }).check();
  await expect(pay.getByRole('checkbox', { name: 'Select Grace Consultant', exact: true })).toBeChecked(); await shot('inactive-payment');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Actions for Ada Consultant', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Delete Contractor Ada Consultant', exact: true }).click();
  const remove = page.getByRole('dialog', { name: 'Delete Contractor', exact: true });
  await expect(remove).toContainText('Deleting this contractor will permanently delete the contractor record and all associated payment records. This action cannot be undone.');
  await shot('delete-confirmation'); expect(state.deletes()).toBe(0);
  await remove.getByRole('button', { name: 'Cancel', exact: true }).click(); expect(state.deletes()).toBe(0);
  await page.getByRole('button', { name: 'Actions for Ada Consultant', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Delete Contractor Ada Consultant', exact: true }).click();
  state.fail(true); await remove.getByRole('button', { name: 'Delete Contractor', exact: true }).click();
  await expect(remove.getByRole('alert')).toContainText('No records were changed');
  state.fail(false); await remove.getByRole('button', { name: 'Delete Contractor', exact: true }).click();
  await expect(remove).toHaveCount(0); expect(state.rows()).toHaveLength(1);
  await filter.selectOption('All'); await expect(page.getByRole('table')).toContainText('Grace');
});

test('Ordinary members cannot change status or delete; active Payments tab uses the existing form', async ({ page }) => {
  test.skip(before, 'Before-only capture');
  await fixture(page, 'user'); await page.goto('/contractors');
  await page.getByRole('button',{name:'Add Contractor',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('combobox',{name:'Contractor Status',exact:true})).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button', { name: 'Actions for Ada Consultant', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'Delete Contractor Ada Consultant', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape'); await page.goto('/contractors/' + ids[0]);
  await expect(page.getByRole('button', { name: 'Edit Contractor Status', exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Payments', exact: true }).click();
  await page.setViewportSize({width:1440,height:1000});
  await page.mouse.move(0,0);
  mkdirSync(screenshotRoot+'/after',{recursive:true});
  await page.screenshot({path:screenshotRoot+'/after/payments-active-1440.png',fullPage:true});
  await page.getByRole('button', { name: 'Pay Contractor', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Pay Contractor', exact: true });
  await expect(form.getByRole('checkbox', { name: 'Select Ada Consultant', exact: true })).toBeChecked();
  await expect(form.getByRole('table').locator('tbody tr')).toHaveCount(1);
});

test('Contractor directory reuses the rendered Employee Directory metrics', async ({ page }) => {
  test.skip(before, 'Before-only capture');
  await fixture(page); await page.setViewportSize({width:1440,height:1000});
  await page.route('http://localhost:3000/employees**', r=>r.fulfill({json:[{_id:ids[0],employeeId:'EMP001',firstName:'Ada',lastName:'Consultant',email:'ada@example.test',annualCtc:1200000,status:'Active'}]}));
  await page.route('http://localhost:3000/salary-components**', r=>r.fulfill({json:[]}));
  const metrics = async (kind:'employee'|'contractor') => {
    const label=kind==='employee'?'Employee Status':'Contractor Status';
    const native=page.locator(kind==='employee'?'#employee-status':'#contractor-status-filter');
    const select=page.getByRole('combobox',{name:label,exact:true}); await expect(select).toBeVisible();
    const input=page.getByRole('searchbox',{name:kind==='employee'?'Search employees':'Search contractors',exact:true});
    const table=page.locator('table.ps-table').first();await expect(table.locator('tbody tr')).not.toHaveCount(0);
    const css=async(locator:any,keys:string[])=>locator.evaluate((e:HTMLElement,ks:string[])=>Object.fromEntries(ks.map(k=>[k,getComputedStyle(e).getPropertyValue(k)])),keys);
    return {filter:await css(select,['height','width','font-family','font-size','border-radius']),search:await css(input,['height','width','font-family','font-size']),header:await css(table.locator('th').first(),['height','font-family','font-size','font-weight','color','background-color','padding']),row:await css(table.locator('tbody td').first(),['height','padding','font-family','font-size']),firstName:await css(table.locator('td.name a').first(),['font-weight']),nativeCount:await native.count()};
  };
  await page.goto('/');const employee=await metrics('employee');
  const dir=screenshotRoot+'/reference';mkdirSync(dir,{recursive:true});await page.screenshot({path:dir+'/employee-directory-1440.png',fullPage:true});
  await page.goto('/contractors');const contractor=await metrics('contractor');
  expect(contractor).toEqual(employee);
});

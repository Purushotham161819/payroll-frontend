import { test, expect } from './authenticated-test';
import { mkdirSync } from 'node:fs';

const root = process.env.CONTRACTOR_UI_SCREENSHOT_ROOT ?? 'artifacts/contractor-status/previous-ui-regression';
const before = process.env.CAPTURE_CONTRACTOR_BEFORE === '1';
const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
const componentId = '507f1f77bcf86cd799439021';
async function setup(page: any) {
  const contractors = ids.map((_id, i) => ({ _id, contractorId: 'CON00' + (i + 1), firstName: ['Ada', 'Grace'][i], lastName: 'Consultant', email: ['ada', 'grace'][i] + '@example.test', componentIds: i ? [] : [componentId], version: 0 }));
  const components = [{ _id: componentId, name: 'Retention', code: 'RETAIN', classification: 'deduction', status: 'active', calculationType: 'percentage', calculationValue: 10, version: 0 }];
  const history: Record<string, any[]> = {};
  const writes: any[] = [];
  await page.route('**/auth/me', (r: any) => r.fulfill({ json: { id: 'qa', role: 'admin', organizationId: 'ORG000901' } }));
  await page.route('http://localhost:3000/contractors**', (r: any) => {
    const req = r.request(), path = new URL(req.url()).pathname.replace('/contractors', '');
    if (path === '/components') return r.fulfill({ json: components });
    if (path === '/payments') {
      const body = req.postDataJSON(); writes.push(body);
      for (const [i, e] of body.entries.entries()) {
        const c = contractors.find(c => c._id === e.contractorId)!;
        const deduction = c.componentIds.length ? Math.round(e.grossPay * 10) / 100 : 0;
        (history[c._id] ??= []).push({ ...c, contractorId: c._id, contractorCode: c.contractorId, paymentId: 'CPAY00' + (i + 1), paymentDate: body.paymentDate, description: e.description, grossPay: e.grossPay, components: [], totalDeductions: deduction, netPayment: e.grossPay - deduction, status: 'Recorded', calculationVersion: 2 });
      }
      return r.fulfill({ status: 201, json: { entries: body.entries } });
    }
    if (!path) return r.fulfill({ json: contractors });
    const c = contractors.find(c => c._id === path.split('/')[1])!;
    if (path.endsWith('/payments')) return r.fulfill({ json: history[c._id] ?? [] });
    if (req.method() === 'PATCH') {
      const body = req.postDataJSON(); Object.assign(c, body, { version: c.version + 1 });
    }
    return r.fulfill({ json: c });
  });
  return { contractors, writes };
}

for (const width of [1440, 1280, 768, 390]) test('Contractor UI refinements ' + width, async ({ page }) => {
  const state = await setup(page);
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const dir = `${root}/${before ? 'before' : 'after'}`;
  mkdirSync(dir, { recursive: true });
  const shot = async (name: string) => {
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${dir}/${name}-${width}.png`, fullPage: true });
  };
  await page.goto('/contractors');
  await expect(page.getByRole('link', { name: 'Ada', exact: true })).toBeVisible();
  await shot('directory');
  if (!before) {
    const table = page.getByRole('table', { name: 'Contractor directory', exact: true });
    await expect(table.getByRole('columnheader')).toHaveText(['Contractor ID', 'First Name', 'Last Name', 'Email', 'Contractor Status', 'Actions']);
    await expect(table).toContainText('CON001');
    await page.getByRole('button', { name: 'Actions for Ada Consultant', exact: true }).click();
    await expect(page.getByRole('menuitem', { name: 'Delete Contractor Ada Consultant', exact: true })).toBeEnabled();
    await page.getByRole('menuitem', { name: 'Edit Contractor Ada Consultant', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Edit Contractor', exact: true })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search contractors', exact: true }).fill('CON002');
    await expect(table.locator('tbody tr')).toHaveCount(1);
    await page.getByRole('searchbox', { name: 'Search contractors', exact: true }).fill('');
    await page.getByRole('button', { name: 'Refresh Contractors', exact: true }).click();
    await expect(table.locator('tbody tr')).toHaveCount(2);
  }
  await page.getByRole('button', { name: 'Pay Contractors', exact: true }).click();
  const pay = page.getByRole('dialog', { name: 'Pay Contractors', exact: true });
  await expect(pay.getByRole('table').locator('tbody tr')).toHaveCount(2);
  await pay.getByRole('textbox', { name: 'Payment Date', exact: true }).fill('2026-11-03');
  await pay.getByRole('spinbutton', { name: 'Gross Pay for Ada Consultant', exact: true }).fill('50000');
  await pay.getByRole('spinbutton', { name: 'Gross Pay for Grace Consultant', exact: true }).fill('20000');
  await pay.getByRole('checkbox', { name: 'Select all eligible contractors', exact: true }).check();
  if (before) await pay.getByRole('textbox', { name: 'Description', exact: true }).fill('November services');
  else {
    const ada = pay.getByRole('textbox', { name: 'Description for Ada Consultant', exact: true });
    const grace = pay.getByRole('textbox', { name: 'Description for Grace Consultant', exact: true });
    await ada.fill('Ada invoice'); await grace.fill('Grace invoice');
    await pay.getByRole('checkbox', { name: 'Select Grace Consultant', exact: true }).uncheck();
    await expect(grace).toHaveValue('Grace invoice');
    await pay.getByRole('checkbox', { name: 'Select Grace Consultant', exact: true }).check();
    const date = await pay.getByRole('textbox', { name: 'Payment Date', exact: true }).boundingBox();
    expect(date!.width).toBeLessThanOrEqual(200); expect(date!.height).toBeLessThan(40);
    const gross = await pay.getByRole('spinbutton', { name: 'Gross Pay for Ada Consultant', exact: true }).boundingBox();
    expect(gross!.width).toBeLessThanOrEqual(180); expect(gross!.height).toBeLessThan(40);
    const cards = pay.locator('ps-kpi-card');
    for (let i = 0; i < 2; i++) {
      const card = await cards.nth(i).boundingBox(); expect(card!.width).toBeLessThanOrEqual(240); expect(card!.height).toBeLessThan(90);
    }
  }
  await shot('payment');
  if (!before) {
    await pay.getByRole('button', { name: 'Submit', exact: true }).click();
    const confirm = page.getByRole('dialog', { name: 'Confirm Payments', exact: true });
    await expect(confirm).toContainText('Ada invoice'); await expect(confirm).toContainText('Grace invoice');
    expect(state.writes).toHaveLength(0); await shot('confirmation');
    await confirm.getByRole('button', { name: 'Confirm Payments', exact: true }).click();
    expect(state.writes[0].entries.map((e: any) => e.description)).toEqual(['Ada invoice', 'Grace invoice']);
    expect(state.writes[0].description).toBeUndefined();
    await page.goto('/contractors/' + ids[1] + '?tab=payments');
    await expect(page.getByRole('table', { name: 'Contractor payments', exact: true })).toContainText('Grace invoice');
    await shot('history');
  } else await page.keyboard.press('Escape');
  await page.goto('/contractors/' + ids[0]);
  const details = page.getByRole('tabpanel');
  await expect(details).toContainText('Contractor Payment Components');
  await shot('profile');
  if (!before) {
    const choice = page.getByRole('checkbox', { name: 'Retention — Deductions', exact: true });
    await expect(choice).toBeDisabled(); await expect(choice).toBeChecked();
    await expect(page.getByRole('button', { name: 'Save Components', exact: true })).toHaveCount(0);
    const cards = details.locator(':scope > ps-card');
    const left = await cards.nth(0).boundingBox(), right = await cards.nth(1).boundingBox();
    if (width >= 1280) { expect(Math.abs(left!.y - right!.y)).toBeLessThan(2); expect(right!.x).toBeGreaterThan(left!.x); }
    else expect(right!.y).toBeGreaterThan(left!.y);
    await page.getByRole('button', { name: 'Edit Contractor Payment Components', exact: true }).click();
    await expect(choice).toBeEnabled(); await choice.uncheck(); await shot('components-edit');
    await details.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(choice).toBeChecked(); await expect(choice).toBeDisabled();
    await page.getByRole('button', { name: 'Edit Contractor Payment Components', exact: true }).click();
    await choice.uncheck(); await page.getByRole('button', { name: 'Save Components', exact: true }).click();
    await expect(choice).toBeDisabled(); await expect(choice).not.toBeChecked();
    await page.reload(); await expect(choice).not.toBeChecked();
    await page.goto('/contractors');
    await page.getByRole('button', { name: 'Actions for Ada Consultant', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Pay Contractor Ada Consultant', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Pay Contractor', exact: true }).getByRole('table').locator('tbody tr')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

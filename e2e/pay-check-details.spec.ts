import { test, expect } from './authenticated-test';
import { jsPDF } from 'jspdf';
const id = '507f1f77bcf86cd799439011';
test('stored TDS overlay, icon actions, unchanged PDF bytes and monthly spacing work on desktop and mobile', async ({
  page,
}, testInfo) => {
  const employee = {
    _id: id,
    employeeId: 'EMP001',
    firstName: 'Ada',
    lastName: 'Example',
    email: 'ada@example.test',
    dateOfBirth: '1990-01-01',
    hireDate: '2020-01-01',
    annualCtc: 1200000,
  };
  const records = ['2026-11', '2026-10', '2026-09'].map((period, i) => ({
    employeeId: id,
    firstName: 'Ada',
    lastName: 'Example',
    period,
    paymentDate: period + '-28',
    grossPay: 200000,
    employerContributions: 10000,
    deductions: 150000,
    netPay: 50000,
    ...(i === 0 ? { tds: 123456.78 } : i === 1 ? { tds: 0 } : {}),
  }));
  let historyReads = 0,
    pdfReads = 0;
  const doc = new jsPDF();
  doc.text('Stored immutable QA pay check', 20, 20);
  const bytes = Buffer.from(doc.output('arraybuffer'));
  await page.route('http://localhost:3000/employees', (r) => r.fulfill({ json: [employee] }));
  await page.route('**/payroll/employees/*/checks', (r) => {
    historyReads++;
    return r.fulfill({ json: records });
  });
  await page.route('**/payroll/runs/*/checks/*/pdf', (r) => {
    pdfReads++;
    return r.fulfill({ contentType: 'application/pdf', body: bytes });
  });
  await page.goto('/employees/' + id + '?tab=checks');
  const rows = page.locator('app-pay-checks tbody tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('Nov 2026');
  await expect(rows.nth(1)).toContainText('Oct 2026');
  await expect(rows.nth(2)).toContainText('Sep 2026');
  await expect(page.locator('app-pay-checks tbody')).not.toContainText('Income Tax / TDS:');
  for (const name of ['View Pay Check', 'Download Pay Check PDF']) {
    const button = rows.first().getByRole('button', { name, exact: true });
    await expect(button).toHaveAttribute('title', name);
    expect((await button.textContent())?.trim()).toBe('');
    await expect(button.locator('svg')).toBeVisible();
  }
  const trigger = rows.first().getByRole('button', { name: 'View TDS details', exact: true });
  const popover = page.getByRole('dialog', { name: 'Income Tax / TDS', exact: true });
  await trigger.click();
  await expect(popover).toContainText('₹1,23,456.78');
  expect(await popover.evaluate((el) => !!el.closest('.cdk-overlay-container'))).toBe(true);
  await trigger.click();
  await expect(popover).toHaveCount(0);
  await trigger.click();
  await page.getByRole('heading', { name: 'Ada Example', exact: true }).click();
  await expect(popover).toHaveCount(0);
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(popover).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(popover).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await rows.nth(1).getByRole('button', { name: 'View TDS details' }).click();
  await expect(popover).toContainText('₹0.00');
  await page.keyboard.press('Escape');
  await rows.nth(2).getByRole('button', { name: 'View TDS details' }).click();
  await expect(popover).toContainText('not recorded');
  expect(historyReads).toBe(1);
  expect(pdfReads).toBe(0);
  await page.keyboard.press('Escape');
  await rows.first().getByRole('button', { name: 'View Pay Check', exact: true }).click();
  const viewer = page.getByRole('dialog', { name: 'Pay Check - Nov 2026', exact: true });
  await expect(viewer.locator('iframe')).toHaveAttribute('src', /^blob:/);
  const viewed = await viewer
    .locator('iframe')
    .evaluate(async (frame) =>
      Array.from(
        new Uint8Array(await (await fetch((frame as HTMLIFrameElement).src)).arrayBuffer()),
      ),
    );
  expect(Buffer.from(viewed)).toEqual(bytes);
  await viewer.getByRole('button', { name: 'Close pay check viewer' }).click();
  const download = page.waitForEvent('download');
  await rows.first().getByRole('button', { name: 'Download Pay Check PDF', exact: true }).click();
  const downloaded = await download;
  expect(downloaded.suggestedFilename()).toBe('Payslip_2026-11_' + id + '.pdf');
  const fs = await import('node:fs');
  expect(fs.readFileSync((await downloaded.path())!)).toEqual(bytes);
  expect(pdfReads).toBe(2);
  expect(await rows.first().evaluate(el => el.getBoundingClientRect().height)).toBeCloseTo(56, 2);
  await expect(rows.first().locator('td').nth(5)).toHaveText('\u20b950,000');
  await page.setViewportSize({ width: 390, height: 844 });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await expect(popover).toContainText('₹1,23,456.78');
  const box = await popover.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('tds-popover-mobile.png'), fullPage: true });
});

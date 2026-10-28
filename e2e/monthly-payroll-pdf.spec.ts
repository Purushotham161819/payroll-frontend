import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('monthly PDF labels, rounded values, totals and download derive from annual results', async ({
  page,
}) => {
  const annual = {
    annualCtc: 108100,
    employerEpsContribution: 4000,
    employerEpfContribution: 2000,
    employerEsiContribution: 2100,
    annualGrossWages: 100000,
    annualBasicSalary: 40000,
    annualDearnessAllowance: 4000,
    annualRetainingAllowance: 6000,
    annualCoreWages: 50000,
    annualTotalAllowances: 70000,
    annualExcessAllowance: 20000,
    annualComplianceWageBase: 70000,
    annualNetPay: 100000,
  };
  const employees = [0, 1].map((i) => ({
    employee: {
      firstName: 'Monthly',
      lastName: 'Employee ' + i,
      ...(i ? { payFrequency: 'Monthly' } : {}),
    },
    calculation: { annual },
  }));
  await page.route('**/employees', (r) => r.fulfill({ json: [] }));
  await page.route('**/payroll/annual', (r) => r.fulfill({ json: { employees } }));
  await page.route('**/salary-components',r=>r.fulfill({json:[{_id:'basic',code:'BASIC',name:'Basic',category:'earning',status:'active',isSystemDefined:true}]}));
  await page.goto('/');
  await page.getByRole('button', { name: 'Generate Payroll', exact: true }).click();
  await page.getByLabel('Report Type', { exact: true }).selectOption('Monthly');
  await page.getByLabel('Payroll Month', { exact: true }).selectOption({ index: 1 });
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate PDF', exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toContain('Monthly_Payroll_Report_January_');
  const bytes = await readFile((await download.path())!);
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++)
    text += (await (await pdf.getPage(i)).getTextContent()).items
      .map((item: any) => item.str ?? '')
      .join(' ');
  expect(text).toContain('Monthly Payroll Report');
  expect(text).toContain('All amounts monthly');
  expect(text).toContain('Monthly CTC');
  expect(text).not.toContain('Annual Payroll Report');
  expect(text).toContain('Total');
  const currency = (n: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      n,
    );
  for (const value of Object.values(annual)) {
    const monthly = Number((value / 12).toFixed(2));
    expect(text).toContain(currency(monthly));
    expect(text).toContain(currency(Number((monthly * 2).toFixed(2))));
  }
  await pdf.cleanup();
});

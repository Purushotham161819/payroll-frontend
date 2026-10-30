import { test, expect } from './authenticated-test';
import { jsPDF } from 'jspdf';
test('one payroll table restores period dates, scopes annual/monthly KPIs and protects paid and submitted rows', async ({
  page,
}) => {
  const year = new Date().getFullYear();
  const first = `${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const second = first.endsWith('-01') ? `${year}-02` : `${year}-01`;
  const firstDate = `${year}-12-15`,
    secondDate = `${year}-11-05`,
    updatedDate = `${year}-12-20`;
  const people = ['Ada', 'Grace', 'Pending', 'Paid'].map((firstName, i) => ({
    _id: `507f1f77bcf86cd79943901${i}`,
    firstName,
    lastName: 'Example',
    employeeId: `EMP00${i + 1}`,
    email: `unified-${i}@example.test`,
    dateOfBirth: '1990-01-01',
    hireDate: '2020-01-01',
    status: 'Active',
    payFrequency: 'Monthly',
    annualCtc: i === 0 ? 100000.01 : i === 1 ? 200000.02 : 999999,
  }));
  const check = (id: string) => {
    const person = people.find((p) => p._id === id)!;
    return {
      employeeId: id,
      firstName: person.firstName,
      lastName: person.lastName,
      annualCtc: person.annualCtc,
      monthlyCtc: Number((person.annualCtc / 12).toFixed(2)),
      grossPay: 100,
      employerContributions: 10,
      deductions: 5,
      netPay: 95,
      paymentStatus: 'Not Paid',
    };
  };
  const historical = [
    {
      ...check(people[2]._id),
      annualCtc: 120000,
      monthlyCtc: 10000,
      paymentStatus: 'Payment Pending',
      payrollStatus: 'Submitted',
      pdfUrl: '/protected',
    },
    {
      ...check(people[3]._id),
      annualCtc: 240000,
      monthlyCtc: 20000,
      paymentStatus: 'Paid',
      payrollStatus: 'Submitted',
      pdfUrl: '/protected',
    },
  ];
  const drafts = new Map<string, { ids: string[]; date: string | null; version: number }>([
    [first, { ids: [people[0]._id], date: firstDate, version: 3 }],
    [second, { ids: [people[0]._id], date: secondDate, version: 1 }],
  ]);
  const summary = (period: string, ids: string[], date: string | null, version: number) => {
    const history = period === first ? historical : [];
    const checks = ids.filter((id) => !history.some((h) => h.employeeId === id)).map(check);
    return {
      period,
      organizationName: 'Example Organization',
      status: 'Draft',
      checks,
      historicalChecks: history,
      processedEmployeeIds: history.map((h) => h.employeeId),
      draftSaved: true,
      version,
      paymentDate: date,
      calculatedAt: new Date().toISOString(),
      calculationVersion: 'v1',
      inputHash: 'trusted-hash',
      employeeCompensation: people.map(p => ({employeeId:p._id, payFrequency:'Monthly', monthlyCtc:Number((p.annualCtc/12).toFixed(2))})),
      totalPayrollCost: Number(checks.reduce((s, c) => s + c.monthlyCtc, 0).toFixed(2)),
      totals: {
        employerContributions: checks.length * 10,
        deductions: checks.length * 5,
        netPay: checks.length * 95,
      },
    };
  };
  let previewWrites = 0,
    submits = 0,
    submitted: any = null;
  await page.route('**/employees', (r) => r.fulfill({ json: people }));
  await page.route('**/payroll/runs/preview', (r) => {
    const body = r.request().postDataJSON();
    const saved = drafts.get(body.period);
    return r.fulfill({
      json: summary(
        body.period,
        !body.recalculate && saved ? saved.ids : body.employeeIds,
        saved?.date ?? null,
        saved?.version ?? 2,
      ),
    });
  });
  await page.route('**/payroll/runs/draft', (r) => {
    const body = r.request().postDataJSON();
    previewWrites++;
    expect(body).not.toHaveProperty('totalPayrollCost');
    expect(body.employeeIds).not.toContain(people[2]._id);
    expect(body.employeeIds).not.toContain(people[3]._id);
    const draft = { ids: body.employeeIds, date: body.paymentDate, version: body.version + 1 };
    drafts.set(body.period, draft);
    return r.fulfill({ json: summary(body.period, draft.ids, draft.date, draft.version) });
  });
  await page.route('**/payroll/runs/*/submit', (r) => {
    const body = r.request().postDataJSON();
    submits++;
    const draft = drafts.get(first)!;
    expect(draft.ids).toEqual([people[1]._id]);
    expect(body.paymentDate).toBe(updatedDate);
    submitted = {
      ...summary(first, draft.ids, draft.date, draft.version + 1),
      status: 'Submitted',
      idempotencyKey: body.idempotencyKey,
      submittedAt: new Date().toISOString(),
      checks: draft.ids.map((id) => ({
        ...check(id),
        paymentStatus: 'Payment Pending',
        pdfUrl: '/protected',
      })),
    };
    return r.fulfill({ json: submitted });
  });
  await page.route(/\/payroll\/runs\/\d{4}-\d{2}(?:\?.*)?$/, (r) => r.fulfill({ json: submitted }));
  const doc = new jsPDF();
  doc.text('Original historical payslip - unchanged', 15, 20);
  const bytes = Buffer.from(doc.output('arraybuffer'));
  await page.route('**/payroll/runs/*/checks/*/pdf', (r) => {
    expect(r.request().url()).toContain(people[2]._id);
    return r.fulfill({ contentType: 'application/pdf', body: bytes });
  });
  await page.goto(`/payroll/run?employees=${people[1]._id}&returnStatus=All`);
  await expect(page.getByRole('table')).toHaveCount(1);
  await expect(page.locator('details')).toHaveCount(0);
  await expect(page.getByText('Previously submitted payroll', { exact: true })).toHaveCount(0);
  const table = page.getByRole('table', { name: 'Employee payroll', exact: true });
  await expect(table.getByRole('columnheader')).toHaveCount(9);
  await expect(table.locator('tbody tr')).toHaveCount(4);
  await expect(page.getByLabel('Payment Date', { exact: true })).toHaveValue(firstDate);
  await expect(page.getByLabel('Total Payroll Cost', { exact: true })).toContainText('8,333.33');
  await expect(page.getByLabel('Total NET Pay', { exact: true })).toContainText('95.00');
  await expect(
    table.getByRole('checkbox', { name: 'Pending Example already submitted' }),
  ).toBeDisabled();
  await expect(
    table.getByRole('checkbox', { name: 'Paid Example already submitted' }),
  ).toBeDisabled();
  await expect(
    table.getByRole('row').filter({ has: page.getByRole('link', { name: 'Paid', exact: true }) }),
  ).toContainText('Paid');
  await page.screenshot({ path: 'test-results/unified-payroll-desktop.png', fullPage: true });
  await page.getByLabel('Payment Date', { exact: true }).fill(updatedDate);
  await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await table.getByRole('checkbox', { name: 'Select all eligible employees' }).check();
  await expect(page.getByLabel('Total Payroll Cost', { exact: true })).toContainText('25,000.00');
  await expect(page.getByLabel('Total NET Pay', { exact: true })).toContainText('190.00');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await table.getByRole('checkbox', { name: 'Include Ada Example in payroll' }).uncheck();
  await expect(page.getByLabel('Total Payroll Cost', { exact: true })).toContainText('16,666.67');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Payment Date', { exact: true })).toHaveValue(updatedDate);
  await expect(
    table.getByRole('checkbox', { name: 'Include Grace Example in payroll' }),
  ).toBeChecked();
  await expect(
    table.getByRole('checkbox', { name: 'Include Ada Example in payroll' }),
  ).not.toBeChecked();
  const writesBeforeSwitch = previewWrites;
  await page.getByLabel('Pay Period', { exact: true }).selectOption(second);
  await expect(page.getByLabel('Payment Date', { exact: true })).toHaveValue(secondDate);
  await expect(page.getByLabel('Total Payroll Cost', { exact: true })).toContainText('8,333.33');
  await expect(
    table.getByRole('checkbox', { name: 'Include Pending Example in payroll' }),
  ).toBeEnabled();
  await page.getByLabel('Pay Period', { exact: true }).selectOption(first);
  await expect(page.getByLabel('Payment Date', { exact: true })).toHaveValue(updatedDate);
  expect(previewWrites).toBe(writesBeforeSwitch);
  const pending = table
    .getByRole('row')
    .filter({ has: page.getByRole('link', { name: 'Pending', exact: true }) });
  await expect(pending).toContainText('10,000.00');
  await pending.getByRole('button', { name: 'View Pay Check', exact: true }).click();
  const viewer = page.getByRole('dialog', { name: 'Historical Pay Check' });
  await expect(viewer.locator('iframe')).toHaveAttribute('src', /^blob:/);
  const received = await viewer
    .locator('iframe')
    .evaluate(async (frame) =>
      Array.from(
        new Uint8Array(await (await fetch((frame as HTMLIFrameElement).src)).arrayBuffer()),
      ),
    );
  expect(Buffer.from(received)).toEqual(bytes);
  await viewer.getByRole('button', { name: 'Close pay check viewer' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/unified-payroll-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Payment Date:');
  await page.getByRole('button', { name: 'Confirm submission' }).click();
  await expect(page.getByRole('heading', { name: 'Payroll Submitted Successfully' })).toBeVisible();
  expect(submits).toBe(1);
  await expect(page.getByRole('link', { name: 'Grace', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ada', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to Employees', exact: true }).click();
  await expect(page.getByLabel('Employee Status')).toHaveValue('All');
});

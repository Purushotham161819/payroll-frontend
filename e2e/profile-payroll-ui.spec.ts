import { test, expect } from './authenticated-test';
import { jsPDF } from 'jspdf';
const year = new Date().getFullYear();
const period = `${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
const people = ['Ada', 'Grace'].map((firstName, i) => ({
  _id: `507f1f77bcf86cd79943901${i}`,
  employeeId: `EMP00${i + 1}`,
  firstName,
  lastName: 'Example',
  email: `profile-${i}@example.test`,
  dateOfBirth: '1990-01-01',
  hireDate: '2020-01-01',
  annualCtc: 120000,
  status: 'Active',
  payFrequency: 'Monthly',
  employmentHistory: [
    {
      startDate: '2020-01-01',
      endDate: '2021-12-31',
      terminationReason: 'Retirement',
      explanation: 'First employment period',
      terminatedAt: '2021-12-31T12:00:00Z',
    },
    { startDate: '2022-02-01', recordedAt: '2022-02-01T12:00:00Z' },
  ],
  rehireDate: '2022-02-01',
}));
const check = (id: string) => ({
  employeeId: id,
  firstName: people.find((p) => p._id === id)!.firstName,
  lastName: 'Example',
  grossPay: 100,
  employerContributions: 10,
  deductions: 5,
  netPay: 95,
  paymentStatus: 'Not Paid',
});
const storedPdf = () => {
  const doc = new jsPDF();
  doc.text('PAYSLIP - Ada Example - Original finalized net pay INR 95.00', 15, 20);
  return Buffer.from(doc.output('arraybuffer'));
};

test('profile ribbon, independent cards/history, stored PDF viewer, editor preservation and contextual back arrow', async ({
  page,
}) => {
  const employees = structuredClone(people),
    pdf = storedPdf();
  let pdfReads = 0;
  await page.route('**/employees', (r) => r.fulfill({ json: employees }));
  await page.route('**/payroll/employees/*/checks', (r) => {
    expect(r.request().url()).toContain(people[0]._id);
    return r.fulfill({
      json: [
        {
          ...check(people[0]._id),
          period: `${year - 1}-01`,
          paymentDate: `${year - 1}-02-05`,
          paymentStatus: 'Payment Pending',
          pdfUrl: '/protected',
        },
      ],
    });
  });
  await page.route('**/payroll/runs/*/checks/*/pdf', (r) => {
    expect(r.request().url()).toContain(people[0]._id);
    expect(r.request().url()).toContain(`${year - 1}-01`);
    pdfReads++;
    return r.fulfill({ contentType: 'application/pdf', body: pdf });
  });
  await page.goto('/?status=All');
  await expect(page.getByLabel('Employee Status')).toHaveValue('All');
  await page.getByRole('link', { name: 'Ada', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Employment Information', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Compensation Information' })).toBeVisible();
  await expect(page.locator('app-profile-card')).toHaveCount(4);
  const tabs = page.getByRole('tablist', { name: 'Employee profile' });
  await expect(tabs.getByRole('tab', { name: 'Employee Details' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await tabs.getByRole('tab', { name: 'Employee Details' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Employment History' })).toBeFocused();
  await expect(tabs.getByRole('tab', { name: 'Employment History' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText('Retirement', { exact: true })).toBeVisible();
  await expect(page.getByText('First employment period')).toBeVisible();
  await expect(page.locator('app-employment-history li')).toHaveCount(2);
  await expect(page.locator('app-profile-card')).toHaveCount(0);
  await tabs.getByRole('tab', { name: 'Employee Details' }).click();
  await page.getByRole('button', { name: 'Edit employee', exact: true }).click();
  const editor = page.getByRole('dialog');
  await editor.getByLabel('First Name', { exact: true }).fill('Ada Unsaved');
  await editor.getByRole('tab', { name: 'Employment History' }).click();
  await expect(editor.getByText('Retirement', { exact: true })).toBeVisible();
  await editor.getByRole('tab', { name: 'Employee Details' }).click();
  await expect(editor.getByLabel('First Name', { exact: true })).toHaveValue('Ada Unsaved');
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
  await tabs.getByRole('tab', { name: 'Pay Checks' }).click();
  await page.getByRole('button', { name: 'View Pay Check', exact: true }).click();
  const viewer = page.getByRole('dialog', { name: /Pay Check/ });
  await expect(viewer).toBeVisible();
  await expect(viewer.locator('iframe')).toHaveAttribute('src', /^blob:/);
  const displayed = await viewer
    .locator('iframe')
    .evaluate(async (frame) =>
      Array.from(
        new Uint8Array(await (await fetch((frame as HTMLIFrameElement).src)).arrayBuffer()),
      ),
    );
  expect(Buffer.from(displayed)).toEqual(pdf);
  await viewer.getByRole('button', { name: 'Close pay check viewer' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  expect((await download).suggestedFilename()).toContain(`${year - 1}-01`);
  expect(pdfReads).toBe(2);
  employees[0].annualCtc = 999999;
  await page.reload();
  await page.getByRole('tab', { name: 'Pay Checks', exact: true }).click();
  await expect(page.getByRole('table').getByRole('row').last()).toContainText('95.00');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Employee Details', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/profile-widgets-mobile.png', fullPage: true });
  await expect(page.getByRole('link', { name: 'Back to Employees', exact: true })).toHaveAttribute(
    'title',
    'Back to Employees',
  );
  await expect(page.getByRole('link', { name: /Return to Employees/ })).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to Employees', exact: true }).click();
  await expect(page.getByLabel('Employee Status')).toHaveValue('All');
});

test('revisit a submitted month, save checkbox changes, and submit only unprocessed employees', async ({
  page,
}) => {
  let revision = 2,
    draft: any = null,
    newSubmission: any = null,
    submissions = 0;
  const history = [
    {
      ...check(people[0]._id),
      paymentStatus: 'Payment Pending',
      pdfUrl: '/protected',
      payrollStatus: 'Submitted',
    },
  ];
  const fresh = (ids: string[]) => {
    const checks = ids.filter((id) => !history.some((c) => c.employeeId === id)).map(check);
    return {
      period,
      organizationName: 'Example Organization',
      status: 'Draft',
      version: revision,
      inputHash: 'trusted-hash',
      paymentDate: draft?.paymentDate ?? null,
      totalPayrollCost: checks.length * 10000,
      calculatedAt: new Date().toISOString(),
      calculationVersion: 'v1',
      stale: false,
      checks,
      historicalChecks: history,
      processedEmployeeIds: history.map((c) => c.employeeId),
      totals: {
        employerContributions: checks.length * 10,
        deductions: checks.length * 5,
        netPay: checks.length * 95,
      },
    };
  };
  await page.route('**/employees', (r) => r.fulfill({ json: people }));
  await page.route('**/payroll/runs/preview', (r) => {
    const body = r.request().postDataJSON();
    return r.fulfill({
      json:
        !body.recalculate && draft
          ? { ...draft, historicalChecks: history }
          : fresh(body.employeeIds),
    });
  });
  await page.route('**/payroll/runs/draft', (r) => {
    const body = r.request().postDataJSON();
    expect(body.employeeIds).not.toContain(people[0]._id);
    revision++;
    draft = { ...fresh(body.employeeIds), paymentDate: body.paymentDate };
    return r.fulfill({ json: draft });
  });
  await page.route('**/payroll/runs/*/submit', (r) => {
    const body = r.request().postDataJSON();
    submissions++;
    expect(draft.checks.map((c: any) => c.employeeId)).toEqual([people[1]._id]);
    revision++;
    newSubmission = {
      ...draft,
      historicalChecks: undefined,
      idempotencyKey: body.idempotencyKey,
      status: 'Submitted',
      submittedAt: new Date().toISOString(),
      paymentDate: body.paymentDate,
      checks: draft.checks.map((c: any) => ({
        ...c,
        paymentStatus: 'Payment Pending',
        pdfUrl: '/protected',
      })),
    };
    history.push(...newSubmission.checks);
    draft = null;
    return r.fulfill({ json: newSubmission });
  });
  await page.route(/\/payroll\/runs\/\d{4}-\d{2}(?:\?.*)?$/, (r) => {
    expect(new URL(r.request().url()).searchParams.get('submissionId')).toBe(
      newSubmission.idempotencyKey,
    );
    return r.fulfill({ json: newSubmission });
  });
  const url = `/payroll/run?employees=${people.map((p) => p._id).join(',')}`;
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Run Payroll', exact: true })).toBeVisible();
  await expect(page.getByLabel('Pay Period')).toBeVisible();
  const historical = page.getByRole('table', { name: 'Employee payroll', exact: true });
  await expect(
    historical.getByRole('checkbox', { name: 'Ada Example already submitted' }),
  ).toBeDisabled();
  const current = page.getByRole('table', { name: 'Employee payroll', exact: true });
  await expect(current.getByRole('row').last()).toContainText('95.00');
  await page.getByLabel('Payment Date', { exact: true }).fill(`${year}-12-28`);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await current.getByRole('checkbox', { name: 'Include Grace Example in payroll' }).uncheck();
  await expect(current.getByRole('row').last()).toContainText('0.00');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  expect(draft.checks).toHaveLength(0);
  await page.reload();
  await expect(current.getByRole('row').last()).toContainText('0.00');
  await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeDisabled();
  await current.getByRole('checkbox', { name: 'Include Grace Example in payroll' }).check();
  await expect(current.getByRole('row').last()).toContainText('95.00');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Payment Date:');
  await page.getByRole('button', { name: 'Confirm submission' }).click();
  await expect(page.getByRole('heading', { name: 'Payroll Submitted Successfully' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ada', exact: true })).toHaveCount(0);
  expect(submissions).toBe(1);
  await page.reload();
  await expect(page.getByRole('link', { name: 'Grace', exact: true })).toBeVisible();
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Run Payroll', exact: true })).toBeVisible();
  await expect(
    page
      .getByRole('table', { name: 'Employee payroll', exact: true })
      .locator('tbody')
      .getByRole('checkbox'),
  ).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeDisabled();
  await expect(
    page.getByText('All employees shown have already been submitted', { exact: false }),
  ).toBeVisible();
});

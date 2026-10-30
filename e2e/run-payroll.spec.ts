import { test, expect } from './authenticated-test';

test('select employees, reopen and edit a saved draft, submit, and download historical pay checks', async ({
  page,
}) => {
  const year = new Date().getFullYear();
  const employees = ['Ada', 'Grace', 'Former'].map((firstName, i) => ({
    _id: `507f1f77bcf86cd79943901${i}`,
    employeeId: `EMP00${i + 1}`,
    firstName,
    lastName: 'Example',
    email: `employee-${i}@example.test`,
    dateOfBirth: '1990-01-01',
    hireDate: '2020-01-01',
    annualCtc: 120000,
    status: i === 2 ? 'Terminated' : 'Active',
    payFrequency: 'Monthly',
  }));
  let draft: any = null,
    submission: any = null,
    submits = 0;
  const check = (id: string) => ({
    employeeId: id,
    ...Object.fromEntries(
      ['firstName', 'lastName'].map((k) => [k, (employees.find((e) => e._id === id) as any)[k]]),
    ),
    grossPay: 100,
    employerContributions: 10,
    deductions: 5,
    netPay: 95,
    paymentStatus: 'Not Paid',
  });
  const calculated = (body: any) => ({
    period: body.period,
    organizationName: 'PayStream Test Organization',
    status: 'Draft',
    version: draft?.version ?? 0,
    calculatedAt: new Date().toISOString(),
    calculationVersion: 'v1',
    inputHash: 'hash',
    paymentDate: body.paymentDate ?? draft?.paymentDate ?? null,
    totalPayrollCost: body.employeeIds.length * 10000,
    stale: false,
    checks: body.employeeIds.map(check),
    totals: {
      employerContributions: body.employeeIds.length * 10,
      deductions: body.employeeIds.length * 5,
      netPay: body.employeeIds.length * 95,
    },
  });
  await page.route('**/employees', (r) => r.fulfill({ json: employees }));
  await page.route('**/payroll/runs/preview', (r) => {
    const body = r.request().postDataJSON();
    return r.fulfill({
      json: submission ?? (!body.recalculate && draft ? draft : calculated(body)),
    });
  });
  await page.route('**/payroll/runs/draft', (r) => {
    const body = r.request().postDataJSON();
    expect(body).not.toHaveProperty('netPay');
    draft = { ...calculated(body), version: (draft?.version ?? 0) + 1 };
    return r.fulfill({ json: draft });
  });
  await page.route('**/payroll/runs/*/submit', (r) => {
    submits++;
    const body = r.request().postDataJSON();
    expect(body.paymentDate).toBe(`${year}-12-28`);
    expect(body.idempotencyKey.length).toBeGreaterThan(16);
    submission = {
      ...draft,
      status: 'Submitted',
      submittedAt: new Date().toISOString(),
      paymentDate: body.paymentDate,
      checks: draft.checks.map((c: any) => ({
        ...c,
        paymentStatus: 'Payment Pending',
        pdfUrl: '/protected',
      })),
    };
    return r.fulfill({ json: submission });
  });
  await page.route(/\/payroll\/runs\/\d{4}-\d{2}$/, (r) => r.fulfill({ json: submission }));
  await page.route('**/payroll/employees/*/checks', (r) =>
    r.fulfill({
      json: submission
        ? [
            {
              ...submission.checks[0],
              period: submission.period,
              paymentDate: submission.paymentDate,
            },
          ]
        : [],
    }),
  );
  await page.route('**/payroll/runs/*/checks/*/pdf', (r) =>
    r.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\n%%EOF' }),
  );
  await page.goto('/');
  const run = page.getByRole('button', { name: 'Run Payroll', exact: true });
  await expect(run).toBeDisabled();
  await page.getByLabel('Employee Status', { exact: true }).selectOption('All');
  await expect(page.getByRole('checkbox', { name: /Select employee Former/ })).toBeDisabled();
  await page.getByRole('checkbox', { name: /Select employee Ada/ }).check();
  await page.getByRole('checkbox', { name: /Select employee Grace/ }).check();
  await run.click();
  await expect(page.getByRole('heading', { name: 'Run Payroll', exact: true })).toBeVisible();
  await expect(page.getByLabel('Pay Period').locator('option')).toHaveCount(12);
  await expect(page.getByRole('link', { name: 'Ada', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeDisabled();
  await page.getByLabel('Payment Date', { exact: true }).fill(`${year}-12-28`);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Payroll draft saved.', { exact: false })).toBeVisible();
  expect(draft.checks).toHaveLength(2);
  expect(submission).toBeNull();
  await page.getByRole('link', { name: 'Back to Employees', exact: true }).click();
  await page.getByRole('checkbox', { name: /Select employee Ada/ }).check();
  await page.getByRole('button', { name: 'Run Payroll', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Grace', exact: true })).toBeVisible();
  await page
    .getByRole('row')
    .filter({ hasText: 'Grace' })
    .getByRole('checkbox', { name: 'Include Grace Example in payroll' })
    .uncheck();
  await expect(page.getByRole('status')).toContainText('Updating payroll');
  await page.getByRole('button', { name: 'Recalculate / Refresh Payroll' }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Include Grace Example in payroll' }),
  ).not.toBeChecked();
  await expect(
    page.getByRole('table', { name: 'Employee payroll' }).getByRole('row').last(),
  ).toContainText('95.00');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Payment Date:');
  await dialog.getByRole('button', { name: 'Confirm submission' }).click();
  await expect(page.getByRole('heading', { name: 'Payroll Submitted Successfully' })).toBeVisible();
  expect(submits).toBe(1);
  expect(submission.checks).toHaveLength(1);
  await expect(
    page.getByLabel('Payroll submission summary').getByText('Payment Pending', { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Payroll Submitted Successfully' })).toBeVisible();
  await page.getByRole('link', { name: 'Ada', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ada Example' })).toBeVisible();
  await page.getByRole('tab', { name: 'Pay Checks', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  expect((await download).suggestedFilename()).toContain('Payslip_');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

import { test, expect } from './authenticated-test';
test('TDS widgets preserve versioned saves, explicit calculation, year restrictions and historical snapshots', async ({
  page,
}, testInfo) => {
  const id = '507f1f77bcf86cd799439011',
    api = 'http://localhost:3000';
  const employee = {
    _id: id,
    employeeId: 'EMP001',
    firstName: 'Ada',
    lastName: 'Example',
    email: 'ada@example.test',
    dateOfBirth: '1990-01-01',
    hireDate: '2026-06-01',
    annualCtc: 2400000,
  };
  let profile: any = {
    version: 1,
    regime: 'new',
    tdsApplicable: true,
    resident: true,
    salaryOnly: true,
    panOperative: true,
    fullYearEmployment: false,
    exemptionConditionsConfirmed: false,
    reason: 'Reviewed supporting records',
    employmentScenario: 'job_change',
    previousEmployerGrossWages: 500000,
    previousEmployerExemptWages: 50000,
    previousEmployerTds: 25000,
    previousEmployerExemptionsVerified: true,
  };
  const result: any = Object.fromEntries(
    [
      'annualGrossWages',
      'totalTaxableSalary',
      'standardDeduction',
      'taxableIncome',
      'taxBeforeRebate',
      'rebate',
      'surcharge',
      'marginalRelief',
      'cess',
      'annualEstimatedTax',
      'annualTds',
      'monthlyTds',
      'previousEmployerTdsCredit',
      'currentEmployerSubmittedTds',
      'remainingAnnualTds',
      'remainingPayrollPeriods',
      'excessTaxCredit',
      'currentEmployerGrossWages',
    ].map((key) => [key, 0]),
  );
  Object.assign(result, {
    annualGrossWages: 2000000,
    totalTaxableSalary: 1900000,
    standardDeduction: 75000,
    taxableIncome: 1825000,
    annualTds: 24000,
    monthlyTds: 2000,
    annualEstimatedTax: 49000,
    previousEmployerTdsCredit: 25000,
    remainingAnnualTds: 24000,
    remainingPayrollPeriods: 10,
    currentEmployerGrossWages: 1500000,
    allocation: Array(12).fill(2000),
    warnings: [],
    taxableComponents: [
      { componentId: 'basic', code: 'BASIC', annual: 1500000, exempt: 0, taxable: 1500000 },
    ],
    slabs: [{ from: 0, to: null, rate: 10, taxableAmount: 100000, tax: 10000 }],
  });
  const snapshot = {
    yearCode: 'FY_ONE',
    regime: 'new',
    legislation: 'QA saved legislation',
    configurationVersion: 'saved-revision-17',
    profileVersion: 1,
    status: 'calculated',
    result,
    inputs: {
      revision: {
        rules: {
          mappings: [
            { componentId: 'basic', componentName: 'Basic Salary', type: 'fully_taxable' },
          ],
        },
      },
      projection: {
        annualCtc: 2400000,
        financialYearStartDate: '2026-04-01',
        hireDate: '2026-06-01',
        employmentStartDate: '2026-06-01',
        eligibleMonthCount: 10,
        salary: { annual: { annualCtc: 2000000 } },
        employmentScenario: 'job_change',
        previousEmployerGrossWages: 500000,
        previousEmployerExemptWages: 50000,
      },
    },
  };
  const savedCalculation = {
    _id: 'saved-calculation',
    createdAt: '2026-10-20T12:00:00Z',
    snapshot,
  };
  const original = JSON.stringify(savedCalculation);
  const history: any[] = [savedCalculation];
  let status = 'calculated',
    puts: any[] = [],
    calculates = 0,
    editCalls = 0,
    historyReads = 0;
  const summary = (year = 'FY_ONE') => ({
    profile: year === 'FY_ONE' ? profile : null,
    annualCtc: 2400000,
    payrollFrequency: 'Monthly',
    latest: year === 'FY_ONE' ? history[0] : null,
    calculationStatus: year === 'FY_ONE' ? status : 'not_configured',
    calculationStatusLabel: year === 'FY_ONE' ? status : 'Not configured',
    regimeSelection: { regime: year === 'FY_ONE' ? 'new' : 'old' },
    submittedTds: 0,
    remainingEstimatedTds: 24000,
    withholdingStatus: 'Payment Pending',
  });
  await page.route('**/auth/me', (r) =>
    r.fulfill({ json: { id: 'admin', email: 'admin@example.test', role: 'admin' } }),
  );
  await page.route(api + '/employees', (r) => r.fulfill({ json: [employee] }));
  await page.route(api + '/salary-components', (r) =>
    r.fulfill({
      json: [
        {
          _id: 'basic',
          name: 'Basic Salary',
          code: 'BASIC',
          category: 'earning',
          status: 'active',
        },
      ],
    }),
  );
  await page.route(api + '/settings/tax-configuration', (r) =>
    r.fulfill({
      json: {
        years: [
          { code: 'FY_ONE', name: 'First Financial Year', active: true },
          { code: 'FY_TWO', name: 'Second Financial Year' },
        ],
        revisions: [],
        published: {},
      },
    }),
  );
  await page.route(api + '/employees/' + id + '/income-tax', (r) =>
    r.fulfill({ json: [{ yearCode: 'FY_ONE', version: profile.version }] }),
  );
  await page.route(api + '/employees/' + id + '/income-tax/**', (r) => {
    const path = new URL(r.request().url()).pathname,
      year = path.includes('FY_TWO') ? 'FY_TWO' : 'FY_ONE';
    if (path.endsWith('/edit')) {
      editCalls++;
      return r.fulfill({ json: { editToken: 'qa-edit-permission' } });
    }
    if (path.endsWith('/history')) {
      historyReads++;
      return r.fulfill({ json: history });
    }
    if (path.endsWith('/change-year'))
      return r.fulfill({ json: { yearCode: year, changeYearToken: 'qa-year-permission' } });
    if (path.endsWith('/calculate')) {
      calculates++;
      status = 'calculated';
      history.unshift({
        ...savedCalculation,
        _id: 'new-calculation',
        snapshot: { ...snapshot, profileVersion: profile.version },
      });
      return r.fulfill({ json: history[0] });
    }
    if (r.request().method() === 'PUT') {
      const body = r.request().postDataJSON();
      puts.push(body);
      profile = { ...body, version: body.version + 1 };
      status = 'estimate_saved';
      return r.fulfill({ json: profile });
    }
    return r.fulfill({ json: summary(year) });
  });
  await page.goto('/employees/' + id + '?tab=tax');
  const profileCard = page.getByRole('region', { name: 'Employee Tax Profile', exact: true }),
    employment = page.getByRole('region', {
      name: 'Employment During Current Financial Year',
      exact: true,
    });
  await expect(profileCard).toBeVisible();
  await expect(employment).toBeVisible();
  await expect(profileCard.locator('dt')).toHaveText([
    'Saved / Read-only status',
    'Financial year',
    'Annual CTC',
    'Payroll frequency',
    'Calculation status',
    'Tax regime',
  ]);
  const calculate = page.getByRole('button', { name: 'Calculate Annual TDS', exact: true });
  await expect(calculate).toHaveCount(1);
  await expect(calculate).toBeDisabled();
  expect(
    await calculate.evaluate(
      (button) =>
        !!(
          button.compareDocumentPosition(
            document.querySelector('[aria-labelledby="employee-tax-profile"]')!,
          ) & Node.DOCUMENT_POSITION_FOLLOWING
        ),
    ),
  ).toBe(true);
  const tip = profileCard.getByRole('button', { name: 'About Financial Year', exact: true });
  await tip.hover();
  await expect(page.getByRole('tooltip')).toContainText('saved year is locked');
  expect(
    await page.getByRole('tooltip').evaluate((el) => !!el.closest('.cdk-overlay-container')),
  ).toBe(true);
  await page.getByRole('heading', { name: 'Income Tax / TDS', exact: true }).hover();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expect(employment).toContainText('Eligible employment months');
  await expect(employment).toContainText('Pro-rated Annual CTC');
  await expect(employment).toContainText('Current employer projected gross earnings');
  await expect(
    employment.getByLabel('Previous Employer Gross Wages Received (INR)', { exact: false }),
  ).toHaveValue('500000');
  await profileCard.getByRole('button', { name: 'Change Financial Year', exact: true }).click();
  const yearDialog = page.getByRole('dialog', { name: 'Change Financial Year', exact: true });
  await expect(yearDialog).toBeVisible();
  await yearDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(puts).toHaveLength(0);
  await employment.getByRole('button', { name: 'Edit Employment Profile', exact: true }).click();
  await expect(employment.getByLabel('Reason / review note')).toBeEnabled();
  await expect(profileCard.getByLabel('Financial year', { exact: true })).toBeDisabled();
  await expect(profileCard.getByLabel('Tax regime', { exact: true })).toHaveAttribute(
    'readonly',
    '',
  );
  await employment.getByLabel('Reason / review note').fill('Unsaved review');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', { name: 'Back to Employees', exact: true }).click();
  await expect(page).toHaveURL(/tab=tax/);
  await employment.getByRole('button', { name: 'Cancel Employment Profile', exact: true }).click();
  await expect(employment.getByLabel('Reason / review note')).toHaveValue(
    'Reviewed supporting records',
  );
  expect(calculates).toBe(0);
  expect(puts).toHaveLength(0);
  await profileCard.getByRole('button', { name: 'Edit Tax Profile', exact: true }).click();
  await employment.getByLabel('Reason / review note').fill('Updated supporting records');
  await employment.getByRole('button', { name: 'Save Tax Profile', exact: true }).click();
  await expect(employment.getByLabel('Reason / review note')).toBeDisabled();
  expect(puts).toHaveLength(1);
  expect(puts[0].previousEmployerGrossWages).toBe(500000);
  expect(puts[0].previousEmployerExemptWages).toBe(50000);
  expect(puts[0].previousEmployerTds).toBe(25000);
  expect(puts[0].reason).toBe('Updated supporting records');
  expect(puts[0]).not.toHaveProperty('annualCtc');
  expect(calculates).toBe(0);
  expect(historyReads).toBe(0);
  expect(JSON.stringify(savedCalculation)).toBe(original);
  await expect(calculate).toBeEnabled();
  await calculate.click();
  await expect(calculate).toBeDisabled();
  expect(calculates).toBe(1);
  expect(editCalls).toBe(2);
  expect(JSON.stringify(savedCalculation)).toBe(original);
  const breakdown = page.getByRole('region', { name: 'Saved Annual Tax Breakdown', exact: true });
  await expect(breakdown.locator('.calculation-metadata')).toContainText('saved-revision-17');
  await expect(breakdown).toContainText('₹24,000.00');
  await breakdown.getByRole('button', { name: 'About Configuration Version' }).focus();
  await expect(page.getByRole('tooltip')).toContainText('saved-revision-17');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await breakdown.getByRole('button', { name: 'View Calculation History' }).click();
  const historyDialog = page.getByRole('dialog', { name: 'Calculation History', exact: true });
  await expect(historyDialog).toContainText('FY_ONE');
  await historyDialog
    .getByRole('button', { name: 'Close Calculation History', exact: true })
    .click();
  expect(historyReads).toBe(1);
  await breakdown.getByRole('button', { name: 'View Tax Slabs' }).click();
  const slabs = page.getByRole('dialog', { name: 'Tax Slabs', exact: true });
  await expect(slabs).toContainText('10%');
  await slabs.getByRole('button', { name: 'Close Tax Slabs', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Salary taxability breakdown', exact: true }),
  ).toContainText('Basic Salary');
  await page.screenshot({ path: testInfo.outputPath('tds-widgets-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(profileCard).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await tip.focus();
  await expect(page.getByRole('tooltip')).toBeVisible();
  const box = await page.getByRole('tooltip').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await tip.click();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: testInfo.outputPath('tds-widgets-mobile.png'), fullPage: true });
});

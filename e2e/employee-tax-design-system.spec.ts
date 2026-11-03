import {productDropdownEvidence} from './product-dropdown-evidence';
import { test, expect } from './authenticated-test';
import { mkdirSync } from 'node:fs';
const artifacts='artifacts/phase4f-employee-tax';mkdirSync(artifacts,{recursive:true});
for(const width of [1440,1280,768,390]) test('Employee tax presentation '+width,async({page})=>{
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

await page.setViewportSize({width,height:1000});
await page.goto('/employees/'+id+'?tab=tax');
const tax=page.locator('app-employee-tax');const prefix=process.env.PHASE4F_CAPTURE==='before'?'before':'after';
await expect(tax.locator('[aria-labelledby="employee-tax-profile"]')).toBeVisible();
const shot=async(name:string,locator:any=tax)=>locator.screenshot({path:artifacts+'/'+prefix+'-'+name+'-'+width+'.png'});
await page.screenshot({path:artifacts+'/'+prefix+'-page-'+width+'.png',fullPage:true});
await shot('profile-readonly',tax.locator('[aria-labelledby="employee-tax-profile"]'));
await shot('employment-readonly',tax.locator('[aria-labelledby="employment-heading"]'));
await shot('annual-breakdown',tax.locator('[aria-labelledby="annual-tax-breakdown"]'));
await shot('salary-taxability',tax.locator('[aria-labelledby="salary-taxability-breakdown"]'));
await tax.getByRole('button',{name:'Change Financial Year',exact:true}).click();await shot('year-dialog',page.getByRole('dialog'));await productDropdownEvidence(page,'employee-tax',width);await page.keyboard.press('Escape');
await tax.getByRole('button',{name:'Edit Tax Profile',exact:true}).click();
await shot('profile-edit',tax.locator('[aria-labelledby="employee-tax-profile"]'));
await shot('employment-edit',tax.locator('[aria-labelledby="employment-heading"]'));
await shot('previous-employer',tax.locator('[aria-labelledby="employment-heading"]'));
await tax.locator('input[value="first_job"]').check();await shot('first-job',tax.locator('[aria-labelledby="employment-heading"]'));
await expect(tax.locator('[name="previousEmployerTds"]')).toHaveCount(0);
await tax.locator('input[value="job_change"]').check();
for(const [name,value] of Object.entries({previousEmployerGrossWages:'500000.50',previousEmployerExemptWages:'50000.25',previousEmployerTds:'25000.75'}))await tax.locator('[name="'+name+'"]').fill(value);
await tax.locator('[name="previousEmployerExemptionsVerified"]').check();
await shot('changed-job',tax.locator('[aria-labelledby="employment-heading"]'));
await tax.getByRole('button',{name:'Save Tax Profile',exact:true}).click();await expect(tax.locator('[name="previousEmployerTds"]')).toBeDisabled();
expect(puts).toHaveLength(1);expect(puts[0].previousEmployerTds).toBe(25000.75);expect(puts[0].previousEmployerExemptWages).toBe(50000.25);expect(calculates).toBe(0);
await tax.getByRole('button',{name:'Calculate Annual TDS',exact:true}).click();await expect(tax.getByRole('button',{name:'Calculate Annual TDS',exact:true})).toBeDisabled();expect(calculates).toBe(1);expect(JSON.stringify(savedCalculation)).toBe(original);
await shot('calculated-result');
await tax.getByRole('button',{name:'View Calculation History',exact:true}).click();await shot('history-dialog',page.getByRole('dialog'));await page.keyboard.press('Escape');
await tax.getByRole('button',{name:'View Tax Slabs',exact:true}).click();await shot('slabs-dialog',page.getByRole('dialog'));await page.keyboard.press('Escape');
expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('Employee tax failures, cancellation, required amounts and financial-year preview preserve saved data',async({page})=>{
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


await page.goto('/employees/'+id+'?tab=tax');const tax=page.locator('app-employee-tax');
await tax.getByRole('button',{name:'Edit Tax Profile',exact:true}).click();
await tax.locator('[name="previousEmployerTds"]').fill('');await expect(tax.getByRole('button',{name:'Save Tax Profile',exact:true})).toBeDisabled();
await tax.locator('[name="previousEmployerTds"]').fill('0');await tax.locator('[name="reason"]').fill('Updated draft');
let failure=true;await page.route(api+'/employees/'+id+'/income-tax/FY_ONE',async r=>{if(r.request().method()==='PUT'&&failure){failure=false;return r.fulfill({status:503,json:{message:'Temporary failure'}});}return r.fallback();});
await tax.getByRole('button',{name:'Save Tax Profile',exact:true}).click();await expect(tax.getByRole('alert').first()).toBeVisible();await expect(tax.locator('[name="reason"]')).toHaveValue('Updated draft');expect(puts).toHaveLength(0);expect(calculates).toBe(0);
await tax.getByRole('button',{name:'Cancel Employment Profile',exact:true}).click();await expect(tax.locator('[name="reason"]')).toHaveValue('Reviewed supporting records');await expect(tax.locator('[name="previousEmployerTds"]')).toHaveValue('25000');
await tax.getByRole('button',{name:'Change Financial Year',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Change Financial Year',exact:true});await dialog.getByRole('combobox').selectOption('FY_TWO');await expect(dialog).toContainText('Old Regime');await dialog.getByRole('button',{name:'Confirm Change Financial Year',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(tax.locator('#employee-tax-financial-year')).toHaveValue('FY_TWO');await expect(tax.locator('[name="regime"]')).toHaveValue('Old Regime');await expect(tax).toContainText('No saved calculation for this financial year.');expect(puts).toHaveLength(0);expect(calculates).toBe(0);
await tax.getByRole('button',{name:'Cancel Employment Profile',exact:true}).click();await expect(tax.locator('#employee-tax-financial-year')).toHaveValue('FY_ONE');await expect(tax.locator('[name="previousEmployerTds"]')).toHaveValue('25000');expect(JSON.stringify(savedCalculation)).toBe(original);
});

import { test, expect } from './authenticated-test';

test('Settings share navigation, independent versioned table editors and organization address persistence', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const api = 'http://localhost:3000';
  await page.route('**/auth/me', (route) =>
    route.fulfill({ json: { id: 'qa-admin', email: 'qa@example.test', role: 'admin' } }),
  );
  let organization = {
    organizationName: 'QA Organization',
    addressVersion: 1,
    address: {
      addressLine1: '1 Main Street',
      addressLine2: '',
      city: 'Boston',
      state: 'MA',
      country: 'United States',
      zipCode: '00123',
    },
  };
  const year = {
    code: 'QA_YEAR',
    name: 'QA financial year',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    active: true,
  };
  const rules = {
    ruleVersion: 'salary-only-v1',
    standardDeduction: 0,
    rebateLimit: 0,
    maximumRebate: 0,
    cessPercentage: 0,
    rebateMarginalRelief: false,
    surchargeMarginalRelief: false,
    incomeRounding: 'paise',
    liabilityRounding: 'paise',
    minimumAge: 0,
    maximumAge: null,
    slabs: [{ from: 0, to: null, rate: 1 }],
    surcharge: [{ threshold: 5000000, rate: 10 }],
    mappings: [],
    legalReferences: ['https://www.incometax.gov.in/qa-fixture'],
    reviewNote: 'QA only',
    employerContributionsReviewed: true,
  };
  let state: any = {
    version: 1,
    years: [year],
    revisions: [
      {
        id: 'original',
        version: 1,
        yearCode: year.code,
        regime: 'new',
        effectiveDate: year.startDate,
        rules,
      },
    ],
    published: { 'QA_YEAR:new': 'original' },
    audit: [],
  };
  const payloads: any[] = [];
  await page.route(api + '/settings/organization-profile', (route) =>
    route.fulfill({ json: organization }),
  );
  await page.route(api + '/settings/organization-profile/address', (route) => {
    const body = route.request().postDataJSON();
    expect(body.version).toBe(organization.addressVersion);
    delete body.version;
    organization = {
      ...organization,
      addressVersion: organization.addressVersion + 1,
      address: body,
    };
    return route.fulfill({ json: organization });
  });
  await page.route(api + '/salary-components', (route) => route.fulfill({ json: [] }));
  await page.route(api + '/settings/statutory-deductions', (route) =>
    route.fulfill({ json: null }),
  );
  await page.route(api + '/settings/tax-configuration', (route) => route.fulfill({ json: state }));
  await page.route(api + '/settings/tax-configuration/revisions', (route) => {
    const body = route.request().postDataJSON();
    payloads.push(body);
    expect(body.version).toBe(state.version);
    state = {
      ...state,
      version: state.version + 1,
      revisions: [
        ...state.revisions,
        {
          id: 'revision-' + (state.version + 1),
          version: state.version + 1,
          yearCode: body.yearCode,
          regime: body.regime,
          effectiveDate: body.effectiveDate,
          rules: body.rules,
        },
      ],
    };
    return route.fulfill({ json: state });
  });
  await page.goto('/settings/organization');
  await expect(page.getByText('QA Organization', { exact: true })).toBeVisible();
  await expect(page.locator('#addressLine1')).toHaveAttribute('readonly', '');
  await page.getByRole('button', { name: 'Edit organization address' }).click();
  await page.locator('#city').fill('Cambridge');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('#city')).toHaveAttribute('readonly', '');
  await page.reload();
  await expect(page.locator('#city')).toHaveValue('Cambridge');
  const nav = page.getByRole('navigation', { name: 'Settings sections' });
  const separator = await nav.evaluate((e) => ({
    y: e.getBoundingClientRect().bottom,
    width: getComputedStyle(e).borderBottomWidth,
    color: getComputedStyle(e).borderBottomColor,
  }));
  for (const tab of [
    'Salary Components',
    'Statutory Deductions',
    'Tax Configuration',
    'Organization Settings',
  ]) {
    await nav.getByRole('link', { name: tab, exact: true }).click();
    await expect(nav.getByRole('link').first()).toHaveText('Organization Settings');
    await expect.poll(() => nav.evaluate((e) => ({
        y: e.getBoundingClientRect().bottom,
        width: getComputedStyle(e).borderBottomWidth,
        color: getComputedStyle(e).borderBottomColor,
      }))).toEqual(separator);
    await expect(nav.getByRole('link', { name: tab, exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  }
  await nav.getByRole('link', { name: 'Tax Configuration', exact: true }).click();
  const slabs = page.locator('[aria-labelledby="slabs"]'),
    surcharge = page.locator('[aria-labelledby="surcharge"]');
  await expect(slabs.getByLabel('Slab rate', { exact: true })).toHaveValue('1');
  await expect(slabs.getByLabel('Slab rate', { exact: true })).toHaveAttribute('readonly', '');
  await slabs.getByRole('button', { name: 'Edit slabs', exact: true }).click();
  await slabs.getByLabel('Slab rate', { exact: true }).fill('2');
  await expect(surcharge.getByLabel('Surcharge rate', { exact: true })).toHaveAttribute(
    'readonly',
    '',
  );
  await slabs.getByRole('button', { name: 'Save Progressive Slabs' }).click();
  await expect(slabs.getByLabel('Slab rate', { exact: true })).toHaveAttribute('readonly', '');
  expect(payloads[0].rules.surcharge).toEqual(rules.surcharge);
  expect(state.published).toEqual({ 'QA_YEAR:new': 'original' });
  await surcharge.getByRole('button', { name: 'Edit surcharge', exact: true }).click();
  await surcharge.getByLabel('Surcharge rate', { exact: true }).fill('11');
  page.once('dialog', (dialog) => dialog.dismiss());
  await nav.getByRole('link', { name: 'Salary Components', exact: true }).click();
  await expect(page).toHaveURL(/tax-configuration$/);
  await surcharge.getByRole('button', { name: 'Save Surcharge Thresholds' }).click();
  await expect(surcharge.getByLabel('Surcharge rate', { exact: true })).toHaveAttribute(
    'readonly',
    '',
  );
  expect(payloads[1].rules.slabs[0].rate).toBe(2);
  await page.reload();
  await expect(slabs.getByLabel('Slab rate', { exact: true })).toHaveValue('2');
  await expect(surcharge.getByLabel('Surcharge rate', { exact: true })).toHaveValue('11');
  expect(state.revisions[0].rules).toEqual(rules);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await slabs.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'D:/projects/payroll-backend/.tmp/settings-' + width + '.png',
      fullPage: true,
    });
    for (const card of [slabs, surcharge]) {
      await expect(card.locator('ps-data-table .scroll')).toHaveCSS('overflow-x', 'auto');
      const lastColumn = card.locator('th').last();
      await card.locator('ps-data-table .scroll').evaluate((element) => { element.scrollLeft = element.scrollWidth; });
      const bounds = (await lastColumn.boundingBox())!;
      expect(bounds.x + bounds.width).toBeGreaterThan(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test('Salary component icons retain edit, status and confirmed-delete actions', async ({page}) => {
  const api='http://localhost:3000';
  let records:any[]=[{_id:'qa-bonus',name:'QA Bonus',code:'BONUS',category:'earning',calculationType:'fixed',calculationValue:1000,fixedAmountPeriod:'annual',calculationBaseType:'annual_ctc',showInPayslip:true,status:'active'}];
  const mutations:string[]=[];
  await page.route(api+'/salary-components',route=>route.fulfill({json:records}));
  await page.route(api+'/salary-components/formula-variables',route=>route.fulfill({json:[]}));
  await page.route(api+'/salary-components/qa-bonus/status',route=>{mutations.push('status');expect(route.request().postDataJSON()).toEqual({status:'inactive'});records=[{...records[0],status:'inactive'}];return route.fulfill({json:records[0]});});
  await page.route(api+'/salary-components/qa-bonus',route=>{expect(route.request().method()).toBe('DELETE');mutations.push('delete');records=[];return route.fulfill({json:{deletedId:'qa-bonus',message:'Deleted'}});});
  await page.goto('/settings');
  await page.getByRole('button',{name:'Edit component QA Bonus',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Edit Salary Component',exact:true})).toBeVisible();
  await expect(page.locator('input[name="name"]')).toHaveValue('QA Bonus');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  expect(mutations).toEqual([]);
  await page.getByRole('button',{name:'More actions for QA Bonus',exact:true}).click();await page.getByRole('menuitem',{name:'Deactivate QA Bonus',exact:true}).click();
  await page.getByRole('button',{name:'More actions for QA Bonus',exact:true}).click();await expect(page.getByRole('menuitem',{name:'Activate QA Bonus',exact:true})).toBeVisible();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'More actions for QA Bonus',exact:true}).click();await page.getByRole('menuitem',{name:'Delete component QA Bonus',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Delete salary component',exact:true})).toBeVisible();
  expect(mutations).toEqual(['status']);
  await page.getByRole('dialog').getByRole('button',{name:'Confirm Delete',exact:true}).click();
  await expect(page.getByText('Salary component deleted successfully.',{exact:true})).toBeVisible();
  expect(mutations).toEqual(['status','delete']);
});

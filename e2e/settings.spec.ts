import { test, expect } from './authenticated-test';
// Browser-only API fixtures; persistence is tested against real MongoDB in the backend suite.
test('settings navigation, modal, dynamic bases, edit persistence and mobile layout', async ({page}) => {
  const records: any[] = [];
  await page.route('**/employees', r => r.fulfill({json:[]}));
  await page.route('**/salary-components**', async route => {
    const req = route.request();
    if (req.method() === 'POST') { records.push({...req.postDataJSON(),_id:String(records.length + 1)}); await route.fulfill({status:201,json:records.at(-1)}); }
    else if (req.method() === 'PATCH') { const id = req.url().split('/').at(-1); Object.assign(records.find(r => r._id === id), req.postDataJSON()); await route.fulfill({json:{}}); }
    else await route.fulfill({json:records});
  });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:4200/');
  await page.getByRole('link',{name:'Settings'}).click();
  await expect(page.getByText('No salary components configured.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'+ Add Salary Component',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Search calculation bases',{exact:true})).toHaveCount(0);
  await page.getByLabel('Component Name',{exact:true}).fill('Basic');
  await page.getByLabel('Component Code',{exact:true}).fill('basic');
  await page.getByLabel('Calculation Value (%)',{exact:true}).fill('40');
  await page.getByLabel('Show this component in the employee payslip').uncheck();
  await page.getByRole('button',{name:'Save Component',exact:true}).click();
  await expect(page.getByRole('cell',{name:'BASIC',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'+ Add Salary Component',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Calculation Base',exact:true}).locator('option')).toHaveText(['Annual CTC','Gross Wages','Core Wages','Basic (BASIC)']);
  await page.getByLabel('Component Name',{exact:true}).fill('EPF Employee Contribution');
  await page.getByLabel('Component Code',{exact:true}).fill('EPF_EMPLOYEE');
  await page.getByRole('combobox',{name:/Component Category/}).selectOption('deduction');
  await page.getByRole('combobox',{name:'Calculation Base',exact:true}).selectOption('1');
  await page.getByLabel('Calculation Value (%)',{exact:true}).fill('12');
  await page.getByRole('button',{name:'Save Component',exact:true}).click();
  await expect(page.getByRole('cell',{name:'EPF_EMPLOYEE',exact:true})).toBeVisible();
  expect(records[1]).toMatchObject({category:'deduction',calculationBaseComponentId:'1',calculationValue:12});
  await page.getByRole('row').filter({has:page.getByRole('cell',{name:'BASIC',exact:true})}).getByRole('button',{name:'Edit',exact:true}).click();
  await expect(page.getByLabel('Show this component in the employee payslip')).not.toBeChecked();
  await expect(page.getByRole('combobox',{name:'Calculation Base',exact:true}).locator('option')).toHaveCount(3);
  await page.setViewportSize({width:390,height:844});
  const bounds = await page.getByRole('dialog').boundingBox();
  expect(bounds!.width).toBeLessThan(390);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link',{name:'Employees'}).click();
  await expect(page.getByRole('heading',{name:'Employees',exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});






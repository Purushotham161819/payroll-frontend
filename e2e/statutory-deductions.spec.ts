import { test, expect } from '@playwright/test';

test('statutory settings validate, save, reload, reset, preserve errors and retain existing routes', async ({page}) => {
  let saved: any = null; let fail = false; let writes = 0;
  await page.route('**/employees', r => r.fulfill({json:[]}));
  await page.route('**/salary-components', r => r.fulfill({json:[]}));
  await page.route('http://localhost:3000/settings/statutory-deductions', async route => {
    if (route.request().method() === 'PUT') {
      writes++;
      if (fail) { await route.fulfill({status:503,json:{message:'Unable to save settings. Try again.'}}); return; }
      saved = {...route.request().postDataJSON(),_id:'current',createdAt:'2026-10-27',updatedAt:'2026-10-27'};
    }
    await route.fulfill({contentType:'application/json',body:JSON.stringify(saved)});
  });
  const errors: string[] = []; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4200/');
  await page.getByRole('link',{name:'Settings',exact:true}).click();
  await page.getByRole('link',{name:'Statutory Deductions',exact:true}).click();
  await expect(page.getByText('No statutory deduction settings have been configured.',{exact:false})).toBeVisible();
  await expect(page.locator('input')).toHaveCount(6);
  await page.getByRole('button',{name:'Save Settings',exact:true}).click();
  await expect(page.getByText('Enter a percentage between 0 and 100.',{exact:true})).toHaveCount(5);
  expect(writes).toBe(0);
  await page.getByLabel('Wage Cap',{exact:true}).fill('15000');
  for (const label of ['EPF Employer Contribution','EPS Employer Contribution','EPF Employee Contribution','ESI Employer Contribution','ESI Employee Contribution']) await page.getByLabel(label,{exact:true}).fill('5');
  await page.getByLabel('EPF Employee Contribution',{exact:true}).fill('101');
  await page.getByRole('button',{name:'Save Settings',exact:true}).click(); expect(writes).toBe(0);
  await page.getByLabel('EPF Employee Contribution',{exact:true}).fill('12');
  await page.getByRole('button',{name:'Save Settings',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Statutory deduction settings saved.');
  expect(saved.wageCap).toBe(15000); expect(saved.epfEmployeeContributionPercentage).toBe(12);
  await page.reload(); await expect(page.getByLabel('Wage Cap',{exact:true})).toHaveValue('15000');
  await page.getByLabel('Wage Cap',{exact:true}).fill('17000'); await page.getByRole('button',{name:'Reset Changes',exact:true}).click();
  await expect(page.getByLabel('Wage Cap',{exact:true})).toHaveValue('15000');
  fail = true; await page.getByLabel('Wage Cap',{exact:true}).fill('16000'); await page.getByRole('button',{name:'Save Settings',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Unable to save settings'); await expect(page.getByLabel('Wage Cap',{exact:true})).toHaveValue('16000'); expect(saved.wageCap).toBe(15000);
  await page.setViewportSize({width:390,height:844}); expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link',{name:'Salary Components',exact:true}).click(); await expect(page.getByText('No salary components configured.',{exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Employees',exact:true}).click(); await expect(page.getByRole('heading',{name:'Employees',exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});


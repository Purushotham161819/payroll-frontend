import { test, expect } from './authenticated-test';

test('statutory settings validate, save, reload, reset, preserve errors and retain existing routes', async ({page}) => {
  let saved: any = null; let fail = false; let writes = 0;
  await page.route('**/employees', r => r.fulfill({json:[]}));
  await page.route('**/salary-components', r => r.fulfill({json:[]}));
  await page.route('http://localhost:3000/settings/statutory-deductions', async route => {
    if (route.request().method() === 'PUT') {
      writes++;
      if (fail) { await route.fulfill({status:503,json:{message:'Unable to save settings. Try again.'}}); return; }
      const payload=route.request().postDataJSON(); expect(payload).not.toHaveProperty('epfEmployeeContributionPercentage'); expect(payload).not.toHaveProperty('esiEmployeeContributionPercentage');
      saved = {epfEmployeeContributionPercentage:12,esiEmployeeContributionPercentage:0.75,...saved,...payload,_id:'current',createdAt:'2026-10-27',updatedAt:'2026-10-27'};
    }
    await route.fulfill({contentType:'application/json',body:JSON.stringify(saved)});
  });
  const errors: string[] = []; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4200/');
  await page.getByRole('link',{name:'Settings',exact:true}).click();
  await page.getByRole('link',{name:'Statutory Deductions',exact:true}).click();
  await expect(page.getByText('No statutory deduction settings have been configured.',{exact:false})).toBeVisible();
  await expect(page.locator('input[type=number]')).toHaveCount(5);
  await expect(page.getByLabel('EPF Employee Contribution',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('ESI Employee Contribution',{exact:true})).toHaveCount(0);
  const epf=page.getByRole('region',{name:'EPF Contributions',exact:true});
  const esi=page.getByRole('region',{name:'ESI Contributions',exact:true});
  await expect(epf.locator('input[type=number]')).toHaveCount(3); await expect(esi.locator('input[type=number]')).toHaveCount(2);
  const epfBounds=await epf.locator('input[type=number]').evaluateAll(inputs=>inputs.map(el=>el.getBoundingClientRect().top));
  expect(Math.max(...epfBounds)-Math.min(...epfBounds)).toBeLessThan(2);
  const esiBounds=await esi.locator('input[type=number]').evaluateAll(inputs=>inputs.map(el=>el.getBoundingClientRect().top));
  expect(Math.max(...esiBounds)-Math.min(...esiBounds)).toBeLessThan(2);
  expect(esiBounds[0]).toBeGreaterThan(epfBounds[0]);
  await page.getByRole('button',{name:'Save Settings',exact:true}).click();
  await expect(page.getByText('Enter a percentage between 0 and 100.',{exact:true})).toHaveCount(3);
  expect(writes).toBe(0);
  await page.getByLabel('Annual EPF Ceiling Limit',{exact:true}).fill('15000');
  for (const label of ['EPF Employer Contribution Rate (%)','EPS Employer Contribution Rate (%)','ESI Employer Contribution Rate (%)']) await page.getByLabel(label,{exact:true}).fill('5');
  await page.getByLabel('EPF Employer Contribution Rate (%)',{exact:true}).fill('101');
  await page.getByRole('button',{name:'Save Settings',exact:true}).click(); expect(writes).toBe(0);
  await page.getByLabel('EPF Employer Contribution Rate (%)',{exact:true}).fill('12');
  await page.getByRole('button',{name:'Save Settings',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Statutory deduction settings saved.');
  await page.getByLabel('Annual ESI Wage Ceiling Limit', {exact:true}).fill('250000.25');
  await page.getByRole('button',{name:'Save Settings',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Statutory deduction settings saved.');
  expect(saved.annualEsiCeilingLimit).toBe(250000.25);
  await expect(page.getByText('₹2,50,000.25', {exact:true})).toBeVisible();
  await page.getByRole('checkbox',{name:'Is Ceiling Limit Applicable',exact:true}).check();
  await page.getByRole('button',{name:'Save Settings',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Statutory deduction settings saved.');
  expect(saved.isEpfCeilingApplicable).toBe(true);
  await page.reload();await expect(page.getByRole('checkbox',{name:'Is Ceiling Limit Applicable',exact:true})).toBeChecked();
  expect(saved.wageCap).toBe(15000); expect(saved.epfEmployeeContributionPercentage).toBe(12);
  await page.reload(); await expect(page.getByLabel('Annual ESI Wage Ceiling Limit', {exact:true})).toHaveValue('250000.25'); await expect(page.getByLabel('Annual EPF Ceiling Limit',{exact:true})).toHaveValue('15000');
  await page.getByLabel('Annual EPF Ceiling Limit',{exact:true}).fill('17000'); await page.getByRole('button',{name:'Reset Changes',exact:true}).click();
  await expect(page.getByLabel('Annual EPF Ceiling Limit',{exact:true})).toHaveValue('15000');
  fail = true; await page.getByLabel('Annual EPF Ceiling Limit',{exact:true}).fill('16000'); await page.getByRole('button',{name:'Save Settings',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Unable to save settings'); await expect(page.getByLabel('Annual EPF Ceiling Limit',{exact:true})).toHaveValue('16000'); expect(saved.wageCap).toBe(15000);
  await page.setViewportSize({width:390,height:844});
  const mobilePositions=await page.locator('input[type=number]').evaluateAll(inputs=>inputs.map(el=>el.getBoundingClientRect().top));
  expect(mobilePositions.every((top,i)=>i===0||top>mobilePositions[i-1])).toBe(true); expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link',{name:'Salary Components',exact:true}).click(); await expect(page.getByText('No salary components configured.',{exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Employees',exact:true}).click(); await expect(page.getByRole('heading',{name:'Employees',exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});


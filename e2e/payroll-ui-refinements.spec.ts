import { test, expect } from './authenticated-test';

test('directory launch, row warnings, compact popover, name links and refresh remain accessible', async ({page}) => {
  const year = new Date().getFullYear();
  const people = ['Ada', 'Grace', 'Former'].map((firstName, index) => ({
    _id: '507f1f77bcf86cd79943901' + index, employeeId: 'EMP00' + index,
    firstName, lastName: 'Example', status: index === 2 ? 'Terminated' : 'Active',
    email: firstName + '@example.test', hireDate:'2020-01-01',dateOfBirth:'1990-01-01',annualCtc:120000,payFrequency:'Monthly',
  }));
  let reads = 0, release: (() => void) | undefined, hold = false;
  const issues = ['Employee is not eligible for this payroll month.', 'Verify previous employer records before proceeding.'];
  await page.route('**/employees', r => r.fulfill({json: people}));
  await page.route('**/payroll/runs/preview', async r => {
    reads++;
    const body = r.request().postDataJSON();
    expect(body.employeeIds).toEqual(people.slice(0,2).map(p => p._id));
    if (hold) {hold = false; await new Promise<void>(resolve => release = resolve);}
    await r.fulfill({json: {
      period:body.period,organizationName:'QA Organization',status:'Draft',version:1,inputHash:'trusted',stale:false,
      paymentDate:year+'-11-30',calculatedAt:new Date().toISOString(),calculationVersion:'v1',totalPayrollCost:10000,
      checks:[{employeeId:people[0]._id,firstName:'Ada',lastName:'Example',monthlyCtc:10000,grossPay:9000,employerContributions:1000,deductions:500,tds:100,netPay:8500,paymentStatus:'Not Paid'}],
      validationIssues:issues.map((message,index)=>({employeeId:people[1]._id,firstName:'Grace',lastName:'Example',employeeCode:'EMP001',stage:index?'tax':'salary',message})),
      totals:{employerContributions:1000,deductions:500,netPay:8500},
    }});
  });
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/');
  await expect(page.locator('table tbody tr')).toHaveCount(2);
  await expect(page.locator('table input[type=checkbox]')).toHaveCount(0);
  await page.getByLabel('Employee Status',{exact:true}).selectOption('All');
  await expect(page.locator('table tbody tr')).toHaveCount(3);
  await page.getByRole('button',{name:'Run Payroll',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Run Payroll',exact:true})).toBeVisible();
  const table=page.getByRole('table',{name:'Employee payroll',exact:true});
  const warning=page.getByRole('button',{name:'Employee requires attention: Grace Example'});
  await expect(page.locator('.warning-trigger')).toHaveCount(1);
  for (const message of issues) await expect(page.getByText(message,{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Save',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Submit',exact:true})).toBeDisabled();
  const name=table.getByRole('link',{name:'Grace',exact:true});
  const iconBox=await warning.boundingBox(), nameBox=await name.boundingBox();
  expect(nameBox!.x - (iconBox!.x + iconBox!.width)).toBeGreaterThanOrEqual(7);
  expect(Math.abs((iconBox!.y+iconBox!.height/2)-(nameBox!.y+nameBox!.height/2))).toBeLessThan(2);
  for (const link of await table.getByRole('link').all()) {
    expect(await link.evaluate(el => getComputedStyle(el).textDecorationLine)).toBe('none');
    expect(await link.getAttribute('href')).toContain('/employees/');
  }
  const totals=await page.getByLabel('Total NET Pay',{exact:true}).textContent();
  await warning.click();
  const popup=page.getByRole('dialog',{name:'Grace Example'});
  await expect(popup).toBeVisible();
  for(const message of issues) await expect(popup).toContainText(message);
  await expect(popup.locator('li')).toHaveCount(2);
  const bounds=await popup.boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(340);
  expect(bounds!.height).toBeLessThan(220);
  expect(Math.abs(bounds!.y-(iconBox!.y+iconBox!.height))).toBeLessThan(10);
  await page.screenshot({path:'test-results/payroll-refinements-desktop.png',fullPage:true});
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  await expect(warning).toBeFocused();
  await warning.click();
  await expect(popup).toBeVisible();
  await expect(page.locator('.cdk-overlay-backdrop')).toBeVisible();
  await page.mouse.click(5,5);
  await expect(popup).toHaveCount(0);
  await expect(warning).toBeFocused();
  const refresh=page.getByRole('button',{name:'Refresh Payroll',exact:true});
  await expect(refresh).toHaveAttribute('title','Refresh Payroll');
  const before=reads;hold=true;
  await refresh.click();
  await expect(refresh).toBeDisabled();
  await expect(refresh).toHaveAttribute('aria-busy','true');
  expect(reads).toBe(before+1);release!();
  await expect(refresh).toBeEnabled();
  await expect(page.getByLabel('Total NET Pay',{exact:true})).toHaveText(totals!);
  await page.setViewportSize({width:390,height:844});
  await warning.scrollIntoViewIfNeeded();
  await warning.click();
  await expect(popup).toBeVisible();
  const mobile=await popup.boundingBox();
  expect(mobile!.x).toBeGreaterThanOrEqual(0);
  expect(mobile!.x+mobile!.width).toBeLessThanOrEqual(390);
  expect(mobile!.y).toBeGreaterThanOrEqual(0);
  expect(mobile!.y+mobile!.height).toBeLessThanOrEqual(844);
  await page.screenshot({path:'test-results/payroll-refinements-mobile.png',fullPage:true});
  await popup.getByRole('button',{name:'Close employee warnings'}).click();
  await expect(popup).toHaveCount(0);
  await expect(warning).toBeFocused();
});

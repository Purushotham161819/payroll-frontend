import {test,expect} from './authenticated-test';
for(const width of [1440,1280,768,390]) test('Payroll warning evidence '+width,async({page})=>{
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

await page.setViewportSize({width,height:1000});await page.goto('/payroll/run?employees='+people.slice(0,2).map(p=>p._id).join(','));
const warning=page.getByRole('button',{name:'Employee requires attention: Grace Example',exact:true});await warning.scrollIntoViewIfNeeded();await warning.click();const popup=page.getByRole('dialog',{name:'Grace Example',exact:true});await expect(popup).toBeVisible();for(const text of issues)await expect(popup).toContainText(text);
await popup.locator('header strong').click();
const prefix=process.env.PHASE4G_CAPTURE==='before'?'before':'after';await popup.screenshot({path:'artifacts/phase4g-run-payroll/'+prefix+'-warnings-'+width+'.png'});const box=(await popup.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);await page.keyboard.press('Escape');await expect(popup).toHaveCount(0);await expect(warning).toBeFocused();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
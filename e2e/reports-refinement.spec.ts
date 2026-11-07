import {test,expect} from '@playwright/test';
const report={columns:[{key:'name',label:'Employee Name',kind:'text'},{key:'netPay',label:'Net Pay',kind:'money'}],rows:[{name:'Ada Example',netPay:950}],total:1,page:1,limit:50,summary:{employees:1,Active:1,Terminated:0,Inactive:0,grossPay:1000,deductions:50,netPay:950,paid:0,pending:1},period:'2026-07'};
for(const width of [1440,390])test('Reports toolbar, filters and PDF exports at '+width,async({page})=>{
 await page.setViewportSize({width,height:1000});let release:(()=>void)|undefined;let delay=false;
 await page.route('http://localhost:3000/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/auth/me')return route.fulfill({json:{id:'admin',email:'admin@example.test',role:'admin',organizationId:'ORG000001'}});
  if(path==='/settings/organization')return route.fulfill({json:{displayName:'Example Organization'}});
  if(path==='/reports/payroll-periods')return route.fulfill({json:[{period:'2026-07',runs:['run-one']}]});
  if(path==='/reports/workforce'||path==='/reports/payroll/2026-07'){
   if(delay)await new Promise<void>(resolve=>{release=resolve;});
   return route.fulfill({json:report});
  }
  return route.fulfill({json:[]});
 });
 await page.goto('/reports');await expect(page.locator('nav a').last()).toHaveText('Reports');
 await page.getByRole('button',{name:'Total Workforce Report',exact:true}).click();await expect(page.getByRole('cell',{name:'Ada Example'})).toBeVisible();
 const fields=page.locator('.filters [psFieldControl]');
 for(const field of await fields.all()){
  const box=(await field.boundingBox())!;expect(box.width).toBeLessThanOrEqual(width===1440?210:width-60);expect(box.height).toBe(width===1440?36:44);
 }
 const exportButton=page.locator('[cardActions]').getByRole('button',{name:'Export PDF',exact:true});await expect(exportButton).toBeVisible();
 expect(await page.locator('main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 delay=true;await page.getByRole('button',{name:'Apply Filters',exact:true}).click();await expect(page.getByRole('button',{name:'Applying...'})).toBeDisabled();await expect(page.getByRole('cell',{name:'Ada Example'})).toBeVisible();
 await expect.poll(()=>!!release).toBe(true);release!();delay=false;await expect(page.getByRole('button',{name:'Apply Filters',exact:true})).toBeEnabled();
 await page.screenshot({path:'test-results/reports-refined-'+width+'.png',fullPage:true});
 const workforceDownload=page.waitForEvent('download');await exportButton.click();await (await workforceDownload).saveAs('test-results/reports-workforce-'+width+'.pdf');
 await page.getByRole('button',{name:'OK',exact:true}).click();
 await page.getByRole('button',{name:'Payroll Reports',exact:true}).click();await expect(page.getByText('Payroll Period:',{exact:false})).toBeVisible();
 const payrollDownload=page.waitForEvent('download');await exportButton.click();await (await payrollDownload).saveAs('test-results/reports-payroll-'+width+'.pdf');
});

import {test,expect} from '@playwright/test';
const id='507f1f77bcf86cd799439011',other='507f1f77bcf86cd799439012';
test('employee delete confirmation cancels safely, reports errors, deletes once and refreshes selected rows',async({page})=>{
 let records=[{_id:id,firstName:'Ada',lastName:'Delete',email:'ada@example.com',dateOfBirth:'1990-01-01',hireDate:'2026-01-01',annualCtc:107500},{_id:other,firstName:'Keep',lastName:'Employee',email:'keep@example.com',dateOfBirth:'1990-01-01',hireDate:'2026-01-01',annualCtc:107500}];let fail=true,writes=0;
 await page.route('**/employees**',route=>{
  if(route.request().method()==='DELETE'){writes++;expect(route.request().url()).toContain('/employees/'+id);if(fail)return route.fulfill({status:503,json:{message:'Unable to delete employee. Please try again later.'}});records=records.filter(r=>r._id!==id);return route.fulfill({json:{message:'Employee deleted successfully.',deletedId:id}});}
  return route.fulfill({json:records});
 });
 await page.goto('/');await page.getByRole('button',{name:'Actions for Ada Delete',exact:true}).click();await page.getByRole('menuitem',{name:'Delete employee Ada Delete',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Ada Delete (ada@example.com)');await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(writes).toBe(0);await expect(page.getByRole('dialog')).toHaveCount(0);
 const row=page.getByRole('row').filter({has:page.getByRole('cell',{name:'ada@example.com',exact:true})});await row.getByRole('checkbox').check();await page.getByRole('button',{name:'Actions for Ada Delete',exact:true}).click();await page.getByRole('menuitem',{name:'Delete employee Ada Delete',exact:true}).click();
 await page.getByRole('button',{name:'Confirm Delete',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('The server could not complete your request');await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.locator('.notice.success')).toHaveCount(0);fail=false;await page.getByRole('button',{name:'Confirm Delete',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.getByRole('cell',{name:'ada@example.com',exact:true})).toHaveCount(0);await expect(page.getByRole('cell',{name:'keep@example.com',exact:true})).toBeVisible();await expect(page.locator('.table-footer [role=status]')).toHaveText('0 employees selected');expect(writes).toBe(2);
 await expect(page.getByRole('status').filter({hasText:'Employee deleted successfully.'})).toBeVisible();
});
test('salary delete hides mandatory actions, preserves dependency errors, and refreshes after references are repaired',async({page})=>{
 const core=['BASIC','DA','RA'].map((code,i)=>({_id:'00000000000000000000000'+(i+1),name:['Basic Salary','Dearness Allowance','Retaining Allowance'][i],code,isSystemDefined:true,category:'earning',status:'active',calculationBaseType:'annual_ctc',calculationType:'percentage',calculationValue:[40,10,15][i],showInPayslip:true}));
 let records:any[]=[...core,{_id:id,name:'Travel',code:'TRAVEL',category:'allowance',status:'active',calculationBaseType:'annual_ctc',calculationType:'percentage',calculationValue:10,showInPayslip:true},{_id:other,name:'Conditional',code:'DEPENDENT',category:'deduction',status:'inactive',calculationBaseType:'annual_ctc',calculationType:'formula',formula:'IF(annualCtc>0,0,component_'+id+')',calculationValue:null,showInPayslip:true}];let writes=0;
 await page.route('**/salary-components**',route=>{
  const req=route.request();if(req.method()==='DELETE'){writes++;const key=req.url().split('/').at(-1)!;expect(key).toBe(id);if(records.some(r=>r.formula?.includes('component_'+id)))return route.fulfill({status:409,json:{message:'Cannot delete this component. Remove references from: Conditional (DEPENDENT).'}});records=records.filter(r=>r._id!==key);return route.fulfill({json:{message:'Salary component deleted successfully.',deletedId:key}});}
  if(req.method()==='PATCH'){const key=req.url().split('/').at(-1);Object.assign(records.find(r=>r._id===key),req.postDataJSON());return route.fulfill({json:records.find(r=>r._id===key)});}
  return route.fulfill({json:records});
 });
 await page.route('**/salary-components/formula-variables',r=>r.fulfill({json:[]}));
 await page.goto('/settings');for(const code of ['BASIC','DA','RA']){const row=page.locator('tbody tr').filter({hasText:code==='BASIC'?'Basic Salary':code==='DA'?'Dearness Allowance':'Retaining Allowance'});await expect(row.getByRole('button',{name:/Delete component/})).toHaveCount(0);await expect(row).toContainText('Deletion unavailable');}
 await page.getByRole('button',{name:'Delete component Travel',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Travel (TRAVEL)');await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(writes).toBe(0);
 await page.getByRole('button',{name:'Delete component Travel',exact:true}).click();await page.getByRole('button',{name:'Confirm Delete',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Conditional (DEPENDENT)');await expect(page.locator('.notice.success')).toHaveCount(0);await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.getByRole('row').filter({has:page.getByRole('cell',{name:'DEPENDENT',exact:true})}).getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Annual Formula',{exact:true}).fill('annualCtc * 1%');await page.getByRole('button',{name:'Save Component',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'Delete component Travel',exact:true}).click();await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'Confirm Delete',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.getByRole('cell',{name:'TRAVEL',exact:true})).toHaveCount(0);await expect(page.getByRole('cell',{name:'DEPENDENT',exact:true})).toBeVisible();await expect(page.getByRole('status')).toContainText('Salary component deleted successfully.');expect(writes).toBe(2);
});

import {test,expect} from '@playwright/test';
const records=Array.from({length:23},(_,i)=>({_id:(i+1).toString(16).padStart(24,'0'),employeeId:'EMP'+String(i+1).padStart(3,'0'),firstName:'Worker'+(i+1),lastName:'Example',email:'worker'+i+'@example.test',status:i<21?'Active':'Terminated',annualCtc:120000,hireDate:'2026-01-01',dateOfBirth:'1990-01-01'}));
for(const width of [1440,390])test('Employee pager and workforce status options at '+width,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.route('http://localhost:3000/**',route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/auth/me')return route.fulfill({json:{id:'admin',role:'admin',email:'admin@example.test',organizationId:'ORG000001'}});
  if(url.pathname==='/settings/organization')return route.fulfill({json:{displayName:'Example'}});
  if(url.pathname==='/reports/payroll-periods')return route.fulfill({json:[]});
  if(url.pathname==='/reports/workforce')return route.fulfill({json:{columns:[{key:'name',label:'Employee Name',kind:'text'}],rows:[],total:0,page:1,limit:50,summary:{employees:0}}});
  if(url.pathname==='/employees'){
   const status=url.searchParams.get('status'),search=(url.searchParams.get('search')??'').toLowerCase(),size=Number(url.searchParams.get('pageSize')??10),number=Number(url.searchParams.get('page')??1);
   const rows=records.filter(e=>(status==='All'||e.status===status)&&(!search||(e.firstName+' '+e.lastName).toLowerCase().includes(search)));
   return route.fulfill({json:{items:rows.slice((number-1)*size,number*size),total:rows.length,page:number,pageSize:size}});
  }
  return route.fulfill({json:[]});
 });
 await page.goto('/reports');await page.getByRole('button',{name:'Total Workforce Report',exact:true}).click();
 await page.getByRole('combobox',{name:'Employment Status',exact:true}).click();await expect(page.getByRole('option')).toHaveText(['All','Active','Terminated']);await page.getByRole('option',{name:'All',exact:true}).click();
 await page.getByRole('link',{name:'Employees',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(10);
 const pager=page.getByRole('navigation',{name:'Pagination',exact:true});await expect(pager).toContainText('of 21 employees');await expect(pager.getByRole('button',{name:'Previous',exact:true})).toBeDisabled();
 await pager.getByRole('button',{name:'Next',exact:true}).click();await expect(page.locator('tbody tr').first()).toContainText('Worker11');await expect(pager).toContainText('Page 2 of 3');
 await pager.getByRole('button',{name:'Page 1',exact:true}).click();await expect(page.locator('tbody tr').first()).toContainText('Worker1');
 expect(await page.locator('ps-pagination').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await pager.scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/employees-pager-'+width+'.png',fullPage:true});
 await pager.getByRole('combobox',{name:'Rows per page',exact:true}).click();await page.getByRole('option',{name:'25',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(21);await expect(pager).toContainText('Page 1 of 1');
 await page.getByLabel('Search employees',{exact:true}).fill('Worker21');await expect(page.locator('tbody tr')).toHaveCount(1);await expect(pager).toContainText('of 1 employees');
});

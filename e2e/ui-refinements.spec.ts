import {test,expect} from './authenticated-test';
import {readFile} from 'node:fs/promises';
import metadata from './fixtures/formula-variables.json';
import cases from './fixtures/conditional-payroll.json';
test('human-readable employee IDs survive refresh/edit while actions keep using MongoDB IDs',async({page})=>{
 const key='507f1f77bcf86cd799439011';let records:any[]=[{_id:key,employeeId:'EMP001',firstName:'Visible',lastName:'Employee',email:'visible@example.com',dateOfBirth:'1990-01-01',hireDate:'2026-01-01',annualCtc:107500}];
 await page.route('**/employees**',r=>{
  const req=r.request();if(req.method()==='PATCH'){expect(req.url()).toContain('/employees/'+key);const update=req.postDataJSON();expect(update).not.toHaveProperty('employeeId');records[0]={...records[0],...update};return r.fulfill({json:records[0]});}
  if(req.method()==='DELETE'){expect(req.url()).toContain('/employees/'+key);records=[];return r.fulfill({json:{message:'Employee deleted successfully.',deletedId:key}});}
  return r.fulfill({json:records});
 });
 await page.goto('/');await expect(page.getByRole('cell',{name:'EMP001',exact:true})).toBeVisible();await expect(page.getByRole('cell',{name:key,exact:true})).toHaveCount(0);
 await page.reload();await expect(page.getByRole('cell',{name:'EMP001',exact:true})).toBeVisible();await page.getByRole('button',{name:'Actions for Visible Employee',exact:true}).click();await page.getByRole('menuitem',{name:'Edit employee Visible Employee',exact:true}).click();await page.getByLabel('First Name',{exact:true}).fill('Updated');await page.getByRole('button',{name:'Save employee',exact:true}).click();
 await expect(page.getByRole('cell',{name:'EMP001',exact:true})).toBeVisible();await page.getByRole('button',{name:'Actions for Updated Employee',exact:true}).click();await page.getByRole('menuitem',{name:'Delete employee Updated Employee',exact:true}).click();await page.getByRole('button',{name:'Confirm Delete',exact:true}).click();await expect(page.getByText('No employees found.',{exact:true})).toBeVisible();
});
test('formula help opens with keyboard, explains MIN/MAX/IF and closes without changing the expression',async({page})=>{
 await page.route('**/salary-components',r=>r.fulfill({json:[]}));await page.route('**/salary-components/formula-variables',r=>r.fulfill({json:metadata}));
 await page.goto('/settings');await page.getByRole('button',{name:'+ Add Salary Component',exact:true}).click();await page.getByRole('combobox',{name:/Calculation Type/}).selectOption('formula');
 await expect(page.getByRole('button',{name:'Build IF / ELSE',exact:true})).toHaveCount(0);await expect(page.getByRole('region',{name:'Formula help examples',exact:true})).toHaveCount(0);
 const formula='IF(annualCtc>0,MIN(annualCoreWages,annualEpfCeilingLimit)*12%,0)';await page.getByLabel('Annual Formula',{exact:true}).fill(formula);
 const icon=page.getByRole('button',{name:'Formula help',exact:true});await icon.focus();await page.keyboard.press('Enter');await expect(icon).toHaveAttribute('aria-expanded','true');
 const help=page.getByRole('region',{name:'Formula help examples',exact:true});await expect(help).toContainText('MIN(Annual Core Wages, Annual EPF Ceiling Limit)');await expect(help).toContainText('MAX(Annual Basic Salary, 15000)');await expect(help).toContainText('IF(Compliance Wage Base');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'Close formula help',exact:true}).click();await expect(help).toHaveCount(0);
 await icon.focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');await expect(help).toHaveCount(0);await expect(page.getByLabel('Annual Formula',{exact:true})).toHaveValue(formula);
});
for(const period of ['Annual','Monthly'])test(`${period} PDF uses human ID in the existing name cell and has no secondary code row`,async({page})=>{
 const saved=cases[0];const data={...saved,employees:saved.employees.map(row=>({...row,employee:{...row.employee,employeeId:'EMP001'}}))};
 await page.route('**/employees',r=>r.fulfill({json:[]}));await page.route('**/salary-components',r=>r.fulfill({json:data.components}));await page.route('**/payroll/annual',r=>r.fulfill({json:{...data,reportComponents:[]}}));
 await page.goto('/');await page.getByRole('button',{name:'Generate Payroll',exact:true}).click();await page.getByRole('button',{name:'Deselect All',exact:true}).click();await page.getByLabel('Report Type',{exact:true}).selectOption(period);await page.getByLabel('Payroll Month',{exact:true}).selectOption({index:1});
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Generate PDF',exact:true}).click();const bytes=await readFile((await(await pending).path())!);const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;
 const items=(await(await pdf.getPage(1)).getTextContent()).items as any[];const first=items.findIndex(item=>item.str.includes('EMP001'));
 expect(first).toBeGreaterThan(0);expect(items.slice(0,first).map(i=>i.str).filter(s=>s.trim())).toEqual(['Employee Name','Basic','DA','RA','Core Wages']);expect(items.map(i=>i.str).join(' ')).not.toContain('Component Code');expect(items.some(i=>i.str==='BASIC')).toBe(false);await pdf.cleanup();
});

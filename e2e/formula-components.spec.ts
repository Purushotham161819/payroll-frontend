import { test,expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import calculated from './fixtures/formula-payroll.json';
test('Formula component creation, validation feedback, retrieval and editing',async({page})=>{
 let records:any[]=[];let writes=0;
 await page.route('**/employees',r=>r.fulfill({json:[]}));
 await page.route('**/salary-components**',r=>{
  if(r.request().method()==='POST'||r.request().method()==='PATCH'){
   const value=r.request().postDataJSON();writes++;
   if(value.formula==='unknown + 1') return r.fulfill({status:400,json:{message:'Unsupported or missing formula variable: unknown.'}});
   const saved={...value,_id:'000000000000000000000004'};records=[saved];return r.fulfill({json:saved});
  }
  return r.fulfill({json:records});
 });
 await page.route('**/salary-components/formula-variables',r=>r.fulfill({json:[]}));
 await page.goto('/settings');await page.getByRole('button',{name:'+ Add Salary Component',exact:true}).click();
 await page.getByLabel('Component Name',{exact:true}).fill('Formula Deduction');await page.getByLabel('Component Code',{exact:true}).fill('CUSTOM_DEDUCTION');
 await page.getByRole('combobox',{name:/Calculation Type/}).selectOption('formula');
 await expect(page.locator('input[name=value]')).toHaveCount(0);await expect(page.locator('select[name=base]')).toHaveCount(0);
 await page.getByRole('button',{name:'Save Component',exact:true}).click();expect(writes).toBe(0);
 await page.getByLabel('Annual Formula',{exact:true}).fill('unknown + 1');await page.getByRole('button',{name:'Save Component',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Unsupported or missing formula variable');
 await page.getByLabel('Annual Formula',{exact:true}).fill('MIN(Annual Core Wages, Annual EPF Ceiling Limit) * 12%');await page.getByRole('button',{name:'Save Component',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('cell',{name:'Formula',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Edit',exact:true}).click();await expect(page.getByLabel('Annual Formula',{exact:true})).toHaveValue('MIN(Annual Core Wages, Annual EPF Ceiling Limit) * 12%');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
for(const period of ['Annual','Monthly']) test(`${period}: formula values, selection, ordering, totals and PDF download`,async({page})=>{
 await page.route('**/employees',r=>r.fulfill({json:[]}));
 await page.route('**/salary-components',r=>r.fulfill({json:calculated.components}));
 await page.route('**/payroll/annual',r=>{
  const selected=r.request().postDataJSON().selectedComponentIds;expect(selected).toEqual(['000000000000000000000004']);
  return r.fulfill({json:{...calculated,reportComponents:calculated.components.filter(c=>selected.includes(c._id)).map(c=>({componentId:c._id,code:c.code,name:c.name,category:c.category,mandatory:false}))}});
 });
 await page.goto('/');await page.getByRole('button',{name:'Generate Payroll',exact:true}).click();
 await page.getByRole('button',{name:'Deselect All',exact:true}).click();
 await expect(page.getByRole('checkbox',{name:'Formula Deduction',exact:true})).not.toBeChecked();
 await page.getByRole('checkbox',{name:'Formula Deduction',exact:true}).check();
 await page.getByRole('checkbox',{name:'Net Pay',exact:true}).check();
 await page.getByRole('button',{name:'Move Formula Deduction up',exact:true}).click();
 await page.getByLabel('Report Type',{exact:true}).selectOption(period);await page.getByLabel('Payroll Month',{exact:true}).selectOption({index:1});
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Generate PDF',exact:true}).click();const download=await pending;
 const bytes=await readFile((await download.path())!);const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;
 const items=(await(await pdf.getPage(1)).getTextContent()).items as any[];
 const body=items.findIndex(item=>item.str==='Formula Employee');
 const headers=items.slice(0,body).map(item=>item.str).filter(s=>s.trim());
 expect(headers).toEqual(['Employee Name','Basic','DA','Formula Deduction','RA','Core Wages','Net Pay']);
 const text=items.map(item=>item.str).join(' ');
 expect(text).toContain(period==='Annual'?'6,000.00':'500.00');expect(text).toContain(period==='Annual'?'12,000.00':'1,000.00');
 expect(text).toContain(period==='Annual'?'94,000.00':'7,833.33');await pdf.cleanup();
});

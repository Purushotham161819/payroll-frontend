import {test,expect} from './authenticated-test';
import {readFile} from 'node:fs/promises';
import metadata from './fixtures/formula-variables.json';
import cases from './fixtures/conditional-payroll.json';
test('advanced IF formulas save and edit using stable keys',async({page})=>{
 let saved:any=null;const core=cases[0].components.slice(0,3);
 await page.route('**/salary-components**',r=>{
  if(r.request().method()==='POST'||r.request().method()==='PATCH'){saved={...r.request().postDataJSON(),_id:'000000000000000000000004'};return r.fulfill({json:saved});}
  return r.fulfill({json:saved?[...core,saved]:core});
 });
 await page.route('**/salary-components/formula-variables',r=>r.fulfill({json:metadata}));
 await page.goto('/settings');await page.getByRole('button',{name:'+ Add Salary Component',exact:true}).click();
 await page.getByLabel('Component Name',{exact:true}).fill('Conditional ESI');await page.getByLabel('Component Code',{exact:true}).fill('CONDITIONAL_ESI');
 await page.getByRole('combobox',{name:/Component Category/}).selectOption('deduction');await page.getByRole('combobox',{name:/Calculation Type/}).selectOption('formula');
 await expect(page.getByRole('button',{name:'Build IF / ELSE',exact:true})).toHaveCount(0);
 const formula='IF(annualComplianceWageBase <= annualEsiCeilingLimit, annualComplianceWageBase * esiEmployeeContributionRate, 0)';
 await page.getByLabel('Annual Formula',{exact:true}).fill(formula);
 await expect(page.getByLabel('Annual Formula',{exact:true})).toHaveValue(formula);
 await page.getByRole('button',{name:'Save Component',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);expect(saved.formula).toBe(formula);
 await page.getByRole('row').filter({has:page.getByRole('cell',{name:'CONDITIONAL_ESI',exact:true})}).getByRole('button',{name:'Edit',exact:true}).click();await expect(page.getByLabel('Annual Formula',{exact:true})).toHaveValue(formula);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
for(const [index,saved] of cases.entries())for(const period of ['Annual','Monthly'])test(`${period}: IF true/false case ${index}, ordered PDF amounts and totals`,async({page})=>{
 await page.route('**/employees',r=>r.fulfill({json:[]}));await page.route('**/salary-components',r=>r.fulfill({json:saved.components}));
 await page.route('**/payroll/annual',r=>r.fulfill({json:{...saved,reportComponents:[{componentId:saved.components[3]._id,name:saved.components[3].name,code:saved.components[3].code,category:'deduction',mandatory:false}]}}));
 await page.goto('/');await page.getByRole('button',{name:'Generate Payroll',exact:true}).click();await page.getByRole('button',{name:'Deselect All',exact:true}).click();
 await page.getByRole('checkbox',{name:'Formula Deduction',exact:true}).check();await page.getByRole('button',{name:'Move Formula Deduction up',exact:true}).click();
 await page.getByLabel('Report Type',{exact:true}).selectOption(period);await page.getByLabel('Payroll Month',{exact:true}).selectOption({index:1});
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Generate PDF',exact:true}).click();const download=await pending;
 const bytes=await readFile((await download.path())!);const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;
 const items=(await(await pdf.getPage(1)).getTextContent()).items as any[];const first=items.findIndex(i=>i.str==='Conditional Employee');
 expect(items.slice(0,first).map(i=>i.str).filter(s=>s.trim())).toEqual(['Employee Name','Basic','DA','Formula Deduction','RA','Core Wages']);
 const cells=items.slice(first).map(i=>i.str).filter(s=>s.trim());const value=index===0?(period==='Annual'?375:31.25):0;
 const currency=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(n);
 expect(cells[3]).toBe(currency(value));const total=cells.indexOf('Total');expect(cells[total+3]).toBe(currency(value*2));await pdf.cleanup();
});


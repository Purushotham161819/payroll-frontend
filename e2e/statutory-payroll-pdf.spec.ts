import {test,expect} from './authenticated-test';
import {readFile} from 'node:fs/promises';
import cases from './fixtures/statutory-payroll.json';
for(const saved of cases)for(const period of ['Annual','Monthly'])test(`${period} capped EPF/EPS, employer ESI eligible ${saved.eligible}, PDF values and totals`,async({page})=>{
 await page.route('**/employees',r=>r.fulfill({json:[]}));
 await page.route('**/salary-components',r=>r.fulfill({json:saved.components}));
 await page.route('**/payroll/annual',r=>r.fulfill({json:{...saved,reportComponents:[]}}));
 await page.goto('/');await page.getByRole('button',{name:'Generate Payroll',exact:true}).click();await page.getByRole('button',{name:'Deselect All',exact:true}).click();
 for(const name of ['ER EPS','ER EPF','ER ESI'])await page.getByRole('checkbox',{name,exact:true}).check();
 await page.getByLabel('Report Type',{exact:true}).selectOption(period);await page.getByLabel('Payroll Month',{exact:true}).selectOption({index:1});
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Generate PDF',exact:true}).click();const download=await pending;
 const bytes=await readFile((await download.path())!);const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;
 const items=(await(await pdf.getPage(1)).getTextContent()).items as any[];
 const index=items.findIndex(item=>item.str==='Statutory Employee');
 expect(items.slice(0,index).map(item=>item.str).filter(s=>s.trim())).toEqual(['Employee Name','ER EPS','ER EPF','ER ESI','Basic','DA','RA','Core Wages']);
 const keys=['employerEpsContribution','employerEpfContribution','employerEsiContribution','annualBasicSalary','annualDearnessAllowance','annualRetainingAllowance','annualCoreWages'] as const;
 const money=(v:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(v);
 const row=(times:number)=>keys.map(key=>{const annual=saved.employees[0].calculation.annual[key];const value=period==='Annual'?annual:Number((annual/12).toFixed(2));return money(Number((value*times).toFixed(2)));});
 const cells=items.slice(index).map(item=>item.str).filter(s=>s.trim());
 expect(cells.slice(0,8)).toEqual(['Statutory Employee',...row(1)]);
 expect(cells.slice(8,16)).toEqual(['Statutory Employee',...row(1)]);
 expect(cells.slice(16,24)).toEqual(['Total',...row(2)]);
 if(!saved.eligible){expect(saved.employees[0].calculation.annual.employerEsiContribution).toBe(0);expect(cells[3]).toBe(money(0));}
 await pdf.cleanup();
});

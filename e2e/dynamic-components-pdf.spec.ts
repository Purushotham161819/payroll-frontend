import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
for (const period of ['Annual','Monthly']) for (const include of [true,false]) test(`${period} PDF selected optional components: ${include}`,async({page})=>{
 const annual={annualCtc:108100,employerEpsContribution:4000,employerEpfContribution:2000,employerEsiContribution:2100,annualGrossWages:100000,annualBasicSalary:40000,annualDearnessAllowance:4000,annualRetainingAllowance:6000,annualCoreWages:50000,annualTotalAllowances:70000,annualExcessAllowance:20000,annualComplianceWageBase:70000,annualNetPay:100000};
 const configured=[...['BASIC','DA','RA'].map((code,i)=>({_id:'required'+i,code,name:['Basic','Dearness Allowance','Retaining Allowance'][i],category:'earning',status:'active',isSystemDefined:true})),...Array.from({length:6},(_,i)=>({_id:'optional'+i,code:'OPT'+i,name:'Travel '+i,category:'allowance',status:'active',isSystemDefined:false}))];
 await page.route('**/employees',r=>r.fulfill({json:[]}));
 await page.route('**/salary-components',r=>r.fulfill({json:configured}));
 await page.route('**/payroll/annual',r=>{
  const selected=r.request().postDataJSON().selectedComponentIds;
  expect(selected).toEqual(include?configured.slice(3).map(c=>c._id):[]);
  return r.fulfill({json:{reportComponents:configured.filter(c=>selected.includes(c._id)).map(c=>({componentId:c._id,name:c.name,code:c.code,category:c.category,mandatory:false})),employees:[{employee:{firstName:'Dynamic',lastName:'Employee'},calculation:{annual,components:configured.slice(3).map(c=>({componentId:c._id,annual:1234.56,monthly:102.88}))}}]}});
 });
 await page.goto('/');
 await page.getByRole('button',{name:'Generate Payroll',exact:true}).click();
 await expect(page.getByLabel('Travel 0',{exact:true})).toBeChecked();
 await expect(page.getByRole('checkbox',{name:/Core Wages/})).toHaveCount(0);
 for(const name of ['Basic','Dearness Allowance','Retaining Allowance']) { await expect(page.getByLabel(name+' (required)',{exact:true})).toBeDisabled(); await expect(page.getByLabel(name+' (required)',{exact:true})).toBeChecked(); }
 for(const name of ['ER EPS','ER EPF','ER ESI','Gross Wages','Net Pay','Excess Allowance','Compliance Wage Base']) await expect(page.getByLabel(name,{exact:true})).toBeChecked();
 await page.getByRole('button',{name:'Deselect All',exact:true}).click();
 await expect(page.getByLabel('Travel 0',{exact:true})).not.toBeChecked();
 await expect(page.getByLabel('ER EPS',{exact:true})).not.toBeChecked();
 await expect(page.getByLabel('Basic (required)',{exact:true})).toBeChecked();
 if(include) await page.getByRole('button',{name:'Select All',exact:true}).click();
 await page.getByLabel('Report Type',{exact:true}).selectOption(period);
 await page.getByLabel('Payroll Month',{exact:true}).selectOption({index:1});
 const pending=page.waitForEvent('download');
 await page.getByRole('button',{name:'Generate PDF',exact:true}).click();
 const download=await pending;
 const bytes=await readFile((await download.path())!);
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;
 let text='';
 for(let i=1;i<=pdf.numPages;i++) {
  const p=await pdf.getPage(i), viewport=p.getViewport({scale:1});
  expect(viewport.width).toBeCloseTo(841.89,0);
  const content=await p.getTextContent();
  text+=content.items.map((item:any)=>item.str??'').join(' ');
  for(const item of content.items as any[]) if(item.str?.trim()) {
    expect(item.transform[4]).toBeGreaterThanOrEqual(15);
    expect(item.transform[4]+item.width).toBeLessThanOrEqual(viewport.width-14);
  }
 }
 if(include) { expect(text).toContain('ER EPS'); expect(text.replace(/\s/g,'')).toContain('ComplianceWageBase'); expect(text).toContain('Travel 0'); expect(text).toContain(period==='Annual'?'1,234.56':'102.88'); }
 else { expect(text).not.toContain('Travel 0'); for(const label of ['ER EPS','ER EPF','ER ESI','Gross Wages','Total Allowances','Excess Allowance','Compliance Wage Base']) expect(text.replace(/\s/g,'')).not.toContain(label.replace(/\s/g,'')); }
 expect(text.replace(/\s/g,'')).toContain('CoreWages');
 expect(text).toContain('Basic'); expect(text).toContain('DA'); expect(text).toContain('RA');
 expect(text).toContain('Total');
 await pdf.cleanup();
});

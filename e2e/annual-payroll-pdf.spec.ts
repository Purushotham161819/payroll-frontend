import {test,expect} from './authenticated-test';
import {readFile} from 'node:fs/promises';
const annual={annualCtc:108100,employerEpsContribution:4000,employerEpfContribution:2000,employerEsiContribution:2100,annualGrossWages:100000,annualBasicSalary:40000,annualDearnessAllowance:4000,annualRetainingAllowance:6000,annualCoreWages:50000,annualTotalAllowances:70000,annualExcessAllowance:20000,annualComplianceWageBase:70000,annualNetPay:100000};
for(const count of [20,70]) test(`annual PDF: ${count} employees, all columns and totals`,async({page})=>{
  const employees=Array.from({length:count},(_,i)=>({employee:{_id:String(i),firstName:'Excel',lastName:`Employee ${i+1}`,annualCtc:108100},calculation:{annual}}));
  await page.route('**/employees',r=>r.fulfill({json:employees.map(r=>r.employee)}));
  await page.route('**/payroll/annual',r=>r.fulfill({json:{employees}}));
  await page.route('**/salary-components',r=>r.fulfill({json:[{_id:'basic',code:'BASIC',name:'Basic',category:'earning',status:'active',isSystemDefined:true}]}));
  await page.goto('/');
  await page.getByRole('button',{name:'Generate Payroll',exact:true}).click();
  await page.getByLabel('Payroll Month',{exact:true}).selectOption({index:1});
  const pending=page.waitForEvent('download');
  await page.getByRole('button',{name:'Generate PDF',exact:true}).click();
  const download=await pending;
  expect(download.suggestedFilename()).toContain('Payroll_Report_January_');
  const bytes=await readFile((await download.path())!);
  expect(bytes.subarray(0,4).toString()).toBe('%PDF');
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;
  if(count===20) expect(doc.numPages).toBe(1);else expect(doc.numPages).toBeGreaterThan(1);
  let allText='';
  for(let i=1;i<=doc.numPages;i++) {
    const pdfPage=await doc.getPage(i);
    const viewport=pdfPage.getViewport({scale:1});
    expect(viewport.width).toBeCloseTo(841.89,0);expect(viewport.height).toBeCloseTo(595.28,0);
    const content=await pdfPage.getTextContent();
    const text=content.items.map((item:any)=>item.str??'').join(' ').replace(/\s+/g,' ');
    for(const heading of ['Employee Name','Annual CTC','ER EPS','ER EPF','ER ESI','Gross Wages','Basic','DA','RA','Core Wages','Total Allowances','Excess Allowance','Compliance Wage Base']) expect(text).toContain(heading);
    expect(text).toContain('Payroll Month: January');
    for(const item of content.items as any[]) if(item.str?.trim()) {
      expect(item.transform[4]).toBeGreaterThanOrEqual(15);
      expect(item.transform[4]+item.width).toBeLessThanOrEqual(viewport.width-14);
      expect(item.transform[5]).toBeGreaterThan(5);
    }
    allText+=text;
  }
  for(const value of Object.values(annual)) expect(allText).toContain(new Intl.NumberFormat('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value));
  expect(allText).toContain('Total');
  for(const value of Object.values(annual)) expect(allText).toContain(new Intl.NumberFormat('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value*count));
  expect(allText).not.toContain('NET Pay');expect(allText).not.toContain('Monthly Earnings');
  await doc.cleanup();
});


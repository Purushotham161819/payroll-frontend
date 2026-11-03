import { test, expect } from './authenticated-test';
import { jsPDF } from 'jspdf';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const dir=process.env.PAY_CHECKS_ARTIFACTS??'artifacts/phase4h-pay-checks';mkdirSync(dir,{recursive:true});
const id='507f1f77bcf86cd799439011';
const employee={_id:id,employeeId:'EMP001',firstName:'Ada',lastName:'Example',email:'ada@example.test',dateOfBirth:'1990-01-01',hireDate:'2020-01-01',annualCtc:1200000,payFrequency:'Monthly',status:'Active'};
const records=['2026-11','2026-10','2026-09'].map((period,i)=>({id:'immutable-check-'+i,employeeId:id,firstName:'Ada',lastName:'Example',period,paymentDate:period+'-28',payFrequency:'Monthly',grossPay:200000,employerContributions:10000,deductions:150000,netPay:50000,paymentStatus:i===0?'Payment Pending':'Paid',...(i===0?{tds:123456.78}:i===1?{tds:0}:{})}));
if(!existsSync(dir+'/stored-payslip.pdf')){const pdf=new jsPDF();pdf.setCreationDate(new Date('2026-01-01T00:00:00Z'));pdf.setFileId('1234567890ABCDEF1234567890ABCDEF');pdf.text('Stored finalized synthetic payslip - unchanged',20,20);writeFileSync(dir+'/stored-payslip.pdf',Buffer.from(pdf.output('arraybuffer')));}
const bytes=readFileSync(dir+'/stored-payslip.pdf'),sha=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
for(const width of [1440,1280,768,390])test('Pay Checks history and immutable PDF evidence '+width,async({page})=>{
  const prefix=process.env.PAY_CHECKS_CAPTURE==='before'?'before':'after';
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  let releaseHistory!:()=>void,releasePdf!:()=>void;
  const historyGate=new Promise<void>(r=>releaseHistory=r),pdfGate=new Promise<void>(r=>releasePdf=r);
  let historyMode='hold',pdfMode='hold',historyReads=0,pdfReads=0,writes=0;
  await page.route('http://localhost:3000/employees',r=>r.fulfill({json:[employee]}));
  await page.route('**/payroll/**',async r=>{
    const request=r.request();if(request.method()!=='GET'){writes++;return r.fulfill({status:500,json:{message:'Unexpected mutation'}});}
    if(request.url().endsWith('/employees/'+id+'/checks')){
      historyReads++;if(historyMode==='hold')await historyGate;
      return historyMode==='denied'?r.fulfill({status:403,json:{message:'Denied'}}):r.fulfill({json:historyMode==='empty'?[]:records});
    }
    expect(request.url()).toContain('/runs/2026-11/checks/'+id+'/pdf');pdfReads++;if(pdfMode==='hold')await pdfGate;
    if(pdfMode==='missing'||pdfMode==='denied')return r.fulfill({status:pdfMode==='missing'?404:403,json:{message:'Stored PDF unavailable'}});
    return r.fulfill({contentType:'application/pdf',body:bytes});
  });
  const screen=page.locator('app-pay-checks');const shot=async(name:string,target:any=screen)=>target.screenshot({path:`${dir}/${prefix}-${name}-${width}.png`});
  await page.goto('/employees/'+id+'?tab=checks');await expect(screen.getByRole('status')).toContainText('Loading pay checks');await shot('loading');
  historyMode='ready';releaseHistory();const table=screen.getByRole('table',{name:'Employee pay checks',exact:true});await expect(table.locator('tbody tr')).toHaveCount(3);await page.screenshot({path:`${dir}/${prefix}-profile-${width}.png`,fullPage:true});await shot('history');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const initial=await screen.evaluate(el=>(window as any).ng.getComponent(el).checks());expect(initial).toEqual(records);await expect(table.getByRole('columnheader')).toHaveCount(8);await expect(table.locator('tbody tr').first()).toContainText('Nov 2026');
  const rows=table.locator('tbody tr'),beforeReads={historyReads,pdfReads};
  const cells=rows.first().locator('td');for(const [index,text] of [[0,'Nov 2026'],[1,'28 Nov 2026'],[2,'\u20b92,00,000'],[3,'\u20b910,000'],[4,'\u20b91,50,000'],[5,'\u20b950,000'],[6,'Payment Pending']] as const)await expect(cells.nth(index)).toContainText(text);await expect(rows.nth(1).locator('td').nth(6)).toContainText('Paid');
  const metrics=await screen.evaluate(el=>{const table=el.querySelector('table')!,row=table.querySelector('tbody tr')!,header=table.querySelector('thead tr')!,scroll=el.querySelector('ps-data-table .scroll')!;return {rowHeight:row.getBoundingClientRect().height,headerHeight:header.getBoundingClientRect().height,scrollClientWidth:scroll.clientWidth,scrollWidth:scroll.scrollWidth,numericAlignment:getComputedStyle(row.querySelector('.num')!).textAlign,buttons:Array.from(row.querySelectorAll('button')).map(b=>({width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}))};});writeFileSync(dir+'/'+prefix+'-metrics-'+width+'.json',JSON.stringify(metrics,null,2));expect(metrics.rowHeight).toBe(56);expect(metrics.headerHeight).toBeGreaterThanOrEqual(44);expect(metrics.numericAlignment).toBe('right');for(const button of metrics.buttons){expect(button.width).toBe(32);expect(button.height).toBe(32);}
  for(const [i,text] of [[0,'₹1,23,456.78'],[1,'₹0.00'],[2,'TDS was not recorded for this pay check.']] as const){
    const trigger=rows.nth(i).getByRole('button',{name:'View TDS details',exact:true});await trigger.click();const popup=page.getByRole('dialog',{name:'Income Tax / TDS',exact:true});await expect(popup).toContainText(text);const box=(await popup.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);await shot(i===0?'tds':i===1?'tds-zero':'tds-missing',popup);await page.keyboard.press('Escape');await expect(popup).toHaveCount(0);
  }
  expect({historyReads,pdfReads}).toEqual(beforeReads);
  const view=rows.first().getByRole('button',{name:'View Pay Check',exact:true});await view.scrollIntoViewIfNeeded();const scroll=screen.locator('ps-data-table .scroll'),left=await scroll.evaluate(el=>el.scrollLeft);
  await view.click();await expect(screen.getByRole('status').filter({hasText:'Loading pay check PDF'})).toBeVisible();await shot('pdf-loading');pdfMode='ready';releasePdf();
  const viewer=page.getByRole('dialog',{name:'Pay Check - Nov 2026',exact:true});await expect(viewer).toBeVisible();const viewerBox=(await viewer.boundingBox())!;expect(viewerBox.x).toBeGreaterThanOrEqual(0);expect(viewerBox.x+viewerBox.width).toBeLessThanOrEqual(width);expect(viewerBox.height).toBeLessThanOrEqual(1000);const iframe=viewer.locator('iframe');await expect(iframe).toHaveAttribute('src',/^blob:/);
  const viewed=Buffer.from(await iframe.evaluate(async(el:HTMLIFrameElement)=>Array.from(new Uint8Array(await (await fetch(el.src)).arrayBuffer()))));expect(viewed.equals(bytes)).toBe(true);await viewer.getByRole('heading').click();await shot('viewer',viewer);await page.keyboard.press('Escape');await expect(viewer).toHaveCount(0);await shot('viewer-closed');const focusReturned=await view.evaluate(el=>el===document.activeElement);if(prefix==='after')await expect(view).toBeFocused();expect(await scroll.evaluate(el=>el.scrollLeft)).toBe(left);await expect(page.getByRole('tab',{name:'Pay Checks',exact:true})).toHaveAttribute('aria-selected','true');
  const download=rows.first().getByRole('button',{name:'Download Pay Check PDF',exact:true});const pending=page.waitForEvent('download');await download.click();const file=await pending;expect(file.suggestedFilename()).toBe(`Payslip_2026-11_${id}.pdf`);const downloaded=readFileSync((await file.path())!);expect(downloaded.equals(bytes)).toBe(true);await expect(page.getByRole('tooltip')).toHaveText('Download Pay Check PDF');await shot('download');await page.keyboard.press('Escape');await page.mouse.move(0,0);
  pdfMode='missing';await view.click();await expect(screen.getByRole('alert')).toContainText('unavailable');await shot('pdf-unavailable');await page.keyboard.press('Escape');await page.mouse.move(0,0);pdfMode='denied';await download.click();await expect(screen.getByRole('alert')).toContainText('permission');await shot('download-denied');
  const final=await screen.evaluate(el=>(window as any).ng.getComponent(el).checks());expect(final).toEqual(records);
  writeFileSync(`${dir}/${prefix}-comparison-${width}.json`,JSON.stringify({records:final,viewedPdfSha256:sha(viewed),downloadedPdfSha256:sha(downloaded),storedPdfSha256:sha(bytes),focusReturned,writes},null,2));
  historyMode='empty';await page.reload();await expect(screen.locator('ps-data-table [role=status]')).toContainText(/No .*pay checks/i);await shot('empty');historyMode='denied';await page.reload();await expect(screen.getByRole('alert')).toContainText('permission');await shot('history-denied');
  expect(writes).toBe(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

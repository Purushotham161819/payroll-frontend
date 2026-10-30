import { test, expect } from './authenticated-test';
import { jsPDF } from 'jspdf';
const year=new Date().getFullYear(), current=`${year}-${String(new Date().getMonth()+1).padStart(2,'0')}`, alternate=current.endsWith('-01')?`${year}-02`:`${year}-01`;
const people=['Ada','Grace','Historical'].map((firstName,i)=>({_id:`507f1f77bcf86cd79943901${i}`,employeeId:`EMP00${i+1}`,firstName,lastName:'Example',email:`final-${i}@example.test`,dateOfBirth:'1990-01-01',hireDate:'2020-01-01',annualCtc:(i+1)*120000,payFrequency:'Monthly',status:'Active'}));
function watchTransitions(){
  const original=Element.prototype.animate;
  (window as any).__transitions=[];
  Element.prototype.animate=function(keyframes:any,options:any){(window as any).__transitions.push({tag:this.tagName,duration:options?.duration,path:location.pathname});return original.call(this,keyframes,options);};
}
async function api(page:any){
  await page.route('**/employees', (r:any)=>r.fulfill({json:people}));
  const drafts=new Map<string,any>([[current,{ids:[people[0]._id],date:`${year}-11-01`,version:1}],[alternate,{ids:[people[0]._id],date:`${year}-11-02`,version:1}]]);
  const checks=(ids:string[])=>ids.filter(id=>id!==people[2]._id).map(id=>{const p=people.find(p=>p._id===id)!;return {employeeId:id,firstName:p.firstName,lastName:p.lastName,annualCtc:p.annualCtc,monthlyCtc:p._id===people[0]._id?10000:20000,payFrequency:'Monthly',grossPay:9000,employerContributions:100,deductions:50,netPay:8500,paymentStatus:'Not Paid'};});
  const snapshot=(period:string,ids:string[],date:string|null,version:number)=>{
    const values=checks(ids);return {period,organizationName:'Example Organization',status:'Draft',version,paymentDate:date,calculatedAt:new Date().toISOString(),calculationVersion:'v1',inputHash:'hash-'+values.map(c=>c.employeeId).sort().join('-'),checks:values,draftSaved:true,totalPayrollCost:values.reduce((sum,c)=>sum+c.monthlyCtc,0),totalPayrollCostPeriod:'Monthly',employeeCompensation:people.map((p,i)=>({employeeId:p._id,payFrequency:'Monthly',monthlyCtc:(i+1)*10000})),processedEmployeeIds:[people[2]._id],historicalChecks:[{employeeId:people[2]._id,firstName:'Historical',lastName:'Example',annualCtc:60000,monthlyCtc:5000,grossPay:4000,employerContributions:100,deductions:50,netPay:3950,paymentStatus:'Payment Pending',pdfUrl:'/protected'}],totals:{employerContributions:values.length*100,deductions:values.length*50,netPay:values.length*8500}};
  };
  const state={reads:0,writes:0,hold:false,release:undefined as (()=>void)|undefined};
  await page.route('**/payroll/runs/preview',async(r:any)=>{state.reads++;const body=r.request().postDataJSON();if(state.hold){state.hold=false;await new Promise<void>(resolve=>state.release=resolve);}const saved=drafts.get(body.period);await r.fulfill({json:snapshot(body.period,!body.recalculate&&saved?saved.ids:body.employeeIds,saved?.date??null,saved?.version??0)});});
  await page.route('**/payroll/runs/draft',(r:any)=>{state.writes++;const body=r.request().postDataJSON();expect(body).not.toHaveProperty('monthlyCtc');expect(body).not.toHaveProperty('netPay');const saved={ids:body.employeeIds,date:body.paymentDate,version:body.version+1};drafts.set(body.period,saved);return r.fulfill({json:snapshot(body.period,saved.ids,saved.date,saved.version)});});
  return state;
}
test('monthly CTC, icon actions, guide and exact payroll return context survive profile navigation and refresh',async({page})=>{
  const calls=await api(page);const doc=new jsPDF();doc.text('Original historical payslip',18,20);const pdf=Buffer.from(doc.output('arraybuffer'));
  await page.route('**/payroll/runs/*/checks/*/pdf',r=>{expect(r.request().url()).toContain(people[2]._id);expect(r.request().headers()['x-payroll-request']).toBe('1');return r.fulfill({contentType:'application/pdf',body:pdf});});
  await page.goto(`/payroll/run?employees=${people[0]._id}&returnStatus=All`);
  const table=page.getByRole('table',{name:'Employee payroll',exact:true});await expect(table.getByRole('columnheader',{name:'Monthly CTC',exact:true})).toBeVisible();await expect(table.getByRole('columnheader',{name:'Annual CTC',exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Total Payroll Cost',{exact:true})).toContainText('10,000.00');await expect(page.getByRole('heading',{name:'Payroll Calculation Guide'})).toBeVisible();await expect(page.getByText('Excluded from new draft totals',{exact:true})).toBeVisible();
  const historical=table.getByRole('row').filter({has:page.getByRole('link',{name:'Historical',exact:true})});
  for(const name of ['View Pay Check','Download Pay Check']){const button=historical.getByRole('button',{name,exact:true});await expect(button).toHaveAttribute('title',name);expect((await button.textContent())?.trim()).toBe('');await expect(button.locator('svg')).toBeVisible();}
  await page.getByLabel('Pay Period',{exact:true}).selectOption(alternate);await expect(page.getByLabel('Payment Date',{exact:true})).toHaveValue(`${year}-11-02`);
  const privateDate=`${year}-12-20`;await page.getByLabel('Payment Date',{exact:true}).fill(privateDate);await table.getByRole('checkbox',{name:'Include Grace Example in payroll'}).check();await expect(page.getByLabel('Total Payroll Cost',{exact:true})).toContainText('30,000.00');
  await page.getByRole('link',{name:'Ada',exact:true}).click();await expect(page.getByRole('heading',{name:'Ada Example'})).toBeVisible();await expect(page.getByRole('link',{name:'Back to Run Payroll',exact:true})).toBeVisible();expect(page.url()).not.toContain(privateDate);
  const state=await page.evaluate(()=>JSON.stringify(history.state));expect(state).not.toContain('netPay');expect(state).not.toContain('monthlyCtc');expect(state).not.toContain('annualCtc');
  await page.getByRole('link',{name:'Back to Run Payroll',exact:true}).click();await expect(page.getByLabel('Pay Period',{exact:true})).toHaveValue(alternate);await expect(page.getByLabel('Payment Date',{exact:true})).toHaveValue(privateDate);await expect(table.getByRole('checkbox',{name:'Include Grace Example in payroll'})).toBeChecked();await expect(page.getByLabel('Total Payroll Cost',{exact:true})).toContainText('30,000.00');expect(calls.writes).toBe(0);
  const ada=table.getByRole('row').filter({has:page.getByRole('link',{name:'Ada',exact:true})});await ada.getByRole('link',{name:'Example',exact:true}).click();await expect(page.getByRole('heading',{name:'Ada Example'})).toBeVisible();await page.reload();await expect(page.getByRole('link',{name:'Back to Run Payroll',exact:true})).toBeVisible();await page.getByRole('link',{name:'Back to Run Payroll',exact:true}).click();
  await expect(page.getByLabel('Pay Period',{exact:true})).toHaveValue(alternate);await expect(page.getByLabel('Payment Date',{exact:true})).toHaveValue(privateDate);await expect(page.getByLabel('Total Payroll Cost',{exact:true})).toContainText('30,000.00');await expect(page.getByRole('button',{name:'Submit',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByRole('button',{name:'Submit',exact:true})).toBeEnabled();await page.getByRole('link',{name:'Ada',exact:true}).click();await page.getByRole('link',{name:'Back to Run Payroll',exact:true}).click();await expect(page.getByRole('button',{name:'Submit',exact:true})).toBeEnabled();expect(calls.writes).toBe(1);
  const refresh=page.getByRole('button',{name:'Recalculate / Refresh Payroll',exact:true});await expect(refresh).toHaveAttribute('title','Recalculate / Refresh Payroll');calls.hold=true;const before=calls.reads;await refresh.click();await expect(refresh).toBeDisabled();await expect(refresh).toHaveAttribute('aria-busy','true');await refresh.evaluate((button:HTMLButtonElement)=>{button.click();button.click();});expect(calls.reads).toBe(before+1);calls.release?.();await expect(page.getByText('Payroll recalculated.',{exact:false})).toBeVisible();await expect(refresh).toBeEnabled();
  await historical.getByRole('button',{name:'View Pay Check',exact:true}).click();const viewer=page.getByRole('dialog',{name:'Historical Pay Check'});await expect(viewer.locator('iframe')).toHaveAttribute('src',/^blob:/);await viewer.getByRole('button',{name:'Close pay check viewer'}).click();
  const download=page.waitForEvent('download');await historical.getByRole('button',{name:'Download Pay Check',exact:true}).click();expect((await download).suggestedFilename()).toBe(`Payslip_${alternate}_${people[2]._id}.pdf`);
  await page.screenshot({path:'test-results/final-payroll-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/final-payroll-mobile.png',fullPage:true});
});
test('direct and invalid external profile origins use the safe Employees fallback',async({page})=>{
  await page.route('**/employees',r=>r.fulfill({json:people}));await page.goto(`/employees/${people[0]._id}?returnStatus=All`);await expect(page.getByRole('link',{name:'Back to Employees',exact:true})).toBeVisible();
  await page.evaluate(()=>history.replaceState({...history.state,employeeOrigin:{kind:'payroll',scope:'user:test-user:legacy',url:'//outside.example.test'}},'',location.href));await page.reload();await expect(page.getByRole('link',{name:'Back to Run Payroll'})).toHaveCount(0);await page.getByRole('link',{name:'Back to Employees',exact:true}).click();await expect(page.getByLabel('Employee Status')).toHaveValue('All');
});
test('main-content transitions are consistent across business routes, coalesce fast navigation and honor reduced motion',async({page})=>{
  await page.route('**/auth/me',r=>r.fulfill({json:{id:'admin-test',email:'admin@example.test',role:'admin'}}));await page.addInitScript(watchTransitions);
  const counts={employees:0,settings:0,users:0,statutory:0};
  await page.route('**/employees',r=>{counts.employees++;return r.fulfill({json:people});});await page.route('**/salary-components',r=>{counts.settings++;return r.fulfill({json:[]});});await page.route('**/users',r=>{counts.users++;return r.fulfill({json:[]});});await page.route('**/settings/statutory-deductions',r=>{counts.statutory++;return r.fulfill({json:null});});
  await page.goto('/');await expect(page.getByRole('heading',{name:'Employees',exact:true})).toBeVisible();await page.evaluate(()=>(window as any).__header=document.querySelector('.topbar'));
  await page.getByRole('link',{name:'Settings',exact:true}).click();await expect(page.getByRole('heading',{name:'Settings',exact:true})).toBeVisible();await page.getByRole('link',{name:'Statutory Deductions',exact:true}).click();await expect(page.getByText('No statutory deduction settings have been configured.',{exact:false})).toBeVisible();await page.getByRole('link',{name:'User Management',exact:true}).click();await expect(page.getByRole('heading',{name:'User Management',exact:true})).toBeVisible();
  await expect.poll(() => counts).toEqual({employees:1,settings:1,users:1,statutory:1});await page.evaluate(()=>{document.querySelector<HTMLAnchorElement>('aside a[href="/settings"]')!.click();document.querySelector<HTMLAnchorElement>('aside a[href="/"]')!.click();});await expect(page.getByRole('heading',{name:'Employees',exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.querySelector('main')!.getAnimations().length)).toBe(0);expect(await page.evaluate(()=>(window as any).__header===document.querySelector('.topbar'))).toBe(true);
  const animations=await page.evaluate(()=>(window as any).__transitions as {tag:string;duration:number}[]);expect(animations.length).toBeGreaterThanOrEqual(4);expect(animations.every(a=>a.tag==='MAIN'&&a.duration===180)).toBe(true);expect(counts.employees).toBe(2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  const count = animations.length;
  await page.getByRole('link', { name: 'Ada', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ada Example' })).toBeVisible();
  await page.getByRole('tab', { name: 'Employment History' }).click();
  // Angular replaces the details panel; never read its detached DOM node.
  const historyPanel = page.getByRole('tabpanel', { name: 'Employment History', exact: true });
  await expect(historyPanel).toBeVisible();
  await expect(historyPanel).toHaveCSS('animation-name', 'none');
  expect(await historyPanel.evaluate(panel => panel.getAnimations().length)).toBe(0);
  expect(await page.evaluate(() => (window as any).__transitions.length)).toBe(count);
  expect(counts.employees).toBe(3);
});
test('Super Admin dashboard, organization list and organization details use the same main-content transition',async({page})=>{
  await page.route('**/auth/me',r=>r.fulfill({json:{id:'super-test',email:'super@example.test',role:'super_admin'}}));await page.addInitScript(watchTransitions);
  const org={organizationId:'ORG000001',name:'Customer One',status:'active',createdAt:'2026-01-01'};
  await page.route('**/super-admin/dashboard',r=>r.fulfill({json:{organizations:1,activeOrganizations:1,admins:1,users:0}}));await page.route(/\/super-admin\/organizations(?:\?.*)?$/,r=>r.fulfill({json:{items:[org],total:1}}));await page.route('**/super-admin/organizations/ORG000001',r=>r.fulfill({json:org}));await page.route(/\/super-admin\/organizations\/ORG000001\/audit(?:\?.*)?$/,r=>r.fulfill({json:{items:[],total:0}}));
  await page.goto('/super-admin');await page.getByRole('link',{name:'Customers & accounts',exact:true}).click();await page.getByRole('link',{name:'Customer One',exact:true}).click();await expect(page.getByRole('heading',{name:'Customer One',exact:true})).toBeVisible();await expect.poll(()=>page.evaluate(()=>(window as any).__transitions.length)).toBeGreaterThanOrEqual(3);expect(await page.evaluate(()=>(window as any).__transitions.every((a:any)=>a.tag==='MAIN'&&a.duration===180))).toBe(true);
});

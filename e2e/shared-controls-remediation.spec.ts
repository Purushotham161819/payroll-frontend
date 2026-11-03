import {productDropdownEvidence} from './product-dropdown-evidence';
import {dropdownEvidence} from './dropdown-evidence';
import {selectPeriod,expectPeriod} from './select-period';
import {test,expect} from './authenticated-test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {jsPDF} from 'jspdf';
const artifacts=process.env.CONTROLS_ARTIFACTS??'artifacts/phase4g-dropdown-spec';mkdirSync(artifacts,{recursive:true});
for(const width of [1440,1280,768,390])test('Shared payroll controls '+width,async({page})=>{
  const year = new Date().getFullYear();
  const first = `${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const second = first.endsWith('-01') ? `${year}-02` : `${year}-01`;
  const firstDate = `${year}-12-15`,
    secondDate = `${year}-11-05`,
    updatedDate = `${year}-12-20`;
  const people = ['Ada', 'Grace', 'Pending', 'Paid'].map((firstName, i) => ({
    _id: `507f1f77bcf86cd79943901${i}`,
    firstName,
    lastName: 'Example',
    employeeId: `EMP00${i + 1}`,
    email: `unified-${i}@example.test`,
    dateOfBirth: '1990-01-01',
    hireDate: '2020-01-01',
    status: 'Active',
    payFrequency: 'Monthly',
    annualCtc: i === 0 ? 100000.01 : i === 1 ? 200000.02 : 999999,
  }));
  const check = (id: string) => {
    const person = people.find((p) => p._id === id)!;
    return {
      employeeId: id,
      firstName: person.firstName,
      lastName: person.lastName,
      annualCtc: person.annualCtc,
      monthlyCtc: Number((person.annualCtc / 12).toFixed(2)),
      grossPay: 100,
      employerContributions: 10,
      deductions: 5,
      netPay: 95,
      paymentStatus: 'Not Paid',
    };
  };
  const historical = [
    {
      ...check(people[2]._id),
      annualCtc: 120000,
      monthlyCtc: 10000,
      paymentStatus: 'Payment Pending',
      payrollStatus: 'Submitted',
      pdfUrl: '/protected',
    },
    {
      ...check(people[3]._id),
      annualCtc: 240000,
      monthlyCtc: 20000,
      paymentStatus: 'Paid',
      payrollStatus: 'Submitted',
      pdfUrl: '/protected',
    },
  ];
  const drafts = new Map<string, { ids: string[]; date: string | null; version: number }>([
    [first, { ids: [people[0]._id], date: firstDate, version: 3 }],
    [second, { ids: [people[0]._id], date: secondDate, version: 1 }],
  ]);
  const summary = (period: string, ids: string[], date: string | null, version: number) => {
    const history = period === first ? historical : [];
    const checks = ids.filter((id) => !history.some((h) => h.employeeId === id)).map(check);
    return {
      period,
      organizationName: 'Example Organization',
      status: 'Draft',
      checks,
      historicalChecks: history,
      processedEmployeeIds: history.map((h) => h.employeeId),
      draftSaved: true,
      version,
      paymentDate: date,
      calculatedAt: new Date().toISOString(),
      calculationVersion: 'v1',
      inputHash: 'trusted-hash',
      employeeCompensation: people.map(p => ({employeeId:p._id, payFrequency:'Monthly', monthlyCtc:Number((p.annualCtc/12).toFixed(2))})),
      totalPayrollCost: Number(checks.reduce((s, c) => s + c.monthlyCtc, 0).toFixed(2)),
      totals: {
        employerContributions: checks.length * 10,
        deductions: checks.length * 5,
        netPay: checks.length * 95,
      },
    };
  };
  let previewWrites = 0,
    submits = 0,
    submitted: any = null;
  await page.route('**/employees', (r) => r.fulfill({ json: people }));
  await page.route('**/payroll/runs/preview', (r) => {
    const body = r.request().postDataJSON();
    const saved = drafts.get(body.period);
    return r.fulfill({
      json: summary(
        body.period,
        !body.recalculate && saved ? saved.ids : body.employeeIds,
        saved?.date ?? null,
        saved?.version ?? 2,
      ),
    });
  });
  await page.route('**/payroll/runs/draft', (r) => {
    const body = r.request().postDataJSON();
    previewWrites++;
    expect(body).not.toHaveProperty('totalPayrollCost');
    expect(body.employeeIds).not.toContain(people[2]._id);
    expect(body.employeeIds).not.toContain(people[3]._id);
    const draft = { ids: body.employeeIds, date: body.paymentDate, version: body.version + 1 };
    drafts.set(body.period, draft);
    return r.fulfill({ json: summary(body.period, draft.ids, draft.date, draft.version) });
  });
  await page.route('**/payroll/runs/*/submit', (r) => {
    const body = r.request().postDataJSON();
    submits++;
    const draft = drafts.get(first)!;
    expect(draft.ids).toEqual([people[1]._id]);
    expect(body.paymentDate).toBe(updatedDate);
    submitted = {
      ...summary(first, draft.ids, draft.date, draft.version + 1),
      status: 'Submitted',
      idempotencyKey: body.idempotencyKey,
      submittedAt: new Date().toISOString(),
      checks: draft.ids.map((id) => ({
        ...check(id),
        paymentStatus: 'Payment Pending',
        pdfUrl: '/protected',
      })),
    };
    return r.fulfill({ json: submitted });
  });
  await page.route(/\/payroll\/runs\/\d{4}-\d{2}(?:\?.*)?$/, (r) => r.fulfill({ json: submitted }));
  const doc = new jsPDF();
  doc.text('Original historical payslip - unchanged', 15, 20);
  const bytes = Buffer.from(doc.output('arraybuffer'));
  await page.route('**/payroll/runs/*/checks/*/pdf', (r) => {
    expect(r.request().url()).toContain(people[2]._id);
    return r.fulfill({ contentType: 'application/pdf', body: bytes });
  });


await page.setViewportSize({width,height:1000});await page.goto('/payroll/run?employees='+people[0]._id);const period=page.getByLabel('Pay Period',{exact:true}),date=page.getByLabel('Payment Date',{exact:true});await expect(period).toBeVisible();await expect(date).toBeVisible();
const prefix=process.env.CONTROLS_CAPTURE==='before'?'before':'after';const shoot=async(name:string,locator:any)=>locator.screenshot({path:artifacts+'/'+prefix+'-'+name+'-'+width+'.png'});
await productDropdownEvidence(page,'payroll',width);
if(prefix==='after') await dropdownEvidence(page,period,artifacts,width);
await shoot('period',period.locator('xpath=ancestor::ps-form-field'));await shoot('date',date.locator('xpath=ancestor::ps-form-field'));
const table=page.getByRole('table',{name:'Employee payroll',exact:true});await shoot('checkboxes',page.getByRole('region',{name:'Employee payroll table',exact:true}));
const measurements=await page.evaluate(()=>{const selectors=['#pay-period','#payment-date','tbody input[type=checkbox]','thead input[type=checkbox]'];return {baseSelect:CSS.supports('appearance','base-select'),controls:selectors.map(s=>{const el=document.querySelector(s)!;const c=getComputedStyle(el),a=getComputedStyle(el,'::after'),r=el.getBoundingClientRect();return {selector:s,width:r.width,height:r.height,border:c.border,borderRadius:c.borderRadius,fontSize:c.fontSize,fontWeight:c.fontWeight,backgroundImage:c.backgroundImage,backgroundPosition:c.backgroundPosition,backgroundSize:c.backgroundSize,arrowElement:el.querySelector(".ps-select-arrow")?.getBoundingClientRect().toJSON()??null,appearance:c.appearance,background:c.backgroundColor,color:c.color,padding:c.padding,mark:{content:a.content,border:a.borderColor,background:a.backgroundColor}};})};});writeFileSync(artifacts+'/'+prefix+'-metrics-'+width+'.json',JSON.stringify(measurements,null,2));
await period.click();await page.screenshot({path:artifacts+'/'+prefix+'-open-period-'+width+'.png',fullPage:false});await page.keyboard.press('Escape');
if(prefix==='after'){expect(measurements.controls[0].appearance).toBe('none');expect(measurements.controls[0].height).toBe(40);expect(measurements.controls[1].height).toBe(40);expect(measurements.controls[0].width).toBeLessThanOrEqual(width===390?width-32:280);expect(measurements.controls[1].width).toBeLessThanOrEqual(width===390?width-32:280);}
await period.focus();await page.keyboard.press('Space');await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expectPeriod(period,year+'-02');await expect(page.getByRole('status').filter({hasText:'Updating payroll'})).toHaveCount(0);
await selectPeriod(period,first);await expect(date).toHaveValue(firstDate);if(prefix==='after'){const box=(await date.boundingBox())!;await date.click({position:{x:box.width-20,y:box.height/2}});await date.evaluate((el:HTMLInputElement)=>el.showPicker());await page.screenshot({path:artifacts+'/after-date-picker-'+width+'.png',fullPage:false});await page.keyboard.press('Escape');await date.click({position:{x:20,y:box.height/2}});await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');await expect(date).toHaveValue(year+'-12-16');}
await date.fill(updatedDate);await expect(date).toHaveValue(updatedDate);
const settled=async()=>expect(page.getByRole('status').filter({hasText:'Updating payroll'})).toHaveCount(0);const row=table.getByRole('checkbox',{name:'Include Ada Example in payroll',exact:true});await row.uncheck();await settled();await expect(row).not.toBeChecked();await row.check();await settled();await expect(row).toBeChecked();const all=table.getByRole('checkbox',{name:'Select all eligible employees',exact:true});await all.check();await settled();await expect(all).toBeChecked();await shoot('all-selected',table);await all.uncheck();await settled();await expect(all).not.toBeChecked();await row.check();await settled();await expect(all).toHaveJSProperty('indeterminate',true);
await shoot('mixed-selection',table);if(prefix==='after'){const checked=table.getByRole('checkbox',{name:'Include Ada Example in payroll',exact:true});await checked.screenshot({path:artifacts+'/after-checked-100-'+width+'.png'});await table.evaluate(el=>(el as HTMLElement).style.zoom='2');expect((await checked.boundingBox())!.width).toBe(36);await checked.screenshot({path:artifacts+'/after-checked-200-'+width+'.png'});await shoot('checkboxes-200',table);await table.evaluate(el=>(el as HTMLElement).style.zoom='');}const disabled=table.getByRole('checkbox',{name:'Pending Example already submitted',exact:true});await expect(disabled).toBeChecked();await expect(disabled).toBeDisabled();if(prefix==='after'){expect(await disabled.evaluate(el=>getComputedStyle(el).appearance)).toBe('none');expect(await disabled.evaluate(el=>getComputedStyle(el,'::after').content)).toBe('\"\"');expect(await row.evaluate(el=>getComputedStyle(el).appearance)).toBe('auto');expect((await row.boundingBox())!.width).toBe(18);
if(width===390){await page.emulateMedia({forcedColors:'active'});await shoot('forced-colors',table);await shoot('forced-colors-period',period.locator('xpath=ancestor::ps-form-field'));await expect(disabled).toBeChecked();expect(await disabled.evaluate(el=>getComputedStyle(el).appearance)).toBe('auto');await page.emulateMedia({forcedColors:'none'});}}
expect(submits).toBe(0);expect(previewWrites).toBe(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
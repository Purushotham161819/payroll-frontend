import {selectPeriod,expectPeriod} from './select-period';
import { test, expect } from './authenticated-test';
import { mkdirSync } from 'node:fs';
import { jsPDF } from 'jspdf';
const artifacts='artifacts/phase4g-run-payroll';mkdirSync(artifacts,{recursive:true});
for(const width of [1440,1280,768,390])test('Run Payroll visual and workflow '+width,async({page})=>{
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

await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:1000});await page.goto('/payroll/run?employees='+people[1]._id+'&returnStatus=All');
const table=page.getByRole('table',{name:'Employee payroll',exact:true});await expect(table.locator('tbody tr')).toHaveCount(4);
const prefix=process.env.PHASE4G_CAPTURE==='before'?'before':'after';const shot=async(name:string,locator:any=page.locator('app-run-payroll'))=>locator.screenshot({path:artifacts+'/'+prefix+'-'+name+'-'+width+'.png'});
await page.screenshot({path:artifacts+'/'+prefix+'-main-'+width+'.png',fullPage:true});await shot('kpis',page.getByLabel('Payroll period, payment date and KPIs'));await shot('employee-table',page.getByRole('region',{name:'Employee payroll table',exact:true}));
await expect(page.getByLabel('Payment Date',{exact:true})).toHaveValue(firstDate);
const immutable=JSON.stringify(historical);
if(width===390&&prefix==='after'){
const scroll=page.getByRole('region',{name:'Employee payroll table',exact:true});const name=table.getByRole('link',{name:'Ada',exact:true});await name.focus();await scroll.evaluate(el=>{el.scrollLeft=300;});const left=await scroll.evaluate(el=>el.scrollLeft);expect(left).toBeGreaterThan(0);await page.keyboard.press('Enter');
await expect(page.getByRole('heading',{name:'Ada Example',exact:true})).toBeVisible();await page.getByRole('link',{name:'Back to Run Payroll',exact:true}).click();await expectPeriod(page.getByLabel('Pay Period',{exact:true}),first);await expect(page.getByLabel('Payment Date',{exact:true})).toHaveValue(firstDate);await expect(table.getByRole('checkbox',{name:'Include Ada Example in payroll',exact:true})).toBeChecked();await expect.poll(()=>scroll.evaluate(el=>el.scrollLeft)).toBeCloseTo(left,0);expect(previewWrites).toBe(0);
// Start a fresh entry after independently checking return-context restoration.
await page.goto('/payroll/run?employees='+people[0]._id+'&returnStatus=All');await expect(page.getByLabel('Payment Date',{exact:true})).toHaveValue(firstDate);
}
await page.getByLabel('Payment Date',{exact:true}).fill(updatedDate);await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByRole('button',{name:'Submit',exact:true})).toBeEnabled();await shot('draft');await page.reload();await expect(page.getByLabel('Payment Date',{exact:true})).toHaveValue(updatedDate);
await table.getByRole('checkbox',{name:'Include Grace Example in payroll',exact:true}).check();await table.getByRole('checkbox',{name:'Include Ada Example in payroll',exact:true}).uncheck();await expect(page.getByRole('status').filter({hasText:'Updating payroll'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Save',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByRole('button',{name:'Submit',exact:true})).toBeEnabled();
const pending=table.getByRole('row').filter({has:page.getByRole('link',{name:'Pending',exact:true})});await pending.getByRole('button',{name:'View Pay Check',exact:true}).click();const viewer=page.getByRole('dialog',{name:'Historical Pay Check'});await expect(viewer.locator('iframe')).toHaveAttribute('src',/^blob:/);await shot('paycheck-viewer',viewer);await viewer.getByRole('button',{name:'Close pay check viewer',exact:true}).click();
const download=page.waitForEvent('download');await pending.getByRole('button',{name:'Download Pay Check PDF',exact:true}).click();expect((await download).suggestedFilename()).toContain(first);
await page.getByRole('button',{name:'Submit',exact:true}).click();await shot('confirmation',page.getByRole('dialog'));await page.getByRole('button',{name:'Confirm submission',exact:true}).click();await expect(page.getByRole('heading',{name:'Payroll Submitted Successfully',exact:true})).toBeVisible();await shot('submitted');expect(submits).toBe(1);expect(JSON.stringify(historical)).toBe(immutable);await expect(page.getByRole('button',{name:'Submit',exact:true})).toHaveCount(0);await page.reload();await expect(page.getByRole('heading',{name:'Payroll Submitted Successfully',exact:true})).toBeVisible();expect(submits).toBe(1);
expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

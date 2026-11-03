import { test, expect } from './authenticated-test';
import { calculateContractorPayment } from '../src/app/contractors/contractor-deductions';
import { mkdirSync } from 'node:fs';
import type { Page } from '@playwright/test';
test.setTimeout(90000);
const dir = process.env.CONTRACTOR_SCREENSHOT_DIR ?? 'artifacts/contractor-payment-enhancement/screenshots';
mkdirSync(dir, { recursive: true });
const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
const pc = ['507f1f77bcf86cd799439021', '507f1f77bcf86cd799439022', '507f1f77bcf86cd799439023'];
async function setup(page: Page, empty = false) {
  let contractors: any[] = empty
    ? []
    : [
        {
          _id: ids[0],
          contractorId: 'CON001',
          firstName: 'Ada',
          lastName: 'Consultant',
          email: 'ada@example.test',
          componentIds: pc.slice(0,2),
          version: 1,
        },
        {
          _id: ids[1],
          contractorId: 'CON002',
          firstName: 'Grace',
          lastName: 'Specialist',
          email: 'grace@example.test',
          componentIds: [],
          version: 0,
        },
      ];
  let components: any[] = pc.map((_id,i)=>({_id,name:['Service Retention','Agreed Deduction','Unassigned Deduction'][i],code:['RETAIN','DEDUCT','UNUSED'][i],classification:'deduction',status:'active',calculationType:i===0?'percentage':'fixed',calculationValue:i===0?10:2000,version:0}));
  const history: Record<string, any[]> = {};
  let failPayment = false,
    writes: any[] = [];
  const keys = new Map<string, any>();
  await page.route('**/auth/me', (r) =>
    r.fulfill({
      json: {
        id: 'qa-admin',
        email: 'qa@example.test',
        role: 'admin',
        organizationId: 'ORG000901',
      },
    }),
  );
  await page.route('http://localhost:3000/employees', (r) => r.fulfill({ json: [] }));
  await page.route('http://localhost:3000/salary-components', (r) => r.fulfill({ json: [] }));
  await page.route('http://localhost:3000/contractors**', async (r) => {
    const req = r.request(),
      url = new URL(req.url()),
      p = url.pathname.replace('/contractors', ''),
      method = req.method(),
      body = method === 'GET' ? null : req.postDataJSON();
    if (p === '/components') {
      if (method === 'GET') return r.fulfill({ json: components });
      const c = { ...body, _id: '507f1f77bcf86cd799439025', version: 0 };
      components.push(c);
      return r.fulfill({ status: 201, json: c });
    }
    if (p.startsWith('/components/')) {
      const i = components.findIndex((c) => c._id === p.split('/')[2]);
      components[i] = { ...components[i], ...body, version: components[i].version + 1 };
      return r.fulfill({ json: components[i] });
    }
    if (p === '/payments') {
      writes.push(body);
      if (failPayment)
        return r.fulfill({
          status: 503,
          json: { message: 'Temporary recording failure; retry safely.' },
        });
      if (keys.has(body.idempotencyKey))
        return r.fulfill({ status: 201, json: keys.get(body.idempotencyKey) });
      const entries = body.entries.map((e: any, index: number) => {
        const c = contractors.find((c) => c._id === e.contractorId);
        const rules=components.filter(p=>p.status==='active' && p.classification==='deduction' && c.componentIds.includes(p._id));
        const totals=calculateContractorPayment(e.grossPay,rules);
        const lines=rules.map((p,i)=>({...p,componentId:p._id,componentVersion:p.version,amount:totals.amounts[i]}));
        const payment = {
          paymentId: 'CPAY00' + (index + 1),
          contractorId: c._id,
          contractorCode: c.contractorId,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          paymentDate: body.paymentDate,
          description: e.description ?? body.description,
          components: structuredClone(lines),
          calculationVersion:2, grossPay:e.grossPay,
          totalDeductions:totals.totalDeductions,netPayment:totals.netPayment,
          status: 'Recorded',
        };
        (history[c._id] ??= []).unshift(payment);
        return payment;
      });
      const result = { entries };
      keys.set(body.idempotencyKey, result);
      return r.fulfill({ status: 201, json: result });
    }
    if (p === '') {
      if (method === 'GET') return r.fulfill({ json: contractors });
      const c = {
        ...body,
        _id: '507f1f77bcf86cd799439013',
        contractorId: 'CON003',
        componentIds: [],
        version: 0,
      };
      contractors.push(c);
      return r.fulfill({ status: 201, json: c });
    }
    const id = p.split('/')[1],
      c = contractors.find((c) => c._id === id);
    if (!c) return r.fulfill({ status: 404, json: { message: 'Contractor not found' } });
    if (p.endsWith('/payments')) return r.fulfill({ json: history[id] ?? [] });
    if (method === 'PATCH') {
      if (p.endsWith('/components')) c.componentIds = body.componentIds;
      else Object.assign(c, body);
      c.version++;
      return r.fulfill({ json: c });
    }
    return r.fulfill({ json: c });
  });
  return {
    contractors: () => contractors,
    components: () => components,
    writes, history,
    fail: (value: boolean) => (failPayment = value),
  };
}
async function rowPay(page:Page,name:string){await page.getByRole('button',{name:'Actions for '+name,exact:true}).click();await page.getByRole('menuitem',{name:'Pay Contractor '+name,exact:true}).click();}
const dialog = (page:Page,name='Pay Contractors') => page.getByRole('dialog',{name,exact:true});
const gross = (p:any,name='Ada Consultant') => p.getByRole('spinbutton',{name:'Gross Pay for '+name,exact:true});
const kpi = (p:any,name:string) => p.getByRole('region',{name,exact:true});
async function details(p:any){await p.getByRole('textbox',{name:'Payment Date',exact:true}).fill('2026-11-03');for(const field of await p.getByRole('textbox',{name:/^Description for /}).all())await field.fill('November services');}
for(const width of [1440,1280,768,390]) test('Contractor directory and revised payment workflow '+width,async({page})=>{
 const state=await setup(page);await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
 const shot=async(name:string)=>{await page.mouse.move(0,0);await page.screenshot({path:`${dir}/${name}-${width}.png`,fullPage:true});};
 await page.goto('/contractors');await expect(page.getByRole('button',{name:'Pay Contractors',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Actions for Ada Consultant',exact:true})).toBeVisible();await shot('directory');
 await page.getByRole('button',{name:'Pay Contractors',exact:true}).click();const p=dialog(page);await expect(p.getByRole('table',{name:'Contractor payment selection',exact:true}).locator('tbody tr')).toHaveCount(2);await expect(p.locator('ps-kpi-card')).toHaveCount(2);await expect(p.getByRole('textbox',{name:'Payment Date',exact:true})).toHaveValue('');await expect(kpi(p,'Total Gross Payment')).toContainText('\u20b90.00');await shot('payment-entry');
 await details(p);await gross(p).fill('50000');await gross(p,'Grace Specialist').fill('10000');await expect(kpi(p,'Total Gross Payment')).toContainText('\u20b90.00');
 const select=p.getByRole('checkbox',{name:'Select all eligible contractors',exact:true});await p.getByRole('checkbox',{name:'Select Ada Consultant',exact:true}).check();await expect(select).toHaveJSProperty('indeterminate',true);await expect(kpi(p,'Total Gross Payment')).toHaveText('Total Gross Payment\u20b950,000');await expect(kpi(p,'Total Net Payment')).toHaveText('Total Net Payment\u20b943,000');await expect(p).toContainText('Service Retention: \u20b95,000');await expect(p).toContainText('Agreed Deduction: \u20b92,000');await expect(p).not.toContainText('Unassigned Deduction');await shot('mixed-selection-gross-deductions');
 await select.check();await expect(select).toHaveJSProperty('indeterminate',false);await expect(kpi(p,'Total Gross Payment')).toHaveText('Total Gross Payment\u20b960,000');await expect(kpi(p,'Total Net Payment')).toHaveText('Total Net Payment\u20b953,000');await gross(p,'Grace Specialist').fill('20000');await expect(kpi(p,'Total Net Payment')).toHaveText('Total Net Payment\u20b963,000');await p.getByRole('checkbox',{name:'Select Grace Specialist',exact:true}).uncheck();await expect(kpi(p,'Total Net Payment')).toHaveText('Total Net Payment\u20b943,000');await select.check();await shot('general-payment');
 await p.getByRole('button',{name:'Submit',exact:true}).click();const confirm=dialog(page,'Confirm Payments');await expect(confirm).toContainText('Ada Consultant');await expect(confirm).toContainText('Grace Specialist');await expect(confirm).toContainText('10%');await expect(kpi(confirm,'Total Gross Payment')).toHaveText('Total Gross Payment\u20b970,000');await expect(kpi(confirm,'Total Net Payment')).toHaveText('Total Net Payment\u20b963,000');await expect(confirm).toContainText('Service Retention');await expect(confirm).toContainText('\u20b95,000');await expect(confirm).toContainText('Agreed Deduction');await expect(confirm).toContainText('\u20b92,000');await expect(confirm).toContainText('03 Nov 2026');expect(state.writes).toHaveLength(0);await shot('confirmation');
 await confirm.getByRole('button',{name:'Cancel',exact:true}).click();await expect(gross(p)).toHaveValue('50000');expect(state.writes).toHaveLength(0);await p.getByRole('button',{name:'Submit',exact:true}).click();await confirm.getByRole('button',{name:'Confirm Payments',exact:true}).click();await expect(confirm).toHaveCount(0);await expect(page.getByRole('status')).toContainText('recorded');expect(state.writes).toHaveLength(1);expect(state.writes[0].entries).toHaveLength(2);expect(state.writes[0].entries[0]).toEqual({contractorId:ids[0],contractorVersion:1,description:'November services',grossPay:50000,components:[{componentId:pc[0],componentVersion:0},{componentId:pc[1],componentVersion:0}]});expect(state.writes[0].entries[1].components).toEqual([]);
 await page.getByRole('link',{name:'Ada',exact:true}).click();await page.getByRole('tab',{name:'Payments',exact:true}).click();await expect(page.getByRole('table',{name:'Contractor payments',exact:true})).toContainText('₹43,000');await expect(page.getByRole('table',{name:'Contractor payments',exact:true})).toContainText('₹50,000');await shot('payments');await page.getByRole('button',{name:'View payment CPAY001',exact:true}).click();await expect(dialog(page,'Payment CPAY001')).toContainText('10% of Gross Pay');await shot('payment-detail');await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'View payment CPAY001',exact:true})).toBeFocused();
 await page.goto('/contractors');await rowPay(page,'Ada Consultant');const individual=dialog(page,'Pay Contractor');await expect(individual.getByRole('checkbox',{name:'Select Ada Consultant',exact:true})).toBeChecked();await expect(individual.getByRole('table').locator('tbody tr')).toHaveCount(1);await gross(individual).fill('100000');await details(individual);await expect(kpi(individual,'Total Net Payment')).toHaveText('Total Net Payment\u20b988,000');await shot('individual-payment');await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Actions for Ada Consultant',exact:true})).toBeFocused();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('Failed contractor submission preserves selected entries and exact idempotency key',async({page})=>{const state=await setup(page);await page.goto('/contractors');await page.getByRole('button',{name:'Pay Contractors',exact:true}).click();const p=dialog(page);await p.getByRole('checkbox',{name:'Select all eligible contractors',exact:true}).check();await details(p);await gross(p).fill('50000');await gross(p,'Grace Specialist').fill('100');await p.getByRole('button',{name:'Submit',exact:true}).click();state.fail(true);const confirm=dialog(page,'Confirm Payments');await confirm.getByRole('button',{name:'Confirm Payments',exact:true}).click();await expect(confirm.getByRole('alert')).toContainText('server could not complete');await page.screenshot({path:dir+'/failed-submission.png',fullPage:true});state.fail(false);await confirm.getByRole('button',{name:'Confirm Payments',exact:true}).click();await expect(confirm).toHaveCount(0);expect(state.writes).toHaveLength(2);expect(state.writes[1]).toEqual(state.writes[0]);});
test('Incomplete, invalid and negative net payments cannot be submitted; unselected rows do not block',async({page})=>{const state=await setup(page);await page.goto('/contractors');await page.getByRole('button',{name:'Pay Contractors',exact:true}).click();const p=dialog(page);await p.getByRole('checkbox',{name:'Select Ada Consultant',exact:true}).check();const submit=p.getByRole('button',{name:'Submit',exact:true});await expect(submit).toBeDisabled();for(const value of ['-1','0.001','1000']){await gross(p).fill(value);await expect(submit).toBeDisabled();}await expect(p).toContainText('Total deductions cannot exceed Gross Pay.');await page.screenshot({path:dir+'/negative-net-validation.png',fullPage:true});await gross(p).fill('50000');await submit.click();await expect(dialog(page,'Confirm Payments')).toHaveCount(0);await details(p);await gross(p,'Grace Specialist').fill('-1');await submit.click();await expect(dialog(page,'Confirm Payments')).toBeVisible();expect(state.writes).toHaveLength(0);});
test('Contractor deduction settings and assignments preserve finalized snapshots after edits or deletion',async({page})=>{const state=await setup(page);await page.goto('/settings/contractors');await page.getByRole('button',{name:'Add Component',exact:true}).click();const add=dialog(page,'Add Contractor Pay Component');await expect(add.getByRole('combobox',{name:'Classification',exact:true}).locator('option')).toHaveCount(1);await expect(add.getByLabel(/Calculation Base/)).toHaveCount(0);await expect(add.getByRole('combobox',{name:'Calculation Type',exact:true}).locator('option')).toHaveCount(3);await add.getByRole('textbox',{name:'Component Name',exact:true}).fill('Extra retention');await add.getByRole('textbox',{name:'Component Code',exact:true}).fill('EXTRA');await add.getByRole('spinbutton',{name:'Configuration Value',exact:true}).fill('5');await page.screenshot({path:dir+'/deduction-settings.png',fullPage:true});await add.getByRole('button',{name:'Save Component',exact:true}).click();await expect(add).toHaveCount(0);
 await page.goto('/contractors/'+ids[0]);await page.getByRole('button',{name:'Edit Contractor Payment Components',exact:true}).click();const assignment=page.getByRole('checkbox',{name:/Agreed Deduction/});await assignment.uncheck();await page.getByRole('button',{name:'Save Components',exact:true}).click();await expect(page.getByRole('status')).toContainText('assignments saved');await page.reload();await expect(assignment).not.toBeChecked();await page.getByRole('button',{name:'Edit Contractor Payment Components',exact:true}).click();await assignment.check();await page.getByRole('button',{name:'Save Components',exact:true}).click();await expect(page.getByRole('status')).toContainText('assignments saved');await page.screenshot({path:dir+'/assigned-deductions.png',fullPage:true});
 await page.goto('/contractors');await rowPay(page,'Ada Consultant');const p=dialog(page,'Pay Contractor');await details(p);await gross(p).fill('50000');await p.getByRole('button',{name:'Submit',exact:true}).click();await dialog(page,'Confirm Payments').getByRole('button',{name:'Confirm Payments',exact:true}).click();await expect(page.getByRole('status')).toContainText('recorded');const original=structuredClone(state.history[ids[0]]);
 await page.goto('/settings/contractors');await page.getByRole('button',{name:'Edit component Service Retention',exact:true}).click();const edit=dialog(page,'Edit Contractor Pay Component');await edit.getByRole('textbox',{name:'Component Name',exact:true}).fill('Renamed Retention');await edit.getByRole('combobox',{name:'Status',exact:true}).selectOption('inactive');await edit.getByRole('spinbutton',{name:'Configuration Value',exact:true}).fill('50');await edit.getByRole('button',{name:'Save Component',exact:true}).click();await expect(edit).toHaveCount(0);state.components().splice(state.components().findIndex(c=>c._id===pc[1]),1);await page.goto('/contractors/'+ids[0]+'?tab=payments');await page.getByRole('button',{name:'View payment CPAY001',exact:true}).click();const history=dialog(page,'Payment CPAY001');await expect(history).toContainText('Service Retention');await expect(history).toContainText('10% of Gross Pay');await expect(history).toContainText('Agreed Deduction');await expect(history).not.toContainText('Renamed Retention');expect(state.history[ids[0]]).toEqual(original);await page.screenshot({path:dir+'/immutable-history.png',fullPage:true});});
test('Earlier component payments retain saved totals without inventing Gross Pay',async({page})=>{const state=await setup(page);state.history[ids[0]]=[{paymentId:'CPAY099',contractorId:ids[0],contractorCode:'CON001',firstName:'Ada',lastName:'Consultant',email:'ada@example.test',paymentDate:'2026-10-01',description:'Earlier invoice',components:[{componentId:pc[0],componentVersion:0,name:'Earlier consulting',code:'OLD',classification:'earning',calculationType:'manual',amount:100}],totalEarnings:100,totalAllowances:20,totalDeductions:10,netPayment:110,status:'Recorded'}];await page.goto('/contractors/'+ids[0]+'?tab=payments');await expect(page.getByRole('table',{name:'Contractor payments',exact:true})).toContainText('Not recorded');await page.getByRole('button',{name:'View payment CPAY099',exact:true}).click();await expect(dialog(page,'Payment CPAY099')).toContainText('Earlier consulting');await expect(dialog(page,'Payment CPAY099')).toContainText('Total Earnings');await expect(dialog(page,'Payment CPAY099')).toContainText('₹110');await page.screenshot({path:dir+'/legacy-history.png',fullPage:true});});
test('No-deduction individual contractor accepts explicit zero Gross Pay and preserves cancellation',async({page})=>{const state=await setup(page);await page.goto('/contractors/'+ids[1]+'?tab=payments');await expect(page.getByRole('status')).toContainText('No contractor payments recorded');await page.goto('/contractors');await rowPay(page,'Grace Specialist');const p=dialog(page,'Pay Contractor');await expect(p).toContainText('No active deduction components assigned.');await details(p);await gross(p,'Grace Specialist').fill('0');await p.getByRole('button',{name:'Submit',exact:true}).click();await dialog(page,'Confirm Payments').getByRole('button',{name:'Cancel',exact:true}).click();await expect(gross(p,'Grace Specialist')).toHaveValue('0');expect(state.writes).toHaveLength(0);await p.getByRole('button',{name:'Submit',exact:true}).click();await dialog(page,'Confirm Payments').getByRole('button',{name:'Confirm Payments',exact:true}).click();await expect(page.getByRole('status')).toContainText('recorded');expect(state.history[ids[1]][0]).toMatchObject({grossPay:0,totalDeductions:0,netPayment:0});});
test('Historical null Gross Pay stays unrecorded and explicit zero stays zero', async ({ page }) => {
  const state = await setup(page);
  const historical = {
    paymentId: 'CPAY100', contractorId: ids[0], contractorCode: 'CON001',
    firstName: 'Ada', lastName: 'Consultant', email: 'ada@example.test',
    paymentDate: '2026-10-01', description: 'Null historical gross', components: [],
    grossPay: null, totalEarnings: 100, totalAllowances: 20,
    totalDeductions: 10, netPayment: 110, status: 'Recorded',
  };
  state.history[ids[0]] = [historical, {
    ...historical, paymentId: 'CPAY101', description: 'Explicit zero gross',
    calculationVersion: 2, grossPay: 0, totalDeductions: 0, netPayment: 0,
  }];
  const saved = structuredClone(state.history[ids[0]]);
  await page.goto('/contractors/' + ids[0] + '?tab=payments');
  const table = page.getByRole('table', { name: 'Contractor payments', exact: true });
  const legacy = table.getByRole('row').filter({ hasText: 'CPAY100' });
  await expect(legacy.getByRole('cell').nth(3)).toHaveText('Not recorded');
  await expect(legacy.getByRole('cell').nth(4)).toHaveText('\u20b910');
  await expect(legacy.getByRole('cell').nth(5)).toHaveText('\u20b9110');
  const zero = table.getByRole('row').filter({ hasText: 'CPAY101' });
  await expect(zero.getByRole('cell').nth(3)).toHaveText('\u20b90.00');
  await page.getByRole('button', { name: 'View payment CPAY100', exact: true }).click();
  const detail = dialog(page, 'Payment CPAY100');
  await expect(detail.locator('dl > div').filter({ has: page.getByText('Gross Pay', { exact: true }) }).locator('dd'))
    .toHaveText('Not recorded (earlier component payment)');
  await expect(detail.locator('dl > div').filter({ has: page.getByText('Net Payment', { exact: true }) }).locator('dd'))
    .toHaveText('\u20b9110');
  expect(state.history[ids[0]]).toEqual(saved);
  expect(state.writes).toHaveLength(0);
});

test('Empty contractor directory disables Pay Contractors',async({page})=>{await setup(page,true);await page.goto('/contractors');await expect(page.getByRole('status')).toContainText('No contractors');await expect(page.getByRole('button',{name:'Pay Contractors',exact:true})).toBeDisabled();});
test('Ordinary organization members cannot open Contractor Settings',async({page})=>{await setup(page);await page.route('**/auth/me',r=>r.fulfill({json:{id:'member',role:'user',organizationId:'ORG000901',email:'member@example.test'}}));await page.goto('/settings/contractors');await expect(page.getByRole('heading',{name:'Employees',exact:true})).toBeVisible();await page.goto('/contractors');await expect(page.getByRole('heading',{name:'Contractors',exact:true})).toBeVisible();});

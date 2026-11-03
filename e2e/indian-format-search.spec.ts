import { test, expect } from './authenticated-test';
import type { Page } from '@playwright/test';
const values=[1000,10000,100000,1000000,10000000,1400000.5];
const grouped=['1,000.00','10,000.00','1,00,000.00','10,00,000.00','1,00,00,000.00','14,00,000.50'];
const currency=(amount:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(amount);
const people=()=>[['Ada','Lovelace'],['Grace','Hopper'],['Alan','Turing'],['Mira','Patel'],['Ravi','Kumar'],['Former','Employee']].map(([firstName,lastName],i)=>({
  _id:'507f1f77bcf86cd79943901'+i,employeeId:'EMP00'+(i+1),firstName,lastName,email:'format-'+i+'@example.test',annualCtc:values[i],
  dateOfBirth:'1990-01-01',hireDate:'2020-01-01',payFrequency:'Monthly',status:i===5?'Terminated':'Active',
}));
async function setup(page:Page){
  let role='admin', reads=0;const employees=people();let edited:any;
  await page.route('http://localhost:3000/auth/me',r=>r.fulfill({json:{id:'qa-admin',email:'qa@example.test',role}}));
  await page.route('http://localhost:3000/employees',r=>{reads++;return r.fulfill({json:employees})});
  await page.route('http://localhost:3000/users',r=>r.fulfill({json:[]}));
  await page.route('http://localhost:3000/employees/'+employees[0]._id,async r=>{
    expect(r.request().method()).toBe('PATCH');edited=r.request().postDataJSON();
    expect(typeof edited.annualCtc).toBe('number');Object.assign(employees[0],edited);await r.fulfill({json:employees[0]});
  });
  return {employees,get reads(){return reads},get edited(){return edited},setRole(value:string){role=value}};
}

test('search composes with status, makes no keystroke requests, preserves employee editing and navigation',async({page})=>{
  const state=await setup(page);await page.setViewportSize({width:1440,height:1000});await page.goto('/');
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await page.getByLabel('Employee Status',{exact:true}).selectOption('All');
  await expect(page.locator('tbody tr')).toHaveCount(6);
  for(let i=0;i<values.length;i++)await expect(page.locator('td.number').nth(i)).toHaveText('\u20b9' + grouped[i].replace(/\.00$/, ''));
  const search=page.getByRole('searchbox',{name:'Search employees'}),before=state.reads;
  for(const text of ['EMP001','ada','LOVE','Ada Lovelace','  aDA   loveLace  ']){
    await search.fill(text);await expect(page.locator('tbody tr')).toHaveCount(1);await expect(page.locator('tbody')).toContainText('Ada');
  }
  await search.fill('Former');await page.getByLabel('Employee Status',{exact:true}).selectOption('Active');
  await expect(page.getByText('No employees match your search.',{exact:false})).toBeVisible();
  await page.getByLabel('Employee Status',{exact:true}).selectOption('Terminated');await expect(page.locator('tbody tr')).toHaveCount(1);
  await search.fill('nonexistent');await expect(page.getByText('No employees match your search.',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Clear employee search'}).click();await expect(search).toBeFocused();await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByLabel('Employee Status',{exact:true}).selectOption('All');await expect(page.locator('tbody tr')).toHaveCount(6);
  expect(state.reads).toBe(before);
  await search.fill('Ada');
  await page.getByRole('button',{name:'Actions for Ada Lovelace'}).click();
  await page.getByRole('menuitem',{name:'Edit employee Ada Lovelace'}).click();
  const editor=page.getByRole('dialog',{name:'Edit employee',exact:true});
  await expect(editor.getByLabel('Annual CTC',{exact:true})).toHaveValue('1000');
  await editor.getByLabel('Annual CTC',{exact:true}).fill('1500000.75');
  await editor.getByRole('button',{name:'Save employee',exact:true}).click();await expect(editor).toHaveCount(0);
  expect(state.edited.annualCtc).toBe(1500000.75);
  await expect(page.locator('td.number')).toHaveText('\u20b915,00,000.75');
  await page.getByRole('link',{name:'Lovelace',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Ada Lovelace',exact:true})).toBeVisible();
  await expect(page.locator('.amount')).toHaveText(currency(1500000.75));
});

test('User Management uses the shared users icon with existing navigation states and admin-only access',async({page})=>{
  const state=await setup(page);await page.setViewportSize({width:1440,height:1000});await page.goto('/');
  const link=page.getByRole('link',{name:'User Management',exact:true});
  await expect(link).toHaveAttribute('href','/users');const icon=link.locator('svg');await expect(icon).toBeVisible();
  const box=await icon.boundingBox();expect(box!.width).toBe(16);expect(box!.height).toBe(16);
  expect(await icon.evaluate(el=>getComputedStyle(el).strokeWidth)).toBe('1.7px');
  await link.hover();await expect(icon).toBeVisible();await link.click();
  await expect(page.getByRole('heading',{name:'User Management',exact:true})).toBeVisible();
  await expect(link).toHaveClass(/nav-active/);await expect(link).toHaveAttribute('aria-current','page');
  await page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'Employees', exact: true}).click();await page.getByRole('searchbox').fill('Mira');
  await page.screenshot({path:'test-results/indian-format-search-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('searchbox')).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/indian-format-search-mobile.png',fullPage:true});
  state.setRole('user');await page.goto('/');await expect(page.getByRole('heading',{name:'Employees',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'User Management',exact:true})).toHaveCount(0);
  await page.goto('/users');await expect(page.getByRole('heading',{name:'Employees',exact:true})).toBeVisible();
});

test('Run Payroll KPIs, dynamic rows and Pay Check history use Indian grouping without changing numeric requests',async({page})=>{
  const state=await setup(page);let previews=0;let lastBody:any;
  const checks=state.employees.map((p,i)=>({employeeId:p._id,firstName:p.firstName,lastName:p.lastName,monthlyCtc:values[i]*4,grossPay:values[i]*3,employerContributions:values[i],deductions:values[i],tds:values[i]/2,netPay:values[i]*2,paymentStatus:'Not Paid'}));
  const total=values.reduce((sum,value)=>sum+value,0);
  await page.route('http://localhost:3000/payroll/runs/preview',r=>{previews++;lastBody=r.request().postDataJSON();return r.fulfill({json:{
    period:lastBody.period,organizationName:'QA Organization',status:'Draft',version:1,inputHash:'trusted',stale:false,calculatedAt:new Date().toISOString(),calculationVersion:'v1',
    checks,totalPayrollCost:total*4,totals:{employerContributions:total,deductions:total,netPay:total*2},
  }})});
  await page.goto('/payroll/run?employees='+state.employees.map(p=>p._id).join(','));
  const table=page.getByRole('table',{name:'Employee payroll',exact:true});await expect(table.locator('tbody tr')).toHaveCount(6);
  for(let i=0;i<values.length;i++){
    const cells=table.locator('tbody tr').nth(i).locator('td');
    await expect(cells.nth(4)).toHaveText(currency(values[i]));
    await expect(cells.nth(5)).toHaveText(currency(values[i]/2));
    await expect(cells.nth(7)).toHaveText(currency(values[i]*2));
  }
  await expect(page.getByLabel('Total Payroll Cost',{exact:true})).toContainText(currency(total*4));
  await expect(page.getByLabel('Total Employee Deductions',{exact:true})).toContainText(currency(total));
  await expect(page.getByLabel('Total NET Pay',{exact:true})).toContainText(currency(total*2));
  expect(lastBody.employeeIds).toEqual(state.employees.map(p=>p._id));expect(lastBody).not.toHaveProperty('netPay');
  const before=previews;await page.getByRole('button',{name:'Refresh Payroll',exact:true}).click();await expect(page.getByText('Payroll recalculated.',{exact:false})).toBeVisible();expect(previews).toBe(before+1);
  await page.route('http://localhost:3000/payroll/employees/*/checks',r=>r.fulfill({json:[{...checks[5],period:lastBody.period,paymentDate:lastBody.period+'-28'}]}));
  await page.goto('/employees/'+state.employees[5]._id+'?tab=checks');
  const history=page.getByRole('table');await expect(history).toContainText(currency(values[5]*3));await expect(history).toContainText(currency(values[5]));await expect(history).not.toContainText('Income Tax / TDS:');await history.getByRole('button',{name:'View TDS details',exact:true}).click();await expect(page.getByRole('dialog',{name:'Income Tax / TDS',exact:true})).toContainText(currency(values[5]/2));
});

test('salary settings, statutory amounts and tax revision displays share Indian currency presentation',async({page})=>{
  const state=await setup(page);
  const component={_id:'qa-fixed',name:'QA Fixed Allowance',code:'QA_FIXED',category:'allowance',calculationType:'fixed',calculationBaseType:'annual_ctc',calculationValue:1400000.5,fixedAmountPeriod:'annual',showInPayslip:true,status:'active'};
  await page.route('http://localhost:3000/salary-components',r=>r.fulfill({json:[component]}));
  await page.route('http://localhost:3000/settings/statutory-deductions',r=>r.fulfill({json:{wageCap:1000000,annualEsiCeilingLimit:1400000.5,isEpfCeilingApplicable:true,epfEmployerContributionPercentage:4,epsEmployerContributionPercentage:8,esiEmployerContributionPercentage:3.25}}));
  const rules={standardDeduction:100000,maximumRebate:10000,rebateLimit:1000000,cessPercentage:4,minimumAge:0,maximumAge:null,incomeRounding:'nearest-ten-ignore-paise',liabilityRounding:'nearest-ten-ignore-paise',legalReferences:[],slabs:[{from:0,to:1000000,rate:0},{from:1000000,to:null,rate:20}],surcharge:[{threshold:10000000,rate:10}],mappings:[{componentId:'qa-fixed',componentName:'QA Fixed Allowance',type:'partial',exemptAmount:1400000.5}]};
  await page.route('http://localhost:3000/settings/tax-configuration',r=>r.fulfill({json:{years:[{code:'FY_QA',name:'QA Year',startDate:'2026-04-01',endDate:'2027-03-31',active:true}],revisions:[{id:'revision',yearCode:'FY_QA',regime:'new',version:1,rules}],published:{}}}));
  await page.goto('/settings');await expect(page.getByRole('table')).toContainText(currency(1400000.5));
  await page.goto('/settings/statutory-deductions');await expect(page.locator('main')).toContainText(currency(1400000.5));await expect(page.locator('main')).toContainText(currency(1000000));
  await page.goto('/settings/tax-configuration');await page.getByRole('button',{name:'View revision',exact:true}).click();
  const dialog=page.getByRole('dialog');for(const value of [100000,10000,1000000,10000000,1400000.5])await expect(dialog).toContainText(currency(value));
  await dialog.getByRole('button',{name:'Close revision'}).click();
  await page.route('http://localhost:3000/employees/*/income-tax',r=>r.fulfill({json:[]}));
  await page.route('http://localhost:3000/employees/*/income-tax/FY_QA',r=>r.fulfill({json:{profile:null,annualCtc:1400000.5,payrollFrequency:'Monthly',latest:null,calculationStatus:'not_configured',regimeSelection:{regime:'new',availableRegimes:['new'],message:''}}}));
  await page.goto('/employees/'+state.employees[0]._id+'?tab=tax');
  await expect(page.locator('app-employee-tax')).toContainText(currency(1400000.5));
});

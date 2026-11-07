import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const evidence='docs/design-system/evidence/dashboard';

test('dashboard counts, local greeting, existing quick actions and responsive layout', async ({page}) => {
  mkdirSync(evidence,{recursive:true});
  await page.clock.install({time:new Date(2026,10,4,11,59,45)});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('http://localhost:3000/auth/me',r=>r.fulfill({json:{id:'dashboard-test',email:'admin@example.test',role:'admin'}}));
  await page.route('http://localhost:3000/settings/organization',r=>r.fulfill({json:{displayName:'Example organization'}}));
  const employees=[{_id:'a',status:'Active',firstName:'Ada',lastName:'Rao'},{_id:'b',status:'Terminated'},{_id:'c',status:'Active',firstName:'Sam',lastName:'Das'}];
  await page.route('http://localhost:3000/employees',r=>r.fulfill({json:employees}));
  await page.route('http://localhost:3000/contractors',r=>r.fulfill({json:[{status:'Active'},{status:'Inactive'},{status:'Active'},{status:'Active'}]}));
  await page.route('http://localhost:3000/salary-components',r=>r.fulfill({json:[]}));
  await page.route('http://localhost:3000/payroll/runs/preview',r=>r.fulfill({json:{period:'2026-11',checks:[],validationIssues:[],processedEmployeeIds:[],totals:{grossPay:0,totalDeductions:0,netPay:0}}}));
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/dashboard');
  await expect(page.getByRole('heading',{name:'Good morning',exact:true})).toBeVisible();
  const employeesCard=page.getByRole('region',{name:'Active Employees',exact:true});
  const contractorsCard=page.getByRole('region',{name:'Active Contractors',exact:true});
  await expect(employeesCard.locator('.metric-value')).toHaveText('2');
  await expect(contractorsCard.locator('.metric-value')).toHaveText('3');
  const sizes=await page.locator('.kpis > ps-card').evaluateAll(nodes=>nodes.map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));
  expect(sizes[0]).toEqual(sizes[1]);
  await page.clock.fastForward(30_000);
  await expect(page.getByRole('heading',{name:'Good afternoon',exact:true})).toBeVisible();
  await page.screenshot({path:`${evidence}/dashboard-1440.png`,fullPage:true});
  await page.getByRole('button',{name:'Add Employee',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Add employee',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Close add employee',exact:true}).click();
  await expect(page.getByRole('button',{name:'Add Employee',exact:true})).toBeFocused();
  const payroll=page.getByRole('link',{name:'Run Payroll',exact:true});
  await expect(payroll).toHaveAttribute('href', '/payroll/run?employees=a,c&returnStatus=Active');
  await payroll.click();
  await expect(page).toHaveURL(/\/payroll\/run\?employees=a,c&returnStatus=Active/);
  await expect(page.getByRole('heading',{name:'Run Payroll',exact:true})).toBeVisible();
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Dashboard',exact:true}).click();
  for(const width of [768,390]) {
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(employeesCard.locator('.metric-value')).toHaveText('2');
    await page.screenshot({path:`${evidence}/dashboard-${width}.png`,fullPage:true});
  }
});

test('dashboard distinguishes loading, zero and independent API errors with retry',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.route('http://localhost:3000/auth/me',r=>r.fulfill({json:{id:'test',email:'user@example.test',role:'user'}}));
  await page.route('http://localhost:3000/settings/organization',r=>r.fulfill({json:{displayName:'Example organization'}}));
  let release!:()=>void;const gate=new Promise<void>(r=>release=r);
  await page.route('http://localhost:3000/employees',async r=>{await gate;await r.fulfill({json:[]});});
  let failed=true;
  await page.route('http://localhost:3000/contractors',r=>failed?r.fulfill({status:503,json:{}}):r.fulfill({json:[]}));
  await page.goto('/dashboard');
  await expect(page.getByRole('region',{name:'Active Employees',exact:true}).getByRole('status')).toHaveText('Loading employee count...');
  await expect(page.getByRole('button',{name:'Run Payroll'})).toBeDisabled();
  release();
  await expect(page.getByRole('region',{name:'Active Employees',exact:true}).locator('.metric-value')).toHaveText('0');
  await expect(page.getByRole('alert')).toContainText('server');
  failed=false;await page.getByRole('button',{name:'Retry Contractors'}).click();
  await expect(page.getByRole('region',{name:'Active Contractors',exact:true}).locator('.metric-value')).toHaveText('0');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.screenshot({path:`${evidence}/dashboard-zero-1440.png`,fullPage:true});
});

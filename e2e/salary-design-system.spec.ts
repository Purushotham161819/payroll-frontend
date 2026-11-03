import {productDropdownEvidence} from './product-dropdown-evidence';
﻿import { test, expect } from './authenticated-test';
import { mkdirSync } from 'node:fs';
import fixture from './fixtures/statutory-payroll.json';
import metadata from './fixtures/formula-variables.json';
const artifacts='artifacts/phase4d-salary';mkdirSync(artifacts,{recursive:true});
const components=fixture[0].components;
const custom={...components[0],_id:'000000000000000000000009',code:'CUSTOM',name:'Custom Allowance',isSystemDefined:false,category:'allowance',calculationType:'formula',formula:'annualCtc * 5%',calculationValue:null,calculationBaseComponentId:null,fixedAmountPeriod:null,status:'active'};
const records=[...components,custom];
const rates={wageCap:180000,annualEsiCeilingLimit:252000,isEpfCeilingApplicable:true,epfEmployerContributionPercentage:3.67,epsEmployerContributionPercentage:8.33,esiEmployerContributionPercentage:3.25};
async function setup(page:any){await page.emulateMedia({reducedMotion:'reduce'});await page.route('**/salary-components', (r:any)=>r.fulfill({json:records}));await page.route('**/salary-components/formula-variables',(r:any)=>r.fulfill({json:metadata}));await page.route('**/settings/statutory-deductions',(r:any)=>r.fulfill({json:rates}));await page.goto('/settings');await expect(page.locator('td:nth-child(2)').filter({hasText:/^BASIC$/})).toBeVisible();}
for(const width of [1440,1280,768,390])test('salary components and statutory controls at '+width+'px',async({page})=>{
 await page.setViewportSize({width,height:1000});await setup(page);
 const prefix=process.env.PS_CAPTURE_BEFORE==='1'?'before':'after';
 await page.screenshot({path:artifacts+'/'+prefix+'-list-'+width+'.png',fullPage:true});
 await page.getByRole('button',{name:prefix==='before'?'+ Add Salary Component':'Add Salary Component',exact:true}).click();
 await page.screenshot({path:artifacts+'/'+prefix+'-add-'+width+'.png',fullPage:true});
 await page.getByRole('combobox',{name:'Calculation Base',exact:true}).focus();
 await page.screenshot({path:artifacts+'/'+prefix+'-bases-'+width+'.png',fullPage:true});
 await productDropdownEvidence(page,'salary-add',width);
 if(process.env.PRODUCT_DROPDOWNS==='after'){const type=page.locator('#component-type');await type.click();await page.locator('.ps-select-panel').getByRole('option',{name:'Fixed Amount',exact:true}).click();const period=page.locator('#component-period');const original=await period.inputValue();await period.click();const blocked=page.locator('.ps-select-panel').getByRole('option',{name:'Select period',exact:true});await expect(blocked).toHaveAttribute('aria-disabled','true');await blocked.click({force:true});await expect(period).toHaveValue(original);await page.keyboard.press('Home');await page.keyboard.press('Enter');await expect(period).toHaveValue('annual');await productDropdownEvidence(page,'salary-fixed',width);await type.click();await page.locator('.ps-select-panel').getByRole('option',{name:'Percentage',exact:true}).click();}
 const options=await page.locator('select[name=base] option').allTextContents();expect(options).toContain('Annual CTC');expect(options).toContain('Gross Wages');expect(options).toContain('Core Wages');expect(options).toContain('Custom Allowance (CUSTOM)');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 const core=page.getByRole('row').filter({has:page.getByRole('cell',{name:'BASIC',exact:true})});
 await core.getByRole('button',{name:'Edit component '+components[0].name,exact:true}).click();
 await page.screenshot({path:artifacts+'/'+prefix+'-mandatory-'+width+'.png',fullPage:true});
 await expect(page.locator('input[name=name]')).toHaveAttribute('readonly','');await expect(page.locator('select[name=type]')).toBeDisabled();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.getByRole('button',{name:'Edit component Custom Allowance',exact:true}).click();
 await page.getByRole('button',{name:'Formula help',exact:true}).click();
 await page.screenshot({path:artifacts+'/'+prefix+'-formula-'+width+'.png',fullPage:true});
 await productDropdownEvidence(page,'salary-formula',width);
 await expect(page.locator('#annual-formula')).toHaveValue(custom.formula);
 if(prefix==='after'){
  const dialog=page.getByRole('dialog');const box=(await dialog.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
  for(const control of await dialog.locator('input:not([type=checkbox]),select').all())expect((await control.boundingBox())!.height).toBeCloseTo(40,2);
  expect((await page.locator('#annual-formula').boundingBox())!.height).toBeGreaterThan(90);
 }
 if(prefix==='after'){
  const formula=page.locator('#annual-formula');const option=page.locator('#formula-variable option').nth(1);await expect(option).toBeAttached();const key=await option.getAttribute('value');
  await page.locator('#formula-variable').selectOption(key!);await page.getByRole('button',{name:'Insert value',exact:true}).click();await expect(formula).toHaveValue(custom.formula+key);
  const save=page.getByRole('button',{name:'Save',exact:true});await save.scrollIntoViewIfNeeded();const saveBox=(await save.boundingBox())!;expect(saveBox.x+saveBox.width).toBeLessThanOrEqual(width);expect(saveBox.y+saveBox.height).toBeLessThanOrEqual(1000);
 }
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 if(prefix==='after'){
  const more=page.getByRole('button',{name:'More actions for Custom Allowance',exact:true});await more.scrollIntoViewIfNeeded();expect((await more.boundingBox())!.width).toBe(32);await more.focus();await page.keyboard.press('Enter');await expect(page.getByRole('menuitem',{name:'Deactivate Custom Allowance',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(more).toBeFocused();
 }
 await page.getByRole('navigation',{name:'Settings sections'}).getByRole('link',{name:'Statutory Deductions',exact:true}).click();
 await expect(page.locator('#wageCap')).toHaveValue('180000');
 await page.screenshot({path:artifacts+'/'+prefix+'-statutory-'+width+'.png',fullPage:true});
 if(prefix==='after'){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const control of await page.locator('app-statutory-deductions input[type=number]').all())expect((await control.boundingBox())!.height).toBeCloseTo(40,2);
  await expect(page.getByText('\u20b91,80,000',{exact:true})).toBeVisible();
 }
});

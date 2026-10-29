import {test,expect} from './authenticated-test';
test('mandatory components show setup state, protect fixed fields, and save user percentages',async({page})=>{
  const records:any[]=[['BASIC','Basic Salary'],['DA','Dearness Allowance'],['RA','Retaining Allowance']].map(([code,name],i)=>({_id:String(i+1),name,code,isSystemDefined:true,category:'earning',status:'active',calculationBaseType:'annual_ctc',calculationBaseComponentId:null,calculationType:'percentage',calculationValue:null,fixedAmountPeriod:null,showInPayslip:true}));
  records.push({...records[0],_id:'ordinary',name:'Bonus',code:'BONUS',isSystemDefined:false,calculationValue:5});
  await page.route('**/employees',r=>r.fulfill({json:[]}));
  let saves=0;
  await page.route('**/salary-components**',async r=>{
    if(r.request().method()==='PATCH'){
      const id=r.request().url().split('/').at(-1); const body=r.request().postDataJSON();
      expect(body.isSystemDefined).toBeUndefined();Object.assign(records.find(c=>c._id===id),body);saves++;
    }
    await r.fulfill({json:records});
  });
  await page.goto('http://localhost:4200/');await page.getByRole('link',{name:'Settings',exact:true}).click();
  await expect(page.getByText('Mandatory',{exact:true})).toHaveCount(3);await expect(page.getByText('Configure percentage',{exact:true})).toHaveCount(3);
  for(const [index,c]of records.slice(0,3).entries()){
    const row=page.getByRole('row').filter({has:page.locator('td:nth-child(2)').filter({hasText:new RegExp('^'+c.code+'$')})});
    await expect(row.getByRole('button',{name:'Deactivate'})).toHaveCount(0);await row.getByRole('button',{name:'Edit',exact:true}).click();
    await expect(page.getByLabel('Component Name',{exact:true})).toHaveJSProperty('readOnly',true);await expect(page.getByLabel('Component Code',{exact:true})).toHaveJSProperty('readOnly',true);
    await expect(page.getByRole('combobox',{name:'Calculation Type',exact:true})).toBeDisabled();await expect(page.getByRole('combobox',{name:'Status',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'Save Component',exact:true}).click();expect(saves).toBe(index);
    await page.locator('input[name=value]').fill(String([40,10,0][index]));await page.getByRole('button',{name:'Save Component',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.reload();await expect(page.getByText('Configure percentage',{exact:true})).toHaveCount(0);expect(records.slice(0,3).map(c=>c.calculationValue)).toEqual([40,10,0]);
  const ordinary=page.getByRole('row').filter({has:page.getByRole('cell',{name:'BONUS',exact:true})});await expect(ordinary.getByRole('button',{name:'Deactivate',exact:true})).toBeVisible();await ordinary.getByRole('button',{name:'Edit',exact:true}).click();await expect(page.getByLabel('Component Name',{exact:true})).toHaveJSProperty('readOnly',false);await expect(page.getByRole('combobox',{name:'Calculation Type',exact:true})).toBeEnabled();
});





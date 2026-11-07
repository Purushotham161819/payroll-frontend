const {chromium,expect}=require('@playwright/test');
const path=require('path');
(async()=>{
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('http://localhost:3000/auth/me',r=>r.fulfill({json:{id:'preview',email:'preview@example.test',role:'admin'}}));
await page.route('http://localhost:3000/settings/organization',r=>r.fulfill({json:{displayName:'Example organization'}}));
await page.route('http://localhost:3000/employees',r=>r.fulfill({json:[]}));
await page.route('http://localhost:3000/salary-components',r=>r.fulfill({json:[...['BASIC','DA','RA'].map((code,i)=>({_id:code,code,name:['Basic Salary','Dearness Allowance','Retaining Allowance'][i],category:'earning',status:'active',isSystemDefined:true})),{_id:'hra',code:'HRA',name:'House Rent Allowance',category:'allowance',status:'active',isSystemDefined:false}]}));
await page.goto('http://localhost:4201/');
const opener=page.getByRole('button',{name:'Generate Payroll',exact:true});await opener.click();
const dialog=page.getByRole('dialog',{name:'Generate Payroll',exact:true});await expect(dialog).toBeVisible();
await expect(dialog.getByRole('checkbox',{name:'Basic Salary (required)',exact:true})).toBeDisabled();
await expect(dialog.getByRole('button',{name:'Generate PDF',exact:true})).toBeDisabled();
await dialog.getByLabel('Report Type',{exact:true}).selectOption('Monthly');
await dialog.getByLabel('Payroll Month',{exact:true}).selectOption({index:1});
await expect(dialog.getByRole('button',{name:'Generate PDF',exact:true})).toBeEnabled();
await dialog.getByLabel('Include terminated employees for historical projections',{exact:true}).check();
await dialog.getByRole('button',{name:'Deselect All',exact:true}).click();
await expect(dialog.getByRole('checkbox',{name:'House Rent Allowance',exact:true})).not.toBeChecked();
await dialog.getByRole('button',{name:'Select All',exact:true}).click();
await expect(dialog.getByRole('checkbox',{name:'House Rent Allowance',exact:true})).toBeChecked();
await dialog.getByRole('button',{name:'Move House Rent Allowance up',exact:true}).click();
await expect(dialog.getByText('House Rent Allowance moved to position', {exact:false})).toBeVisible();
await page.evaluate(()=>{document.activeElement?.blur();document.querySelector('.column-list').scrollTop=0;});
await page.screenshot({path:path.join(__dirname,'popup-1440.png'),fullPage:true});
for(const width of [768,390]) {await page.setViewportSize({width,height:844});await expect(dialog).toBeVisible();expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);const bounds=await dialog.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width);await page.screenshot({path:path.join(__dirname,`popup-${width}.png`),fullPage:true});}
await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
await opener.click();await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'Close payroll selection',exact:true}).click();await expect(dialog).toHaveCount(0);
await opener.click();await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();expect(errors).toEqual([]);
console.log('Popup checks passed: desktop/tablet/mobile, selects, selections, ordering, disabled states, Cancel/Close/Escape and focus return.');
} finally {await browser.close();}
})();

import {test,expect} from '@playwright/test';

test('PayStream branding, dynamic customer name, responsive header and logout',async({page})=>{
 let active=true,name='PayStream, An Excelhire Product';
 await page.route('**/auth/me',r=>active?r.fulfill({json:{id:'admin',email:'admin@example.test',role:'admin'}}):r.fulfill({status:401,json:{message:'Authentication required'}}));
 await page.route('**/auth/logout',r=>{active=false;return r.fulfill({status:204});});
 await page.route('http://localhost:3000/settings/organization',r=>r.fulfill({json:{displayName:name}}));
 await page.route('http://localhost:3000/employees',r=>r.fulfill({json:[]}));
 await page.route('http://localhost:3000/salary-components',r=>r.fulfill({json:[]}));
 await page.goto('/');
 const brand=page.getByRole('link',{name:'PayStream, An Excelhire Product home',exact:true});
 await expect(brand).toBeVisible();await expect(brand).toContainText('PayStream,');await expect(brand).toContainText('An Excelhire Product');
 await expect(page.locator('.organization-name')).toHaveText(name);await expect(page.getByRole('button',{name:'Sign out',exact:true})).toHaveCount(1);
 name='Example Customer Organization';await page.reload();await expect(page.locator('.organization-name')).toHaveText(name);await expect(brand).toContainText('PayStream,');
 await page.getByRole('link',{name:'Settings',exact:true}).click();await expect(page.locator('.organization-name')).toHaveText(name);
 name='A very long customer organization name with regional divisions and subsidiaries '.repeat(5);await page.reload();
 await expect(page.locator('.organization-name')).toHaveAttribute('title',name.trim());
 for(const width of [1440,1280,1101,1024,801,800,601,600,390,320]){
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const organization=await page.locator('.organization-name').boundingBox(),button=await page.getByRole('button',{name:'Sign out',exact:true}).boundingBox();

  const header=await page.locator('.topbar').boundingBox();
  const paddingRight=await page.locator('.topbar').evaluate(el=>parseFloat(getComputedStyle(el).paddingRight));
  expect(Math.abs(button!.x+button!.width-(header!.x+header!.width-paddingRight))).toBeLessThan(1);
  expect(Math.abs(organization!.x+organization!.width/2-(header!.x+header!.width/2))).toBeLessThan(1);
  const separate=organization!.x+organization!.width<=button!.x || organization!.y+organization!.height<=button!.y || button!.y+button!.height<=organization!.y;
  expect(separate).toBe(true);
  const fontSize=await page.locator('.organization-name').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(15);expect(fontSize).toBeLessThanOrEqual(16);

  const bounds=await brand.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
 }
 await page.screenshot({path:'artifacts/paystream-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'artifacts/paystream-desktop.png',fullPage:true});
 const organization=page.locator('.organization-name'),signOut=page.getByRole('button',{name:'Sign out',exact:true});
 const before=await organization.boundingBox(),normalButton=await signOut.boundingBox();
 const originalText=await signOut.textContent();
 await signOut.evaluate(el=>{el.textContent='Signing out...';el.style.width='220px';});
 const widerButton=await page.locator('.account-area button').boundingBox(),after=await organization.boundingBox();
 expect(widerButton!.width).toBeGreaterThan(normalButton!.width+50);
 expect(Math.abs(after!.x+after!.width/2-(before!.x+before!.width/2))).toBeLessThan(1);
 expect(after!.x+after!.width).toBeLessThan(widerButton!.x);
 const context=await page.locator('.workspace-context').boundingBox();
 expect(context!.x+context!.width).toBeLessThan(after!.x);
 await page.locator('.account-area button').evaluate((el,text)=>{el.textContent=text;el.style.removeProperty('width');},originalText);

 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/\/login/);await expect(page.getByText('PayStream, An Excelhire Product',{exact:true})).toBeVisible();
 await page.goto('/settings');await expect(page).toHaveURL(/\/login/);
});

import { test, expect } from '@playwright/test';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADUlEQVR4XmP4z8AARAAI/gH/egE/eAAAAABJRU5ErkJggg==', 'base64');
for (const width of [1440, 390]) test('organization logo upload UI at ' + width, async ({page}) => {
 await page.setViewportSize({width,height:900});
 let logo: string | null = null;
 let uploads = 0;
 await page.route('http://localhost:3000/**', route => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/auth/me') return route.fulfill({json:{id:'admin',role:'admin',email:'admin@example.test',organizationId:'ORG000001'}});
  if (path === '/settings/organization') return route.fulfill({json:{displayName:'Example'}});
  if (path === '/settings/organization-profile/logo') {
   logo = route.request().postDataJSON().dataUrl || null; uploads++;
   return route.fulfill({json:{logo}});
  }
  if (path === '/settings/organization-profile') return route.fulfill({json:{organizationName:'Example',addressVersion:0,address:{},logo}});
  return route.fulfill({json:[]});
 });
 await page.goto('/settings/organization');
 const area = page.locator('.organization-logo');
 await expect(area.getByText('Upload organization logo',{exact:true})).toBeVisible();
 await expect(area.locator('input[type=file]')).toBeHidden();
 const chooser = page.waitForEvent('filechooser');
 await area.getByRole('button',{name:'Browse Files'}).click();
 await (await chooser).setFiles({name:'company-logo.png',mimeType:'image/png',buffer:png});
 await expect(area.getByRole('button',{name:'Replace organization logo'})).toBeEnabled();
 await expect(area.getByText('company-logo.png',{exact:true})).toBeVisible();
 await expect(area.locator('.logo-drop-zone')).toHaveCount(0);
 const image = area.getByAltText('Organization logo');
 await expect(image).toBeVisible();
 const box = await area.boundingBox();
 expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x+box!.width).toBeLessThanOrEqual(width);
 expect(await area.evaluate(el=>el.scrollWidth <= el.clientWidth)).toBe(true);
 await page.getByRole('button',{name:'OK',exact:true}).click();
 await page.screenshot({path:'test-results/logo-preview-'+width+'.png',fullPage:true});

 await area.getByRole('button',{name:'Remove organization logo'}).click();
 await expect(area.locator('.logo-drop-zone')).toBeVisible();
 await page.getByRole('button',{name:'OK',exact:true}).click();
 await page.screenshot({path:'test-results/logo-empty-'+width+'.png',fullPage:true});
 const transfer = await page.evaluateHandle(() => {
  const dt = new DataTransfer(); dt.items.add(new File(['image'],'dropped.jpg',{type:'image/jpeg'})); return dt;
 });
 const drop = area.locator('.logo-drop-zone');
 await drop.dispatchEvent('dragenter',{dataTransfer:transfer}); await expect(drop).toHaveClass(/dragging/);
 await drop.dispatchEvent('drop',{dataTransfer:transfer});
 await expect(area.getByText('dropped.jpg',{exact:true})).toBeVisible();
 expect(uploads).toBe(3);
});

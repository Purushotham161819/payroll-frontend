import { expect, Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

/** Opt-in review evidence using existing screen fixtures and workflows. */
export async function productDropdownEvidence(page: Page, screen: string, width: number): Promise<void> {
  if(!process.env.PRODUCT_DROPDOWNS) return;
  const dir='artifacts/phase4g-product-dropdowns'; mkdirSync(dir,{recursive:true});
  const prefix=process.env.PRODUCT_DROPDOWNS;
  for(const [index,control] of (await page.locator('select,ps-select').all()).entries()) {
    if(!await control.isVisible()) continue;
    await control.scrollIntoViewIfNeeded(); await control.blur(); await page.mouse.move(0,0);
    const name=await control.getAttribute('id') || await control.getAttribute('name') || String(index);
    const key=screen+'-'+name.replace(/[^a-z0-9_-]/gi,'-')+'-'+width;
    const metrics=await control.evaluate(el=>{const c=getComputedStyle(el),r=el.getBoundingClientRect();return {width:r.width,height:r.height,padding:c.padding,border:c.border,radius:c.borderRadius,font:c.font,background:c.backgroundColor,image:c.backgroundImage,position:c.backgroundPosition,imageSize:c.backgroundSize};});
    writeFileSync(`${dir}/${prefix}-${key}.json`,JSON.stringify(metrics,null,2));
    if(prefix==='after' && existsSync(`${dir}/before-${key}.json`)) expect(metrics).toEqual(JSON.parse(readFileSync(`${dir}/before-${key}.json`,'utf8')));
    await control.screenshot({path:`${dir}/${prefix}-closed-${key}.png`});
    if(await control.isDisabled()) continue;
    await control.click();
    if(prefix==='after') {
      const panel=page.locator('.ps-select-panel'); await expect(panel).toBeVisible();
      const selected=panel.locator('[aria-selected=true]');if(await selected.count()) await expect(selected).toBeInViewport();
      const box=(await panel.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);
      expect(box.height).toBeLessThanOrEqual(296);
      await expect(panel.getByRole('option')).toHaveCount(await control.evaluate(el=>el instanceof HTMLSelectElement ? el.options.length : 12));
    }
    await page.screenshot({path:`${dir}/${prefix}-open-${key}.png`}); await page.keyboard.press('Escape');
  }
}

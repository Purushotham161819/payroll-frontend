import { expect, Locator, Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';

export async function dropdownEvidence(page: Page, period: Locator, artifacts: string, width: number): Promise<void> {
  await expect(period).toHaveAccessibleName('Pay Period');
  await page.locator('label[for="pay-period"]').click(); await expect(period).toBeFocused(); await page.keyboard.press('Enter');
  const panel = page.getByRole('listbox',{name:'Pay Period options',exact:true});
  await expect(panel).toBeVisible(); await expect(period).toHaveAttribute('aria-expanded','true');
  await expect(panel.getByRole('option')).toHaveCount(12);
  await expect(panel.locator('[aria-selected=true]')).toBeInViewport();
  await expect(panel.locator('ps-icon')).toHaveCount(1);
  const measurements = await period.evaluate(el=>{
    const field=el.getBoundingClientRect(),arrow=el.querySelector('.ps-select-arrow')!.getBoundingClientRect(),value=el.querySelector('.ps-select-value')!.getBoundingClientRect();
    const panel=document.querySelector('.ps-select-panel')!,p=panel.getBoundingClientRect(),row=panel.querySelector('[role=option]')!.getBoundingClientRect();
    const c=getComputedStyle(el),s=getComputedStyle(panel),r=getComputedStyle(panel.querySelector('[role=option]')!);
    return {field:field.toJSON(),arrow:arrow.toJSON(),arrowInsideBorder:field.right-arrow.right-parseFloat(c.borderRightWidth),verticalOffset:(arrow.top+arrow.height/2)-(field.top+field.height/2),valueArrowGap:arrow.left-value.right,padding:c.padding,panel:p.toJSON(),optionHeight:row.height,optionTextOffset:row.left+parseFloat(r.paddingLeft)-p.left,maxHeight:s.maxHeight,shadow:s.boxShadow,scrollbarWidth:s.scrollbarWidth,webkitScrollbarWidth:getComputedStyle(panel,'::-webkit-scrollbar').width,scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight};
  });
  writeFileSync(`${artifacts}/after-panel-metrics-${width}.json`,JSON.stringify(measurements,null,2));
  expect(measurements.field.height).toBe(40);expect(measurements.arrow.width).toBe(16);expect(measurements.arrowInsideBorder).toBeCloseTo(12,0);expect(Math.abs(measurements.verticalOffset)).toBeLessThanOrEqual(1);expect(measurements.valueArrowGap).toBeGreaterThanOrEqual(8);
  expect(measurements.webkitScrollbarWidth).toBe('6px');expect(measurements.optionHeight).toBe(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches)?44:36);expect(measurements.optionTextOffset).toBe(13);expect(measurements.panel.width).toBeGreaterThanOrEqual(measurements.field.width);expect(measurements.panel.height).toBeLessThanOrEqual(296);expect(Math.abs(measurements.panel.x-measurements.field.x)).toBeLessThanOrEqual(1);
  expect(measurements.panel.right).toBeLessThanOrEqual(width);expect(measurements.panel.y).toBeGreaterThanOrEqual(8);
  await page.screenshot({path:`${artifacts}/after-panel-selected-${width}.png`});
  await page.keyboard.press('Home');await expect(period).toHaveAttribute('aria-activedescendant',/-0$/);
  await page.keyboard.press('PageDown');await expect(period).not.toHaveAttribute('aria-activedescendant',/-0$/);
  await page.keyboard.press('End');await expect(period).toHaveAttribute('aria-activedescendant',/-11$/);await expect(panel.getByRole('option').last()).toBeInViewport();
  await page.screenshot({path:`${artifacts}/after-panel-scrolled-${width}.png`});
  await page.keyboard.press('PageUp');await page.keyboard.press('Home');await page.keyboard.press('j');await expect(panel.locator('.ps-select-active')).toContainText(/January|June|July/);
  await page.keyboard.press('Escape');await expect(period).toBeFocused();await expect(period).toHaveAttribute('aria-expanded','false');
  await page.keyboard.press('ArrowUp');await expect(panel).toBeVisible();await page.keyboard.press('f');await expect(panel.locator('.ps-select-active')).toContainText('February');await page.keyboard.press('Tab');await expect(panel).toHaveCount(0);
  await period.click();await page.getByRole('heading',{name:'Run Payroll',exact:true}).click();await expect(panel).toHaveCount(0);
  // A test-only container moves the actual rendered shared control, never application state.
  await period.evaluate(el=>{
    const field=el.closest('ps-form-field')!;const marker=document.createComment('test-original-location');field.before(marker);
    const card=document.createElement('div');card.id='dropdown-test-card';card.style.cssText='position:fixed;left:8px;top:80px;width:280px;height:64px;overflow:hidden;background:white';
    document.body.append(card);card.append(field);(window as any).__dropdownEvidence={field,marker,card};
  });
  await period.click();await expect(panel).toBeVisible();await page.screenshot({path:`${artifacts}/after-overflow-card-${width}.png`});
  expect(await panel.evaluate(el=>el.closest('#dropdown-test-card'))).toBeNull();await page.keyboard.press('Escape');
  await page.evaluate(()=>{(window as any).__dropdownEvidence.card.style.top=(innerHeight-90)+'px';});await period.click();await expect(panel).toBeVisible();const flipped=(await panel.boundingBox())!,trigger=(await period.boundingBox())!;expect(flipped.y+flipped.height).toBeLessThanOrEqual(trigger.y-3);await page.screenshot({path:artifacts+'/after-panel-flipped-'+width+'.png'});await page.keyboard.press('Escape');
  await page.evaluate(()=>{const x=(window as any).__dropdownEvidence;const dialog=document.createElement('dialog');dialog.id='dropdown-test-dialog';dialog.setAttribute('aria-label','Shared control evidence');dialog.style.cssText='width:300px;overflow:hidden';document.body.append(dialog);dialog.append(x.field);x.dialog=dialog;dialog.showModal();});
  await period.click();await expect(panel).toBeVisible();await page.screenshot({path:`${artifacts}/after-dialog-panel-${width}.png`});
  const hit=await panel.locator('[aria-selected=true]').evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+12,r.y+12)?.closest('[role=option]')===el;});expect(hit).toBe(true);await page.keyboard.press('Escape');
  await page.evaluate(()=>{const x=(window as any).__dropdownEvidence;x.dialog.close();x.marker.replaceWith(x.field);x.card.remove();x.dialog.remove();delete (window as any).__dropdownEvidence;});
  // Synthetic visual error fixture; real required/disabled form behavior is tested in PsSelect unit tests.
  await period.evaluate(el=>{el.setAttribute('aria-invalid','true');const p=document.createElement('p');p.id='test-period-error';p.textContent='Required';p.style.color='var(--danger)';el.closest('ps-form-field')!.append(p);el.setAttribute('aria-describedby',p.id);});
  await expect(period).toHaveAccessibleDescription('Required');await period.locator('xpath=ancestor::ps-form-field').screenshot({path:`${artifacts}/after-error-period-${width}.png`});
  expect(await period.evaluate(el=>getComputedStyle(el).borderColor)).toBe('rgb(180, 35, 24)');
  await period.evaluate(el=>{el.setAttribute('aria-invalid','false');el.removeAttribute('aria-describedby');document.getElementById('test-period-error')?.remove();(window as any).ng.getComponent(el).setDisabledState(true);});
  await expect(period).toHaveAttribute('aria-disabled','true');await period.locator('xpath=ancestor::ps-form-field').screenshot({path:`${artifacts}/after-disabled-period-${width}.png`});
  await period.click({force:true});await expect(panel).toHaveCount(0);
  await period.evaluate(el=>(window as any).ng.getComponent(el).setDisabledState(false));
  await page.emulateMedia({reducedMotion:'reduce'});await period.click();expect(await period.locator('.ps-select-arrow').evaluate(el=>getComputedStyle(el).transform)).toBe('matrix(1, 0, 0, 1, 0, -8)');await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'no-preference'});
  await period.click();await page.setViewportSize({width,height:999});await expect(panel).toHaveCount(0);await page.setViewportSize({width,height:1000});
}

import { expect, Locator } from '@playwright/test';

// Exercise the rendered control; preserve raw YYYY-MM value and request assertions.
export async function selectPeriod(control: Locator, value: string): Promise<void> {
  if(await control.evaluate(el=>el.tagName === 'SELECT')) { await control.selectOption(value); return; }
  const [year,month] = value.split('-').map(Number);
  const label = new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1)));
  await control.click();
  await control.page().getByRole('option',{name:label,exact:true}).click();
}
export async function expectPeriod(control: Locator, value: string): Promise<void> {
  await expect.poll(()=>control.evaluate(el=>el.tagName === 'PS-SELECT' ? el.getAttribute('data-value') : (el as HTMLInputElement).value)).toBe(value);
}

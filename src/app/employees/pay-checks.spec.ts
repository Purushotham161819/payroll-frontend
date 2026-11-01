import { TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localeIn from '@angular/common/locales/en-IN';
import { PayChecks } from './pay-checks';
import { RunPayrollService } from '../features/run-payroll/run-payroll.service';
import { CdkOverlayOrigin } from '@angular/cdk/overlay';
registerLocaleData(localeIn);
const check = (period: string, tds?: number) => ({
  employeeId: 'a',
  firstName: 'A',
  lastName: 'Example',
  period,
  paymentDate: period + '-28',
  grossPay: 100,
  employerContributions: 10,
  deductions: 30,
  netPay: 70,
  ...(tds === undefined ? {} : { tds }),
});
async function setup() {
  const service = {
    history: vi
      .fn()
      .mockResolvedValue([check('2026-11', 123456.78), check('2026-10', 0), check('2026-09')]),
    pdf: vi.fn(),
    download: vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({
    providers: [{ provide: RunPayrollService, useValue: service }],
  });
  const fixture = TestBed.createComponent(PayChecks);
  fixture.componentRef.setInput('employeeId', 'a');
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, page: fixture.componentInstance, service };
}
describe('Pay Check presentation of stored TDS and PDF actions', () => {
  it('shows icon-only actions and keeps stored totals and chronological order intact', async () => {
    const { fixture, page } = await setup();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain('November 2026');
    expect(rows[1].textContent).toContain('October 2026');
    expect(fixture.nativeElement.textContent).not.toContain('Income Tax / TDS:');
    const buttons = rows[0].querySelectorAll('button');
    expect([...buttons].map((button: any) => button.getAttribute('aria-label'))).toEqual([
      'View TDS details',
      'View Pay Check',
      'Download Pay Check PDF',
    ]);
    for (const button of buttons) {
      expect(button.textContent.trim()).toBe('');
      expect(button.querySelector('svg')).not.toBeNull();
    }
    expect(page.checks()[0].deductions).toBe(30);
    expect(page.checks()[0].tds).toBe(123456.78);
  });
  it('reads actual stored zero and missing values without inventing TDS or issuing requests', async () => {
    const { fixture, page, service } = await setup();
    expect(page.storedTds(page.checks()[0])).toBe(123456.78);
    expect(page.storedTds(page.checks()[1])).toBe(0);
    expect(page.storedTds(page.checks()[2])).toBeNull();
    const button = fixture.nativeElement.querySelector('[aria-label="View TDS details"]');
    const origin = { elementRef: { nativeElement: button } } as CdkOverlayOrigin;
    page.toggleTds(page.checks()[0], origin);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.body.querySelector('.tds-popover')?.textContent).toContain('₹1,23,456.78');
    page.toggleTds(page.checks()[0], origin);
    fixture.detectChanges();
    expect(page.tdsCheck()).toBeNull();
    page.toggleTds(page.checks()[1], origin);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.body.querySelector('.tds-popover')?.textContent).toContain('₹0.00');
    page.closeTds();
    fixture.detectChanges();
    page.toggleTds(page.checks()[2], origin);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.body.querySelector('.tds-popover')?.textContent).toContain('not recorded');
    expect(service.history).toHaveBeenCalledTimes(1);
    expect(service.pdf).not.toHaveBeenCalled();
    expect(service.download).not.toHaveBeenCalled();
    fixture.destroy();
    expect(document.body.querySelector('.tds-popover')).toBeNull();
  });
  it('clears the selected TDS when the employee changes and delegates download unchanged', async () => {
    const { fixture, page, service } = await setup();
    const button = fixture.nativeElement.querySelector('button');
    page.toggleTds(page.checks()[0], { elementRef: { nativeElement: button } } as CdkOverlayOrigin);
    const stored = page.checks()[0];
    await page.download(stored);
    expect(service.download).toHaveBeenCalledWith('2026-11', 'a');
    expect(page.tdsCheck()).toBeNull();
    page.toggleTds(stored, { elementRef: { nativeElement: button } } as CdkOverlayOrigin);
    fixture.componentRef.setInput('employeeId', 'b');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.tdsCheck()).toBeNull();
  });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { EmployeeTax } from './employee-tax';
const base = 'http://localhost:3000',
  url = base + '/employees/employee/income-tax/FY_ONE';
const fields = {
  version: 1,
  regime: 'new',
  tdsApplicable: true,
  resident: true,
  salaryOnly: true,
  panOperative: true,
  fullYearEmployment: true,
  exemptionConditionsConfirmed: false,
  reason: 'Saved evidence',
};
function summary(profile: any = null, status = 'not_configured') {
  return {
    profile,
    annualCtc: 2400000,
    payrollFrequency: 'Monthly',
    latest: null,
    calculationStatus: status,
    calculationStatusLabel: status,
    regimeSelection: { regime: 'new', availableRegimes: ['new'], message: '' },
  };
}
describe('Employee TDS profile editing and year locking', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  async function setup(saved = false) {
    TestBed.configureTestingModule({
      imports: [EmployeeTax],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(EmployeeTax),
      http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('employeeId', 'employee');
    fixture.detectChanges();
    http.expectOne(base + '/settings/tax-configuration').flush({
      years: [
        { code: 'FY_ONE', name: 'First year', active: true },
        { code: 'FY_TWO', name: 'Second year' },
      ],
    });
    http
      .expectOne(base + '/employees/employee/income-tax')
      .flush(saved ? [{ yearCode: 'FY_ONE', version: 1 }] : []);
    http.expectOne(base + '/salary-components').flush([
      {
        _id: 'basic',
        name: 'Basic Salary',
        code: 'BASIC',
        category: 'earning',
        status: 'active',
      },
    ]);
    await vi.waitFor(() => expect(http.match(() => false)).toEqual([]));
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(url).flush(summary(saved ? fields : null));
    await vi.waitFor(() => expect(fixture.componentInstance.busy()).toBe(false));
    fixture.detectChanges();
    return { fixture, http, page: fixture.componentInstance };
  }
  it('loads configured financial years, derives a readonly regime and never automatically calculates', async () => {
    const { fixture, http, page } = await setup();
    expect(page.editing()).toBe(true);
    expect(fixture.nativeElement.querySelector('select').disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('[name=regime]').readOnly).toBe(true);
    expect(page.regimeLabel()).toBe('New Regime');
    http.expectNone(url + '/calculate');
    expect(page.salaryRows()[0].name).toBe('Basic Salary');
  });
  it('saves once, locks all saved inputs and retains the financial year during editing/cancel', async () => {
    const { fixture, http, page } = await setup();
    page.profile = { ...fields, version: 0 };
    const saving = page.save();
    void page.save();
    const requests = http.match(url);
    expect(requests).toHaveLength(1);
    expect(requests[0].request.method).toBe('PUT');
    expect(requests[0].request.body).not.toHaveProperty('annualCtc');
    requests[0].flush(fields);
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(url).flush(summary(fields, 'not_calculated'));
    await saving;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.editing()).toBe(false);
    expect(fixture.nativeElement.querySelector('select').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
    const editing = page.edit();
    http.expectOne(url + '/edit').flush({ editToken: 'server-edit-permission' });
    await editing;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.editing()).toBe(true);
    expect(fixture.nativeElement.querySelector('select').disabled).toBe(true);
    page.profile.reason = 'Uncommitted change';
    await page.cancel();
    expect(page.profile.reason).toBe(fields.reason);
    expect(page.editing()).toBe(false);
    http.expectNone(url + '/calculate');
  });
  it('does not unlock or switch a saved year through ordinary dropdown changes', async () => {
    const { http, page } = await setup(true);
    await page.selectYear('FY_TWO');
    expect(page.yearCode).toBe('FY_ONE');
    http.expectNone(base + '/employees/employee/income-tax/FY_TWO');
  });
  it('requires confirmation for changing years and preserves the original profile on cancellation', async () => {
    const { fixture, http, page } = await setup(true);
    page.openYearChange();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog')).not.toBeNull();
    page.targetYear = 'FY_TWO';
    const changing = page.confirmYearChange();
    http
      .expectOne(base + '/employees/employee/income-tax/FY_TWO/change-year')
      .flush({ yearCode: 'FY_TWO', changeYearToken: 'change-permission' });
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(base + '/employees/employee/income-tax/FY_TWO').flush(summary());
    await changing;
    expect(page.yearCode).toBe('FY_TWO');
    expect(page.yearLocked()).toBe(true);
    const cancel = page.cancel();
    http.expectOne(url).flush(summary(fields));
    await cancel;
    expect(page.yearCode).toBe('FY_ONE');
    expect(page.profile.reason).toBe(fields.reason);
  });
  it('blocks missing or ambiguous configuration without inventing a regime', async () => {
    const { http, page } = await setup();
    page.summary.set({
      ...summary(),
      regimeSelection: {
        regime: null,
        message: 'Both tax regimes are configured.',
      },
    });
    page.profile = { ...fields, version: 0 };
    await page.save();
    expect(page.regimeReady()).toBe(false);
    http.expectNone(url);
  });
  it('uses explicit calculation only from a saved profile and returns backend status after the request', async () => {
    const { http, page } = await setup(true);
    const calculated = page.calculate();
    http.expectOne(url + '/calculate').flush({ status: 'calculated' });
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(url).flush(summary(fields, 'calculated'));
    await calculated;
    expect(page.summary().calculationStatus).toBe('calculated');
    expect(page.editing()).toBe(false);
  });
  it('keeps an existing target year selected when its later edit is cancelled', async () => {
    const { http, page } = await setup(true);
    page.openYearChange();
    page.targetYear = 'FY_TWO';
    const change = page.confirmYearChange();
    http
      .expectOne(base + '/employees/employee/income-tax/FY_TWO/change-year')
      .flush({ yearCode: 'FY_TWO', changeYearToken: 'permission' });
    await Promise.resolve();
    await Promise.resolve();
    const saved = { ...fields, reason: 'Target year facts' };
    http.expectOne(base + '/employees/employee/income-tax/FY_TWO').flush(summary(saved));
    await change;
    const edit = page.edit();
    http
      .expectOne(base + '/employees/employee/income-tax/FY_TWO/edit')
      .flush({ editToken: 'target-edit' });
    await edit;
    page.profile.reason = 'Do not save';
    await page.cancel();
    expect(page.yearCode).toBe('FY_TWO');
    expect(page.profile.reason).toBe('Target year facts');
    expect(page.editing()).toBe(false);
    http.expectNone(url);
  });
  it('leaves failed saves editable with entered values intact', async () => {
    const { http, page } = await setup(true);
    const editing = page.edit();
    http.expectOne(url + '/edit').flush({ editToken: 'token' });
    await editing;
    page.profile.reason = 'Retry me';
    const saving = page.save();
    const request = http.expectOne(url);
    expect(request.request.body.editToken).toBe('token');
    request.flush(
      { message: 'Tax profile changed. Reload and retry.' },
      { status: 409, statusText: 'Conflict' },
    );
    await saving;
    expect(page.editing()).toBe(true);
    expect(page.profile.reason).toBe('Retry me');
    expect(page.error()).toContain('Tax profile changed');
  });
});

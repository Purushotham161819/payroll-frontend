import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { EmployeeTax } from './employee-tax';
import { By } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';
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
  async function setup(saved = false, savedProfile: any = fields) {
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
    http.expectOne(url).flush(summary(saved ? savedProfile : null));
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
  it('reveals required previous-employer fields only for job change and sends numeric saved facts', async () => {
    const { fixture, http, page } = await setup();
    page.profile = {
      ...fields,
      version: 0,
      employmentScenario: 'job_change',
      previousEmployerGrossWages: 500000,
      previousEmployerExemptWages: 50000,
      previousEmployerTds: 25000,
      previousEmployerExemptionsVerified: true,
    };
    fixture.nativeElement.querySelector('input[value=job_change]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.profile.employmentScenario).toBe('job_change');
    const gross = fixture.nativeElement.querySelector('[name=previousEmployerGrossWages]');
    expect(gross.type).toBe('number');
    expect(gross.required).toBe(true);
    const saving = page.save();
    const req = http.expectOne(url);
    expect(req.request.body.employmentScenario).toBe('job_change');
    expect(req.request.body.previousEmployerGrossWages).toBe(500000);
    expect(req.request.body.previousEmployerExemptWages).toBe(50000);
    expect(req.request.body.previousEmployerTds).toBe(25000);
    const profile = { ...page.profile, version: 1 };
    req.flush(profile);
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(url).flush(summary(profile, 'not_calculated'));
    await saving;
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[name=previousEmployerGrossWages]').matches(':disabled'),
    ).toBe(true);
    expect(page.profile.previousEmployerExemptionsVerified).toBe(true);
  });
  it('clears previous-employer values when switching back to first job', async () => {
    const { fixture, page } = await setup();
    page.profile = {
      ...fields,
      version: 0,
      employmentScenario: 'job_change',
      previousEmployerGrossWages: 500000,
      previousEmployerExemptWages: 50000,
      previousEmployerTds: 25000,
      previousEmployerExemptionsVerified: true,
    };
    fixture.nativeElement.querySelector('input[value=job_change]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const firstJob = fixture.nativeElement.querySelector('input[value=first_job]');
    firstJob.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.profile.employmentScenario).toBe('first_job');
    expect(page.profile.previousEmployerGrossWages).toBeNull();
    expect(page.profile.previousEmployerTds).toBeNull();
    expect(fixture.nativeElement.querySelector('[name=previousEmployerGrossWages]')).toBeNull();
  });
  it('renders the saved projection, previous credits and excess credit review', async () => {
    const { fixture, page } = await setup(true);
    page.viewingCalculation.set({
      createdAt: '2026-10-31',
      snapshot: {
        regime: 'new',
        legislation: 'QA',
        profileVersion: 1,
        configurationVersion: 'qa',
        inputs: {
          revision: { rules: { mappings: [] } },
          projection: {
            annualCtc: 1600000,
            hireDate: '2026-09-06',
            employmentStartDate: '2026-09-06',
            financialYearStartDate: '2026-04-01',
            eligibleMonthCount: 7,
            employmentScenario: 'job_change',
            previousEmployerGrossWages: 500000,
            previousEmployerExemptWages: 50000,
            salary: { annual: { annualCtc: 933333.33 } },
          },
        },
        result: {
          currentEmployerGrossWages: 900000,
          annualGrossWages: 1400000,
          standardDeduction: 75000,
          annualEstimatedTax: 10000,
          previousEmployerTdsCredit: 11000,
          remainingAnnualTds: 0,
          remainingPayrollPeriods: 7,
          excessTaxCredit: 1000,
          currentEmployerSubmittedTds: 0,
          allocation: Array(12).fill(0),
          slabs: [],
          taxableComponents: [],
          warnings: ['Tax credits exceed estimated annual liability. Review excess credit.'],
        },
      },
    });
    fixture.detectChanges();
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Pro-rated Annual CTC');
    expect(text).toContain('Previous employer verified exempt wages');
    expect(text).toContain('Previous employer TDS credit');
    expect(text).toContain('Excess tax credit for review');
    expect(text).toContain('Tax credits exceed estimated annual liability.');
  });
  it('shows the locked current year and configured year list during Edit without enabling a regime override', async () => {
    const { fixture, http, page } = await setup(true);
    const editing = page.edit();
    http.expectOne(url + '/edit').flush({ editToken: 'edit-token' });
    await editing;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const year = fixture.nativeElement.querySelector('#employee-tax-financial-year');
    expect(year).not.toBeNull();
    expect(year.value).toBe('FY_ONE');
    expect(year.disabled).toBe(true);
    expect(Array.from(year.options).map((o: any) => o.value)).toEqual(['FY_ONE', 'FY_TWO']);
    expect(fixture.nativeElement.querySelector('details').textContent).toContain('Second year');
    expect(fixture.nativeElement.querySelector('[name=regime]').readOnly).toBe(true);
    expect(page.hasProfileChanges()).toBe(false);
    expect(fixture.nativeElement.querySelector('button[type=submit]').disabled).toBe(true);
  });
  it('explains required exemption verification and enables a real form save with valid decimal amounts', async () => {
    const { fixture, http, page } = await setup();
    page.profile = { ...fields, version: 0, employmentScenario: 'job_change' };
    fixture.nativeElement.querySelector('input[value=job_change]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const form = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    const enter = async (name: string, value: string) => {
      const input = fixture.nativeElement.querySelector('[name=' + name + ']');
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    await enter('previousEmployerGrossWages', '500000.50');
    await enter('previousEmployerExemptWages', '50000.25');
    await enter('previousEmployerTds', '25000.75');
    expect(form.controls['previousEmployerExemptionsVerified'].hasError('required')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Verify documented previous-employer exemptions',
    );
    expect(fixture.nativeElement.querySelector('button[type=submit]').disabled).toBe(true);
    fixture.nativeElement.querySelector('[name=previousEmployerExemptionsVerified]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(form.valid).toBe(true);
    expect(page.canSave(form)).toBe(true);
    expect(fixture.nativeElement.querySelector('button[type=submit]').disabled).toBe(false);
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const req = http.expectOne(url);
    expect(req.request.body.previousEmployerExemptWages).toBe(50000.25);
    expect(req.request.body.previousEmployerGrossWages).toBe(500000.5);
    expect(req.request.body.previousEmployerTds).toBe(25000.75);
    expect(req.request.body.previousEmployerExemptionsVerified).toBe(true);
    const saved = { ...req.request.body, version: 1 };
    req.flush(saved);
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(url).flush(summary(saved, 'estimate_saved'));
    await vi.waitFor(() => expect(page.busy()).toBe(false));
    expect(page.editing()).toBe(false);
    expect(page.hasProfileChanges()).toBe(false);
    const reload = page.load();
    http.expectOne(url).flush(summary(saved, 'estimate_saved'));
    await reload;
    expect(page.profile.previousEmployerExemptWages).toBe(50000.25);
    const edit = page.edit();
    http.expectOne(url + '/edit').flush({ editToken: 'edit-again' });
    await edit;
    page.profile.previousEmployerExemptWages = 1;
    expect(page.hasProfileChanges()).toBe(true);
    await page.cancel();
    expect(page.profile.previousEmployerExemptWages).toBe(50000.25);
  });
  it('accepts zero without exemption verification and rejects blank, negative, excess and over-precision amounts', async () => {
    const { fixture, page } = await setup();
    page.profile = {
      ...fields,
      version: 0,
      employmentScenario: 'job_change',
      previousEmployerGrossWages: 0,
      previousEmployerExemptWages: 0,
      previousEmployerTds: 0,
      previousEmployerExemptionsVerified: false,
      reason: '',
    };
    fixture.nativeElement.querySelector('input[value=job_change]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const form = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    expect(form.valid).toBe(true);
    expect(page.canSave(form)).toBe(true);
    for (const invalid of [null, -1, 0.001, 1000000000001]) {
      page.profile.previousEmployerTds = invalid;
      expect(page.previousEmployerErrors().length).toBeGreaterThan(0);
      expect(page.canSave()).toBe(false);
    }
    page.profile.previousEmployerTds = 0;
    page.profile.previousEmployerExemptWages = 1;
    expect(page.previousEmployerErrors()).toContain(
      'Previous employer exempt wages cannot exceed gross wages.',
    );
    page.profile.employmentScenario = 'first_job';
    page.employmentScenarioChanged();
    expect(page.previousEmployerErrors()).toEqual([]);
    fixture.nativeElement.querySelector('input[value=first_job]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(form.controls['previousEmployerTds']).toBeUndefined();
    expect(form.valid).toBe(true);
  });
});

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
  it('presents separate widgets with all profile facts and one Calculate action above them', async () => {
    const { fixture } = await setup(true);
    const el = fixture.nativeElement as HTMLElement;
    const profile = el.querySelector('#employee-tax-profile')!.closest('ps-card')!;
    const employment = el.querySelector('#employment-heading')!.closest('ps-card')!;
    expect(profile.contains(employment)).toBe(false);
    expect(profile.parentElement).toBe(employment.parentElement);
    expect([...profile.querySelectorAll('dt')].map((x) => x.textContent?.trim())).toEqual([
      'Saved / Read-only status',
      'Financial year',
      'Annual CTC',
      'Payroll frequency',
      'Calculation status',
      'Tax regime',
    ]);
    const calculate = el.querySelector('.calculation-toolbar button')!;
    expect(calculate.textContent).toContain('Calculate Annual TDS');
    expect(
      calculate.compareDocumentPosition(profile) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      [...el.querySelectorAll('button')].filter(
        (button) => button.textContent?.trim() === 'Calculate Annual TDS',
      ),
    ).toHaveLength(1);
    expect(employment.querySelector('[name=reason]')).not.toBeNull();
    expect(profile.querySelector('[title="Change Financial Year"]')).not.toBeNull();
    expect(profile.querySelector('[aria-label="Edit Tax Profile"]')).not.toBeNull();
  });
  it('protects changed employment inputs without calculating or altering saved history', async () => {
    const { page, http } = await setup(true);
    const edit = page.edit();
    http.expectOne(url + '/edit').flush({ editToken: 'permission' });
    await edit;
    expect(page.hasUnsavedChanges()).toBe(false);
    page.profile.reason = 'Updated review note';
    expect(page.hasUnsavedChanges()).toBe(true);
    const event = new Event('beforeunload', { cancelable: true });
    page.beforeUnload(event as BeforeUnloadEvent);
    expect(event.defaultPrevented).toBe(true);
    http.expectNone(url + '/calculate');
    http.expectNone(url + '/history');
    await page.cancel();
    expect(page.hasUnsavedChanges()).toBe(false);
  });
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
    const opening = page.openYearChange();
    http.expectOne(base + '/settings/tax-configuration').flush({
      years: [
        { code: 'FY_ONE', name: 'First year', active: true },
        { code: 'FY_TWO', name: 'Second year' },
      ],
    });
    await opening;
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
  it('keeps an existing target editable until Save and returns to the source on Cancel', async () => {
    const { http, page } = await setup(true);
    const opening = page.openYearChange();
    http.expectOne(base + '/settings/tax-configuration').flush({
      years: [
        { code: 'FY_ONE', name: 'First year' },
        { code: 'FY_TWO', name: 'Second year' },
      ],
    });
    await opening;
    expect(page.targetYear).toBe('FY_ONE');
    page.targetYear = 'FY_TWO';
    const change = page.confirmYearChange();
    http
      .expectOne(base + '/employees/employee/income-tax/FY_TWO/change-year')
      .flush({ yearCode: 'FY_TWO', editToken: 'target-edit', changeYearToken: 'permission' });
    await Promise.resolve();
    await Promise.resolve();
    const saved = { ...fields, reason: 'Target year facts' };
    http.expectOne(base + '/employees/employee/income-tax/FY_TWO').flush(summary(saved));
    await change;
    expect(page.editing()).toBe(true);
    expect(page.changingYear()).toBe(true);
    expect(page.hasProfileChanges()).toBe(true);
    expect(page.message()).toBe('');
    const cancel = page.cancel();
    http.expectOne(url).flush(summary(fields));
    await cancel;
    expect(page.yearCode).toBe('FY_ONE');
    expect(page.profile.reason).toBe(fields.reason);
    expect(page.editing()).toBe(false);
    expect(page.changingYear()).toBe(false);
    http.expectNone((r) => r.method === 'PUT');
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
  it('previews configuration by selected year and blocks a target without published rules', async () => {
    const { fixture, http, page } = await setup(true);
    const opening = page.openYearChange();
    http.expectOne(base + '/settings/tax-configuration').flush({
      years: [
        { code: 'FY_ONE', name: 'First year' },
        { code: 'FY_TWO', name: 'Second year' },
      ],
    });
    await opening;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('dialog select');
    expect(select.value).toBe('FY_ONE');
    expect(select.options.length).toBe(3);
    const selecting = page.selectTargetYear('FY_TWO');
    http.expectOne(base + '/employees/employee/income-tax/FY_TWO').flush({
      ...summary(),
      regimeSelection: {
        regime: null,
        message: 'Publish reviewed rules for this financial year.',
      },
    });
    await selecting;
    expect(page.canConfirmYearChange()).toBe(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog').textContent).toContain(
      'Publish reviewed rules',
    );
    expect(page.yearCode).toBe('FY_ONE');
    expect(page.profile.regime).toBe('new');
    page.closeYearChange();
    http.expectNone((r) => r.method === 'PUT');
  });
  it('saves an existing target year with its edit permission and reloads the correct regime and calculation', async () => {
    const { http, page } = await setup(true);
    page.targetYear = 'FY_TWO';
    const change = page.confirmYearChange();
    http
      .expectOne(base + '/employees/employee/income-tax/FY_TWO/change-year')
      .flush({ yearCode: 'FY_TWO', editToken: 'target-edit' });
    await Promise.resolve();
    await Promise.resolve();
    const target = {
      ...fields,
      regime: 'old',
      reason: 'Year two only',
      employmentScenario: 'job_change',
      previousEmployerGrossWages: 500000,
      previousEmployerExemptWages: 50000,
      previousEmployerTds: 25000,
      previousEmployerExemptionsVerified: true,
    };
    const response = {
      ...summary(target, 'calculated'),
      regimeSelection: { regime: 'old' },
      latest: { _id: 'year-two-calculation' },
    };
    http.expectOne(base + '/employees/employee/income-tax/FY_TWO').flush(response);
    await change;
    expect(page.regimeLabel()).toBe('Old Regime');
    expect(page.canSave()).toBe(true);
    expect(page.viewingCalculation()._id).toBe('year-two-calculation');
    const saving = page.save();
    const req = http.expectOne(base + '/employees/employee/income-tax/FY_TWO');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.editToken).toBe('target-edit');
    expect(req.request.body.regime).toBe('old');
    expect(req.request.body.previousEmployerTds).toBe(25000);
    req.flush({ ...target, version: 2 });
    await Promise.resolve();
    await Promise.resolve();
    const savedResponse = {
      ...response,
      profile: { ...target, version: 2 },
      calculationStatus: 'estimate_saved',
    };
    http.expectOne(base + '/employees/employee/income-tax/FY_TWO').flush(savedResponse);
    await saving;
    expect(page.editing()).toBe(false);
    expect(page.changingYear()).toBe(false);
    const reload = page.load();
    http.expectOne(base + '/employees/employee/income-tax/FY_TWO').flush(savedResponse);
    await reload;
    expect(page.yearCode).toBe('FY_TWO');
    expect(page.profile.previousEmployerTds).toBe(25000);
    expect(page.summary().calculationStatus).toBe('estimate_saved');
    expect(page.message()).not.toContain('Financial year opened');
  });
  it('leaves source state intact when loading the target fails after permission is issued', async () => {
    const { http, page } = await setup(true);
    page.targetYear = 'FY_TWO';
    const changing = page.confirmYearChange();
    http
      .expectOne(base + '/employees/employee/income-tax/FY_TWO/change-year')
      .flush({ yearCode: 'FY_TWO', changeYearToken: 'permission' });
    await Promise.resolve();
    await Promise.resolve();
    http
      .expectOne(base + '/employees/employee/income-tax/FY_TWO')
      .flush({ message: 'Target unavailable' }, { status: 500, statusText: 'Error' });
    await changing;
    expect(page.yearCode).toBe('FY_ONE');
    expect(page.changingYear()).toBe(false);
    expect(page.profile.reason).toBe(fields.reason);
    expect(page.error()).toContain('The server could not complete your request');
  });
  it('saves a new target with its year-change token and selects that persisted year after component reinitialization', async () => {
    const { http, page } = await setup(true);
    page.targetYear = 'FY_TWO';
    const changing = page.confirmYearChange();
    http
      .expectOne(base + '/employees/employee/income-tax/FY_TWO/change-year')
      .flush({ yearCode: 'FY_TWO', changeYearToken: 'new-year-permission' });
    await Promise.resolve();
    await Promise.resolve();
    http
      .expectOne(base + '/employees/employee/income-tax/FY_TWO')
      .flush({ ...summary(), regimeSelection: { regime: 'old' } });
    await changing;
    expect(page.profile.previousEmployerGrossWages).toBeNull();
    expect(page.viewingCalculation()).toBeNull();
    page.profile = { ...fields, version: 0, regime: 'old', employmentScenario: 'first_job' };
    const saving = page.save();
    const req = http.expectOne(base + '/employees/employee/income-tax/FY_TWO');
    expect(req.request.body.changeYearToken).toBe('new-year-permission');
    expect(req.request.body).not.toHaveProperty('editToken');
    const saved = { ...page.profile, version: 1 };
    req.flush(saved);
    await Promise.resolve();
    await Promise.resolve();
    http
      .expectOne(base + '/employees/employee/income-tax/FY_TWO')
      .flush({ ...summary(saved, 'not_calculated'), regimeSelection: { regime: 'old' } });
    await saving;
    expect(page.yearCode).toBe('FY_TWO');
    expect(page.editing()).toBe(false);
    const reload = page.ngOnInit();
    http.expectOne(base + '/settings/tax-configuration').flush({
      years: [
        { code: 'FY_ONE', name: 'First year', active: true },
        { code: 'FY_TWO', name: 'Second year' },
      ],
    });
    http
      .expectOne(base + '/employees/employee/income-tax')
      .flush([{ yearCode: 'FY_TWO' }, { yearCode: 'FY_ONE' }]);
    http.expectOne(base + '/salary-components').flush([]);
    await Promise.resolve();
    await Promise.resolve();
    http
      .expectOne(base + '/employees/employee/income-tax/FY_TWO')
      .flush({ ...summary(saved, 'not_calculated'), regimeSelection: { regime: 'old' } });
    await reload;
    expect(page.yearCode).toBe('FY_TWO');
    expect(page.regimeLabel()).toBe('Old Regime');
  });
  it('saves changed tax inputs before explicit calculation and disables it again when current', async () => {
    const { http, page } = await setup(true);
    page.summary.set(summary(fields, 'calculated'));
    expect(page.canCalculate()).toBe(false);
    const editing = page.edit();
    http.expectOne(url + '/edit').flush({ editToken: 'edit' });
    await editing;
    page.profile = {
      ...page.profile,
      employmentScenario: 'job_change',
      previousEmployerGrossWages: 500000,
      previousEmployerExemptWages: 50000,
      previousEmployerTds: 25000,
      previousEmployerExemptionsVerified: true,
    };
    expect(page.canCalculate()).toBe(true);
    const calculation = page.calculate();
    void page.calculate();
    const save = http.expectOne(url);
    expect(save.request.method).toBe('PUT');
    expect(save.request.body.previousEmployerExemptWages).toBe(50000);
    const saved = { ...page.profile, version: 2 };
    save.flush(saved);
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(url).flush(summary(saved, 'estimate_saved'));
    await vi.waitFor(() => expect(page.busy()).toBe(true));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    let calc: any;
    await vi.waitFor(() => {
      calc = http.expectOne(url + '/calculate');
    });
    expect(calc.request.method).toBe('POST');
    calc.flush({ status: 'calculated' });
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne(url).flush(summary(saved, 'calculated'));
    await calculation;
    expect(page.canCalculate()).toBe(false);
    expect(page.editing()).toBe(false);
  });
  it('shows history in a dialog and uses historical snapshot slabs instead of latest configuration', async () => {
    const { fixture, http, page } = await setup(true);
    const saved = {
      _id: 'historical',
      createdAt: '2026-09-01',
      snapshot: {
        yearCode: 'FY_ONE',
        regime: 'new',
        configurationVersion: 'older-revision',
        profileVersion: 1,
        status: 'calculated',
        inputs: { revision: { rules: { mappings: [] } } },
        result: {
          annualEstimatedTax: 123,
          remainingAnnualTds: 100,
          annualTds: 123,
          allocation: Array(12).fill(0),
          taxableComponents: [],
          slabs: [{ from: 0, to: null, rate: 17, tax: 123, taxableAmount: 1000 }],
        },
      },
    };
    page.summary.set({ ...summary(fields, 'calculated'), latest: saved });
    page.viewingCalculation.set(saved);
    page.configuration.set({ revisions: [{ id: 'latest', rules: { slabs: [{ rate: 99 }] } }] });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[aria-labelledby=annual-tax-breakdown] table'),
    ).toBeNull();
    const loading = page.loadHistory();
    http.expectOne(url + '/history').flush([saved]);
    await loading;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog').textContent).toContain(
      'Calculation History',
    );
    expect(fixture.nativeElement.querySelector('dialog').textContent).toContain('FY_ONE');
    fixture.nativeElement.querySelector('dialog button:not([aria-label])').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.viewingCalculation()._id).toBe('historical');
    expect(page.detailModal()).toBeNull();
    page.detailModal.set('slabs');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const modal = fixture.nativeElement.querySelector('dialog');
    expect(modal.textContent).toContain('older-revision');
    expect(modal.textContent).toContain('17');
    expect(modal.textContent).not.toContain('99');
    modal.querySelector('[aria-label="Close Tax Slabs"]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.detailModal()).toBeNull();
  });
});

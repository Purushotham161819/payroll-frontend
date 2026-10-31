import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TaxConfiguration } from './tax-configuration';
import { vi } from 'vitest';

const base = 'http://localhost:3000/settings/tax-configuration';
const sample = { name: 'Financial Year 2026-27', code: 'FY 2026-27', startDate: '2026-04-01', endDate: '2027-03-31', legislation: 'Income-tax Act, 2025', ruleVersion: 'ITACT2025_FA2026_V1.0' };
const emptyState = () => ({ version: 0, years: [], revisions: [], published: {}, audit: [] });
describe('Tax configuration Financial Year submission regression', () => {
  async function setup() {
    await TestBed.configureTestingModule({ imports: [TaxConfiguration], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(TaxConfiguration), http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(base).flush(emptyState()); http.expectOne('http://localhost:3000/salary-components').flush([]);
    await fixture.whenStable(); fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.busy()).toBe(false));
    return { fixture, http };
  }
  async function fill(fixture: any, values = sample) {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    for (const [name, value] of Object.entries({ name: values.name, code: values.code, start: values.startDate, end: values.endDate, legislation: values.legislation, ruleVersion: values.ruleVersion })) {
      const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement;
      input.value = value; input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await fixture.whenStable(); fixture.detectChanges(); return form;
  }
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('enables the Save button for the exact reported inputs and submits ISO dates', async () => {
    const { fixture, http } = await setup(); const form = await fill(fixture);
    expect((form.querySelector('button') as HTMLButtonElement).disabled).toBe(false);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const request = http.expectOne(base + '/years');
    expect(request.request.body.year).toEqual(sample);
    request.flush({ ...emptyState(), version: 1, years: [{ ...sample, active: false }] });
    await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Financial year saved.');
    expect(fixture.nativeElement.textContent).toContain('Financial Year 2026-27 (FY 2026-27)');
    expect((form.querySelector('[name=name]') as HTMLInputElement).value).toBe('');
  });
  it('blocks invalid keyboard/programmatic submit and explains the field error', async () => {
    const { fixture, http } = await setup();
    const form = await fill(fixture, { ...sample, name: '   ' });
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    http.expectNone(base + '/years');
    expect(fixture.nativeElement.textContent).toContain('Enter a financial year name.');
  });
  it.each(['name', 'code', 'startDate', 'endDate', 'legislation', 'ruleVersion'])('blocks missing %s without sending a request', async field => {
    const { fixture, http } = await setup(); const form = await fill(fixture, { ...sample, [field]: '' });
    expect((form.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); fixture.detectChanges();
    http.expectNone(base + '/years'); expect(fixture.nativeElement.querySelector('[role=alert]')).not.toBeNull();
  });
  it.each([
    { startDate: '2027-04-01', endDate: '2026-03-31' },
    { endDate: '2027-03-30' },
    { code: 'FY/2026-27' },
  ])('blocks invalid ranges or codes: %j', async fields => {
    const { fixture, http } = await setup(); const form = await fill(fixture, { ...sample, ...fields });
    expect((form.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); fixture.detectChanges(); http.expectNone(base + '/years');
  });
  it('prevents duplicate submission, shows server validation errors, and retains entered values for retry', async () => {
    const { fixture, http } = await setup(); const form = await fill(fixture);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); fixture.detectChanges();
    expect((form.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const requests = http.match(base + '/years'); expect(requests).toHaveLength(1);
    expect(requests[0].request.body.createOnly).toBe(true);
    requests[0].flush({ message: 'Financial years cannot overlap.' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Financial years cannot overlap.');
    expect((form.querySelector('[name=name]') as HTMLInputElement).value).toBe(sample.name);
    expect((form.querySelector('button') as HTMLButtonElement).disabled).toBe(false);
  });
  it('shows network failures and permits retry', async () => {
    const { fixture, http } = await setup(); const form = await fill(fixture);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    http.expectOne(base + '/years').error(new ProgressEvent('error'));
    await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cannot reach the server.');
    expect((form.querySelector('button') as HTMLButtonElement).disabled).toBe(false);
  });
  it('blocks a known duplicate code and shows a meaningful error', async () => {
    const { fixture, http } = await setup(); fixture.componentInstance.state.set({ ...emptyState(), version: 1, years: [{ ...sample, active: false }] });
    const form = await fill(fixture); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); fixture.detectChanges();
    http.expectNone(base + '/years'); expect(fixture.nativeElement.textContent).toContain('A financial year with this code already exists.');
  });
  it('blocks invalid revision submission with visible validation messages', async () => {
    const { fixture, http } = await setup();
    const form = fixture.nativeElement.querySelectorAll('form')[1] as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); fixture.detectChanges();
    http.expectNone(base + '/revisions');
    expect(fixture.nativeElement.textContent).toContain('Standard deduction is required.');
    expect(fixture.nativeElement.textContent).toContain('Employer contribution review confirmation is required.');
  });
  it('submits a copied revision once, retaining multiline sources and partial mapping bindings', async () => {
    const { fixture, http } = await setup(), page = fixture.componentInstance;
    page.state.set({ ...emptyState(), version: 1, years: [{ ...sample, active: false }] });
    const sources = ['https://www.incometax.gov.in/source-one', 'https://www.incometax.gov.in/source-two'];
    const rules = { standardDeduction: 0, rebateLimit: 0, maximumRebate: 0, cessPercentage: 0, minimumAge: 0, maximumAge: null,
      rebateMarginalRelief: false, surchargeMarginalRelief: false, incomeRounding: 'paise', liabilityRounding: 'paise',
      slabs: [{ from: 0, to: null, rate: 0 }], surcharge: [], legalReferences: sources,
      reviewNote: 'Reviewed fixture\nwith multiple lines', employerContributionsReviewed: true,
      mappings: [{ componentId: 'c', type: 'partial', taxablePercentage: 50, legalReference: 'Fixture', conditions: 'Verified' }] };
    page.editRevision({ yearCode: sample.code, regime: 'old', effectiveDate: sample.startDate, rules });
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const form = fixture.nativeElement.querySelectorAll('form')[1] as HTMLFormElement;
    const submit = Array.from(form.querySelectorAll('button')).find(b => b.textContent?.includes('Save new revision'))!;
    expect(submit.disabled).toBe(false);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const requests = http.match(base + '/revisions'); expect(requests).toHaveLength(1);
    expect(requests[0].request.body.rules.legalReferences).toEqual(sources);
    expect(requests[0].request.body.rules.mappings[0].taxablePercentage).toBe(50);
    expect(requests[0].request.body.rules.mappings[0]).not.toHaveProperty('exemptAmount');
    requests[0].flush({ ...emptyState(), version: 2, years: [{ ...sample, active: false }] });
    await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('New immutable revision saved.');
  });
  it.each(['year', 'revision'] as const)('submits %s activation once and surfaces backend failures', async kind => {
    const { fixture, http } = await setup(), page = fixture.componentInstance;
    page.confirmation = { kind, id: kind === 'year' ? sample.code : 'revision-id', active: true };
    const first = page.confirm(); const second = page.confirm();
    expect(page.error()).toBe('');
    const url = kind === 'year' ? base + '/years/' + encodeURIComponent(sample.code) + '/status' : base + '/revisions/revision-id/activate';
    const requests = http.match(() => true); expect(requests.map(r => r.request.url)).toEqual([url]);
    requests[0].flush({ message: 'Tax configuration changed. Reload and retry.' }, { status: 409, statusText: 'Conflict' });
    await Promise.all([first, second]); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tax configuration changed.');
    expect(page.busy()).toBe(false);
  });
});

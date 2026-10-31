import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { EmployeeTax } from './employee-tax';
import { TaxConfiguration } from './tax-configuration';
const base = 'http://localhost:3000';
const state = { version: 1, years: [{ code: 'FYTEST', name: 'Test year', startDate: '2026-04-01', endDate: '2027-03-31', active: true }], revisions: [], published: {}, audit: [] };
describe('Tax management forms', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('renders the configuration empty state without inventing statutory rates', async () => {
    await TestBed.configureTestingModule({ imports: [TaxConfiguration], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(TaxConfiguration), http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(base + '/settings/tax-configuration').flush({ ...state, years: [] });
    http.expectOne(base + '/salary-components').flush([]);
    await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No financial years configured');
    expect(fixture.componentInstance.standardDeduction).toBeNull();
    expect(fixture.componentInstance.cess).toBeNull();
  });
  it('shows employee eligibility, posts only profile facts, and displays backend errors', async () => {
    await TestBed.configureTestingModule({ imports: [EmployeeTax], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(EmployeeTax), http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('employeeId', 'employee'); fixture.detectChanges();
    http.expectOne(base + '/settings/tax-configuration').flush(state);
    http.expectOne(base + '/employees/employee/income-tax').flush([]);
    http.expectOne(base + '/salary-components').flush([]);
    await Promise.resolve(); await Promise.resolve();
    const url = base + '/employees/employee/income-tax/FYTEST';
    http.expectOne(url).flush({ regimeSelection: {regime:'new',message:'',availableRegimes:['new']}, profile: null, annualCtc: 1200000, payrollFrequency: 'Monthly', latest: null, calculationStatus: 'not_configured', calculationStatusLabel: 'TDS not configured' });
    await vi.waitFor(() => expect(fixture.componentInstance.busy()).toBe(false)); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No saved calculation');
    expect(fixture.nativeElement.textContent).toContain('TDS not configured');
    fixture.componentInstance.profile.reason = 'TDS not applicable following review';
    const saving = fixture.componentInstance.save();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).not.toHaveProperty('annualTds');
    expect(request.request.body).not.toHaveProperty('annualCtc');
    request.flush({ message: 'Tax profile changed. Reload and retry.' }, { status: 409, statusText: 'Conflict' });
    await saving; fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tax profile changed');
  });
});

describe('Authoritative employee TDS status', () => {
  it.each([
    ['not_calculated', 'Not calculated'],
    ['estimate_saved', 'Estimate saved — recalculate after input changes in Income Tax/TDS.'],
    ['calculated', 'Calculated'],
  ])('renders backend status %s without inferring it from latest existence', async (status, label) => {
    TestBed.configureTestingModule({ imports: [EmployeeTax], providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(EmployeeTax); fixture.componentRef.setInput('employeeId', 'employee');
    fixture.componentInstance.summary.set({ annualCtc: 1200000, payrollFrequency: 'Monthly', profile: {tdsApplicable: true}, latest: null, calculationStatus: status, calculationStatusLabel: label });
    fixture.componentInstance.years.set([{code:'FYTEST',name:'Test year'}]);
    expect(fixture.componentInstance.summary().calculationStatusLabel).toBe(label);
    // Avoid ngOnInit HTTP in this presentation test.
    fixture.componentInstance.ngOnInit = async () => {};
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain(label); fixture.destroy();
  });
});

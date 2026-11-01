import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { EmployeeList } from '../../employees/employee-list';
import { EmployeeService } from '../../employees/employee.service';
import { RunPayroll } from './run-payroll.component';
import { RunPayrollService, PayrollRun } from './run-payroll.service';

const fixtureRun = (): PayrollRun => ({
  period: `${new Date().getFullYear()}-01`,
  organizationName: 'Example Org',
  status: 'Draft',
  version: 1,
  calculatedAt: new Date().toISOString(),
  calculationVersion: 'v1',
  inputHash: 'trusted-hash',
  stale: false,
  checks: [
    {
      employeeId: 'a',
      firstName: 'Ada',
      lastName: 'Example',
      grossPay: 100,
      employerContributions: 10,
      deductions: 5,
      netPay: 95,
      paymentStatus: 'Not Paid',
    },
  ],
  totals: { employerContributions: 10, deductions: 5, netPay: 95 },
});
describe('Run Payroll workflow', () => {
  it('launches payroll without selection using active IDs independently of the directory filter', () => {
    TestBed.configureTestingModule({providers: [provideRouter([]), {provide: EmployeeService, useValue: {getAll: () => of([{_id: 'a',status:'Active'}, {_id:'b',status:'Terminated'}, {_id:'c'}])}}]});
    const list = TestBed.runInInjectionContext(() => new EmployeeList());
    list.load();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    list.changeFilter('Terminated');
    list.runPayroll();
    expect(navigate).toHaveBeenLastCalledWith(['/payroll/run'], {queryParams:{employees:'a,c',returnStatus:'Terminated'}});
  });
  it('shows no directory checkboxes and keeps Run Payroll active even with an empty list', () => {
    TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),{provide:EmployeeService,useValue:{getAll:()=>of([])}}]});
    const fixture = TestBed.createComponent(EmployeeList);
    fixture.detectChanges();
    const button = [...fixture.nativeElement.querySelectorAll('button')].find((b:any)=>b.textContent.trim()==='Run Payroll') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    fixture.componentInstance.allEmployees.set([{_id:'a',firstName:'Ada',lastName:'Example',status:'Active'},{_id:'b',status:'Terminated'}] as any);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('table input[type=checkbox]').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('thead th').length).toBe(11);
    expect(button.disabled).toBe(false);
    const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    button.click();
    expect(navigate).toHaveBeenCalledWith(['/payroll/run'],{queryParams:{employees:'a',returnStatus:'Active'}});
  });
  it('sends no client monetary values when saving or submitting and encodes protected PDF paths', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(RunPayrollService),
      http = TestBed.inject(HttpTestingController),
      run = fixtureRun();
    const save = service.save(run),
      request = http.expectOne((r) => r.url.endsWith('/runs/draft'));
    expect(request.request.body).toEqual({
      period: run.period,
      employeeIds: ['a'],
      version: 1,
      inputHash: 'trusted-hash',
    });
    request.flush(run);
    await save;
    const submit = service.submit(run, '2026-02-01', 'key');
    const finalized = http.expectOne((r) => r.url.endsWith('/submit'));
    expect(finalized.request.body).toEqual({
      version: 1,
      paymentDate: '2026-02-01',
      idempotencyKey: 'key',
    });
    finalized.flush({ ...run, status: 'Submitted' });
    await submit;
    const history = service.history('a/b');
    http.expectOne((r) => r.url.endsWith('/employees/a%2Fb/checks')).flush([]);
    await history;
    http.verify();
  });
  it('requires selection recalculation and saved reviewed values before submission; blocks double clicks', async () => {
    let resolve!: (run: PayrollRun) => void;
    const submit = vi.fn(() => new Promise<PayrollRun>((r) => (resolve = r)));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: EmployeeService, useValue: {} },
        { provide: RunPayrollService, useValue: { submit } },
      ],
    });
    const page = TestBed.runInInjectionContext(() => new RunPayroll());
    const run = fixtureRun();
    page.run.set(run);
    page.selected.set(new Set(['a']));
    page.period = run.period;
    page.paymentDate = '2026-02-01';
    page.toggle('b', true);
    page.submit();
    expect(submit).not.toHaveBeenCalled();
    page.selected.set(new Set(['a']));
    page.dirty.set(false);
    page.selectionPending.set(false);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.submit();
    page.submit();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(page.busy()).toBe(true);
    resolve({ ...run, status: 'Submitted' });
    await new Promise((r) => setTimeout(r, 0));
    expect(page.run()?.status).toBe('Submitted');
    expect(page.busy()).toBe(false);
  });
  it('preserves displayed saved values after a conflict and reports the server validation', async () => {
    const run = fixtureRun();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: EmployeeService, useValue: {} },
        {
          provide: RunPayrollService,
          useValue: {
            save: () =>
              Promise.reject(
                new HttpErrorResponse({
                  status: 409,
                  error: { message: 'Payroll inputs changed. Recalculate.' },
                }),
              ),
          },
        },
      ],
    });
    const page = TestBed.runInInjectionContext(() => new RunPayroll());
    page.run.set(run);
    page.save();
    await new Promise((r) => setTimeout(r, 0));
    expect(page.run()).toEqual(run);
    expect(page.error()).toContain('Recalculate');
  });
});

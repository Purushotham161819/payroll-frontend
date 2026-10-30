import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { RunPayroll } from './run-payroll.component';
import { RunPayrollService } from './run-payroll.service';
import { EmployeeService } from '../../employees/employee.service';

describe('Payroll checkbox selection', () => {
  afterEach(() => vi.useRealTimers());
  it('automatically refreshes backend totals, retains unchecked rows, and preserves an empty saved draft', async () => {
    vi.useFakeTimers();
    const a = {
      employeeId: 'a',
      firstName: 'Ada',
      lastName: 'Example',
      employerContributions: 10,
      deductions: 5,
      netPay: 95,
      paymentStatus: 'Not Paid',
    };
    const b = { ...a, employeeId: 'b', firstName: 'Grace' };
    const run = {
      period: `${new Date().getFullYear()}-01`,
      status: 'Draft',
      checks: [a, b],
      version: 1,
      inputHash: 'hash',
      totals: { employerContributions: 20, deductions: 10, netPay: 190 },
    } as any;
    const preview = vi.fn(async (period: string, ids: string[]) => ({
      ...run,
      period,
      checks: [a, b].filter((c) => ids.includes(c.employeeId)),
      totals: {
        employerContributions: ids.length * 10,
        deductions: ids.length * 5,
        netPay: ids.length * 95,
      },
    }));
    const save = vi.fn(async (value: any) => ({ ...value, version: 2 }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: EmployeeService, useValue: {} },
        { provide: RunPayrollService, useValue: { preview, save } },
      ],
    });
    const page = TestBed.runInInjectionContext(() => new RunPayroll());
    page.run.set(run);
    page.period = run.period;
    page.selected.set(new Set(['a', 'b']));
    page.eligible.set([
      { _id: 'a', firstName: 'Ada', lastName: 'Example', hireDate: '2020-01-01', status: 'Active' },
      {
        _id: 'b',
        firstName: 'Grace',
        lastName: 'Example',
        hireDate: '2020-01-01',
        status: 'Active',
      },
    ] as any);
    page.candidates.set(
      new Map([
        ['a', a],
        ['b', b],
      ]) as any,
    );
    page.toggle('b', false);
    await vi.advanceTimersByTimeAsync(200);
    expect(preview).toHaveBeenCalledWith(run.period, ['a'], true);
    expect(page.run()?.totals.netPay).toBe(95);
    expect(page.unifiedRows()).toHaveLength(2);
    expect(page.selected().has('b')).toBe(false);
    page.toggleAll(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(page.run()?.checks).toHaveLength(0);
    expect(page.run()?.totals.netPay).toBe(0);
    page.save();
    await vi.advanceTimersByTimeAsync(0);
    expect(save.mock.calls[0][0].checks).toHaveLength(0);
    expect(page.dirty()).toBe(false);
  });
  it('prevents finalized employee selection and excludes historical amounts from the current draft', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: EmployeeService, useValue: {} },
        { provide: RunPayrollService, useValue: {} },
      ],
    });
    const page = TestBed.runInInjectionContext(() => new RunPayroll());
    page.run.set({
      checks: [],
      processedEmployeeIds: ['finalized'],
      historicalChecks: [{ employeeId: 'finalized', netPay: 999 }],
      totals: { employerContributions: 0, deductions: 0, netPay: 0 },
    } as any);
    page.toggle('finalized', true);
    expect(page.selected().size).toBe(0);
    expect(page.run()?.totals.netPay).toBe(0);
  });
  it('carries originally requested historical employees into another month without selecting unrelated history', async () => {
    const a = { employeeId: 'a', firstName: 'Ada', lastName: 'Example', netPay: 95 };
    let current = '';
    const preview = vi.fn(async (period: string) => ({
      period,
      status: 'Draft',
      version: 2,
      inputHash: 'hash',
      checks: period === current ? [] : [a],
      processedEmployeeIds: period === current ? ['a', 'unrelated'] : [],
      historicalChecks: period === current ? [a, { ...a, employeeId: 'unrelated' }] : [],
      totals: { employerContributions: 0, deductions: 0, netPay: period === current ? 0 : 95 },
    }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              queryParamMap: convertToParamMap({ employees: 'a' }),
            },
          },
        },
        { provide: EmployeeService, useValue: { getAll: () => of([]) } },
        { provide: RunPayrollService, useValue: { preview } },
      ],
    });
    const page = TestBed.runInInjectionContext(() => new RunPayroll());
    current = page.period;
    await page.ngOnInit();
    expect(page.selected().size).toBe(0);
    const next = page.months.find((m) => m.value !== current)!.value;
    page.period = next;
    page.changePeriod();
    await new Promise((r) => setTimeout(r, 0));
    expect(preview).toHaveBeenLastCalledWith(next, ['a'], false);
    expect([...page.selected()]).toEqual(['a']);
  });
});

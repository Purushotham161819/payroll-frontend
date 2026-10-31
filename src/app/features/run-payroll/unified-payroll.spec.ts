import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { RunPayroll } from './run-payroll.component';
import { RunPayrollService } from './run-payroll.service';
import { EmployeeService } from '../../employees/employee.service';
const year = new Date().getFullYear();
const period = `${year}-01`;
const paymentDate = `${year}-02-05`;
const employees = [
  {
    _id: 'a',
    firstName: 'Ada',
    lastName: 'Example',
    annualCtc: 100000.01,
    status: 'Active',
    hireDate: '2020-01-01',
  },
  {
    _id: 'b',
    firstName: 'Grace',
    lastName: 'Example',
    annualCtc: 200000.02,
    status: 'Active',
    hireDate: '2020-01-01',
  },
  {
    _id: 'inactive',
    firstName: 'Inactive',
    lastName: 'Example',
    annualCtc: 100,
    status: 'Terminated',
    hireDate: '2020-01-01',
  },
  {
    _id: 'boundary',
    firstName: 'Next Month',
    lastName: 'Example',
    annualCtc: 100,
    status: 'Active',
    hireDate: `${year}-02-01`,
  },
  {
    _id: 'future',
    firstName: 'Future',
    lastName: 'Example',
    annualCtc: 100,
    status: 'Active',
    hireDate: '2099-01-01',
  },
];
const a = {
  employeeId: 'a',
  firstName: 'Ada',
  lastName: 'Example',
  annualCtc: 100000.01,
  monthlyCtc: 8333.33,
  grossPay: 100,
  employerContributions: 10,
  deductions: 5,
  netPay: 95,
  paymentStatus: 'Not Paid',
};
const history = [
  {
    ...a,
    employeeId: 'pending',
    firstName: 'Pending',
    annualCtc: 120000,
    monthlyCtc: 10000,
    paymentStatus: 'Payment Pending',
    payrollStatus: 'Submitted',
    paymentDate: `${year}-12-28`,
    pdfUrl: '/protected',
  },
  {
    ...a,
    employeeId: 'paid',
    firstName: 'Paid',
    annualCtc: 240000,
    monthlyCtc: 20000,
    paymentStatus: 'Paid',
    payrollStatus: 'Submitted',
    pdfUrl: '/protected',
  },
];
const run = () => ({
  period,
  organizationName: 'Example',
  version: 1,
  status: 'Draft',
  inputHash: 'hash',
  calculatedAt: new Date().toISOString(),
  calculationVersion: 'v1',
  checks: [a],
  historicalChecks: structuredClone(history),
  processedEmployeeIds: ['pending', 'paid'],
  draftSaved: true,
  paymentDate,
  totalPayrollCost: 8333.33,
  employeeCompensation: [{employeeId: 'a', payFrequency: 'Monthly', monthlyCtc: 8333.33}, {employeeId: 'b', payFrequency: 'Monthly', monthlyCtc: 16666.67}],
  totals: { employerContributions: 10, deductions: 5, netPay: 95 },
});
function setup(service: any) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({}),
            queryParamMap: convertToParamMap({ employees: 'a', returnStatus: 'All' }),
          },
        },
      },
      { provide: EmployeeService, useValue: { getAll: () => of(employees) } },
      { provide: RunPayrollService, useValue: service },
    ],
  });
  const fixture = TestBed.createComponent(RunPayroll);
  fixture.componentInstance.period = period;
  fixture.detectChanges();
  return fixture;
}
async function ready(fixture: any) {
  await fixture.whenStable();
  for (let i = 0; i < 8; i++) await Promise.resolve();
  fixture.detectChanges();
}
describe('Unified payroll table, draft Payment Date and KPI scope', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    URL.createObjectURL = vi.fn(() => 'blob:historical-pdf');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.useRealTimers());
  it('renders one table with ten columns, all eligible/historical employees and no separate selection sections', async () => {
    const fixture = setup({ preview: async () => run() });
    await ready(fixture);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('table')).toHaveLength(1);
    expect(element.querySelector('details')).toBeNull();
    expect(element.textContent).not.toContain('Previously submitted payroll');
    expect(element.textContent).not.toContain('Edit employee selection');
    expect([...element.querySelectorAll('thead th')].map((e) => e.textContent?.trim())).toEqual([
      '',
      'First Name',
      'Last Name',
      'Monthly CTC',
      'Employer Contributions',
      'TDS',
      'Deductions',
      'NET Pay',
      'Payment Status',
      'Pay Check',
    ]);
    expect(element.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(element.textContent).not.toContain('Inactive Example');
    expect(element.textContent).not.toContain('Future Example');
    expect(
      element.querySelector<HTMLInputElement>('[aria-label="Pending Example already submitted"]')!
        .disabled,
    ).toBe(true);
    expect(
      element.querySelector<HTMLInputElement>('[aria-label="Paid Example already submitted"]')!
        .disabled,
    ).toBe(true);
    expect(element.querySelector('[aria-label="Total Payroll Cost"]')!.textContent).toContain(
      '8,333.33',
    );
    expect(element.querySelector('[aria-label="Total NET Pay"]')!.textContent).toContain('95.00');
    expect(element.querySelector<HTMLInputElement>('#payment-date')!.value).toBe(paymentDate);
    expect(
      element.querySelector('[aria-label="Back to Employees"]')!.getAttribute('href'),
    ).toContain('status=All');
    const pending = fixture.componentInstance
      .unifiedRows()
      .find((c) => c.employeeId === 'pending')!;
    expect(fixture.componentInstance.rowStatus(pending)).toBe('Submitted');
    expect(pending.paymentStatus).toBe('Payment Pending');
    expect(
      fixture.componentInstance.rowStatus(
        fixture.componentInstance.unifiedRows().find((c) => c.employeeId === 'paid')!,
      ),
    ).toBe('Paid');
  });
  it('Select All includes only eligible, unprocessed employees and renders server totals without annual/monthly conversion', async () => {
    vi.useFakeTimers();
    const preview = vi.fn(async (_period: string, ids: string[]) => ({
      ...run(),
      checks: ids.map((id) => ({ ...a, employeeId: id, firstName: id === 'a' ? 'Ada' : 'Grace' })),
      totalPayrollCost: ids.length === 2 ? 25000 : 8333.33,
      totals: {
        employerContributions: ids.length * 10,
        deductions: ids.length * 5,
        netPay: ids.length * 95,
      },
    }));
    const fixture = setup({ preview });
    await ready(fixture);
    fixture.componentInstance.toggleAll(true);
    await vi.advanceTimersByTimeAsync(200);
    fixture.detectChanges();
    expect(preview).toHaveBeenLastCalledWith(period, ['a', 'b'], true);
    expect(fixture.componentInstance.run()?.totalPayrollCost).toBe(25000);
    expect(fixture.componentInstance.run()?.totals.netPay).toBe(190);
    fixture.componentInstance.toggle('paid', true);
    expect([...fixture.componentInstance.selected()]).toEqual(['a', 'b']);
    expect(fixture.nativeElement.querySelectorAll('table')).toHaveLength(1);
    expect(fixture.componentInstance.run()?.historicalChecks).toEqual(history);
  });
  it('saves the header date, preserves an unsaved date during checkbox recalculation and restores another period independently', async () => {
    const nextDate = `${year}-03-10`;
    const nextPeriod = `${year}-02`;
    const preview = vi.fn(async (value: string) => ({
      ...run(),
      period: value,
      paymentDate: value === nextPeriod ? nextDate : paymentDate,
      totalPayrollCost: value === nextPeriod ? 16666.67 : 8333.33,
    }));
    const save = vi.fn(async (value: any) => ({ ...value, draftSaved: true, version: 2 }));
    const fixture = setup({ preview, save });
    await ready(fixture);
    const page = fixture.componentInstance;
    page.paymentDate = `${year}-02-15`;
    page.paymentDateChanged();
    page.recalculate();
    await new Promise((r) => setTimeout(r, 0));
    expect(page.paymentDate).toBe(`${year}-02-15`);
    page.save();
    await new Promise((r) => setTimeout(r, 0));
    expect(save.mock.calls[0][0].paymentDate).toBe(`${year}-02-15`);
    expect(page.dirty()).toBe(false);
    page.period = nextPeriod;
    page.changePeriod();
    await new Promise((r) => setTimeout(r, 0));
    expect(page.paymentDate).toBe(nextDate);
    expect(page.run()?.totalPayrollCost).toBe(16666.67);
  });
  it('keeps all finalized rows in the table with zero draft KPIs and disables submission', async () => {
    const fixture = setup({
      preview: async () => ({
        ...run(),
        checks: [],
        inputHash: '',
        totalPayrollCost: 0,
        totals: { employerContributions: 0, deductions: 0, netPay: 0 },
      }),
    });
    await ready(fixture);
    fixture.componentInstance.eligible.set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('table')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain(
      'All employees shown have already been submitted',
    );
    const submit = [...fixture.nativeElement.querySelectorAll('button')].find(
      (b: any) => b.textContent.trim() === 'Submit',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(fixture.componentInstance.run()?.totalPayrollCost).toBe(0);
    expect(fixture.componentInstance.run()?.totals.netPay).toBe(0);
    fixture.componentInstance.candidates.set(
      new Map([['ineligible', { ...a, employeeId: 'ineligible' }]]),
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.allFinalized()).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain(
      'All employees shown have already been submitted',
    );
  });
  it('opens and releases the authenticated stored PDF from a unified historical row', async () => {
    const pdf = vi.fn(async () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    const fixture = setup({ preview: async () => run(), pdf });
    await ready(fixture);
    fixture.componentInstance.viewPayCheck('pending');
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
    expect(pdf).toHaveBeenCalledWith(period, 'pending');
    expect(fixture.nativeElement.querySelector('iframe').getAttribute('src')).toBe(
      'blob:historical-pdf',
    );
    fixture.componentInstance.closePdf();
    fixture.detectChanges();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:historical-pdf');
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
  });
});

describe('Per-employee payroll review display', () => {
  it('retains blocked selections, identifies the reason and blocks save while showing valid subtotals', async () => {
    const save = vi.fn(async () => run());
    const preview = { ...run(), validationIssues: [{ employeeId: 'b', firstName: 'Grace', lastName: 'Example', stage: 'income_tax', message: 'Mid-year reconciliation requires review.' }] };
    let calls = 0;
    const fixture = setup({ preview: async () => ++calls === 1 ? preview : run(), save }); await ready(fixture);
    const page = fixture.componentInstance;
    expect(page.selected().has('b')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Needs Review');
    expect(fixture.nativeElement.textContent).toContain('Totals cover 1 calculated employees');
    expect(fixture.nativeElement.querySelector('[aria-label="Total NET Pay"]').textContent).toContain('95.00');
    page.save(); expect(save).not.toHaveBeenCalled();
    page.toggle('b', false); await new Promise(r => setTimeout(r, 220)); await ready(fixture);
    expect(page.hasReviewIssues()).toBe(false); expect([...page.selected()]).toEqual(['a']);
    page.save(); await ready(fixture); expect(save).toHaveBeenCalledOnce();
    fixture.destroy();
  });
  it('displays unavailable KPIs when every selected employee requires review', async () => {
    const fixture = setup({ preview: async () => ({ ...run(), checks: [], totalPayrollCost: 0, totals: { employerContributions: 0, deductions: 0, netPay: 0 }, validationIssues: [{ employeeId: 'a', firstName: 'Ada', lastName: 'Example', stage: 'income_tax', message: 'Configuration requires review.' }] }) });
    await ready(fixture);
    expect(fixture.nativeElement.querySelector('[aria-label="Total NET Pay"]').textContent).toContain('Unavailable');
    expect(fixture.nativeElement.querySelector('[aria-label="Total NET Pay"]').textContent).not.toContain('0.00');
    expect(fixture.componentInstance.selected().has('a')).toBe(true); fixture.destroy();
  });
  it('does not show zero payroll after an unstructured API failure', async () => {
    const fixture = setup({ preview: async () => { throw new Error('Connection failed'); } }); await ready(fixture);
    expect(fixture.componentInstance.run()).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Total NET Pay"]').textContent).toContain('Unavailable'); fixture.destroy();
  });
});

describe('Separate optional TDS amounts', () => {
  it('renders TDS separately, keeps other deductions unchanged and includes TDS once in KPI totals', async () => {
    const check = { ...a, tds: 2000, existingDeductions: 5, deductions: 2005, netPay: 95, tdsCalculationStatus: 'calculated', tdsCalculationStatusLabel: 'Calculated' };
    const fixture = setup({ preview: async () => ({...run(), checks: [check], totals: {employerContributions: 10, deductions: 2005, netPay: 95}}) }); await ready(fixture);
    const page = fixture.componentInstance; expect(page.tdsTotal()).toBe(2000); expect(page.otherDeductionsTotal()).toBe(5);
    const row = fixture.nativeElement.querySelector('tbody tr'); const cells = row.querySelectorAll('td');
    expect(cells[5].textContent).toContain('2,000.00'); expect(cells[6].textContent).toContain('5.00');
    expect(fixture.nativeElement.querySelector('[aria-label="Total Employee Deductions"]').textContent).toContain('2,005.00'); fixture.destroy();
  });
  it('shows INR zero for an employee with no TDS field and keeps historical other deductions separate', async () => {
    const fixture = setup({ preview: async () => run() }); await ready(fixture);
    expect(fixture.nativeElement.querySelector('tbody tr').querySelectorAll('td')[5].textContent).toContain('0.00');
    expect(fixture.componentInstance.otherDeductions({...a, tds: 2, deductions: 7})).toBe(5); fixture.destroy();
  });
});

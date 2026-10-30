import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ProfileTabs } from './profile-tabs';
import { EmployeeProfile } from './employee-profile';
import { EmployeeService } from './employee.service';
import { PayChecks } from './pay-checks';
import { RunPayrollService } from '../features/run-payroll/run-payroll.service';

describe('Employee profile presentation and historical PDF viewer', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
    URL.createObjectURL = vi.fn(() => 'blob:stored-paycheck');
    URL.revokeObjectURL = vi.fn();
  });
  it('exposes a spaced tab ribbon with active state, roving focus and keyboard navigation', () => {
    const fixture = TestBed.createComponent(ProfileTabs);
    fixture.detectChanges();
    const tabs = [...fixture.nativeElement.querySelectorAll('[role=tab]')] as HTMLButtonElement[];
    expect(tabs.map((t) => t.textContent?.trim())).toEqual([
      'Employee Details',
      'Employment History',
      'Pay Checks',
    ]);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].tabIndex).toBe(-1);
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('history');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[1]);
    tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('checks');
  });
  it('groups only supported fields in independent cards and keeps full employment history in its own tab', async () => {
    const employee = {
      _id: 'a',
      firstName: 'Ada',
      lastName: 'Example',
      employeeId: 'EMP001',
      email: 'ada@example.test',
      dateOfBirth: '1990-01-01',
      hireDate: '2020-01-01',
      rehireDate: '2022-02-01',
      annualCtc: 120000,
      status: 'Active',
      payFrequency: 'Monthly',
      employmentHistory: [
        {
          startDate: '2020-01-01',
          endDate: '2021-12-31',
          terminationReason: 'Retirement',
          explanation: 'Original period',
          terminatedAt: '2021-12-31T10:00:00Z',
        },
        { startDate: '2022-02-01', recordedAt: '2022-02-01T10:00:00Z' },
      ],
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'a' }),
              queryParamMap: convertToParamMap({ returnStatus: 'All' }),
            },
          },
        },
        { provide: EmployeeService, useValue: { getAll: () => of([employee]) } },
      ],
    });
    const fixture = TestBed.createComponent(EmployeeProfile);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('app-profile-card').length).toBe(4);
    for (const value of ['EMP001', 'ada@example.test', 'Annual CTC', 'Pay Frequency'])
      expect(element.textContent).toContain(value);
    expect(element.textContent).not.toContain('Department');
    expect(element.querySelector('app-employment-history')).toBeNull();
    const back = element.querySelector<HTMLAnchorElement>('[aria-label="Back to Employees"]')!;
    expect(back.getAttribute('href')).toContain('status=All');
    expect(back.title).toBe('Back to Employees');
    expect(back.textContent?.trim()).toBe('');
    (element.querySelectorAll('[role=tab]')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelectorAll('app-employment-history li').length).toBe(2);
    expect(element.textContent).toContain('Retirement');
    expect(element.textContent).toContain('Original period');
    expect(element.textContent).toContain('Termination recorded');
    expect(element.querySelectorAll('app-profile-card').length).toBe(0);
  });
  it('fetches the selected employee PDF and releases its viewer URL when closed', async () => {
    const check = {
      employeeId: 'a',
      period: '2025-01',
      firstName: 'Ada',
      lastName: 'Example',
      paymentDate: '2025-02-05',
      netPay: 95,
    } as any;
    const service = {
      history: vi.fn().mockResolvedValue([check]),
      pdf: vi.fn().mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' })),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: RunPayrollService, useValue: service }],
    });
    const fixture = TestBed.createComponent(PayChecks);
    fixture.componentRef.setInput('employeeId', 'a');
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.componentInstance.view(check);
    fixture.detectChanges();
    expect(service.pdf).toHaveBeenCalledWith('2025-01', 'a');
    expect(fixture.nativeElement.querySelector('iframe').getAttribute('src')).toBe(
      'blob:stored-paycheck',
    );
    fixture.componentInstance.closeViewer();
    fixture.detectChanges();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:stored-paycheck');
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
  });
  it('shows a useful unavailable-PDF error and never opens a placeholder', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: RunPayrollService,
          useValue: {
            history: () => Promise.resolve([]),
            pdf: () => Promise.reject(new HttpErrorResponse({ status: 404 })),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(PayChecks);
    fixture.componentRef.setInput('employeeId', 'a');
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.componentInstance.view({ period: '2025-01' } as any);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'unavailable',
    );
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it('discards a late PDF response if the employee has changed', async () => {
    let resolve!: (blob: Blob) => void;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: RunPayrollService,
          useValue: {
            history: () => Promise.resolve([]),
            pdf: () => new Promise<Blob>((r) => (resolve = r)),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(PayChecks);
    fixture.componentRef.setInput('employeeId', 'a');
    fixture.detectChanges();
    await fixture.whenStable();
    const opening = fixture.componentInstance.view({ period: '2025-01' } as any);
    fixture.componentRef.setInput('employeeId', 'b');
    fixture.detectChanges();
    resolve(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    await opening;
    fixture.detectChanges();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
  });
});

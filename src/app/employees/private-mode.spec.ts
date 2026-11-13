import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Auth } from '../auth/auth';
import { NotificationService } from '../shared/notification.service';
import { PrivateMode } from './private-mode';
import { PrivateModeControl } from './private-mode-control';
import { EmployeeProfile } from './employee-profile';
import { EmployeeService } from './employee.service';
import { PayChecks } from './pay-checks';
import { RunPayrollService } from '../features/run-payroll/run-payroll.service';
const base = 'http://localhost:3000/employee-portal/private-mode';
const person = {
  _id: '012345678901234567890abc',
  firstName: 'Ada',
  lastName: 'Privacy',
  email: 'private@example.test',
  annualCtc: 987654,
  hireDate: '2020-01-01',
  dateOfBirth: '1990-01-01',
};
const check = {
  period: '2026-10',
  grossPay: 87654,
  employerContributions: 1234,
  deductions: 3456,
  netPay: 84198,
  paymentStatus: 'Payment Pending',
};
describe('Employee Private Mode', () => {
  it('re-locks before revalidating on return to the window and accepts only current server authorization', async () => {
    initialize(); await unlock(); expect(privacy.locked()).toBe(false);
    window.dispatchEvent(new Event('focus')); expect(privacy.locked()).toBe(true);
    http.expectOne(base).flush({ privateMode: true, unlockedUntil: null, serverNow: Date.now() });
    await Promise.resolve(); expect(privacy.locked()).toBe(true);
  });
  let http: HttpTestingController, privacy: PrivateMode;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    HTMLDialogElement.prototype.showModal = () => {};
    HTMLDialogElement.prototype.close = () => {};
  });
  afterEach(() => {
    http?.verify();
    vi.useRealTimers();
  });
  function initialize(role: 'employee' | 'admin' | 'user' = 'employee') {
    TestBed.inject(Auth).user.set({ id: 'account', email: person.email, role });
    http = TestBed.inject(HttpTestingController);
    privacy = TestBed.inject(PrivateMode);
  }
  async function unlock(until = Date.now() + 900000) {
    const result = privacy.verify('123456');
    http.expectOne(base + '/verify').flush({ privateMode: false, unlockedUntil: until });
    await result;
  }
  it('defaults ON and renders the shared switch/lock without exposing a full email', async () => {
    initialize();
    const fixture = TestBed.createComponent(PrivateModeControl);
    fixture.detectChanges();
    http.expectOne(base).flush({ privateMode: true, unlockedUntil: null });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(privacy.locked()).toBe(true);
    expect(fixture.nativeElement.querySelector('[role=switch]').checked).toBe(true);
    expect(fixture.nativeElement.querySelector('ps-icon')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain(person.email);
    fixture.destroy();
  });
  it('keeps values locked while sending an OTP, shows masked email and only unlocks after verification', async () => {
    initialize();
    const fixture = TestBed.createComponent(PrivateModeControl);
    fixture.detectChanges();
    http.expectOne(base).flush({ privateMode: true });
    fixture.nativeElement.querySelector('[role=switch]').click();
    fixture.detectChanges();
    expect(privacy.locked()).toBe(true);
    expect(fixture.nativeElement.querySelector('dialog')?.textContent).toContain(
      'Verify Your Identity',
    );
    http
      .expectOne(base + '/request')
      .flush({
        maskedEmail: 'p******e@example.test',
        expiresAt: Date.now() + 300000,
        resendAt: Date.now() + 60000,
      });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.componentInstance.busy()).toBe(false);
    });
    expect(fixture.nativeElement.textContent).toContain('p******e@example.test');
    expect(fixture.nativeElement.textContent).not.toContain(person.email);
    fixture.componentInstance.code = '123456';
    const result = fixture.componentInstance.verify();
    expect(privacy.locked()).toBe(true);
    http
      .expectOne(base + '/verify')
      .flush({ privateMode: false, unlockedUntil: Date.now() + 900000 });
    await result;
    expect(privacy.locked()).toBe(false);
    expect(TestBed.inject(NotificationService).current()?.kind).toBe('success');
    fixture.destroy();
  });
  it('reports invalid codes through the centralized modal and resends without revealing values', async () => {
    initialize();
    const fixture = TestBed.createComponent(PrivateModeControl);
    fixture.detectChanges();
    http.expectOne(base).flush({ privateMode: true });
    const first = fixture.componentInstance.send();
    http
      .expectOne(base + '/request')
      .flush({ maskedEmail: 'p******e@example.test', expiresAt: Date.now() + 300000, resendAt: 0 });
    await first;
    fixture.componentInstance.code = '000000';
    const failed = fixture.componentInstance.verify();
    http
      .expectOne(base + '/verify')
      .flush(
        { message: 'The verification code is invalid or expired.' },
        { status: 400, statusText: 'Bad Request' },
      );
    await failed;
    expect(privacy.locked()).toBe(true);
    expect(TestBed.inject(NotificationService).current()?.kind).toBe('error');
    expect(fixture.componentInstance.code).toBe('');
    const resend = fixture.componentInstance.send();
    http
      .expectOne(base + '/request')
      .flush({
        maskedEmail: 'p******e@example.test',
        expiresAt: Date.now() + 300000,
        resendAt: Date.now() + 60000,
      });
    await resend;
    expect(privacy.locked()).toBe(true);
    expect(fixture.componentInstance.resendWait()).toBeGreaterThan(0);
    fixture.destroy();
  });
  it('automatically re-locks and makes manual locking immediate before the server responds', async () => {
    initialize();
    vi.useFakeTimers();
    await unlock(Date.now() + 2000);
    expect(privacy.locked()).toBe(false);
    await vi.advanceTimersByTimeAsync(2100);
    expect(privacy.locked()).toBe(true);
    await unlock();
    const locked = privacy.lock();
    expect(privacy.locked()).toBe(true);
    http.expectOne(base + '/lock').flush({ privateMode: true });
    await locked;
  });
  it('refresh trusts only the current server session and a new login resets local authorization', async () => {
    initialize();
    await unlock();
    const reload = privacy.refresh();
    http.expectOne(base).flush({ privateMode: true, unlockedUntil: null });
    await reload;
    expect(privacy.locked()).toBe(true);
    await unlock();
    const login = TestBed.inject(Auth).login(person.email, 'valid-password');
    expect(privacy.locked()).toBe(true);
    http
      .expectOne('http://localhost:3000/auth/login')
      .flush({ id: 'account', email: person.email, role: 'employee' });
    await login;
    expect(privacy.locked()).toBe(true);
  });
  it('places Private Mode at the top right of Employee Details, masks CTC, and refreshes values after unlock', async () => {
    TestBed.overrideProvider(EmployeeService, {
      useValue: {
        myProfile: () =>
          of({
            ...person,
            annualCtc: TestBed.inject(PrivateMode).locked() ? null : person.annualCtc,
          }),
      },
    });
    initialize();
    const fixture = TestBed.createComponent(EmployeeProfile);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector('.private-mode-placement app-private-mode-control'),
      ).not.toBeNull();
    });
    http.expectOne(base).flush({ privateMode: true });
    expect(fixture.nativeElement.textContent).toContain('***');
    expect(fixture.nativeElement.textContent).not.toContain('9,87,654');
    await unlock();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('9,87,654');
    });
    const result = privacy.lock();
    http.expectOne(base + '/lock').flush({ privateMode: true });
    await result;
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('9,87,654');
    });
    fixture.destroy();
  });
  it('masks all four paycheck amounts, disables PDFs/TDS and keeps period/status visible, then clears on relock', async () => {
    const service = { history: vi.fn(async () => [check]), pdf: vi.fn(), download: vi.fn() };
    TestBed.overrideProvider(RunPayrollService, { useValue: service });
    initialize();
    const fixture = TestBed.createComponent(PayChecks);
    fixture.componentRef.setInput('employeeId', person._id);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('tbody td.num')).toHaveLength(4);
    });
    expect(
      [...fixture.nativeElement.querySelectorAll('tbody td.num')].map((td: HTMLElement) =>
        td.textContent?.trim(),
      ),
    ).toEqual(['***', '***', '***', '***']);
    expect(fixture.nativeElement.textContent).toContain('Oct 2026');
    expect(fixture.nativeElement.textContent).toContain('Payment Pending');
    expect(fixture.nativeElement.querySelector('[aria-label="View Pay Check"]').disabled).toBe(
      true,
    );
    await fixture.componentInstance.view(check as any);
    await fixture.componentInstance.download(check as any);
    expect(service.pdf).not.toHaveBeenCalled();
    expect(service.download).not.toHaveBeenCalled();
    await unlock();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('87,654');
    });
    privacy.reset();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('87,654');
    });
    fixture.destroy();
  });
  for (const role of ['admin', 'user'] as const)
    it(`does not mask existing ${role} paycheck views or request OTP state`, async () => {
      TestBed.overrideProvider(RunPayrollService, {
        useValue: { history: vi.fn(async () => [check]), pdf: vi.fn(), download: vi.fn() },
      });
      initialize(role);
      const fixture = TestBed.createComponent(PayChecks);
      fixture.componentRef.setInput('employeeId', person._id);
      fixture.detectChanges();
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('87,654');
      });
      expect(fixture.nativeElement.querySelector('[aria-label="View Pay Check"]').disabled).toBe(
        false,
      );
      http.expectNone(base);
      fixture.destroy();
    });
});

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { PrivateMode } from './private-mode';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  convertToParamMap,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Auth, authenticated, employeeDestination } from '../auth/auth';
import { Login } from '../auth/login';
import { WorkspaceLayout } from '../app';
import { EmployeeProfile } from './employee-profile';
import { EmployeeService } from './employee.service';
import { EmployeeDashboard, employeeGreeting } from './employee-dashboard';
import { EmployeeList } from './employee-list';
import { NotificationService } from '../shared/notification.service';
import { PayChecks } from './pay-checks';
import { RunPayrollService } from '../features/run-payroll/run-payroll.service';

const employee = {
  id: 'account',
  role: 'employee' as const,
  firstName: 'Ada',
  email: 'ada@example.test',
};
const person = {
  _id: '012345678901234567890123',
  firstName: 'Ada',
  lastName: 'Example',
  email: employee.email,
  employeeId: 'EMP001',
  dateOfBirth: '1990-01-01',
  hireDate: '2020-01-01',
  annualCtc: 120000,
  status: 'Active',
};
describe('Employee self-service portal', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: PrivateMode,
          useValue: {
            locked: signal(true),
            revision: signal(0),
            reset: vi.fn(),
            refresh: vi.fn(async () => {}),
          },
        },
      ],
    });
    HTMLDialogElement.prototype.showModal = () => {};
    HTMLDialogElement.prototype.close = () => {};
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });
  it('greets at local-time boundaries with optional first name', () => {
    expect(employeeGreeting('Ada', 0)).toBe('Good morning, Ada!');
    expect(employeeGreeting('Ada', 11)).toBe('Good morning, Ada!');
    expect(employeeGreeting('Ada', 12)).toBe('Good afternoon, Ada!');
    expect(employeeGreeting('Ada', 17)).toBe('Good afternoon, Ada!');
    expect(employeeGreeting('Ada', 18)).toBe('Good evening, Ada!');
    expect(employeeGreeting(undefined, 23)).toBe('Good evening!');
  });
  it('renders a focused dashboard without administrator metrics', async () => {
    TestBed.inject(Auth).user.set(employee);
    const fixture = TestBed.createComponent(EmployeeDashboard);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ada');
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe(
      '/employee/my-profile',
    );
    fixture.destroy();
  });
  it('redirects employee logins to their dashboard, ignoring administrator return URLs', async () => {
    const router = TestBed.inject(Router),
      navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(ActivatedRoute).snapshot.queryParamMap, 'get').mockReturnValue(
      '/settings',
    );
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance.email = employee.email;
    fixture.componentInstance.password = 'valid-password';
    const result = fixture.componentInstance.submit();
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:3000/auth/login')
      .flush(employee);
    await result;
    expect(navigate).toHaveBeenCalledWith('/employee/dashboard');
    expect(employeeDestination('/users')).toBe('/employee/dashboard');
    expect(employeeDestination('/employee/my-profile?tab=checks')).toBe(
      '/employee/my-profile?tab=checks',
    );
  });
  it('rejects direct administrator navigation for employees and employee routes for administrators', async () => {
    const router = TestBed.inject(Router),
      http = TestBed.inject(HttpTestingController);
    for (const url of [
      '/',
      '/settings',
      '/reports',
      '/employees/other',
      '/payroll/run',
      '/dashboard',
    ]) {
      const result = TestBed.runInInjectionContext(() =>
        authenticated({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
      );
      http.expectOne('http://localhost:3000/auth/me').flush(employee);
      expect(router.serializeUrl((await result) as any)).toBe('/employee/dashboard');
    }
    const result = TestBed.runInInjectionContext(() =>
      authenticated(
        {} as ActivatedRouteSnapshot,
        { url: '/employee/my-profile' } as RouterStateSnapshot,
      ),
    );
    http.expectOne('http://localhost:3000/auth/me').flush({ ...employee, role: 'admin' });
    expect(router.serializeUrl((await result) as any)).toBe('/dashboard');
  });
  it('shows Dashboard immediately followed by My Profile in employee navigation', async () => {
    TestBed.inject(Auth).user.set(employee);
    const fixture = TestBed.createComponent(WorkspaceLayout);
    TestBed.inject(HttpTestingController)
      .expectOne('http://localhost:3000/settings/organization')
      .flush({ displayName: 'Example Organization' });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Example Organization');
    });
    const links = [...fixture.nativeElement.querySelectorAll('nav a')] as HTMLAnchorElement[];
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Dashboard', 'My Profile']);
    expect(fixture.nativeElement.textContent).toContain('Example Organization');
  });
  it('reuses profile presentation but loads only the secure own-profile endpoint and prevents edits', async () => {
    const update = vi.fn();
    TestBed.overrideProvider(EmployeeService, {
      useValue: {
        myProfile: () => of(person),
        update,
        getAll: vi.fn(() => {
          throw new Error('Bulk access forbidden');
        }),
      },
    });
    TestBed.inject(Auth).user.set(employee);
    const fixture = TestBed.createComponent(EmployeeProfile);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.componentInstance.loading()).toBe(false);
    });
    expect(fixture.nativeElement.textContent).toContain('Ada Example');
    expect(fixture.nativeElement.textContent).toContain('Employment Information');
    expect(fixture.nativeElement.textContent).not.toContain('Income Tax / TDS');
    expect(
      [...fixture.nativeElement.querySelectorAll('app-profile-tabs [role=tab]')].map(
        (tab: HTMLElement) => tab.textContent?.trim(),
      ),
    ).toEqual(['Employee Details', 'Pay Checks']);
    expect(
      fixture.nativeElement.querySelector('[aria-label="Edit Personal Information"]'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[aria-label="Edit Employment Information"]'),
    ).toBeNull();
    fixture.componentInstance.editPersonal();
    fixture.componentInstance.editEmployment();
    await fixture.componentInstance.saveCard('personal');
    expect(fixture.componentInstance.personalEditing()).toBe(false);
    expect(update).not.toHaveBeenCalled();
    fixture.destroy();
  });
  it('rejects the employee tax deep link without mounting the shared component or requesting tax data', async () => {
    TestBed.overrideProvider(EmployeeService, { useValue: { myProfile: () => of(person) } });
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: {
          paramMap: convertToParamMap({}),
          queryParamMap: convertToParamMap({ tab: 'tax' }),
        },
      },
    });
    TestBed.inject(Auth).user.set(employee);
    const fixture = TestBed.createComponent(EmployeeProfile);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.componentInstance.loading()).toBe(false);
    });
    expect(fixture.componentInstance.tab()).toBe('details');
    expect(fixture.nativeElement.querySelector('app-employee-tax')).toBeNull();
    expect(fixture.nativeElement.querySelector('#profile-permissions-tab')).toBeNull();
    TestBed.inject(HttpTestingController).expectNone(
      (request) => request.url.includes('income-tax') || request.url.includes('tax-configuration'),
    );
    fixture.destroy();
  });
  for (const role of ['admin', 'user'] as const)
    it(`preserves the existing ${role} tax and Permissions tab rules`, async () => {
      TestBed.overrideProvider(EmployeeService, { useValue: { getAll: () => of([person]) } });
      TestBed.overrideProvider(ActivatedRoute, {
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ id: person._id }),
            queryParamMap: convertToParamMap({}),
          },
        },
      });
      TestBed.inject(Auth).user.set({ ...employee, role });
      const fixture = TestBed.createComponent(EmployeeProfile);
      fixture.detectChanges();
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(fixture.componentInstance.loading()).toBe(false);
      });
      const labels = [...fixture.nativeElement.querySelectorAll('app-profile-tabs [role=tab]')].map(
        (tab: HTMLElement) => tab.textContent?.trim(),
      );
      expect(labels).toEqual(
        role === 'admin'
          ? ['Employee Details', 'Income Tax / TDS', 'Pay Checks', 'Permissions']
          : ['Employee Details', 'Pay Checks', 'Permissions'],
      );
      fixture.destroy();
    });
  it('shows only own paychecks and keeps Mark as Paid unavailable to employees', async () => {
    const service = {
      history: vi.fn(async () => [
        {
          period: '2026-10',
          paymentDate: '2026-11-01',
          grossPay: 10000,
          employerContributions: 1000,
          deductions: 1000,
          netPay: 9000,
          paymentStatus: 'Payment Pending',
        },
      ]),
      markPaid: vi.fn(),
    };
    TestBed.overrideProvider(RunPayrollService, { useValue: service });
    TestBed.inject(Auth).user.set(employee);
    const fixture = TestBed.createComponent(PayChecks);
    fixture.componentRef.setInput('employeeId', person._id);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Oct 2026');
    });
    expect(service.history).toHaveBeenCalledWith(person._id);
    expect(fixture.nativeElement.textContent).toContain('Payment Pending');
    expect(fixture.nativeElement.querySelector('[aria-label="View Pay Check"]')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('[aria-label="Download Pay Check PDF"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Mark as Paid');
    fixture.componentInstance.paying.set({ paymentStatus: 'Payment Pending' } as any);
    await fixture.componentInstance.confirmPaid();
    expect(service.markPaid).not.toHaveBeenCalled();
    fixture.destroy();
  });
  it('uses the centralized confirmation result notifications for invitations and rejects invalid email', () => {
    const sendInvite = vi.fn(() =>
      of({ invitationSent: true, message: 'Invitation sent successfully.' }),
    );
    TestBed.overrideProvider(EmployeeService, { useValue: { sendInvite } });
    TestBed.inject(Auth).user.set({ ...employee, role: 'admin' });
    const list = TestBed.runInInjectionContext(() => new EmployeeList());
    list.requestInvite(person as any);
    expect(sendInvite).not.toHaveBeenCalled();
    expect(list.inviting()?._id).toBe(person._id);
    list.confirmInvite();
    expect(sendInvite).toHaveBeenCalledWith(person._id);
    const notifications = TestBed.inject(NotificationService);
    expect(notifications.current()?.kind).toBe('success');
    notifications.dismiss();
    list.requestInvite({ ...person, email: '' } as any);
    expect(notifications.current()?.kind).toBe('warning');
  });
  it('adds Send Invite to the administrator kebab menu and preserves the existing actions', async () => {
    TestBed.overrideProvider(EmployeeService, {
      useValue: { getPage: () => of({ items: [person], total: 1, page: 1, pageSize: 10 }) },
    });
    TestBed.inject(Auth).user.set({ ...employee, role: 'admin' });
    const fixture = TestBed.createComponent(EmployeeList);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.nativeElement.querySelector('[aria-label="Actions for Ada Example"]').click();
    fixture.detectChanges();
    const buttons = [...document.querySelectorAll('[cdkmenuitem]')] as HTMLButtonElement[];
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(
      expect.arrayContaining(['Send Invite', 'Edit', 'Delete', 'Terminate', 'Employment history']),
    );
    buttons.find((b) => b.textContent?.trim() === 'Send Invite')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.inviting()?._id).toBe(person._id);
    expect(fixture.nativeElement.querySelector('dialog')?.textContent).toContain(employee.email);
    fixture.destroy();
  });
  it('requires a second explicit confirmation to convert a pending regular-user invitation', () => {
    const accountId = '012345678901234567890abc';
    const sendInvite = vi
      .fn()
      .mockReturnValueOnce(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: {
                code: 'PENDING_USER_LINK_CONFIRMATION_REQUIRED',
                pendingAccountId: accountId,
              },
            }),
        ),
      )
      .mockReturnValueOnce(of({ invitationSent: true, message: 'Invitation accepted.' }));
    TestBed.overrideProvider(EmployeeService, { useValue: { sendInvite } });
    TestBed.inject(Auth).user.set({ ...employee, role: 'admin' });
    const list = TestBed.runInInjectionContext(() => new EmployeeList());
    list.requestInvite(person as any);
    list.confirmInvite();
    expect(sendInvite).toHaveBeenCalledTimes(1);
    expect(list.inviting()?._id).toBe(person._id);
    expect(list.pendingUserLink()).toBe(accountId);
    expect(TestBed.inject(NotificationService).current()).toBeNull();
    list.confirmInvite();
    expect(sendInvite).toHaveBeenLastCalledWith(person._id, accountId);
    expect(TestBed.inject(NotificationService).current()?.kind).toBe('success');
    list.requestInvite(person as any);
    expect(list.pendingUserLink()).toBeNull();
  });
});

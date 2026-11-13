import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { PrivateMode } from './private-mode';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Auth } from '../auth/auth';
import { NotificationService } from '../shared/notification.service';
import { EmployeePermissions } from './employee-permissions';
import { EmployeePermissionsApi, EmployeePermissionState } from './employee-permissions-api';
import { EmployeeProfile } from './employee-profile';
import { EmployeeService } from './employee.service';

const id = '012345678901234567890abc';
const base: EmployeePermissionState = {
  employeeName: 'Ada Example',
  email: 'ada@example.test',
  accountStatus: 'Account Active',
  invitationStatus: 'Invitation Accepted',
  passwordSetupStatus: 'Completed',
  accessStatus: 'Enabled',
  loginStatus: 'Never Logged In',
  lastLoginAt: null,
  invitationSentAt: '2026-11-10T13:00:00.000Z',
  invitationAcceptedAt: '2026-11-10T13:01:00.000Z',
  passwordSetupAt: '2026-11-10T13:01:00.000Z',
  accountActivatedAt: '2026-11-10T13:01:00.000Z',
  accessRevokedAt: null,
  accessRestoredAt: null,
  invitationCancelledAt: null,
  canRevoke: true,
  canRestore: false,
  canCancel: false,
  canResend: false,
  audit: [
    {
      action: 'account.activated',
      at: '2026-11-10T13:01:00.000Z',
      actorName: 'Ada Example',
      actorId: id,
    },
  ],
};
describe('Employee Permissions', () => {
  let api: { get: ReturnType<typeof vi.fn>; act: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    api = {
      get: vi.fn(async () => ({ ...base })),
      act: vi.fn(async () => ({ message: 'Access updated.' })),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: EmployeePermissionsApi, useValue: api },
        { provide: PrivateMode, useValue: { locked: signal(true), revision: signal(0), reset: vi.fn(), refresh: vi.fn(async () => {}) } },
      ],
    });
    HTMLDialogElement.prototype.showModal = () => {};
    HTMLDialogElement.prototype.close = () => {};
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  async function setup(
    role: 'admin' | 'user' | 'employee' = 'admin',
    value: EmployeePermissionState = base,
  ) {
    api.get.mockResolvedValue(value);
    TestBed.inject(Auth).user.set({ id: 'manager', email: 'manager@example.test', role });
    const fixture = TestBed.createComponent(EmployeePermissions);
    fixture.componentRef.setInput('employeeId', id);
    fixture.detectChanges();
    if (role !== 'employee')
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(fixture.componentInstance.state()).not.toBeNull();
      });
    return fixture;
  }
  it('renders real lifecycle states, timezone, unavailable dates and never-logged-in separately from activation', async () => {
    const fixture = await setup();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Account Active');
    expect(text).toContain('Invitation Accepted');
    expect(text).toContain('Completed');
    expect(text).toContain('Never Logged In');
    expect(text).toContain('Not Available');
    expect(text).toContain(fixture.componentInstance.timezone);
    expect(text).toContain('does not confirm inbox delivery');
    expect(text).toContain('Account activated');
    expect(text).toContain('Ada Example');
    expect(fixture.nativeElement.querySelector('ps-status-badge').getAttribute('data-tone')).toBe(
      'success',
    );
  });
  it('shows the actual stored Last Login instead of Never Logged In', async () => {
    const fixture = await setup('admin', {
      ...base,
      lastLoginAt: '2026-11-10T14:30:00Z',
      loginStatus: 'Recorded',
    });
    const rows = [...fixture.nativeElement.querySelectorAll('.info-grid > div')] as HTMLElement[];
    const login = rows.find((row) => row.querySelector('dt')?.textContent === 'Last Login');
    expect(login?.textContent).toContain('10 Nov 2026');
    expect(login?.textContent).not.toContain('Never Logged In');
  });
  it('requires confirmation before revoking, sends once while busy and refreshes the account', async () => {
    const fixture = await setup(),
      page = fixture.componentInstance;
    let resolve!: (value: unknown) => void;
    api.act.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    api.get.mockResolvedValue({
      ...base,
      accessStatus: 'Access Revoked',
      accountStatus: 'Access Revoked',
      canRevoke: false,
      canRestore: true,
    });
    page.request('revoke');
    fixture.detectChanges();
    expect(api.act).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('dialog')?.textContent).toContain(
      'no longer be able to log in',
    );
    const pending = page.confirm();
    await page.confirm();
    expect(api.act).toHaveBeenCalledTimes(1);
    expect(api.act).toHaveBeenCalledWith(id, 'revoke');
    resolve({ message: 'Employee portal access disabled.' });
    await pending;
    expect(page.state()?.accessStatus).toBe('Access Revoked');
    expect(TestBed.inject(NotificationService).current()?.kind).toBe('success');
  });
  it('restores the existing account only after administrator confirmation', async () => {
    const fixture = await setup('admin', {
      ...base,
      accountStatus: 'Access Revoked',
      accessStatus: 'Access Revoked',
      canRevoke: false,
      canRestore: true,
    });
    fixture.componentInstance.request('restore');
    expect(api.act).not.toHaveBeenCalled();
    await fixture.componentInstance.confirm();
    expect(api.act).toHaveBeenCalledWith(id, 'restore');
    expect(api.act).toHaveBeenCalledTimes(1);
  });
  it('lets managers revoke and manage invitations but cannot restore even if an invalid response advertises it', async () => {
    const fixture = await setup('user', {
      ...base,
      canRestore: true,
      canCancel: true,
      canResend: true,
    });
    const page = fixture.componentInstance;
    expect(page.allowed('revoke')).toBe(true);
    expect(page.allowed('cancel')).toBe(true);
    expect(page.allowed('resend')).toBe(true);
    page.request('restore');
    expect(page.confirmation()).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Restore Access');
  });
  it('confirms cancellation and invalidates the pending status shown after refresh', async () => {
    const fixture = await setup('admin', {
      ...base,
      invitationStatus: 'Invitation Sent',
      passwordSetupStatus: 'Password Setup Pending',
      canCancel: true,
      canResend: true,
    });
    api.get.mockResolvedValue({
      ...base,
      invitationStatus: 'Invitation Cancelled',
      canCancel: false,
      canResend: true,
    });
    fixture.componentInstance.request('cancel');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog')?.textContent).toContain(
      'link will no longer work',
    );
    await fixture.componentInstance.confirm();
    fixture.detectChanges();
    expect(api.act).toHaveBeenCalledWith(id, 'cancel');
    expect(fixture.nativeElement.textContent).toContain('Invitation Cancelled');
  });
  it('resends with confirmation and reports a delivery failure through the centralized warning modal', async () => {
    const fixture = await setup('admin', {
      ...base,
      invitationStatus: 'Invitation Expired',
      canResend: true,
    });
    api.act.mockResolvedValue({ invitationSent: false, message: 'Invitation could not be sent.' });
    fixture.componentInstance.request('resend');
    expect(api.act).not.toHaveBeenCalled();
    await fixture.componentInstance.confirm();
    expect(api.act).toHaveBeenCalledWith(id, 'resend');
    expect(TestBed.inject(NotificationService).current()?.kind).toBe('warning');
  });
  it('reports action errors without success and refreshes the persisted status', async () => {
    const fixture = await setup();
    api.act.mockRejectedValue(new Error('Controlled failure'));
    fixture.componentInstance.request('revoke');
    await fixture.componentInstance.confirm();
    expect(TestBed.inject(NotificationService).current()?.kind).toBe('error');
    expect(api.get).toHaveBeenCalledTimes(2);
  });
  it('does not fetch or manage permissions from an employee account', async () => {
    const fixture = await setup('employee');
    expect(api.get).not.toHaveBeenCalled();
    for (const action of ['revoke', 'restore', 'cancel', 'resend'] as const)
      fixture.componentInstance.request(action);
    expect(fixture.componentInstance.confirmation()).toBeNull();
    expect(api.act).not.toHaveBeenCalled();
  });
  for (const role of ['admin', 'user', 'employee'] as const)
    it(`limits tab visibility and direct permissions-tab selection for ${role}`, async () => {
      const person = {
        _id: id,
        firstName: 'Ada',
        lastName: 'Example',
        email: base.email,
        dateOfBirth: '1990-01-01',
        hireDate: '2020-01-01',
      };
      TestBed.overrideProvider(EmployeeService, {
        useValue: { getAll: () => of([person]), myProfile: () => of(person) },
      });
      TestBed.overrideProvider(ActivatedRoute, {
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ id }),
            queryParamMap: convertToParamMap({ tab: 'permissions' }),
          },
        },
      });
      TestBed.inject(Auth).user.set({ id: 'actor', email: 'actor@example.test', role });
      const fixture = TestBed.createComponent(EmployeeProfile);
      fixture.detectChanges();
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(fixture.componentInstance.loading()).toBe(false);
      });
      const labels = [...fixture.nativeElement.querySelectorAll('app-profile-tabs [role=tab]')].map(
        (n: HTMLElement) => n.textContent?.trim(),
      );
      if (role === 'employee') {
        expect(labels).not.toContain('Permissions');
        expect(fixture.componentInstance.tab()).toBe('details');
        expect(api.get).not.toHaveBeenCalled();
      } else {
        expect(labels.indexOf('Permissions')).toBe(labels.indexOf('Pay Checks') + 1);
        expect(fixture.componentInstance.tab()).toBe('permissions');
        if (role === 'admin')
          expect(labels).toEqual([
            'Employee Details',
            'Income Tax / TDS',
            'Pay Checks',
            'Permissions',
          ]);
      }
      fixture.destroy();
    });
});

describe('Employee permissions API requests', () => {
  it('uses existing account/status routes with explicit actions and safely encoded employee IDs', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(EmployeePermissionsApi),
      http = TestBed.inject(HttpTestingController);
    const get = api.get('a/b');
    http.expectOne('http://localhost:3000/employee-accounts/a%2Fb/permissions').flush(base);
    await get;
    for (const action of ['revoke', 'restore', 'cancel', 'resend'] as const) {
      const result = api.act(id, action);
      const status = action === 'revoke' || action === 'restore';
      const req = http.expectOne(
        `http://localhost:3000/employee-accounts/${id}/${status ? 'status' : 'invitation/' + action}`,
      );
      expect(req.request.method).toBe(status ? 'PATCH' : 'POST');
      expect(req.request.body).toEqual(status ? { active: action === 'restore' } : {});
      req.flush({ message: 'Done' });
      await result;
    }
    http.verify();
  });
});

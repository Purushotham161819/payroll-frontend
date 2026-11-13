import { Component, OnDestroy, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Auth } from '../auth/auth';
import { NotificationService } from '../shared/notification.service';
import { PsButton, PsIconButton, PsStatusBadge, PsDataTable } from '../shared/ui';
import { PsDialog } from '../shared/ui/ps-dialog';
import { ProfileCard } from './profile-card';
import { apiError } from './employee.service';
import {
  EmployeePermissionAction,
  EmployeePermissionState,
  EmployeePermissionsApi,
} from './employee-permissions-api';

@Component({
  selector: 'app-employee-permissions',
  imports: [DatePipe, ProfileCard, PsButton, PsIconButton, PsStatusBadge, PsDataTable, PsDialog],
  templateUrl: './employee-permissions.html',
  styleUrls: ['./employee-profile.css', './employee-permissions.css'],
})
export class EmployeePermissions implements OnInit, OnDestroy {
  readonly employeeId = input.required<string>();
  readonly state = signal<EmployeePermissionState | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly failed = signal(false);
  readonly confirmation = signal<EmployeePermissionAction | null>(null);
  readonly timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  readonly auth = inject(Auth);
  private readonly api = inject(EmployeePermissionsApi);
  private readonly notifications = inject(NotificationService);
  private alive = true;
  readonly labels = {
    revoke: 'Revoke Access',
    restore: 'Restore Access',
    cancel: 'Cancel Invitation',
    resend: 'Resend Invitation',
  };
  readonly descriptions = {
    revoke:
      "Are you sure you want to revoke this employee's PayStream portal access? The employee will no longer be able to log in, and existing sessions will stop working. Employee and payroll history will be preserved.",
    restore:
      'Restore this employee’s portal access? The existing account and history will be preserved. An activated account will not receive another invitation.',
    cancel:
      'Cancel this pending invitation? The existing invitation link will no longer work. The employee record and historical information will be preserved.',
    resend:
      'Send a new employee invitation? The previous setup link will stop working. The existing account will be reused.',
  };
  ngOnInit() {
    void this.load();
  }
  ngOnDestroy() {
    this.alive = false;
  }
  async load() {
    if (!['admin', 'user'].includes(this.auth.user()?.role ?? '') || this.loading()) return;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const state = await this.api.get(this.employeeId());
      if (this.alive) this.state.set(state);
    } catch (error) {
      if (this.alive) {
        this.failed.set(true);
        this.notifications.error(apiError(error));
      }
    } finally {
      if (this.alive) this.loading.set(false);
    }
  }
  allowed(action: EmployeePermissionAction) {
    if (!['admin', 'user'].includes(this.auth.user()?.role ?? '')) return false;
    const state = this.state();
    return (
      !!state &&
      (action === 'revoke'
        ? state.canRevoke
        : action === 'restore'
          ? state.canRestore && this.auth.user()?.role === 'admin'
          : action === 'cancel'
            ? state.canCancel
            : state.canResend)
    );
  }
  request(action: EmployeePermissionAction) {
    if (!this.busy() && !this.loading() && !this.failed() && this.allowed(action))
      this.confirmation.set(action);
  }
  async confirm() {
    const action = this.confirmation();
    if (!action || this.busy() || !this.allowed(action)) return;
    this.busy.set(true);
    try {
      const result = await this.api.act(this.employeeId(), action);
      if (!this.alive) return;
      this.confirmation.set(null);
      if ('invitationSent' in result && result.invitationSent === false)
        this.notifications.warning(result.message);
      else this.notifications.success(result.message);
      await this.load();
    } catch (error) {
      if (this.alive) {
        this.confirmation.set(null);
        this.notifications.error(apiError(error));
        await this.load();
      }
    } finally {
      if (this.alive) this.busy.set(false);
    }
  }
  eventLabel(action: string) {
    const labels: Record<string, string> = {
      'invitation.sent': 'Invitation sent',
      'invitation.resent': 'Invitation resent',
      'invitation.accepted': 'Invitation accepted',
      'password.setup_completed': 'Password setup completed',
      'account.activated': 'Account activated',
      'login.succeeded': 'Successful login',
      'access.revoked': 'Access revoked',
      'access.restored': 'Access restored',
      'invitation.cancelled': 'Invitation cancelled',
    };
    return labels[action] ?? action;
  }
}

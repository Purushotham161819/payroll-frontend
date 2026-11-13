import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EmployeePermissionState {
  employeeName: string;
  email: string;
  accountEmail?: string;
  accountStatus: string;
  invitationStatus: string;
  passwordSetupStatus: string;
  accessStatus: string;
  loginStatus: string;
  accessReason?: string | null;
  invitationSentAt: string | null;
  invitationAcceptedAt: string | null;
  passwordSetupAt: string | null;
  accountActivatedAt: string | null;
  lastLoginAt: string | null;
  accessRevokedAt: string | null;
  accessRestoredAt: string | null;
  invitationCancelledAt: string | null;
  canRevoke: boolean;
  canRestore: boolean;
  canCancel: boolean;
  canResend: boolean;
  audit: { action: string; actorId: string; actorName: string; at: string }[];
}
export type EmployeePermissionAction = 'revoke' | 'restore' | 'cancel' | 'resend';
@Injectable({ providedIn: 'root' })
export class EmployeePermissionsApi {
  private readonly http = inject(HttpClient);
  private url(id: string) {
    return environment.apiUrl + '/employee-accounts/' + encodeURIComponent(id);
  }
  get(id: string) {
    return firstValueFrom(this.http.get<EmployeePermissionState>(this.url(id) + '/permissions'));
  }
  act(id: string, action: EmployeePermissionAction) {
    if (action === 'revoke' || action === 'restore')
      return firstValueFrom(
        this.http.patch<{ message: string }>(this.url(id) + '/status', {
          active: action === 'restore',
        }),
      );
    return firstValueFrom(
      this.http.post<{ message: string; invitationSent?: boolean }>(
        this.url(id) + '/invitation/' + action,
        {},
      ),
    );
  }
}

import { NotificationService } from '../shared/notification.service';
import { PRODUCT_BRAND } from '../branding';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { CdkMenuModule } from '@angular/cdk/menu';
import { PsButton, PsIconButton, PsIcon, PsPageHeader, PsCard, PsCardTitle, PsCardActions, PsDataTable, PsFormField, PsFieldControl, PsStatusBadge, PsDatePipe, PsTooltip } from '../shared/ui';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Auth } from '../auth/auth';
import { environment } from '../../environments/environment';

export interface ManagedUser { id: string; firstName?: string; lastName?: string; invitationPending?: boolean; invitationDelivery?: string; email: string; role: 'admin' | 'user'; active: boolean; createdAt: string; }
@Component({
  selector: 'app-user-management', imports: [FormsModule, CdkMenuModule, PsButton, PsIconButton, PsIcon, PsPageHeader, PsCard, PsCardTitle, PsCardActions, PsDataTable, PsFormField, PsFieldControl, PsStatusBadge, PsDatePipe, PsTooltip],
  templateUrl: './users.html', styleUrl: './users.css',
})
export class UserManagement {
  readonly productBrand = PRODUCT_BRAND;
  private readonly notifications = inject(NotificationService);
  readonly auth = inject(Auth); private http = inject(HttpClient);
  readonly users = signal<ManagedUser[]>([]); readonly busy = signal(false); readonly loading = signal(false);
  readonly error = signal(''); readonly notice = signal(''); readonly noticeWarning = signal(false);
  readonly editor = viewChild.required<ElementRef<HTMLDialogElement>>('editor');
  readonly confirmation = viewChild.required<ElementRef<HTMLDialogElement>>('confirmation');
  readonly mode = signal<'create' | 'edit' | 'password'>('create');
  readonly selected = signal<ManagedUser | null>(null); readonly action = signal<'password' | 'status' | null>(null);
  firstName = ''; lastName = '';
  email = ''; password = ''; confirmPassword = ''; role: 'admin' | 'user' = 'user'; active = true;
  constructor() { void this.load(); }
  async load() {
    this.loading.set(true); this.error.set('');
    try { this.users.set(await firstValueFrom(this.http.get<ManagedUser[]>(`${environment.apiUrl}/users`))); }
    catch (e) { this.error.set(this.message(e)); }
    finally { this.loading.set(false); }
  }
  open(mode: 'create' | 'edit' | 'password', user: ManagedUser | null = null) {
    this.action.set(null);
    this.selected.set(user); this.mode.set(mode); this.email = user?.email ?? '';
    this.firstName = user?.firstName ?? ''; this.lastName = user?.lastName ?? '';
    this.role = user?.role ?? 'user'; this.active = user?.active ?? true;
    this.password = ''; this.confirmPassword = ''; this.error.set(''); this.notice.set(''); this.noticeWarning.set(false);
    this.editor().nativeElement.showModal();
  }
  cancel(event?: Event) {
    event?.preventDefault(); if (this.busy()) return;
    this.editor().nativeElement.close(); this.password = ''; this.confirmPassword = '';
  }
  requestStatus(user: ManagedUser) {
    this.selected.set(user); this.action.set('status'); this.error.set(''); this.notice.set('');
    this.confirmation().nativeElement.showModal();
  }
  cancelConfirmation(event?: Event) {
    event?.preventDefault(); if (!this.busy()) this.confirmation().nativeElement.close();
  }
  async submit() {
    if (this.busy()) return;
    if (this.mode() === 'password' && (this.password.length < 8 || this.password.length > 128 || this.password !== this.confirmPassword)) {
      this.error.set('Passwords must match. Password must be at least 8 characters long (maximum 128).'); return;
    }
    if (this.mode() !== 'password' && (!this.firstName.trim() || !this.lastName.trim() || this.firstName.trim().length > 100 || this.lastName.trim().length > 100)) { this.error.set('Enter first and last names, up to 100 characters each.'); return; }
    if (this.mode() === 'password') { this.action.set('password'); this.confirmation().nativeElement.showModal(); return; }
    await this.save();
  }
  async save() {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    const user = this.selected(); const mode = this.mode(); const action = this.action();
    this.noticeWarning.set(false);
    let invitationMessage = '';
    try {
      if (this.confirmation().nativeElement.open && action === 'status' && user) {
        await firstValueFrom(this.http.patch(`${environment.apiUrl}/users/${user.id}/status`, { active: !user.active }));
      } else if (this.confirmation().nativeElement.open && action === 'password' && user) {
        await firstValueFrom(this.http.patch(`${environment.apiUrl}/users/${user.id}/password`, { password: this.password }));
      } else if (mode === 'create') {
        const result = await firstValueFrom(this.http.post<{message:string;invitationSent:boolean}>(`${environment.apiUrl}/users`, { firstName: this.firstName.trim(), lastName: this.lastName.trim(), email: this.email.trim().toLowerCase(), role: this.role, active: this.active }));
        invitationMessage = result.invitationSent ? 'User invitation email has been sent successfully.' : 'User account created, but the invitation email could not be sent. Use Resend Invitation; do not create the user again.'; this.noticeWarning.set(!result.invitationSent);
      } else if (mode === 'edit' && user) {
        await firstValueFrom(this.http.patch(`${environment.apiUrl}/users/${user.id}`, { firstName: this.firstName.trim(), lastName: this.lastName.trim(), email: this.email.trim().toLowerCase(), role: this.role }));
      } else return;
      const selfChanged = user?.id === this.auth.user()?.id && (action === 'password' || (mode === 'edit' && this.email.trim().toLowerCase() !== user?.email));
      this.confirmation().nativeElement.close(); this.editor().nativeElement.close();
      this.password = ''; this.confirmPassword = ''; this.action.set(null);
      if (selfChanged) { this.notifications.success('User account saved. Sign in again to continue.'); this.auth.expired(); return; }
      this.notice.set(invitationMessage || (action === 'password' ? 'Password reset. All previous sessions are invalid.' : 'User account saved.'));
      if (this.noticeWarning()) this.notifications.warning(this.notice()); else this.notifications.success(this.notice());
      await this.load();
    } catch (e) { this.error.set(this.message(e)); }
    finally { this.busy.set(false); }
  }
  async resend(user: ManagedUser) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.notice.set('');
    try {
      const result = await firstValueFrom(this.http.post<{message:string;invitationSent:boolean}>(`${environment.apiUrl}/users/${user.id}/invitation`, {}));
      this.notice.set(result.invitationSent ? 'Invitation email has been sent successfully.' : 'The invitation email could not be sent. Please try Resend Invitation later.'); this.noticeWarning.set(!result.invitationSent);
      if (result.invitationSent) this.notifications.success(this.notice()); else this.notifications.warning(this.notice()); await this.load();
    } catch (error) { this.error.set(this.message(error)); }
    finally { this.busy.set(false); }
  }
  private message(error: unknown) {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) return 'Administrator access is required.';
      if (error.status === 409 && typeof error.error?.message === 'string') return error.error.message;
      if (error.status === 404) return 'This user no longer exists. Refresh the directory.';
      if (error.status === 400) return 'Check the names, email, role, and password requirements.';
    }
    return 'Unable to complete the request. Please try again.';
  }
}

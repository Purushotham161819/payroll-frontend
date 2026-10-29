import { PRODUCT_BRAND } from '../branding';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Auth } from '../auth/auth';
import { environment } from '../../environments/environment';

export interface ManagedUser { id: string; email: string; role: 'admin' | 'user'; active: boolean; createdAt: string; }
@Component({
  selector: 'app-user-management', imports: [FormsModule, DatePipe],
  templateUrl: './users.html', styleUrl: './users.css',
})
export class UserManagement {
  readonly productBrand = PRODUCT_BRAND;
  readonly auth = inject(Auth); private http = inject(HttpClient);
  readonly users = signal<ManagedUser[]>([]); readonly busy = signal(false); readonly loading = signal(false);
  readonly error = signal(''); readonly notice = signal('');
  readonly editor = viewChild.required<ElementRef<HTMLDialogElement>>('editor');
  readonly confirmation = viewChild.required<ElementRef<HTMLDialogElement>>('confirmation');
  readonly mode = signal<'create' | 'edit' | 'password'>('create');
  readonly selected = signal<ManagedUser | null>(null); readonly action = signal<'password' | 'status' | null>(null);
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
    this.role = user?.role ?? 'user'; this.active = user?.active ?? true;
    this.password = ''; this.confirmPassword = ''; this.error.set(''); this.notice.set('');
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
    if (this.mode() !== 'edit' && (this.password.length < 8 || this.password.length > 128 || this.password !== this.confirmPassword)) {
      this.error.set('Passwords must match. Password must be at least 8 characters long (maximum 128).'); return;
    }
    if (this.mode() === 'password') { this.action.set('password'); this.confirmation().nativeElement.showModal(); return; }
    await this.save();
  }
  async save() {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    const user = this.selected(); const mode = this.mode(); const action = this.action();
    try {
      if (this.confirmation().nativeElement.open && action === 'status' && user) {
        await firstValueFrom(this.http.patch(`${environment.apiUrl}/users/${user.id}/status`, { active: !user.active }));
      } else if (this.confirmation().nativeElement.open && action === 'password' && user) {
        await firstValueFrom(this.http.patch(`${environment.apiUrl}/users/${user.id}/password`, { password: this.password }));
      } else if (mode === 'create') {
        await firstValueFrom(this.http.post(`${environment.apiUrl}/users`, { email: this.email.trim().toLowerCase(), password: this.password, role: this.role, active: this.active }));
      } else if (mode === 'edit' && user) {
        await firstValueFrom(this.http.patch(`${environment.apiUrl}/users/${user.id}`, { email: this.email.trim().toLowerCase(), role: this.role }));
      } else return;
      const selfChanged = user?.id === this.auth.user()?.id && (action === 'password' || (mode === 'edit' && this.email.trim().toLowerCase() !== user?.email));
      this.confirmation().nativeElement.close(); this.editor().nativeElement.close();
      this.password = ''; this.confirmPassword = ''; this.action.set(null);
      if (selfChanged) { this.auth.expired(); return; }
      this.notice.set(action === 'password' ? 'Password reset. All previous sessions are invalid.' : 'User account saved.');
      await this.load();
    } catch (e) { this.error.set(this.message(e)); }
    finally { this.busy.set(false); }
  }
  private message(error: unknown) {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) return 'Administrator access is required.';
      if (error.status === 409 && typeof error.error?.message === 'string') return error.error.message;
      if (error.status === 404) return 'This user no longer exists. Refresh the directory.';
      if (error.status === 400) return 'Check the email, role, and password requirements.';
    }
    return 'Unable to complete the request. Please try again.';
  }
}

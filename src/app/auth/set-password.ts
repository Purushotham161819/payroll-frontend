import { completionSignal } from '../shared/notification.service';
﻿import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Meta } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { PRODUCT_BRAND } from '../branding';
import { PsButton, PsPageHeader, PsFormField, PsFieldControl, PsIconButton } from '../shared/ui';

@Component({selector:'app-set-password', imports:[FormsModule, RouterLink, PsButton, PsPageHeader, PsFormField, PsFieldControl, PsIconButton], templateUrl:'./set-password.html', styleUrl:'./auth.css'})
export class SetPassword {
  readonly productBrand = PRODUCT_BRAND;
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly meta = inject(Meta);
  readonly reset = window.location.pathname === '/reset-password';
  private token = '';
  readonly loading = signal(true); readonly valid = signal(false); readonly busy = signal(false);
  readonly error = signal(''); readonly success = completionSignal(); readonly firstName = signal('');
  password = ''; confirmation = ''; showPassword = false; showConfirmation = false;
  constructor() {
    const previous = this.meta.getTag('name="referrer"')?.content;
    this.meta.updateTag({name:'referrer',content:'no-referrer'});
    this.destroy.onDestroy(() => { if (previous) this.meta.updateTag({name:'referrer',content:previous}); else this.meta.removeTag('name="referrer"'); this.token = ''; });
    this.token = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    void this.inspect();
  }
  private unavailable() { return this.reset ? 'This reset link is invalid, expired, already used, or unavailable. Request a new password reset.' : 'This invitation is invalid, expired, already used, or unavailable. Contact your organization administrator for a new invitation.'; }
  private async inspect() {
    if (!/^[A-Za-z0-9_-]{43}$/.test(this.token)) { this.error.set(this.unavailable()); this.loading.set(false); return; }
    try {
      const result = await firstValueFrom(this.http.post<{firstName:string}>(environment.apiUrl + (this.reset ? '/auth/reset-password/inspect' : '/auth/invitation/inspect'), {token:this.token}));
      if (!this.destroy.destroyed) { this.firstName.set(result.firstName); this.valid.set(true); }
    } catch { if (!this.destroy.destroyed) this.error.set(this.unavailable()); }
    finally { if (!this.destroy.destroyed) this.loading.set(false); }
  }
  async submit() {
    if (this.busy() || !this.valid() || this.password.length < 8 || this.password.length > 128 || this.password !== this.confirmation) return;
    this.busy.set(true); this.error.set('');
    try {
      await firstValueFrom(this.http.post(environment.apiUrl + (this.reset ? '/auth/reset-password/complete' : '/auth/invitation/complete'), {token:this.token,password:this.password,confirmation:this.confirmation}));
      if (this.destroy.destroyed) return;
      this.token=''; this.password=''; this.confirmation=''; this.valid.set(false);
      this.success.set(this.reset ? 'Your password has been reset. Sign in with your new password. Redirecting to sign in...' : 'Your password is set. You can now sign in to PayStream. Redirecting to sign in...');
      const timer = setTimeout(() => void this.router.navigateByUrl('/login'), 3000);
      this.destroy.onDestroy(() => clearTimeout(timer));
    } catch (error) {
      if (this.destroy.destroyed) return;
      this.error.set(error instanceof HttpErrorResponse && error.status === 400 ? this.unavailable() : error instanceof HttpErrorResponse && error.status === 429 ? 'Too many attempts. Please try again later.' : 'Unable to set your password. Please try again.');
      if (error instanceof HttpErrorResponse && error.status === 400) this.valid.set(false);
    } finally { if (!this.destroy.destroyed) this.busy.set(false); }
  }
}

import { PageTransition } from '../shared/page-transition';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Auth } from './auth';
import { environment } from '../../environments/environment';
@Component({
  selector: 'app-change-password',
  hostDirectives: [PageTransition],
  imports: [FormsModule],
  template: ` <section class="password-page">
    <form #form="ngForm" (ngSubmit)="save()">
      <p>PAYSTREAM / ACCOUNT SECURITY</p>
      <h1>Set your new password</h1>
      <p>
        Replace your temporary password before entering your workspace. You will sign in again
        afterward.
      </p>
      <label
        >Current password<input
          name="currentPassword"
          type="password"
          autocomplete="current-password"
          [(ngModel)]="currentPassword"
          required
          minlength="8"
          maxlength="128"
      /></label>
      <label
        >New password<input
          name="password"
          type="password"
          autocomplete="new-password"
          [(ngModel)]="password"
          required
          minlength="8"
          maxlength="128"
      /></label>
      <label
        >Confirm new password<input
          name="confirmation"
          type="password"
          autocomplete="new-password"
          [(ngModel)]="confirmation"
          required
          minlength="8"
          maxlength="128"
      /></label>
      <small>Password must be at least 8 characters long.</small>
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      }
      <div class="actions">
        <button class="primary" [disabled]="form.invalid || busy() || password !== confirmation">
          Change password</button
        ><button type="button" class="secondary" [disabled]="busy()" (click)="signOut()">
          Sign out
        </button>
      </div>
    </form>
  </section>`,
  styles: [
    `
      .password-page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      form {
        width: min(100%, 460px);
        padding: 32px;
        background: white;
        border: 1px solid #d6dfd5;
        border-radius: 14px;
      }
      p {
        font-size: 14px;
        line-height: 1.6;
        color: #647265;
      }
      label {
        display: block;
        margin: 20px 0;
      }
      input {
        display: block;
        width: 100%;
        padding: 12px;
        margin-top: 8px;
        border: 1px solid #cbd5c8;
        border-radius: 6px;
        font: inherit;
      }
      .actions {
        display: flex;
        gap: 12px;
        margin-top: 24px;
      }
      [role='alert'] {
        color: #93372b;
      }
    `,
  ],
})
export class ChangePassword {
  private router = inject(Router);
  private http = inject(HttpClient);
  private auth = inject(Auth);
  currentPassword = '';
  password = '';
  confirmation = '';
  readonly busy = signal(false);
  readonly error = signal('');
  async save() {
    if (this.busy() || this.password.length < 8 || this.password !== this.confirmation) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(
        this.http.post(environment.apiUrl + '/auth/change-password', {
          currentPassword: this.currentPassword,
          password: this.password,
        }),
      );
      this.currentPassword = this.password = this.confirmation = '';
      this.auth.expired();
      await this.router.navigateByUrl('/login');
    } catch (e) {
      this.error.set(
        e instanceof HttpErrorResponse && typeof e.error?.message === 'string'
          ? e.error.message
          : 'Unable to change password. Check your current password and try again.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  async signOut() {
    try {
      await this.auth.logout();
    } catch {
      this.error.set('Unable to sign out. Please try again.');
    }
  }
}

import { NotificationService } from '../shared/notification.service';
import { PsButton, PsFormField, PsFieldControl, PsPageHeader } from '../shared/ui';
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
  imports: [FormsModule, PsButton, PsFormField, PsFieldControl, PsPageHeader],
  templateUrl: './change-password.html',
  styleUrl: './auth.css',
})
export class ChangePassword {
  private readonly notifications = inject(NotificationService);
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
      this.notifications.success('Your password has been changed successfully. Sign in with your new password.');
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

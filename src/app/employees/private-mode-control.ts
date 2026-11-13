import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PsButton, PsFieldControl, PsFormField, PsIcon } from '../shared/ui';
import { PsDialog } from '../shared/ui/ps-dialog';
import { NotificationService } from '../shared/notification.service';
import { PrivateMode, PrivateModeChallenge } from './private-mode';
@Component({
  selector: 'app-private-mode-control',
  imports: [FormsModule, PsButton, PsFieldControl, PsFormField, PsIcon, PsDialog],
  templateUrl: './private-mode-control.html',
  styles: [
    ':host{display:block}.privacy-toggle,.otp-actions{display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap}.privacy-toggle{justify-content:flex-end}.otp-actions{justify-content:flex-end;margin-top:var(--space-4)}.otp-help{font:var(--type-helper);color:var(--ink-muted)}',
  ],
})
export class PrivateModeControl implements OnInit, OnDestroy {
  readonly privacy = inject(PrivateMode);
  private readonly notifications = inject(NotificationService);
  readonly modal = signal(false);
  readonly busy = signal(false);
  readonly challenge = signal<PrivateModeChallenge | null>(null);
  readonly now = signal(Date.now());
  code = '';
  private alive = true;
  private readonly timer = setInterval(() => this.now.set(Date.now()), 1000);
  ngOnInit() {
    void this.privacy.refresh();
  }
  ngOnDestroy() {
    this.alive = false;
    clearInterval(this.timer);
    this.code = '';
  }
  async toggle(event: Event) {
    (event.target as HTMLInputElement).checked = this.privacy.locked();
    if (!this.privacy.locked()) {
      try {
        await this.privacy.lock();
      } catch {
        this.notifications.error(
          'Private Mode is masked locally, but the server could not confirm re-locking. Retry or sign out.',
        );
      }
      return;
    }
    if (this.busy()) return;
    this.modal.set(true);
    await this.send();
  }
  async send() {
    if (this.busy()) return;
    this.busy.set(true);
    this.code = '';
    try {
      const challenge = await this.privacy.request();
      if (this.alive) this.challenge.set(challenge);
    } catch (error) {
      if (this.alive) this.notifications.error(this.message(error));
    } finally {
      if (this.alive) this.busy.set(false);
    }
  }
  async verify() {
    if (this.busy() || !/^\d{6}$/.test(this.code) || this.remaining() === 0) return;
    this.busy.set(true);
    try {
      await this.privacy.verify(this.code);
      if (this.alive) {
        this.modal.set(false);
        this.code = '';
        if (this.privacy.locked())
          this.notifications.warning(
            'Private Mode remains ON. The authorization was cancelled or expired.',
          );
        else
          this.notifications.success(
            'Private Mode is temporarily OFF. Sensitive access will expire automatically.',
          );
      }
    } catch (error) {
      if (this.alive) {
        this.code = '';
        this.notifications.error(this.message(error));
      }
    } finally {
      if (this.alive) this.busy.set(false);
    }
  }
  validCode() {
    return /^\d{6}$/.test(this.code);
  }
  async cancel() {
    this.modal.set(false);
    this.code = '';
    this.challenge.set(null);
    try {
      await this.privacy.lock();
    } catch {
      this.notifications.error('The server could not confirm cancellation. Retry or sign out.');
    }
  }
  remaining() {
    return Math.max(0, Math.ceil(((this.challenge()?.expiresAt ?? 0) - this.now()) / 1000));
  }
  resendWait() {
    return Math.max(0, Math.ceil(((this.challenge()?.resendAt ?? 0) - this.now()) / 1000));
  }
  private message(error: unknown) {
    return error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
      ? error.error.message
      : 'Verification is unavailable. Private Mode remains enabled. Please try again.';
  }
}

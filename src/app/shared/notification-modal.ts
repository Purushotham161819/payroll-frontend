import { Component, ElementRef, HostListener, effect, inject, viewChild } from '@angular/core';
import { NotificationService } from './notification.service';
import { PsButton } from './ui/ps-button';
import { PsIcon } from './ui/ps-icon';
@Component({
  selector: 'ps-notification-host',
  imports: [PsButton, PsIcon],
  template: `<dialog
    #dialog
    class="notification"
    [attr.data-kind]="notifications.current()?.kind"
    aria-labelledby="notification-title"
    aria-describedby="notification-description"
    (cancel)="dismiss($event)"
  >
    @if (notifications.current(); as item) {
      <div class="notification-icon" aria-hidden="true">
        <ps-icon
          [action]="
            item.kind === 'success'
              ? 'save'
              : item.kind === 'error'
                ? 'close'
                : item.kind === 'warning'
                  ? 'warning'
                  : 'info'
          "
          size="md"
        />
      </div>
      <h2 id="notification-title">{{ item.title }}</h2>
      <p id="notification-description">{{ item.message }}</p>
      <button #ok psButton type="button" (click)="dismiss()" autofocus>OK</button>
    }
  </dialog>`,
  styleUrl: './notification-modal.scss',
})
export class NotificationModal {
  readonly notifications = inject(NotificationService);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly ok = viewChild<ElementRef<HTMLButtonElement>>('ok');
  private opener: HTMLElement | null = null;
  private pageOpener: HTMLElement | null = null;
  @HostListener('document:focusin', ['$event']) trackFocus(event: FocusEvent) {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      !target.closest('dialog') &&
      target.matches('button,a[href],input,select,textarea,[tabindex]')
    )
      this.pageOpener = target;
  }
  private usable(element: HTMLElement | null) {
    return (
      !!element &&
      element !== document.body &&
      element.isConnected &&
      !element.matches(':disabled') &&
      !element.closest('dialog:not([open])')
    );
  }
  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      const item = this.notifications.current();
      if (!dialog) return;
      if (item) {
        if (!dialog.open) {
          const active = document.activeElement as HTMLElement;
          this.opener = this.usable(active) ? active : this.pageOpener;
          dialog.showModal();
        }
        queueMicrotask(() => this.ok()?.nativeElement.focus());
      } else if (dialog.open) {
        dialog.close();
        const opener = this.opener;
        queueMicrotask(() => {
          if (this.usable(opener)) opener!.focus();
        });
      }
    });
  }
  dismiss(event?: Event) {
    event?.preventDefault();
    this.notifications.dismiss();
  }
}

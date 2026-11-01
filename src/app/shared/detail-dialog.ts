import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ActionIcon } from './action-icon';
@Component({
  selector: 'app-detail-dialog',
  imports: [ActionIcon],
  template: `<dialog
    #dialog
    [attr.aria-labelledby]="titleId"
    (cancel)="dismiss($event)"
    (click)="backdrop($event)"
  >
    <header>
      <h2 [id]="titleId">{{ title() }}</h2>
      <button
        type="button"
        class="icon-button"
        [attr.aria-label]="'Close ' + title()"
        [title]="'Close ' + title()"
        (click)="dismiss()"
        autofocus
      >
        <app-action-icon name="close" />
      </button>
    </header>
    <div class="dialog-content"><ng-content /></div>
  </dialog>`,
  styles: [
    `
      dialog {
        width: min(960px, calc(100% - 32px));
        max-height: 85dvh;
        border: 1px solid #dce4da;
        border-radius: 12px;
        padding: 22px;
        color: #20372c;
        background: white;
        overflow: auto;
      }
      dialog::backdrop {
        background: #102c2a99;
      }
      header {
        position: sticky;
        top: 0;
        background: white;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
      }
      h2 {
        font-size: 19px;
        margin: 0;
      }
      button {
        flex: none;
      }
      button:focus-visible {
        outline: 2px solid #28644a;
        outline-offset: 3px;
      }
      .dialog-content {
        overflow-wrap: anywhere;
        min-width: 0;
      }
      @media (max-width: 600px) {
        dialog {
          padding: 16px;
        }
      }
    `,
  ],
})
export class DetailDialog implements AfterViewInit, OnDestroy {
  readonly title = input.required<string>();
  readonly closed = output<void>();
  readonly titleId = 'detail-dialog-' + crypto.randomUUID();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private opener: HTMLElement | null = null;
  private overflow = '';
  ngAfterViewInit() {
    this.opener = document.activeElement as HTMLElement;
    this.overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.dialog().nativeElement.showModal();
  }
  ngOnDestroy() {
    this.dialog().nativeElement.close();
    document.body.style.overflow = this.overflow;
    const opener = this.opener;
    queueMicrotask(() => {
      if (opener?.isConnected) opener.focus();
    });
  }
  dismiss(event?: Event) {
    event?.preventDefault();
    this.closed.emit();
  }
  backdrop(event: MouseEvent) {
    const dialog = this.dialog().nativeElement;
    const rect = dialog.getBoundingClientRect();
    if (
      event.target === dialog &&
      (event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom)
    )
      this.dismiss();
  }
}

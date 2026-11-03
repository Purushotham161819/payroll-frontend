import {
  AfterViewInit,
  booleanAttribute,
  Component,
  ElementRef,
  OnDestroy,
  input,
  output,
  viewChild,
} from '@angular/core';
import { PsIconButton } from './ps-icon-button';
@Component({
  selector: 'ps-dialog',
  imports: [PsIconButton],
  template: `<dialog #dialog [class.wide]="wide()" [attr.aria-label]="title()" (cancel)="cancel($event)">
    <header>
      <h2 [id]="id">{{ title() }}</h2>
      <button
        psIconButton
        action="close"
        size="sm"
        label="Close"
        [disabled]="busy()"
        (click)="cancel()"
      ></button>
    </header>
    <ng-content />
  </dialog>`,
  styleUrl: './ps-dialog.scss',
})
export class PsDialog implements AfterViewInit, OnDestroy {
  readonly title = input.required<string>();
  readonly busy = input(false);
  readonly wide = input(false, {transform: booleanAttribute});
  readonly closed = output<void>();
  readonly id = 'ps-dialog-' + crypto.randomUUID();
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private opener: HTMLElement | null = null;
  ngAfterViewInit() {
    this.opener = document.activeElement as HTMLElement;
    this.dialog().nativeElement.showModal();
  }
  cancel(event?: Event) {
    event?.preventDefault();
    if (!this.busy()) this.closed.emit();
  }
  ngOnDestroy() {
    this.dialog().nativeElement.close();
    const opener = this.opener;
    queueMicrotask(() => {
      if (opener?.isConnected) opener.focus();
    });
  }
}

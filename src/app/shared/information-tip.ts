import { Component, OnDestroy, input, signal } from '@angular/core';
import { OverlayModule, ConnectedPosition, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { ActionIcon } from './action-icon';
@Component({
  selector: 'app-information-tip',
  imports: [OverlayModule, ActionIcon],
  template: `<button
      type="button"
      class="info-button"
      [attr.aria-label]="label()"
      [attr.aria-describedby]="open() ? tipId : null"
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      (mouseenter)="show()"
      (mouseleave)="scheduleHide()"
      (focus)="show()"
      (blur)="scheduleHide()"
      (click)="show()"
      (keydown.escape)="hide()"
    >
      <app-action-icon name="info" />
    </button>
    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayPush]="true"
      [cdkConnectedOverlayViewportMargin]="8"
      (overlayOutsideClick)="outside($event, origin)"
      (overlayKeydown)="$event.key === 'Escape' && hide()"
    >
      <div
        class="information-tip"
        role="tooltip"
        [id]="tipId"
        (mouseenter)="show()"
        (mouseleave)="scheduleHide()"
      >
        {{ text() }}
      </div>
    </ng-template>`,
  styles: [
    `
      :host {
        display: inline-flex;
        vertical-align: middle;
        flex: none;
      }
      .info-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        min-height: 24px;
        padding: 3px;
        margin: 0;
        border: 0;
        border-radius: 4px;
        background: transparent;
        color: #52705d;
        cursor: pointer;
      }
      .info-button:hover {
        background: #edf5ef;
        color: #20583f;
      }
      .info-button:focus-visible {
        outline: 2px solid #28644a;
        outline-offset: 2px;
      }
      .information-tip {
        box-sizing: border-box;
        max-width: min(300px, calc(100vw - 24px));
        padding: 10px 12px;
        border: 1px solid #dce6df;
        border-radius: 7px;
        background: #fff;
        color: #203d2d;
        box-shadow: 0 6px 20px #102c2a26;
        font-size: 12px;
        font-weight: 400;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }
    `,
  ],
})
export class InformationTip implements OnDestroy {
  readonly label = input.required<string>();
  readonly text = input.required<string>();
  readonly open = signal(false);
  readonly tipId = 'information-tip-' + crypto.randomUUID();
  readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 5 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -5 },
  ];
  private hideTimer?: ReturnType<typeof setTimeout>;
  show() {
    clearTimeout(this.hideTimer);
    this.open.set(true);
  }
  hide() {
    clearTimeout(this.hideTimer);
    this.open.set(false);
  }
  scheduleHide() {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.open.set(false), 120);
  }
  outside(event: MouseEvent, origin: CdkOverlayOrigin) {
    if (!origin.elementRef.nativeElement.contains(event.target as Node)) this.hide();
  }
  ngOnDestroy() {
    clearTimeout(this.hideTimer);
  }
}

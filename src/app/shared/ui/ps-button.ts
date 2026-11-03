import { booleanAttribute, Component, effect, ElementRef, inject, input } from '@angular/core';
import { PsAction } from './action-icons';
import { PsIcon } from './ps-icon';
import { PsTooltip } from './ps-tooltip';

@Component({
  selector: 'button[psButton],a[psButton]', standalone: true, imports: [PsIcon],
  hostDirectives: [{ directive: PsTooltip, inputs: ['psTooltip'] }],
  host: {
    '[attr.data-variant]': 'variant()', '[attr.disabled]': '!isLink && (disabled() || loading()) ? "" : null',
    '[attr.aria-busy]': 'loading() ? "true" : null', '[attr.type]': 'isLink ? null : type()',
    '[class.trailing]': 'iconPosition() === "end"',
  },
  template: '@if(loading()){<span class="spinner" aria-hidden="true"></span>} @else if(icon()){<ps-icon [action]="icon()!" />} <span>@if(loading() && loadingLabel()){ {{loadingLabel()}} }<span [hidden]="loading() && !!loadingLabel()"><ng-content /></span></span>',
  styleUrl: './ps-button.scss',
})
export class PsButton {
  // Preserve native ElementRef-style template queries used by existing focus restoration.
  readonly nativeElement = inject<ElementRef<HTMLButtonElement | HTMLAnchorElement>>(ElementRef).nativeElement;
  readonly isLink = this.nativeElement.tagName === 'A';
  readonly variant = input<'primary' | 'secondary' | 'ghost' | 'danger'>('primary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly loadingLabel = input('');
  readonly icon = input<PsAction | null>(null);
  readonly iconPosition = input<'start' | 'end'>('start');
  constructor() {
    effect(() => {
      if (!this.isLink) (this.nativeElement as HTMLButtonElement).disabled = this.disabled() || this.loading();
    });
  }
}

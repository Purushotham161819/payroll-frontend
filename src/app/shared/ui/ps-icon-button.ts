import { booleanAttribute, Component, ElementRef, inject, input } from '@angular/core';
import { PsAction } from './action-icons';
import { PsIcon } from './ps-icon';
import { PsTooltip } from './ps-tooltip';

@Component({
  selector: 'ps-icon-button,button[psIconButton]', standalone: true, imports: [PsIcon, PsTooltip],
  hostDirectives: [{ directive: PsTooltip, inputs: ['psTooltip'] }],
  host: { '[class.ps-native-icon-button]': 'nativeHost', '[class.sm]': 'nativeHost && size() === "sm"', '[attr.type]': 'nativeHost ? "button" : null', '[attr.aria-label]': 'nativeHost ? label() : null', '[attr.disabled]': 'nativeHost && disabled() ? "" : null' },
  template: `@if(nativeHost){<ps-icon [action]="action()" />}@else{<span [psTooltip]="disabled() ? label() : ''" [attr.tabindex]="disabled() ? 0 : null" [attr.role]="disabled() ? 'group' : null" [attr.aria-label]="disabled() ? label() : null"><button type="button" [attr.aria-label]="label()" [psTooltip]="disabled() ? '' : label()" [disabled]="disabled()" [class.sm]="size() === 'sm'"><ps-icon [action]="action()" /></button></span>}`,
  styles: [':host,span{display:inline-flex} button,:host(.ps-native-icon-button){box-sizing:border-box;display:inline-grid;place-items:center;width:var(--control-height);height:var(--control-height);min-height:var(--control-height);padding:0;border:0;border-radius:var(--radius-md);font:var(--type-button);background:transparent;color:var(--ink-muted);box-shadow:var(--shadow-none);cursor:pointer} button.sm,:host(.ps-native-icon-button.sm){width:var(--icon-button-sm);height:var(--icon-button-sm);min-height:var(--icon-button-sm)} button:hover:not(:disabled),button:active:not(:disabled),:host(.ps-native-icon-button:hover:not(:disabled)),:host(.ps-native-icon-button:active:not(:disabled)){background:var(--surface-hover);color:var(--ink)} button:focus-visible,span:focus-visible,:host(.ps-native-icon-button:focus-visible){outline:var(--focus-width) solid var(--focus-ring);outline-offset:var(--focus-offset)} button:disabled,:host(.ps-native-icon-button:disabled){color:var(--ink-subtle);cursor:not-allowed;opacity:1}'],
})
export class PsIconButton {
  readonly nativeHost = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName === 'BUTTON';
  readonly action = input.required<PsAction>();
  readonly label = input.required<string>();
  readonly size = input<'sm' | 'md'>('md');
  readonly disabled = input(false, { transform: booleanAttribute });
  constructor() { if (this.nativeHost) inject(PsTooltip).setDefaultText(() => this.label()); }
}

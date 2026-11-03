import { AbstractControl, NgControl, Validators } from '@angular/forms';
import { booleanAttribute, ChangeDetectorRef, Component, contentChild, Directive, effect, ElementRef, inject, input } from '@angular/core';
import { PsIcon } from './ps-icon';
import { PsTooltip } from './ps-tooltip';
import { PsNativeSelect } from './ps-native-select';

@Directive({ selector: 'input[psFieldControl],select[psFieldControl],textarea[psFieldControl],ps-select[psFieldControl]', hostDirectives:[PsNativeSelect], host: { '[class.ps-select]': "element.tagName === 'SELECT'", '[class.ps-date]': "element.tagName === 'INPUT' && element.getAttribute('type') === 'date'" }, standalone: true })
export class PsFieldControl {
  readonly element = inject<ElementRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLElement>>(ElementRef).nativeElement;
  readonly ngControl = inject(NgControl, { optional: true, self: true });
}

@Component({
  selector: 'ps-form-field', standalone: true, imports: [PsIcon, PsTooltip],
  host: { '[class.compact]': 'compact()', '[class.ps-field-error]': 'showError()', '[class.choice]': 'choice()', '[class.inline]': 'layout() === "inline"' },
  template: `<label [id]="labelId" [class.sr-label]="layout() === 'hidden-label'" [attr.for]="targetId()" (click)="focusCustomControl($event)">{{label()}}@if(isRequired()){<span class="required" aria-hidden="true">*</span>}@if(info()){<button type="button" class="info" [psTooltip]="info()" aria-label="More information"><ps-icon action="info" /></button>}</label>
    <div class="control"><span class="prefix"><ng-content select="[fieldPrefix]" /></span><ng-content /><span class="suffix"><ng-content select="[fieldSuffix]" /></span></div>
    @if(showError() && errorText()){<p class="error-text" [id]="errorId">{{errorText()}}</p>}@else if(helper()){<p [id]="helperId">{{helper()}}</p>}`,
  styleUrl: './ps-form-field.scss',
})
export class PsFormField {
  readonly label = input.required<string>();
  readonly compact = input(false, { transform: booleanAttribute });
  readonly helper = input('');
  readonly info = input('');
  readonly required = input(false, { transform: booleanAttribute });
  readonly errorText = input('');
  readonly control = input<AbstractControl | null>(null);
  readonly controlId = input('');
  readonly choice = input(false, { transform: booleanAttribute });
  readonly layout = input<'stacked' | 'inline' | 'hidden-label'>('stacked');
  readonly projected = contentChild(PsFieldControl);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly id = 'ps-field-' + crypto.randomUUID();
  readonly labelId = this.id + '-label';
  readonly helperId = this.id + '-help';
  readonly errorId = this.id + '-error';

  constructor() {
    effect(cleanup => {
      const control = this.model();
      this.helper(); this.errorText(); this.controlId();
      this.syncAria();
      const subscription = control?.events.subscribe(() => { this.syncAria(); this.changeDetector.markForCheck(); });
      cleanup(() => { subscription?.unsubscribe(); this.removeDescriptions(); });
    });
  }
  model(): AbstractControl | null { return this.control() ?? this.projected()?.ngControl?.control ?? null; }
  showError(): boolean { const c = this.model(); return !!c && c.invalid && (c.touched || c.dirty); }
  isRequired(): boolean { return this.required() || !!this.model()?.hasValidator(Validators.required); }
  targetId(): string { return this.projected()?.element.id || this.controlId() || this.id; }
  focusCustomControl(event: MouseEvent): void {
    const element = this.projected()?.element;
    // Custom hosts are not native labelable elements; retain label-click focus.
    if (element?.tagName === 'PS-SELECT' && element.getAttribute('aria-disabled') !== 'true' && !(event.target as HTMLElement).closest('button')) element.focus();
  }
  private removeDescriptions(): void {
    const element = this.projected()?.element;
    if (!element) return;
    const ids = (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(id => id && id !== this.helperId && id !== this.errorId);
    if (ids.length) element.setAttribute('aria-describedby', ids.join(' ')); else element.removeAttribute('aria-describedby');
  }
  private syncAria(): void {
    const element = this.projected()?.element;
    if (!element) return;
    if (!element.id) element.id = this.controlId() || this.id;
    this.removeDescriptions();
    if (element.tagName === 'PS-SELECT' && !element.hasAttribute('aria-labelledby')) element.setAttribute('aria-labelledby', this.labelId);
    const description = this.showError() && this.errorText() ? this.errorId : this.helper() ? this.helperId : '';
    if (description) element.setAttribute('aria-describedby', [element.getAttribute('aria-describedby'), description].filter(Boolean).join(' '));
    element.setAttribute('aria-invalid', String(this.showError()));
  }
}

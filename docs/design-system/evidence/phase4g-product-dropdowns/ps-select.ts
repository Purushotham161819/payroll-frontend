import { booleanAttribute, Component, ElementRef, effect, forwardRef, inject, input, OnDestroy, output, signal, TemplateRef, viewChild, ViewContainerRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { PsIcon } from './ps-icon';

export interface PsSelectOption { value: string; label: string; disabled?: boolean; }

/** Single-value form select. Presentation only; option values pass through unchanged. */
@Component({
  selector: 'ps-select', standalone: true, imports: [PsIcon],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PsSelect), multi: true }],
  host: {
    class: 'ps-select-trigger', role: 'combobox', 'aria-haspopup': 'listbox',
    '[attr.tabindex]': 'isDisabled() ? -1 : 0', '[attr.aria-disabled]': 'isDisabled()',
    '[attr.data-value]': 'value()', '[attr.aria-expanded]': 'opened()', '[attr.aria-controls]': 'opened() ? listId : null',
    '[attr.aria-activedescendant]': 'opened() && active() >= 0 ? optionId(active()) : null',
    '[attr.aria-label]': 'ariaLabel() || null', '[class.ps-select-open]': 'opened()',
    '(click)': 'toggle()', '(keydown)': 'key($event)', '(blur)': 'blur()',
    '(window:resize)': 'close(false)',
  },
  template: `<span class="ps-select-value">{{selectedLabel()}}</span><ps-icon class="ps-select-arrow" action="chevronDown" />
    <ng-template #panel><div class="ps-select-panel" [class.ps-select-keyboard]="keyboard()" [id]="listId" role="listbox" [attr.aria-label]="accessibleName() + ' options'" (keydown)="key($event)">
      @for(option of options(); track option.value; let i = $index){
        <div class="ps-select-option" role="option" [id]="optionId(i)" [attr.aria-selected]="option.value === value()" [attr.aria-disabled]="!!option.disabled" [class.ps-select-active]="active() === i" (pointermove)="pointer(i)" (mousedown)="$event.preventDefault()" (click)="choose(i)">
          <span class="ps-select-option-label">{{option.label}}</span>@if(option.value === value()){<ps-icon action="save" />}
        </div>
      } @empty {<div class="ps-select-empty">No options</div>}
    </div></ng-template>`,
})
export class PsSelect implements ControlValueAccessor, OnDestroy {
  readonly options = input<readonly PsSelectOption[]>([]);
  readonly placeholder = input('');
  readonly ariaLabel = input('');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly change = output<void>();
  readonly value = signal<string | null>(null);
  readonly opened = signal(false);
  readonly active = signal(-1);
  readonly keyboard = signal(false);
  readonly formDisabled = signal(false);
  readonly listId = 'ps-select-list-' + crypto.randomUUID();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly overlay = inject(Overlay);
  private readonly view = inject(ViewContainerRef);
  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');
  private ref?: OverlayRef;
  private buffer = '';
  private lastType = 0;
  private onChange: (value: string) => void = () => {};
  private onTouched = () => {};
  constructor(){ effect(()=>{if(this.isDisabled()) this.close(false);}); }
  isDisabled(): boolean { return this.disabled() || this.formDisabled(); }
  selectedLabel(): string { return this.options().find(o => o.value === this.value())?.label ?? this.placeholder(); }
  accessibleName(): string {
    return this.ariaLabel() || (this.element.getAttribute('aria-labelledby') ?? '').split(/\s+/).map(id => this.element.ownerDocument.getElementById(id)?.textContent ?? '').join(' ').trim();
  }
  optionId(i: number): string { return this.listId + '-' + i; }
  writeValue(value: string | null): void { this.value.set(value); }
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(value: boolean): void { this.formDisabled.set(value); if(value) this.close(false); }
  toggle(): void { if(this.opened()) this.close(); else this.open(false); }
  blur(): void { this.onTouched(); }
  open(keyboard = true): void {
    if(this.isDisabled() || this.opened()) return;
    const r = this.element.getBoundingClientRect();
    const below = innerHeight - r.bottom, above = r.top;
    const style = getComputedStyle(this.element);
    const gap = parseFloat(style.getPropertyValue('--space-1'));
    const margin = parseFloat(style.getPropertyValue('--space-2'));
    const clearance = parseFloat(style.getPropertyValue('--space-4'));
    const flip = below < 4 * parseFloat(style.getPropertyValue('--option-height')) + gap && above > below;
    const max = parseFloat(style.getPropertyValue('--menu-max-width'));
    const limit = parseFloat(style.getPropertyValue('--menu-max-height'));
    const position = this.overlay.position().flexibleConnectedTo(this.element).withViewportMargin(margin).withFlexibleDimensions(false).withPush(true).withPositions([
      flip ? {originX:'start',originY:'top',overlayX:'start',overlayY:'bottom',offsetY:-gap} : {originX:'start',originY:'bottom',overlayX:'start',overlayY:'top',offsetY:gap},
    ]);
    // A modal makes body siblings inert: keep the top-layer popover inside its dialog.
    const dialog = this.element.closest('dialog');
    if(dialog) position.withPopoverLocation({type:'parent',element:dialog});
    this.ref = this.overlay.create({positionStrategy:position, scrollStrategy:this.overlay.scrollStrategies.reposition(), minWidth:r.width, maxWidth:innerWidth <= 390 ? r.width : Math.max(r.width,max), maxHeight:Math.min(limit, Math.max(0,(flip ? above : below)-clearance),innerWidth<=390 ? innerHeight/2 : limit), usePopover:true, disposeOnNavigation:true});
    this.buffer = ''; this.lastType = 0;
    this.opened.set(true); this.keyboard.set(keyboard);
    const selected = this.options().findIndex(o => o.value === this.value() && !o.disabled);
    this.active.set(selected >= 0 ? selected : this.options().findIndex(o => !o.disabled));
    this.ref.attach(new TemplatePortal(this.panel(),this.view));
    this.ref.outsidePointerEvents().subscribe(event => { if(!this.element.contains(event.target as Node)) this.close(false); });
    this.ref.keydownEvents().subscribe(event => { if(event.target !== this.element) this.key(event); });
    this.reveal();
  }
  close(focus = true): void {
    if(!this.opened()) return;
    this.opened.set(false); this.ref?.dispose(); this.ref = undefined;
    if(focus) this.element.focus();
  }
  choose(i: number): void {
    const option = this.options()[i]; if(!option || option.disabled || this.isDisabled()) return;
    const changed = option.value !== this.value(); this.value.set(option.value);
    if(changed) { this.onChange(option.value); this.change.emit(); }
    this.onTouched(); this.close();
  }
  pointer(i: number): void { this.keyboard.set(false); if(!this.options()[i]?.disabled) this.active.set(i); }
  key(event: KeyboardEvent): void {
    if(this.isDisabled()) return;
    const key = event.key;
    if(key === 'Tab'){ this.close(false); return; }
    if(key === 'Escape'){ if(this.opened()){event.preventDefault();event.stopPropagation();this.close();} return; }
    if(['Enter',' ','ArrowDown','ArrowUp'].includes(key) && !this.opened()){event.preventDefault();this.open();return;}
    if(['Enter',' '].includes(key) && this.opened()){event.preventDefault();this.choose(this.active());return;}
    const options = this.options(), enabled = options.map((o,i)=>o.disabled ? -1 : i).filter(i=>i>=0);
    if(!enabled.length) return;
    let target: number | undefined;
    const index = enabled.indexOf(this.active());
    if(['ArrowDown','ArrowUp','Home','End','PageDown','PageUp'].includes(key)){
      event.preventDefault(); if(!this.opened()) this.open();
      const rowHeight = this.ref?.overlayElement.querySelector('[role=option]')?.getBoundingClientRect().height || parseFloat(getComputedStyle(this.element).getPropertyValue('--option-height'));
      const page = Math.max(1,Math.floor((this.ref?.overlayElement.clientHeight ?? rowHeight)/rowHeight));
      target = key==='Home' ? enabled[0] : key==='End' ? enabled.at(-1) : enabled[Math.max(0,Math.min(enabled.length-1,index+(key==='ArrowDown'?1:key==='ArrowUp'?-1:key==='PageDown'?page:-page)))];
    } else if(key.length===1 && !event.ctrlKey && !event.metaKey && !event.altKey){
      event.preventDefault(); if(!this.opened()) this.open();
      const now = Date.now(); this.buffer = now-this.lastType > 700 ? key : this.buffer+key; this.lastType = now;
      const term = /^(.)\1+$/.test(this.buffer) ? key : this.buffer;
      const start = term.length===1 ? this.active()+1 : this.active();
      target = Array.from({length:options.length},(_,i)=>(Math.max(0,start)+i)%options.length).find(i=>!options[i].disabled && options[i].label.toLocaleLowerCase().startsWith(term.toLocaleLowerCase()));
    }
    if(target !== undefined){this.active.set(target);this.keyboard.set(true);this.reveal();}
  }
  private reveal(): void { requestAnimationFrame(()=>this.ref?.overlayElement.querySelector('#'+this.optionId(this.active()))?.scrollIntoView({block:'nearest'})); }
  ngOnDestroy(): void { this.close(false); }
}

import { Directive, ElementRef, forwardRef, HostListener, inject, OnInit, Renderer2 } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { formatInr, isCurrencyNumber, parseInrInput } from './inr-format';

/** Opt in on text inputs. Never rewrites input text during typing or composition. */
@Directive({
  selector: 'input[psInrInput]',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PsInrInputDirective), multi: true }],
})
export class PsInrInputDirective implements ControlValueAccessor, OnInit {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private value: number | null = null;
  private focused = false;
  private composing = false;
  private validText = true;
  private change: (value: number | null) => void = () => {};
  private touched: () => void = () => {};

  ngOnInit(): void {
    if (this.input.type !== 'text') {
      throw new Error('psInrInput requires a text input; native number inputs cannot display currency grouping.');
    }
    if (!this.input.hasAttribute('inputmode')) this.renderer.setAttribute(this.input, 'inputmode', 'decimal');
  }

  writeValue(value: number | null | undefined): void {
    this.value = isCurrencyNumber(value) ? value : null;
    this.validText = true;
    this.render();
  }

  registerOnChange(change: (value: number | null) => void): void { this.change = change; }
  registerOnTouched(touched: () => void): void { this.touched = touched; }
  setDisabledState(disabled: boolean): void { this.renderer.setProperty(this.input, 'disabled', disabled); }

  @HostListener('focus')
  focus(): void {
    this.focused = true;
    if (this.validText) this.render();
  }

  @HostListener('input')
  inputChanged(): void {
    if (this.composing) return;
    const raw = this.input.value.trim();
    // No grouping/symbol stripping or parseFloat prefix acceptance during editing.
    const numeric = parseInrInput(raw);
    this.validText = raw === '' || numeric !== null;
    this.value = numeric;
    this.change(this.value);
  }

  @HostListener('compositionstart')
  compositionStart(): void { this.composing = true; }

  @HostListener('compositionend')
  compositionEnd(): void { this.composing = false; this.inputChanged(); }

  @HostListener('blur')
  blur(): void {
    this.focused = false;
    if (this.validText) this.render();
    this.touched();
  }

  private render(): void {
    const text = this.value === null ? '' : this.focused ? String(this.value) : formatInr(this.value, true);
    this.renderer.setProperty(this.input, 'value', text);
  }
}

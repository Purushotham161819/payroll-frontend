import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { PsFieldControl, PsFormField } from './ps-form-field';
import { PsInrInputDirective } from './pipes/ps-inr-input.directive';

@Component({ changeDetection: ChangeDetectionStrategy.Default, imports: [ReactiveFormsModule, PsFormField, PsFieldControl, PsInrInputDirective], template: '<ps-form-field label="Annual CTC" helper="Amount in INR" errorText="Existing required/min error" [info]="info"><input id="amount" type="text" psFieldControl psInrInput [formControl]="amount" aria-describedby="existing-help"></ps-form-field><p id="existing-help">Original helper</p>' })
class Host { amount = new FormControl<number | null>(null, [Validators.required, Validators.min(0)]); info = ''; }

@Component({ changeDetection: ChangeDetectionStrategy.Default, imports: [ReactiveFormsModule, PsFormField, PsFieldControl], template: '<ps-form-field label="Choice" [choice]="true"><input psFieldControl type="checkbox" [formControl]="choice"></ps-form-field><ps-form-field label="Option" [choice]="true"><input psFieldControl type="radio" name="option" value="one" [formControl]="option"></ps-form-field><ps-form-field label="Notes"><textarea psFieldControl [formControl]="notes"></textarea></ps-form-field><ps-form-field label="Country"><select psFieldControl [formControl]="country"><option value="IN">India</option></select></ps-form-field><ps-form-field label="Number"><input type="number" min="0" max="100" psFieldControl [formControl]="number"></ps-form-field><ps-form-field label="Date" [compact]="compact"><input type="date" psFieldControl [formControl]="date"></ps-form-field><ps-form-field label="Setting" choice><input type="checkbox" role="switch" psFieldControl [formControl]="toggle"></ps-form-field>' })
class Choices { compact = false; choice = new FormControl(false); option = new FormControl('one'); notes = new FormControl('draft'); country = new FormControl('IN'); number = new FormControl(12); date = new FormControl('2026-09-15'); toggle = new FormControl(false); }

describe('PsFormField', () => {
  it('associates label/helper without changing existing validators, model or forms', () => {
    const f = TestBed.createComponent(Host); const c = f.componentInstance.amount; const validator = c.validator;
    f.changeDetectorRef.markForCheck(); f.detectChanges(); const input = f.nativeElement.querySelector('input') as HTMLInputElement;
    expect(f.nativeElement.querySelector('label').htmlFor).toBe('amount');
    expect(f.nativeElement.querySelector('.required').textContent).toBe('*');
    expect(input.getAttribute('aria-describedby')).toContain('existing-help');
    expect(input.getAttribute('aria-describedby')).toContain('-help');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(c.validator).toBe(validator); expect(c.pristine).toBe(true); expect(c.untouched).toBe(true); expect(c.value).toBeNull();
    expect(f.nativeElement.querySelector('.error-text')).toBeNull();
  });
  it('reads existing touched/errors, preserves description IDs and reflects disabled state', () => {
    const f = TestBed.createComponent(Host); f.changeDetectorRef.markForCheck(); f.detectChanges(); const c = f.componentInstance.amount;
    c.markAsTouched(); f.changeDetectorRef.markForCheck(); f.detectChanges();
    const input = f.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain('existing-help');
    expect(input.getAttribute('aria-describedby')).toContain('-error');
    expect(f.nativeElement.querySelector('.error-text').textContent).toBe('Existing required/min error');
    c.setValue(75000); f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(input.value).toBe('₹75,000'); expect(c.value).toBe(75000); expect(input.getAttribute('aria-invalid')).toBe('false');
    c.disable(); f.changeDetectorRef.markForCheck(); f.detectChanges(); expect(input.disabled).toBe(true); expect(c.value).toBe(75000);
  });
  it('only enables currency formatting when explicitly opted into by the projected control', () => {
    const f = TestBed.createComponent(Host); f.changeDetectorRef.markForCheck(); f.detectChanges();
    const input = f.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new FocusEvent('focus')); input.value = '125500.505'; input.dispatchEvent(new Event('input')); input.dispatchEvent(new FocusEvent('blur')); f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(f.componentInstance.amount.value).toBe(125500.505); expect(input.value).toBe('₹1,25,500.505');
  });
  it('supports native choice, textarea and select controls with generated accessible IDs', () => {
    const f = TestBed.createComponent(Choices); f.changeDetectorRef.markForCheck(); f.detectChanges();
    const controls = [...f.nativeElement.querySelectorAll('input,textarea,select')] as HTMLElement[];
    const labels = [...f.nativeElement.querySelectorAll('label')] as HTMLLabelElement[];
    expect(new Set(controls.map(c => c.id)).size).toBe(7);
    controls.forEach((c, i) => expect(labels[i].htmlFor).toBe(c.id));
    (controls[0] as HTMLInputElement).click(); f.changeDetectorRef.markForCheck(); f.detectChanges(); expect(f.componentInstance.choice.value).toBe(true);
    expect(f.componentInstance.option.value).toBe('one'); expect(f.componentInstance.notes.value).toBe('draft');
    expect(f.componentInstance.country.value).toBe('IN');
    const number = controls[4] as HTMLInputElement;
    expect(number.type).toBe('number'); expect(number.value).toBe('12');
    number.value = '-1'; number.dispatchEvent(new Event('input')); f.detectChanges();
    expect(f.componentInstance.number.value).toBe(-1); expect(f.componentInstance.number.hasError('min')).toBe(true);
    expect((controls[5] as HTMLInputElement).type).toBe('date'); expect(f.componentInstance.date.value).toBe('2026-09-15');
    (controls[6] as HTMLInputElement).click(); f.detectChanges(); expect(f.componentInstance.toggle.value).toBe(true);
  });
  it('opts into compact presentation without replacing the native date control or changing form state', () => {
    const f = TestBed.createComponent(Choices); f.changeDetectorRef.markForCheck(); f.detectChanges();
    const control = f.nativeElement.querySelector('input[type=date]') as HTMLInputElement;
    const field = control.closest('ps-form-field')!; const model = f.componentInstance.date; const validator = model.validator;
    expect(field.classList.contains('compact')).toBe(false);
    f.componentInstance.compact = true; f.changeDetectorRef.markForCheck(); f.detectChanges();
    expect(field.classList.contains('compact')).toBe(true); expect(f.nativeElement.querySelector('input[type=date]')).toBe(control);
    expect(control.value).toBe('2026-09-15'); expect(model.value).toBe('2026-09-15'); expect(model.pristine).toBe(true); expect(model.untouched).toBe(true); expect(model.validator).toBe(validator);
  });
  it('offers a keyboard-focusable info tooltip without submitting the form', () => {
    const f = TestBed.createComponent(Host); f.componentInstance.info = 'Existing field explanation'; f.changeDetectorRef.markForCheck(); f.detectChanges();
    const info = f.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(info.type).toBe('button'); expect(info.getAttribute('aria-label')).toBe('More information');
    info.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(document.querySelector('[role=tooltip]')?.textContent).toBe('Existing field explanation');
    info.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('[role=tooltip]')).toBeNull();
  });
});

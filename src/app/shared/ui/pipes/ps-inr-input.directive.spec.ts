import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PsInrInputDirective } from './ps-inr-input.directive';

@Component({
  imports: [ReactiveFormsModule, PsInrInputDirective],
  template: '<input type="text" psInrInput [formControl]="control">',
})
class Host {
  readonly control = new FormControl<number | null>(1000000, [Validators.required, Validators.min(0)]);
}

@Component({
  imports: [FormsModule, PsInrInputDirective],
  template: '<input type="text" psInrInput name="amount" [(ngModel)]="value" required>',
})
class TemplateHost { value: number | null = 75000; }

describe('PsInrInputDirective', () => {
  async function setup(control?: FormControl<number | null>) {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    if (control) Object.defineProperty(fixture.componentInstance, 'control', { value: control });
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    return { fixture, input, control: fixture.componentInstance.control };
  }
  function event(input: HTMLInputElement, name: string) { input.dispatchEvent(new Event(name)); }
  function type(input: HTMLInputElement, value: string) { input.value = value; event(input, 'input'); }

  it('formats on blur and exposes the exact raw number on focus without model emissions', async () => {
    const { input, control } = await setup();
    const changes: unknown[] = [];
    control.valueChanges.subscribe(v => changes.push(v));
    expect(input.value).toBe('₹10,00,000');
    event(input, 'focus');
    expect(input.value).toBe('1000000');
    event(input, 'blur');
    expect(input.value).toBe('₹10,00,000');
    expect(control.value).toBe(1000000);
    expect(control.dirty).toBe(false);
    expect(control.touched).toBe(true);
    expect(changes).toEqual([]);
  });

  it('keeps intermediate decimals and cursor position while typing/editing', async () => {
    const { input, control } = await setup();
    event(input, 'focus');
    for (const raw of ['1', '12', '125500', '125500.', '125500.5', '125500.50']) {
      type(input, raw);
      expect(input.value).toBe(raw);
      expect(control.value).toBe(Number(raw));
    }
    input.setSelectionRange(3, 3);
    event(input, 'input');
    expect(input.selectionStart).toBe(3);
    event(input, 'blur');
    expect(input.value).toBe('₹1,25,500.50');
    event(input, 'focus');
    type(input, '75000');
    event(input, 'blur');
    expect(control.value).toBe(75000);
    expect(input.value).toBe('₹75,000');
  });

  it('preserves higher precision through repeated focus/blur and edits', async () => {
    const { input, control } = await setup();
    event(input, 'focus');
    type(input, '125500.505');
    event(input, 'blur');
    expect(input.value).toBe('₹1,25,500.505');
    expect(control.value).toBe(125500.505);
    for (let i = 0; i < 3; i++) { event(input, 'focus'); event(input, 'blur'); }
    expect(control.value).toBe(125500.505);
    control.setValue(1e-23);
    expect(input.value).toBe('₹1e-23');
    event(input, 'focus'); event(input, 'blur');
    expect(control.value).toBe(1e-23);
  });

  it('handles deletion, empty input and zero without coercing empty to zero', async () => {
    const { input, control } = await setup();
    event(input, 'focus');
    type(input, '100'); type(input, '10'); type(input, '1'); type(input, '');
    expect(control.value).toBeNull();
    expect(control.hasError('required')).toBe(true);
    event(input, 'blur');
    expect(input.value).toBe('');
    event(input, 'focus'); type(input, '0'); event(input, 'blur');
    expect(input.value).toBe('₹0.00');
    expect(control.value).toBe(0);
    control.reset();
    expect(input.value).toBe('');
    expect(control.pristine).toBe(true);
  });

  it('retains existing validators and numeric model types', async () => {
    const { input, control } = await setup();
    const validator = control.validator;
    event(input, 'focus'); type(input, '-4500'); event(input, 'blur');
    expect(input.value).toBe('−₹4,500');
    expect(control.value).toBe(-4500);
    expect(control.hasError('min')).toBe(true);
    expect(control.validator).toBe(validator);
    expect(typeof control.value).toBe('number');
  });

  it.each(['abc', '12bad', '1.2.3', '-', '.', 'NaN', 'Infinity', '1e3', '₹1,000', '1,000',
    '10000000000000001', '1.0000000000000001', '0.' + '0'.repeat(324) + '1']) (
    'does not silently accept or partially parse invalid entry %s', async raw => {
      const { input, control } = await setup();
      event(input, 'focus'); type(input, raw); event(input, 'blur');
      expect(input.value).toBe(raw);
      expect(control.value).toBeNull();
      expect(control.hasError('required')).toBe(true);
      event(input, 'focus');
      expect(input.value).toBe(raw);
    },
  );

  it.each([['.5', 0.5, '₹0.50'], ['+00075.000', 75, '₹75'],
    ['-0.00', -0, '₹0.00'], ['1.2345678901234567', 1.2345678901234567, '₹1.2345678901234567']])(
    'accepts precise decimal entry %s', async (raw, value, formatted) => {
      const { input, control } = await setup();
      event(input, 'focus'); type(input, raw as string); event(input, 'blur');
      expect(control.value).toBe(value);
      expect(input.value).toBe(formatted);
    },
  );

  it('buffers IME composition and emits the completed numeric entry once', async () => {
    const { input, control } = await setup();
    const changes: unknown[] = [];
    control.valueChanges.subscribe(v => changes.push(v));
    event(input, 'focus'); event(input, 'compositionstart'); type(input, '75');
    expect(control.value).toBe(1000000);
    event(input, 'compositionend');
    expect(changes).toEqual([75]);
  });

  it('respects updateOn blur and disabled state', async () => {
    const model = new FormControl<number | null>(75000, { updateOn: 'blur' });
    const { input, control, fixture } = await setup(model);
    event(input, 'focus'); type(input, '0.5');
    expect(control.value).toBe(75000);
    event(input, 'blur');
    expect(control.value).toBe(0.5);
    expect(input.value).toBe('₹0.50');
    control.disable(); fixture.detectChanges(); expect(input.disabled).toBe(true);
    control.enable(); fixture.detectChanges(); expect(input.disabled).toBe(false);
  });

  it('supports existing template-driven numeric bindings', async () => {
    await TestBed.configureTestingModule({ imports: [TemplateHost] }).compileComponents();
    const fixture = TestBed.createComponent(TemplateHost);
    fixture.detectChanges(); await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('₹75,000');
    event(input, 'focus'); type(input, '125500.5'); event(input, 'blur');
    await fixture.whenStable();
    expect(fixture.componentInstance.value).toBe(125500.5);
    expect(input.value).toBe('₹1,25,500.50');
  });

  it('rejects native number inputs rather than silently changing their type or validators', async () => {
    TestBed.overrideComponent(Host, { set: { template: '<input type="number" psInrInput [formControl]="control">' } });
    const fixture = TestBed.createComponent(Host);
    expect(() => fixture.detectChanges()).toThrow(/requires a text input/);
  });
});

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { PsSelect } from './ps-select';
import { PsFieldControl, PsFormField } from './ps-form-field';

@Component({changeDetection:ChangeDetectionStrategy.Default, imports:[ReactiveFormsModule,PsSelect,PsFormField,PsFieldControl], template:`<ps-form-field label="Period" helper="Existing helper" errorText="Required"><ps-select psFieldControl [options]="options" [formControl]="period" aria-describedby="existing" /></ps-form-field><p id="existing">Original description</p>`})
class Host {
  period = new FormControl<string | null>(null,Validators.required);
  options = [{value:'2026-01',label:'January 2026'},{value:'2026-02',label:'February 2026'},{value:'2026-03',label:'March 2026',disabled:true}];
}
describe('PsSelect form contract',()=>{
  const setup=()=>{const f=TestBed.createComponent(Host);f.detectChanges();return {f,c:f.componentInstance.period,s:f.debugElement.query(By.directive(PsSelect)).componentInstance as PsSelect,el:f.nativeElement.querySelector('ps-select') as HTMLElement};};
  it('preserves validators, reset values and pristine/untouched state on model writes',()=>{
    const {f,c,s,el}=setup();const validator=c.validator;const values:unknown[]=[];c.valueChanges.subscribe(v=>values.push(v));
    c.setValue('2026-02');f.detectChanges();expect(s.value()).toBe('2026-02');expect(s.selectedLabel()).toBe('February 2026');
    expect(c.validator).toBe(validator);expect(c.pristine).toBe(true);expect(c.untouched).toBe(true);expect(values).toEqual(['2026-02']);
    c.reset();f.detectChanges();expect(s.value()).toBeNull();expect(c.invalid).toBe(true);expect(el.getAttribute('aria-describedby')).toContain('existing');
    expect(el.getAttribute('aria-labelledby')).toBe(f.nativeElement.querySelector('label').id);
    f.nativeElement.querySelector('label').click(); expect(document.activeElement).toBe(el);
  });
  it('emits the exact option value once, before the preserved change handler, and marks touched',()=>{
    const {f,c,s,el}=setup();const events:string[]=[];c.valueChanges.subscribe(v=>events.push('value:'+v));s.change.subscribe(()=>events.push('change:'+c.value));
    s.choose(1);f.detectChanges();expect(c.value).toBe('2026-02');expect(events).toEqual(['value:2026-02','change:2026-02']);expect(c.dirty).toBe(true);expect(c.touched).toBe(true);
    expect(el.getAttribute('aria-invalid')).toBe('false');s.choose(1);expect(events).toHaveLength(2);
  });
  it('keeps disabled options and disabled controls inert, preserves unknown stored values and errors',()=>{
    const {f,c,s,el}=setup();s.choose(2);expect(c.value).toBeNull();c.markAsTouched();f.detectChanges();expect(el.getAttribute('aria-invalid')).toBe('true');expect(el.getAttribute('aria-describedby')).toContain('-error');
    c.setValue('existing-unlisted');c.disable();f.detectChanges();s.choose(0);s.key(new KeyboardEvent('keydown',{key:'Enter'}));
    expect(c.value).toBe('existing-unlisted');expect(s.value()).toBe('existing-unlisted');expect(s.opened()).toBe(false);expect(el.getAttribute('aria-disabled')).toBe('true');expect(el.tabIndex).toBe(-1);
  });
});

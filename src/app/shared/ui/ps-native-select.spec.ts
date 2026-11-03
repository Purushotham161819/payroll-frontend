import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { PsFieldControl, PsFormField } from './ps-form-field';
import { PsNativeSelect } from './ps-native-select';

@Component({changeDetection:ChangeDetectionStrategy.Default,imports:[ReactiveFormsModule,PsFieldControl,PsFormField],template:`<ps-form-field label="Existing choice" errorText="Required"><select psFieldControl [formControl]="choice" (change)="events.push(choice.value)"><option [ngValue]="null">Choose</option><option [ngValue]="record">Object value</option><option value="plain">Plain string</option><option value="blocked" disabled>Blocked</option></select></ps-form-field>`})
class Host {record={id:'original'};choice=new FormControl<unknown>(null,Validators.required);events:unknown[]=[];}
describe('PsNativeSelect value preservation',()=>{
  const setup=()=>{const f=TestBed.createComponent(Host);f.detectChanges();return {f,host:f.componentInstance,el:f.nativeElement.querySelector('select') as HTMLSelectElement,adapter:f.debugElement.query(By.directive(PsNativeSelect)).injector.get(PsNativeSelect)};};
  it('retains the exact native element, validator and pristine/untouched state',()=>{
    const {f,host,el}=setup();const validator=host.choice.validator;host.choice.setValue(host.record);f.detectChanges();
    expect(f.nativeElement.querySelector('select')).toBe(el);expect(host.choice.value).toBe(host.record);expect(host.choice.validator).toBe(validator);expect(host.choice.pristine).toBe(true);expect(host.choice.untouched).toBe(true);expect(el.getAttribute('data-ps-menu')).toBe('enhanced');
  });
  it('uses the original Angular value accessor for object/null/string values and original handlers',()=>{
    const {f,host,el,adapter}=setup();adapter.commit(el.options[1].value);f.detectChanges();expect(host.choice.value).toBe(host.record);expect(host.events).toEqual([host.record]);
    adapter.commit('plain');f.detectChanges();expect(host.choice.value).toBe('plain');adapter.commit(el.options[0].value);f.detectChanges();expect(host.choice.value).toBeNull();expect(host.choice.invalid).toBe(true);expect(host.events).toEqual([host.record,'plain',null]);
    el.dispatchEvent(new Event('blur'));f.detectChanges();expect(host.choice.touched).toBe(true);expect(el.getAttribute('aria-invalid')).toBe('true');
  });
  it('keeps disabled values inert and follows model resets and dynamically replaced options without emitting',()=>{
    const {f,host,el,adapter}=setup();adapter.commit('blocked');expect(host.choice.value).toBeNull();host.choice.disable();f.detectChanges();adapter.commit('plain');expect(host.choice.value).toBeNull();expect(host.events).toEqual([]);
    host.choice.enable();host.choice.setValue('plain');f.detectChanges();host.choice.reset();f.detectChanges();expect(host.choice.value).toBeNull();expect(host.choice.pristine).toBe(true);expect(host.events).toEqual([]);
    el.options[2].text='A much longer updated option label';const option=new Option('Dynamic value','dynamic');el.add(option);adapter.commit('dynamic');f.detectChanges();expect(host.choice.value).toBe('dynamic');expect(host.events).toEqual(['dynamic']);
  });
});

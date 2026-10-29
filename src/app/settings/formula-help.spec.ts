import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting,HttpTestingController} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {Settings} from './settings';
describe('Compact formula help',()=>{
 it('hides help by default, opens concise examples with an accessible button, and preserves the formula',async()=>{
  await TestBed.configureTestingModule({imports:[Settings],providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]}).compileComponents();
  const fixture=TestBed.createComponent(Settings),http=TestBed.inject(HttpTestingController),page=fixture.componentInstance;
  fixture.detectChanges();http.expectOne(r=>r.url.endsWith('/salary-components')).flush([]);
  page.draft={...page.empty(),calculationType:'formula',formula:'IF(annualCtc>0,1,0)'};page.modal.set(true);fixture.detectChanges();await fixture.whenStable();
  expect(fixture.nativeElement.querySelector('.condition-builder')).toBeNull();expect(fixture.nativeElement.querySelector('#formula-help')).toBeNull();
  const button:HTMLButtonElement=fixture.nativeElement.querySelector('button[aria-label="Formula help"]');expect(button.getAttribute('aria-expanded')).toBe('false');button.click();fixture.detectChanges();
  const help=fixture.nativeElement.querySelector('#formula-help');expect(help.textContent).toContain('MIN(Annual Core Wages, Annual EPF Ceiling Limit)');expect(help.textContent).toContain('MAX(Annual Basic Salary, 15000)');expect(help.textContent).toContain('IF(Compliance Wage Base');expect(button.getAttribute('aria-expanded')).toBe('true');
  button.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));fixture.detectChanges();expect(fixture.nativeElement.querySelector('#formula-help')).toBeNull();expect(page.draft.formula).toBe('IF(annualCtc>0,1,0)');
  page.variableToInsert='annualCtc';page.insertVariable();expect(page.draft.formula).toBe('IF(annualCtc>0,1,0)annualCtc');http.verify();
 });
});

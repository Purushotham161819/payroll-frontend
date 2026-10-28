import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { StatutoryDeductionsPage } from './statutory-deductions';

describe('Statutory deduction settings form', () => {
  const url = 'http://localhost:3000/settings/statutory-deductions';
  const values = {wageCap:15000,epfEmployerContributionPercentage:12,epsEmployerContributionPercentage:8.33,epfEmployeeContributionPercentage:12,esiEmployerContributionPercentage:3.25,esiEmployeeContributionPercentage:0.75};
  async function setup(data: object | null) {
    await TestBed.configureTestingModule({imports:[StatutoryDeductionsPage],providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]}).compileComponents();
    const fixture = TestBed.createComponent(StatutoryDeductionsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); http.expectOne(url).flush(data); fixture.detectChanges(); await fixture.whenStable();
    return {fixture,http};
  }
  it('starts with seven blank inputs and rejects missing, negative and excessive values', async () => {
    const {fixture,http} = await setup(null);
    const inputs = Array.from(fixture.nativeElement.querySelectorAll('input')) as HTMLInputElement[];
    expect(inputs.length).toBe(7); expect(inputs.every(i => i.value === '')).toBe(true);
    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.invalid').length).toBe(6);
    for (const [input,value] of [[inputs[0],'-1'],[inputs[2],'101']] as const) { input.value=value; input.dispatchEvent(new Event('input')); }
    await fixture.whenStable(); fixture.detectChanges();
    form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    http.expectNone(url); http.verify();
  });
  it('shows independent INR ceilings and sends only a configured ESI value', async () => {
    const {fixture,http} = await setup({...values, annualEsiCeilingLimit: 250000.25});
    expect(fixture.nativeElement.textContent).toContain('Annual EPF Ceiling Limit');
    expect(fixture.nativeElement.textContent).toContain('Annual ESI Wage Ceiling Limit');
    expect(fixture.nativeElement.textContent).toContain('₹15,000.00');
    expect(fixture.nativeElement.textContent).toContain('₹2,50,000.25');
    const esi: HTMLInputElement = fixture.nativeElement.querySelector('#annualEsiCeilingLimit');
    esi.value='300000.75'; esi.dispatchEvent(new Event('input')); await fixture.whenStable();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    const save = http.expectOne(url);
    expect(save.request.body).toEqual({...values, annualEsiCeilingLimit:300000.75});
    save.flush({...values, annualEsiCeilingLimit:300000.75}); fixture.detectChanges(); http.verify();
  });
  it('loads metadata-bearing records, sends only configuration fields, preserves failed edits and resets', async () => {
    const {fixture,http} = await setup({...values,_id:'current',createdAt:'2026-10-27',updatedAt:'2026-10-27',__v:0});
    const cap: HTMLInputElement = fixture.nativeElement.querySelector('#wageCap');
    expect(cap.value).toBe('15000'); cap.value='16000'; cap.dispatchEvent(new Event('input')); await fixture.whenStable();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})); fixture.detectChanges();
    const save = http.expectOne(url); expect(save.request.method).toBe('PUT'); expect(save.request.body).toEqual({...values,wageCap:16000});
    expect(fixture.nativeElement.querySelector('button[type=submit]').disabled).toBe(true);
    save.flush({message:'Save unavailable'},{status:503,statusText:'Unavailable'}); fixture.detectChanges();
    expect(cap.value).toBe('16000'); expect(fixture.nativeElement.textContent).toContain('Save unavailable');
    fixture.nativeElement.querySelector('button[type=button]').click(); fixture.detectChanges(); await fixture.whenStable();
    expect(cap.value).toBe('15000');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    http.expectOne(url).flush(values); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Statutory deduction settings saved.'); http.verify();
  });
});

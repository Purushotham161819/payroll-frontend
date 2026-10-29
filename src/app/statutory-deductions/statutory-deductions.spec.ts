import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { StatutoryDeductionsPage } from './statutory-deductions';

describe('Statutory deduction settings form', () => {
  const url = 'http://localhost:3000/settings/statutory-deductions';
  const values = {wageCap:15000,epfEmployerContributionPercentage:12,epsEmployerContributionPercentage:8.33,epfEmployeeContributionPercentage:12,esiEmployerContributionPercentage:3.25,esiEmployeeContributionPercentage:0.75};
  const {epfEmployeeContributionPercentage,esiEmployeeContributionPercentage,...visibleValues}=values;
  async function setup(data: object | null) {
    await TestBed.configureTestingModule({imports:[StatutoryDeductionsPage],providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]}).compileComponents();
    const fixture = TestBed.createComponent(StatutoryDeductionsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); http.expectOne(url).flush(data); fixture.detectChanges(); await fixture.whenStable();
    return {fixture,http};
  }
  it('starts with five blank inputs and rejects missing, negative and excessive values', async () => {
    const {fixture,http} = await setup(null);
    const inputs = Array.from(fixture.nativeElement.querySelectorAll('input[type=number]')) as HTMLInputElement[];
    expect(fixture.nativeElement.querySelector('input[type=checkbox]').checked).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('EPF Employee Contribution');
    expect(fixture.nativeElement.textContent).not.toContain('ESI Employee Contribution');
    for(const name of ['EPF','EPS','ESI'])expect(fixture.nativeElement.textContent).toContain(name+' Employer Contribution Rate (%)');
    expect(inputs.length).toBe(5); expect(inputs.every(i => i.value === '')).toBe(true);
    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.invalid').length).toBe(4);
    for (const [input,value] of [[inputs[0],'-1'],[inputs[2],'101']] as const) { input.value=value; input.dispatchEvent(new Event('input')); }
    await fixture.whenStable(); fixture.detectChanges();
    form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    http.expectNone(url); http.verify();
  });
  it('shows independent INR ceilings and sends only a configured ESI value', async () => {
    const {fixture,http} = await setup({...values, annualEsiCeilingLimit: 250000.25});
    expect(fixture.nativeElement.textContent).toContain('Annual EPF Ceiling Limit');
    expect(fixture.nativeElement.textContent).toContain('Annual ESI Wage Ceiling Limit');
    expect(fixture.nativeElement.textContent).toContain('\u20b915,000.00');
    expect(fixture.nativeElement.textContent).toContain('\u20b92,50,000.25');
    const esi: HTMLInputElement = fixture.nativeElement.querySelector('#annualEsiCeilingLimit');
    esi.value='300000.75'; esi.dispatchEvent(new Event('input')); await fixture.whenStable();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    const save = http.expectOne(url);
    expect(save.request.body).toEqual({...visibleValues,isEpfCeilingApplicable:false, annualEsiCeilingLimit:300000.75});
    save.flush({...values, annualEsiCeilingLimit:300000.75}); fixture.detectChanges(); http.verify();
  });
  it('loads, saves and resets the ceiling applicability checkbox independently of numeric fields',async()=>{
    const {fixture,http}=await setup({...values,isEpfCeilingApplicable:true});
    const checkbox:HTMLInputElement=fixture.nativeElement.querySelector('input[type=checkbox]');
    expect(checkbox.checked).toBe(true);checkbox.click();await fixture.whenStable();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    const save=http.expectOne(url);expect(save.request.body.isEpfCeilingApplicable).toBe(false);save.flush({...values,isEpfCeilingApplicable:false});fixture.detectChanges();
    checkbox.click();await fixture.whenStable();fixture.nativeElement.querySelector('button[type=button]').click();fixture.detectChanges();await fixture.whenStable();expect(checkbox.checked).toBe(false);http.verify();
  });
  it('loads metadata-bearing records, sends only configuration fields, preserves failed edits and resets', async () => {
    const {fixture,http} = await setup({...values,_id:'current',createdAt:'2026-10-27',updatedAt:'2026-10-27',__v:0});
    const cap: HTMLInputElement = fixture.nativeElement.querySelector('#wageCap');
    expect(fixture.componentInstance.draft).not.toHaveProperty('epfEmployeeContributionPercentage');
    expect(fixture.componentInstance.draft).not.toHaveProperty('esiEmployeeContributionPercentage');
    expect(cap.value).toBe('15000'); cap.value='16000'; cap.dispatchEvent(new Event('input')); await fixture.whenStable();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})); fixture.detectChanges();
    const save = http.expectOne(url); expect(save.request.method).toBe('PUT'); expect(save.request.body).toEqual({...visibleValues,isEpfCeilingApplicable:false,wageCap:16000});
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

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting,HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Settings,SalaryComponentService,SalaryComponent } from './settings';
const record:SalaryComponent={_id:'000000000000000000000004',name:'Formula Deduction',code:'CUSTOM_DEDUCTION',category:'deduction',calculationType:'formula',formula:'MIN(Annual Core Wages, Annual EPF Ceiling Limit) * 12%',calculationBaseType:'annual_ctc',calculationBaseComponentId:null,calculationValue:null,fixedAmountPeriod:null,status:'active',showInPayslip:true};
describe('Formula salary component settings',()=>{
  it('sends the formula and no stale numeric value in the existing save API',()=>{
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});
    const service=TestBed.inject(SalaryComponentService),http=TestBed.inject(HttpTestingController);
    service.save(record).subscribe();const save=http.expectOne(r=>r.url.endsWith('/salary-components'));
    expect(save.request.body).toMatchObject({calculationType:'formula',formula:record.formula,calculationValue:null});save.flush(record);http.verify();
  });
  it('shows the annual formula editor, retains server errors and round-trips saved formulas for editing',async()=>{
    await TestBed.configureTestingModule({imports:[Settings],providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]}).compileComponents();
    const fixture=TestBed.createComponent(Settings),http=TestBed.inject(HttpTestingController),page=fixture.componentInstance;
    fixture.detectChanges();http.expectOne(r=>r.url.endsWith('/salary-components')).flush([record]);
    page.draft={...record};page.editId=record._id;page.modal.set(true);fixture.detectChanges();await fixture.whenStable();
    fixture.nativeElement.querySelector('dialog').close=()=>{};
    expect(fixture.nativeElement.querySelector('select[name=type]').textContent).toContain('Formula');
    expect(fixture.nativeElement.querySelector('textarea').value).toBe(record.formula);
    expect(fixture.nativeElement.querySelector('input[name=value]')).toBeNull();
    expect(fixture.nativeElement.querySelector('select[name=base]')).toBeNull();
    const textarea:HTMLTextAreaElement=fixture.nativeElement.querySelector('textarea');
    textarea.value='unknown + 1';textarea.dispatchEvent(new Event('input'));await fixture.whenStable();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    const save=http.expectOne(r=>r.method==='PATCH');save.flush({message:'Unsupported or missing formula variable: unknown.'},{status:400,statusText:'Bad Request'});fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unsupported or missing formula variable');expect(textarea.value).toBe('unknown + 1');
    textarea.value='MAX(Annual Core Wages, Annual EPF Ceiling Limit) * 10%';textarea.dispatchEvent(new Event('input'));await fixture.whenStable();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    const valid=http.expectOne(r=>r.method==='PATCH');expect(valid.request.body.formula).toBe('MAX(Annual Core Wages, Annual EPF Ceiling Limit) * 10%');valid.flush({...record,formula:'MAX(Annual Core Wages, Annual EPF Ceiling Limit) * 10%'});
    http.expectOne(r=>r.method==='GET').flush([{...record,formula:'MAX(Annual Core Wages, Annual EPF Ceiling Limit) * 10%'}]);fixture.detectChanges();
    expect(page.records()[0].formula).toBe('MAX(Annual Core Wages, Annual EPF Ceiling Limit) * 10%');http.verify();
  });
});

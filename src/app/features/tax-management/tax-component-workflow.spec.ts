import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { TaxConfiguration } from './tax-configuration';
import { By } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';
const base = 'http://localhost:3000';
const records = [
  { _id: 'shift-id', name: 'Shift Allowance', code: 'SHIFT', category: 'allowance', status: 'active' },
  { _id: 'basic-id', name: 'Basic Salary', code: 'BASIC', category: 'earning', status: 'active' },
];
async function setup(components = records) {
  await TestBed.configureTestingModule({ imports: [TaxConfiguration], providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] }).compileComponents();
  const fixture = TestBed.createComponent(TaxConfiguration), http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne(base + '/settings/tax-configuration').flush({ version: 1, years: [{ code: 'FY 2026-27', name: 'FY 2026-27', startDate: '2026-04-01', endDate: '2027-03-31' }], revisions: [], published: {}, audit: [] });
  http.expectOne(base + '/salary-components').flush(components);
  await vi.waitFor(() => expect(fixture.componentInstance.busy()).toBe(false)); fixture.detectChanges();
  return { fixture, http, page: fixture.componentInstance };
}
describe('Dynamic tax component workflow regression', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('names the actual component in legal-reference validation, independent of order', async () => {
    const { fixture } = await setup();
    fixture.nativeElement.querySelectorAll('form')[1].dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Legal reference is required for Shift Allowance.');
    expect(fixture.nativeElement.textContent).not.toContain('reference0');
  });
  it('fetches current components again and preserves entered mappings', async () => {
    const { fixture, http, page } = await setup();
    page.mappings[0].legalReference = 'Approved test-only reference'; page.mappings[0].type = 'partial'; page.mappings[0].taxablePercentage = 50;
    const load = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) => b.textContent.includes('Load current salary components')) as HTMLButtonElement;
    load.click(); fixture.detectChanges();
    const request = http.expectOne(base + '/salary-components');
    request.flush([...records, { _id: 'new-id', name: 'New Allowance', code: 'NEW', category: 'allowance', status: 'active' }]);
    await vi.waitFor(() => expect(page.busy()).toBe(false)); fixture.detectChanges();
    expect(page.mappings).toHaveLength(3);
    expect(page.mappings.find(m => m.componentId === 'shift-id').legalReference).toBe('Approved test-only reference');
    expect(fixture.nativeElement.textContent).toContain('Loaded 3 active salary components.');
  });
  it('requires explicit treatment selection for newly loaded components', async () => {
    const {page}=await setup(); expect(page.mappings.map(m=>m.type)).toEqual(['','']);
    expect(page.mappings.map(m=>m.legalReference)).toEqual(['','']);
  });
  it('shows loading state, prevents duplicate refreshes and deduplicates response identities', async()=>{
    const {fixture,http,page}=await setup();
    const first=page.loadComponents(),second=page.loadComponents();fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading salary components');
    const requests=http.match(base+'/salary-components');expect(requests).toHaveLength(1);requests[0].flush([...records,...records]);
    await Promise.all([first,second]);fixture.detectChanges();expect(page.mappings).toHaveLength(2);expect(page.loadingComponents()).toBe(false);
  });
  it('shows the empty state after a real empty response',async()=>{
    const {fixture,http,page}=await setup([]);const refreshing=page.loadComponents();http.expectOne(base+'/salary-components').flush([]);await refreshing;fixture.detectChanges();
    expect(page.mappings).toEqual([]);expect(fixture.nativeElement.textContent).toContain('No active earning or allowance components are configured.');
  });
  it('preserves all entered values after a failed loading request',async()=>{
    const {fixture,http,page}=await setup();page.mappings[0].legalReference='Entered reference';const before=structuredClone(page.mappings);
    const refreshing=page.loadComponents();http.expectOne(base+'/salary-components').error(new ProgressEvent('error'));await refreshing;fixture.detectChanges();
    expect(page.mappings).toEqual(before);expect(fixture.nativeElement.textContent).toContain('Cannot reach the server');expect(page.loadingComponents()).toBe(false);
  });
  it('retains inactive/removed rows for explicit review and never rewrites saved history',async()=>{
    const {fixture,http,page}=await setup();page.mappings[0].legalReference='Retained legal reference';
    const history={rules:{mappings:structuredClone(page.mappings)}};page.state.set({...page.state(),revisions:[history]});
    const refreshing=page.loadComponents();http.expectOne(base+'/salary-components').flush([{...records[0],status:'inactive'},records[1]]);await refreshing;
    const old=page.mappings.find(m=>m.componentId==='shift-id');expect(old.available).toBe(false);expect(old.legalReference).toBe('Retained legal reference');
    expect(page.configurationProblems().join(' ')).toContain('Shift Allowance is inactive');
    page.removeUnavailableMapping('shift-id');expect(page.mappings).toHaveLength(1);expect(history.rules.mappings).toHaveLength(2);
  });
  it('includes explicitly configured employer earning records and excludes employee deductions',async()=>{
    const {page}=await setup([...records,{_id:'er-id',name:'Employer Fund Amount',code:'ER',category:'earning',status:'active'},{_id:'ee-id',name:'Employee PF',code:'EE',category:'deduction',status:'active'},{_id:'inactive-id',name:'Inactive Allowance',code:'OLD',category:'allowance',status:'inactive'}]);
    expect(page.mappings.map(m=>m.componentId)).toEqual(['shift-id','basic-id','er-id']);
  });
  it('preserves a failed complete revision, then saves it exactly once and displays the returned history',async()=>{
    const {fixture,http,page}=await setup();
    const form=fixture.nativeElement.querySelectorAll('form')[1] as HTMLFormElement;
    for(const [name,value] of Object.entries({standard:'75000',rebateLimit:'1200000',maximumRebate:'60000',cess:'4',sources:'https://www.incometaxindia.gov.in/Documents/Act/Income-tax-Act-2025.pdf',reviewNote:'Test-only reviewer confirmation'})){
      const input=form.querySelector('[name="'+name+'"]') as HTMLInputElement;input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));
    }
    for(const mapping of page.mappings){
      const labels=Array.from(form.querySelectorAll('label'));
      const reference=labels.find(l=>l.textContent?.includes(mapping.name+' — legal reference'))!.querySelector('input')!;
      reference.value='Test-only approved fixture';reference.dispatchEvent(new Event('input',{bubbles:true}));
      const select=labels.find(l=>l.textContent?.includes(mapping.name+' — taxability treatment'))!.querySelector('select')!;
      select.value='taxable';select.dispatchEvent(new Event('change',{bubbles:true}));
    }
    const checkbox=form.querySelector('[name=employerReviewed]') as HTMLInputElement;checkbox.checked=true;checkbox.dispatchEvent(new Event('change',{bubbles:true}));
    await fixture.whenStable();fixture.detectChanges();
    expect(page.configurationProblems()).toEqual([]);
    expect(page.validationErrors(fixture.debugElement.queryAll(By.directive(NgForm))[1].injector.get(NgForm))).toEqual([]);
    const submit=Array.from(form.querySelectorAll('button')).find(b=>b.textContent?.includes('Save new revision'))!;expect(submit.disabled).toBe(false);
    const entered=structuredClone(page.mappings);form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    const requests=http.match(base+'/settings/tax-configuration/revisions');expect(requests).toHaveLength(1);
    requests[0].flush({message:'Configuration validation rejected by reviewer'},{status:400,statusText:'Bad Request'});await vi.waitFor(()=>expect(page.busy()).toBe(false));fixture.detectChanges();
    expect(page.mappings).toEqual(entered);expect(fixture.nativeElement.textContent).toContain('Configuration validation rejected by reviewer');
    form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));const save=http.expectOne(base+'/settings/tax-configuration/revisions');
    const revision={id:'saved-revision',yearCode:page.yearCode,regime:page.regime,version:1,effectiveDate:page.effectiveDate,createdAt:'2026-10-31T00:00:00Z',rules:save.request.body.rules};
    save.flush({...page.state(),version:2,revisions:[revision]});await vi.waitFor(()=>expect(page.busy()).toBe(false));fixture.detectChanges();
    expect(page.state().revisions).toHaveLength(1);expect(fixture.nativeElement.textContent).toContain('New immutable revision saved.');expect(fixture.nativeElement.textContent).toContain('Version 1');
  });
});

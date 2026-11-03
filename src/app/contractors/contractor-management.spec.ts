import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ContractorApi, Contractor, ContractorComponent } from './contractor-api';
import { calculateContractorPayment } from './contractor-deductions';
import { ContractorPaymentForm } from './contractor-payment-form';
import { ContractorForm } from './contractor-form';
import { ContractorDirectory } from './contractor-directory';
import { ContractorSettings } from './contractor-settings';
import { ContractorProfile } from './contractor-profile';
import { Auth } from '../auth/auth';
import { PsTabs } from '../shared/ui/ps-tabs';
const url = 'http://localhost:3000/contractors';
const contractor: Contractor = {
  _id: '507f1f77bcf86cd799439011',
  contractorId: 'CON001',
  firstName: 'Ada',
  lastName: 'Example',
  email: 'ada@example.test',
  componentIds: ['507f1f77bcf86cd799439012'],
  version: 1,
};
const component: ContractorComponent = {
  _id: '507f1f77bcf86cd799439012',
  name: 'Consulting',
  code: 'CONSULT',
  classification: 'deduction',
  status: 'active',
  calculationType: 'formula',
  formula: 'grossPay * 10%',
  version: 2,
};
const form = () => ({ invalid: false, form: { markAllAsTouched: vi.fn() } }) as any;
describe('Independent Contractor Management frontend boundaries', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true, writable: true,
      value: vi.fn(function(this: HTMLDialogElement) { this.open = true; }),
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true, writable: true,
      value: vi.fn(function(this: HTMLDialogElement) { this.open = false; }),
    });
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });
  it('calculates percentage and fixed deductions with exact paise', () => {
    expect(calculateContractorPayment(50000,[{calculationType:'percentage',calculationValue:10},{calculationType:'fixed',calculationValue:2000}])).toMatchObject({totalDeductions:7000,netPayment:43000});
  });
  it('sends contractor identity only and never employee data', async () => {
    const fixture = TestBed.createComponent(ContractorForm);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.draft = { firstName: ' Ada ', lastName: ' Example ', email: ' ADA@example.test ' };
    const success = vi.fn();
    c.saved.subscribe(success);
    const pending = c.save(form());
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      firstName: 'Ada',
      lastName: 'Example',
      email: 'ada@example.test',
    });
    request.flush(contractor);
    await pending;
    expect(success).toHaveBeenCalledWith(contractor);
  });
  it('preserves failed contractor form values and reports the backend error', async () => {
    const f = TestBed.createComponent(ContractorForm);
    f.detectChanges();
    const c = f.componentInstance;
    c.draft = { firstName: 'Ada', lastName: 'Example', email: 'ada@example.test' };
    const p = c.save(form());
    http
      .expectOne(url)
      .flush({ message: 'Duplicate contractor' }, { status: 409, statusText: 'Conflict' });
    await p;
    expect(c.draft.email).toBe('ada@example.test');
    expect(c.error()).toContain('Duplicate');
    expect(c.busy()).toBe(false);
  });
  it('rejects invalid forms before any API request', async () => {
    const f = TestBed.createComponent(ContractorForm);
    await f.componentInstance.save({ invalid: true, form: { markAllAsTouched: vi.fn() } } as any);
    http.expectNone(url);
  });
  it('loads only contractor records, searches identities and preserves both payment entry points', async () => {
    const f = TestBed.createComponent(ContractorDirectory);
    f.detectChanges();
    http.expectOne(url).flush([contractor]);
    await vi.waitFor(() => expect(f.componentInstance.loading()).toBe(false));
    await f.whenStable();
    f.componentInstance.search.set('CON001');
    expect(f.componentInstance.filtered()).toEqual([contractor]);
    f.componentInstance.search.set('missing');
    expect(f.componentInstance.filtered()).toEqual([]);
  });
  it('combines status/search filters and treats legacy missing status as Active', () => {
    const c = TestBed.createComponent(ContractorDirectory).componentInstance;
    const inactive = { ...contractor, _id: 'inactive', firstName: 'Grace', email: 'grace@example.test', status: 'Inactive' as const };
    c.rows.set([contractor, inactive]); c.statusFilter.set('Inactive');
    expect(c.filtered()).toEqual([inactive]); c.search.set('Ada'); expect(c.filtered()).toEqual([]);
    c.search.set(''); c.statusFilter.set('Active'); expect(c.filtered()).toEqual([contractor]);
  });
  it('keeps status edits local until Save and sends the reviewed version to the status endpoint', async () => {
    TestBed.inject(Auth).user.set({ id: 'admin', email: 'qa@example.test', role: 'admin' });
    const c = TestBed.createComponent(ContractorProfile).componentInstance;
    c.contractor.set(contractor); c.editStatus(); c.statusDraft = 'Inactive';
    expect(c.contractor()?.status).toBeUndefined(); http.expectNone(url + '/' + contractor._id + '/status');
    c.editingStatus.set(false); c.editStatus(); expect(c.statusDraft).toBe('Active');
    c.statusDraft = 'Inactive'; const pending = c.saveStatus();
    const r = http.expectOne(url + '/' + contractor._id + '/status');
    expect(r.request.body).toEqual({ status: 'Inactive', version: contractor.version });
    r.flush({ ...contractor, status: 'Inactive', version: 2 }); await pending;
    expect(c.editingStatus()).toBe(false); expect(c.contractor()?.status).toBe('Inactive');
  });
  it('requires admin confirmation before deleting and retains the dialog on a safe-deletion failure', async () => {
    const c = TestBed.createComponent(ContractorDirectory).componentInstance;
    TestBed.inject(Auth).user.set({ id: 'member', email: 'qa@example.test', role: 'user' });
    c.requestDelete(contractor); expect(c.deleting()).toBeNull();
    TestBed.inject(Auth).user.set({ id: 'admin', email: 'qa@example.test', role: 'admin' });
    c.requestDelete(contractor); http.expectNone(url + '/' + contractor._id);
    const pending = c.confirmDelete(); const r = http.expectOne(url + '/' + contractor._id);
    expect(r.request.method).toBe('DELETE');
    r.flush({ message: 'Safe contractor deletion requires MongoDB transactions. No records were changed.' }, { status: 503, statusText: 'Unavailable' });
    await pending; expect(c.deleting()).toEqual(contractor); expect(c.deleteError()).toContain('No records were changed');
  });
  it('uses versioned contractor-only component endpoints', () => {
    const api = TestBed.inject(ContractorApi);
    const dto = {
      name: component.name,
      code: component.code,
      classification: component.classification,
      status: component.status,
      calculationType: component.calculationType,
      formula: component.formula,
    };
    api.saveComponent(dto, component).subscribe();
    const r = http.expectOne(url + '/components/' + component._id);
    expect(r.request.body.version).toBe(2);
    expect(r.request.method).toBe('PATCH');
    r.flush(component);
  });
  it('clears stale individual preselection if the loaded contractor has become inactive', async () => {
    const f = TestBed.createComponent(ContractorPaymentForm);
    f.componentRef.setInput('initialIds', [contractor._id]); f.detectChanges();
    http.expectOne(url).flush([{...contractor,status:'Inactive'}]); http.expectOne(url + '/components').flush([component]);
    await vi.waitFor(()=>expect(f.componentInstance.loading()).toBe(false));
    expect(f.componentInstance.selected()).toEqual([]); expect(f.componentInstance.canSubmit()).toBe(false);
  });
  it('calculates only assigned active deductions from manually entered Gross Pay', async () => {
    const f = TestBed.createComponent(ContractorPaymentForm);
    f.componentRef.setInput('initialIds', [contractor._id]);
    f.detectChanges();
    http.expectOne(url).flush([contractor]);
    http
      .expectOne(url + '/components')
      .flush([component, { ...component, _id: '507f1f77bcf86cd799439013', name: 'Unassigned' }]);
    await vi.waitFor(() => expect(f.componentInstance.loading()).toBe(false));
    await f.whenStable();
    const c = f.componentInstance;
    expect(c.assigned(contractor)).toEqual([component]);
    expect(Object.keys(c.gross)).toEqual([]);
    expect(c.row(contractor).error).toContain('Gross Pay');
    c.gross[contractor._id] = 50000;
    expect(c.row(contractor)).toMatchObject({grossPay:50000,totalDeductions:5000,netPayment:45000});
  });
  it('requires confirmation before POST and reuses the identical key/payload after failure', async () => {
    const f = TestBed.createComponent(ContractorPaymentForm);
    f.componentRef.setInput('initialIds', [contractor._id]);
    f.detectChanges();
    http.expectOne(url).flush([contractor]);
    http.expectOne(url + '/components').flush([component]);
    await vi.waitFor(() => expect(f.componentInstance.loading()).toBe(false));
    await f.whenStable();
    const c = f.componentInstance;
    c.paymentDate = '2026-11-03';
    c.descriptions[contractor._id] = 'Consulting';
    c.gross[contractor._id] = 1234.56;
    c.prepare(form());
    http.expectNone(url + '/payments');
    const snapshot = structuredClone(c.review());
    expect(snapshot!.entries[0].grossPay).toBe(1234.56);
    expect(snapshot!.entries[0].components[0]).toEqual({componentId:component._id,componentVersion:component.version});
    expect(c.confirmation()[0].netPayment).toBe(1111.1);
    c.gross[contractor._id] = 999;
    c.descriptions[contractor._id] = 'Changed after confirmation';
    let p = c.submit();
    const r = http.expectOne(url + '/payments');
    expect(r.request.body).toEqual(snapshot);
    r.flush({ message: 'Temporary failure' }, { status: 503, statusText: 'Unavailable' });
    await p;
    expect(c.error()).toBe('The server could not complete your request. Please try again later.');
    expect(c.review()).toEqual(snapshot);
    const saved = vi.fn();
    c.recorded.subscribe(saved);
    p = c.submit();
    const retry = http.expectOne(url + '/payments');
    expect(retry.request.body).toEqual(snapshot);
    retry.flush({ entries: [] });
    await p;
    expect(saved).toHaveBeenCalledOnce();
  });
  it('prevents duplicate clicks while payment submission is pending', async () => {
    const f = TestBed.createComponent(ContractorPaymentForm);
    const c = f.componentInstance;
    c.review.set({
      idempotencyKey: 'same',
      paymentDate: '2026-11-03',
      description: 'Invoice',
      entries: [],
    });
    const pending = c.submit();
    await c.submit();
    const requests = http.match(url + '/payments');
    expect(requests).toHaveLength(1);
    requests[0].flush({ entries: [] });
    await pending;
  });
  it('retains assignment edit mode after failure and restores saved selections on cancel', async () => {
    const c = TestBed.createComponent(ContractorProfile).componentInstance;
    c.contractor.set(contractor); c.components.set([component]); c.selected.set([...contractor.componentIds]);
    expect(c.editingAssignments()).toBe(false);
    c.editAssignments(); c.toggle(component._id, false);
    const pending = c.saveAssignments();
    const request = http.expectOne(url + '/' + contractor._id + '/components');
    expect(request.request.body.componentIds).toEqual([]);
    request.flush({ message: 'Assignments changed' }, { status: 409, statusText: 'Conflict' });
    await pending;
    expect(c.editingAssignments()).toBe(true); expect(c.selected()).toEqual([]);
    expect(c.error()).toContain('Assignments changed');
    c.cancelAssignments();
    expect(c.editingAssignments()).toBe(false); expect(c.selected()).toEqual(contractor.componentIds);
    c.editAssignments(); c.toggle(component._id, false);
    const saved = c.saveAssignments();
    http.expectOne(url + '/' + contractor._id + '/components').flush({ ...contractor, version: 2, componentIds: [] });
    await saved;
    expect(c.editingAssignments()).toBe(false); expect(c.contractor()?.componentIds).toEqual([]);
  });
  it('supports keyboard navigation with reusable contractor tab labels', () => {
    const f = TestBed.createComponent(PsTabs);
    f.componentRef.setInput('items', [
      { id: 'details', label: 'Contractor Details' },
      { id: 'payments', label: 'Payments' },
    ]);
    f.detectChanges();
    const buttons = f.nativeElement.querySelectorAll('button');
    buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    f.detectChanges();
    expect(f.componentInstance.active()).toBe('payments');
    expect(document.activeElement).toBe(buttons[1]);
  });
});

describe('Contractor selection, KPIs and validation',()=>{
 beforeEach(()=>TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]}));
 const setup=()=>{const f=TestBed.createComponent(ContractorPaymentForm),c=f.componentInstance;const other={...contractor,_id:'507f1f77bcf86cd799439099',firstName:'Grace',componentIds:[]};c.loading.set(false);c.contractors.set([contractor,other]);c.components.set([component]);return {f,c,other};};
 it('excludes inactive contractors from individual and select-all payment eligibility',()=>{const {c,other}=setup();c.contractors.set([{...contractor,status:'Inactive'},other]);c.gross[contractor._id]=100;c.toggleAll(true);expect(c.selected()).toEqual([other._id]);c.toggle(contractor._id,true);expect(c.selected()).not.toContain(contractor._id);expect(c.row({...contractor,status:'Inactive'}).error).toContain('Inactive contractors');});
 it('has select-all, mixed and deselect states with selected-only live KPIs',()=>{const {c,other}=setup();c.gross[contractor._id]=50000;c.gross[other._id]=10000;expect(c.totals()).toEqual({grossPay:0,netPayment:0});c.toggle(contractor._id,true);expect(c.mixedSelected()).toBe(true);expect(c.totals()).toEqual({grossPay:50000,netPayment:45000});c.toggleAll(true);expect(c.allSelected()).toBe(true);expect(c.mixedSelected()).toBe(false);expect(c.totals()).toEqual({grossPay:60000,netPayment:55000});c.gross[other._id]=20000;expect(c.totals().netPayment).toBe(65000);c.toggle(contractor._id,false);expect(c.totals()).toEqual({grossPay:20000,netPayment:20000});c.toggleAll(false);expect(c.totals().grossPay).toBe(0);});
 it('permits no-deduction and zero-gross payments; excludes unselected incomplete contractors',()=>{const {c,other}=setup();c.toggle(other._id,true);c.gross[other._id]=0;expect(c.canSubmit()).toBe(true);c.paymentDate='2026-11-03';c.descriptions[other._id]='Zero invoice';c.prepare(form());expect(c.review()!.entries).toEqual([{contractorId:other._id,contractorVersion:1,description:'Zero invoice',grossPay:0,components:[]}]);});
 it('rejects incomplete and invalid gross, and negative net',()=>{const {c}=setup();c.toggle(contractor._id,true);expect(c.canSubmit()).toBe(false);for(const v of [-1,.001,NaN,Infinity]){c.gross[contractor._id]=v;expect(c.canSubmit()).toBe(false);}c.components.set([{...component,calculationType:'fixed',calculationValue:2000}]);c.gross[contractor._id]=1000;expect(c.row(contractor).error).toContain('exceed');expect(c.canSubmit()).toBe(false);});
 it('requires manual valid civil date, description and selection before confirmation',()=>{const {c,other}=setup();c.gross[other._id]=100;c.toggle(other._id,true);c.descriptions[other._id]='Invoice';for(const date of ['', '2026-02-29','2026-04-31']){c.paymentDate=date;c.prepare(form());expect(c.review()).toBeNull();}c.paymentDate='2026-11-03';c.descriptions[other._id]=' ';c.prepare(form());expect(c.review()).toBeNull();c.descriptions[other._id]='Invoice';c.toggleAll(false);c.prepare(form());expect(c.review()).toBeNull();});
 it('excludes inactive, unassigned and earlier earnings rules, and blocks unresolved manual deductions',()=>{const {c}=setup();c.components.set([{...component,classification:'earning'}]);c.gross[contractor._id]=100;expect(c.row(contractor).totalDeductions).toBe(0);c.components.set([{...component,status:'inactive'}]);expect(c.row(contractor).netPayment).toBe(100);c.components.set([{...component,calculationType:'manual'}]);expect(c.eligible()).toHaveLength(1);expect(c.row(contractor).error).toContain('earlier manual');c.toggleAll(true);expect(c.selected()).not.toContain(contractor._id);});
});

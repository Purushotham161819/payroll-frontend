import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, Subject } from 'rxjs';
import { EmployeeList } from './employee-list';
import { EmployeeService, apiError } from './employee.service';
import { LifecycleDialog } from './lifecycle-dialog';

describe('Employee lifecycle UI', () => {
  beforeEach(() => {
    // jsdom lacks native dialog methods; browser tests exercise the real dialog.
    HTMLDialogElement.prototype.close = () => {};
    HTMLDialogElement.prototype.showModal = () => {};
  });
  const active = { _id:'a', firstName:'Ada', lastName:'A', hireDate:'2020-01-01', status:'Active' } as any;
  const terminated = { ...active, _id:'b', status:'Terminated', employmentHistory:[{startDate:'2020-01-01',endDate:'2020-03-01',terminationReason:'Retirement'}] } as any;
  it('filters legacy, active and terminated records, updates counts, clears selection and preserves filter on refresh', () => {
    TestBed.configureTestingModule({providers:[{provide:EmployeeService,useValue:{getAll:()=>of([active,terminated,{...active,_id:'c',status:undefined}])}}]});
    const list = TestBed.runInInjectionContext(()=>new EmployeeList()); list.load();
    expect(list.employees().map(e=>e._id)).toEqual(['a','c']);
    list.toggleAll(true); expect(list.selectedCount()).toBe(2);
    list.changeFilter('Terminated'); expect(list.selectedCount()).toBe(0); expect(list.employees()).toEqual([terminated]);
    list.load(); expect(list.employees()).toEqual([terminated]);
    list.changeFilter('All'); expect(list.employees()).toHaveLength(3);
  });
  it('encodes lifecycle routes and preserves meaningful conflict responses', () => {
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});
    const service=TestBed.inject(EmployeeService), http=TestBed.inject(HttpTestingController);
    service.terminate('a/b',{terminationDate:'2020-03-01',reason:'Retirement'}).subscribe();
    const request=http.expectOne(r=>r.url.endsWith('/employees/a%2Fb/terminate'));
    expect(request.request.method).toBe('PATCH');expect(request.request.body.reason).toBe('Retirement');request.flush(terminated);
    service.rehire('b',{rehireDate:'2020-04-01'}).subscribe();
    const rehire=http.expectOne(r=>r.url.endsWith('/employees/b/rehire'));expect(rehire.request.body).toEqual({rehireDate:'2020-04-01'});rehire.flush(active);http.verify();
    expect(apiError(new HttpErrorResponse({status:409,error:{message:'Cannot rehire an active employee.'}}))).toBe('Cannot rehire an active employee.');
  });
  it('sends only one pending confirmation and emits success after the server responds', () => {
    const response=new Subject<any>();let calls=0,saved=0;
    TestBed.configureTestingModule({providers:[{provide:EmployeeService,useValue:{terminate:()=>{calls++;return response;}}}]});
    const fixture=TestBed.createComponent(LifecycleDialog);fixture.componentRef.setInput('employee',active);fixture.componentRef.setInput('action','Terminate');
    const dialog=fixture.componentInstance;dialog.date='2020-03-01';dialog.reason='Retirement';dialog.saved.subscribe(()=>saved++);
    dialog.submit();dialog.submit();expect(calls).toBe(1);expect(dialog.busy()).toBe(true);expect(saved).toBe(0);
    response.next(terminated);response.complete();expect(saved).toBe(1);expect(dialog.busy()).toBe(false);
  });
  it('requires rehire after the previous period and leaves cancellation without writes', () => {
    TestBed.configureTestingModule({providers:[{provide:EmployeeService,useValue:{}}]});
    const fixture=TestBed.createComponent(LifecycleDialog);fixture.componentRef.setInput('employee',terminated);fixture.componentRef.setInput('action','Rehire');
    const dialog=fixture.componentInstance;expect(dialog.minimumDate()).toBe('2020-03-02');dialog.date='2020-03-01';dialog.submit();expect(dialog.error()).toContain('valid date');expect(dialog.busy()).toBe(false);
    let cancels=0;dialog.cancelled.subscribe(()=>cancels++);dialog.cancel();expect(cancels).toBe(1);
  });
});

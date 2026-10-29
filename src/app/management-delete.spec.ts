import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting,HttpTestingController} from '@angular/common/http/testing';
import {of,Subject,throwError} from 'rxjs';
import {HttpErrorResponse} from '@angular/common/http';
import {EmployeeService} from './employees/employee.service';
import {EmployeeList} from './employees/employee-list';
import {SalaryComponentService,Settings} from './settings/settings';
describe('Management delete requests and state',()=>{
 it('calls the existing delete endpoints with encoded IDs',()=>{
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});const http=TestBed.inject(HttpTestingController);
  TestBed.inject(EmployeeService).remove('a/b').subscribe();const employee=http.expectOne(r=>r.method==='DELETE');expect(employee.request.url).toMatch(/employees\/a%2Fb$/);employee.flush({message:'Deleted',deletedId:'a/b'});
  TestBed.inject(SalaryComponentService).remove('a/b').subscribe();const component=http.expectOne(r=>r.method==='DELETE');expect(component.request.url).toMatch(/salary-components\/a%2Fb$/);component.flush({message:'Deleted',deletedId:'a/b'});http.verify();
 });
 it('deletes an employee once, refreshes the list and prunes selection',()=>{
  const response=new Subject<any>();let deletes=0,loads=0;
  TestBed.configureTestingModule({providers:[{provide:EmployeeService,useValue:{remove:()=>{deletes++;return response;},getAll:()=>{loads++;return of([]);}}}]});
  const page=TestBed.runInInjectionContext(()=>new EmployeeList());const employee={_id:'id',firstName:'A',lastName:'B',email:'a@example.com'} as any;
  page.selectedIds.set(new Set(['id']));page.requestDelete(employee);page.confirmDelete();page.confirmDelete();expect(deletes).toBe(1);expect(page.deletingBusy()).toBe(true);
  response.next({message:'Deleted',deletedId:'id'});response.complete();expect(page.deleting()).toBeNull();expect(page.success()).toContain('deleted');expect(loads).toBe(1);expect(page.selectedCount()).toBe(0);
 });
 it('keeps failed employee deletion open with a meaningful server error and no success',()=>{
  TestBed.configureTestingModule({providers:[{provide:EmployeeService,useValue:{remove:()=>throwError(()=>new HttpErrorResponse({status:404,error:{message:'Employee not found.'}}))}}]});
  const page=TestBed.runInInjectionContext(()=>new EmployeeList());page.requestDelete({_id:'id',firstName:'A',lastName:'B'} as any);page.confirmDelete();expect(page.deleting()).not.toBeNull();expect(page.deleteError()).toBe('Employee not found.');expect(page.success()).toBe('');expect(page.deletingBusy()).toBe(false);
 });
 it('blocks mandatory delete actions and preserves failed optional component confirmations',()=>{
  let calls=0;TestBed.configureTestingModule({providers:[{provide:SalaryComponentService,useValue:{remove:()=>{calls++;return throwError(()=>new HttpErrorResponse({status:409,error:{message:'Remove references from Formula (CUSTOM).'}}));}}}]});
  const page=TestBed.runInInjectionContext(()=>new Settings());page.requestDelete({_id:'id',code:'BASIC',name:'Renamed'} as any);expect(page.deleting()).toBeNull();
  page.requestDelete({_id:'id',code:'OPTIONAL',name:'Travel'} as any);page.confirmDelete();expect(calls).toBe(1);expect(page.deleting()).not.toBeNull();expect(page.deleteError()).toContain('Formula (CUSTOM)');expect(page.success()).toBe('');expect(page.busy()).toBe(false);
 });
 it('refreshes optional components only after a successful deletion',()=>{
  let loads=0;TestBed.configureTestingModule({providers:[{provide:SalaryComponentService,useValue:{remove:()=>of({message:'Deleted'}),list:()=>{loads++;return of([]);}}}]});const page=TestBed.runInInjectionContext(()=>new Settings());page.requestDelete({_id:'id',code:'OPTIONAL',name:'Travel'} as any);page.confirmDelete();expect(page.deleting()).toBeNull();expect(page.success()).toContain('deleted');expect(loads).toBe(1);
 });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { Auth, administrator } from '../auth/auth';
import { UserManagement, ManagedUser } from './users';

describe('User Management', () => {
  let http: HttpTestingController, auth: Auth;
  const account: ManagedUser = {id:'member',email:'member@example.test',role:'user',active:true,createdAt:'2026-01-01T00:00:00Z'};
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function(){this.open=true;};
    HTMLDialogElement.prototype.close = function(){this.open=false;};
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]});
    http=TestBed.inject(HttpTestingController); auth=TestBed.inject(Auth);
    auth.user.set({id:'admin',email:'admin@example.test',role:'admin'});
  });
  afterEach(()=>{http.verify();vi.restoreAllMocks();});
  function page() {
    const fixture=TestBed.createComponent(UserManagement);
    http.expectOne('http://localhost:3000/users').flush([account]); fixture.detectChanges(); return fixture;
  }
  it('denies ordinary users direct access to the administrator route',async()=>{
    const result=TestBed.runInInjectionContext(()=>administrator({} as ActivatedRouteSnapshot,{url:'/users'} as RouterStateSnapshot));
    http.expectOne('http://localhost:3000/auth/me').flush({id:'member',email:account.email,role:'user'});
    expect(TestBed.inject(Router).serializeUrl(await result as any)).toBe('/');
  });
  it('permits admins and redirects unauthenticated users to login',async()=>{
    const admin=TestBed.runInInjectionContext(()=>administrator({} as ActivatedRouteSnapshot,{url:'/users'} as RouterStateSnapshot));
    http.expectOne('http://localhost:3000/auth/me').flush({id:'admin',email:'admin@example.test',role:'admin'}); expect(await admin).toBe(true);
    const guest=TestBed.runInInjectionContext(()=>administrator({} as ActivatedRouteSnapshot,{url:'/users'} as RouterStateSnapshot));
    http.expectOne('http://localhost:3000/auth/me').flush({}, {status:401,statusText:'Unauthorized'});
    expect(TestBed.inject(Router).serializeUrl(await guest as any)).toBe('/login?returnUrl=%2Fusers');
  });
  it('rejects mismatched passwords before issuing a creation request',async()=>{
    const fixture=page(); fixture.componentInstance.open('create'); fixture.componentInstance.password='long-enough-input';fixture.componentInstance.confirmPassword='different-input';
    await fixture.componentInstance.submit(); expect(fixture.componentInstance.error()).toContain('Passwords must match'); http.expectNone('http://localhost:3000/users');
  });
  it('creates an account with a normalized email and clears password inputs',async()=>{
    const fixture=page(), component=fixture.componentInstance; component.open('create');component.email=' MEMBER@EXAMPLE.TEST ';component.password=component.confirmPassword='test-only-input-value';
    const result=component.submit(); const req=http.expectOne('http://localhost:3000/users');
    expect(req.request.body).toEqual({email:account.email,password:'test-only-input-value',role:'user',active:true});req.flush(account);
    await Promise.resolve(); await Promise.resolve();
    http.expectOne('http://localhost:3000/users').flush([account]); await result;
    expect(component.password).toBe('');expect(component.confirmPassword).toBe('');
  });
  it('requires confirmation before password resets and deactivation',async()=>{
    const fixture=page(), component=fixture.componentInstance; component.open('password',account);component.password=component.confirmPassword='test-only-input-value';await component.submit();
    http.expectNone('http://localhost:3000/users/member/password');expect(component.confirmation().nativeElement.open).toBe(true);
    const result=component.save(); http.expectOne('http://localhost:3000/users/member/password').flush({message:'Changed'});
    await Promise.resolve();await Promise.resolve();http.expectOne('http://localhost:3000/users').flush([account]);await result;
    component.requestStatus(account);http.expectNone('http://localhost:3000/users/member/status');
    component.cancelConfirmation();expect(component.confirmation().nativeElement.open).toBe(false);
  });
  it('keeps the form open and displays safe duplicate-account feedback',async()=>{
    const fixture=page(),component=fixture.componentInstance;component.open('create');component.email=account.email;component.password=component.confirmPassword='test-only-input-value';
    const result=component.submit();http.expectOne('http://localhost:3000/users').flush({message:'An account with this email already exists'},{status:409,statusText:'Conflict'});await result;
    expect(component.editor().nativeElement.open).toBe(true);expect(component.error()).toContain('already exists');expect(component.busy()).toBe(false);
  });

  it('rejects 7 characters and accepts 8 for account creation and reset', async()=>{
    const fixture=page(),component=fixture.componentInstance;
    component.open('create');component.email=account.email;component.password=component.confirmPassword='1234567';
    await component.submit();expect(component.error()).toContain('at least 8 characters');http.expectNone('http://localhost:3000/users');
    component.password=component.confirmPassword='12345678';
    const result=component.submit();const req=http.expectOne('http://localhost:3000/users');expect(req.request.body.password.length).toBe(8);req.flush(account);
    await Promise.resolve();await Promise.resolve();http.expectOne('http://localhost:3000/users').flush([account]);await result;
    component.open('password',account);component.password=component.confirmPassword='1234567';await component.submit();expect(component.error()).toContain('at least 8 characters');
    component.password=component.confirmPassword='12345678';await component.submit();expect(component.confirmation().nativeElement.open).toBe(true);http.expectNone('http://localhost:3000/users/member/password');
  });
});

import { NotificationService } from '../shared/notification.service';
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
  it('rejects blank names before issuing an invitation request',async()=>{
    const fixture=page(); fixture.componentInstance.open('create'); fixture.componentInstance.password='long-enough-input';fixture.componentInstance.confirmPassword='different-input';
    await fixture.componentInstance.submit(); expect(fixture.componentInstance.error()).toContain('first and last names'); http.expectNone('http://localhost:3000/users');
  });
  it('creates an account with a normalized email and clears password inputs',async()=>{
    const fixture=page(), component=fixture.componentInstance; component.open('create');component.email=' MEMBER@EXAMPLE.TEST ';component.firstName=' Asha ';component.lastName=' Rao ';component.password=component.confirmPassword='test-only-input-value';
    const result=component.submit(); const req=http.expectOne('http://localhost:3000/users');
    expect(req.request.body).toEqual({firstName:'Asha',lastName:'Rao',email:account.email,role:'user',active:true});req.flush({...account,invitationSent:true,message:'Invitation sent.'});
    await Promise.resolve(); await Promise.resolve();
    http.expectOne('http://localhost:3000/users').flush([account]); await result;
    expect(component.password).toBe('');expect(component.confirmPassword).toBe('');
    expect(TestBed.inject(NotificationService).current()).toMatchObject({kind:'success',message:'User invitation email has been sent successfully.'});
    fixture.detectChanges();expect(fixture.nativeElement.textContent).not.toContain('Delivery is not yet confirmed');expect(fixture.nativeElement.querySelector('.notice.success')).toBeNull();
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
    const fixture=page(),component=fixture.componentInstance;component.open('create');component.email=account.email;component.firstName='Asha';component.lastName='Rao';component.password=component.confirmPassword='test-only-input-value';
    const result=component.submit();http.expectOne('http://localhost:3000/users').flush({message:'An account with this email already exists'},{status:409,statusText:'Conflict'});await result;
    expect(component.editor().nativeElement.open).toBe(true);expect(component.error()).toContain('already exists');expect(component.busy()).toBe(false);
  });

  it('retains the existing 8 to 128 character administrator password reset policy', async()=>{
    const fixture=page(),component=fixture.componentInstance;
    component.open('password',account);component.password=component.confirmPassword='1234567';
    await component.submit();expect(component.error()).toContain('at least 8 characters');http.expectNone('http://localhost:3000/users/member/password');
    component.password=component.confirmPassword='12345678';await component.submit();expect(component.confirmation().nativeElement.open).toBe(true);
  });
  it('shows email failure as a recoverable warning without creating another account on resend',async()=>{
    const fixture=page(),c=fixture.componentInstance;c.open('create');c.firstName='Asha';c.lastName='Rao';c.email=account.email;
    const saving=c.submit();http.expectOne('http://localhost:3000/users').flush({...account,invitationSent:false,message:'User created, but the invitation could not be sent.'});
    await Promise.resolve();await Promise.resolve();http.expectOne('http://localhost:3000/users').flush([{...account,invitationPending:true,invitationDelivery:'failed'}]);await saving;
    expect(TestBed.inject(NotificationService).current()?.kind).toBe('warning');
    expect(c.noticeWarning()).toBe(true);expect(c.notice()).toContain('could not be sent');
    const resend=c.resend(c.users()[0]);const req=http.expectOne('http://localhost:3000/users/member/invitation');expect(req.request.method).toBe('POST');req.flush({invitationSent:true,message:'Invitation sent.'});
    await Promise.resolve();await Promise.resolve();http.expectOne('http://localhost:3000/users').flush([{...account,invitationPending:true,invitationDelivery:'sent'}]);await resend;expect(c.noticeWarning()).toBe(false);
  });
  it('includes trimmed names when editing an existing user',async()=>{
    const fixture=page(),c=fixture.componentInstance;c.open('edit',account);c.firstName=' Asha ';c.lastName=' Rao ';
    const saving=c.submit();const req=http.expectOne('http://localhost:3000/users/member');expect(req.request.body).toEqual({email:account.email,role:'user',firstName:'Asha',lastName:'Rao'});req.flush(account);
    await Promise.resolve();await Promise.resolve();http.expectOne('http://localhost:3000/users').flush([{...account,firstName:'Asha',lastName:'Rao'}]);await saving;
    expect(c.users()[0].firstName).toBe('Asha');
  });

});

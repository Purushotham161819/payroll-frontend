import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { SetPassword } from './set-password';

describe('Invitation Set Password page',()=>{
  const token='a'.repeat(43);
  let http:HttpTestingController;
  beforeEach(()=>{window.history.replaceState({},'', '/set-password#token='+token);TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]});http=TestBed.inject(HttpTestingController);});
  afterEach(()=>{http.verify();vi.useRealTimers();});
  it('removes the token from the URL, displays a safe name and only submits matching policy-valid passwords',async()=>{
    const fixture=TestBed.createComponent(SetPassword);http.expectOne('http://localhost:3000/auth/invitation/inspect').flush({firstName:'Asha'});await fixture.whenStable();fixture.detectChanges();
    expect(window.location.hash).toBe('');expect(fixture.nativeElement.textContent).toContain('Welcome, Asha');
    const c=fixture.componentInstance;c.password='1234567';c.confirmation='1234567';await c.submit();http.expectNone('http://localhost:3000/auth/invitation/complete');
    c.password='12345678';c.confirmation='different';await c.submit();http.expectNone('http://localhost:3000/auth/invitation/complete');
    c.confirmation=c.password;const result=c.submit();const req=http.expectOne('http://localhost:3000/auth/invitation/complete');expect(req.request.body).toEqual({token,password:'12345678',confirmation:'12345678'});req.flush({message:'Password set'});await result;
    expect(c.success()).toContain('password is set');expect(c.password).toBe('');expect(c.confirmation).toBe('');expect(c.valid()).toBe(false);fixture.destroy();
  });
  it('shows a non-identifying expired-link message and hides the form',async()=>{
    const fixture=TestBed.createComponent(SetPassword);http.expectOne('http://localhost:3000/auth/invitation/inspect').flush({},{status:400,statusText:'Bad Request'});await fixture.whenStable();fixture.detectChanges();
    expect(fixture.componentInstance.valid()).toBe(false);expect(fixture.nativeElement.textContent).toContain('Contact your organization administrator');expect(fixture.nativeElement.querySelector('input')).toBe(null);fixture.destroy();
  });
  it('retains a valid form on transient setup failure',async()=>{
    const fixture=TestBed.createComponent(SetPassword);http.expectOne('http://localhost:3000/auth/invitation/inspect').flush({firstName:'Asha'});await fixture.whenStable();const c=fixture.componentInstance;c.password=c.confirmation='recipient-password';const result=c.submit();http.expectOne('http://localhost:3000/auth/invitation/complete').flush({},{status:503,statusText:'Unavailable'});await result;expect(c.error()).toContain('try again');expect(c.valid()).toBe(true);expect(c.busy()).toBe(false);fixture.destroy();
  });
});

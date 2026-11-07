import { NotificationService } from '../shared/notification.service';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SetPassword } from './set-password';
import { ForgotPassword } from './forgot-password';
describe('Password reset UI',()=>{
 const token='a'.repeat(43);let http:HttpTestingController;
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]});http=TestBed.inject(HttpTestingController);});
 afterEach(()=>http.verify());
 it('requests reset with a normalized email and displays the generic response',async()=>{
 const fixture=TestBed.createComponent(ForgotPassword);const c=fixture.componentInstance;c.email=' User@Example.test ';const pending=c.submit();const req=http.expectOne('http://localhost:3000/auth/forgot-password');expect(req.request.body).toEqual({email:'user@example.test'});req.flush({message:'If the account is eligible, a password reset email has been requested.'});await pending;fixture.detectChanges();expect(TestBed.inject(NotificationService).current()).toMatchObject({kind:'information',message:expect.stringContaining('If the account is eligible')});expect(c.busy()).toBe(false);fixture.destroy();
 });
 it('shows retry guidance after request throttling',async()=>{
 const fixture=TestBed.createComponent(ForgotPassword);const c=fixture.componentInstance;c.email='user@example.test';const pending=c.submit();http.expectOne('http://localhost:3000/auth/forgot-password').flush({},{status:429,statusText:'Too Many Requests'});await pending;expect(c.error()).toContain('Too many attempts');fixture.destroy();
 });
 it('uses reset endpoints, removes URL token and clears credentials on completion',async()=>{
 window.history.replaceState({},'','/reset-password#token='+token);const fixture=TestBed.createComponent(SetPassword);http.expectOne('http://localhost:3000/auth/reset-password/inspect').flush({firstName:''});await fixture.whenStable();expect(window.location.hash).toBe('');fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('Reset your password');
 const c=fixture.componentInstance;c.password=c.confirmation='replacement-password';const pending=c.submit();const req=http.expectOne('http://localhost:3000/auth/reset-password/complete');expect(req.request.body.token).toBe(token);req.flush({message:'Password reset'});await pending;expect(c.password).toBe('');expect(c.valid()).toBe(false);fixture.destroy();
 });
 it('hides reset form on an expired or used token',async()=>{
 window.history.replaceState({},'','/reset-password#token='+token);const fixture=TestBed.createComponent(SetPassword);http.expectOne('http://localhost:3000/auth/reset-password/inspect').flush({},{status:400,statusText:'Bad Request'});await fixture.whenStable();fixture.detectChanges();expect(fixture.nativeElement.textContent).toContain('Request a new password reset');expect(fixture.nativeElement.querySelector('input')).toBe(null);fixture.destroy();
 });
});

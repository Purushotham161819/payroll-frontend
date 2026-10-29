import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { Auth, authenticated, anonymous, superAdministrator, authenticationInterceptor, safeDestination } from './auth';
import { Login } from './login';

describe('Authentication and session handling', () => {
  let auth: Auth, http: HttpTestingController, router: Router;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authenticationInterceptor])), provideHttpClientTesting(), provideRouter([])] });
    auth = TestBed.inject(Auth); http = TestBed.inject(HttpTestingController); router = TestBed.inject(Router);
  });
  afterEach(() => http.verify());
  it('redirects direct protected navigation to login with its destination', async () => {
    const result = TestBed.runInInjectionContext(() => authenticated({} as ActivatedRouteSnapshot, {url: '/settings'} as RouterStateSnapshot));
    http.expectOne('http://localhost:3000/auth/me').flush({}, {status: 401, statusText: 'Unauthorized'});
    expect(router.serializeUrl(await result as any)).toBe('/login?returnUrl=%2Fsettings');
  });
  it('restores authenticated sessions and prevents returning to login', async () => {
    const snapshot = {queryParamMap: {get: () => '/settings'}} as unknown as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() => anonymous(snapshot, {} as RouterStateSnapshot));
    http.expectOne('http://localhost:3000/auth/me').flush({id: 'user', email: 'admin@example.test'});
    expect(router.serializeUrl(await result as any)).toBe('/settings');
    expect(auth.user()?.id).toBe('user');
  });
  it('sends cookies and the CSRF custom header on login', async () => {
    const result = auth.login('admin@example.test', 'test-input');
    const req = http.expectOne('http://localhost:3000/auth/login');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-Payroll-Request')).toBe('1');
    req.flush({id: 'user', email: 'admin@example.test'}); await result;
    expect(auth.user()?.id).toBe('user');
  });
  it('clears state and returns to login after server-confirmed logout', async () => {
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    auth.user.set({id: 'user', email: 'admin@example.test'});
    const result = auth.logout(); http.expectOne('http://localhost:3000/auth/logout').flush(null); await result;
    expect(auth.user()).toBeNull(); expect(navigate).toHaveBeenCalledWith('/login');
  });
  it('clears expired state and redirects once without a login loop', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    auth.user.set({id: 'user', email: 'admin@example.test'});
    const client = TestBed.inject((await import('@angular/common/http')).HttpClient);
    client.get('http://localhost:3000/employees').subscribe({error: () => {}});
    http.expectOne('http://localhost:3000/employees').flush({}, {status:401, statusText:'Unauthorized'});
    expect(auth.user()).toBeNull(); expect(navigate).toHaveBeenCalledTimes(1);
    client.post('http://localhost:3000/auth/login', {}).subscribe({error: () => {}});
    http.expectOne('http://localhost:3000/auth/login').flush({}, {status:401, statusText:'Unauthorized'});
    expect(navigate).toHaveBeenCalledTimes(1);
  });
  it('does not send credentials or custom headers to external services', async () => {
    const client = TestBed.inject((await import('@angular/common/http')).HttpClient);
    client.get('https://external.example.test/data').subscribe();
    const req = http.expectOne('https://external.example.test/data');
    expect(req.request.withCredentials).toBe(false); expect(req.request.headers.has('X-Payroll-Request')).toBe(false); req.flush({});
  });
  it('rejects external and login-loop return destinations', () => {
    for (const value of ['https://attacker.test', '//attacker.test', '/\\attacker.test', '/login?returnUrl=/login']) expect(safeDestination(value)).toBe('/');
    expect(safeDestination('/settings?tab=payroll')).toBe('/settings?tab=payroll');
  });
  it('shows validation, password visibility and a safe login error', async () => {
    const fixture = TestBed.createComponent(Login); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fixture.nativeElement.querySelector('button[type=button]').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#password').type).toBe('text');
    fixture.componentInstance.email = 'admin@example.test'; fixture.componentInstance.password = 'invalid-password';
    const result = fixture.componentInstance.submit();
    http.expectOne('http://localhost:3000/auth/login').flush({stack: 'private'}, {status:401,statusText:'Unauthorized'}); await result;
    expect(fixture.componentInstance.error).toBe('Invalid email or password.');
    expect(fixture.componentInstance.busy).toBe(false);
  });
  it('opens the intended page after login and blocks duplicate submission', async () => {
    const fixture = TestBed.createComponent(Login);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.email = 'admin@example.test'; fixture.componentInstance.password = 'input-value';
    const result = fixture.componentInstance.submit(); await fixture.componentInstance.submit();
    http.expectOne('http://localhost:3000/auth/login').flush({id:'user',email:'admin@example.test'}); await result;
    expect(navigate).toHaveBeenCalledWith('/'); expect(fixture.componentInstance.password).toBe('');
  });
});

describe('Platform and temporary-credential route security', () => {
 let http: HttpTestingController, router: Router;
 beforeEach(() => { TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]}); http=TestBed.inject(HttpTestingController);router=TestBed.inject(Router); });
 afterEach(()=>http.verify());
 for (const role of ['admin','user']) it('denies portal navigation for '+role, async()=>{
  const result=TestBed.runInInjectionContext(()=>superAdministrator({} as ActivatedRouteSnapshot,{url:'/super-admin'} as RouterStateSnapshot));
  http.expectOne('http://localhost:3000/auth/me').flush({id:'u',email:'user@example.test',role});
  expect(router.serializeUrl(await result as any)).toBe('/');
 });
 it('admits a Super Admin to the portal',async()=>{
  const result=TestBed.runInInjectionContext(()=>superAdministrator({} as ActivatedRouteSnapshot,{url:'/super-admin'} as RouterStateSnapshot));
  http.expectOne('http://localhost:3000/auth/me').flush({id:'s',email:'super@example.test',role:'super_admin'});expect(await result).toBe(true);
 });
 it('redirects Super Admin away from business pages',async()=>{
  const result=TestBed.runInInjectionContext(()=>authenticated({} as ActivatedRouteSnapshot,{url:'/settings'} as RouterStateSnapshot));
  http.expectOne('http://localhost:3000/auth/me').flush({id:'s',email:'super@example.test',role:'super_admin'});expect(router.serializeUrl(await result as any)).toBe('/super-admin');
 });
 it('requires password setup before workspace access',async()=>{
  const result=TestBed.runInInjectionContext(()=>authenticated({} as ActivatedRouteSnapshot,{url:'/users'} as RouterStateSnapshot));
  http.expectOne('http://localhost:3000/auth/me').flush({id:'a',email:'admin@example.test',role:'admin',mustChangePassword:true});expect(router.serializeUrl(await result as any)).toBe('/change-password');
 });
});

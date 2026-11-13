import { NavigationContext } from '../shared/navigation-context';
import { PrivateMode } from '../employees/private-mode';
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly privacy = inject(PrivateMode);
  private readonly navigation = inject(NavigationContext);
  private http = inject(HttpClient);
  private router = inject(Router);
  readonly user = signal<{ id: string; firstName?: string; lastName?: string; email: string; role?: 'admin' | 'user' | 'super_admin' | 'employee'; mustChangePassword?: boolean; organizationId?: string } | null>(null);
  private setUser(user: ReturnType<Auth['user']>) { if (this.user()?.id !== user?.id || this.user()?.role !== user?.role) this.privacy.reset(); this.user.set(user); this.navigation.setScope(user ? (user.role ?? 'user') + ':' + user.id + ':' + (user.organizationId ?? 'legacy') : null); }
  async check() {
    try { this.setUser(await firstValueFrom(this.http.get<{ id: string; firstName?: string; lastName?: string; email: string; role?: 'admin' | 'user' | 'super_admin' | 'employee'; mustChangePassword?: boolean; organizationId?: string }>(`${environment.apiUrl}/auth/me`))); return true; }
    catch { this.setUser(null); return false; }
  }
  async login(email: string, password: string) {
    this.privacy.reset();
    this.setUser(await firstValueFrom(this.http.post<{ id: string; firstName?: string; lastName?: string; email: string; role?: 'admin' | 'user' | 'super_admin' | 'employee'; mustChangePassword?: boolean; organizationId?: string }>(`${environment.apiUrl}/auth/login`, { email, password })));
  }
  async logout() {
    this.privacy.reset();
    await firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout`, {}));
    this.setUser(null);
    await this.router.navigateByUrl('/login');
  }
  expired() {
    this.setUser(null);
    if (!this.router.url.startsWith('/login')) void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }
  sensitiveAccessExpired() { if (this.user()?.role === 'employee') this.privacy.reset(); }
}
export function safeDestination(value: string | null): string {
  return value && /^\/(?!\/)/.test(value) && !value.includes('\\') && !value.startsWith('/login') ? value : '/dashboard';
}
export function employeeDestination(value: string | null): string {
  return value && /^\/employee\/(dashboard|my-profile)(?:\?[^#]*)?$/.test(value) ? value : '/employee/dashboard';
}
export const authenticated: CanActivateFn = async (_route, state) => {
  const auth = inject(Auth), router = inject(Router);
  if (!await auth.check()) return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  if (auth.user()?.mustChangePassword && state.url !== '/change-password') return router.parseUrl('/change-password');
  if (auth.user()?.role === 'employee' && state.url !== '/change-password' &&
      !/^\/employee\/(dashboard|my-profile)(?:\?.*)?$/.test(state.url)) return router.parseUrl('/employee/dashboard');
  if (auth.user()?.role !== 'employee' && state.url.startsWith('/employee/')) return router.parseUrl('/dashboard');
  if (auth.user()?.role === 'super_admin' && !state.url.startsWith('/super-admin') && state.url !== '/change-password') return router.parseUrl('/super-admin');
  return true;
};
export const anonymous: CanActivateFn = async route => {
  const auth = inject(Auth), router = inject(Router);
  return await auth.check() ? router.parseUrl(auth.user()?.mustChangePassword ? '/change-password' : auth.user()?.role === 'super_admin' ? '/super-admin' : auth.user()?.role === 'employee' ? employeeDestination(route.queryParamMap.get('returnUrl')) : safeDestination(route.queryParamMap.get('returnUrl'))) : true;
};
export const authenticationInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  if (!req.url.startsWith(environment.apiUrl + '/')) return next(req);
  return next(req.clone({ withCredentials: true, setHeaders: { 'X-Payroll-Request': '1' } })).pipe(catchError((error: HttpErrorResponse) => {
    if (error.status === 403 && error.error?.code === 'PRIVATE_MODE_REQUIRED') auth.sensitiveAccessExpired();
    if (error.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/me')) auth.expired();
    return throwError(() => error);
  }));
};

export const administrator: CanActivateFn = async (_route, state) => {
  const auth = inject(Auth), router = inject(Router);
  if (!await auth.check()) return router.createUrlTree(['/login'], {queryParams: {returnUrl: state.url}});
  return auth.user()?.role === 'admin' || router.parseUrl('/');
};

export const superAdministrator: CanActivateFn = async (_route, state) => {
  const auth = inject(Auth), router = inject(Router);
  if (!await auth.check()) return router.createUrlTree(['/login'], {queryParams: {returnUrl: state.url}});
  return auth.user()?.role === 'super_admin' || router.parseUrl('/');
};

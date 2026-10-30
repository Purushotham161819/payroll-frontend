import { NavigationContext } from '../shared/navigation-context';
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly navigation = inject(NavigationContext);
  private http = inject(HttpClient);
  private router = inject(Router);
  readonly user = signal<{ id: string; email: string; role?: 'admin' | 'user' | 'super_admin'; mustChangePassword?: boolean; organizationId?: string } | null>(null);
  private setUser(user: ReturnType<Auth['user']>) { this.user.set(user); this.navigation.setScope(user ? (user.role ?? 'user') + ':' + user.id + ':' + (user.organizationId ?? 'legacy') : null); }
  async check() {
    try { this.setUser(await firstValueFrom(this.http.get<{ id: string; email: string; role?: 'admin' | 'user' | 'super_admin'; mustChangePassword?: boolean; organizationId?: string }>(`${environment.apiUrl}/auth/me`))); return true; }
    catch { this.setUser(null); return false; }
  }
  async login(email: string, password: string) {
    this.setUser(await firstValueFrom(this.http.post<{ id: string; email: string; role?: 'admin' | 'user' | 'super_admin'; mustChangePassword?: boolean; organizationId?: string }>(`${environment.apiUrl}/auth/login`, { email, password })));
  }
  async logout() {
    await firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout`, {}));
    this.setUser(null);
    await this.router.navigateByUrl('/login');
  }
  expired() {
    this.setUser(null);
    if (!this.router.url.startsWith('/login')) void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }
}
export function safeDestination(value: string | null): string {
  return value && /^\/(?!\/)/.test(value) && !value.includes('\\') && !value.startsWith('/login') ? value : '/';
}
export const authenticated: CanActivateFn = async (_route, state) => {
  const auth = inject(Auth), router = inject(Router);
  if (!await auth.check()) return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  if (auth.user()?.mustChangePassword && state.url !== '/change-password') return router.parseUrl('/change-password');
  if (auth.user()?.role === 'super_admin' && !state.url.startsWith('/super-admin') && state.url !== '/change-password') return router.parseUrl('/super-admin');
  return true;
};
export const anonymous: CanActivateFn = async route => {
  const auth = inject(Auth), router = inject(Router);
  return await auth.check() ? router.parseUrl(auth.user()?.mustChangePassword ? '/change-password' : auth.user()?.role === 'super_admin' ? '/super-admin' : safeDestination(route.queryParamMap.get('returnUrl'))) : true;
};
export const authenticationInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  if (!req.url.startsWith(environment.apiUrl + '/')) return next(req);
  return next(req.clone({ withCredentials: true, setHeaders: { 'X-Payroll-Request': '1' } })).pipe(catchError((error: HttpErrorResponse) => {
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

import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient);
  private router = inject(Router);
  readonly user = signal<{ id: string; email: string; role?: 'admin' | 'user' } | null>(null);
  async check() {
    try { this.user.set(await firstValueFrom(this.http.get<{ id: string; email: string; role?: 'admin' | 'user' }>(`${environment.apiUrl}/auth/me`))); return true; }
    catch { this.user.set(null); return false; }
  }
  async login(email: string, password: string) {
    this.user.set(await firstValueFrom(this.http.post<{ id: string; email: string; role?: 'admin' | 'user' }>(`${environment.apiUrl}/auth/login`, { email, password })));
  }
  async logout() {
    await firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout`, {}));
    this.user.set(null);
    await this.router.navigateByUrl('/login');
  }
  expired() {
    this.user.set(null);
    if (!this.router.url.startsWith('/login')) void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }
}
export function safeDestination(value: string | null): string {
  return value && /^\/(?!\/)/.test(value) && !value.includes('\\') && !value.startsWith('/login') ? value : '/';
}
export const authenticated: CanActivateFn = async (_route, state) => {
  const auth = inject(Auth), router = inject(Router);
  return await auth.check() || router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
export const anonymous: CanActivateFn = async route => {
  const auth = inject(Auth), router = inject(Router);
  return await auth.check() ? router.parseUrl(safeDestination(route.queryParamMap.get('returnUrl'))) : true;
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

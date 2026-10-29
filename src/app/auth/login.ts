import { PRODUCT_BRAND } from '../branding';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Auth, safeDestination } from './auth';

@Component({
  selector: 'app-login', imports: [FormsModule],
  template: `<section class="login-page"><form #form="ngForm" (ngSubmit)="submit()" class="login-card">
    <div class="brand-mark">P</div><p class="eyebrow">{{productBrand}}</p><h1>Welcome back</h1><p>Sign in to your payroll workspace.</p>
    <label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="username" [(ngModel)]="email" required email maxlength="254" #emailInput="ngModel" [disabled]="busy" />
    @if (emailInput.touched && emailInput.invalid) { <small class="validation">Enter a valid email address.</small> }
    <label for="password">Password</label><div class="password-row"><input id="password" name="password" [type]="show ? 'text' : 'password'" autocomplete="current-password" [(ngModel)]="password" required minlength="8" maxlength="128" #passwordInput="ngModel" [disabled]="busy" /><button type="button" class="secondary" (click)="show = !show" [attr.aria-pressed]="show" [attr.aria-label]="show ? 'Hide password' : 'Show password'">{{show ? 'Hide' : 'Show'}}</button></div>
    @if (passwordInput.touched && passwordInput.invalid) { <small class="validation">Password must be at least 8 characters long.</small> }
    @if (error) { <p class="notice error" role="alert">{{error}}</p> }
    <button class="primary sign-in" type="submit" [disabled]="form.invalid || busy">{{busy ? 'Signing in…' : 'Sign in'}}</button>
    <p class="help">Contact your administrator if you need access.</p>
  </form></section>`,
  styles: [`.login-page{min-height:100vh;display:grid;place-items:center;padding:24px}.login-card{width:100%;max-width:420px;padding:36px;background:white;border:1px solid #d6dfd5;border-radius:14px;box-shadow:0 12px 40px #20372c0a}.brand-mark{width:44px;height:44px;background:#214d36;color:white;border-radius:10px;display:grid;place-items:center;font-size:24px;font-weight:700}.eyebrow{font-size:11px;letter-spacing:2px;margin-top:24px}h1{font-size:28px;margin:12px 0}p{color:#647265;font-size:14px;line-height:1.6}label{display:block;margin:24px 0 8px;font-size:13px;font-weight:600}input{width:100%;min-width:0;min-height:44px;padding:10px 12px;font:inherit;border:1px solid #cbd5c8;border-radius:6px;background:#fff}.password-row{display:flex;gap:8px}.sign-in{width:100%;margin-top:28px}.help{text-align:center;font-size:12px;margin:20px 0 0}.validation{display:block;color:#93372b;margin-top:6px}`],
})
export class Login {
  readonly productBrand = PRODUCT_BRAND;
  private change = inject(ChangeDetectorRef);
  private auth = inject(Auth); private router = inject(Router); private route = inject(ActivatedRoute);
  email = ''; password = ''; show = false; busy = false; error = '';
  async submit() {
    if (this.busy || !this.email || this.password.length < 8) return;
    this.busy = true; this.error = '';
    try { await this.auth.login(this.email.trim().toLowerCase(), this.password); this.password = ''; await this.router.navigateByUrl(this.auth.user()?.mustChangePassword ? '/change-password' : this.auth.user()?.role === 'super_admin' ? '/super-admin' : safeDestination(this.route.snapshot.queryParamMap.get('returnUrl'))); }
    catch (error) { this.error = error instanceof HttpErrorResponse && error.status === 401 ? 'Invalid email or password.' : error instanceof HttpErrorResponse && error.status === 429 ? 'Too many attempts. Please try again later.' : 'Unable to sign in. Please try again.'; }
    finally { this.busy = false; this.change.markForCheck(); }
  }
}

import { PsButton, PsFormField, PsFieldControl, PsPageHeader, PsIconButton } from '../shared/ui';
import { PRODUCT_BRAND } from '../branding';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Auth, safeDestination } from './auth';

@Component({
  selector: 'app-login', imports: [RouterLink, FormsModule, PsButton, PsFormField, PsFieldControl, PsPageHeader, PsIconButton],
  templateUrl: './login.html',
  styleUrl: './auth.css',
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

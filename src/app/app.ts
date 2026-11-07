import { NotificationModal } from './shared/notification-modal';
import { ActionIcon } from './shared/action-icon';
import { PageTransition } from './shared/page-transition';
import { PRODUCT_BRAND } from './branding';
import { Organization } from './organization';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from './auth/auth';
import { PsIcon } from './shared/ui/ps-icon';
import { PsButton } from './shared/ui/ps-button';
@Component({ selector: 'app-workspace', imports: [RouterLink, RouterLinkActive, RouterOutlet, PageTransition, ActionIcon, PsButton, PsIcon], templateUrl: './app.html', styleUrl: './app.css' })
export class WorkspaceLayout {
  readonly productBrand = PRODUCT_BRAND;
  readonly organization = inject(Organization);
  constructor() { this.organization.displayName.set(PRODUCT_BRAND); if (this.auth.user()?.role !== 'super_admin') void this.organization.load(); }
  private change = inject(ChangeDetectorRef);
  readonly auth = inject(Auth);
  get headerName() { return this.auth.user()?.role === 'super_admin' ? this.productBrand : this.organization.displayName(); }
  logoutError = ''; loggingOut = false;
  async logout() {
    if (this.loggingOut) return;
    this.loggingOut = true; this.logoutError = '';
    try { await this.auth.logout(); }
    catch { this.logoutError = 'Unable to sign out. Please try again.'; }
    finally { this.loggingOut = false; this.change.markForCheck(); }
  }
}
@Component({ selector: 'app-root', imports: [RouterOutlet, NotificationModal], template: '<router-outlet /><ps-notification-host />' })
export class App {}

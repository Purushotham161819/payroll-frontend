import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from './auth/auth';
@Component({ selector: 'app-workspace', imports: [RouterLink, RouterLinkActive, RouterOutlet], templateUrl: './app.html', styleUrl: './app.css' })
export class WorkspaceLayout {
  private change = inject(ChangeDetectorRef);
  readonly auth = inject(Auth);
  logoutError = ''; loggingOut = false;
  async logout() {
    if (this.loggingOut) return;
    this.loggingOut = true; this.logoutError = '';
    try { await this.auth.logout(); }
    catch { this.logoutError = 'Unable to sign out. Please try again.'; }
    finally { this.loggingOut = false; this.change.markForCheck(); }
  }
}
@Component({ selector: 'app-root', imports: [RouterOutlet], template: '<router-outlet />' })
export class App {}

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { PRODUCT_BRAND } from './branding';

@Injectable({providedIn:'root'})
export class Organization {
  private readonly http = inject(HttpClient);
  readonly displayName = signal(PRODUCT_BRAND);
  async load() {
    try {
      const config = await firstValueFrom(this.http.get<{displayName:string}>(`${environment.apiUrl}/settings/organization`));
      this.displayName.set(config.displayName?.trim() || PRODUCT_BRAND);
    } catch {
      // The interceptor handles expired sessions. An unavailable optional display
      // configuration must not prevent navigation or logout.
      this.displayName.set(PRODUCT_BRAND);
    }
  }
}

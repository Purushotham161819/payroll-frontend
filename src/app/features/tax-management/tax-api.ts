import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TaxApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  configuration() {
    return firstValueFrom(this.http.get<any>(this.base + '/settings/tax-configuration'));
  }
  year(body: unknown) {
    return firstValueFrom(
      this.http.put<any>(this.base + '/settings/tax-configuration/years', body),
    );
  }
  yearStatus(code: string, body: unknown) {
    return firstValueFrom(
      this.http.post<any>(
        this.base + '/settings/tax-configuration/years/' + encodeURIComponent(code) + '/status',
        body,
      ),
    );
  }
  revision(body: unknown) {
    return firstValueFrom(
      this.http.post<any>(this.base + '/settings/tax-configuration/revisions', body),
    );
  }
  activate(id: string, version: number) {
    return firstValueFrom(
      this.http.post<any>(
        this.base + '/settings/tax-configuration/revisions/' + encodeURIComponent(id) + '/activate',
        { version },
      ),
    );
  }
  private employee(id: string, year: string) {
    return (
      this.base + '/employees/' + encodeURIComponent(id) + '/income-tax/' + encodeURIComponent(year)
    );
  }
  employeeProfiles(id: string) {
    return firstValueFrom(
      this.http.get<any[]>(this.base + '/employees/' + encodeURIComponent(id) + '/income-tax'),
    );
  }
  editProfile(id: string, year: string, version: number) {
    return firstValueFrom(this.http.post<any>(this.employee(id, year) + '/edit', { version }));
  }
  changeProfileYear(id: string, year: string, body: unknown) {
    return firstValueFrom(this.http.post<any>(this.employee(id, year) + '/change-year', body));
  }
  history(id: string, year: string) {
    return firstValueFrom(this.http.get<any[]>(this.employee(id, year) + '/history'));
  }
  summary(id: string, year: string) {
    return firstValueFrom(this.http.get<any>(this.employee(id, year)));
  }
  profile(id: string, year: string, body: unknown) {
    return firstValueFrom(this.http.put<any>(this.employee(id, year), body));
  }
  calculate(id: string, year: string) {
    return firstValueFrom(this.http.post<any>(this.employee(id, year) + '/calculate', {}));
  }
}

import { Component, Injectable, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../environments/environment';

export interface StatutoryValues {
  wageCap: number | null;
  epfEmployerContributionPercentage: number | null;
  epsEmployerContributionPercentage: number | null;
  epfEmployeeContributionPercentage: number | null;
  esiEmployerContributionPercentage: number | null;
  esiEmployeeContributionPercentage: number | null;
}
const empty = (): StatutoryValues => ({ wageCap: null, epfEmployerContributionPercentage: null, epsEmployerContributionPercentage: null, epfEmployeeContributionPercentage: null, esiEmployerContributionPercentage: null, esiEmployeeContributionPercentage: null });
const editable = (value: StatutoryValues): StatutoryValues => ({ wageCap: value.wageCap, epfEmployerContributionPercentage: value.epfEmployerContributionPercentage, epsEmployerContributionPercentage: value.epsEmployerContributionPercentage, epfEmployeeContributionPercentage: value.epfEmployeeContributionPercentage, esiEmployerContributionPercentage: value.esiEmployerContributionPercentage, esiEmployeeContributionPercentage: value.esiEmployeeContributionPercentage });

@Injectable({providedIn: 'root'})
export class StatutoryDeductionsApi {
  private http = inject(HttpClient);
  private url = environment.apiUrl + '/settings/statutory-deductions';
  get() { return this.http.get<StatutoryValues | null>(this.url); }
  save(value: StatutoryValues) { return this.http.put<StatutoryValues>(this.url, editable(value)); }
}

@Component({selector: 'app-statutory-deductions', imports: [FormsModule, RouterLink, RouterLinkActive], templateUrl: './statutory-deductions.html', styleUrl: './statutory-deductions.css'})
export class StatutoryDeductionsPage implements OnInit {
  private api = inject(StatutoryDeductionsApi);
  loading = signal(true); saving = signal(false); error = signal(''); success = signal(''); loaded = signal(false); configured = signal(false);
  draft = empty(); private saved = empty();
  groups: { title: string; fields: { key: keyof StatutoryValues; label: string; currency?: boolean }[] }[] = [
    {title: 'Wage Cap', fields: [{key: 'wageCap', label: 'Wage Cap', currency: true}]},
    {title: 'EPF Contributions', fields: [{key: 'epfEmployerContributionPercentage', label: 'EPF Employer Contribution'}, {key: 'epsEmployerContributionPercentage', label: 'EPS Employer Contribution'}, {key: 'epfEmployeeContributionPercentage', label: 'EPF Employee Contribution'}]},
    {title: 'ESI Contributions', fields: [{key: 'esiEmployerContributionPercentage', label: 'ESI Employer Contribution'}, {key: 'esiEmployeeContributionPercentage', label: 'ESI Employee Contribution'}]},
  ];
  ngOnInit() { this.load(); }
  message(error: unknown) { const e = error as HttpErrorResponse; const message = e.error?.message; return Array.isArray(message) ? message.join('; ') : typeof message === 'string' ? message : e.status === 0 ? 'Cannot reach the server. Check your connection and try again.' : 'Unable to save or load statutory deductions. Please try again.'; }
  load() {
    this.loading.set(true); this.error.set('');
    this.api.get().subscribe({next: value => { this.saved = value ? editable(value) : empty(); this.draft = {...this.saved}; this.configured.set(!!value); this.loaded.set(true); this.loading.set(false); }, error: e => { this.error.set(this.message(e)); this.loading.set(false); }});
  }
  reset(form: NgForm) { this.draft = {...this.saved}; form.resetForm(this.draft); this.error.set(''); this.success.set(''); }
  save(form: NgForm) {
    this.success.set('');
    if (form.invalid || Object.values(this.draft).some(v => v === null || !Number.isFinite(v) || v < 0)) { form.control.markAllAsTouched(); return; }
    this.saving.set(true); this.error.set('');
    this.api.save(this.draft).subscribe({next: value => { this.saved = editable(value); this.draft = {...this.saved}; this.configured.set(true); form.resetForm(this.draft); this.saving.set(false); this.success.set('Statutory deduction settings saved.'); }, error: e => { this.saving.set(false); this.error.set(this.message(e)); }});
  }
}

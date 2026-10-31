import { Auth } from '../auth/auth';
import { Component, Injectable, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../environments/environment';

export interface StatutoryValues {
  isEpfCeilingApplicable?: boolean;
  wageCap: number | null;
  annualEsiCeilingLimit?: number | null;
  epfEmployerContributionPercentage: number | null;
  epsEmployerContributionPercentage: number | null;
  esiEmployerContributionPercentage: number | null;
}
const empty = (): StatutoryValues => ({ isEpfCeilingApplicable:false, annualEsiCeilingLimit: null, wageCap: null, epfEmployerContributionPercentage: null, epsEmployerContributionPercentage: null, esiEmployerContributionPercentage: null });
const editable = (value: StatutoryValues): StatutoryValues => ({ isEpfCeilingApplicable:value.isEpfCeilingApplicable??false, annualEsiCeilingLimit: value.annualEsiCeilingLimit ?? null, wageCap: value.wageCap, epfEmployerContributionPercentage: value.epfEmployerContributionPercentage, epsEmployerContributionPercentage: value.epsEmployerContributionPercentage, esiEmployerContributionPercentage: value.esiEmployerContributionPercentage });

@Injectable({providedIn: 'root'})
export class StatutoryDeductionsApi {
  private http = inject(HttpClient);
  private url = environment.apiUrl + '/settings/statutory-deductions';
  get() { return this.http.get<StatutoryValues | null>(this.url); }
  save(value: StatutoryValues) {
    const payload = editable(value);
    if (payload.annualEsiCeilingLimit == null) delete payload.annualEsiCeilingLimit;
    return this.http.put<StatutoryValues>(this.url, payload);
  }
}

@Component({selector: 'app-statutory-deductions', imports: [FormsModule, RouterLink, RouterLinkActive], templateUrl: './statutory-deductions.html', styleUrl: './statutory-deductions.css'})
export class StatutoryDeductionsPage implements OnInit {
  readonly taxAuth = inject(Auth);
  private api = inject(StatutoryDeductionsApi);
  loading = signal(true); saving = signal(false); error = signal(''); success = signal(''); loaded = signal(false); configured = signal(false);
  draft = empty(); private saved = empty();
  groups: { title: string; fields: { key: Exclude<keyof StatutoryValues,'isEpfCeilingApplicable'>; label: string; currency?: boolean }[] }[] = [
    {title: 'EPF Contributions', fields: [{key: 'wageCap', label: 'Annual EPF Ceiling Limit', currency: true}, {key: 'epfEmployerContributionPercentage', label: 'EPF Employer Contribution Rate'}, {key: 'epsEmployerContributionPercentage', label: 'EPS Employer Contribution Rate'}]},
    {title: 'ESI Contributions', fields: [{key: 'annualEsiCeilingLimit', label: 'Annual ESI Wage Ceiling Limit', currency: true}, {key: 'esiEmployerContributionPercentage', label: 'ESI Employer Contribution Rate'}]},
  ];
  currency(value: number | null | undefined) { return value == null ? '' : new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2}).format(value); }
  ngOnInit() { this.load(); }
  message(error: unknown) { const e = error as HttpErrorResponse; const message = e.error?.message; return Array.isArray(message) ? message.join('; ') : typeof message === 'string' ? message : e.status === 0 ? 'Cannot reach the server. Check your connection and try again.' : 'Unable to save or load statutory deductions. Please try again.'; }
  load() {
    this.loading.set(true); this.error.set('');
    this.api.get().subscribe({next: value => { this.saved = value ? editable(value) : empty(); this.draft = {...this.saved}; this.configured.set(!!value); this.loaded.set(true); this.loading.set(false); }, error: e => { this.error.set(this.message(e)); this.loading.set(false); }});
  }
  reset(form: NgForm) { this.draft = {...this.saved}; form.resetForm(this.draft); this.error.set(''); this.success.set(''); }
  save(form: NgForm) {
    this.success.set('');
    if (form.invalid || Object.entries(this.draft).some(([key, v]) => key === 'isEpfCeilingApplicable' ? typeof v !== 'boolean' : key === 'annualEsiCeilingLimit' && v == null ? false : v === null || !Number.isFinite(v) || v < 0)) { form.control.markAllAsTouched(); return; }
    this.saving.set(true); this.error.set('');
    this.api.save(this.draft).subscribe({next: value => { this.saved = editable(value); this.draft = {...this.saved}; this.configured.set(true); form.resetForm(this.draft); this.saving.set(false); this.success.set('Statutory deduction settings saved.'); }, error: e => { this.saving.set(false); this.error.set(this.message(e)); }});
  }
}

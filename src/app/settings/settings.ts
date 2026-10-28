import { RouterLink, RouterLinkActive } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localeIn from '@angular/common/locales/en-IN';
registerLocaleData(localeIn);
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface SalaryComponent {
  _id?: string; isSystemDefined?: boolean; name: string; code: string; category: string;
  calculationBaseType: string; calculationBaseComponentId: string | null;
  calculationType: string; calculationValue: number | null; fixedAmountPeriod: string | null;
  showInPayslip: boolean; status: string;
}
import { Injectable } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class SalaryComponentService {
  private http = inject(HttpClient);
  private url = environment.apiUrl + '/salary-components';
  list() { return this.http.get<SalaryComponent[]>(this.url); }
  save(value: SalaryComponent, id?: string) {
    const payload = {
      name: value.name, code: value.code, category: value.category,
      calculationBaseType: value.calculationBaseType,
      calculationBaseComponentId: value.calculationBaseComponentId,
      calculationType: value.calculationType, calculationValue: value.calculationValue,
      fixedAmountPeriod: value.fixedAmountPeriod,
      showInPayslip: value.showInPayslip, status: value.status,
    };
    return id ? this.http.patch(this.url + '/' + id, payload) : this.http.post(this.url, payload);
  }
  status(id: string, status: string) { return this.http.patch(this.url + '/' + id + '/status', { status }); }
}
@Component({ selector: 'app-settings', imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive], templateUrl: './settings.html', styleUrl: './settings.css' })
export class Settings implements OnInit {
  private service = inject(SalaryComponentService);
  records = signal<SalaryComponent[]>([]); loading = signal(false); busy = signal(false);
  error = signal(''); success = signal(''); modal = signal(false); formError = signal('');
  editId?: string; draft = this.empty();
  empty(): SalaryComponent { return { name: '', code: '', category: 'earning', calculationBaseType: 'annual_ctc', calculationBaseComponentId: null, calculationType: 'percentage', calculationValue: 0, fixedAmountPeriod: null, showInPayslip: true, status: 'active' }; }
  ngOnInit() { this.load(); }
  message(error: unknown) { const e = error as HttpErrorResponse; const m = e.error?.message; return Array.isArray(m) ? m.join('; ') : typeof m === 'string' ? m : 'Unable to reach the server. Please try again.'; }
  load() { this.loading.set(true); this.error.set(''); this.service.list().subscribe({ next: data => { this.records.set(data); this.loading.set(false); }, error: e => { this.error.set(this.message(e)); this.loading.set(false); } }); }
  locked() { return !!this.editId && this.mandatory(this.draft); }
  mandatory(c: SalaryComponent) { return c.isSystemDefined === true || ['BASIC','DA','RA'].includes(c.code); }
  open(c?: SalaryComponent) { this.editId = c?._id; this.draft = c ? { ...c } : this.empty(); this.formError.set(''); this.modal.set(true); setTimeout(() => document.querySelector<HTMLDialogElement>('dialog')?.showModal()); }
  close() { if (!this.busy()) { document.querySelector<HTMLDialogElement>('dialog')?.close(); this.modal.set(false); document.getElementById('add-component')?.focus(); } }
  allowed(c: SalaryComponent) {
    if (c._id === this.editId) return false;
    if (c.status !== 'active' && c._id !== this.draft.calculationBaseComponentId) return false;
    const visited = new Set<string>(); let current: SalaryComponent | undefined = c;
    while (current) { if (current._id === this.editId || visited.has(current._id!)) return false; visited.add(current._id!); current = this.records().find(r => r._id === current?.calculationBaseComponentId); }
    return true;
  }
  options() { return this.records().filter(c => this.allowed(c)); }
  base(c: SalaryComponent) { const b = this.records().find(r => r._id === c.calculationBaseComponentId); return c.code === 'BASIC' ? 'Gross Wages' : ['DA','RA'].includes(c.code) ? 'BASIC' : c.calculationBaseType === 'gross_wages' ? 'Gross Wages' : c.calculationBaseType === 'core_wages' ? 'Core Wages' : c.calculationBaseType === 'annual_ctc' ? 'Annual CTC' : b ? `${b.name} (${b.code})` : 'Unavailable component'; }
  selectedBase() { return ['gross_wages','core_wages'].includes(this.draft.calculationBaseType) ? this.draft.calculationBaseType : this.draft.calculationBaseType === 'annual_ctc' ? '' : this.draft.calculationBaseComponentId ?? ''; }
  setBase(id: string) { this.draft.calculationBaseType = ['gross_wages','core_wages'].includes(id) ? id : id ? 'salary_component' : 'annual_ctc'; this.draft.calculationBaseComponentId = this.draft.calculationBaseType === 'salary_component' ? id : null; }
  save(form: NgForm) {
    this.draft.name = this.draft.name.trim(); this.draft.code = this.draft.code.trim().toUpperCase();
    if (form.invalid || !this.draft.name || !this.draft.code) { form.control.markAllAsTouched(); this.formError.set('Complete all required fields with valid values.'); return; }
    const { _id, ...payload } = this.draft;
    payload.fixedAmountPeriod = payload.calculationType === 'fixed' ? payload.fixedAmountPeriod : null;
    this.busy.set(true); this.formError.set('');
    this.service.save(payload, this.editId).subscribe({ next: () => { this.busy.set(false); this.close(); this.success.set('Salary component saved.'); this.load(); }, error: e => { this.busy.set(false); this.formError.set(this.message(e)); } });
  }
  toggle(c: SalaryComponent) { this.busy.set(true); this.error.set(''); this.service.status(c._id!, c.status === 'active' ? 'inactive' : 'active').subscribe({ next: () => { this.busy.set(false); this.success.set('Component status updated.'); this.load(); }, error: e => { this.busy.set(false); this.error.set(this.message(e)); } }); }
}






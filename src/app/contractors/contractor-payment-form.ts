import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Contractor, ContractorApi, ContractorComponent, PaymentDraft } from './contractor-api';
import {
  calculateContractorPayment,
  moneyCents,
  validateDeductionRule,
} from './contractor-deductions';
import {
  PsButton,
  PsFormField,
  PsFieldControl,
  PsInrPipe,
  PsDatePipe,
  PsDataTable,
} from '../shared/ui';
import { PsDialog } from '../shared/ui/ps-dialog';
import { PsKpiCard } from '../shared/ui/ps-kpi-card';
import { apiError } from '../employees/employee.service';
export interface ContractorPaymentRow {
  contractor: Contractor;
  deductions: (ContractorComponent & { amount: number })[];
  description: string;
  grossPay: number | null;
  totalDeductions: number;
  netPayment: number;
  error: string;
  eligible: boolean;
}
@Component({
  selector: 'app-contractor-payment-form',
  imports: [
    FormsModule,
    PsButton,
    PsFormField,
    PsFieldControl,
    PsInrPipe,
    PsDatePipe,
    PsDataTable,
    PsDialog,
    PsKpiCard,
  ],
  templateUrl: './contractor-payment-form.html',
})
export class ContractorPaymentForm implements OnInit {
  readonly initialIds = input<string[]>([]);
  readonly closed = output<void>();
  readonly recorded = output<void>();
  private readonly api = inject(ContractorApi);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly contractors = signal<Contractor[]>([]);
  readonly components = signal<ContractorComponent[]>([]);
  readonly selected = signal<string[]>([]);
  readonly review = signal<PaymentDraft | null>(null);
  readonly confirmation = signal<ContractorPaymentRow[]>([]);
  paymentDate = '';
  descriptions: Record<string, string> = {};
  gross: Record<string, number | null> = {};
  ngOnInit() {
    this.selected.set([...this.initialIds()]);
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [c, components] = await Promise.all([
        firstValueFrom(this.api.list()),
        firstValueFrom(this.api.components()),
      ]);
      this.contractors.set(c);
      this.components.set(components);
      this.selected.update(ids => ids.filter(id => c.some(contractor => contractor._id === id && contractor.status !== 'Inactive')));
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.loading.set(false);
    }
  }
  visibleContractors() {
    return this.initialIds().length
      ? this.contractors().filter((c) => this.initialIds().includes(c._id))
      : this.contractors();
  }
  assigned(c: Contractor) {
    return this.components()
      .filter(
        (p) =>
          p.classification === 'deduction' &&
          p.status === 'active' &&
          c.componentIds.includes(p._id),
      )
      .sort((a, b) => a._id.localeCompare(b._id));
  }
  configurationError(c: Contractor) {
    if(c.status === 'Inactive') return 'Inactive contractors cannot receive new payments.';
    if (c.componentIds.some((id) => !this.components().some((p) => p._id === id)))
      return 'An assigned component is no longer available. Review contractor assignments.';
    try {
      for (const p of this.assigned(c)) validateDeductionRule(p);
      return '';
    } catch (e) {
      return (e as Error).message;
    }
  }
  eligible() {
    return this.visibleContractors().filter((c) => !this.configurationError(c));
  }
  allSelected() {
    const eligible = this.eligible();
    return !!eligible.length && eligible.every((c) => this.selected().includes(c._id));
  }
  mixedSelected() {
    const count = this.eligible().filter((c) => this.selected().includes(c._id)).length;
    return count > 0 && count < this.eligible().length;
  }
  toggle(id: string, on: boolean) {
    const c = this.visibleContractors().find((c) => c._id === id);
    if (!c || this.configurationError(c)) return;
    this.selected.update((ids) =>
      on ? [...ids.filter((i) => i !== id), id] : ids.filter((i) => i !== id),
    );
  }
  toggleAll(on: boolean) {
    const ids = this.eligible().map((c) => c._id);
    this.selected.set(on ? ids : []);
  }
  row(c: Contractor): ContractorPaymentRow {
    const configuration = this.configurationError(c);
    const gross = this.gross[c._id];
    const result: ContractorPaymentRow = {
      contractor: c,
      description: this.descriptions[c._id] || '',
      deductions: [],
      grossPay: gross ?? null,
      totalDeductions: 0,
      netPayment: 0,
      error: configuration,
      eligible: !configuration,
    };
    if (configuration) return result;
    if (gross === null || gross === undefined) {
      result.error = 'Enter Gross Pay for this contractor.';
      return result;
    }
    try {
      const rules = this.assigned(c),
        totals = calculateContractorPayment(gross, rules);
      return {
        ...result,
        ...totals,
        deductions: rules.map((p, i) => ({ ...p, amount: totals.amounts[i] })),
        error: totals.netPayment < 0 ? 'Total deductions cannot exceed Gross Pay.' : '',
      };
    } catch (e) {
      return { ...result, error: (e as Error).message };
    }
  }
  rows() {
    return this.visibleContractors().map((c) => this.row(c));
  }
  selectedRows() {
    return this.rows().filter((r) => this.selected().includes(r.contractor._id));
  }
  totals(rows = this.selectedRows()) {
    return {
      grossPay:
        rows.reduce(
          (s, r) =>
            s +
            (r.grossPay !== null && Number.isFinite(r.grossPay) && r.grossPay >= 0
              ? Math.round(r.grossPay * 100)
              : 0),
          0,
        ) / 100,
      netPayment: rows.reduce((s, r) => s + Math.round(r.netPayment * 100), 0) / 100,
    };
  }
  canSubmit() {
    return (
      !this.loading() &&
      !this.busy() &&
      this.selectedRows().length > 0 &&
      this.selectedRows().every((r) => !r.error)
    );
  }
  prepare(form: NgForm) {
    if (this.busy() || this.loading()) return;
    form.form.markAllAsTouched();
    this.error.set('');
    if (form.invalid) return;
    const date = new Date(this.paymentDate + 'T00:00:00Z');
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(this.paymentDate) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== this.paymentDate ||
      this.paymentDate < '1900-01-01'
    ) {
      this.error.set('Enter a valid payment date.');
      return;
    }
    const rows = this.selectedRows();
    if (!rows.length) {
      this.error.set('Select at least one contractor.');
      return;
    }
    if (rows.some((r) => !r.description.trim() || r.description.length > 1000)) {
      this.error.set(
        'Enter a description of at most 1000 characters for each selected contractor.',
      );
      return;
    }
    if (rows.some((r) => r.error)) {
      this.error.set('Correct the Gross Pay or deduction errors in the selected rows.');
      return;
    }
    this.confirmation.set(structuredClone(rows));
    this.review.set({
      idempotencyKey: crypto.randomUUID(),
      paymentDate: this.paymentDate,
      entries: rows.map((r) => ({
        contractorId: r.contractor._id,
        contractorVersion: r.contractor.version,
        description: r.description.trim(),
        grossPay: r.grossPay!,
        components: r.deductions.map((p) => ({ componentId: p._id, componentVersion: p.version })),
      })),
    });
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>('[data-confirm-payment]')?.focus(),
    );
  }
  back() {
    this.review.set(null);
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>('[data-review-payment]')?.focus(),
    );
  }
  async submit() {
    const draft = this.review();
    if (!draft || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.api.pay(draft));
      this.recorded.emit();
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.busy.set(false);
    }
  }
}

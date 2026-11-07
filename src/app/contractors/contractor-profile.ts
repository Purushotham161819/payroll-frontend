import { completionSignal } from '../shared/notification.service';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import {
  Contractor,
  ContractorApi,
  ContractorComponent,
  ContractorPayment,
  classificationLabel,
} from './contractor-api';
import { validateDeductionRule } from './contractor-deductions';
import { ContractorForm } from './contractor-form';
import { ContractorPaymentForm } from './contractor-payment-form';
import { Auth } from '../auth/auth';
import {
  PsButton,
  PsIconButton,
  PsPageHeader,
  PsCard,
  PsCardTitle,
  PsCardSubtitle,
  PsCardActions,
  PsCardFooter,
  PsFormField,
  PsFieldControl,
  PsDataTable,
  PsStatusBadge,
  PsDatePipe,
  PsInrPipe,
} from '../shared/ui';
import { PsTabs } from '../shared/ui/ps-tabs';
import { PsDialog } from '../shared/ui/ps-dialog';
import { PsFeatureLayout } from '../shared/ui/ps-feature-layout';
import { apiError } from '../employees/employee.service';
@Component({
  selector: 'app-contractor-profile',
  imports: [
    FormsModule,
    RouterLink,
    ContractorForm,
    ContractorPaymentForm,
    PsButton,
    PsIconButton,
    PsPageHeader,
    PsCard,
    PsCardTitle,
    PsCardSubtitle,
    PsCardActions,
    PsCardFooter,
    PsFormField,
    PsFieldControl,
    PsDataTable,
    PsStatusBadge,
    PsDatePipe,
    PsInrPipe,
    PsTabs,
    PsDialog,
    PsFeatureLayout,
  ],
  templateUrl: './contractor-profile.html',
})
export class ContractorProfile implements OnInit {
  readonly auth = inject(Auth);
  readonly editingStatus = signal(false);
  readonly paying = signal(false);
  statusDraft: 'Active' | 'Inactive' = 'Active';
  editStatus() {
    this.statusDraft = this.contractor()?.status || 'Active';
    this.editingStatus.set(true);
  }
  async saveStatus() {
    const c = this.contractor();
    if (!c || this.busy() || this.auth.user()?.role !== 'admin') return;
    this.busy.set(true);
    this.error.set('');
    try {
      this.contractor.set(await firstValueFrom(this.api.changeStatus(c, this.statusDraft)));
      this.editingStatus.set(false);
      this.success.set('Contractor status saved.');
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.busy.set(false);
    }
  }
  paymentRecorded() {
    this.paying.set(false);
    this.success.set('Contractor payment recorded.');
    void this.load();
  }
  private readonly api = inject(ContractorApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly label = classificationLabel;
  readonly tab = signal('details');
  readonly tabs = [
    { id: 'details', label: 'Contractor Details' },
    { id: 'payments', label: 'Payments' },
  ];
  readonly contractor = signal<Contractor | null>(null);
  readonly components = signal<ContractorComponent[]>([]);
  readonly payments = signal<ContractorPayment[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly success = completionSignal();
  readonly editing = signal(false);
  readonly editingAssignments = signal(false);
  readonly busy = signal(false);
  readonly selected = signal<string[]>([]);
  readonly detail = signal<ContractorPayment | null>(null);
  private id = '';
  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.tab.set(
      this.route.snapshot.queryParamMap.get('tab') === 'payments' ? 'payments' : 'details',
    );
    void this.load();
  }
  changeTab(value: string) {
    this.tab.set(value);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  async load() {
    this.error.set('');
    this.loading.set(true);
    try {
      const [c, components, payments] = await Promise.all([
        firstValueFrom(this.api.get(this.id)),
        firstValueFrom(this.api.components()),
        firstValueFrom(this.api.history(this.id)),
      ]);
      this.contractor.set(c);
      this.selected.set(
        c.componentIds.filter((id) =>
          components.some((p) => p._id === id && p.classification === 'deduction'),
        ),
      );
      this.components.set(components);
      this.payments.set(payments);
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.loading.set(false);
    }
  }
  available() {
    return this.components().filter(
      (c) =>
        c.classification === 'deduction' &&
        (c.status === 'active' || this.contractor()?.componentIds.includes(c._id)),
    );
  }
  configurationError(p: ContractorComponent) {
    try {
      validateDeductionRule(p);
      return '';
    } catch (e) {
      return (e as Error).message;
    }
  }
  toggle(id: string, on: boolean) {
    this.selected.update((ids) =>
      on ? [...ids.filter((x) => x !== id), id] : ids.filter((x) => x !== id),
    );
  }
  cancelAssignments() {
    this.selected.set(
      (this.contractor()?.componentIds || []).filter((id) =>
        this.components().some((p) => p._id === id && p.classification === 'deduction'),
      ),
    );
    this.editingAssignments.set(false);
  }
  editAssignments() {
    this.cancelAssignments();
    this.editingAssignments.set(true);
  }
  async saveAssignments() {
    const c = this.contractor();
    if (!c || this.busy() || !this.editingAssignments()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const saved = await firstValueFrom(this.api.assign(c, this.selected()));
      this.contractor.set(saved);
      this.editingAssignments.set(false);
      this.success.set('Contractor component assignments saved.');
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.busy.set(false);
    }
  }
  saved(c: Contractor) {
    this.contractor.set(c);
    this.editing.set(false);
    this.success.set('Contractor details saved.');
  }
}

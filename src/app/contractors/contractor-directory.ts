import { completionSignal } from '../shared/notification.service';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CdkMenuModule } from '@angular/cdk/menu';
import { Auth } from '../auth/auth';
import { PsDialog } from '../shared/ui/ps-dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Contractor, ContractorApi } from './contractor-api';
import { ContractorForm } from './contractor-form';
import { ContractorPaymentForm } from './contractor-payment-form';
import {
  PsButton,
  PsIconButton,
  PsPageHeader,
  PsCard,
  PsCardTitle,
  PsCardSubtitle,
  PsCardActions,
  PsDataTable,
  PsFormField,
  PsFieldControl,
  PsIcon,
  PsTooltip,
  PsStatusBadge,
} from '../shared/ui';
import { PsTabs, PEOPLE_TABS } from '../shared/ui/ps-tabs';
import { PsFeatureLayout } from '../shared/ui/ps-feature-layout';
import { apiError } from '../employees/employee.service';
@Component({
  selector: 'app-contractors',
  imports: [
    CdkMenuModule,
    PsDialog,
    PsStatusBadge,
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
    PsDataTable,
    PsFormField,
    PsFieldControl,
    PsIcon,
    PsTooltip,
    PsTabs,
    PsFeatureLayout,
  ],
  templateUrl: './contractor-directory.html',
  styleUrl: '../shared/ui/ps-action-menu.scss',
})
export class ContractorDirectory implements OnInit {
  readonly tabs = PEOPLE_TABS;
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly statusFilter = signal('Active');
  changeFilter(value: string) {
    this.statusFilter.set(value);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { status: value }, queryParamsHandling: 'merge', replaceUrl: true });
  }
  readonly deleting = signal<Contractor | null>(null);
  readonly deletingBusy = signal(false);
  readonly deleteError = signal('');
  activeContractors() {
    return this.rows().filter((c) => c.status !== 'Inactive');
  }
  requestDelete(c: Contractor) {
    if (this.auth.user()?.role !== 'admin') return;
    this.deleteError.set('');
    this.deleting.set(c);
  }
  async confirmDelete() {
    const c = this.deleting();
    if (!c || this.deletingBusy() || this.auth.user()?.role !== 'admin') return;
    this.deletingBusy.set(true);
    this.deleteError.set('');
    try {
      await firstValueFrom(this.api.remove(c._id));
      this.deleting.set(null);
      this.success.set('Contractor and associated payments permanently deleted.');
      await this.load();
    } catch (e) {
      const failure = e as { status?: number; error?: { message?: string } };
      this.deleteError.set(failure.status === 503 && failure.error?.message?.includes('MongoDB transactions')
        ? 'Safe deletion is unavailable: this database needs MongoDB transaction support. No records were changed.'
        : apiError(e));
    } finally {
      this.deletingBusy.set(false);
    }
  }
  private readonly api = inject(ContractorApi);
  readonly rows = signal<Contractor[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = completionSignal();
  readonly adding = signal(false);
  readonly editing = signal<Contractor | null>(null);
  readonly pay = signal<string[] | null>(null);
  readonly search = signal('');
  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.rows().filter(
      (c) =>
        (this.statusFilter() === 'All' || (c.status || 'Active') === this.statusFilter()) &&
        [c.firstName, c.lastName, c.email, c.contractorId, c.firstName + ' ' + c.lastName].some(
          (s) => s.toLowerCase().includes(q),
        ),
    );
  });
  ngOnInit() {
    const filter = this.route.snapshot.queryParamMap.get('status');
    if(filter && ['All','Active','Inactive'].includes(filter)) this.statusFilter.set(filter);
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.rows.set(await firstValueFrom(this.api.list()));
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.loading.set(false);
    }
  }
  added(c: Contractor) {
    this.adding.set(false);
    this.success.set('Contractor ' + c.contractorId + ' added successfully.');
    void this.load();
  }
  paymentRecorded() {
    this.pay.set(null);
    this.success.set('Contractor payment recorded. This does not confirm a bank transfer.');
  }
  edited() {
    this.editing.set(null);
    this.success.set('Contractor details saved.');
    void this.load();
  }
}

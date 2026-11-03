import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ContractorApi, ContractorComponent, classificationLabel } from './contractor-api';
import { validateDeductionRule } from './contractor-deductions';
import { Auth } from '../auth/auth';
import { apiError } from '../employees/employee.service';
import { SettingsTabs } from '../shared/settings-tabs';
import {
  PsButton,
  PsIconButton,
  PsPageHeader,
  PsCard,
  PsCardTitle,
  PsDataTable,
  PsFormField,
  PsFieldControl,
  PsStatusBadge,
  PsInrPipe,
} from '../shared/ui';
import { PsDialog } from '../shared/ui/ps-dialog';
import { PsFeatureLayout } from '../shared/ui/ps-feature-layout';
const empty = (): Omit<ContractorComponent, '_id' | 'version'> => ({
  name: '',
  code: '',
  classification: 'deduction',
  status: 'active',
  calculationType: 'percentage',
  formula: '',
});
@Component({
  selector: 'app-contractor-settings',
  imports: [
    FormsModule,
    SettingsTabs,
    PsButton,
    PsIconButton,
    PsPageHeader,
    PsCard,
    PsCardTitle,
    PsDataTable,
    PsFormField,
    PsFieldControl,
    PsStatusBadge,
    PsInrPipe,
    PsDialog,
    PsFeatureLayout,
  ],
  templateUrl: './contractor-settings.html',
})
export class ContractorSettings implements OnInit {
  private readonly api = inject(ContractorApi);
  readonly auth = inject(Auth);
  readonly label = classificationLabel;
  readonly rows = signal<ContractorComponent[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly modal = signal(false);
  readonly busy = signal(false);
  readonly formError = signal('');
  editing?: ContractorComponent;
  draft = empty();
  ngOnInit() {
    void this.load();
  }
  async load() {
    this.error.set('');
    this.loading.set(true);
    try {
      this.rows.set((await firstValueFrom(this.api.components())).filter(c => c.classification === 'deduction'));
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.loading.set(false);
    }
  }
  open(c?: ContractorComponent) {
    this.editing = c;
    this.draft = c
      ? {
          name: c.name,
          code: c.code,
          classification: c.classification,
          status: c.status,
          calculationType: c.calculationType === 'manual' ? 'percentage' : c.calculationType,
          calculationValue: c.calculationValue,
          formula: c.formula || '',
        }
      : empty();
    this.formError.set('');
    this.modal.set(true);
  }
  async save(form: NgForm) {
    if (this.busy()) return;
    form.form.markAllAsTouched();
    if (form.invalid) return;
    try { validateDeductionRule(this.draft); } catch(e) { this.formError.set((e as Error).message); return; }
    this.busy.set(true);
    this.formError.set('');
    const dto = {
      ...this.draft,
      name: this.draft.name.trim(),
      code: this.draft.code.trim().toUpperCase(),
    };
    if (!['fixed', 'percentage'].includes(dto.calculationType)) delete dto.calculationValue;
    if (dto.calculationType !== 'formula') dto.formula = '';
    try {
      await firstValueFrom(this.api.saveComponent(dto, this.editing));
      this.modal.set(false);
      this.success.set('Contractor component saved. Historical payments remain unchanged.');
      await this.load();
    } catch (e) {
      this.formError.set(apiError(e));
    } finally {
      this.busy.set(false);
    }
  }
}

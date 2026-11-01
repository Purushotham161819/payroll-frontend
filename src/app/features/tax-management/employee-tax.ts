import { ActionIcon } from '../../shared/action-icon';
import { InformationTip } from '../../shared/information-tip';
import { DetailDialog } from '../../shared/detail-dialog';
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  input,
  signal,
  viewChild,
  ElementRef,
  effect,
  HostListener,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { TaxApi } from './tax-api';
import { apiError } from '../../employees/employee.service';
import { SalaryComponentService } from '../../settings/settings';

type EmploymentFields = {
  employmentScenario?: 'first_job' | 'job_change' | null;
  previousEmployerGrossWages?: number | null;
  previousEmployerExemptWages?: number | null;
  previousEmployerTds?: number | null;
  previousEmployerExemptionsVerified?: boolean;
};
const emptyProfile = (): EmploymentFields & {
  version: number;
  regime: string;
  tdsApplicable: boolean;
  resident: boolean;
  salaryOnly: boolean;
  panOperative: boolean;
  fullYearEmployment: boolean;
  exemptionConditionsConfirmed: boolean;
  reason: string;
} => ({
  employmentScenario: null,
  previousEmployerGrossWages: null,
  previousEmployerExemptWages: null,
  previousEmployerTds: null,
  previousEmployerExemptionsVerified: false,
  version: 0,
  regime: '',
  tdsApplicable: false,
  resident: false,
  salaryOnly: false,
  panOperative: false,
  fullYearEmployment: false,
  exemptionConditionsConfirmed: false,
  reason: '',
});
@Component({
  selector: 'app-employee-tax',
  imports: [FormsModule, CurrencyPipe, DatePipe, ActionIcon, DetailDialog, InformationTip],
  templateUrl: './employee-tax.html',
  styleUrls: ['./tax-management.css', './employee-tax.css'],
})
export class EmployeeTax implements OnInit, OnDestroy {
  readonly employeeId = input.required<string>();
  private readonly api = inject(TaxApi);
  private readonly salaries = inject(SalaryComponentService);
  readonly years = signal<any[]>([]);
  readonly summary = signal<any>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly history = signal<any[]>([]);
  readonly detailModal = signal<'history' | 'slabs' | null>(null);
  readonly components = signal<any[]>([]);
  readonly configuration = signal<any>(null);
  readonly editing = signal(false);
  private readonly taxForm = viewChild<NgForm>('form');
  hasUnsavedChanges() {
    return (
      this.editing() &&
      (this.changingYear() ||
        (this.summary()?.profile ? this.hasProfileChanges() : !!this.taxForm()?.dirty))
    );
  }
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent) {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
  readonly viewingCalculation = signal<any>(null);
  readonly yearChangeOpen = signal(false);
  readonly changingYear = signal(false);
  readonly yearPreview = signal<any>(null);
  private readonly yearDialog = viewChild<ElementRef<HTMLDialogElement>>('yearDialog');
  private opener: HTMLElement | null = null;
  private editToken = '';
  private changeYearToken = '';
  private lockedYear = '';
  private returnYear = '';
  private alive = true;
  yearCode = '';
  targetYear = '';
  profile = emptyProfile();
  constructor() {
    effect(() => {
      const dialog = this.yearDialog()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
  }
  async ngOnInit() {
    await this.perform(async () => {
      const [state, profiles, components] = await Promise.all([
        this.api.configuration(),
        this.api.employeeProfiles(this.employeeId()),
        firstValueFrom(this.salaries.list()),
      ]);
      if (!this.alive) return;
      this.years.set(state.years);
      this.configuration.set(state);
      this.components.set(components);
      this.yearCode =
        profiles.find((p: any) => state.years.some((y: any) => y.code === p.yearCode))?.yearCode ??
        state.years.find((y: any) => y.active)?.code ??
        state.years[0]?.code ??
        '';
      if (this.yearCode) await this.fetch();
    });
  }
  async perform(work: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await work();
    } catch (error) {
      if (this.alive) this.error.set(apiError(error));
    } finally {
      if (this.alive) this.busy.set(false);
    }
  }
  private restoreProfile(value: any) {
    this.profile = {
      ...emptyProfile(),
      ...value.profile,
      regime: value.regimeSelection?.regime ?? value.profile?.regime ?? '',
    };
  }
  private async fetch() {
    const year = this.yearCode,
      value = await this.api.summary(this.employeeId(), year);
    if (!this.alive || this.yearCode !== year) return;
    this.applySummary(value, year);
  }
  private applySummary(value: any, year: string) {
    this.summary.set(value);
    this.restoreProfile(value);
    this.history.set([]);
    this.viewingCalculation.set(value.latest);
    if (value.profile || this.changingYear()) this.lockedYear = year;
    this.editing.set(this.changingYear() || !value.profile);
  }
  yearLocked() {
    return !!this.lockedYear;
  }
  regimeReady() {
    return !!this.summary()?.regimeSelection?.regime;
  }
  regimeLabel() {
    return this.profile.regime === 'new'
      ? 'New Regime'
      : this.profile.regime === 'old'
        ? 'Old Regime'
        : 'No applicable configuration';
  }
  async selectYear(value: string) {
    if (this.busy() || this.yearLocked()) return;
    this.yearCode = value;
    this.summary.set(null);
    await this.perform(() => this.fetch());
  }
  async load() {
    if (!this.years().length) {
      await this.ngOnInit();
      return;
    }
    await this.perform(async () => {
      if (!this.years().length) {
        const state = await this.api.configuration();
        this.years.set(state.years);
        this.yearCode = state.years.find((y: any) => y.active)?.code ?? state.years[0]?.code ?? '';
      }
      this.yearCode = this.lockedYear || this.yearCode;
      if (this.yearCode) await this.fetch();
    });
  }
  async edit() {
    if (this.busy() || !this.summary()?.profile) return;
    await this.perform(async () => {
      const permission = await this.api.editProfile(
        this.employeeId(),
        this.lockedYear,
        this.summary().profile.version,
      );
      this.editToken = permission.editToken;
      this.editing.set(true);
    });
  }
  async cancel() {
    if (this.busy()) return;
    if (this.returnYear) {
      const sourceYear = this.returnYear;
      await this.perform(async () => {
        const value = await this.api.summary(this.employeeId(), sourceYear);
        this.yearCode = sourceYear;
        this.lockedYear = sourceYear;
        this.returnYear = '';
        this.editToken = '';
        this.changeYearToken = '';
        this.changingYear.set(false);
        this.applySummary(value, sourceYear);
      });
      return;
    }
    this.editToken = '';
    this.restoreProfile(this.summary());
    this.editing.set(!this.summary()?.profile);
    this.error.set('');
  }
  employmentScenarioChanged() {
    if (this.profile.employmentScenario === 'first_job') {
      this.profile.previousEmployerGrossWages = null;
      this.profile.previousEmployerExemptWages = null;
      this.profile.previousEmployerTds = null;
      this.profile.previousEmployerExemptionsVerified = false;
    }
  }
  hasProfileChanges() {
    if (this.changingYear()) return true;
    const saved = this.summary()?.profile;
    if (!saved) return true;
    const values = (profile: any) => {
      const value = { ...emptyProfile(), ...profile };
      if (value.employmentScenario !== 'job_change') {
        value.previousEmployerGrossWages = 0;
        value.previousEmployerExemptWages = 0;
        value.previousEmployerTds = 0;
        value.previousEmployerExemptionsVerified = false;
      }
      return Object.keys(emptyProfile()).map((key) => value[key] ?? null);
    };
    return JSON.stringify(values(this.profile)) !== JSON.stringify(values(saved));
  }
  previousEmployerErrors() {
    if (this.profile.employmentScenario !== 'job_change') return [];
    const errors: string[] = [];
    for (const [value, label] of [
      [this.profile.previousEmployerGrossWages, 'Previous employer gross wages'],
      [this.profile.previousEmployerExemptWages, 'Previous employer exempt wages'],
      [this.profile.previousEmployerTds, 'Previous employer TDS'],
    ] as const) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1e12)
        errors.push(label + ' must be a number from zero to 1 trillion. Enter zero if none.');
      else if (Math.abs(value * 100 - Math.round(value * 100)) > 0.001)
        errors.push(label + ' must have at most two decimal places.');
    }
    if (
      (this.profile.previousEmployerExemptWages ?? 0) >
      (this.profile.previousEmployerGrossWages ?? 0)
    )
      errors.push('Previous employer exempt wages cannot exceed gross wages.');
    if (
      (this.profile.previousEmployerExemptWages ?? 0) > 0 &&
      !this.profile.previousEmployerExemptionsVerified
    )
      errors.push(
        'Verify documented previous-employer exemptions before saving a positive exempt amount.',
      );
    return errors;
  }
  canSave(form?: NgForm) {
    return (
      !this.busy() &&
      this.editing() &&
      this.regimeReady() &&
      !form?.invalid &&
      this.hasProfileChanges() &&
      this.previousEmployerErrors().length === 0 &&
      (this.profile.tdsApplicable || !!this.profile.reason.trim())
    );
  }
  async save(form?: NgForm) {
    if (this.busy() || !this.editing() || !this.regimeReady()) return;
    form?.form.markAllAsTouched();
    if (
      form?.invalid ||
      this.previousEmployerErrors().length ||
      (!this.profile.tdsApplicable && !this.profile.reason.trim())
    ) {
      this.error.set(
        this.previousEmployerErrors().join(' ') ||
          'Complete the required profile fields. Enter a reason if TDS is disabled.',
      );
      return;
    }
    if (!this.hasProfileChanges()) return;
    if (this.lockedYear && this.yearCode !== this.lockedYear) {
      this.error.set('Financial year is locked. Use Change Financial Year.');
      return;
    }
    await this.perform(async () => {
      await this.api.profile(this.employeeId(), this.yearCode, {
        ...this.profile,
        ...(this.editToken ? { editToken: this.editToken } : {}),
        ...(this.changeYearToken ? { changeYearToken: this.changeYearToken } : {}),
      });
      this.editToken = '';
      this.changeYearToken = '';
      this.returnYear = '';
      this.changingYear.set(false);
      await this.fetch();
      this.message.set('Tax profile saved. Recalculate the annual estimate after input changes.');
    });
  }
  canCalculate(form?: NgForm) {
    if (this.busy() || !this.profile.tdsApplicable || !this.regimeReady()) return false;
    if (this.editing()) return this.canSave(form);
    return !!this.summary()?.profile && this.summary()?.calculationStatus !== 'calculated';
  }
  async calculate(form?: NgForm) {
    if (!this.canCalculate(form)) return;
    if (this.editing()) {
      await this.save(form);
      if (this.editing() || this.error()) return;
    }
    await this.perform(async () => {
      await this.api.calculate(this.employeeId(), this.yearCode);
      await this.fetch();
      this.message.set('Annual tax estimate calculated and saved.');
    });
  }
  async openYearChange() {
    if (this.busy() || this.editing() || !this.summary()?.profile) return;
    this.opener = document.activeElement as HTMLElement;
    this.error.set('');
    this.targetYear = this.yearCode;
    this.yearPreview.set(this.summary());
    this.yearChangeOpen.set(true);
    await this.perform(async () => {
      const state = await this.api.configuration();
      this.configuration.set(state);
      this.years.set(state.years);
    });
  }
  async selectTargetYear(year: string) {
    if (this.busy()) return;
    this.targetYear = year;
    this.yearPreview.set(null);
    await this.perform(async () => {
      if (year) this.yearPreview.set(await this.api.summary(this.employeeId(), year));
    });
  }
  canConfirmYearChange() {
    return (
      !this.busy() &&
      !!this.targetYear &&
      this.targetYear !== this.yearCode &&
      !!this.yearPreview()?.regimeSelection?.regime
    );
  }
  closeYearChange(event?: Event) {
    event?.preventDefault();
    if (this.busy()) return;
    this.yearDialog()?.nativeElement.close();
    this.yearChangeOpen.set(false);
    const opener = this.opener;
    requestAnimationFrame(() => opener?.isConnected && opener.focus());
  }
  async confirmYearChange() {
    if (this.busy() || !this.targetYear || this.targetYear === this.lockedYear) return;
    await this.perform(async () => {
      const permission = await this.api.changeProfileYear(this.employeeId(), this.targetYear, {
        fromYearCode: this.lockedYear,
        fromVersion: this.summary().profile.version,
      });
      const value = await this.api.summary(this.employeeId(), permission.yearCode);
      if (!value.regimeSelection?.regime) {
        this.error.set(
          value.regimeSelection?.message ||
            'No valid Tax Configuration is available for this financial year.',
        );
        return;
      }
      this.returnYear = this.lockedYear;
      this.changeYearToken = permission.changeYearToken ?? '';
      this.editToken = permission.editToken ?? '';
      this.yearCode = permission.yearCode;
      this.changingYear.set(true);
      this.applySummary(value, permission.yearCode);
      this.yearDialog()?.nativeElement.close();
      this.yearChangeOpen.set(false);
    });
  }
  async loadHistory() {
    if (this.busy()) return;
    this.detailModal.set('history');
    this.history.set([]);
    await this.perform(async () =>
      this.history.set(await this.api.history(this.employeeId(), this.yearCode)),
    );
  }
  salaryRows() {
    const calculation = this.viewingCalculation(),
      result = calculation?.snapshot?.result;
    const mappings = calculation?.snapshot?.inputs?.revision?.rules?.mappings ?? [];
    if (result)
      return result.taxableComponents.map((row: any) => ({
        ...row,
        name:
          mappings.find((m: any) => m.componentId === row.componentId)?.componentName ??
          this.components().find((c) => c._id === row.componentId)?.name ??
          row.code,
        type: mappings.find((m: any) => m.componentId === row.componentId)?.type ?? 'Not recorded',
      }));
    const state = this.configuration();
    const revision = state?.revisions?.find(
      (r: any) => r.id === state.published?.[this.yearCode + ':' + this.profile.regime],
    );
    return this.components()
      .filter((c) => c.status === 'active' && c.category !== 'deduction')
      .map((c) => ({
        componentId: c._id,
        code: c.code,
        name: c.name,
        type:
          revision?.rules.mappings.find((m: any) => m.componentId === c._id)?.type ??
          'Not configured',
        annual: null,
        exempt: null,
        taxable: null,
      }));
  }
  ngOnDestroy() {
    this.alive = false;
  }
}

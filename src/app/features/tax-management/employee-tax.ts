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
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { TaxApi } from './tax-api';
import { apiError } from '../../employees/employee.service';
import { SalaryComponentService } from '../../settings/settings';

const emptyProfile = () => ({
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
  imports: [FormsModule, CurrencyPipe, DatePipe],
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
  readonly components = signal<any[]>([]);
  readonly configuration = signal<any>(null);
  readonly editing = signal(false);
  readonly viewingCalculation = signal<any>(null);
  readonly yearChangeOpen = signal(false);
  readonly changingYear = signal(false);
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
    this.summary.set(value);
    this.restoreProfile(value);
    this.history.set([]);
    this.viewingCalculation.set(value.latest);
    if (value.profile) {
      this.lockedYear = year;
      if (this.changingYear()) {
        this.changeYearToken = '';
        this.returnYear = '';
        this.changingYear.set(false);
      }
    }
    this.editing.set(!value.profile);
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
    this.editToken = '';
    if (this.returnYear) {
      this.yearCode = this.returnYear;
      this.lockedYear = this.returnYear;
      this.returnYear = '';
      this.changeYearToken = '';
      this.changingYear.set(false);
      await this.perform(() => this.fetch());
      return;
    }
    this.restoreProfile(this.summary());
    this.editing.set(!this.summary()?.profile);
    this.error.set('');
  }
  async save(form?: NgForm) {
    if (this.busy() || !this.editing() || !this.regimeReady()) return;
    form?.form.markAllAsTouched();
    if (form?.invalid || (!this.profile.tdsApplicable && !this.profile.reason.trim())) {
      this.error.set(
        'Complete the highlighted profile fields. A reason is required when TDS is disabled.',
      );
      return;
    }
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
  async calculate() {
    if (
      this.busy() ||
      this.editing() ||
      !this.summary()?.profile ||
      !this.profile.tdsApplicable ||
      !this.regimeReady()
    )
      return;
    await this.perform(async () => {
      await this.api.calculate(this.employeeId(), this.yearCode);
      await this.fetch();
      this.message.set('Annual tax estimate calculated and saved.');
    });
  }
  openYearChange() {
    if (this.busy() || this.editing() || !this.summary()?.profile) return;
    this.opener = document.activeElement as HTMLElement;
    this.error.set('');
    this.targetYear = '';
    this.yearChangeOpen.set(true);
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
      this.returnYear = this.lockedYear;
      this.changeYearToken = permission.changeYearToken;
      this.yearCode = permission.yearCode;
      this.lockedYear = permission.yearCode;
      this.changingYear.set(true);
      this.yearDialog()?.nativeElement.close();
      this.yearChangeOpen.set(false);
      await this.fetch();
      this.message.set(
        'Financial year opened. Existing profiles, calculations and payroll history are retained.',
      );
    });
  }
  async loadHistory() {
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

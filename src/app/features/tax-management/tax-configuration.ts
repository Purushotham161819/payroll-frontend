import { configurationProblems } from './tax-configuration-validation';
import { Component, OnInit, inject, signal, viewChild, ElementRef, effect } from '@angular/core';
import { FormsModule, NgForm, AbstractControl } from '@angular/forms';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SalaryComponentService } from '../../settings/settings';
import { apiError } from '../../employees/employee.service';
import { TaxApi } from './tax-api';
import { ActionIcon } from '../../shared/action-icon';
type TaxSection = 'master' | 'slabs' | 'surcharge' | 'taxability';
const sectionKeys: Record<TaxSection, string[]> = {
  master: [
    'ruleVersion',
    'standardDeduction',
    'rebateLimit',
    'maximumRebate',
    'cessPercentage',
    'rebateMarginalRelief',
    'surchargeMarginalRelief',
    'incomeRounding',
    'liabilityRounding',
    'minimumAge',
    'maximumAge',
  ],
  slabs: ['slabs'],
  surcharge: ['surcharge'],
  taxability: ['mappings', 'legalReferences', 'reviewNote', 'employerContributionsReviewed'],
};

@Component({
  selector: 'app-tax-configuration',
  imports: [FormsModule, DatePipe, CurrencyPipe, RouterLink, ActionIcon],
  templateUrl: './tax-configuration.html',
  styleUrls: ['./tax-management.css', './tax-configuration.css'],
})
export class TaxConfiguration implements OnInit {
  private readonly api = inject(TaxApi);
  private readonly salaries = inject(SalaryComponentService);
  readonly state = signal<any>({ version: 0, years: [], revisions: [], published: {}, audit: [] });
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly components = signal<any[]>([]);
  readonly loadingComponents = signal(false);
  readonly componentMessage = signal('');
  readonly componentError = signal('');
  year = { code: '', name: '', startDate: '', endDate: '', legislation: '', ruleVersion: '' };
  yearCode = '';
  regime = 'new';
  effectiveDate = '';
  sources = '';
  reviewNote = '';
  employerReviewed = false;
  standardDeduction: number | null = null;
  rebateLimit: number | null = null;
  maximumRebate: number | null = null;
  cess: number | null = null;
  minimumAge = 0;
  maximumAge: number | null = null;
  rebateRelief = false;
  surchargeRelief = false;
  incomeRounding = 'nearest-ten-ignore-paise';
  liabilityRounding = 'nearest-ten-ignore-paise';
  slabs: { from: number; to: number | null; rate: number }[] = [{ from: 0, to: null, rate: 0 }];
  surcharge: { threshold: number; rate: number }[] = [];
  mappings: any[] = [];
  confirmation: { kind: 'year' | 'revision'; id: string; active?: boolean } | null = null;
  readonly savingSection = signal<TaxSection | null>(null);
  readonly sectionMessages = signal<Partial<Record<TaxSection, string>>>({});
  readonly sectionErrors = signal<Partial<Record<TaxSection, string>>>({});
  historyPage = 1;
  readonly historyPageSize = 10;
  viewingRevision: any = null;
  private readonly historyDialog = viewChild<ElementRef<HTMLDialogElement>>('historyDialog');
  private readonly activationDialog = viewChild<ElementRef<HTMLDialogElement>>('activationDialog');
  private actionOpener: HTMLElement | null = null;
  constructor() {
    effect(() => {
      for (const dialog of [
        this.historyDialog()?.nativeElement,
        this.activationDialog()?.nativeElement,
      ])
        if (dialog && !dialog.open) dialog.showModal();
    });
  }
  private editorRules(): any {
    return {
      ruleVersion: 'salary-only-v1',
      standardDeduction: this.standardDeduction,
      rebateLimit: this.rebateLimit,
      maximumRebate: this.maximumRebate,
      cessPercentage: this.cess,
      rebateMarginalRelief: this.rebateRelief,
      surchargeMarginalRelief: this.surchargeRelief,
      surcharge: this.surcharge,
      slabs: this.slabs,
      incomeRounding: this.incomeRounding,
      liabilityRounding: this.liabilityRounding,
      minimumAge: this.minimumAge,
      maximumAge: this.maximumAge,
      employerContributionsReviewed: this.employerReviewed,
      reviewNote: this.reviewNote,
      legalReferences: this.sources
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      mappings: this.mappings.map((m) => ({
        componentId: m.componentId,
        type: m.type,
        legalReference: m.legalReference,
        conditions: m.conditions,
        ...(m.type === 'partial'
          ? m.partialMode === 'amount'
            ? { exemptAmount: m.exemptAmount }
            : { taxablePercentage: m.taxablePercentage }
          : {}),
      })),
    };
  }
  baseline() {
    return this.state()
      .revisions.filter(
        (r: any) => r.yearCode === this.yearCode && r.regime === this.regime && r.rules,
      )
      .sort((a: any, b: any) => b.version - a.version)[0];
  }
  private sectionValue(rules: any, section: TaxSection) {
    const value = Object.fromEntries(sectionKeys[section].map((key) => [key, rules[key]]));
    if (section === 'taxability')
      value['mappings'] = (rules.mappings ?? []).map((m: any) => ({
        componentId: m.componentId,
        type: m.type,
        legalReference: m.legalReference,
        conditions: m.conditions ?? '',
        ...(m.type === 'partial'
          ? m.exemptAmount !== undefined
            ? { exemptAmount: m.exemptAmount }
            : { taxablePercentage: m.taxablePercentage }
          : {}),
      }));
    return value;
  }
  sectionDirty(section: TaxSection) {
    const base = this.baseline();
    return (
      !base ||
      JSON.stringify(this.sectionValue(this.editorRules(), section)) !==
        JSON.stringify(this.sectionValue(base.rules, section))
    );
  }
  private applySavedSection(section: TaxSection, rules: any) {
    if (section === 'slabs') this.slabs = structuredClone(rules.slabs);
    if (section === 'surcharge') this.surcharge = structuredClone(rules.surcharge);
    if (section === 'master') {
      this.standardDeduction = rules.standardDeduction;
      this.rebateLimit = rules.rebateLimit;
      this.maximumRebate = rules.maximumRebate;
      this.cess = rules.cessPercentage;
      this.minimumAge = rules.minimumAge;
      this.maximumAge = rules.maximumAge;
      this.incomeRounding = rules.incomeRounding;
      this.liabilityRounding = rules.liabilityRounding;
      this.rebateRelief = rules.rebateMarginalRelief;
      this.surchargeRelief = rules.surchargeMarginalRelief;
    }
    if (section === 'taxability') {
      this.sources = rules.legalReferences.join('\n');
      this.reviewNote = rules.reviewNote;
      this.employerReviewed = rules.employerContributionsReviewed;
      this.mappings = rules.mappings.map((m: any) => ({
        ...structuredClone(m),
        name:
          m.componentName ??
          this.components().find((c) => c._id === m.componentId)?.name ??
          'Previously configured salary component',
        code: this.components().find((c) => c._id === m.componentId)?.code,
        available:
          this.components().some(
            (c) => c._id === m.componentId && c.status === 'active' && c.category !== 'deduction',
          ) || undefined,
        partialMode: m.exemptAmount === undefined ? 'percentage' : 'amount',
      }));
    }
  }
  private draftForRules(rules: any) {
    return {
      ...this,
      standardDeduction: rules.standardDeduction,
      rebateLimit: rules.rebateLimit,
      maximumRebate: rules.maximumRebate,
      cess: rules.cessPercentage,
      minimumAge: rules.minimumAge,
      maximumAge: rules.maximumAge,
      incomeRounding: rules.incomeRounding,
      liabilityRounding: rules.liabilityRounding,
      slabs: rules.slabs,
      surcharge: rules.surcharge,
      mappings: rules.mappings.map((m: any) => ({
        ...m,
        partialMode: m.exemptAmount === undefined ? 'percentage' : 'amount',
      })),
      sources: rules.legalReferences.join('\n'),
      reviewNote: rules.reviewNote,
      employerReviewed: rules.employerContributionsReviewed,
    };
  }
  async submitEditor(event: Event, form: NgForm) {
    const section = (event as SubmitEvent).submitter?.getAttribute('data-section');
    if (section && Object.hasOwn(sectionKeys, section))
      await this.saveSection(section as TaxSection, form.form.get(section));
    else await this.saveRevision(form);
  }
  async saveSection(section: TaxSection, control?: AbstractControl | null) {
    if (this.busy()) return;
    this.sectionMessages.update((messages) => ({ ...messages, [section]: '' }));
    this.sectionErrors.update((errors) => ({ ...errors, [section]: '' }));
    control?.markAllAsTouched();
    const base = this.baseline();
    if (!base) {
      this.sectionErrors.update((errors) => ({
        ...errors,
        [section]: 'Save the first complete configuration before saving individual sections.',
      }));
      return;
    }
    const rules = {
      ...structuredClone(base.rules),
      ...this.sectionValue(this.editorRules(), section),
    };
    const problems = configurationProblems(this.draftForRules(rules));
    if (control?.invalid || problems.length) {
      this.sectionErrors.update((errors) => ({
        ...errors,
        [section]: problems.join(' ') || 'Correct the highlighted fields in this card.',
      }));
      return;
    }
    this.savingSection.set(section);
    try {
      await this.perform(async () => {
        const result = await this.api.revision({
          version: this.state().version,
          yearCode: this.yearCode,
          regime: this.regime,
          effectiveDate: this.effectiveDate,
          rules,
        });
        this.state.set(result);
        this.historyPage = 1;
        const saved = this.baseline();
        if (saved) this.applySavedSection(section, saved.rules);
        this.sectionMessages.update((messages) => ({
          ...messages,
          [section]:
            'Section saved in a new unpublished revision. Other unsaved entries are retained.',
        }));
      });
      if (this.error())
        this.sectionErrors.update((errors) => ({ ...errors, [section]: this.error() }));
    } finally {
      this.savingSection.set(null);
    }
  }
  pagedHistory() {
    return [...this.state().revisions]
      .reverse()
      .slice(
        (this.historyPage - 1) * this.historyPageSize,
        this.historyPage * this.historyPageSize,
      );
  }
  historyPages() {
    return Math.max(1, Math.ceil(this.state().revisions.length / this.historyPageSize));
  }
  latestRevision(r: any) {
    return !this.state().revisions.some(
      (other: any) =>
        other.yearCode === r.yearCode && other.regime === r.regime && other.version > r.version,
    );
  }
  viewRevision(r: any) {
    this.actionOpener = document.activeElement as HTMLElement;
    this.viewingRevision = r;
  }
  closeHistory(event?: Event) {
    event?.preventDefault();
    this.historyDialog()?.nativeElement.close();
    this.viewingRevision = null;
    this.restoreActionFocus();
  }
  requestActivation(action: NonNullable<TaxConfiguration['confirmation']>) {
    this.actionOpener = document.activeElement as HTMLElement;
    this.confirmation = action;
  }
  cancelActivation(event?: Event) {
    event?.preventDefault();
    if (!this.busy()) {
      this.activationDialog()?.nativeElement.close();
      this.confirmation = null;
      this.restoreActionFocus();
    }
  }
  private restoreActionFocus() {
    const opener = this.actionOpener;
    requestAnimationFrame(() => {
      if (opener?.isConnected) opener.focus();
    });
  }
  async ngOnInit() {
    await this.load();
  }
  async perform(work: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await work();
    } catch (e) {
      this.error.set(apiError(e));
    } finally {
      this.busy.set(false);
    }
  }
  async load() {
    await this.perform(async () => {
      const [state, components] = await Promise.all([
        this.api.configuration(),
        this.fetchComponents(),
      ]);
      this.state.set(state);
      this.mergeComponents(components);
      if (!this.yearCode && state.years.length) {
        this.yearCode = state.years.find((y: any) => y.active)?.code ?? state.years[0].code;
        this.selectYear();
        const saved = this.baseline();
        if (saved) {
          this.editRevision(saved);
          this.componentMessage.set(
            'Saved taxability mappings loaded. Use Load current salary components to check for changes.',
          );
          this.message.set('');
        }
      }
    });
  }
  private async fetchComponents() {
    try {
      const records = await firstValueFrom(this.salaries.list());
      if (!Array.isArray(records)) throw new Error('Invalid salary component response');
      this.componentError.set('');
      return records;
    } catch (error) {
      this.componentError.set(apiError(error));
      throw error;
    }
  }
  private mergeComponents(records: any[]) {
    const current = [
      ...new Map(
        records
          .filter((c) => c.status === 'active' && c.category !== 'deduction')
          .map((c) => [c._id, c]),
      ).values(),
    ];
    this.components.set(records);
    const existing = new Map(this.mappings.map((m) => [m.componentId, m]));
    let added = 0;
    const next = current.map((c) => {
      const previous = existing.get(c._id);
      existing.delete(c._id);
      if (previous) return { ...previous, name: c.name, code: c.code, available: true };
      added++;
      return {
        componentId: c._id,
        name: c.name,
        code: c.code,
        type: '',
        legalReference: '',
        conditions: '',
        taxablePercentage: null,
        exemptAmount: null,
        partialMode: 'percentage',
        available: true,
      };
    });
    this.mappings = [...next, ...[...existing.values()].map((m) => ({ ...m, available: false }))];
    this.componentMessage.set(
      (current.length
        ? 'Loaded ' +
          current.length +
          ' active salary components. Added ' +
          added +
          ' new mappings; preserved existing entries.'
        : 'No active earning or allowance components are configured. Existing draft entries are retained for review.') +
        (existing.size ? ' ' + existing.size + ' inactive or removed mappings need review.' : '') +
        ' Employee deductions are excluded. Employer statutory amounts are reviewed separately.',
    );
  }
  async loadComponents() {
    if (this.busy()) return;
    this.loadingComponents.set(true);
    try {
      await this.perform(async () => this.mergeComponents(await this.fetchComponents()));
    } finally {
      this.loadingComponents.set(false);
    }
  }
  removeUnavailableMapping(id: string) {
    this.mappings = this.mappings.filter((m) => m.componentId !== id || m.available !== false);
  }
  configurationProblems() {
    return configurationProblems(this);
  }
  selectYear() {
    this.effectiveDate =
      this.state().years.find((y: any) => y.code === this.yearCode)?.startDate ?? '';
  }
  yearDateError() {
    const { startDate, endDate } = this.year;
    if (!startDate || !endDate) return '';
    if (startDate >= endDate) return 'Start date must be earlier than end date.';
    const start = new Date(startDate + 'T00:00:00Z');
    if (!Number.isFinite(start.getTime())) return 'Enter a valid start date.';
    const expectedEnd = new Date(Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), 0))
      .toISOString()
      .slice(0, 10);
    return start.getUTCDate() !== 1 || endDate !== expectedEnd
      ? 'Financial year must cover twelve complete calendar months.'
      : '';
  }
  yearError() {
    if (!this.year.name.trim()) return 'Enter a financial year name.';
    if (!/^[A-Za-z0-9 _-]{3,30}$/.test(this.year.code.trim()))
      return 'Code must contain 3–30 letters, numbers, spaces, hyphens or underscores.';
    if (!this.year.startDate || !this.year.endDate) return 'Enter both financial year dates.';
    if (!this.year.legislation.trim()) return 'Enter the applicable legislation.';
    if (!this.year.ruleVersion.trim()) return 'Enter the rule version.';
    if (this.state().years.some((year: any) => year.code === this.year.code.trim()))
      return 'A financial year with this code already exists.';
    return this.yearDateError();
  }
  private formControls(controls: Record<string, any>): [string, any][] {
    return Object.entries(controls).flatMap(([name, control]) =>
      control.controls ? this.formControls(control.controls) : [[name, control] as [string, any]],
    );
  }
  validationErrors(form: NgForm) {
    const labels: Record<string, string> = {
      yearCode: 'Financial year',
      regime: 'Tax regime',
      effectiveDate: 'Effective date',
      standard: 'Standard deduction',
      rebateLimit: 'Rebate eligibility limit',
      maximumRebate: 'Maximum rebate',
      cess: 'Cess percentage',
      minimumAge: 'Minimum age',
      maximumAge: 'Maximum age',
      sources: 'Official source URLs',
      reviewNote: 'Review note',
      employerReviewed: 'Employer contribution review confirmation',
    };
    const errors = this.formControls(form.controls)
      .filter(([, control]) => control.invalid)
      .map(([name, control]) => {
        const indexed = name.match(
          /^(from|to|rate|threshold|surchargeRate|reference|conditions|taxable|exempt|type|partialMode)([0-9]+)$/,
        );
        const component = indexed
          ? this.mappings[Number(indexed[2])]?.name || 'this salary component'
          : '';
        if (indexed && indexed[1] === 'reference')
          return 'Legal reference is required for ' + component + '.';
        if (indexed && indexed[1] === 'type')
          return 'Select a reviewed taxability treatment for ' + component + '.';
        if (indexed && ['conditions', 'taxable', 'exempt', 'partialMode'].includes(indexed[1]))
          return 'Check the taxability conditions and values for ' + component + '.';
        const rowLabels: Record<string, string> = {
          from: 'Slab lower amount',
          to: 'Slab upper amount',
          rate: 'Slab tax rate',
          threshold: 'Surcharge threshold',
          surchargeRate: 'Surcharge rate',
        };
        const label =
          labels[name] ||
          (indexed
            ? rowLabels[indexed[1]] + ' in row ' + (Number(indexed[2]) + 1)
            : 'A configuration field');
        return (
          label +
          (control.errors?.['required']
            ? ' is required.'
            : ' has an invalid numeric or text value.')
        );
      });
    return [...new Set([...errors, ...this.configurationProblems()])];
  }
  async saveYear(form: NgForm) {
    if (this.busy()) return;
    form.form.markAllAsTouched();
    const problem = this.yearError();
    if (form.invalid || problem) {
      this.error.set(problem || 'Correct the highlighted financial year fields.');
      return;
    }
    const year = Object.fromEntries(
      Object.entries(this.year).map(([key, value]) => [key, value.trim()]),
    ) as typeof this.year;
    await this.perform(async () => {
      this.state.set(
        await this.api.year({ version: this.state().version, createOnly: true, year }),
      );
      this.yearCode = year.code;
      this.selectYear();
      this.year = {
        code: '',
        name: '',
        startDate: '',
        endDate: '',
        legislation: '',
        ruleVersion: '',
      };
      form.resetForm(this.year);
      this.message.set('Financial year saved.');
    });
  }
  async saveRevision(form: NgForm) {
    if (this.busy()) return;
    form.form.markAllAsTouched();
    if (form.invalid || this.configurationProblems().length) {
      this.error.set('Complete the configuration checklist below before saving.');
      return;
    }
    await this.perform(async () => {
      const rules = this.editorRules();
      this.state.set(
        await this.api.revision({
          version: this.state().version,
          yearCode: this.yearCode,
          regime: this.regime,
          effectiveDate: this.effectiveDate,
          rules,
        }),
      );
      this.historyPage = 1;
      this.message.set('New immutable revision saved. Review its details and activate it below.');
    });
  }
  editRevision(r: any) {
    this.yearCode = r.yearCode;
    this.regime = r.regime;
    this.effectiveDate = r.effectiveDate;
    const rules = r.rules;
    this.standardDeduction = rules.standardDeduction;
    this.rebateLimit = rules.rebateLimit;
    this.maximumRebate = rules.maximumRebate;
    this.cess = rules.cessPercentage;
    this.rebateRelief = rules.rebateMarginalRelief;
    this.surchargeRelief = rules.surchargeMarginalRelief;
    this.minimumAge = rules.minimumAge;
    this.maximumAge = rules.maximumAge;
    this.incomeRounding = rules.incomeRounding;
    this.liabilityRounding = rules.liabilityRounding;
    this.slabs = structuredClone(rules.slabs);
    this.surcharge = structuredClone(rules.surcharge);
    this.sources = rules.legalReferences.join('\n');
    this.reviewNote = rules.reviewNote;
    this.employerReviewed = rules.employerContributionsReviewed;
    this.mappings = rules.mappings.map((m: any) => ({
      ...structuredClone(m),
      name:
        m.componentName ??
        this.components().find((c) => c._id === m.componentId)?.name ??
        'Previously configured salary component',
      code: this.components().find((c) => c._id === m.componentId)?.code,
      available:
        this.components().some(
          (c) => c._id === m.componentId && c.status === 'active' && c.category !== 'deduction',
        ) || undefined,
      partialMode: m.exemptAmount === undefined ? 'percentage' : 'amount',
    }));
    this.message.set('Revision copied to the editor. Saving creates a new revision.');
  }
  async confirm() {
    if (this.busy()) return;
    const action = this.confirmation;
    if (!action) return;
    this.activationDialog()?.nativeElement.close();
    this.confirmation = null;
    await this.perform(async () => {
      this.state.set(
        action.kind === 'year'
          ? await this.api.yearStatus(action.id, {
              version: this.state().version,
              active: action.active,
            })
          : await this.api.activate(action.id, this.state().version),
      );
      this.message.set('Activation updated and audited. Recalculate affected payroll drafts.');
    });
    this.restoreActionFocus();
  }
}

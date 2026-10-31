import { PayrollGuide } from './components/payroll-guide';
import { NavigationContext, EmployeeOrigin } from '../../shared/navigation-context';
import { ActionIcon } from '../../shared/action-icon';
import { Location } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  effect,
  ElementRef,
  viewChild,
  DestroyRef,
  computed,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { EmployeeService, apiError } from '../../employees/employee.service';
import { Employee } from '../../employees/employee';
import { payrollMonths } from '../../shared/payroll-calendar';
import { PayCheck, PayrollRun, RunPayrollService } from './run-payroll.service';
type PayrollRow = Pick<PayCheck, 'employeeId' | 'firstName' | 'lastName'> &
  Partial<PayCheck> & { historical: boolean; selectable: boolean; validationMessage?: string };
@Component({
  selector: 'app-run-payroll',
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, ActionIcon, PayrollGuide],
  templateUrl: './run-payroll.component.html',
  styleUrl: './run-payroll.component.css',
})
export class RunPayroll implements OnInit, OnDestroy {
  private readonly service = inject(RunPayrollService);
  private readonly employees = inject(EmployeeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly returnStatus = ['Active', 'Terminated', 'All'].includes(
    this.route.snapshot.queryParamMap.get('returnStatus') ?? '',
  )
    ? this.route.snapshot.queryParamMap.get('returnStatus')!
    : 'Active';
  private readonly navigation = inject(NavigationContext);
  private readonly location = inject(Location);
  private readonly tableScroll = viewChild<ElementRef<HTMLElement>>('payrollTableScroll');
  private contextKey: string = crypto.randomUUID();
  private scrollFrame?: number;
  readonly refreshing = signal(false);
  readonly confirmationPage = !!this.route.snapshot.paramMap.get('period');
  readonly months = payrollMonths();
  period = this.months[new Date().getMonth()].value;
  readonly run = signal<PayrollRun | null>(null);
  readonly eligible = signal<Employee[]>([]);
  readonly selected = signal(new Set<string>());
  readonly candidates = signal(new Map<string, PayCheck>());
  readonly busy = signal(false);
  readonly selectionPending = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly dirty = signal(false);
  readonly confirm = signal(false);
  paymentDate = '';
  private readonly sanitizer = inject(DomSanitizer);
  private readonly pdfUrl = signal<string | null>(null);
  readonly viewingId = signal('');
  readonly pdfSource = computed(() =>
    this.pdfUrl() ? this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrl()!) : null,
  );
  private readonly pdfViewer = viewChild<ElementRef<HTMLDialogElement>>('pdfViewer');
  private pdfOpener: HTMLElement | null = null;
  private historicalSelection = new Set<string>();
  private key = '';
  private timer?: ReturnType<typeof setTimeout>;
  private alive = true;
  private readonly confirmationDialog =
    viewChild<ElementRef<HTMLDialogElement>>('confirmationDialog');
  private returnFocus: HTMLElement | null = null;
  constructor() {
    effect(() => {
      const dialog = this.confirmationDialog()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
    effect(() => {
      const dialog = this.pdfViewer()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
    inject(DestroyRef).onDestroy(() => this.ngOnDestroy());
  }
  openConfirmation() {
    this.returnFocus = document.activeElement as HTMLElement;
    this.confirm.set(true);
  }
  cancelConfirmation(event?: Event) {
    event?.preventDefault();
    if (this.busy()) return;
    this.confirm.set(false);
    const target = this.returnFocus;
    queueMicrotask(() => {
      if (target?.isConnected) target.focus();
    });
  }
  async ngOnInit() {
    this.selected.set(
      new Set(this.route.snapshot.queryParamMap.get('employees')?.split(',').filter(Boolean) ?? []),
    );
    const origin = this.navigation.origin(this.location.getState(), 'payrollReturn');
    await this.perform(async () => {
      this.eligible.set(await firstValueFrom(this.employees.getAll()));
      const submitted = this.route.snapshot.paramMap.get('period');
      if (submitted) {
        this.period = submitted;
        this.run.set(
          await this.service.submission(
            submitted,
            this.route.snapshot.queryParamMap.get('submissionId') ?? undefined,
          ),
        );
        this.paymentDate = this.run()?.paymentDate ?? '';
      } else if (origin?.kind === 'payroll' && origin.payroll) await this.restorePayroll(origin);
      else await this.load(false);
      if (origin?.payroll) this.restorePosition(origin.payroll.scrollY, origin.payroll.tableScrollLeft);
    });
  }
  private async perform(work: () => Promise<void>) {
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
  private async load(recalculate: boolean) {
    const requested = [...new Set([...this.selected(), ...this.historicalSelection])];
    let result: PayrollRun;
    try { result = await this.service.preview(this.period, requested, recalculate); }
    catch (error) { if (this.alive) this.run.set(null); throw error; }
    this.historicalSelection = new Set(
      requested.filter((id) => result.processedEmployeeIds?.includes(id)),
    );
    if (!this.alive) return;
    this.run.set(result);
    if (!recalculate) this.paymentDate = result.paymentDate ?? '';
    this.selected.set(new Set([...result.checks.map((c) => c.employeeId), ...(result.validationIssues ?? []).map(issue => issue.employeeId)]));
    this.candidates.update((current) => {
      const next = new Map(current);
      for (const c of result.checks) next.set(c.employeeId, c);
      return next;
    });
    this.dirty.set(recalculate || result.version === 0);
    this.key = '';
  }
  changePeriod() {
    this.selected.set(new Set([...this.selected(), ...this.historicalSelection]));
    this.historicalSelection.clear();
    clearTimeout(this.timer);
    this.selectionPending.set(false);
    this.run.set(null);
    this.paymentDate = '';
    this.candidates.set(new Map());
    this.confirm.set(false);
    void this.perform(async () => {
      this.eligible.set(await firstValueFrom(this.employees.getAll()));
      await this.load(false);
    });
  }
  processed(id: string) {
    return (
      (this.run()?.processedEmployeeIds ?? []).includes(id) ||
      (this.run()?.historicalChecks ?? []).some((c) => c.employeeId === id)
    );
  }
  availableEmployees() {
    const end = new Date(
      Date.UTC(Number(this.period.slice(0, 4)), Number(this.period.slice(5, 7)), 0),
    );
    return this.eligible().filter(
      (e) =>
        !this.processed(e._id) &&
        (e.status ?? 'Active') === 'Active' &&
        (e.payFrequency ?? 'Monthly') === 'Monthly' &&
        new Date(e.rehireDate ?? e.hireDate) <= end,
    );
  }
  unifiedRows(): PayrollRow[] {
    if (this.confirmationPage)
      return (this.run()?.checks ?? []).map((c) => ({ ...c, historical: true, selectable: false }));
    const rows = new Map<string, PayrollRow>();
    for (const e of this.availableEmployees())
      rows.set(e._id, {
        employeeId: e._id,
        firstName: e.firstName,
        lastName: e.lastName,
        annualCtc: e.annualCtc,
        monthlyCtc: this.run()?.employeeCompensation?.find(c => c.employeeId === e._id)?.monthlyCtc ?? null,
        payFrequency: e.payFrequency ?? 'Monthly',
        historical: false,
        selectable: true,
      });
    for (const c of this.candidates().values())
      if (!rows.has(c.employeeId))
        rows.set(c.employeeId, {
          employeeId: c.employeeId,
          firstName: c.firstName,
          lastName: c.lastName,
          annualCtc: c.annualCtc,
          monthlyCtc: c.monthlyCtc,
          payFrequency: c.payFrequency,
          historical: false,
          selectable: false,
        });
    for (const c of this.run()?.checks ?? [])
      rows.set(c.employeeId, {
        ...rows.get(c.employeeId),
        ...c,
        historical: false,
        selectable: rows.get(c.employeeId)?.selectable ?? false,
      });
    for (const c of this.run()?.historicalChecks ?? [])
      rows.set(c.employeeId, { ...c, historical: true, selectable: false });
    for (const issue of this.run()?.validationIssues ?? []) {
      const row = rows.get(issue.employeeId);
      rows.set(issue.employeeId, { ...row, employeeId: issue.employeeId, firstName: issue.firstName, lastName: issue.lastName, historical: false, selectable: row?.selectable ?? true, validationMessage: issue.message });
    }
    return [...rows.values()];
  }
  selectableRows() {
    return this.unifiedRows().filter((row) => row.selectable && !row.historical);
  }
  allFinalized() {
    const rows = this.unifiedRows();
    return rows.length > 0 && rows.every((row) => row.historical);
  }
  allSelected() {
    const rows = this.selectableRows();
    return rows.length > 0 && rows.every((row) => this.selected().has(row.employeeId));
  }
  someSelected() {
    return this.selected().size > 0 && !this.allSelected();
  }
  toggleAll(checked: boolean) {
    const ids = new Set(this.selected());
    for (const row of this.selectableRows())
      checked ? ids.add(row.employeeId) : ids.delete(row.employeeId);
    this.changeSelection(ids);
  }
  tdsTotal() { return (this.run()?.checks ?? []).reduce((sum, check) => Math.round((sum + (check.tds ?? 0)) * 100) / 100, 0); }
  otherDeductions(row: Partial<PayCheck>) {
    return row.existingDeductions ?? (row.deductions == null ? null : Math.round((row.deductions - (row.tds ?? 0)) * 100) / 100);
  }
  otherDeductionsTotal() { return (this.run()?.checks ?? []).reduce((sum, check) => Math.round((sum + (this.otherDeductions(check) ?? 0)) * 100) / 100, 0); }
  rowStatus(row: PayrollRow) {
    if (row.historical) return row.paymentStatus === 'Paid' ? 'Paid' : 'Submitted';
    if (row.validationMessage) return 'Needs Review';
    if (!row.selectable) return 'Ineligible';
    return this.selected().has(row.employeeId) &&
      (this.run()?.draftSaved === true ||
        (this.run()?.draftSaved === undefined && !!this.run()?.version && !this.dirty()))
      ? 'Draft'
      : 'Not Processed';
  }
  paymentDateChanged() {
    if (!this.confirmationPage) {
      this.dirty.set(true);
      this.key = '';
    }
  }
  toggle(id: string, checked: boolean) {
    if (this.processed(id)) return;
    const ids = new Set(this.selected());
    checked ? ids.add(id) : ids.delete(id);
    this.changeSelection(ids);
  }
  private changeSelection(ids: Set<string>) {
    this.selected.set(ids);
    this.dirty.set(true);
    this.selectionPending.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.alive) return;
      this.selectionPending.set(false);
      this.recalculate(false);
    }, 180);
  }
  selectionChanged() {
    const run = this.run();
    return (
      !run ||
      this.selectionPending() ||
      run.checks.length !== this.selected().size ||
      run.checks.some((c) => !this.selected().has(c.employeeId))
    );
  }
  recalculate(manual = true) {
    if (this.busy()) return;
    clearTimeout(this.timer); this.selectionPending.set(false); this.refreshing.set(true);
    void this.perform(async () => { try { await this.load(true); if (manual) this.message.set('Payroll recalculated. Review and save the updated draft.'); } finally { if (this.alive) this.refreshing.set(false); } });
  }
  hasReviewIssues() { return !!this.run()?.validationIssues?.length; }
  totalsAvailable() { return !!this.run() && (!this.hasReviewIssues() || !!this.run()?.checks.length) && !this.selectionPending() && !this.refreshing(); }
  save() {
    const run = this.run();
    if (!run || this.hasReviewIssues() || run.stale) return;
    void this.perform(async () => {
      this.run.set({ ...await this.service.save({ ...run, paymentDate: this.paymentDate || null }), employeeCompensation: run.employeeCompensation });
      this.paymentDate = this.run()?.paymentDate ?? '';
      this.dirty.set(false);
      this.key = '';
      this.message.set('Payroll draft saved. Historical payroll and payslips are unchanged.');
    });
  }
  submit() {
    const run = this.run();
    if (!run || this.hasReviewIssues() || run.stale || !run.checks.length || !this.paymentDate || this.dirty() || this.selectionChanged())
      return;
    this.key ||= crypto.randomUUID();
    void this.perform(async () => {
      const submitted = await this.service.submit(run, this.paymentDate, this.key);
      this.run.set(submitted);
      this.confirm.set(false);
      await this.router.navigate(['/payroll/submitted', run.period], {
        replaceUrl: true,
        queryParams: {
          returnStatus: this.returnStatus,
          ...(submitted.idempotencyKey ? { submissionId: submitted.idempotencyKey } : {}),
        },
      });
    });
  }
  employeeHref(id: string) { return '/employees/' + encodeURIComponent(id) + '?returnStatus=' + encodeURIComponent(this.returnStatus); }
  openEmployee(event: MouseEvent, id: string) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); const scope = this.navigation.owner(), run = this.run();
    let origin: EmployeeOrigin | null = null;
    if (scope && run) {
      origin = { kind: 'payroll', url: this.router.url, scope, payroll: { key: this.contextKey, period: this.period,
        paymentDate: this.paymentDate, selectedIds: [...this.selected()], historicalIds: [...this.historicalSelection], dirty: this.dirty() || this.selectionChanged(),
        version: run.version, inputHash: this.selectionChanged() ? '' : run.inputHash, scrollY: window.scrollY,
        tableScrollLeft: this.tableScroll()?.nativeElement.scrollLeft ?? 0 } };
      if (!this.busy() && !this.selectionChanged()) this.navigation.remember(origin, { run, candidates: [...this.candidates()] });
      this.location.replaceState(this.router.url, '', { ...this.location.getState() as object, payrollReturn: origin });
    }
    void this.router.navigate(['/employees', id], { queryParams: { returnStatus: this.returnStatus }, state: origin ? { employeeOrigin: origin } : {} });
  }
  private async restorePayroll(origin: EmployeeOrigin) {
    const ui = origin.payroll!; this.contextKey = ui.key; this.period = ui.period;
    const memory = this.navigation.memory(origin);
    const fresh = await this.service.preview(ui.period, ui.selectedIds, ui.dirty);
    if (!this.alive) return;
    const changed = fresh.version !== ui.version || (!!ui.inputHash && fresh.inputHash !== ui.inputHash);
    const snapshot = memory && !fresh.validationIssues?.length && fresh.version === ui.version ? { ...memory.run, employeeCompensation: fresh.employeeCompensation,
      stale: memory.run.stale || fresh.stale || fresh.inputHash !== ui.inputHash,
      warning: fresh.inputHash !== ui.inputHash ? 'Payroll inputs changed while viewing the employee. Explicitly recalculate and review.' : fresh.warning } : fresh;
    this.run.set(snapshot); this.selected.set(new Set(memory && fresh.version === ui.version ? ui.selectedIds : [...fresh.checks.map(c => c.employeeId), ...(fresh.validationIssues ?? []).map(issue => issue.employeeId)]));
    this.paymentDate = ui.paymentDate; this.dirty.set(ui.dirty || changed);
    this.candidates.set(new Map(memory?.candidates ?? snapshot.checks.map(c => [c.employeeId, c] as [string, PayCheck])));
    this.historicalSelection = new Set([...(ui.historicalIds ?? []), ...ui.selectedIds.filter(id => snapshot.processedEmployeeIds?.includes(id))]);
    if (changed) this.message.set('Payroll changed while you were away. Review the restored selection and calculations before saving or submitting.');
  }
  private restorePosition(y: number, left: number) {
    this.scrollFrame = requestAnimationFrame(() => { this.scrollFrame = requestAnimationFrame(() => { if (!this.alive) return;
      window.scrollTo(0, Math.max(0, Math.min(y, 1000000))); const table = this.tableScroll()?.nativeElement; if (table) table.scrollLeft = Math.max(0, left);
    }); });
  }
  download(id: string) {
    void this.perform(() => this.service.download(this.period, id));
  }
  viewPayCheck(id: string) {
    this.pdfOpener = document.activeElement as HTMLElement;
    void this.perform(async () => {
      try {
        const blob = await this.service.pdf(this.period, id);
        if (!this.alive) return;
        if (!blob.size || blob.type !== 'application/pdf')
          throw new Error('This pay check PDF is unavailable.');
        this.closePdf();
        this.viewingId.set(id);
        this.pdfUrl.set(URL.createObjectURL(blob));
      } catch (error) {
        this.error.set(
          error instanceof HttpErrorResponse
            ? error.status === 404
              ? 'This pay check PDF is unavailable.'
              : apiError(error)
            : error instanceof Error
              ? error.message
              : 'Unable to open this pay check.',
        );
      }
    });
  }
  closePdf(event?: Event) {
    event?.preventDefault();
    const url = this.pdfUrl();
    this.pdfUrl.set(null);
    this.viewingId.set('');
    if (url) URL.revokeObjectURL(url);
    const opener = this.pdfOpener;
    queueMicrotask(() => {
      if (this.alive && opener?.isConnected) opener.focus();
    });
  }
  ngOnDestroy() {
    this.alive = false;
    this.closePdf();
    clearTimeout(this.timer);
    if (this.scrollFrame !== undefined) cancelAnimationFrame(this.scrollFrame);
  }
}

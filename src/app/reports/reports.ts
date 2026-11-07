import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { formatInr } from '../shared/ui/pipes/inr-format';
import { apiError } from '../employees/employee.service';
import { NotificationService } from '../shared/notification.service';
import { PayrollReportService } from '../payroll/payroll-report.service';
import {
  PsButton,
  PsCard,
  PsCardTitle,
  PsCardActions,
  PsCardSubtitle,
  PsPageHeader,
  PsDataTable,
  PsFormField,
  PsFieldControl,
  PsSelect,
  PsInrPipe,
  PsDatePipe,
} from '../shared/ui';
export interface ReportColumn {
  key: string;
  label: string;
  kind: 'text' | 'money' | 'date';
}
export interface ReportData {
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  total: number;
  page: number;
  limit: number;
  summary: Record<string, number>;
  period?: string;
}
interface PayrollPeriod {
  period: string;
  runs: string[];
}
@Component({
  selector: 'app-reports',
  imports: [
    FormsModule,
    PsButton,
    PsCard,
    PsCardTitle,
    PsCardActions,
    PsCardSubtitle,
    PsPageHeader,
    PsDataTable,
    PsFormField,
    PsFieldControl,
    PsSelect,
    PsInrPipe,
    PsDatePipe,
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly exporter = inject(PayrollReportService);
  private readonly notifications = inject(NotificationService);
  private readonly dates = new PsDatePipe();
  private readonly base = environment.apiUrl + '/reports';
  readonly kind = signal<'workforce' | 'payroll' | null>(null);
  readonly report = signal<ReportData | null>(null);
  readonly periods = signal<PayrollPeriod[]>([]);
  readonly periodOptions = signal<{ value: string; label: string }[]>([]);
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly error = signal('');
  readonly statuses = [
    { value: '', label: 'All' },
    { value: 'Active', label: 'Active' },
    { value: 'Terminated', label: 'Terminated' },
  ];
  status = '';
  joinedFrom = '';
  joinedTo = '';
  period = '';
  private generation = 0;
  ngOnInit() {
    void this.loadPeriods();
  }
  async loadPeriods() {
    try {
      const periods = await firstValueFrom(
        this.http.get<PayrollPeriod[]>(this.base + '/payroll-periods'),
      );
      this.periods.set(periods);
      this.periodOptions.set(
        periods.map((p) => ({
          value: p.period,
          label: new Intl.DateTimeFormat('en-IN', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          }).format(new Date(p.period + '-01T00:00:00Z')),
        })),
      );
      if (!periods.some((p) => p.period === this.period)) this.period = periods[0]?.period ?? '';
      return true;
    } catch (e) {
      this.error.set(apiError(e));
      return false;
    }
  }
  async open(kind: 'workforce' | 'payroll') {
    this.kind.set(kind);
    this.report.set(null);
    this.error.set('');
    if (kind === 'payroll' && !this.period && !(await this.loadPeriods())) return;
    await this.load();
  }
  async retry() {
    if ((!this.kind() || this.kind() === 'payroll') && !(await this.loadPeriods())) return;
    if (this.kind()) await this.load();
  }
  private request(page: number) {
    const path =
      this.kind() === 'workforce' ? '/workforce' : '/payroll/' + encodeURIComponent(this.period);
    const params: Record<string, string> = { page: String(page), limit: '50' };
    if (this.kind() === 'workforce')
      Object.assign(params, {
        status: this.status,
        joinedFrom: this.joinedFrom,
        joinedTo: this.joinedTo,
      });
    return firstValueFrom(this.http.get<ReportData>(this.base + path, { params }));
  }
  async load(page = 1) {
    if (this.loading() || this.exporting()) return;
    const generation = ++this.generation;
    this.error.set('');
    if (!this.kind() || (this.kind() === 'payroll' && !this.period)) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    try {
      const result = await this.request(page);
      if (generation === this.generation) this.report.set(result);
    } catch (e) {
      if (generation === this.generation) this.error.set(apiError(e));
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  text(value: string | number | null | undefined) {
    return value == null ? '' : String(value);
  }
  money(value: string | number | null | undefined) {
    return typeof value === 'number' ? value : null;
  }
  get summaryText() {
    const data = this.report();
    if (!data) return '';
    return this.kind() === 'workforce'
      ? 'Total Employees: ' +
          data.total +
          ' | Active: ' +
          (data.summary['Active'] ?? 0) +
          ' | Terminated: ' +
          (data.summary['Terminated'] ?? 0) +
          ' | Inactive: ' +
          (data.summary['Inactive'] ?? 0)
      : 'Employees: ' +
          data.total +
          ' | Paid: ' +
          data.summary['paid'] +
          ' | Payment Pending: ' +
          data.summary['pending'];
  }
  async exportPdf() {
    if (!this.report() || this.exporting() || this.loading()) return;
    this.exporting.set(true);
    try {
      const first = await this.request(1);
      this.report.set(first);
      const rows = [...first.rows];
      for (let page = 2; rows.length < first.total; page++) {
        const next = await this.request(page);
        if (
          next.total !== first.total ||
          JSON.stringify(next.summary) !== JSON.stringify(first.summary) ||
          !next.rows.length
        )
          throw new Error('Report data changed. Refresh the report and export again.');
        rows.push(...next.rows);
      }
      const title =
        this.kind() === 'workforce' ? 'Total Workforce Report' : 'Payroll Report - ' + this.period;
      const cell = (value: string | number | null, column: ReportColumn) =>
        value == null
          ? ''
          : column.kind === 'money'
            ? formatInr(Number(value))
            : column.kind === 'date'
              ? this.dates.transform(value, 'UTC')
              : String(value);
      const summary =
        this.kind() === 'workforce'
          ? 'Employees: ' +
            first.total +
            ' | Active: ' +
            (first.summary['Active'] ?? 0) +
            ' | Terminated: ' +
            (first.summary['Terminated'] ?? 0) +
            ' | Inactive: ' +
            (first.summary['Inactive'] ?? 0)
          : 'Employees: ' +
            first.total +
            ' | Gross: ' +
            formatInr(first.summary['grossPay']) +
            ' | Deductions: ' +
            formatInr(first.summary['deductions']) +
            ' | Net Pay: ' +
            formatInr(first.summary['netPay']) +
            ' | Paid: ' +
            first.summary['paid'] +
            ' | Pending: ' +
            first.summary['pending'];
      await this.exporter.exportSnapshot(
        title,
        first.columns.map((c) => c.label),
        rows.map((row) => first.columns.map((c) => cell(row[c.key], c))),
        summary,
      );
      this.notifications.success('Report PDF exported successfully.');
    } catch (e) {
      this.error.set(apiError(e));
      this.notifications.error(apiError(e));
    } finally {
      this.exporting.set(false);
    }
  }
}

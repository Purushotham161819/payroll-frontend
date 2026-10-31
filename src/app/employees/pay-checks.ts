import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  inject,
  input,
  effect,
  signal,
  computed,
  ElementRef,
  viewChild,
  OnDestroy,
  untracked,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { PayCheck, RunPayrollService } from '../features/run-payroll/run-payroll.service';
import { apiError } from './employee.service';
@Component({
  selector: 'app-pay-checks',
  imports: [CurrencyPipe, DatePipe],
  styleUrl: './pay-checks.css',
  template: ` @if (error()) {
      <p role="alert" class="notice error">{{ error() }}</p>
    }
    @if (loading()) {
      <p role="status">Loading pay checks...</p>
    }
    @if (busy()) {
      <p role="status">Loading pay check PDF...</p>
    }
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Pay Period</th>
            <th>Payment Date</th>
            <th>Gross Pay</th>
            <th>Employer Contributions</th>
            <th>Deductions</th>
            <th>NET Pay</th>
            <th>Pay Check</th>
          </tr>
        </thead>
        <tbody>
          @for (check of checks(); track check.period) {
            <tr>
              <td>{{ check.period + '-01' | date: 'MMMM yyyy' : 'UTC' }}</td>
              <td>{{ check.paymentDate | date: 'mediumDate' : 'UTC' }}</td>
              <td>{{ check.grossPay | currency: 'INR' }}</td>
              <td>{{ check.employerContributions | currency: 'INR' }}</td>
              <td>{{ check.deductions | currency: 'INR' }}@if(check.tds !== undefined){<small> · Income Tax / TDS: {{ check.tds | currency:'INR' }}</small>}</td>
              <td>{{ check.netPay | currency: 'INR' }}</td>
              <td class="check-actions">
                <button class="secondary" (click)="view(check)" [disabled]="busy()">
                  View Pay Check</button
                ><button class="secondary" (click)="download(check)" [disabled]="busy()">
                  Download PDF
                </button>
              </td>
            </tr>
          } @empty {
            @if (!loading()) {
              <tr>
                <td colspan="7">No submitted pay checks.</td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
    <p>Payment dates are expected dates. Payment Pending does not confirm a transfer.</p>
    @if (pdfSource()) {
      <dialog #viewer class="pdf-viewer" aria-labelledby="pdf-title" (cancel)="closeViewer($event)">
        <header>
          <h2 id="pdf-title">
            Pay Check - {{ viewing()?.period + '-01' | date: 'MMMM yyyy' : 'UTC' }}
          </h2>
          <button class="secondary" aria-label="Close pay check viewer" (click)="closeViewer()">
            Close
          </button>
        </header>
        <iframe [src]="pdfSource()" title="Employee payslip PDF"></iframe>
        <footer>
          <button class="secondary" (click)="download(viewing()!)" [disabled]="busy()">
            Download PDF
          </button>
        </footer>
      </dialog>
    }`,
})
export class PayChecks implements OnDestroy {
  readonly employeeId = input.required<string>();
  readonly checks = signal<PayCheck[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly viewing = signal<PayCheck | null>(null);
  private readonly url = signal<string | null>(null);
  private readonly sanitizer = inject(DomSanitizer);
  readonly pdfSource = computed(() =>
    this.url() ? this.sanitizer.bypassSecurityTrustResourceUrl(this.url()!) : null,
  );
  private readonly viewer = viewChild<ElementRef<HTMLDialogElement>>('viewer');
  private readonly service = inject(RunPayrollService);
  private generation = 0;
  private alive = true;
  private opener: HTMLElement | null = null;
  constructor() {
    effect(() => {
      const id = this.employeeId();
      untracked(() => {
        this.closeViewer();
        void this.load(id);
      });
    });
    effect(() => {
      const viewer = this.viewer()?.nativeElement;
      if (viewer && !viewer.open) viewer.showModal();
    });
  }
  private async load(id: string) {
    const generation = ++this.generation;
    this.loading.set(true);
    this.error.set('');
    this.checks.set([]);
    try {
      const checks = await this.service.history(id);
      if (this.alive && generation === this.generation) this.checks.set(checks);
    } catch (error) {
      if (this.alive && generation === this.generation) this.error.set(this.pdfError(error));
    } finally {
      if (this.alive && generation === this.generation) this.loading.set(false);
    }
  }
  private pdfError(error: unknown) {
    if (error instanceof HttpErrorResponse && error.status === 404)
      return 'This pay check PDF is unavailable. Please try again.';
    if (error instanceof HttpErrorResponse && error.status === 403)
      return 'You do not have permission to view this pay check.';
    return error instanceof Error && !(error instanceof HttpErrorResponse)
      ? error.message
      : apiError(error);
  }
  async view(check: PayCheck) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.opener = document.activeElement as HTMLElement;
    const id = this.employeeId();
    const generation = this.generation;
    try {
      const blob = await this.service.pdf(check.period!, id);
      if (!this.alive || generation !== this.generation) return;
      if (!blob.size || blob.type !== 'application/pdf')
        throw new Error('This pay check PDF is unavailable. Please try again.');
      this.closeViewer();
      this.viewing.set(check);
      this.url.set(URL.createObjectURL(blob));
    } catch (error) {
      if (this.alive && generation === this.generation) this.error.set(this.pdfError(error));
    } finally {
      if (this.alive) this.busy.set(false);
    }
  }
  closeViewer(event?: Event) {
    event?.preventDefault();
    const url = this.url();
    this.url.set(null);
    this.viewing.set(null);
    if (url) URL.revokeObjectURL(url);
    const opener = this.opener;
    queueMicrotask(() => {
      if (this.alive && opener?.isConnected) opener.focus();
    });
  }
  async download(check: PayCheck) {
    if (this.busy()) return;
    this.error.set('');
    this.busy.set(true);
    try {
      await this.service.download(check.period!, this.employeeId());
    } catch (error) {
      this.error.set(this.pdfError(error));
    } finally {
      if (this.alive) this.busy.set(false);
    }
  }
  ngOnDestroy() {
    this.alive = false;
    this.generation++;
    this.closeViewer();
  }
}

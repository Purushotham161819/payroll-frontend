import { CdkOverlayOrigin, ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { PsIconButton, PsCard, PsCardTitle, PsCardSubtitle, PsDataTable, PsInrPipe, PsDatePipe, PsStatusBadge } from '../shared/ui';
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
import { DomSanitizer } from '@angular/platform-browser';
import { PayCheck, RunPayrollService } from '../features/run-payroll/run-payroll.service';
import { apiError } from './employee.service';
@Component({
  selector: 'app-pay-checks',
  imports: [PsIconButton, PsCard, PsCardTitle, PsCardSubtitle, PsDataTable, PsInrPipe, PsDatePipe, PsStatusBadge, OverlayModule],
  styleUrl: './pay-checks.css',
  templateUrl: './pay-checks.html',
})
export class PayChecks implements OnDestroy {
  readonly employeeId = input.required<string>();
  readonly checks = signal<PayCheck[]>([]);
  readonly tdsCheck = signal<PayCheck | null>(null);
  readonly tdsId = 'pay-check-tds-' + crypto.randomUUID();
  tdsOrigin: CdkOverlayOrigin | null = null;
  readonly tdsPositions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
  ];
  storedTds(check: PayCheck): number | null {
    return typeof check.tds === 'number' && Number.isFinite(check.tds) ? check.tds : null;
  }
  toggleTds(check: PayCheck, origin: CdkOverlayOrigin) {
    if (this.tdsCheck() === check) {
      this.closeTds();
      return;
    }
    this.tdsOrigin = origin;
    this.tdsCheck.set(check);
  }
  closeTds() {
    this.tdsCheck.set(null);
    this.tdsOrigin = null;
  }
  outsideTds(event: MouseEvent) {
    if (!this.tdsOrigin?.elementRef.nativeElement.contains(event.target as Node)) this.closeTds();
  }
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
        this.closeTds();
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
    this.closeTds();
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
    // Separately authorized accessibility fix: release modal inertness before focus returns.
    this.viewer()?.nativeElement.close();
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
    this.closeTds();
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
    this.closeTds();
    this.closeViewer();
  }
}

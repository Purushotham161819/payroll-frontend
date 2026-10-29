import { AfterViewInit, Component, ElementRef, OnDestroy, inject, input, output, signal, viewChild } from '@angular/core';
import { DatePipe, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Employee, terminationReasons } from './employee';
import { EmployeeService, apiError } from './employee.service';

@Component({
  selector: 'app-lifecycle-dialog', imports: [FormsModule, DatePipe],
  template: `
    <dialog #dialog aria-labelledby="lifecycle-title" (cancel)="cancel($event)">
      <h2 id="lifecycle-title">{{ action() === 'History' ? 'Employment history' : action() + ' employee' }}</h2>
      <p>{{ employee().firstName }} {{ employee().lastName }} · {{ employee().employeeId || 'ID pending' }}</p>
      @if (action() === 'History') {
        <p>Original hire date: {{ employee().hireDate | date:'dd MMM yyyy':'UTC' }}</p>
        <p>Current status: {{ employee().status || 'Active' }}</p>
        @if (employee().rehireDate) { <p>Latest rehire: {{ employee().rehireDate | date:'dd MMM yyyy':'UTC' }}</p> }
        <ol>
          @for (period of history(); track $index) {
            <li>{{ period.startDate | date:'dd MMM yyyy':'UTC' }} – {{ period.endDate ? (period.endDate | date:'dd MMM yyyy':'UTC') : 'Present' }}
              <p>{{ period.endDate ? 'Terminated' : 'Active' }}{{ period.terminationReason ? ' · '+period.terminationReason : '' }}</p>
              @if (period.explanation) { <p>{{ period.explanation }}</p> }
              @if (period.terminatedAt) { <p>Termination recorded: {{ period.terminatedAt | date:'medium' }}</p> }
            </li>
          }
        </ol>
        <button class="secondary" (click)="cancel()" autofocus>Close</button>
      } @else {
        <form (ngSubmit)="submit()" #form="ngForm">
          @if (action() === 'Rehire') { <p>Previous termination: {{ previousEnd() | date:'dd MMM yyyy':'UTC' }}</p> }
          <label for="lifecycle-date">{{ action() === 'Terminate' ? 'Termination Date' : 'Rehire Date' }}</label>
          <input id="lifecycle-date" name="date" type="date" [(ngModel)]="date" required [min]="minimumDate()" [max]="today" [disabled]="busy()" autofocus>
          <p>Dates use America/Chicago. Future dates are not supported.</p>
          @if (action() === 'Terminate') {
            <label for="termination-reason">Termination Reason</label>
            <select id="termination-reason" name="reason" [(ngModel)]="reason" required [disabled]="busy()">
              <option value="" disabled>Select a reason</option>
              @for (option of reasons; track option) { <option [value]="option">{{ option }}</option> }
            </select>
            @if (reason === 'Other') {
              <label for="termination-explanation">Explanation (optional, up to 250 characters)</label>
              <textarea id="termination-explanation" name="explanation" [(ngModel)]="explanation" maxlength="250" [disabled]="busy()"></textarea>
            }
          }
          <p>Confirm {{ action() === 'Terminate' ? 'termination of' : 'rehire of' }} {{ employee().firstName }} {{ employee().lastName }} effective {{ date }}.</p>
          <p>The existing employee ID, original hire date, salary settings, and employment history will be preserved.</p>
          @if (error()) { <div class="notice error" role="alert">{{ error() }}</div> }
          <footer><button type="button" class="secondary" (click)="cancel()" [disabled]="busy()">Cancel</button>
            <button type="submit" class="primary" [disabled]="busy() || form.invalid || date < minimumDate() || date > today">{{ busy() ? 'Saving…' : 'Confirm '+action() }}</button></footer>
        </form>
      }
    </dialog>
  `,
  styles: [`dialog{width:min(520px,calc(100% - 28px));max-height:90dvh;overflow:auto;background:white;border:1px solid #dce4da;border-radius:12px;padding:26px;color:#20372c;box-shadow:0 20px 80px #0003}dialog::backdrop{background:#102c2a99}h2{font-size:20px}p,li{font-size:13px;line-height:1.6;overflow-wrap:anywhere}label{display:block;margin-top:18px;margin-bottom:6px;font-size:13px}input,select,textarea{box-sizing:border-box;width:100%;padding:10px;border:1px solid #a8b7ab;border-radius:6px;font:inherit}footer{display:flex;justify-content:flex-end;gap:10px;margin-top:24px}li{margin-block:14px}`],
})
export class LifecycleDialog implements AfterViewInit, OnDestroy {
  employee = input.required<Employee>();
  action = input.required<'Terminate' | 'Rehire' | 'History'>();
  saved = output<void>(); cancelled = output<void>();
  busy = signal(false); error = signal('');
  readonly today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  date = this.today; reason = ''; explanation = ''; reasons = terminationReasons;
  private service = inject(EmployeeService);
  private document = inject(DOCUMENT);
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private opener: HTMLElement | null = null;
  history() { return this.employee().employmentHistory?.length ? this.employee().employmentHistory! : [{ startDate: this.employee().hireDate }]; }
  previousEnd() { return this.history().at(-1)?.endDate; }
  minimumDate() {
    if (this.action() !== 'Rehire') return this.history().at(-1)!.startDate.slice(0, 10);
    const end = this.previousEnd();
    if (!end) return this.today;
    const next = new Date(end); next.setUTCDate(next.getUTCDate()+1); return next.toISOString().slice(0, 10);
  }
  ngAfterViewInit() { this.opener = this.document.activeElement as HTMLElement; this.dialog().nativeElement.showModal(); }
  ngOnDestroy() { this.dialog().nativeElement.close(); queueMicrotask(() => { (this.opener?.isConnected ? this.opener : this.document.getElementById('add-employee'))?.focus(); }); }
  cancel(event?: Event) { event?.preventDefault(); if (!this.busy()) this.cancelled.emit(); }
  submit() {
    if (this.busy() || this.action() === 'History') return;
    if (!this.date || this.date < this.minimumDate() || this.date > this.today || (this.action() === 'Terminate' && !this.reason)) { this.error.set('Select a valid date and required reason.'); return; }
    this.busy.set(true); this.error.set('');
    const request = this.action() === 'Terminate'
      ? this.service.terminate(this.employee()._id, { terminationDate: this.date, reason: this.reason, ...(this.reason === 'Other' ? { explanation: this.explanation.trim() } : {}) })
      : this.service.rehire(this.employee()._id, { rehireDate: this.date });
    request.subscribe({ next: () => { this.busy.set(false); this.saved.emit(); }, error: error => { this.busy.set(false); this.error.set(apiError(error)); } });
  }
}

import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PayrollReportService } from './payroll-report.service';
import { payrollMonths } from './payroll-calculation';

@Component({selector:'app-payroll-generator',imports:[FormsModule],templateUrl:'./payroll-generator.html',styleUrl:'./payroll-generator.css'})
export class PayrollGenerator {
  private service = inject(PayrollReportService);
  private dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private opener = viewChild<ElementRef<HTMLButtonElement>>('opener');
  open = signal(false); busy = signal(false); error = signal(''); success = signal('');
  months = payrollMonths(); selected = '';
  show() { this.months = payrollMonths(); this.selected = ''; this.error.set(''); this.success.set(''); this.open.set(true); setTimeout(()=>this.dialog()?.nativeElement.showModal()); }
  close() { if (!this.busy()) { this.dialog()?.nativeElement.close(); this.open.set(false); this.opener()?.nativeElement.focus(); } }
  async generate() {
    if (this.busy()) return;
    if (!this.selected) { this.error.set('Select a payroll month before generating the report.'); return; }
    this.busy.set(true); this.error.set(''); this.success.set('');
    try {
      const filename = await this.service.download(this.selected);
      this.busy.set(false); this.close(); this.success.set(`Payroll PDF downloaded: ${filename}`);
    } catch (error) {
      this.busy.set(false);
      this.error.set(error instanceof HttpErrorResponse ? (typeof error.error?.message === 'string' ? error.error.message : 'Unable to retrieve saved payroll data. Check that the backend is running and try again.') : error instanceof Error ? error.message : 'Unable to generate the PDF. Please try again.');
    }
  }
}


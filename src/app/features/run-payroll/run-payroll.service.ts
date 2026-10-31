import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { PayCheck, PayrollRun } from './models/payroll-run';
export type { PayCheck, PayrollRun } from './models/payroll-run';
@Injectable({ providedIn: 'root' })
export class RunPayrollService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl + '/payroll';
  async preview(period: string, employeeIds: string[], recalculate = false) {
    try {
      return await firstValueFrom(this.http.post<PayrollRun>(this.url + '/runs/preview', { period, employeeIds, recalculate }));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409 && error.error?.code === 'PAYROLL_EMPLOYEE_REVIEW_REQUIRED') {
        const preview = error.error.payrollPreview as PayrollRun;
        if (preview?.period === period && Array.isArray(preview.checks) && preview.validationIssues?.length) return preview;
      }
      throw error;
    }
  }
  save(run: PayrollRun) {
    return firstValueFrom(
      this.http.post<PayrollRun>(this.url + '/runs/draft', {
        period: run.period,
        employeeIds: run.checks.map((c) => c.employeeId),
        version: run.version,
        inputHash: run.inputHash,
        ...(run.paymentDate === undefined ? {} : { paymentDate: run.paymentDate }),
      }),
    );
  }
  submit(run: PayrollRun, paymentDate: string, idempotencyKey: string) {
    return firstValueFrom(
      this.http.post<PayrollRun>(this.url + '/runs/' + run.period + '/submit', {
        version: run.version,
        paymentDate,
        idempotencyKey,
      }),
    );
  }
  submission(period: string, submissionId?: string) {
    return firstValueFrom(
      this.http.get<PayrollRun>(
        this.url + '/runs/' + encodeURIComponent(period),
        submissionId ? { params: { submissionId } } : {},
      ),
    );
  }
  history(id: string) {
    return firstValueFrom(
      this.http.get<PayCheck[]>(this.url + '/employees/' + encodeURIComponent(id) + '/checks'),
    );
  }
  pdf(period: string, id: string) {
    return firstValueFrom(
      this.http.get(
        this.url +
          '/runs/' +
          encodeURIComponent(period) +
          '/checks/' +
          encodeURIComponent(id) +
          '/pdf',
        { responseType: 'blob' },
      ),
    );
  }
  async download(period: string, id: string) {
    const blob = await this.pdf(period, id);
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = `Payslip_${period}_${id}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

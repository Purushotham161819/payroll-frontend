import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { RunPayrollService } from './run-payroll.service';
describe('Payroll preview review error contract', () => {
  let service: RunPayrollService, http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] }); service = TestBed.inject(RunPayrollService); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  it('returns only the server partial preview for the matching structured review conflict', async () => {
    const result = service.preview('2026-11', ['a', 'b'], true);
    const preview = { period: '2026-11', checks: [{ employeeId: 'a', netPay: 95 }], validationIssues: [{ employeeId: 'b', message: 'Mid-year review required' }] };
    const req = http.expectOne('http://localhost:3000/payroll/runs/preview');
    expect(req.request.body).toEqual({ period: '2026-11', employeeIds: ['a', 'b'], recalculate: true });
    req.flush({ code: 'PAYROLL_EMPLOYEE_REVIEW_REQUIRED', payrollPreview: preview }, { status: 409, statusText: 'Conflict' });
    expect(await result).toEqual(preview);
  });
  it('propagates ordinary conflicts instead of treating them as valid payroll', async () => {
    const result = service.preview('2026-11', ['a']);
    const assertion = expect(result).rejects.toMatchObject({ status: 409 });
    http.expectOne('http://localhost:3000/payroll/runs/preview').flush({ message: 'Payroll changed' }, { status: 409, statusText: 'Conflict' }); await assertion;
  });
  it('rejects a partial preview for the wrong period', async () => {
    const result = service.preview('2026-11', ['a']);
    const assertion = expect(result).rejects.toMatchObject({ status: 409 });
    http.expectOne('http://localhost:3000/payroll/runs/preview').flush({ code: 'PAYROLL_EMPLOYEE_REVIEW_REQUIRED', payrollPreview: { period: '2026-10', checks: [], validationIssues: [{ employeeId: 'a' }] } }, { status: 409, statusText: 'Conflict' }); await assertion;
  });
});

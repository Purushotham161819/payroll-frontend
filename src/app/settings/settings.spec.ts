import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SalaryComponentService } from './settings';

describe('Salary component request payload', () => {
  it('excludes MongoDB metadata when saving a retrieved component', () => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    const service = TestBed.inject(SalaryComponentService);
    const http = TestBed.inject(HttpTestingController);
    const editable = { name: 'Updated Basic', code: 'BASIC', category: 'earning', calculationBaseType: 'annual_ctc', calculationBaseComponentId: null, calculationType: 'percentage', calculationValue: 45, fixedAmountPeriod: null, showInPayslip: false, status: 'inactive' };
    const record = {...editable, _id: '507f1f77bcf86cd799439011', createdAt: '2026-10-27T00:00:00Z', updatedAt: '2026-10-27T00:00:00Z', __v: 2};
    service.save(record, record._id).subscribe();
    const request = http.expectOne('http://localhost:3000/salary-components/' + record._id);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(editable);
    request.flush({...record, __v: 3});
    http.verify();
  });
});

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
export interface Contractor {
  _id: string;
  contractorId: string;
  firstName: string;
  lastName: string;
  email: string;
  componentIds: string[];
  version: number;
  status?: 'Active' | 'Inactive';
}
export type Classification = 'earning' | 'allowance' | 'deduction';
export interface ContractorComponent {
  _id: string;
  name: string;
  code: string;
  classification: Classification;
  status: 'active' | 'inactive';
  calculationType: 'manual' | 'fixed' | 'percentage' | 'formula';
  calculationValue?: number | null;
  calculationBase?: string;
  formula?: string;
  version: number;
}
export interface ContractorLine {
  componentId: string;
  componentVersion: number;
  amount?: number;
}
export interface ContractorPayment {
  paymentId: string;
  contractorId: string;
  contractorCode: string;
  firstName: string;
  lastName: string;
  email: string;
  paymentDate: string;
  description: string;
  components: (ContractorLine &
    Pick<
      ContractorComponent,
      | 'name'
      | 'code'
      | 'classification'
      | 'calculationType'
      | 'calculationValue'
      | 'calculationBase'
      | 'formula'
    >)[];
  calculationVersion?: number;
  grossPay?: number | null;
  totalEarnings?: number;
  totalAllowances?: number;
  totalDeductions: number;
  netPayment: number;
  status: string;
}
export interface PaymentDraft {
  idempotencyKey: string;
  paymentDate: string;
  description?: string;
  entries: {
    contractorId: string;
    contractorVersion: number;
    description?: string;
    grossPay: number;
    components: Pick<ContractorLine, 'componentId' | 'componentVersion'>[];
  }[];
}
export const classificationLabel = (value: string) =>
  ({ earning: 'Earnings', allowance: 'Allowances', deduction: 'Deductions' })[value] ?? value;
@Injectable({ providedIn: 'root' })
export class ContractorApi {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl + '/contractors';
  list() {
    return this.http.get<Contractor[]>(this.url);
  }
  get(id: string) {
    return this.http.get<Contractor>(this.url + '/' + encodeURIComponent(id));
  }
  changeStatus(c: Contractor, status: 'Active' | 'Inactive') {
    return this.http.patch<Contractor>(this.url + '/' + c._id + '/status', { version: c.version, status });
  }
  remove(id: string) {
    return this.http.delete<{ deleted: true }>(this.url + '/' + id);
  }
  create(dto: Pick<Contractor, 'firstName' | 'lastName' | 'email'>) {
    return this.http.post<Contractor>(this.url, dto);
  }
  update(id: string, dto: Pick<Contractor, 'firstName' | 'lastName' | 'email' | 'version'>) {
    return this.http.patch<Contractor>(this.url + '/' + id, dto);
  }
  components() {
    return this.http.get<ContractorComponent[]>(this.url + '/components');
  }
  saveComponent(dto: Omit<ContractorComponent, '_id' | 'version'>, existing?: ContractorComponent) {
    return existing
      ? this.http.patch<ContractorComponent>(this.url + '/components/' + existing._id, {
          ...dto,
          version: existing.version,
        })
      : this.http.post<ContractorComponent>(this.url + '/components', dto);
  }
  assign(c: Contractor, componentIds: string[]) {
    return this.http.patch<Contractor>(this.url + '/' + c._id + '/components', {
      componentIds,
      version: c.version,
    });
  }
  pay(dto: PaymentDraft) {
    return this.http.post<{ entries: ContractorPayment[] }>(this.url + '/payments', dto);
  }
  history(id: string) {
    return this.http.get<ContractorPayment[]>(this.url + '/' + id + '/payments');
  }
}

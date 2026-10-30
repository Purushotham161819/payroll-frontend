import { Injectable } from '@angular/core';
import type { PayrollRun, PayCheck } from '../features/run-payroll/models/payroll-run';
export interface PayrollUiContext {
  key: string; period: string; paymentDate: string; selectedIds: string[]; historicalIds?: string[];
  dirty: boolean; version: number; inputHash: string; scrollY: number; tableScrollLeft: number;
}
export interface EmployeeOrigin {
  kind: 'employees' | 'payroll'; url: string; scope: string; scrollY?: number; payroll?: PayrollUiContext;
}
export interface PayrollMemory { run: PayrollRun; candidates: [string, PayCheck][] }
// Only UI choices go into router history state. Salary/calculation snapshots
// remain in this short-lived, account-scoped memory cache, never URLs/storage.
@Injectable({ providedIn: 'root' })
export class NavigationContext {
  private scope: string | null = null;
  private readonly payroll = new Map<string, PayrollMemory>();
  setScope(scope: string | null) { if (scope !== this.scope) this.payroll.clear(); this.scope = scope; }
  owner() { return this.scope; }
  remember(origin: EmployeeOrigin, memory: PayrollMemory) {
    if (origin.scope !== this.scope || !origin.payroll) return;
    this.payroll.set(origin.payroll.key, memory);
    while (this.payroll.size > 4) this.payroll.delete(this.payroll.keys().next().value!);
  }
  memory(origin: EmployeeOrigin) { return origin.scope === this.scope && origin.payroll ? this.payroll.get(origin.payroll.key) : undefined; }
  origin(state: unknown, field: 'employeeOrigin' | 'payrollReturn' = 'employeeOrigin'): EmployeeOrigin | null {
    if (!state || typeof state !== 'object' || !this.scope) return null;
    const origin = (state as Record<string, unknown>)[field] as EmployeeOrigin | undefined;
    if (!origin || origin.scope !== this.scope || !this.safeUrl(origin.url, origin.kind)) return null;
    if (origin.kind === 'payroll' && !this.validPayroll(origin.payroll)) return null;
    return origin;
  }
  backState(origin: EmployeeOrigin) { return origin.kind === 'payroll' ? { payrollReturn: origin } : { employeeListReturn: { scope: origin.scope, scrollY: this.scroll(origin.scrollY) } }; }
  listScroll(state: unknown): number {
    const value = (state as { employeeListReturn?: { scope?: string; scrollY?: number } } | null)?.employeeListReturn;
    return value?.scope === this.scope && this.scope ? this.scroll(value.scrollY) : 0;
  }
  listOrigin(status: string, scrollY: number): EmployeeOrigin | null {
    return this.scope ? { kind: 'employees', scope: this.scope, url: '/?status=' + (['All', 'Active', 'Terminated'].includes(status) ? status : 'Active'), scrollY: this.scroll(scrollY) } : null;
  }
  private scroll(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(value, 1000000)) : 0; }
  private validPayroll(value?: PayrollUiContext): boolean {
    return !!value && typeof value.key === 'string' && /^[a-zA-Z0-9-]{16,80}$/.test(value.key)
      && /^\d{4}-(0[1-9]|1[0-2])$/.test(value.period) && typeof value.paymentDate === 'string'
      && (value.paymentDate === '' || /^\d{4}-\d{2}-\d{2}$/.test(value.paymentDate))
      && Array.isArray(value.selectedIds) && value.selectedIds.every(id => typeof id === 'string' && /^[a-f\d]{24}$/.test(id))
      && (value.historicalIds === undefined || (Array.isArray(value.historicalIds) && value.historicalIds.every(id => typeof id === 'string' && /^[a-f\d]{24}$/.test(id))))
      && typeof value.dirty === 'boolean' && Number.isSafeInteger(value.version) && value.version >= 0
      && typeof value.inputHash === 'string' && value.inputHash.length <= 128
      && Number.isFinite(value.scrollY) && Number.isFinite(value.tableScrollLeft);
  }
  private safeUrl(value: unknown, kind: unknown): boolean {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return false;
    try {
      const url = new URL(value, 'https://paystream.invalid');
      if (url.origin !== 'https://paystream.invalid' || url.hash) return false;
      if (kind === 'employees') return url.pathname === '/' && [...url.searchParams].every(([key, v]) => key === 'status' && ['All', 'Active', 'Terminated'].includes(v));
      if (kind !== 'payroll' || !/^\/payroll\/(run|submitted\/\d{4}-(0[1-9]|1[0-2]))$/.test(url.pathname)) return false;
      return [...url.searchParams].every(([key, v]) => key === 'employees' ? (v === '' || /^[a-f\d]{24}(,[a-f\d]{24})*$/.test(v)) : key === 'returnStatus' ? ['All', 'Active', 'Terminated'].includes(v) : key === 'submissionId' && /^[a-zA-Z0-9-]{16,80}$/.test(v));
    } catch { return false; }
  }
}

import { TestBed } from '@angular/core/testing';
import { NavigationContext, EmployeeOrigin } from './navigation-context';
const id = '507f1f77bcf86cd799439010';
const origin = (): EmployeeOrigin => ({ kind: 'payroll', url: `/payroll/run?employees=${id}&returnStatus=All`, scope: 'user:one:ORG000001', payroll: { key: '12345678-1234-1234-1234-123456789012', period: `${new Date().getFullYear()}-01`, paymentDate: `${new Date().getFullYear()}-02-05`, selectedIds: [id], dirty: true, version: 2, inputHash: 'hash', scrollY: 250, tableScrollLeft: 100 } });
describe('Account-scoped internal navigation context', () => {
  it('round-trips UI choices without putting salary snapshots in router state', () => {
    const service = TestBed.inject(NavigationContext); service.setScope(origin().scope); const value = origin();
    service.remember(value, { run: { checks: [{ netPay: 987654.32 }] } as any, candidates: [] });
    expect(service.origin({ employeeOrigin: value })).toEqual(value);
    expect(service.origin(service.backState(value), 'payrollReturn')).toEqual(value);
    expect(service.memory(value)?.run.checks[0].netPay).toBe(987654.32);
    expect(JSON.stringify(service.backState(value))).not.toContain('netPay'); expect(JSON.stringify(service.backState(value))).not.toContain('987654');
  });
  it('rejects external, encoded-path, unsupported and caller-supplied salary destinations', () => {
    const service = TestBed.inject(NavigationContext); service.setScope(origin().scope);
    for (const url of ['https://evil.test', '//evil.test', '/\\evil.test', '/payroll/%72un', '/login', '/super-admin', '/payroll/run?salary=123', '/payroll/run?returnStatus=Invalid', '/payroll/run#outside']) expect(service.origin({ employeeOrigin: { ...origin(), url } })).toBeNull();
    expect(service.origin(null)).toBeNull(); expect(service.origin({ employeeOrigin: { ...origin(), payroll: { ...origin().payroll, selectedIds: ['bad'] } } })).toBeNull();
  });
  it('clears cached snapshots across logout, user and organization changes', () => {
    const service = TestBed.inject(NavigationContext); const value = origin(); service.setScope(value.scope); service.remember(value, { run: {} as any, candidates: [] });
    service.setScope('user:two:ORG000002'); expect(service.memory(value)).toBeUndefined(); expect(service.origin({ employeeOrigin: value })).toBeNull();
    service.setScope(value.scope); expect(service.memory(value)).toBeUndefined(); service.remember(value, { run: {} as any, candidates: [] }); service.setScope(null); expect(service.memory(value)).toBeUndefined();
  });
  it('restores exact directory text only within the owning account and accepts legacy empty state', () => {
    const service = TestBed.inject(NavigationContext); service.setScope(origin().scope);
    for (const text of ['', '  Ada  ', 'Example']) {
      const value = service.listOrigin('All', 400, text)!;
      const state = service.backState(value);
      expect(service.listSearch(state)).toBe(text);
      expect(service.listScroll(state)).toBe(400);
      expect(service.origin({ employeeOrigin: value })).toEqual(value);
      expect(value.url).toBe('/?status=All');
      service.setScope('user:two:ORG000002');
      expect(service.listSearch(state)).toBe('');
      expect(service.listScroll(state)).toBe(0);
      service.setScope(origin().scope);
    }
    expect(service.listSearch(null)).toBe('');
    expect(service.listSearch({ employeeListReturn: { scope: origin().scope, searchText: 123 } })).toBe('');
    expect(service.listSearch(service.backState(service.listOrigin('Active', 0)!))).toBe('');
  });
  it('preserves only validated Employees filter and scroll context', () => {
    const service = TestBed.inject(NavigationContext); service.setScope(origin().scope); const value = service.listOrigin('All', 400)!;
    expect(service.origin({ employeeOrigin: value })?.url).toBe('/?status=All'); expect(service.listScroll(service.backState(value))).toBe(400);
    expect(service.origin({ employeeOrigin: { ...value, url: '/?status=All&returnUrl=https://evil.test' } })).toBeNull();
  });
});

it('restores validated pagination only for the same directory owner',()=>{
 const navigation=TestBed.inject(NavigationContext);navigation.setScope('user:one:ORG000001');
 const value=navigation.listOrigin('All',120,'Ada',3,25)!;const state=navigation.backState(value);
 expect(navigation.listPagination(state)).toEqual({page:3,pageSize:25});
 navigation.setScope('user:two:ORG000002');expect(navigation.listPagination(state)).toEqual({page:1,pageSize:10});
});

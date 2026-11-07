import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { EmployeeList } from './employee-list';
const base = 'http://localhost:3000/employees';
const person = {
  _id: '507f1f77bcf86cd799439011',
  employeeId: 'EMP001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  status: 'Active',
  annualCtc: 1400000.5,
};
const result = (page = 1, total = 23, pageSize = 10) => ({
  items: Array.from({ length: Math.min(pageSize, total) }, (_, i) => ({
    ...person,
    _id: person._id.slice(0, -2) + String((page - 1) * pageSize + i).padStart(2, '0'),
  })),
  page,
  total,
  pageSize,
});
describe('Employee directory server paging and search', () => {
  let http: HttpTestingController;
  function setup() {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(EmployeeList);
    fixture.detectChanges();
    http.expectOne((r) => r.url === base).flush(result());
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance };
  }
  afterEach(() => http.verify());
  it('loads one page only and uses Previous, Next, page numbers and page-size metadata', () => {
    const { fixture, page } = setup();
    expect(page.employees()).toHaveLength(10);
    expect(page.total()).toBe(23);
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(10);
    page.changePage(2);
    const req = http.expectOne((r) => r.url === base);
    expect(req.request.params.get('page')).toBe('2');
    req.flush(result(2));
    expect(page.page()).toBe(2);
    page.changePageSize(25);
    const size = http.expectOne((r) => r.url === base);
    expect(size.request.params.get('page')).toBe('1');
    expect(size.request.params.get('pageSize')).toBe('25');
    size.flush(result(1, 23, 25));
    expect(page.employees()).toHaveLength(23);
    http.expectNone(base);
  });
  for (const text of ['emp001', 'ADA', 'love', 'Ada Lovelace', '  aDA   LoVELace  '])
    it('sends the existing search criteria to the server: ' + text, async () => {
      const { page, fixture } = setup();
      const input = fixture.nativeElement.querySelector('#employee-search');
      input.value = text;
      input.dispatchEvent(new Event('input'));
      let req: any;
      await vi.waitFor(() => {
        req = http.expectOne((r) => r.url === base);
      });
      expect(req.request.params.get('search')).toBe(text);
      expect(req.request.params.get('page')).toBe('1');
      req.flush({ ...result(), items: [person], total: 1 });
      fixture.detectChanges();
      expect(page.employees()).toEqual([person]);
    });
  it('resets to page one on status changes and displays zero-result totals', () => {
    const { page, fixture } = setup();
    page.changePage(2);
    http.expectOne((r) => r.url === base).flush(result(2));
    page.changeFilter('Terminated');
    const req = http.expectOne((r) => r.url === base);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('status')).toBe('Terminated');
    req.flush({ items: [], total: 0, page: 1, pageSize: 10 });
    fixture.detectChanges();
    expect(page.total()).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No employees found.');
    expect(fixture.nativeElement.textContent).toContain('of 0 employees');
  });
  it('launches payroll with all active IDs independently of the current page, search and status', () => {
    const { page } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.statusFilter.set('Terminated');
    page.searchTerm.set('Other');
    page.runPayroll();
    page.runPayroll();
    http
      .expectOne('http://localhost:3000/reports/dashboard')
      .flush({ activeEmployeeIds: ['active-on-page-one', 'active-on-page-three'] });
    expect(navigate).toHaveBeenCalledWith(['/payroll/run'], {
      queryParams: {
        employees: 'active-on-page-one,active-on-page-three',
        returnStatus: 'Terminated',
      },
    });
  });
});

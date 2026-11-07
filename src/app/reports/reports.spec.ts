import { TestBed } from '@angular/core/testing';
import { notificationInterceptor } from '../shared/notification-interceptor';
import { NotificationService } from '../shared/notification.service';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Reports, ReportData } from './reports';
import { PayrollReportService } from '../payroll/payroll-report.service';
import { routes } from '../app.config';
const base = 'http://localhost:3000/reports';
const data = (): ReportData => ({
  columns: [
    { key: 'name', label: 'Employee Name', kind: 'text' },
    { key: 'netPay', label: 'Net Pay', kind: 'money' },
  ],
  rows: [{ name: 'B Example', netPay: 950 }],
  total: 1,
  page: 1,
  limit: 50,
  summary: { employees: 1, grossPay: 1000, deductions: 50, netPay: 950, paid: 0, pending: 1 },
});
describe('Reports viewing and snapshot export', () => {
  let http: HttpTestingController;
  const exporter = { exportSnapshot: vi.fn().mockResolvedValue(undefined) };
  async function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([notificationInterceptor])),
        provideHttpClientTesting(),
        { provide: PayrollReportService, useValue: exporter },
      ],
    });
    const fixture = TestBed.createComponent(Reports);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(base + '/payroll-periods').flush([{ period: '2026-07', runs: ['run-one'] }]);
    await fixture.whenStable();
    return { fixture, page: fixture.componentInstance };
  }
  afterEach(() => {
    http.verify();
    vi.clearAllMocks();
  });
  it('loads only processed month options and uses saved history, without loading current employees', async () => {
    const { fixture, page } = await setup();
    expect(page.periodOptions().map((p) => p.value)).toEqual(['2026-07']);
    const load = page.open('payroll');
    http
      .expectOne((r) => r.url === base + '/payroll/2026-07')
      .flush({ ...data(), period: '2026-07' });
    await load;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('B Example');
    expect(fixture.nativeElement.textContent).toContain('950');
    expect(fixture.nativeElement.textContent).toContain('Jul 2026');
    http.expectNone('http://localhost:3000/employees');
    expect(routes.find((r) => r.path === '')?.children?.some((r) => r.path === 'reports')).toBe(
      true,
    );
  });
  it('passes workforce filters and pagination to the report API', async () => {
    const { page } = await setup();
    page.status = 'Terminated';
    page.joinedFrom = '2026-01-01';
    const load = page.open('workforce');
    const req = http.expectOne((r) => r.url === base + '/workforce');
    expect(req.request.params.get('status')).toBe('Terminated');
    expect(req.request.params.get('joinedFrom')).toBe('2026-01-01');
    req.flush(data());
    await load;
    const next = page.load(2);
    http.expectOne((r) => r.params.get('page') === '2').flush({ ...data(), page: 2 });
    await next;
    expect(page.report()?.page).toBe(2);
  });
  it('exports every filtered page with the same snapshot columns and amounts', async () => {
    const { page } = await setup();
    const load = page.open('payroll');
    http.expectOne((r) => r.url === base + '/payroll/2026-07').flush(data());
    await load;
    const first = {
      ...data(),
      total: 51,
      rows: Array.from({ length: 50 }, (_, i) => ({ name: 'Employee ' + i, netPay: 950 })),
    };
    const exported = page.exportPdf();
    http.expectOne((r) => r.params.get('page') === '1').flush(first);
    let next: any;
    await vi.waitFor(() => {
      next = http.expectOne((r) => r.params.get('page') === '2');
    });
    next.flush({ ...first, page: 2, rows: [{ name: 'Final employee', netPay: 950 }] });
    await exported;
    expect(exporter.exportSnapshot).toHaveBeenCalledOnce();
    const [title, headings, body, summary] = exporter.exportSnapshot.mock.calls[0] as any;
    expect(title).toBe('Payroll Report - 2026-07');
    expect(headings).toEqual(['Employee Name', 'Net Pay']);
    expect(body).toHaveLength(51);
    expect(body[50]).toEqual(['Final employee', '\u20b9950']);
    expect(summary).toContain('Employees: 51');
  });
  it('keeps results in place, shows Applying, blocks duplicate filtering and renders empty results', async () => {
    const { page, fixture } = await setup();
    const initial = page.open('workforce');
    http.expectOne((r) => r.url === base + '/workforce').flush(data());
    await initial;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[cardActions] button').textContent).toContain(
      'Export PDF',
    );
    expect(fixture.nativeElement.querySelector('.filters [cardActions]')).toBeNull();
    page.status = 'Terminated';
    const apply = page.load();
    await page.load();
    fixture.detectChanges();
    const req = http.expectOne((r) => r.url === base + '/workforce');
    expect(req.request.params.get('status')).toBe('Terminated');
    expect(page.report()?.rows).toEqual(data().rows);
    expect(fixture.nativeElement.textContent).toContain('Applying...');
    expect(fixture.nativeElement.querySelector('.filters button').disabled).toBe(true);
    req.flush({ ...data(), rows: [], total: 0 });
    await apply;
    fixture.detectChanges();
    expect(page.status).toBe('Terminated');
    expect(fixture.nativeElement.textContent).toContain('No matching records.');
    expect(page.loading()).toBe(false);
  });
  it('uses centralized API errors and re-enables filters after failure without losing prior results', async () => {
    const { page } = await setup();
    const initial = page.open('workforce');
    http.expectOne((r) => r.url === base + '/workforce').flush(data());
    await initial;
    const apply = page.load();
    http
      .expectOne((r) => r.url === base + '/workforce')
      .flush({ message: 'Invalid date range' }, { status: 400, statusText: 'Bad Request' });
    await apply;
    expect(TestBed.inject(NotificationService).current()?.kind).toBe('error');
    expect(page.error()).toContain('Invalid date range');
    expect(page.loading()).toBe(false);
    expect(page.report()?.rows).toEqual(data().rows);
  });
 it('offers exactly All, Active and Terminated and sends All without a status restriction',async()=>{
  const {page}=await setup();expect(page.statuses).toEqual([{value:'',label:'All'},{value:'Active',label:'Active'},{value:'Terminated',label:'Terminated'}]);
  const request=page.open('workforce');const req=http.expectOne(r=>r.url===base+'/workforce');expect(req.request.params.get('status')).toBe('');req.flush({...data(),summary:{employees:3,Active:1,Terminated:1,Inactive:1},total:3});await request;expect(page.report()?.total).toBe(3);
 });

});

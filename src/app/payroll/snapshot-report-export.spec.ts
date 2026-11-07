import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PayrollReportService } from './payroll-report.service';
const records = vi.hoisted(() => ({ docs: [] as any[], tables: [] as any[] }));
vi.mock('jspdf', () => ({
  jsPDF: class {
    internal = { pageSize: { getWidth: () => 420, getHeight: () => 297 } };
    text = vi.fn();
    setFontSize = vi.fn();
    addFileToVFS = vi.fn();
    addFont = vi.fn();
    setFont = vi.fn();
    setPage = vi.fn();
    save = vi.fn().mockResolvedValue(undefined);
    splitTextToSize = (text: string) => [text];
    getNumberOfPages = () => 2;
    constructor() {
      records.docs.push(this);
    }
  },
}));
vi.mock('jspdf-autotable', () => ({
  autoTable: (doc: any, options: any) => {
    records.tables.push(options);
    options.didDrawPage();
    options.didDrawPage();
  },
}));
describe('Snapshot report organization attribution', () => {
  let http: HttpTestingController, service: PayrollReportService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(PayrollReportService);
    vi.spyOn(service as any, 'loadFont').mockResolvedValue('font');
    records.docs.length = 0;
    records.tables.length = 0;
  });
  afterEach(() => http.verify());
  it('fetches the authenticated organization for each report and preserves table data and page numbering', async () => {
    for (const [title, organization] of [
      ['Total Workforce Report', 'Organization A'],
      ['Payroll Report - 2026-07', 'Organization B'],
    ]) {
      const exported = service.exportSnapshot(
        title,
        ['Employee', 'Net Pay'],
        [['Ada', '950']],
        'Employees: 1',
      );
      const req = http.expectOne('http://localhost:3000/settings/organization');
      expect(req.request.params.keys()).toEqual([]);
      req.flush({ displayName: organization });
      await exported;
      const doc = records.docs.at(-1);
      const text = JSON.stringify(doc.text.mock.calls);
      expect(text).toContain(organization);
      expect(text).toContain(title);
      expect(text).toContain('Generated:');
      expect(text).toContain('Page 2 of 2');
      expect(records.tables.at(-1).body).toEqual([['Ada', '950']]);
      expect(records.tables.at(-1).head).toEqual([['Employee', 'Net Pay']]);
      expect(records.tables.at(-1).margin.top).toBeGreaterThan(30);
      expect(doc.save).toHaveBeenCalledOnce();
    }
    expect(JSON.stringify(records.docs[1].text.mock.calls)).not.toContain('Organization A');
  });
  it('uses a clean label when no organization name exists', async () => {
    const exported = service.exportSnapshot('Total Workforce Report', [], [], 'Employees: 0');
    http.expectOne('http://localhost:3000/settings/organization').flush({});
    await exported;
    const text = JSON.stringify(records.docs[0].text.mock.calls);
    expect(text).toContain('Organization');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('PayStream');
  });
});

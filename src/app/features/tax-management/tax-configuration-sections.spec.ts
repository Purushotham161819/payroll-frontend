import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TaxConfiguration } from './tax-configuration';
const url = 'http://localhost:3000/settings/tax-configuration';
const year = {
  code: 'QA_YEAR',
  name: 'QA financial year',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  active: true,
};
const rules = () => ({
  ruleVersion: 'salary-only-v1',
  standardDeduction: 0,
  rebateLimit: 0,
  maximumRebate: 0,
  cessPercentage: 0,
  rebateMarginalRelief: false,
  surchargeMarginalRelief: false,
  incomeRounding: 'paise',
  liabilityRounding: 'paise',
  minimumAge: 0,
  maximumAge: null,
  slabs: [{ from: 0, to: null, rate: 1 }],
  surcharge: [],
  mappings: [
    {
      componentId: 'basic',
      componentName: 'Basic Salary',
      type: 'taxable',
      legalReference: 'QA evidence',
      conditions: '',
    },
  ],
  legalReferences: ['https://www.incometax.gov.in/qa-fixture'],
  reviewNote: 'QA only',
  employerContributionsReviewed: true,
});
const revision = () => ({
  id: 'original',
  version: 1,
  yearCode: year.code,
  regime: 'new',
  effectiveDate: year.startDate,
  createdBy: 'QA reviewer',
  createdAt: '2026-01-01T00:00:00Z',
  rules: rules(),
});
describe('Tax Configuration card persistence', () => {
  async function setup() {
    TestBed.configureTestingModule({
      imports: [TaxConfiguration],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(TaxConfiguration),
      http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(url).flush({
      version: 1,
      years: [year],
      revisions: [revision()],
      published: { [year.code + ':new']: 'original' },
      audit: [],
    });
    http.expectOne('http://localhost:3000/salary-components').flush([
      {
        _id: 'basic',
        name: 'Basic Salary',
        code: 'BASIC',
        status: 'active',
        category: 'earning',
      },
    ]);
    await fixture.whenStable();
    await vi.waitFor(() => expect(fixture.componentInstance.busy()).toBe(false));
    expect(fixture.componentInstance.error()).toBe('');
    fixture.detectChanges();
    return { fixture, http, page: fixture.componentInstance };
  }
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('loads the saved editor on reload and renders distinct cards and structured history', async () => {
    const { fixture, page } = await setup();
    expect(page.standardDeduction).toBe(0);
    expect(page.mappings[0].code).toBe('BASIC');
    expect(page.sectionDirty('master')).toBe(false);
    for (const title of [
      'Financial Years',
      'Tax Master',
      'Progressive Tax Slabs',
      'Surcharge Thresholds',
      'Salary Component Taxability',
      'Tax History',
    ])
      expect(fixture.nativeElement.textContent).toContain(title);
    expect(
      fixture.nativeElement.querySelector('[aria-label="Financial years"] table'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Tax history"] table')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Tax history"]').textContent).toContain(
      'QA reviewer',
    );
  });
  it.each(['master', 'slabs', 'surcharge', 'taxability'] as const)(
    'saves only %s through a complete unified revision and retains unsaved invalid fields elsewhere',
    async (section) => {
      const { fixture, http, page } = await setup();
      const original = structuredClone(page.state());
      page.standardDeduction = 100;
      page.slabs = [{ from: 0, to: null, rate: 2 }];
      page.surcharge = [{ threshold: 5000000, rate: 10 }];
      page.mappings[0].legalReference = 'Edited QA evidence';
      if (section !== 'master') page.standardDeduction = null;
      if (section !== 'slabs') page.slabs[0].rate = -1;
      const edited = structuredClone({
        standard: page.standardDeduction,
        slabs: page.slabs,
        surcharge: page.surcharge,
        mappings: page.mappings,
      });
      const pending = page.saveSection(section);
      const second = page.saveSection(section);
      expect(page.busy()).toBe(true);
      expect(page.savingSection()).toBe(section);
      const requests = http.match(url + '/revisions');
      expect(requests).toHaveLength(1);
      const payload = requests[0].request.body;
      expect(payload.version).toBe(1);
      expect(payload.yearCode).toBe(year.code);
      expect(payload.rules.standardDeduction).toBe(section === 'master' ? 100 : 0);
      expect(payload.rules.slabs[0].rate).toBe(section === 'slabs' ? 2 : 1);
      expect(payload.rules.surcharge).toEqual(
        section === 'surcharge' ? [{ threshold: 5000000, rate: 10 }] : [],
      );
      expect(payload.rules.mappings[0].legalReference).toBe(
        section === 'taxability' ? 'Edited QA evidence' : 'QA evidence',
      );
      const saved = { ...revision(), id: 'saved', version: 2, rules: payload.rules };
      requests[0].flush({ ...original, version: 2, revisions: [revision(), saved] });
      await Promise.all([pending, second]);
      fixture.detectChanges();
      expect(page.sectionDirty(section)).toBe(false);
      expect(page.state().published).toEqual(original.published);
      expect(page.state().revisions[0]).toEqual(original.revisions[0]);
      if (section !== 'master') expect(page.standardDeduction).toBe(edited.standard);
      if (section !== 'slabs') expect(page.slabs).toEqual(edited.slabs);
      if (section !== 'surcharge') expect(page.surcharge).toEqual(edited.surcharge);
      if (section !== 'taxability') expect(page.mappings).toEqual(edited.mappings);
      expect(page.sectionMessages()[section]).toContain('unpublished revision');
      expect(page.busy()).toBe(false);
    },
  );
  it('preserves every edit on a version conflict and shows the card error', async () => {
    const { http, page } = await setup();
    page.standardDeduction = 123;
    page.slabs[0].rate = 7;
    const pending = page.saveSection('master');
    http
      .expectOne(url + '/revisions')
      .flush(
        { message: 'Reload the current tax configuration version.' },
        { status: 409, statusText: 'Conflict' },
      );
    await pending;
    expect(page.standardDeduction).toBe(123);
    expect(page.slabs[0].rate).toBe(7);
    expect(page.sectionErrors().master).toContain('Reload');
    expect(page.sectionDirty('master')).toBe(true);
  });
  it('rejects overlapping slabs without a request and allows unrelated master save against saved slabs', async () => {
    const { http, page } = await setup();
    page.slabs = [
      { from: 0, to: 100, rate: 0 },
      { from: 50, to: null, rate: 5 },
    ];
    await page.saveSection('slabs');
    http.expectNone(url + '/revisions');
    expect(page.sectionErrors().slabs).toContain('overlaps');
    page.standardDeduction = 10;
    const pending = page.saveSection('master');
    const req = http.expectOne(url + '/revisions');
    expect(req.request.body.rules.slabs).toEqual(rules().slabs);
    req.flush({
      ...page.state(),
      version: 2,
      revisions: [
        revision(),
        { ...revision(), id: 'second', version: 2, rules: req.request.body.rules },
      ],
    });
    await pending;
    expect(page.slabs[1].from).toBe(50);
  });
  it('requires a complete first revision instead of sending a partial configuration', async () => {
    const { http, page } = await setup();
    page.state.set({ ...page.state(), revisions: [] });
    await page.saveSection('master');
    http.expectNone(url + '/revisions');
    expect(page.sectionErrors().master).toContain('first complete configuration');
  });
  it('paginates immutable history newest first', async () => {
    const { page } = await setup();
    const revisions = Array.from({ length: 23 }, (_, i) => ({
      ...revision(),
      id: String(i),
      version: i + 1,
    }));
    page.state.set({ ...page.state(), revisions });
    expect(page.historyPages()).toBe(3);
    expect(page.pagedHistory().map((r: any) => r.version)).toEqual([
      23, 22, 21, 20, 19, 18, 17, 16, 15, 14,
    ]);
    page.historyPage = 3;
    expect(page.pagedHistory().map((r: any) => r.version)).toEqual([3, 2, 1]);
    expect(revisions[0].version).toBe(1);
  });
});

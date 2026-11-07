import { jsPDF } from 'jspdf';
import { drawReportPdfHeader } from './report-pdf-header';
describe('Centered report PDF header', () => {
  for (const orientation of ['portrait', 'landscape'] as const)
    it('centers organization, title and generated date on ' + orientation + ' pages', () => {
      const doc = new jsPDF({ orientation, format: 'a4', unit: 'mm' }),
        text = vi.spyOn(doc, 'text');
      const bottom = drawReportPdfHeader(doc, {
        organizationName: 'Actual Organization',
        reportName: 'Total Workforce Report',
        generatedOn: new Date(2026, 10, 7),
      });
      expect(text.mock.calls).toHaveLength(3);
      for (const call of text.mock.calls) {
        expect(call[1]).toBe(doc.internal.pageSize.getWidth() / 2);
        expect(call[3]).toMatchObject({ align: 'center' });
      }
      expect(text.mock.calls[0][0]).toEqual(['Actual Organization']);
      expect(text.mock.calls[1][0]).toEqual(['Total Workforce Report']);
      expect(String(text.mock.calls[2][0])).toContain('07 November 2026');
      expect(Number(text.mock.calls[0][2])).toBeLessThan(Number(text.mock.calls[1][2]));
      expect(Number(text.mock.calls[1][2])).toBeLessThan(Number(text.mock.calls[2][2]));
      expect(bottom).toBeGreaterThan(Number(text.mock.calls[2][2]));
    });
  it('measures wrapped names and handles a missing name without product branding', () => {
    const doc = new jsPDF(),
      text = vi.spyOn(doc, 'text');
    const common = { reportName: 'Payroll Report - 2026-07', generatedOn: new Date(2026, 10, 7) };
    const short = drawReportPdfHeader(doc, { ...common, organizationName: '' }, false);
    expect(text).not.toHaveBeenCalled();
    const long = drawReportPdfHeader(
      doc,
      { ...common, organizationName: 'Long organization name '.repeat(25) },
      false,
    );
    expect(long).toBeGreaterThan(short);
    drawReportPdfHeader(doc, { ...common, organizationName: '' });
    expect(text.mock.calls[0][0]).toEqual(['Organization']);
  });
});

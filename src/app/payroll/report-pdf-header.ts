import type { jsPDF } from 'jspdf';

export interface ReportPdfHeader {
  organizationName: string;
  reportName: string;
  generatedOn: Date;
}

/** One centered header for snapshot reports, measured against the actual page. */
export function drawReportPdfHeader(doc: jsPDF, header: ReportPdfHeader, draw = true): number {
  const width = doc.internal.pageSize.getWidth();
  const center = width / 2;
  const date = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(header.generatedOn);
  let y = 12;
  for (const [text, size, lineHeight] of [
    [header.organizationName.trim() || 'Organization', 16, 7],
    [header.reportName, 12, 6],
    ['Generated: ' + date, 9, 5],
  ] as const) {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, width - 28) as string[];
    if (draw) doc.text(lines, center, y, { align: 'center' });
    y += lines.length * lineHeight;
  }
  return y;
}

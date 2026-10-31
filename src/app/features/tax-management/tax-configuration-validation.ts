export interface TaxDraft {
  yearCode: string; effectiveDate: string; regime: string;
  standardDeduction: number | null; rebateLimit: number | null; maximumRebate: number | null; cess: number | null;
  minimumAge: number; maximumAge: number | null; incomeRounding: string; liabilityRounding: string;
  slabs: { from: number; to: number | null; rate: number }[];
  surcharge: { threshold: number; rate: number }[];
  mappings: { componentId: string; name?: string; type: string; legalReference: string; conditions?: string; taxablePercentage?: number | null; exemptAmount?: number | null; partialMode?: string; available?: boolean }[];
  sources: string; reviewNote: string; employerReviewed: boolean;
}
export const officialSource = /^https:\/\/([a-z0-9-]+\.)*(incometax\.gov\.in|incometaxindia\.gov\.in|egazette\.gov\.in|indiabudget\.gov\.in)\//i;
const money = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e12;
const rate = (v: unknown): v is number => money(v) && v <= 100;
export function configurationProblems(d: TaxDraft): string[] {
  const errors: string[] = [];
  if (!d.yearCode) errors.push('Select a financial year.');
  if (!d.effectiveDate) errors.push('Effective date is required. Select a financial year first.');
  if (!['old', 'new'].includes(d.regime)) errors.push('Select Old or New tax regime.');
  for (const [value, label] of [[d.standardDeduction,'Standard deduction'],[d.rebateLimit,'Rebate eligibility limit'],[d.maximumRebate,'Maximum rebate']] as const)
    if (!money(value)) errors.push(value === null ? label + ' is required.' : label + ' must be a non-negative amount up to 1 trillion.');
  if (!rate(d.cess)) errors.push(d.cess === null ? 'Cess percentage is required.' : 'Cess percentage must be between 0 and 100.');
  if (!Number.isInteger(d.minimumAge) || d.minimumAge < 0 || d.minimumAge > 120 || (d.maximumAge !== null && (!Number.isInteger(d.maximumAge) || d.maximumAge < d.minimumAge || d.maximumAge > 120))) errors.push('Enter a whole-number age range from 0 to 120; maximum age must be at least minimum age or blank for unlimited.');
  if (![d.incomeRounding,d.liabilityRounding].every(v => ['paise','nearest-ten-ignore-paise'].includes(v))) errors.push('Select a supported income and liability rounding method.');
  if (!d.slabs.length || d.slabs.length > 50) errors.push('Configure between 1 and 50 complete tax slabs.');
  const slabs = [...d.slabs].sort((a,b) => a.from-b.from);
  if (slabs.length && slabs[0].from !== 0) errors.push('The first tax slab must start at zero.');
  slabs.forEach((s,i) => {
    if (!money(s.from) || (s.to !== null && (!money(s.to) || s.to <= s.from))) errors.push('Slab ' + (i+1) + ' needs non-negative amounts and an upper amount greater than its lower amount.');
    if (!rate(s.rate)) errors.push('Slab ' + (i+1) + ' tax rate must be between 0 and 100.');
    if (i > 0 && slabs[i-1].to !== s.from) errors.push('Tax slabs must join without gaps, overlaps or duplicate boundaries.');
    if ((i === slabs.length-1) !== (s.to === null)) errors.push('Only the final tax slab must have a blank upper limit (unlimited).');
  });
  d.surcharge.forEach((s,i) => {
    if (!money(s.threshold)) errors.push('Surcharge tier '+(i+1)+' needs a non-negative threshold.');
    if (!rate(s.rate)) errors.push('Surcharge tier '+(i+1)+' rate must be between 0 and 100.');
    if (i > 0 && (s.threshold <= d.surcharge[i-1].threshold || s.rate < d.surcharge[i-1].rate)) errors.push('Surcharge thresholds must strictly increase; rates must not decrease.');
  });
  if (d.surcharge.length > 20) errors.push('A maximum of 20 surcharge tiers is supported.');
  const ids = new Set<string>();
  for (const m of d.mappings) {
    const name = m.name || 'this salary component';
    if (!m.componentId || ids.has(m.componentId)) errors.push('Each salary component needs its original identity and one mapping only.');
    ids.add(m.componentId);
    if (m.available === false) errors.push(name + ' is inactive or no longer configured. Remove it from this draft or restore it in Salary Components; saved history is preserved.');
    if (!['taxable','exempt','partial','conditional'].includes(m.type)) errors.push('Select a reviewed taxability treatment for ' + name + '.');
    if (!m.legalReference?.trim()) errors.push('Legal reference is required for ' + name + '.');
    if (m.type && m.type !== 'taxable' && !m.conditions?.trim()) errors.push('Document the taxability conditions for ' + name + '.');
    if (m.type === 'partial' && (m.partialMode === 'amount' ? !money(m.exemptAmount) : !rate(m.taxablePercentage))) errors.push('Enter a valid ' + (m.partialMode === 'amount' ? 'annual exempt amount' : 'taxable percentage from 0 to 100') + ' for ' + name + '.');
  }
  const sources = d.sources.split('\n').map(s => s.trim()).filter(Boolean);
  if (!sources.length) errors.push('Official source URLs are required.');
  else if (sources.some(s => !officialSource.test(s))) errors.push('Enter HTTPS source URLs from the official Income Tax, Gazette or Union Budget websites, one per line.');
  if (!d.reviewNote.trim()) errors.push('Review note is required.');
  if (!d.employerReviewed) errors.push('Employer contribution review confirmation is required.');
  return [...new Set(errors)];
}

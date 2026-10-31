export interface PayCheck {
  employeeId: string;
  employeeCode?: string;
  annualCtc?: number | null;
  monthlyCtc?: number | null;
  payFrequency?: string;
  payrollStatus?: string;
  firstName: string;
  lastName: string;
  grossPay: number;
  employerContributions: number;
  deductions: number;
  netPay: number;
  tds?: number;
  tdsCalculationStatus?: string;
  tdsCalculationStatusLabel?: string;
  existingDeductions?: number;
  paymentStatus: string;
  pdfUrl?: string;
  period?: string;
  paymentDate?: string | null;
}
export interface PayrollRun {
  period: string;
  organizationName: string;
  status: 'Draft' | 'Submitted';
  version: number;
  calculatedAt: string;
  calculationVersion: string;
  inputHash: string;
  stale: boolean;
  warning?: string;
  validationIssues?: { employeeId: string; employeeCode?: string; firstName: string; lastName: string; stage: string; message: string }[];
  submittedAt?: string;
  paymentDate?: string | null;
  totalPayrollCost?: number | null;
  totalPayrollCostPeriod?: 'Monthly';
  employeeCompensation?: { employeeId: string; payFrequency: string; monthlyCtc: number | null }[];
  draftSaved?: boolean;
  checks: PayCheck[];
  historicalChecks?: PayCheck[];
  processedEmployeeIds?: string[];
  readOnly?: boolean;
  idempotencyKey?: string;
  totals: { employerContributions: number; deductions: number; netPay: number };
}

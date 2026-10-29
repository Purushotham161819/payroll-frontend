export const payFrequencies = ['Monthly'] as const;
export type PayFrequency = (typeof payFrequencies)[number];
export const defaultPayFrequency: PayFrequency = 'Monthly';
export interface CreateEmployee {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  hireDate: string;
  annualCtc: number;
  payFrequency?: PayFrequency;
}
export interface Employee extends Omit<CreateEmployee, 'email'> {
  status?: 'Active' | 'Terminated';
  rehireDate?: string;
  employmentHistory?: EmploymentPeriod[];
  _id: string;
  employeeId?: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmploymentPeriod {
  startDate: string; endDate?: string; terminationReason?: string;
  explanation?: string; recordedAt?: string; terminatedAt?: string;
}
export const terminationReasons = ['Voluntary Resignation', 'Involuntary Termination', 'Layoff / Reduction in Force', 'End of Contract', 'Retirement', 'Job Abandonment', 'Other'];

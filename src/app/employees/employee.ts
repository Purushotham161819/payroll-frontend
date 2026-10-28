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
  _id: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEmployee {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  hireDate: string;
  annualCtc: number;
}
export interface Employee extends Omit<CreateEmployee, "email"> {
  _id: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

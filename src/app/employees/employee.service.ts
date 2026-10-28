import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CreateEmployee, Employee } from './employee';
@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl + '/employees';
  getAll() {
    return this.http.get<Employee[]>(this.url);
  }
  update(id: string, employee: Partial<CreateEmployee>) {
    return this.http.patch<Employee>(this.url + '/' + encodeURIComponent(id), employee);
  }
  create(employee: CreateEmployee) {
    return this.http.post<Employee>(this.url, employee);
  }
}
export function apiError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Something went wrong. Please try again.';
  if (error.status === 409) return 'An employee with this email address already exists.';
  if (error.status === 400) {
    const message = error.error?.message;
    return Array.isArray(message)
      ? message.join(' · ')
      : typeof message === 'string'
        ? message
        : 'Please check the employee details.';
  }
  if (error.status === 0)
    return 'Cannot reach the server. Check your connection and that the backend is running.';
  return 'The server could not complete your request. Please try again later.';
}

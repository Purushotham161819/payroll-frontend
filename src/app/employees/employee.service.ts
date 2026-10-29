import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CreateEmployee, Employee } from './employee';
@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl + '/employees';
  remove(id:string){return this.http.delete<{message:string;deletedId:string}>(this.url+'/'+encodeURIComponent(id));}
  getAll() {
    return this.http.get<Employee[]>(this.url);
  }
  terminate(id: string, payload: {terminationDate: string; reason: string; explanation?: string}) {
    return this.http.patch<Employee>(this.url+'/'+encodeURIComponent(id)+'/terminate', payload);
  }
  rehire(id: string, payload: {rehireDate: string}) {
    return this.http.patch<Employee>(this.url+'/'+encodeURIComponent(id)+'/rehire', payload);
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

  if (error.status === 400 || error.status === 404 || error.status === 409) {
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

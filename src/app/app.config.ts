import { StatutoryDeductionsPage } from './statutory-deductions/statutory-deductions';
import { provideRouter } from '@angular/router';
import { EmployeeList } from './employees/employee-list';
import { Settings } from './settings/settings';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideHttpClient } from "@angular/common/http";
export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideHttpClient(), provideRouter([{ path: '', component: EmployeeList }, { path: 'settings', component: Settings }, { path: 'settings/statutory-deductions', component: StatutoryDeductionsPage }, { path: '**', redirectTo: '' }])],
};



import { UserManagement } from './users/users';
import { StatutoryDeductionsPage } from './statutory-deductions/statutory-deductions';
import { provideRouter, Routes } from '@angular/router';
import { EmployeeList } from './employees/employee-list';
import { Settings } from './settings/settings';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { anonymous, authenticated, administrator, authenticationInterceptor } from './auth/auth';
import { Login } from './auth/login';
import { WorkspaceLayout } from './app';
export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [anonymous] },
  { path: '', component: WorkspaceLayout, canActivateChild: [authenticated], children: [
    { path: '', component: EmployeeList },
    { path: 'settings', component: Settings },
    { path: 'settings/statutory-deductions', component: StatutoryDeductionsPage },
    { path: 'users', component: UserManagement, canActivate: [administrator] },
    { path: '**', redirectTo: '' },
  ] },
];
export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideHttpClient(withInterceptors([authenticationInterceptor])), provideRouter(routes)],
};

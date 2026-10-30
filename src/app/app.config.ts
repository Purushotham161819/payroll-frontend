import { EmployeeProfile } from './employees/employee-profile';
import { PlatformPortal } from './platform/platform';
import { ChangePassword } from './auth/change-password';
import { superAdministrator } from './auth/auth';
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
  { path: 'change-password', component: ChangePassword, canActivate: [authenticated] },
  { path: 'super-admin', component: WorkspaceLayout, canActivate: [superAdministrator], canActivateChild: [authenticated, superAdministrator], children: [
    { path: '', component: PlatformPortal },
    { path: 'organizations', component: PlatformPortal },
    { path: 'organizations/:org', component: PlatformPortal },
  ] },
  { path: '', component: WorkspaceLayout, canActivateChild: [authenticated], children: [
    { path: '', component: EmployeeList },
    { path: 'payroll', loadChildren: () => import('./features/run-payroll/run-payroll.routes').then(m => m.RUN_PAYROLL_ROUTES) },
    { path: 'employees/:id', component: EmployeeProfile },
    { path: 'settings', component: Settings },
    { path: 'settings/statutory-deductions', component: StatutoryDeductionsPage },
    { path: 'users', component: UserManagement, canActivate: [administrator] },
    { path: '**', redirectTo: '' },
  ] },
];
export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideHttpClient(withInterceptors([authenticationInterceptor])), provideRouter(routes)],
};

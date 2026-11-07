import { notificationInterceptor } from './shared/notification-interceptor';
import { registerLocaleData } from '@angular/common';
import localeIn from '@angular/common/locales/en-IN';
import { EmployeeProfile } from './employees/employee-profile';
import { PlatformPortal } from './platform/platform';
import { ChangePassword } from './auth/change-password';
import { superAdministrator } from './auth/auth';
import { UserManagement } from './users/users';
import { StatutoryDeductionsPage } from './statutory-deductions/statutory-deductions';
import { provideRouter, Routes } from '@angular/router';
import { EmployeeList } from './employees/employee-list';
import { Settings } from './settings/settings';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { anonymous, authenticated, administrator, authenticationInterceptor } from './auth/auth';
import { Login } from './auth/login';
import { WorkspaceLayout } from './app';
export const routes: Routes = [
  { path: 'forgot-password', loadComponent: () => import('./auth/forgot-password').then(m => m.ForgotPassword) },
  { path: 'reset-password', loadComponent: () => import('./auth/set-password').then(m => m.SetPassword) },
  { path: 'set-password', loadComponent: () => import('./auth/set-password').then(m => m.SetPassword) },
  { path: 'login', component: Login, canActivate: [anonymous] },
  { path: 'change-password', component: ChangePassword, canActivate: [authenticated] },
  { path: 'super-admin', component: WorkspaceLayout, canActivate: [superAdministrator], canActivateChild: [authenticated, superAdministrator], children: [
    { path: '', component: PlatformPortal },
    { path: 'organizations', component: PlatformPortal },
    { path: 'organizations/:org', component: PlatformPortal },
  ] },
  { path: '', component: WorkspaceLayout, canActivateChild: [authenticated], children: [
    { path: '', component: EmployeeList },
    { path: 'reports', loadComponent: () => import('./reports/reports').then(m => m.Reports) },
    { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard) },
    { path: 'contractors', loadComponent: () => import('./contractors/contractor-directory').then(m => m.ContractorDirectory) },
    { path: 'contractors/:id', loadComponent: () => import('./contractors/contractor-profile').then(m => m.ContractorProfile) },
    { path: 'settings/contractors', canActivate: [administrator], loadComponent: () => import('./contractors/contractor-settings').then(m => m.ContractorSettings) },
    { path: 'payroll', loadChildren: () => import('./features/run-payroll/run-payroll.routes').then(m => m.RUN_PAYROLL_ROUTES) },
    { path: 'employees/:id', component: EmployeeProfile, canDeactivate: [(component: EmployeeProfile) => component.canLeave()] },
    { path: 'settings', component: Settings },
    { path: 'settings/statutory-deductions', component: StatutoryDeductionsPage },
    { path: 'settings/tax-configuration', canDeactivate: [(component: any) => component.canLeave()], loadComponent: () => import('./features/tax-management/tax-configuration').then(m => m.TaxConfiguration), canActivate: [administrator] },
    { path: 'settings/organization', canDeactivate: [(component: any) => component.canLeave()], loadComponent: () => import('./settings/organization-settings').then(m => m.OrganizationSettings), canActivate: [administrator] },
    { path: 'users', component: UserManagement, canActivate: [administrator] },
    { path: '**', redirectTo: '' },
  ] },
];
// Apply Indian grouping to Angular number/currency pipes throughout the UI.
registerLocaleData(localeIn);
export const appConfig: ApplicationConfig = {
  providers: [{ provide: LOCALE_ID, useValue: 'en-IN' }, provideBrowserGlobalErrorListeners(), provideHttpClient(withInterceptors([authenticationInterceptor, notificationInterceptor])), provideRouter(routes)],
};

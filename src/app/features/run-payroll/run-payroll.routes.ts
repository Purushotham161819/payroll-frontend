import type { Routes } from '@angular/router';

// Authentication remains inherited from the workspace route. URLs stay stable.
export const RUN_PAYROLL_ROUTES: Routes = [
  { path: 'run', loadComponent: () => import('./run-payroll.component').then(m => m.RunPayroll) },
  { path: 'submitted/:period', loadComponent: () => import('./run-payroll.component').then(m => m.RunPayroll) },
];

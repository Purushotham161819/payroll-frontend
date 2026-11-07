import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { NotificationService } from './notification.service';
export const notificationInterceptor: HttpInterceptorFn = (request, next) => {
  const notifications = inject(NotificationService);
  return next(request).pipe(
    catchError((error: unknown) => {
      // RunPayrollService consumes this structured 409 as a reviewable preview.
      // Keep employee issues in the payroll table rather than raising a failure popup.
      const preview = error instanceof HttpErrorResponse ? error.error?.payrollPreview : undefined;
      const payrollReview =
        request.method === 'POST' &&
        request.url === environment.apiUrl + '/payroll/runs/preview' &&
        error instanceof HttpErrorResponse && error.status === 409 &&
        error.error?.code === 'PAYROLL_EMPLOYEE_REVIEW_REQUIRED' &&
        preview?.period === (request.body as { period?: unknown } | null)?.period &&
        Array.isArray(preview?.checks) &&
        Array.isArray(preview?.validationIssues) && preview.validationIssues.length > 0;
      // Session probes and token inspection are state checks, not completed actions.
      if (
        !payrollReview &&
        request.url.startsWith(environment.apiUrl + '/') &&
        !/\/auth\/(me|invitation\/inspect|reset-password\/inspect)(?:$|\?)/.test(request.url)
      ) {
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        const message =
          status === 0
            ? 'Unable to reach PayStream. Check your connection and try again.'
            : status === 401
              ? 'Unable to authenticate. Check your sign-in details or sign in again.'
              : status === 403
                ? 'You do not have permission to complete this action.'
                : status === 429
                  ? 'Too many attempts. Please wait and try again.'
                  : status === 400 || status === 409
                    ? 'Unable to complete this action. Review the highlighted fields and details on the page.'
                    : 'Unable to complete the request. Please try again.';
        notifications.error(message);
      }
      return throwError(() => error);
    }),
  );
};

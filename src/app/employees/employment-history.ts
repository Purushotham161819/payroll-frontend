import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Employee } from './employee';
import { PsDatePipe, PsStatusBadge } from '../shared/ui';
@Component({
  selector: 'app-employment-history',
  host: { '[class.embedded]': 'embedded()' },
  imports: [DatePipe, PsDatePipe, PsStatusBadge],
  template: ` <div class="history-heading">
      @if (!embedded()) {
        <h2>Employment History</h2>
      }
      <ps-status-badge [status]="employee().status || 'Active'" />
    </div>
    <p>Original hire date: {{ employee().hireDate | psDate: 'UTC' }}</p>
    @if (employee().rehireDate) {
      <p>Latest rehire: {{ employee().rehireDate | psDate: 'UTC' }}</p>
    }
    @if (!employee().employmentHistory?.length) {
      <p role="status">No employment history records have been recorded.</p>
    }
    @if (!embedded() || employee().employmentHistory?.length) {
      <ol class="timeline">
        @for (period of periods(); track $index) {
          <li>
            <article>
              <h3>Employment period {{ $index + 1 }}</h3>
              <p class="dates">
                {{ period.startDate | psDate: 'UTC' }} &ndash;
                {{
                  period.endDate
                    ? (period.endDate | psDate: 'UTC')
                    : employee().status === 'Terminated'
                      ? 'End date not recorded'
                      : 'Present'
                }}
              </p>
              <dl>
                <dt>Status</dt>
                <dd><ps-status-badge [status]="period.endDate || employee().status === 'Terminated' ? 'Terminated' : 'Active'" /></dd>
                @if (period.terminationReason) {
                  <dt>Termination reason</dt>
                  <dd>{{ period.terminationReason }}</dd>
                }
                @if (period.explanation) {
                  <dt>Explanation</dt>
                  <dd>{{ period.explanation }}</dd>
                }
                @if (period.recordedAt) {
                  <dt>Period recorded</dt>
                  <dd>{{ period.recordedAt | psDate }} {{ period.recordedAt | date: 'mediumTime' }}</dd>
                }
                @if (period.terminatedAt) {
                  <dt>Termination recorded</dt>
                  <dd>{{ period.terminatedAt | psDate }} {{ period.terminatedAt | date: 'mediumTime' }}</dd>
                }
              </dl>
            </article>
          </li>
        }
      </ol>
    }`,
  styleUrl: './employment-history.css',
})
export class EmploymentHistory {
  readonly employee = input.required<Employee>();
  readonly embedded = input(false);
  periods() {
    return this.employee().employmentHistory?.length
      ? this.employee().employmentHistory!
      : [
          {
            startDate: this.employee().hireDate,
            endDate: undefined,
            terminationReason: undefined,
            explanation: undefined,
            recordedAt: undefined,
            terminatedAt: undefined,
          },
        ];
  }
}

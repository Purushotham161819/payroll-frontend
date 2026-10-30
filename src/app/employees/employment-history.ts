import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Employee } from './employee';
@Component({
  selector: 'app-employment-history',
  imports: [DatePipe],
  template: ` <div class="history-heading">
      <h2>Employment History</h2>
      <span>{{ employee().status || 'Active' }}</span>
    </div>
    <p>Original hire date: {{ employee().hireDate | date: 'longDate' : 'UTC' }}</p>
    @if (employee().rehireDate) {
      <p>Latest rehire: {{ employee().rehireDate | date: 'longDate' : 'UTC' }}</p>
    }
    <ol class="timeline">
      @for (period of periods(); track $index) {
        <li>
          <article>
            <h3>Employment period {{ $index + 1 }}</h3>
            <p class="dates">
              {{ period.startDate | date: 'longDate' : 'UTC' }} &ndash;
              {{
                period.endDate
                  ? (period.endDate | date: 'longDate' : 'UTC')
                  : employee().status === 'Terminated'
                    ? 'End date not recorded'
                    : 'Present'
              }}
            </p>
            <dl>
              <dt>Status</dt>
              <dd>
                {{ period.endDate || employee().status === 'Terminated' ? 'Terminated' : 'Active' }}
              </dd>
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
                <dd>{{ period.recordedAt | date: 'medium' }}</dd>
              }
              @if (period.terminatedAt) {
                <dt>Termination recorded</dt>
                <dd>{{ period.terminatedAt | date: 'medium' }}</dd>
              }
            </dl>
          </article>
        </li>
      }
    </ol>`,
  styles: [
    `
      .history-heading {
        display: flex;
        gap: 16px;
        align-items: center;
        justify-content: space-between;
      }
      .history-heading h2 {
        font-size: 18px;
      }
      .history-heading span {
        background: #edf5ef;
        color: #20583f;
        border-radius: 16px;
        padding: 5px 12px;
        font-size: 13px;
      }
      .timeline {
        list-style: none;
        padding: 0;
        display: grid;
        gap: 16px;
      }
      article {
        padding: 20px;
        border: 1px solid #dce6df;
        border-left: 3px solid #50846a;
        border-radius: 10px;
        background: white;
      }
      h3 {
        font-size: 15px;
        margin: 0 0 10px;
      }
      .dates {
        font-weight: 500;
      }
      p,
      dd {
        font-size: 14px;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }
      dl {
        display: grid;
        grid-template-columns: minmax(120px, 180px) 1fr;
        gap: 10px;
        margin-bottom: 0;
      }
      dt {
        color: #64746a;
        font-size: 13px;
      }
      dd {
        margin: 0;
      }
      @media (max-width: 500px) {
        dl {
          grid-template-columns: 1fr;
          gap: 6px;
        }
        dd {
          margin-bottom: 8px;
        }
      }
    `,
  ],
})
export class EmploymentHistory {
  readonly employee = input.required<Employee>();
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

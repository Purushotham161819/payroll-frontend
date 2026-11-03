import { Component, input } from '@angular/core';
import { PsIcon } from '../../../shared/ui';
@Component({
  selector: 'app-payroll-guide',
  imports: [PsIcon],
  template: `<section class="guide" aria-labelledby="guide-title">
    <header>
      <ps-icon action="info" />
      <h2 id="guide-title">Payroll Calculation Guide</h2>
      <small>{{
        submitted() ? 'This submission' : 'Selected, eligible, unprocessed employees only'
      }}</small>
    </header>
    <dl>
      <div>
        <dt>Payroll Cost</dt>
        <dd>Monthly CTC</dd>
      </div>
      <div>
        <dt>Employer Contributions</dt>
        <dd>Monthly ER_EPF + ER_EPS + ER_ESI</dd>
      </div>
      <div>
        <dt>Employee Deductions</dt>
        <dd>Employee-side deductions only</dd>
      </div>
      <div>
        <dt>NET Pay</dt>
        <dd>Final monthly payable amount</dd>
      </div>
      <div>
        <dt>Historical Payroll</dt>
        <dd>Excluded from new draft totals</dd>
      </div>
    </dl>
  </section>`,
  styles: [
    `
      :host {
        display: block;
      }
      .guide {
        margin: var(--space-4) 0;
        padding: var(--space-4);
        border: var(--border-width) solid var(--border-subtle);
        border-radius: var(--radius-xl);
        background: var(--surface-card);
        color: var(--ink);
      }
      header {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
      }
      h2 {
        font: var(--type-label);
        margin: 0;
      }
      small {
        font: var(--type-helper);
        color: var(--ink-muted);
      }
      dl {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-3) var(--space-6);
        margin: var(--space-3) 0 0;
      }
      dt {
        font: var(--type-helper);
        font-weight: var(--font-weight-semibold);
      }
      dd {
        font: var(--type-helper);
        color: var(--ink-muted);
        margin: var(--space-1) 0 0;
      }
      ps-icon {
        color: var(--ink-subtle);
      }
    `,
  ],
})
export class PayrollGuide {
  readonly submitted = input(false);
}

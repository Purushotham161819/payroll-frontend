import { booleanAttribute, Component, input } from '@angular/core';
import { PsCard } from './ps-card';
import { PsInrPipe } from './pipes/ps-inr.pipe';
/** Opt-in KPI presentation using the approved Run Payroll card typography. */
@Component({
  selector: 'ps-kpi-card',
  imports: [PsCard, PsInrPipe],
  host: { '[class.compact]': 'compact()' },
  template: `<ps-card [compact]="compact()" role="region" [attr.aria-label]="label()"
    ><h2>{{ label() }}</h2>
    <strong>{{ value() | psInr }}</strong></ps-card
  >`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }
      :host(.compact) {
        width: max-content;
        min-width: var(--select-filter-min);
        max-width: 100%;
      }
      :host(.compact) h2 {
        margin-bottom: var(--space-2);
      }
      h2 {
        margin: 0 0 var(--space-3);
        font: var(--type-label);
        color: var(--ink-muted);
      }
      strong {
        display: block;
        font: var(--type-card-title);
        font-variant-numeric: tabular-nums;
        overflow-wrap: anywhere;
      }
    `,
  ],
})
export class PsKpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly compact = input(false, { transform: booleanAttribute });
}

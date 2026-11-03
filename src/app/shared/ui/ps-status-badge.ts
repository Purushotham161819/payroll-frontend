import { Component, computed, input } from '@angular/core';

export type PsStatusTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';
// Approved Part C map only. Unknown values retain their raw label and neutral tone.
export const APPROVED_STATUS_TONES: Readonly<Record<string, PsStatusTone>> = Object.freeze({
  active: 'success', approved: 'success', paid: 'success', completed: 'success', processed: 'success',
  submitted: 'info', 'in review': 'info', processing: 'info', scheduled: 'info',
  pending: 'warning', 'on hold': 'warning', 'expiring soon': 'warning',
  rejected: 'danger', expired: 'danger', terminated: 'danger', failed: 'danger', overdue: 'danger',
  inactive: 'neutral', draft: 'neutral', archived: 'neutral', cancelled: 'neutral',
});
@Component({
  selector: 'ps-status-badge', standalone: true,
  template: '{{label()}}', host: { '[attr.data-tone]': 'tone()' },
  styleUrl: './ps-status-badge.scss',
})
export class PsStatusBadge {
  readonly status = input.required<string>();
  readonly tone = computed(() => Object.hasOwn(APPROVED_STATUS_TONES, this.status().toLowerCase())
    ? APPROVED_STATUS_TONES[this.status().toLowerCase()] : 'neutral');
  readonly label = computed(() => Object.hasOwn(APPROVED_STATUS_TONES, this.status().toLowerCase())
    ? this.status().toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : this.status());
}

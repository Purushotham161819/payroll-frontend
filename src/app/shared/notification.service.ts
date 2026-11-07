import { Injectable, inject, signal, WritableSignal } from '@angular/core';
export type NotificationKind = 'success' | 'error' | 'warning' | 'information';
export interface AppNotification {
  kind: NotificationKind;
  title: string;
  message: string;
  source?: object;
}
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly state = signal<AppNotification | null>(null);
  readonly current = this.state.asReadonly();
  private pending: AppNotification[] = [];
  success(titleOrMessage: string, description?: string, source?: object) {
    this.show({
      kind: 'success',
      title: description ? titleOrMessage : 'Success!',
      message: description ?? titleOrMessage,
      source,
    });
  }
  error(message: string) {
    this.show({ kind: 'error', title: 'Something went wrong.', message });
  }
  warning(message: string) {
    this.show({ kind: 'warning', title: 'Attention.', message });
  }
  information(message: string, source?: object) {
    this.show({ kind: 'information', title: 'Information.', message, source });
  }
  private show(value: AppNotification) {
    if (!value.message.trim()) return;
    const current = this.state();
    if (current?.kind === value.kind && current.message === value.message) return;
    if (this.pending.some((item) => item.kind === value.kind && item.message === value.message))
      return;
    if (!current || value.kind === 'error' || (value.source && current.source === value.source)) {
      this.state.set(value);
      return;
    }
    const index = value.source
      ? this.pending.findIndex((item) => item.source === value.source)
      : -1;
    if (index >= 0) this.pending[index] = value;
    else if (this.pending.length < 20) this.pending.push(value);
  }
  dismiss() {
    this.state.set(this.pending.shift() ?? null);
  }
}
// Preserve existing local feedback state/tests while publishing completion events.
// Publish at the existing successful operation callback, never from HTTP 2xx alone.
export function completionSignal(): WritableSignal<string> {
  const state = signal('');
  const notifications = inject(NotificationService);
  const source = {};
  const set = state.set.bind(state);
  state.set = (value: string) => {
    set(value);
    if (value) {
      if (/copied to the editor|while you were away|If the account is eligible/i.test(value))
        notifications.information(value, source);
      else notifications.success(value, undefined, source);
    }
  };
  state.update = (update) => state.set(update(state()));
  return state;
}

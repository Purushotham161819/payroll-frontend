import { DATE_PIPE_DEFAULT_OPTIONS, formatDate } from '@angular/common';
import { inject, Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'psDate', standalone: true })
export class PsDatePipe implements PipeTransform {
  private readonly defaults = inject(DATE_PIPE_DEFAULT_OPTIONS, { optional: true });

  transform(value: string | number | Date | null | undefined, timezone?: string): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) return '—';
    try {
      if (typeof value === 'string') {
        const calendar = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);
        if (calendar) {
          const [, year, month, day] = calendar;
          const date = this.calendarDate(+year, +month, day ? +day : 1);
          // Civil dates/periods are not instants: never shift them across timezones.
          if (!date) return '—';
          // Format the month on a modern UTC anchor: historical local offsets can
          // contain seconds, which Angular's timezone conversion rounds to minutes.
          const label = formatDate(new Date(Date.UTC(2000, +month - 1, 1)), 'MMM', 'en-US', 'UTC');
          return `${day ? day + ' ' : ''}${label} ${year}`;
        }
        const timestamp = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-](\d{2}):?(\d{2}))?$/.exec(value);
        if (!timestamp || !this.calendarDate(+timestamp[1], +timestamp[2], +timestamp[3]) ||
          +timestamp[4] > 23 || +timestamp[5] > 59 || +(timestamp[6] ?? 0) > 59 ||
          +(timestamp[7] ?? 0) > 23 || +(timestamp[8] ?? 0) > 59) return '—';
      }
      if (typeof value === 'number' && !Number.isFinite(new Date(value).getTime())) return '—';
      if (value instanceof Date && !Number.isFinite(value.getTime())) return '—';
      return formatDate(value, 'dd MMM yyyy', 'en-US', timezone ?? this.defaults?.timezone);
    } catch {
      return '—';
    }
  }

  private calendarDate(year: number, month: number, day: number): Date | null {
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    return year >= 1 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day ? date : null;
  }
}

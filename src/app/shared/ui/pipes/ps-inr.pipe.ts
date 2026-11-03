import { Pipe, PipeTransform } from '@angular/core';
import { formatInr, isCurrencyNumber } from './inr-format';

@Pipe({ name: 'psInr', standalone: true })
export class PsInrPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return isCurrencyNumber(value) ? formatInr(value) : '—';
  }
}

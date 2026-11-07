import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PsButton } from './ps-button';
import { PsFormField, PsFieldControl } from './ps-form-field';
import { PsSelect } from './ps-select';
@Component({
  selector: 'ps-pagination',
  imports: [FormsModule, PsButton, PsFormField, PsFieldControl, PsSelect],
  templateUrl: './ps-pagination.html',
  styleUrl: './ps-pagination.scss',
})
export class PsPagination {
  readonly totalRecords = input.required<number>();
  readonly currentPage = input(1);
  readonly pageSize = input(10);
  readonly pageSizeOptions = input<readonly number[]>([10, 25, 50]);
  readonly disabled = input(false);
  readonly recordLabel = input('records');
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(Math.max(0, this.totalRecords()) / Math.max(1, this.pageSize()))),
  );
  readonly page = computed(() => Math.max(1, Math.min(this.pageCount(), this.currentPage())));
  readonly first = computed(() =>
    this.totalRecords() > 0 ? (this.page() - 1) * this.pageSize() + 1 : 0,
  );
  readonly last = computed(() => Math.min(this.totalRecords(), this.page() * this.pageSize()));
  readonly sizes = computed(() =>
    [...new Set(this.pageSizeOptions())]
      .filter((n) => Number.isSafeInteger(n) && n > 0)
      .map((n) => ({ value: String(n), label: String(n) })),
  );
  readonly pages = computed(() => {
    const count = this.pageCount(),
      current = this.page();
    const selected = Array.from({ length: count <= 7 ? count : 0 }, (_, i) => i + 1);
    if (count > 7)
      selected.push(
        1,
        ...[current - 1, current, current + 1].filter((n) => n > 1 && n < count),
        count,
      );
    const result: (number | string)[] = [];
    for (const n of [...new Set(selected)].sort((a, b) => a - b)) {
      if (typeof result.at(-1) === 'number' && n - Number(result.at(-1)) > 1) result.push('...');
      result.push(n);
    }
    return result;
  });
  go(value: number | string) {
    if (
      typeof value === 'number' &&
      !this.disabled() &&
      value >= 1 &&
      value <= this.pageCount() &&
      value !== this.page()
    )
      this.pageChange.emit(value);
  }
  resize(value: string) {
    const size = Number(value);
    if (!this.disabled() && size !== this.pageSize() && this.pageSizeOptions().includes(size))
      this.pageSizeChange.emit(size);
  }
}

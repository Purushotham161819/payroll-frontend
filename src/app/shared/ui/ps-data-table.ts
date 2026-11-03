import { booleanAttribute, Component, input, ElementRef, inject } from '@angular/core';

@Component({
  selector: 'ps-data-table', standalone: true,
  host: { '[class.natural-width]': 'naturalWidth()', '[attr.aria-busy]': 'loading() ? "true" : null' },
  template: '<div class="toolbar"><ng-content select="[tableToolbar]" /></div>@if(loading()){<p role="status">{{loadingLabel()}}</p><div aria-hidden="true">@for(row of skeletonRows;track row){<div class="skeleton-row"></div>}</div>}@else if(empty()){<p role="status">{{emptyLabel()}}</p>}<div class="scroll" role="region" [attr.aria-label]="label()" tabindex="0" [hidden]="loading() || empty()"><ng-content /></div><footer><ng-content select="[tableFooter]" /></footer>',
  styleUrl: './ps-data-table.scss',
})
export class PsDataTable {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Native scroll region for callers preserving an existing scroll position. */
  get nativeElement(): HTMLElement { return this.host.nativeElement.querySelector<HTMLElement>('.scroll')!; }

  readonly skeletonRows = Array.from({ length: 8 }, (_, index) => index);
  readonly label = input.required<string>();
  readonly naturalWidth = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly empty = input(false, { transform: booleanAttribute });
  readonly loadingLabel = input('Loading records…');
  readonly emptyLabel = input('No records available.');
}

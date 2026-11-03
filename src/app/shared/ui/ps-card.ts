import { booleanAttribute, Component, contentChild, Directive, input } from '@angular/core';
import { PsDataTable } from './ps-data-table';

@Directive({ selector: '[cardTitle]', standalone: true }) export class PsCardTitle {}
@Directive({ selector: '[cardSubtitle]', standalone: true }) export class PsCardSubtitle {}
@Directive({ selector: '[cardActions]', standalone: true }) export class PsCardActions {}
@Directive({ selector: '[cardFooter]', standalone: true }) export class PsCardFooter {}

@Component({
  selector: 'ps-card', standalone: true,
  host: { '[attr.aria-busy]': 'loading() ? "true" : null', '[class.compact]': 'compact()' },
  template: `@if(titleSlot() || actionsSlot()) {<header><div>@if(titleSlot()){<h2><ng-content select="[cardTitle]" /></h2>}@if(subtitleSlot()){<div class="subtitle"><ng-content select="[cardSubtitle]" /></div>}</div><div class="actions"><ng-content select="[cardActions]" /></div></header>}
    <div class="body" [class.table-body]="!!table()">@if(loading()){<p role="status">{{loadingLabel()}}</p>}@else if(empty()){<p role="status">{{emptyLabel()}}</p>}<div [hidden]="loading() || empty()"><ng-content /></div></div>
    @if(footerSlot()){<footer><ng-content select="[cardFooter]" /></footer>}`,
  styles: [':host{display:block;color:var(--ink);background:var(--surface-card);border:var(--border-width) solid var(--border-card);border-radius:var(--radius-xl);box-shadow:var(--shadow-card);font:var(--type-body)}:host(.compact){--card-padding:var(--space-3)}header{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-4);padding:var(--card-padding) var(--card-padding) 0}h2{margin:0;font:var(--type-card-title)}.subtitle{font:var(--type-card-subtitle);color:var(--ink-muted);margin-top:var(--badge-padding-block)}.actions{display:flex;gap:var(--space-2)}.body{padding:var(--card-padding)}.body.table-body{padding:0}p{margin:0}footer{display:flex;justify-content:flex-end;gap:var(--space-3);padding:var(--space-4) var(--space-6);border-top:var(--border-width) solid var(--border-subtle)}'],
})
export class PsCard {
  readonly compact = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly empty = input(false, { transform: booleanAttribute });
  readonly loadingLabel = input('Loading…');
  readonly emptyLabel = input('No records available.');
  readonly titleSlot = contentChild(PsCardTitle);
  readonly subtitleSlot = contentChild(PsCardSubtitle);
  readonly actionsSlot = contentChild(PsCardActions);
  readonly footerSlot = contentChild(PsCardFooter);
  readonly table = contentChild(PsDataTable, { descendants: true });
}

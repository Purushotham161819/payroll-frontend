import { Component, input } from '@angular/core';

@Component({
  selector: 'ps-page-header', standalone: true,
  template: '<div class="heading"><ng-content select="[breadcrumbs]" />@if(eyebrow()){<p class="eyebrow">{{eyebrow()}}</p>}<h1>{{title()}}</h1>@if(subtitle()){<p class="subtitle">{{subtitle()}}</p>}</div><div class="actions"><ng-content select="[pageActions]" /></div>',
  styleUrl: './ps-page-header.scss',
})
export class PsPageHeader {
  readonly title = input.required<string>();
  readonly eyebrow = input('');
  readonly subtitle = input('');
}

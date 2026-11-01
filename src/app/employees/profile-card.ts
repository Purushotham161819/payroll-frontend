import { Component, input } from '@angular/core';
@Component({
  selector: 'app-profile-card',
  template: `<section [attr.aria-label]="heading()" [class.compact]="compact()">
    <header>
      <h2>{{ heading() }}</h2>
      <ng-content select="[card-actions]" />
    </header>
    <ng-content />
  </section>`,
  styles: [
    `
      :host {
        display: flex;
        min-width: 0;
        background: white;
        border: 1px solid #dce6df;
        border-radius: 12px;
        box-shadow: 0 2px 8px #1c3b2910;
      }
      section {
        width: 100%;
        box-sizing: border-box;
        padding: 22px;
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 20px;
      }
      section.compact {
        padding: 16px 22px;
      }
      section.compact header {
        margin-bottom: 10px;
      }
      h2 {
        font-size: 15px;
        font-weight: 650;
        margin: 0;
        color: #294d3b;
      }
    `,
  ],
})
export class ProfileCard {
  readonly heading = input.required<string>();
  readonly compact = input(false);
}

import {AfterViewInit,Component,ElementRef,OnDestroy,inject,input,output,viewChild} from '@angular/core';
import {DOCUMENT} from '@angular/common';
@Component({selector:'app-delete-confirmation',template:`
<dialog #dialog aria-labelledby="delete-title" aria-describedby="delete-description" (cancel)="cancel($event)">
<h2 id="delete-title">{{title()}}</h2><p id="delete-description">{{description()}}</p>
@if(error()){<div class="notice error" role="alert">{{error()}}</div>}
@if(busy()){<p role="status">Deleting…</p>}
<footer><button type="button" class="secondary" (click)="cancel()" [disabled]="busy()" autofocus>Cancel</button><button type="button" class="primary" (click)="confirmed.emit()" [disabled]="busy()">{{busy()?'Deleting…':'Confirm Delete'}}</button></footer>
</dialog>`,styles:[`dialog{width:min(480px,calc(100% - 28px));max-height:90dvh;overflow:auto;background:white;border:1px solid #dce4da;border-radius:12px;padding:26px;color:#20372c;box-shadow:0 20px 80px #0003}dialog::backdrop{background:#102c2a99}h2{font-size:20px;margin:0 0 16px}p{font-size:13px;line-height:1.6;color:#617067;overflow-wrap:anywhere}footer{display:flex;justify-content:flex-end;gap:10px;margin-top:24px;flex-wrap:wrap}@media(max-width:600px){dialog{padding:18px}}` ]})
export class DeleteConfirmation implements AfterViewInit,OnDestroy {
 title=input.required<string>();description=input.required<string>();busy=input(false);error=input('');fallbackFocusId=input('');confirmed=output<void>();cancelled=output<void>();
 private dialog=viewChild.required<ElementRef<HTMLDialogElement>>('dialog');private document=inject(DOCUMENT);private focus:HTMLElement|null=null;private overflow='';
 ngAfterViewInit(){this.focus=this.document.activeElement as HTMLElement|null;this.overflow=this.document.body.style.overflow;this.document.body.style.overflow='hidden';this.dialog().nativeElement.showModal();}
 ngOnDestroy(){this.dialog().nativeElement.close();this.document.body.style.overflow=this.overflow;queueMicrotask(()=>{const target=this.focus?.isConnected?this.focus:this.document.getElementById(this.fallbackFocusId());target?.focus();});}
 cancel(event?:Event){event?.preventDefault();if(!this.busy())this.cancelled.emit();}
}

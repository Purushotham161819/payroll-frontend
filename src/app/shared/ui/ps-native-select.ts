import { ApplicationRef, ComponentRef, createComponent, Directive, DoCheck, effect, ElementRef, EnvironmentInjector, HostListener, inject, OnDestroy, Renderer2, signal } from '@angular/core';
import { PsSelect, PsSelectOption } from './ps-select';

/** Keep the original native form/value accessor and closed field; reuse PsSelect's panel. */
@Directive({selector:'select[psSelectMenu]',standalone:true})
export class PsNativeSelect implements DoCheck, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly native = this.element.tagName === 'SELECT' ? this.element as HTMLSelectElement : null;
  private readonly app = inject(ApplicationRef);
  private readonly environment = inject(EnvironmentInjector);
  private readonly renderer = inject(Renderer2);
  private readonly owner = signal<ComponentRef<PsSelect> | null>(null);
  private observer?: MutationObserver;
  private optionsKey = '';
  private label = '';
  private readonly original = new Map<string,string | null>();

  constructor() {
    if(this.eligible()) {
      for(const key of ['aria-haspopup','aria-expanded','aria-controls','aria-activedescendant','data-ps-menu']) this.original.set(key,this.native!.getAttribute(key));
      this.renderer.setAttribute(this.native,'data-ps-menu','enhanced');
      this.observer = new MutationObserver(()=>this.sync());
      this.observer.observe(this.native!,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','selected','value','label','size','multiple']});
    }
    effect(()=>{
      if(!this.native || !this.original.size) return;
      const panel=this.owner()?.instance,open=panel?.opened() ?? false;
      this.renderer.setAttribute(this.native,'aria-haspopup','listbox');
      this.renderer.setAttribute(this.native,'aria-expanded',String(open));
      if(open && panel){
        this.renderer.setAttribute(this.native,'aria-controls',panel.listId);
        if(panel.active()>=0) this.renderer.setAttribute(this.native,'aria-activedescendant',panel.optionId(panel.active()));
        else this.renderer.removeAttribute(this.native,'aria-activedescendant');
      }else{
        this.renderer.removeAttribute(this.native,'aria-controls');this.renderer.removeAttribute(this.native,'aria-activedescendant');
      }
    });
  }
  private eligible(): boolean { return !!this.native && !this.native.multiple && this.native.size<=1 && !this.native.querySelector('optgroup'); }
  private disabled(): boolean { return !this.native || this.native.matches(':disabled'); }
  private name(): string {
    if(!this.native) return '';
    if(this.native.getAttribute('aria-label')) return this.native.getAttribute('aria-label')!;
    const ids=this.native.getAttribute('aria-labelledby')?.split(/\s+/);
    const labels=ids ? ids.map(id=>this.native!.ownerDocument.getElementById(id)).filter(Boolean) : Array.from(this.native.labels ?? []);
    return labels.map(label=>{const copy=label!.cloneNode(true) as HTMLElement;copy.querySelectorAll('[aria-hidden=true],button,select,input,textarea,ps-select').forEach(el=>el.remove());return copy.textContent;}).join(' ').replace(/\s+/g,' ').trim();
  }
  private panel(): PsSelect {
    if(!this.owner()) {
      // A detached controller view renders only its existing CDK portal into the overlay.
      // It adds no trigger, wrapper, hidden form field or duplicate accessible control.
      const ref=createComponent(PsSelect,{environmentInjector:this.environment});
      ref.setInput('origin',this.native);
      ref.instance.registerOnChange(value=>this.commit(value));
      this.app.attachView(ref.hostView);this.owner.set(ref);this.sync();ref.changeDetectorRef.detectChanges();
    }
    return this.owner()!.instance;
  }
  private sync(): void {
    const ref=this.owner();if(!ref || !this.native) return;
    if(!this.eligible()){ref.instance.close(false);return;}
    const options:PsSelectOption[]=Array.from(this.native.options).map(o=>({value:o.value,label:o.label,disabled:o.disabled}));
    const key=JSON.stringify(options);if(key!==this.optionsKey){this.optionsKey=key;ref.setInput('options',options);}
    const name=this.name();if(name!==this.label){this.label=name;ref.setInput('ariaLabel',name);}
    if(ref.instance.value()!==this.native.value) ref.instance.writeValue(this.native.value);
    if(ref.instance.formDisabled()!==this.disabled()) ref.instance.setDisabledState(this.disabled());
  }
  /** Dispatch the original native events so Angular decodes [ngValue], null and objects. */
  commit(value:string): void {
    if(!this.eligible() || this.disabled()) return;
    const option=Array.from(this.native!.options).find(o=>o.value===value);
    if(!option || option.disabled || this.native!.value===value) return;
    this.native!.value=value;
    this.native!.dispatchEvent(new Event('input',{bubbles:true}));
    this.native!.dispatchEvent(new Event('change',{bubbles:true}));
  }
  @HostListener('pointerdown',['$event']) pointer(event:PointerEvent): void {
    if(!this.eligible() || event.button!==0 || this.disabled()) return;
    event.preventDefault();this.native!.focus();const panel=this.panel();this.sync();panel.toggle();
  }
  @HostListener('mousedown',['$event']) mouse(event:MouseEvent): void { if(this.eligible() && !this.disabled()) event.preventDefault(); }
  @HostListener('click',['$event']) click(event:MouseEvent): void {
    if(!this.eligible() || this.disabled()) return;
    event.preventDefault();if(event.detail===0){const panel=this.panel();this.sync();panel.toggle();}
  }
  @HostListener('keydown',['$event']) key(event:KeyboardEvent): void {
    if(!this.eligible() || this.disabled()) return;
    const panel=this.panel();this.sync();
    if(event.key==='F4'){event.preventDefault();panel.toggle();}else panel.key(event);
  }
  @HostListener('change') changed(): void { this.owner()?.instance.close(false);this.sync(); }
  ngDoCheck(): void { this.sync(); }
  ngOnDestroy(): void {
    this.observer?.disconnect();const ref=this.owner();if(ref){this.app.detachView(ref.hostView);ref.destroy();}
    for(const [key,value] of this.original) if(value===null) this.renderer.removeAttribute(this.native,key);else this.renderer.setAttribute(this.native,key,value);
  }
}

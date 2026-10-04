import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MermaidService } from '../../core/services/mermaid.service';

/**
 * A Markdown body rendered by the API (`bodyHtml`). The API renders with raw HTML disabled
 * (RF-37), so its output is trusted here: Angular's sanitizer would strip the heading ids,
 * link targets and lazy-loading attributes it needs (plan D5).
 */
@Component({
  selector: 'app-markdown-body',
  template: '<div #body class="markdown-body" [innerHTML]="content()"></div>',
  styleUrl: './markdown-body.css',
  // The styles target the injected HTML, which has no encapsulation attributes.
  encapsulation: ViewEncapsulation.None,
})
export class MarkdownBody {
  public readonly html = input.required<string>();
  private readonly sanitizer = inject(DomSanitizer);
  private readonly mermaid = inject(MermaidService);
  private readonly body = viewChild.required<ElementRef<HTMLElement>>('body');

  protected readonly content = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.html()));

  constructor() {
    // Browser only: draw diagrams after the HTML is in the DOM; Mermaid is loaded only when
    // the body has a diagram (RF-124).
    afterRenderEffect(() => {
      this.html();
      const element = this.body().nativeElement;
      if (element.querySelector('.mermaid-source')) void this.mermaid.renderIn(element);
    });
  }
}

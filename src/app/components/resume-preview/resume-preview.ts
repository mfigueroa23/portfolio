import {
  afterNextRender,
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { ResumeFailure } from '../../core/interfaces/resume';
import { PdfDocument, PdfRendererService } from '../../core/services/pdf-renderer.service';
import { ResumeService } from '../../core/services/resume.service';

type PreviewState =
  | { kind: 'loading' }
  | { kind: 'ready'; pageCount: number }
  | { kind: 'error'; reason: ResumeFailure };

/** How long the download's object URL lives; Safari needs it past the click. */
const REVOKE_DELAY_MS = 10_000;

/**
 * Native modal `<dialog>` (focus trap, Escape and inert page come from `showModal()`, plan D1)
 * that shows the current resume PDF in the page language, with Download and Close (Spec 006).
 */
@Component({
  selector: 'app-resume-preview',
  templateUrl: './resume-preview.html',
})
export class ResumePreview {
  private readonly resume = inject(ResumeService);
  private readonly renderer = inject(PdfRendererService);
  private readonly language = inject(LanguageService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  protected readonly m = this.language.m;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly pages = viewChild<ElementRef<HTMLElement>>('pages');
  private readonly canvases = viewChildren<ElementRef<HTMLCanvasElement>>('page');

  protected readonly state = signal<PreviewState>({ kind: 'loading' });
  protected readonly pageNumbers = computed(() => {
    const state = this.state();
    return state.kind === 'ready'
      ? Array.from({ length: state.pageCount }, (_, index) => index + 1)
      : [];
  });
  /** The dictionary text of a failure; the API's own text is never shown (RF-27–RF-30). */
  protected readonly errorText = computed(() => {
    const state = this.state();
    if (state.kind !== 'error') return null;
    const errors = this.m().resumePreview.errors;
    if (state.reason === 'not-found') return errors.notFound;
    return state.reason === 'timeout' ? errors.timeout : errors.generic;
  });

  private trigger: HTMLElement | null = null;
  // Bumped by every load and by close, so work that is no longer awaited is dropped (RF-20).
  private generation = 0;
  private controller?: AbortController;
  private pdf?: PdfDocument;
  private data?: Uint8Array<ArrayBuffer>;
  private resizeObserver?: ResizeObserver;
  private renderedWidth = 0;
  private frame = 0;

  /** Opens the dialog and loads the resume; focus returns to `trigger` when it closes. */
  public open(trigger: HTMLElement | null): void {
    this.trigger = trigger;
    this.dialog().nativeElement.showModal();
    afterNextRender(
      () => this.dialog().nativeElement.querySelector<HTMLElement>('[data-close]')?.focus(),
      { injector: this.injector },
    );
    void this.load();
  }

  public close(): void {
    this.dialog().nativeElement.close();
  }

  protected onClosed(): void {
    this.reset();
    this.trigger?.focus();
  }

  // The content wrapper fills the dialog, so only a backdrop click targets the dialog itself.
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.close();
  }

  protected retry(): void {
    void this.load();
  }

  /** Saves the bytes already shown, with no new request (RF-15, RF-16, plan D11). */
  protected download(): void {
    if (!this.data || this.state().kind !== 'ready') return;
    const url = URL.createObjectURL(new Blob([this.data], { type: 'application/pdf' }));
    const link = this.document.createElement('a');
    link.href = url;
    link.download = this.m().resumePreview.fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  }

  private async load(): Promise<void> {
    this.reset();
    const generation = this.generation;
    this.controller = new AbortController();
    const result = await this.resume.load(this.language.lang(), this.controller.signal);
    if (generation !== this.generation) return;
    if (!result.ok) {
      this.state.set({ kind: 'error', reason: result.reason });
      return;
    }

    let pdf: PdfDocument;
    try {
      pdf = await this.renderer.open(result.data);
    } catch {
      if (generation === this.generation) this.state.set({ kind: 'error', reason: 'generic' });
      return;
    }
    if (generation !== this.generation) {
      pdf.destroy();
      return;
    }
    this.pdf = pdf;
    this.data = result.data;
    this.state.set({ kind: 'ready', pageCount: pdf.pageCount });
    afterNextRender(() => this.observeWidth(generation), { injector: this.injector });
  }

  // The observer reports the first size as soon as it observes, so it also does the first
  // render; afterwards only a new width draws again (RF-08, RF-10, plan D10). Drawing waits for
  // the next frame: resizing the canvases while the observer delivers would raise a
  // "ResizeObserver loop" error, and several sizes in one frame draw once.
  private observeWidth(generation: number): void {
    const pages = this.pages()?.nativeElement;
    if (!pages || generation !== this.generation) return;
    this.resizeObserver = new ResizeObserver((entries) => {
      const width = Math.floor(entries[0]?.contentRect.width ?? 0);
      if (width <= 0 || width === this.renderedWidth) return;
      this.renderedWidth = width;
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(() => void this.renderPages(generation, width));
    });
    this.resizeObserver.observe(pages);
  }

  private async renderPages(generation: number, width: number): Promise<void> {
    const pdf = this.pdf;
    if (!pdf || generation !== this.generation) return;
    try {
      await Promise.all(
        this.canvases().map((canvas, index) => pdf.render(index + 1, canvas.nativeElement, width)),
      );
    } catch {
      if (generation === this.generation) {
        this.reset();
        this.state.set({ kind: 'error', reason: 'generic' });
      }
    }
  }

  /** Drops the current load and its PDF; the bytes stay cached in `ResumeService`. */
  private reset(): void {
    this.generation++;
    this.controller?.abort();
    this.controller = undefined;
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    cancelAnimationFrame(this.frame);
    this.pdf?.destroy();
    this.pdf = undefined;
    this.data = undefined;
    this.renderedWidth = 0;
    this.state.set({ kind: 'loading' });
  }
}

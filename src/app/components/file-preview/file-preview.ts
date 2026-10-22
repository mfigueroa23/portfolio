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
import { PreviewFailure, PreviewFile, PreviewSource } from '../../core/interfaces/file-preview';
import { PdfDocument, PdfRendererService } from '../../core/services/pdf-renderer.service';

type PreviewState =
  | { kind: 'loading' }
  | { kind: 'pdf'; pageCount: number }
  | { kind: 'image'; src: string; decoded: boolean }
  | { kind: 'error'; reason: PreviewFailure };

/** How long the download's object URL lives; Safari needs it past the click. */
const REVOKE_DELAY_MS = 10_000;

/** Gives every dialog its own title id; several certificates share a page (Spec 008 RF-23). */
let nextId = 0;

/** The bytes as a `data:` URL, which the CSP's `img-src` allows and `blob:` is not (plan 008 D6). */
function dataUrl(file: PreviewFile): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(new Blob([file.data], { type: file.mime }));
  });
}

/**
 * Native modal `<dialog>` (focus trap, Escape and inert page come from `showModal()`, plan 006
 * D1) that shows a PDF or an image with Download and Close. The resume and certificate previews
 * open it with their own source (plan 008 D1, D2).
 */
@Component({
  selector: 'app-file-preview',
  templateUrl: './file-preview.html',
})
export class FilePreview {
  private readonly renderer = inject(PdfRendererService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly pages = viewChild<ElementRef<HTMLElement>>('pages');
  private readonly canvases = viewChildren<ElementRef<HTMLCanvasElement>>('page');

  protected readonly titleId = `file-preview-title-${nextId++}`;
  protected readonly source = signal<PreviewSource | null>(null);
  protected readonly state = signal<PreviewState>({ kind: 'loading' });
  protected readonly pageNumbers = computed(() => {
    const state = this.state();
    return state.kind === 'pdf'
      ? Array.from({ length: state.pageCount }, (_, index) => index + 1)
      : [];
  });
  /** Download works once something is drawn (Spec 008 RF-09). */
  protected readonly rendered = computed(() => {
    const state = this.state();
    return state.kind === 'pdf' || (state.kind === 'image' && state.decoded);
  });
  /** The dictionary text of a failure; the API's own text is never shown (RF-29–RF-33). */
  protected readonly errorText = computed(() => {
    const state = this.state();
    const errors = this.source()?.texts.errors;
    if (state.kind !== 'error' || !errors) return null;
    if (state.reason === 'not-found') return errors.notFound;
    if (state.reason === 'timeout') return errors.timeout;
    if (state.reason === 'unsupported') return errors.unsupported ?? errors.generic;
    return errors.generic;
  });
  /** Loading again cannot fix a file the preview cannot draw (RF-33). */
  protected readonly canRetry = computed(() => {
    const state = this.state();
    return state.kind === 'error' && state.reason !== 'unsupported';
  });

  private trigger: HTMLElement | null = null;
  // Bumped by every load and by close, so work that is no longer awaited is dropped (RF-22).
  private generation = 0;
  private controller?: AbortController;
  private pdf?: PdfDocument;
  private file?: PreviewFile;
  private resizeObserver?: ResizeObserver;
  private renderedWidth = 0;
  private frame = 0;

  /** Opens the dialog and loads `source`; focus returns to `trigger` when it closes. */
  public open(trigger: HTMLElement | null, source: PreviewSource): void {
    this.trigger = trigger;
    this.source.set(source);
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

  protected onImageLoad(): void {
    const state = this.state();
    if (state.kind === 'image') this.state.set({ ...state, decoded: true });
  }

  protected onImageError(): void {
    this.fail();
  }

  /** Saves the bytes already shown, with no new request (RF-17, RF-18, plan 006 D11). */
  protected download(): void {
    const source = this.source();
    if (!source || !this.file || !this.rendered()) return;
    const url = URL.createObjectURL(new Blob([this.file.data], { type: this.file.mime }));
    const link = this.document.createElement('a');
    link.href = url;
    link.download = source.fileName(this.file);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  }

  private async load(): Promise<void> {
    this.reset();
    const source = this.source();
    if (!source) return;
    const generation = this.generation;
    this.controller = new AbortController();
    const result = await source.load(this.controller.signal);
    if (generation !== this.generation) return;
    if (!result.ok) {
      this.state.set({ kind: 'error', reason: result.reason });
      return;
    }
    this.file = result.file;
    if (result.file.kind === 'image') await this.showImage(generation, result.file);
    else await this.openPdf(generation, result.file);
  }

  // The browser fits the image to the width and keeps its ratio by itself (plan 008 D7).
  private async showImage(generation: number, file: PreviewFile): Promise<void> {
    let src: string;
    try {
      src = await dataUrl(file);
    } catch {
      if (generation === this.generation) this.fail();
      return;
    }
    if (generation === this.generation) this.state.set({ kind: 'image', src, decoded: false });
  }

  private async openPdf(generation: number, file: PreviewFile): Promise<void> {
    let pdf: PdfDocument;
    try {
      pdf = await this.renderer.open(file.data);
    } catch {
      if (generation === this.generation) this.fail();
      return;
    }
    if (generation !== this.generation) {
      pdf.destroy();
      return;
    }
    this.pdf = pdf;
    this.state.set({ kind: 'pdf', pageCount: pdf.pageCount });
    afterNextRender(() => this.observeWidth(generation), { injector: this.injector });
  }

  // The observer reports the first size as soon as it observes, so it also does the first
  // render; afterwards only a new width draws again (Spec 006 RF-08, RF-10, plan 006 D10).
  // Drawing waits for the next frame: resizing the canvases while the observer delivers would
  // raise a "ResizeObserver loop" error, and several sizes in one frame draw once.
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
      if (generation === this.generation) this.fail();
    }
  }

  /** The loaded file cannot be drawn: the source decides which failure that is (RF-33). */
  private fail(): void {
    const reason = this.source()?.renderFailure ?? 'generic';
    this.reset();
    this.state.set({ kind: 'error', reason });
  }

  /** Drops the current load and its PDF or image; loaders keep their own caches. */
  private reset(): void {
    this.generation++;
    this.controller?.abort();
    this.controller = undefined;
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    cancelAnimationFrame(this.frame);
    this.pdf?.destroy();
    this.pdf = undefined;
    this.file = undefined;
    this.renderedWidth = 0;
    this.state.set({ kind: 'loading' });
  }
}

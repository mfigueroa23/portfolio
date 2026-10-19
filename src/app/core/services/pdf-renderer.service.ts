import { Injectable, InjectionToken, inject } from '@angular/core';
import type { RenderTask } from 'pdfjs-dist';

/** The pdf.js module; only its type is imported here, the code is loaded on demand. */
export type PdfJs = typeof import('pdfjs-dist');

/** Loads pdf.js on demand; a separate token so specs can replace the dynamic import. */
export const PDFJS_LOADER = new InjectionToken<() => Promise<PdfJs>>('PDFJS_LOADER', {
  providedIn: 'root',
  // A dynamic import and a bundled worker keep pdf.js out of the initial bundle (Spec 006
  // RF-14, plan D2, D3).
  factory: () => async () => {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerPort ??= new Worker(new URL('./pdf.worker', import.meta.url), {
      type: 'module',
    });
    return pdfjs;
  },
});

/** An open PDF whose pages can be drawn into canvases. */
export interface PdfDocument {
  readonly pageCount: number;
  /**
   * Draws page `pageNumber` (1-based) into `canvas`, `cssWidth` CSS pixels wide. Resolves with
   * `false` when a newer render of the same canvas replaced this one.
   */
  render(pageNumber: number, canvas: HTMLCanvasElement, cssWidth: number): Promise<boolean>;
  destroy(): void;
}

function isCancelled(error: unknown): boolean {
  return (error as { name?: unknown } | null)?.name === 'RenderingCancelledException';
}

/** Draws the resume PDF with pdf.js, as static page images (Spec 006). */
@Injectable({ providedIn: 'root' })
export class PdfRendererService {
  private readonly loader = inject(PDFJS_LOADER);
  private pdfjs?: Promise<PdfJs>;

  /** Opens `data`, which stays intact for the caller. Rejects when it is not a readable PDF. */
  public async open(data: Uint8Array): Promise<PdfDocument> {
    const pdfjs = await this.load();
    // pdf.js transfers the buffer to its worker, so it gets a copy (plan D8). Canvas-only
    // rendering never runs the PDF's scripts or forms (RF-12, plan D9).
    const task = pdfjs.getDocument({ data: data.slice(), enableXfa: false });
    const pdf = await task.promise;
    const pending = new Map<HTMLCanvasElement, RenderTask>();

    return {
      pageCount: pdf.numPages,
      render: async (pageNumber, canvas, cssWidth) => {
        pending.get(canvas)?.cancel();
        const page = await pdf.getPage(pageNumber);
        // Fitted to the width, at the screen's pixel density so text stays sharp (plan D10).
        const ratio = globalThis.devicePixelRatio || 1;
        const scale = cssWidth / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale: scale * ratio });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${viewport.height / ratio}px`;

        const renderTask = page.render({
          canvas,
          viewport,
          annotationMode: pdfjs.AnnotationMode.ENABLE,
        });
        pending.set(canvas, renderTask);
        try {
          await renderTask.promise;
          return true;
        } catch (error) {
          if (isCancelled(error)) return false;
          throw error;
        } finally {
          if (pending.get(canvas) === renderTask) pending.delete(canvas);
        }
      },
      destroy: () => {
        pending.clear();
        void task.destroy();
      },
    };
  }

  private load(): Promise<PdfJs> {
    // A failed load (e.g. a chunk that could not be fetched) is retried on the next open.
    this.pdfjs ??= this.loader().catch((error: unknown) => {
      this.pdfjs = undefined;
      throw error;
    });
    return this.pdfjs;
  }
}

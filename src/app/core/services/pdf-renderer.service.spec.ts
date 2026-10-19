import { TestBed } from '@angular/core/testing';
import { PDFJS_LOADER, PdfJs, PdfRendererService } from './pdf-renderer.service';

/** A pdf.js page of 600 × 800 points at scale 1. */
function fakePage() {
  return {
    getViewport: vi.fn(({ scale }: { scale: number }) => ({
      width: 600 * scale,
      height: 800 * scale,
    })),
    render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
  };
}

describe('PdfRendererService', () => {
  let page: ReturnType<typeof fakePage>;
  let task: { promise: Promise<unknown>; destroy: ReturnType<typeof vi.fn> };
  let pdfjs: { getDocument: ReturnType<typeof vi.fn>; AnnotationMode: { ENABLE: number } };
  let loader: ReturnType<typeof vi.fn>;
  let service: PdfRendererService;

  beforeEach(() => {
    page = fakePage();
    task = {
      promise: Promise.resolve({ numPages: 3, getPage: vi.fn(() => Promise.resolve(page)) }),
      destroy: vi.fn(() => Promise.resolve()),
    };
    pdfjs = { getDocument: vi.fn(() => task), AnnotationMode: { ENABLE: 1 } };
    loader = vi.fn(() => Promise.resolve(pdfjs as unknown as PdfJs));
    TestBed.configureTestingModule({ providers: [{ provide: PDFJS_LOADER, useValue: loader }] });
    service = TestBed.inject(PdfRendererService);
  });

  afterEach(() => vi.unstubAllGlobals());

  const bytes = (): Uint8Array => new Uint8Array([37, 80, 68, 70, 45]);

  it('loads pdf.js only on the first open, and only once (U-PR-1, RF-14)', async () => {
    expect(loader).not.toHaveBeenCalled();
    await service.open(bytes());
    await service.open(bytes());
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('opens a copy of the bytes as static content (U-PR-2, RF-12, plan D8, D9)', async () => {
    const data = bytes();
    const document = await service.open(data);

    expect(document.pageCount).toBe(3);
    const params = pdfjs.getDocument.mock.calls[0][0];
    expect(params.data).toEqual(data);
    expect(params.data).not.toBe(data);
    expect(params.enableXfa).toBe(false);
    // The caller's bytes stay usable for Download after pdf.js transfers its copy.
    expect(data.byteLength).toBe(5);
  });

  it('fits a page to the CSS width at the device pixel ratio (U-PR-3, RF-08, plan D10)', async () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const canvas = document.createElement('canvas');
    const pdf = await service.open(bytes());

    await expect(pdf.render(2, canvas, 300)).resolves.toBe(true);

    // 300 CSS pixels over a 600-point page is scale 0.5, doubled for the screen.
    expect(page.getViewport).toHaveBeenLastCalledWith({ scale: 1 });
    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(800);
    expect(canvas.style.width).toBe('300px');
    expect(canvas.style.height).toBe('400px');
    const [renderParams] = page.render.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(renderParams['canvas']).toBe(canvas);
    expect(renderParams['viewport']).toEqual({ width: 600, height: 800 });
    // Annotation appearances only: no form layer (RF-12).
    expect(renderParams['annotationMode']).toBe(1);
  });

  it('rejects when pdf.js cannot read the bytes (U-PR-4, RF-29)', async () => {
    task.promise = Promise.reject(new Error('Invalid PDF structure.'));
    await expect(service.open(bytes())).rejects.toThrow('Invalid PDF structure.');
  });

  it('rejects when pdf.js cannot be loaded, and tries again on the next open (U-PR-4)', async () => {
    loader.mockReturnValueOnce(Promise.reject(new Error('chunk failed')));
    await expect(service.open(bytes())).rejects.toThrow('chunk failed');
    await expect(service.open(bytes())).resolves.toMatchObject({ pageCount: 3 });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('destroys the pdf.js document (U-PR-5)', async () => {
    const pdf = await service.open(bytes());
    pdf.destroy();
    expect(task.destroy).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending render of the same canvas and reports it as not drawn (RF-10)', async () => {
    const cancelled = Object.assign(new Error('Rendering cancelled'), {
      name: 'RenderingCancelledException',
    });
    let rejectFirst: (error: unknown) => void = () => undefined;
    const first = {
      promise: new Promise<void>((_, reject) => (rejectFirst = reject)),
      cancel: vi.fn(() => rejectFirst(cancelled)),
    };
    page.render.mockReturnValueOnce(first);
    const canvas = document.createElement('canvas');
    const pdf = await service.open(bytes());

    const stale = pdf.render(1, canvas, 300);
    await vi.waitFor(() => expect(page.render).toHaveBeenCalledTimes(1));
    const fresh = pdf.render(1, canvas, 500);

    await expect(stale).resolves.toBe(false);
    await expect(fresh).resolves.toBe(true);
    expect(first.cancel).toHaveBeenCalledTimes(1);
  });

  it('does not create the pdf.js worker until a document is opened (U-PR-6, RF-14)', () => {
    const worker = vi.fn();
    vi.stubGlobal('Worker', worker);
    TestBed.resetTestingModule();
    TestBed.inject(PdfRendererService);
    expect(worker).not.toHaveBeenCalled();
  });
});

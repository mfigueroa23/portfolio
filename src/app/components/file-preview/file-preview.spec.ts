import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PreviewResult, PreviewSource } from '../../core/interfaces/file-preview';
import { PdfDocument, PdfRendererService } from '../../core/services/pdf-renderer.service';
import { FilePreview } from './file-preview';

// jsdom has no modal dialogs: emulate `showModal()`/`close()` with the `open` attribute and
// the `close` event the browser fires.
const nativeShowModal = HTMLDialogElement.prototype.showModal;
const nativeClose = HTMLDialogElement.prototype.close;

/** Stands in for `ResizeObserver`; `resize()` reports a new size of every observed element. */
class FakeResizeObserver {
  public static instances: FakeResizeObserver[] = [];
  public readonly observed: Element[] = [];
  public disconnected = false;

  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }

  public static resize(width: number, height = 900): void {
    for (const observer of FakeResizeObserver.instances.filter((item) => !item.disconnected)) {
      const entries = observer.observed.map(
        (target) => ({ target, contentRect: { width, height } }) as unknown as ResizeObserverEntry,
      );
      observer.callback(entries, observer as unknown as ResizeObserver);
    }
  }

  public observe(target: Element): void {
    this.observed.push(target);
  }

  public disconnect(): void {
    this.disconnected = true;
  }
}

/** A promise with its resolve function, to answer a load when the test decides. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

const PDF_BYTES = new Uint8Array([37, 80, 68, 70, 45]);
const PNG_BYTES = new Uint8Array([137, 80, 78, 71]);
const PDF: PreviewResult = {
  ok: true,
  file: { kind: 'pdf', mime: 'application/pdf', data: PDF_BYTES },
};
const PNG: PreviewResult = {
  ok: true,
  file: { kind: 'image', mime: 'image/png', data: PNG_BYTES },
};

const TEXTS: PreviewSource['texts'] = {
  close: 'Close certificate',
  download: 'Download',
  downloadLabel: 'Download certificate',
  retry: 'Retry',
  loading: 'Loading certificate...',
  page: (page, total) => `Page ${page} of ${total}`,
  errors: {
    notFound: 'Not available.',
    generic: 'Could not load.',
    timeout: 'Too slow.',
    unsupported: 'Cannot be shown.',
  },
};

describe('FilePreview', () => {
  let fixture: ComponentFixture<FilePreview>;
  let component: FilePreview;
  let element: HTMLElement;
  let load: ReturnType<typeof vi.fn<PreviewSource['load']>>;
  let openPdf: ReturnType<typeof vi.fn>;
  let pdf: {
    pageCount: number;
    render: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  };
  let trigger: HTMLButtonElement;
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  const dialog = (): HTMLDialogElement => element.querySelector('dialog')!;
  const button = (selector: string): HTMLButtonElement | null =>
    element.querySelector<HTMLButtonElement>(selector);
  const canvases = (): HTMLCanvasElement[] => Array.from(element.querySelectorAll('canvas'));
  const image = (): HTMLImageElement | null => element.querySelector('img');
  const alert = (): Element | null => element.querySelector('[role="alert"]');
  const settle = async (): Promise<void> => {
    await fixture.whenStable();
    await new Promise((done) => requestAnimationFrame(() => setTimeout(done)));
    await fixture.whenStable();
  };
  const source = (overrides: Partial<PreviewSource> = {}): PreviewSource => ({
    title: 'Scrum Master',
    lang: null,
    texts: TEXTS,
    load,
    fileName: (file) => `scrum-master.${file.kind}`,
    renderFailure: 'unsupported',
    ...overrides,
  });
  const open = async (overrides: Partial<PreviewSource> = {}): Promise<void> => {
    component.open(trigger, source(overrides));
    await settle();
  };
  /** Opens an image and lets the browser report it as decoded. */
  const openImage = async (): Promise<void> => {
    load.mockResolvedValue(PNG);
    await open();
    image()!.dispatchEvent(new Event('load'));
    await settle();
  };

  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      if (!this.hasAttribute('open')) return;
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  });

  afterAll(() => {
    HTMLDialogElement.prototype.showModal = nativeShowModal;
    HTMLDialogElement.prototype.close = nativeClose;
  });

  beforeEach(async () => {
    FakeResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    load = vi.fn<PreviewSource['load']>(() => Promise.resolve(PDF));
    pdf = { pageCount: 2, render: vi.fn(() => Promise.resolve(true)), destroy: vi.fn() };
    openPdf = vi.fn(() => Promise.resolve(pdf as PdfDocument));
    trigger = document.createElement('button');
    document.body.appendChild(trigger);
    // jsdom has no object URLs.
    createObjectURL = vi.fn(() => 'blob:file');
    revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });

    await TestBed.configureTestingModule({
      imports: [FilePreview],
      providers: [{ provide: PdfRendererService, useValue: { open: openPdf } }],
    }).compileComponents();
    fixture = TestBed.createComponent(FilePreview);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    trigger.remove();
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('opens as a modal dialog and loads the source with a signal (U-FP-1, RF-04)', async () => {
    expect(dialog().open).toBe(false);
    await open();

    expect(dialog().open).toBe(true);
    expect(load).toHaveBeenCalledOnce();
    expect(load.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
  });

  it('is labelled by the title, marked with its language only when set (U-FP-2, RF-07, RF-23)', async () => {
    await open();
    const title = element.querySelector(`#${dialog().getAttribute('aria-labelledby')}`);
    expect(title?.textContent).toContain('Scrum Master');
    expect(title?.hasAttribute('lang')).toBe(false);

    component.close();
    await settle();
    await open({ title: 'Certificado de Scrum', lang: 'es' });
    expect(element.querySelector('h2')?.getAttribute('lang')).toBe('es');
    expect(element.querySelector('h2')?.textContent).toContain('Certificado de Scrum');
  });

  it('gives each instance its own title id (U-FP-2, RF-23)', async () => {
    const other = TestBed.createComponent(FilePreview);
    await other.whenStable();
    const otherId = other.nativeElement.querySelector('dialog').getAttribute('aria-labelledby');
    expect(otherId).not.toBe(dialog().getAttribute('aria-labelledby'));
  });

  it('shows the loading text and keeps Download disabled while loading (U-FP-3, RF-08, RF-09)', async () => {
    load.mockReturnValue(new Promise(() => undefined));
    await open();

    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Loading certificate...',
    );
    expect(button('[data-download]')!.disabled).toBe(true);
    expect(button('[data-close]')!.disabled).toBe(false);
  });

  it('draws every PDF page into a labelled canvas (U-FP-4, RF-10, RF-14)', async () => {
    await open();
    FakeResizeObserver.resize(600);
    await settle();

    expect(openPdf).toHaveBeenCalledWith(PDF_BYTES);
    expect(canvases().map((canvas) => canvas.getAttribute('aria-label'))).toEqual([
      'Page 1 of 2',
      'Page 2 of 2',
    ]);
    expect(pdf.render).toHaveBeenCalledTimes(2);
    expect(image()).toBeNull();
    expect(button('[data-download]')!.disabled).toBe(false);
  });

  it('shows an image from a data URL, fitted to the width, with the title as alt (U-FP-5, RF-11, RF-14)', async () => {
    load.mockResolvedValue(PNG);
    await open();

    const img = image()!;
    expect(img.getAttribute('src')).toBe(
      `data:image/png;base64,${btoa(String.fromCharCode(...PNG_BYTES))}`,
    );
    expect(img.alt).toBe('Scrum Master');
    expect(img.classList).toContain('w-full');
    expect(img.classList).toContain('h-auto');
    expect(canvases()).toHaveLength(0);
    // Until the browser decodes it, nothing is rendered yet (RF-09).
    expect(button('[data-download]')!.disabled).toBe(true);

    img.dispatchEvent(new Event('load'));
    await settle();
    expect(button('[data-download]')!.disabled).toBe(false);
  });

  it('never loads the PDF renderer for an image (U-FP-6, RF-16)', async () => {
    await openImage();
    expect(openPdf).not.toHaveBeenCalled();
    expect(FakeResizeObserver.instances).toHaveLength(0);
  });

  it.each([
    ['a PDF', PDF, 'application/pdf', PDF_BYTES, 'scrum-master.pdf'],
    ['an image', PNG, 'image/png', PNG_BYTES, 'scrum-master.image'],
  ] as const)(
    'saves %s already loaded under the source name and stays open (U-FP-7, RF-17, RF-19)',
    async (_, result, mime, bytes, name) => {
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);
      load.mockResolvedValue(result);
      await open();
      image()?.dispatchEvent(new Event('load'));
      await settle();

      button('[data-download]')!.click();

      const blob = createObjectURL.mock.calls[0][0] as Blob;
      expect(blob.type).toBe(mime);
      expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
      expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe(name);
      expect(load).toHaveBeenCalledOnce();
      expect(dialog().open).toBe(true);
    },
  );

  it('cancels a pending load on close and ignores its result (U-FP-8, RF-22)', async () => {
    for (const result of [PDF, PNG]) {
      const pending = deferred<PreviewResult>();
      load.mockReturnValue(pending.promise);
      await open();
      const signal = load.mock.lastCall![0] as AbortSignal;

      component.close();
      await settle();
      expect(signal.aborted).toBe(true);

      pending.resolve(result);
      await settle();
      expect(openPdf).not.toHaveBeenCalled();
      expect(image()).toBeNull();
      expect(dialog().open).toBe(false);
    }
  });

  it.each([
    ['not-found', 'Not available.'],
    ['generic', 'Could not load.'],
    ['timeout', 'Too slow.'],
  ] as const)(
    'shows the text of a %s failure with Retry and Close (U-FP-9, U-FP-10, RF-29–RF-32)',
    async (reason, text) => {
      load.mockResolvedValueOnce({ ok: false, reason });
      await open();

      expect(alert()?.textContent).toContain(text);
      expect(button('[data-retry]')?.textContent).toContain('Retry');
      expect(button('[data-close]')!.disabled).toBe(false);
      expect(button('[data-download]')!.disabled).toBe(true);

      button('[data-retry]')!.click();
      await settle();
      expect(load).toHaveBeenCalledTimes(2);
      expect(alert()).toBeNull();
    },
  );

  it('shows the unsupported text with Close and without Retry (U-FP-11, RF-33)', async () => {
    load.mockResolvedValue({ ok: false, reason: 'unsupported' });
    await open();

    expect(alert()?.textContent).toContain('Cannot be shown.');
    expect(button('[data-retry]')).toBeNull();
    expect(button('[data-close]')!.disabled).toBe(false);
  });

  it('falls back to the generic text when the source has no unsupported text (RF-33)', async () => {
    load.mockResolvedValue({ ok: false, reason: 'unsupported' });
    await open({ texts: { ...TEXTS, errors: { ...TEXTS.errors, unsupported: undefined } } });
    expect(alert()?.textContent).toContain('Could not load.');
  });

  it('shows the source render failure when the PDF or the image cannot be drawn (U-FP-12, RF-33)', async () => {
    openPdf.mockRejectedValueOnce(new Error('Invalid PDF structure.'));
    await open();
    expect(alert()?.textContent).toContain('Cannot be shown.');
    expect(alert()?.textContent).not.toContain('Invalid PDF');
    expect(button('[data-retry]')).toBeNull();

    component.close();
    await settle();
    load.mockResolvedValue(PNG);
    await open({ renderFailure: 'generic' });
    image()!.dispatchEvent(new Event('error'));
    await settle();
    expect(alert()?.textContent).toContain('Could not load.');
    expect(button('[data-retry]')).not.toBeNull();
  });

  it('closes with Close, Escape and a backdrop click, and returns focus (RF-20, RF-21)', async () => {
    for (const action of [
      () => button('[data-close]')!.click(),
      () => dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })),
      () => dialog().dispatchEvent(new MouseEvent('click', { bubbles: true })),
    ]) {
      await openImage();
      action();
      await settle();
      expect(dialog().open).toBe(false);
      expect(document.activeElement).toBe(trigger);
    }
  });

  it('starts clean when opened again with another source (RF-06)', async () => {
    await openImage();
    component.close();
    await settle();

    load.mockReturnValue(new Promise(() => undefined));
    await open({ title: 'Another' });
    expect(image()).toBeNull();
    expect(element.querySelector('[role="status"]')).not.toBeNull();
    expect(element.querySelector('h2')?.textContent).toContain('Another');
  });
});

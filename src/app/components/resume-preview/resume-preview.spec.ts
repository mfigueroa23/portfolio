import { PlatformLocation } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResumeResult } from '../../core/interfaces/resume';
import { PdfDocument, PdfRendererService } from '../../core/services/pdf-renderer.service';
import { ResumeService } from '../../core/services/resume.service';
import { ResumePreview } from './resume-preview';

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
const LOADED: ResumeResult = { ok: true, data: PDF_BYTES };

describe('ResumePreview', () => {
  let fixture: ComponentFixture<ResumePreview>;
  let component: ResumePreview;
  let element: HTMLElement;
  let load: ReturnType<typeof vi.fn>;
  let openPdf: ReturnType<typeof vi.fn>;
  let pdf: {
    pageCount: number;
    render: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  };
  let trigger: HTMLButtonElement;
  let pathname: string;
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  const dialog = (): HTMLDialogElement => element.querySelector('dialog')!;
  const button = (selector: string): HTMLButtonElement =>
    element.querySelector<HTMLButtonElement>(selector)!;
  const canvases = (): HTMLCanvasElement[] => Array.from(element.querySelectorAll('canvas'));
  const settle = async (): Promise<void> => {
    await fixture.whenStable();
    await new Promise((done) => requestAnimationFrame(() => setTimeout(done)));
    await fixture.whenStable();
  };
  const open = async (): Promise<void> => {
    component.open(trigger);
    await settle();
  };
  /** Opens with a PDF of three pages, laid out 600 px wide. */
  const openReady = async (): Promise<void> => {
    await open();
    FakeResizeObserver.resize(600);
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

  beforeEach(() => {
    pathname = '/';
    FakeResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    load = vi.fn(() => Promise.resolve(LOADED));
    pdf = { pageCount: 3, render: vi.fn(() => Promise.resolve(true)), destroy: vi.fn() };
    openPdf = vi.fn(() => Promise.resolve(pdf as PdfDocument));
    trigger = document.createElement('button');
    document.body.appendChild(trigger);
    // jsdom has no object URLs.
    createObjectURL = vi.fn(() => 'blob:resume');
    revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
  });

  afterEach(() => {
    trigger.remove();
    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const create = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [ResumePreview],
      providers: [
        { provide: ResumeService, useValue: { load } },
        { provide: PdfRendererService, useValue: { open: openPdf } },
        { provide: PlatformLocation, useValue: { pathname } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ResumePreview);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    await fixture.whenStable();
  };

  describe('in English', () => {
    beforeEach(create);

    it('stays closed and loads nothing until opened, as when prerendered (U-RP-1, RF-02)', () => {
      expect(dialog().open).toBe(false);
      expect(load).not.toHaveBeenCalled();
      expect(openPdf).not.toHaveBeenCalled();
    });

    it('opens as a modal dialog and loads the resume in the page language (U-RP-2, RF-03, RF-04)', async () => {
      await open();

      expect(dialog().open).toBe(true);
      expect(load).toHaveBeenCalledOnce();
      expect(load.mock.calls[0][0]).toBe('en');
      expect(load.mock.calls[0][1]).toBeInstanceOf(AbortSignal);
      expect(openPdf).toHaveBeenCalledWith(PDF_BYTES);
    });

    it('shows the resume again when reopened (U-RP-3, RF-05)', async () => {
      await openReady();
      component.close();
      await settle();
      await openReady();

      expect(load).toHaveBeenCalledTimes(2);
      expect(canvases()).toHaveLength(3);
    });

    it('shows a loading text and keeps Download disabled while loading (U-RP-4, RF-06, RF-07)', async () => {
      load.mockReturnValue(new Promise(() => undefined));
      await open();

      const status = element.querySelector('[role="status"]');
      expect(status?.textContent).toContain('Loading resume...');
      expect(button('[data-download]').disabled).toBe(true);
      expect(button('[data-close]').disabled).toBe(false);
      expect(canvases()).toHaveLength(0);
    });

    it('draws every page in order, fitted and labelled (U-RP-5, RF-08, RF-11)', async () => {
      await openReady();

      expect(canvases()).toHaveLength(3);
      expect(canvases().map((canvas) => canvas.getAttribute('aria-label'))).toEqual([
        'Page 1 of 3',
        'Page 2 of 3',
        'Page 3 of 3',
      ]);
      expect(canvases().every((canvas) => canvas.getAttribute('role') === 'img')).toBe(true);
      expect(pdf.render.mock.calls.map(([page, canvas, width]) => [page, canvas, width])).toEqual(
        canvases().map((canvas, index) => [index + 1, canvas, 600]),
      );
      expect(button('[data-download]').disabled).toBe(false);
      expect(element.querySelector('[role="status"]')).toBeNull();
    });

    it('fits the pages again only when the width changes (U-RP-6, RF-10)', async () => {
      await openReady();
      pdf.render.mockClear();

      FakeResizeObserver.resize(600, 400);
      await settle();
      expect(pdf.render).not.toHaveBeenCalled();

      FakeResizeObserver.resize(340);
      await settle();
      expect(pdf.render).toHaveBeenCalledTimes(3);
      expect(pdf.render.mock.calls.every(([, , width]) => width === 340)).toBe(true);
    });

    it('draws in the next frame, not inside the observer callback (RF-10)', async () => {
      await open();
      FakeResizeObserver.resize(600);

      // Resizing canvases while the observer delivers would raise a "ResizeObserver loop" error.
      expect(pdf.render).not.toHaveBeenCalled();
      await settle();
      expect(pdf.render).toHaveBeenCalledTimes(3);
    });

    it('draws once for several sizes reported before the next frame (RF-10)', async () => {
      await open();
      FakeResizeObserver.resize(500);
      FakeResizeObserver.resize(600);
      await settle();

      expect(pdf.render).toHaveBeenCalledTimes(3);
      expect(pdf.render.mock.calls.every(([, , width]) => width === 600)).toBe(true);
    });

    it('saves the loaded bytes under the English file name and stays open (U-RP-7, RF-15–RF-17)', async () => {
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);
      await openReady();
      vi.useFakeTimers();

      button('[data-download]').click();

      const blob = createObjectURL.mock.calls[0][0] as Blob;
      expect(blob.type).toBe('application/pdf');
      expect(new Uint8Array(await blob.arrayBuffer())).toEqual(PDF_BYTES);
      const link = click.mock.contexts[0] as HTMLAnchorElement;
      expect(link.download).toBe('Marco-Figueroa-Resume.pdf');
      expect(link.href).toBe('blob:resume');
      expect(load).toHaveBeenCalledOnce();
      expect(dialog().open).toBe(true);
      vi.runAllTimers();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:resume');
    });

    it('closes with Close, Escape and a backdrop click, and returns focus (U-RP-8, RF-18, RF-19)', async () => {
      for (const action of [
        () => button('[data-close]').click(),
        () => dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })),
        () => dialog().dispatchEvent(new MouseEvent('click', { bubbles: true })),
      ]) {
        await openReady();
        action();
        await settle();
        expect(dialog().open).toBe(false);
        expect(document.activeElement).toBe(trigger);
      }
    });

    it('stays open on a click inside the content (U-RP-8)', async () => {
      await openReady();
      element.querySelector('h2')!.click();
      expect(dialog().open).toBe(true);
    });

    it('cancels a pending load on close and ignores its result (U-RP-9, RF-20)', async () => {
      const pending = deferred<ResumeResult>();
      load.mockReturnValue(pending.promise);
      await open();
      const signal = load.mock.calls[0][1] as AbortSignal;

      component.close();
      await settle();
      expect(signal.aborted).toBe(true);

      pending.resolve(LOADED);
      await settle();
      expect(openPdf).not.toHaveBeenCalled();
      expect(dialog().open).toBe(false);
    });

    it('drops a PDF that opens after the dialog closed (U-RP-9, RF-20)', async () => {
      const opening = deferred<PdfDocument>();
      openPdf.mockReturnValue(opening.promise);
      await open();
      component.close();
      await settle();

      opening.resolve(pdf as PdfDocument);
      await settle();
      expect(pdf.destroy).toHaveBeenCalledOnce();
      expect(canvases()).toHaveLength(0);
    });

    it('is a labelled dialog that takes focus, with named controls (U-RP-10, RF-21, RF-22)', async () => {
      await openReady();

      const title = element.querySelector(`#${dialog().getAttribute('aria-labelledby')}`);
      expect(title?.textContent).toContain("Marco Figueroa's resume");
      expect(document.activeElement).toBe(button('[data-close]'));
      expect(button('[data-close]').getAttribute('aria-label')).toBe('Close resume');
      expect(button('[data-download]').getAttribute('aria-label')).toBe('Download resume as PDF');
    });

    it.each([
      ['not-found', 'The resume is not available right now.'],
      ['generic', "We couldn't load the resume. Please try again."],
      ['timeout', 'The resume took too long to load. Please try again.'],
    ] as const)(
      'shows the dictionary text for a %s failure, with Retry and Close (U-RP-11, U-RP-12, RF-27, RF-28, RF-30)',
      async (reason, text) => {
        load.mockResolvedValue({ ok: false, reason });
        await open();

        const alert = element.querySelector('[role="alert"]');
        expect(alert?.textContent).toContain(text);
        expect(button('[data-retry]').textContent).toContain('Retry');
        expect(button('[data-close]').disabled).toBe(false);
        expect(button('[data-download]').disabled).toBe(true);
      },
    );

    it('shows the generic text when the PDF cannot be read (U-RP-13, RF-29)', async () => {
      openPdf.mockRejectedValue(new Error('Invalid PDF structure.'));
      await open();

      const alert = element.querySelector('[role="alert"]');
      expect(alert?.textContent).toContain("We couldn't load the resume.");
      expect(alert?.textContent).not.toContain('Invalid PDF');
    });

    it('shows the generic text when a page cannot be drawn (RF-29)', async () => {
      pdf.render.mockRejectedValue(new Error('Canvas failed'));
      await openReady();

      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        "We couldn't load the resume.",
      );
    });

    it('loads again on Retry and shows the pages (U-RP-14, RF-31)', async () => {
      load.mockResolvedValueOnce({ ok: false, reason: 'generic' });
      await open();

      button('[data-retry]').click();
      await settle();
      FakeResizeObserver.resize(600);
      await settle();

      expect(load).toHaveBeenCalledTimes(2);
      expect(element.querySelector('[role="alert"]')).toBeNull();
      expect(canvases()).toHaveLength(3);
    });

    it('starts clean when opened again after an error (U-RP-16)', async () => {
      load.mockResolvedValueOnce({ ok: false, reason: 'timeout' });
      await open();
      component.close();
      await settle();

      load.mockReturnValue(new Promise(() => undefined));
      await open();
      expect(element.querySelector('[role="alert"]')).toBeNull();
      expect(element.querySelector('[role="status"]')).not.toBeNull();
    });

    it('destroys the PDF and stops observing the size on close (RF-20)', async () => {
      await openReady();
      component.close();
      await settle();

      expect(pdf.destroy).toHaveBeenCalledOnce();
      expect(FakeResizeObserver.instances.every((observer) => observer.disconnected)).toBe(true);
    });
  });

  describe('in Spanish', () => {
    beforeEach(async () => {
      pathname = '/es';
      await create();
    });

    it('loads the Spanish resume with Spanish texts and file name (U-RP-15, RF-04, RF-16)', async () => {
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);
      await openReady();

      expect(load.mock.calls[0][0]).toBe('es');
      expect(element.querySelector('h2')?.textContent).toContain('CV de Marco Figueroa');
      expect(canvases()[0].getAttribute('aria-label')).toBe('Página 1 de 3');
      button('[data-download]').click();
      expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('Marco-Figueroa-CV.pdf');
    });
  });
});

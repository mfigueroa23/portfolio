import { PlatformLocation } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestimonialService } from '../../core/services/testimonial.service';
import { TestimonialDialog } from './testimonial-dialog';

// jsdom has no modal dialogs: emulate `showModal()`/`close()` with the `open` attribute and
// the `close` event the browser fires.
const nativeShowModal = HTMLDialogElement.prototype.showModal;
const nativeClose = HTMLDialogElement.prototype.close;

describe('TestimonialDialog', () => {
  let fixture: ComponentFixture<TestimonialDialog>;
  let component: TestimonialDialog;
  let element: HTMLElement;
  let submit: ReturnType<typeof vi.fn>;
  let trigger: HTMLButtonElement;
  let showModal: ReturnType<typeof vi.fn>;

  const dialog = (): HTMLDialogElement => element.querySelector('dialog')!;
  const field = <T extends HTMLElement = HTMLInputElement>(id: string): T =>
    element.querySelector<T>(`#testimonial-${id}`)!;
  const type = (id: string, value: string): void => {
    const input = field<HTMLInputElement | HTMLTextAreaElement>(id);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const fill = (): void => {
    type('name', 'Ada Lovelace');
    type('role', 'CTO');
    type('email', 'ada@example.com');
    type('text', 'Great to work with.');
  };
  const submitForm = async (): Promise<void> => {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };
  const open = async (): Promise<void> => {
    component.open(trigger);
    await fixture.whenStable();
  };
  const status = (): HTMLElement => element.querySelector('[aria-live="polite"]')!;

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
    submit = vi.fn();
    await TestBed.configureTestingModule({
      imports: [TestimonialDialog],
      providers: [{ provide: TestimonialService, useValue: { submit } }],
    }).compileComponents();
    fixture = TestBed.createComponent(TestimonialDialog);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    await fixture.whenStable();
    showModal = vi.spyOn(dialog(), 'showModal') as unknown as ReturnType<typeof vi.fn>;
    trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
  });

  afterEach(() => trigger.remove());

  describe('shell', () => {
    it('stays closed until opened', () => {
      expect(dialog().open).toBe(false);
    });

    it('opens as a modal dialog with an empty form (RF-4)', async () => {
      await open();

      expect(showModal).toHaveBeenCalledOnce();
      expect(dialog().open).toBe(true);
      expect(dialog().getAttribute('aria-labelledby')).toBe('testimonial-dialog-title');
      for (const id of ['name', 'role', 'email', 'text']) {
        expect(field<HTMLInputElement>(id).value).toBe('');
      }
    });

    it('moves focus to the name field on open (RF-9)', async () => {
      await open();
      expect(document.activeElement).toBe(field('name'));
    });

    it('closes with Escape (RF-6)', async () => {
      await open();
      field('name').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await fixture.whenStable();
      expect(dialog().open).toBe(false);
    });

    it('closes with the close button (RF-7)', async () => {
      await open();
      element.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click();
      await fixture.whenStable();
      expect(dialog().open).toBe(false);
    });

    it('closes on a click outside the content (RF-8) but not inside it', async () => {
      await open();
      field('name').click();
      await fixture.whenStable();
      expect(dialog().open).toBe(true);

      dialog().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await fixture.whenStable();
      expect(dialog().open).toBe(false);
    });

    it('returns focus to the trigger on close (RF-10)', async () => {
      await open();
      component.close();
      await fixture.whenStable();
      expect(document.activeElement).toBe(trigger);
    });

    it('opens empty again after being closed with values', async () => {
      await open();
      fill();
      await fixture.whenStable();
      component.close();
      await open();
      expect(field('name').value).toBe('');
      expect(field<HTMLTextAreaElement>('text').value).toBe('');
    });
  });

  describe('form', () => {
    beforeEach(open);

    it('labels every field and shows the privacy text (RF-5)', () => {
      for (const [id, label] of [
        ['name', 'Name'],
        ['role', 'Role'],
        ['email', 'Email'],
        ['text', 'Testimonial'],
      ]) {
        expect(element.querySelector(`label[for="testimonial-${id}"]`)?.textContent).toContain(
          label,
        );
      }
      expect(element.textContent).toContain(
        'Your email is only used to contact you about this testimonial and is never published.',
      );
    });

    it('hides the honeypot from sighted users, the keyboard and screen readers (RF-32)', () => {
      const honeypot = field('website');
      const container = honeypot.parentElement!.closest<HTMLElement>('[aria-hidden="true"]')!;

      expect(honeypot.getAttribute('aria-hidden')).toBe('true');
      expect(honeypot.getAttribute('tabindex')).toBe('-1');
      expect(honeypot.getAttribute('autocomplete')).toBe('off');
      expect(container).toBeTruthy();
      expect(container.className).toContain('-left-[9999px]');
      expect(container.className).toContain('absolute');
    });

    it('shows field errors without sending the request (RF-24, RF-25)', async () => {
      type('name', 'Ada​');
      type('name', '😀');
      type('email', 'not-an-email');
      await submitForm();

      expect(submit).not.toHaveBeenCalled();
      for (const id of ['name', 'role', 'email', 'text']) {
        const input = field(id);
        const error = element.querySelector(`#testimonial-${id}-error`);
        expect(error?.textContent?.trim()).toBeTruthy();
        expect(input.getAttribute('aria-describedby')).toContain(`testimonial-${id}-error`);
        expect(input.getAttribute('aria-invalid')).toBe('true');
      }
      expect(document.activeElement).toBe(field('name'));
    });

    it('clears the errors of fields that become valid', async () => {
      await submitForm();
      fill();
      type('email', 'bad');
      await submitForm();

      expect(element.querySelector('#testimonial-name-error')).toBeNull();
      expect(field('name').getAttribute('aria-invalid')).toBeNull();
      expect(element.querySelector('#testimonial-email-error')).toBeTruthy();
    });

    it('sends the values and the honeypot through TestimonialService', async () => {
      submit.mockResolvedValue('ok');
      fill();
      type('website', 'https://spam.example');
      await submitForm();

      expect(submit).toHaveBeenCalledWith({
        name: 'Ada Lovelace',
        role: 'CTO',
        email: 'ada@example.com',
        testimonial: 'Great to work with.',
        website: 'https://spam.example',
      });
    });

    it('disables submit while sending and sends only once (RF-12)', async () => {
      let resolve!: (message: string) => void;
      submit.mockReturnValue(new Promise<string>((done) => (resolve = done)));
      fill();
      await submitForm();

      const button = element.querySelector<HTMLButtonElement>('form button:not([type])')!;
      expect(button.disabled).toBe(true);
      await submitForm();
      expect(submit).toHaveBeenCalledOnce();

      resolve('ok');
      await fixture.whenStable();
    });

    it('replaces the form with the API message on success (RF-22)', async () => {
      submit.mockResolvedValue('Thanks! Your testimonial will appear once it has been reviewed.');
      fill();
      await submitForm();

      expect(element.querySelector('form')).toBeNull();
      expect(status().textContent).toContain(
        'Thanks! Your testimonial will appear once it has been reviewed.',
      );
    });

    it('shows an empty form when reopened after a success (RF-23)', async () => {
      submit.mockResolvedValue('Thanks!');
      fill();
      await submitForm();
      component.close();
      await open();

      expect(element.querySelector('form')).toBeTruthy();
      expect(field('name').value).toBe('');
      expect(status().textContent?.trim()).toBe('');
    });

    it.each([
      'Too many submissions. Please try again later.',
      'Failed to send message. Please try again later.',
    ])('shows the error "%s" and keeps the values (RF-26 to RF-28)', async (message) => {
      submit.mockRejectedValue(new Error(message));
      fill();
      await submitForm();

      expect(status().textContent).toContain(message);
      expect(field('name').value).toBe('Ada Lovelace');
      expect(field('role').value).toBe('CTO');
      expect(field('email').value).toBe('ada@example.com');
      expect(field<HTMLTextAreaElement>('text').value).toBe('Great to work with.');
      expect(element.querySelector<HTMLButtonElement>('form button:not([type])')!.disabled).toBe(
        false,
      );
    });
  });
});

describe('TestimonialDialog in Spanish', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
  });

  afterAll(() => {
    HTMLDialogElement.prototype.showModal = nativeShowModal;
  });

  it('shows its texts and errors in Spanish (RF-131, RF-180)', async () => {
    const submit = vi.fn().mockRejectedValue(new Error(''));
    await TestBed.configureTestingModule({
      imports: [TestimonialDialog],
      providers: [
        { provide: TestimonialService, useValue: { submit } },
        { provide: PlatformLocation, useValue: { pathname: '/es' } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(TestimonialDialog);
    await fixture.whenStable();
    fixture.componentInstance.open(null);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const form = element.querySelector('form')!;

    expect(element.textContent).toContain(
      'Tu email solo se usa para contactarte sobre este testimonio y nunca se publica.',
    );
    expect(element.querySelector('label[for="testimonial-role"]')?.textContent).toContain('Cargo');
    expect(element.querySelector('button[aria-label="Cerrar"]')).not.toBeNull();

    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(element.querySelector('#testimonial-name-error')?.textContent).toContain(
      'Escribe tu nombre',
    );

    for (const [id, value] of [
      ['name', 'Ana'],
      ['role', 'CTO'],
      ['email', 'ana@example.com'],
      ['text', 'Excelente.'],
    ]) {
      const input = element.querySelector<HTMLInputElement>(`#testimonial-${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(element.textContent).toContain('No se pudo enviar el mensaje. Inténtalo más tarde.');
  });
});

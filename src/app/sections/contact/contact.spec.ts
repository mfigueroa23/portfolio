import { PlatformLocation } from '@angular/common';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContactInfo } from '../../core/interfaces/content';
import { ContactService } from '../../core/services/contact.service';
import { ContentService } from '../../core/services/content.service';
import { Contact } from './contact';

describe('Contact', () => {
  let component: Contact;
  let fixture: ComponentFixture<Contact>;
  let send: ReturnType<typeof vi.fn>;
  let collection: ReturnType<typeof vi.fn>;
  let contactInfo: WritableSignal<ContactInfo[]>;
  let element: HTMLElement;
  const infoItems: ContactInfo[] = [
    {
      id: 1,
      position: 0,
      icon: 'fa-solid fa-envelope',
      label: 'Email',
      value: 'someone@example.com',
      href: 'mailto:someone@example.com',
    },
    {
      id: 2,
      position: 1,
      icon: 'fa-solid fa-location-dot',
      label: 'Location',
      value: 'Somewhere',
      href: '/#contact',
    },
  ];

  const type = (selector: string, value: string): void => {
    const field = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
  };

  const submit = async (): Promise<void> => {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    send = vi.fn();
    contactInfo = signal(infoItems);
    collection = vi.fn(() => contactInfo);
    await TestBed.configureTestingModule({
      imports: [Contact],
      providers: [
        { provide: ContactService, useValue: { send } },
        { provide: ContentService, useValue: { collection } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Contact);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form submission', () => {
    beforeEach(() => {
      type('#name', 'Ada');
      type('#email', 'ada@example.com');
      type('#message', 'Hello');
    });

    it('sends the message through ContactService and clears the fields on success', async () => {
      send.mockResolvedValue("Message sent successfully! I'll get back to you soon.");
      await submit();

      expect(send).toHaveBeenCalledWith({
        name: 'Ada',
        email: 'ada@example.com',
        message: 'Hello',
        website: '',
      });
      expect(element.textContent).toContain(
        "Message sent successfully! I'll get back to you soon.",
      );
      expect(component.name()).toBe('');
      expect(component.email()).toBe('');
      expect(component.message()).toBe('');
    });

    it('shows the error text from the service and keeps the fields', async () => {
      send.mockRejectedValue(new Error('Too many messages. Please try again later.'));
      await submit();

      expect(element.textContent).toContain('Too many messages. Please try again later.');
      expect(component.name()).toBe('Ada');
      expect(component.message()).toBe('Hello');
    });

    it('includes the honeypot value in the payload', async () => {
      send.mockResolvedValue('ok');
      type('#website', 'https://spam.example');
      await submit();

      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ website: 'https://spam.example' }),
      );
    });
  });

  describe('honeypot field', () => {
    let honeypot: HTMLInputElement;

    beforeEach(() => {
      honeypot = element.querySelector<HTMLInputElement>('input#website')!;
    });

    it('is hidden from screen readers and skipped by the keyboard', () => {
      expect(honeypot).toBeTruthy();
      expect(honeypot.getAttribute('aria-hidden')).toBe('true');
      expect(honeypot.getAttribute('tabindex')).toBe('-1');
      expect(honeypot.getAttribute('autocomplete')).toBe('off');
      expect(honeypot.required).toBe(false);
    });

    it('is positioned off-screen so sighted users do not see it', () => {
      const container = honeypot.closest<HTMLElement>('.honeypot')!;
      expect(container).toBeTruthy();
      expect(container.getAttribute('aria-hidden')).toBe('true');
      const style = getComputedStyle(container);
      expect(style.position).toBe('absolute');
      expect(style.left).toBe('-9999px');
    });
  });

  describe('contact info', () => {
    it('renders the contact info items from the API', () => {
      expect(collection).toHaveBeenCalledWith('contact-info');
      const link = element.querySelector('a[href="mailto:someone@example.com"]');
      expect(link?.textContent).toContain('Email');
      expect(link?.textContent).toContain('someone@example.com');
      expect(element.textContent).toContain('Somewhere');
      expect(element.textContent).not.toContain('Contact details coming soon');
    });

    it('shows the empty state when there are no contact info items', async () => {
      contactInfo.set([]);
      await fixture.whenStable();

      expect(element.textContent).toContain('Contact details coming soon');
      expect(element.querySelector('a[href^="mailto:"]')).toBeNull();
    });
  });
});

describe('Contact in Spanish', () => {
  it('translates its texts and marks contact items shown in English (RF-131, RF-152)', async () => {
    const send = vi.fn().mockRejectedValue(new Error(''));
    const info: ContactInfo = {
      id: 1,
      position: 0,
      icon: 'fa-solid fa-location-dot',
      label: 'Location',
      value: 'Santiago',
      href: '/#contact',
      lang: 'en',
    };
    await TestBed.configureTestingModule({
      imports: [Contact],
      providers: [
        { provide: ContactService, useValue: { send } },
        { provide: ContentService, useValue: { collection: () => signal([info]) } },
        { provide: PlatformLocation, useValue: { pathname: '/es' } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Contact);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('label[for="message"]')?.textContent).toContain('Mensaje');
    expect(element.textContent).toContain('Enviar mensaje');
    expect(element.textContent).toContain('Información de contacto');
    expect(element.querySelector('a[href="/#contact"]')?.getAttribute('lang')).toBe('en');

    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(element.textContent).toContain('No se pudo enviar el mensaje. Inténtalo más tarde.');
  });
});

import { PlatformLocation } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssistantComposer } from './assistant-composer';

describe('AssistantComposer', () => {
  let fixture: ComponentFixture<AssistantComposer>;
  let element: HTMLElement;
  let sent: string[];

  const input = (): HTMLTextAreaElement => element.querySelector('textarea')!;
  const sendButton = (): HTMLButtonElement => element.querySelector('button[type="submit"]')!;
  const hint = (): HTMLElement => element.querySelector('#assistant-input-hint')!;

  async function type(value: string): Promise<void> {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function pressEnter(shiftKey = false): Promise<KeyboardEvent> {
    const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey, cancelable: true });
    input().dispatchEvent(event);
    await fixture.whenStable();
    return event;
  }

  async function create(path = '/'): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [AssistantComposer],
      providers: [{ provide: PlatformLocation, useValue: { pathname: path } }],
    }).compileComponents();
    fixture = TestBed.createComponent(AssistantComposer);
    element = fixture.nativeElement;
    sent = [];
    fixture.componentInstance.submitted.subscribe((text) => sent.push(text));
    await fixture.whenStable();
  }

  describe('in English', () => {
    beforeEach(() => create());

    it('labels the message field and shows an empty counter', () => {
      const label = element.querySelector(`label[for="${input().id}"]`);
      expect(label?.textContent?.trim()).toBe('Message for the assistant');
      expect(input().placeholder).toBe("Ask about Marco's work...");
      expect(hint().textContent).toContain('Enter to send · Shift+Enter for a new line');
      expect(hint().textContent).toContain('0 / 2000');
      expect(sendButton().getAttribute('aria-label')).toBe('Send message');
    });

    it('sends the trimmed message on Enter and clears the field (RF-10)', async () => {
      await type('  What does Marco work on?  ');
      const event = await pressEnter();

      expect(event.defaultPrevented).toBe(true);
      expect(sent).toEqual(['What does Marco work on?']);
      expect(input().value).toBe('');
      expect(hint().textContent).toContain('0 / 2000');
    });

    it('sends with the send button', async () => {
      await type('Hi');
      sendButton().click();
      await fixture.whenStable();
      expect(sent).toEqual(['Hi']);
    });

    it('keeps Shift+Enter for a new line', async () => {
      await type('First line');
      const event = await pressEnter(true);

      expect(event.defaultPrevented).toBe(false);
      expect(sent).toEqual([]);
    });

    it('cannot send an empty or blank message (RF-11)', async () => {
      expect(sendButton().disabled).toBe(true);
      await type('   ');
      expect(sendButton().disabled).toBe(true);
      await pressEnter();
      expect(sent).toEqual([]);

      await type('Hi');
      expect(sendButton().disabled).toBe(false);
    });

    it('cannot send while a reply is pending (RF-13)', async () => {
      fixture.componentRef.setInput('pending', true);
      await type('Hi');

      expect(sendButton().disabled).toBe(true);
      await pressEnter();
      expect(sent).toEqual([]);
      expect(input().value).toBe('Hi');
    });

    it('blocks an over-long message and names the limit (RF-12)', async () => {
      await type('a'.repeat(2001));

      expect(sendButton().disabled).toBe(true);
      expect(input().getAttribute('aria-invalid')).toBe('true');
      expect(input().getAttribute('aria-describedby')).toBe('assistant-input-hint');
      expect(hint().textContent).toContain('Messages can be up to 2000 characters.');
      expect(hint().textContent).toContain('2001 / 2000');
      await pressEnter();
      expect(sent).toEqual([]);
    });

    it('moves the focus to the field on request', () => {
      fixture.componentInstance.focus();
      expect(document.activeElement).toBe(input());
    });
  });

  it('shows its texts in Spanish under /es (RF-32)', async () => {
    await create('/es');
    expect(input().placeholder).toBe('Pregunta sobre el trabajo de Marco...');
    expect(sendButton().getAttribute('aria-label')).toBe('Enviar mensaje');
    expect(hint().textContent).toContain('Enter para enviar');
  });
});

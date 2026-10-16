import { PlatformLocation } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgentResult } from '../../core/interfaces/assistant';
import {
  ASSISTANT_STORAGE,
  AssistantConversationService,
} from '../../core/services/assistant-conversation.service';
import { AssistantService } from '../../core/services/assistant.service';
import { Assistant } from './assistant';

/** Fake agent: each `send` waits until the test answers it. */
class FakeAssistant {
  public readonly calls: { message: string; answer: (result: AgentResult) => void }[] = [];
  public send(_chatId: string, message: string): Promise<AgentResult> {
    return new Promise((answer) => this.calls.push({ message, answer }));
  }
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('Assistant', () => {
  let fixture: ComponentFixture<Assistant>;
  let element: HTMLElement;
  let agent: FakeAssistant;

  const launcher = (): HTMLButtonElement => element.querySelector('[data-launcher]')!;
  const panel = (): HTMLElement | null => element.querySelector('[role="dialog"]');
  const thread = (): HTMLElement => element.querySelector('[data-thread]')!;
  const suggestions = (): HTMLButtonElement[] =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('[data-suggestion]'));
  const liveRegion = (): HTMLElement => element.querySelector('[aria-live="polite"]')!;
  const store = () => TestBed.inject(AssistantConversationService);

  async function create(path = '/'): Promise<void> {
    agent = new FakeAssistant();
    await TestBed.configureTestingModule({
      imports: [Assistant],
      providers: [
        { provide: AssistantService, useValue: agent },
        { provide: ASSISTANT_STORAGE, useValue: null },
        { provide: PlatformLocation, useValue: { pathname: path } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Assistant);
    element = fixture.nativeElement;
    document.body.appendChild(element);
    await fixture.whenStable();
  }

  async function open(): Promise<void> {
    launcher().click();
    await fixture.whenStable();
  }

  async function answer(result: AgentResult): Promise<void> {
    agent.calls[agent.calls.length - 1].answer(result);
    await settle();
    await fixture.whenStable();
  }

  afterEach(() => {
    element.remove();
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  describe('in English', () => {
    beforeEach(() => create());

    it('shows only the floating launcher until it is opened (RF-01)', () => {
      expect(launcher().getAttribute('aria-label')).toBe("Open Marco's assistant");
      expect(launcher().getAttribute('aria-expanded')).toBe('false');
      expect(panel()).toBeNull();
    });

    it('opens a labelled panel and moves the focus to the message field (RF-03, RF-07)', async () => {
      await open();

      const title = element.querySelector(`#${panel()!.getAttribute('aria-labelledby')}`);
      expect(title?.textContent?.trim()).toBe("Marco's assistant");
      expect(document.activeElement?.id).toBe('assistant-input');
      expect(launcher().getAttribute('aria-label')).toBe("Close Marco's assistant");
      expect(launcher().getAttribute('aria-expanded')).toBe('true');
      expect(launcher().getAttribute('aria-controls')).toBe(panel()!.id);
      expect(store().open()).toBe(true);
    });

    it('closes with Escape and returns the focus to the launcher (RF-04)', async () => {
      await open();
      panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await fixture.whenStable();

      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(launcher());
      expect(store().open()).toBe(false);
    });

    it('closes with the close button and with the launcher', async () => {
      await open();
      element.querySelector<HTMLButtonElement>('[data-close]')!.click();
      await fixture.whenStable();
      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(launcher());

      await open();
      launcher().click();
      await fixture.whenStable();
      expect(panel()).toBeNull();
    });

    it('greets with suggested questions while the conversation is empty (RF-08, RF-09)', async () => {
      await open();
      expect(thread().textContent).toContain("Hi! I'm Marco's assistant.");
      expect(suggestions().map((button) => button.textContent!.trim())).toEqual([
        'What does Marco work on?',
        'Which technologies does he use?',
        'Is he available for work?',
      ]);

      suggestions()[1].click();
      await fixture.whenStable();

      expect(agent.calls.map((call) => call.message)).toEqual(['Which technologies does he use?']);
      expect(thread().querySelector('[data-user]')?.textContent?.trim()).toBe(
        'Which technologies does he use?',
      );
      expect(suggestions()).toEqual([]);
      expect(thread().querySelector('[role="status"]')?.getAttribute('aria-label')).toBe(
        'The assistant is thinking',
      );
    });

    it('sends what the visitor types (RF-10)', async () => {
      await open();
      const input = element.querySelector<HTMLTextAreaElement>('#assistant-input')!;
      input.value = 'Is he available?';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      await fixture.whenStable();

      expect(agent.calls.map((call) => call.message)).toEqual(['Is he available?']);
    });

    it('announces a reply once, as plain text, when it is shown in full (RF-19)', async () => {
      window.matchMedia = vi.fn(() => ({ matches: true })) as unknown as typeof window.matchMedia;
      await open();
      suggestions()[0].click();
      await fixture.whenStable();
      expect(liveRegion().textContent!.trim()).toBe('');

      await answer({ ok: true, text: 'Marco builds **web apps**.' });

      expect(thread().querySelector('[data-reply] strong')?.textContent).toBe('web apps');
      expect(thread().querySelector('[role="status"]')).toBeNull();
      expect(liveRegion().textContent!.trim()).toBe('Marco builds web apps.');
    });

    it('starts over with "New conversation" (RF-23)', async () => {
      window.matchMedia = vi.fn(() => ({ matches: true })) as unknown as typeof window.matchMedia;
      await open();
      suggestions()[0].click();
      await fixture.whenStable();
      await answer({ ok: true, text: 'Hello!' });

      element.querySelector<HTMLButtonElement>('[data-new-chat]')!.click();
      await fixture.whenStable();

      expect(suggestions().length).toBe(3);
      expect(thread().querySelector('app-assistant-message')).toBeNull();
      expect(liveRegion().textContent!.trim()).toBe('');
      expect(document.activeElement?.id).toBe('assistant-input');
    });

    it('retries a failed message from its error (RF-29)', async () => {
      await open();
      suggestions()[0].click();
      await fixture.whenStable();
      await answer({ ok: false, reason: 'generic' });

      element.querySelector<HTMLButtonElement>('[data-retry]')!.click();
      await fixture.whenStable();

      expect(agent.calls.map((call) => call.message)).toEqual([
        'What does Marco work on?',
        'What does Marco work on?',
      ]);
      expect(element.querySelector('[data-error]')).toBeNull();
    });

    it('follows new content only while the visitor is at the bottom (RF-18)', async () => {
      await open();
      const box = thread();
      let scrollTop = 0;
      Object.defineProperty(box, 'scrollHeight', { configurable: true, get: () => 1000 });
      Object.defineProperty(box, 'clientHeight', { configurable: true, get: () => 400 });
      Object.defineProperty(box, 'scrollTop', {
        configurable: true,
        get: () => scrollTop,
        set: (value: number) => (scrollTop = value),
      });

      suggestions()[0].click();
      await fixture.whenStable();
      expect(scrollTop).toBe(1000);

      scrollTop = 100;
      box.dispatchEvent(new Event('scroll'));
      await answer({ ok: false, reason: 'timeout' });
      expect(scrollTop).toBe(100);

      scrollTop = 590;
      box.dispatchEvent(new Event('scroll'));
      element.querySelector<HTMLButtonElement>('[data-retry]')!.click();
      await fixture.whenStable();
      expect(scrollTop).toBe(1000);
    });
  });

  it('shows its texts in Spanish under /es (RF-32)', async () => {
    await create('/es');
    expect(launcher().getAttribute('aria-label')).toBe('Abrir el asistente de Marco');
    await open();
    expect(panel()!.textContent).toContain('Asistente de Marco');
    expect(suggestions()[0].textContent!.trim()).toBe('¿En qué trabaja Marco?');
    expect(
      element.querySelector<HTMLButtonElement>('[data-new-chat]')!.getAttribute('aria-label'),
    ).toBe('Nueva conversación');
  });
});

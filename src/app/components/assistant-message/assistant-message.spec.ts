import { PlatformLocation } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatTurn, ErrorTurn, ReplyTurn } from '../../core/interfaces/assistant';
import { MS_PER_WORD } from '../../core/utils/word-reveal';
import { AssistantMessage } from './assistant-message';

const reply = (text: string, animate: boolean): ReplyTurn => ({
  id: 'r1',
  role: 'assistant',
  kind: 'reply',
  text,
  animate,
});
const error = (reason: ErrorTurn['reason'], text?: string): ErrorTurn => ({
  id: 'e1',
  role: 'assistant',
  kind: 'error',
  reason,
  retryOf: 'u1',
  ...(text ? { text } : {}),
});

describe('AssistantMessage', () => {
  let fixture: ComponentFixture<AssistantMessage>;
  let element: HTMLElement;
  let revealed: string[];
  let retried: string[];

  const bubble = (): HTMLElement => element.querySelector('[data-reply]')!;
  const skipButton = (): HTMLButtonElement | null => element.querySelector('[data-skip]');
  const retryButton = (): HTMLButtonElement => element.querySelector('[data-retry]')!;
  const visibleText = (): string => bubble().textContent!.replace(/\s+/g, ' ').trim();

  function create(turn: ChatTurn, path = '/'): void {
    TestBed.configureTestingModule({
      imports: [AssistantMessage],
      providers: [{ provide: PlatformLocation, useValue: { pathname: path } }],
    });
    fixture = TestBed.createComponent(AssistantMessage);
    fixture.componentRef.setInput('turn', turn);
    element = fixture.nativeElement;
    revealed = [];
    retried = [];
    fixture.componentInstance.revealed.subscribe((id) => revealed.push(id));
    fixture.componentInstance.retry.subscribe((id) => retried.push(id));
    fixture.detectChanges();
  }

  function tick(ms: number): void {
    vi.advanceTimersByTime(ms);
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.useRealTimers();
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('shows a visitor message as plain text', () => {
    create({ id: 'u1', role: 'user', text: '<b>Hi</b> **Marco**' });
    const message = element.querySelector('[data-user]')!;
    expect(message.textContent!.trim()).toBe('<b>Hi</b> **Marco**');
    expect(message.querySelector('b, strong')).toBeNull();
  });

  it('renders a reply that is not animated in full as Markdown (RF-17)', () => {
    create(reply('Uses **Angular** and [the blog](https://a.com).', false));

    expect(bubble().querySelector('strong')?.textContent).toBe('Angular');
    const link = bubble().querySelector('a')!;
    expect(link.getAttribute('href')).toBe('https://a.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(skipButton()).toBeNull();
    expect(revealed).toEqual([]);
  });

  describe('word-by-word reveal (RF-14)', () => {
    beforeEach(() => vi.useFakeTimers());

    it('reveals the reply one word per tick with a caret, then reports it', () => {
      create(reply('Marco builds web apps', true));
      expect(visibleText()).toBe('');
      expect(bubble().querySelector('.assistant-caret')?.getAttribute('aria-hidden')).toBe('true');

      tick(MS_PER_WORD);
      expect(visibleText()).toBe('Marco');
      tick(MS_PER_WORD);
      expect(visibleText()).toBe('Marco builds');
      tick(MS_PER_WORD * 2);

      expect(visibleText()).toBe('Marco builds web apps');
      expect(bubble().querySelector('.assistant-caret')).toBeNull();
      expect(skipButton()).toBeNull();
      expect(revealed).toEqual(['r1']);
      tick(MS_PER_WORD * 10);
      expect(revealed).toEqual(['r1']);
    });

    it('shows the whole reply at once with "Show full answer" (RF-15)', () => {
      create(reply('One two three four five', true));
      tick(MS_PER_WORD);
      expect(skipButton()?.textContent?.trim()).toBe('Show full answer');

      skipButton()!.click();
      fixture.detectChanges();

      expect(visibleText()).toBe('One two three four five');
      expect(skipButton()).toBeNull();
      expect(revealed).toEqual(['r1']);
      tick(MS_PER_WORD * 10);
      expect(revealed).toEqual(['r1']);
    });

    it('keeps the Markdown layout of a partly revealed reply', () => {
      create(reply('Stack:\n- Angular\n- Node.js', true));
      // "Stack:", "-" and "Angular" are the first three words.
      tick(MS_PER_WORD * 3);
      expect(bubble().querySelector('li')?.textContent).toContain('Angular');
      expect(bubble().querySelector('.assistant-caret')).not.toBeNull();
    });
  });

  it('shows the reply in full when the visitor prefers reduced motion (RF-16)', () => {
    window.matchMedia = vi.fn((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    })) as unknown as typeof window.matchMedia;
    create(reply('Marco builds web apps', true));

    expect(visibleText()).toBe('Marco builds web apps');
    expect(skipButton()).toBeNull();
    expect(revealed).toEqual(['r1']);
  });

  describe('errors (RF-26 to RF-29)', () => {
    it("shows the agent's text as plain text, apart from replies", () => {
      create(error('api', 'Service **unavailable**'));
      const alert = element.querySelector('[data-error]')!;

      expect(alert.textContent).toContain('Agent message');
      expect(alert.textContent).toContain('Service **unavailable**');
      expect(alert.querySelector('strong')).toBeNull();
      expect(element.querySelector('[data-reply]')).toBeNull();
    });

    it.each([
      ['generic', 'Connection problem', "We couldn't reach the assistant. Please try again."],
      ['timeout', 'No answer', 'The assistant took too long to answer. Please try again.'],
      ['interrupted', 'Interrupted', "This message didn't get an answer because the page changed."],
    ] as const)('shows the dictionary text for a %s failure', (reason, label, text) => {
      create(error(reason));
      const alert = element.querySelector('[data-error]')!;
      expect(alert.textContent).toContain(label);
      expect(alert.textContent).toContain(text);
    });

    it('asks to retry the message, except while a reply is pending', () => {
      create(error('generic'));
      expect(retryButton().textContent?.trim()).toBe('Retry');

      retryButton().click();
      expect(retried).toEqual(['e1']);

      fixture.componentRef.setInput('pending', true);
      fixture.detectChanges();
      expect(retryButton().disabled).toBe(true);
    });
  });

  it('shows its texts in Spanish under /es (RF-32)', () => {
    create(error('timeout'), '/es');
    const alert = element.querySelector('[data-error]')!;
    expect(alert.textContent).toContain('Sin respuesta');
    expect(alert.textContent).toContain('El asistente tardó demasiado en responder.');
    expect(retryButton().textContent?.trim()).toBe('Reintentar');
  });
});

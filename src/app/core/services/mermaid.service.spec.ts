import { TestBed } from '@angular/core/testing';
import { MERMAID_CONFIG, MERMAID_LOADER, MermaidService } from './mermaid.service';

describe('MermaidService', () => {
  let mermaid: {
    initialize: ReturnType<typeof vi.fn>;
    parse: ReturnType<typeof vi.fn>;
    render: ReturnType<typeof vi.fn>;
  };
  let loader: ReturnType<typeof vi.fn>;
  let service: MermaidService;

  beforeEach(() => {
    mermaid = {
      initialize: vi.fn(),
      parse: vi.fn(() => Promise.resolve(true)),
      render: vi.fn(() =>
        Promise.resolve({ svg: '<svg aria-labelledby="t"><title id="t">Flow</title></svg>' }),
      ),
    };
    loader = vi.fn(() => Promise.resolve(mermaid));
    TestBed.configureTestingModule({ providers: [{ provide: MERMAID_LOADER, useValue: loader }] });
    service = TestBed.inject(MermaidService);
  });

  const host = (...sources: string[]): HTMLElement => {
    const element = document.createElement('div');
    element.innerHTML = sources
      .map(
        (source) =>
          `<figure class="md-mermaid"><pre class="mermaid-source"><code>${source}</code></pre></figure>`,
      )
      .join('');
    return element;
  };

  it('does not load Mermaid when there are no diagrams', async () => {
    const element = document.createElement('div');
    element.innerHTML = '<pre><code>const a = 1;</code></pre>';
    await service.renderIn(element);
    expect(loader).not.toHaveBeenCalled();
  });

  it('replaces each source block with its diagram', async () => {
    const element = host('graph LR; a--&gt;b', 'graph TD; c--&gt;d');
    await service.renderIn(element);

    expect(mermaid.initialize).toHaveBeenCalledWith(MERMAID_CONFIG);
    expect(mermaid.render).toHaveBeenCalledTimes(2);
    expect(mermaid.render.mock.calls[0][1]).toBe('graph LR; a-->b');
    expect(element.querySelectorAll('.mermaid-source').length).toBe(0);
    expect(element.querySelectorAll('.md-mermaid svg').length).toBe(2);
    // The accessible title emitted by Mermaid (accTitle) stays on the SVG.
    expect(element.querySelector('svg title')?.textContent).toBe('Flow');
  });

  it('loads and configures Mermaid only once', async () => {
    await service.renderIn(host('graph LR; a--&gt;b'));
    await service.renderIn(host('graph LR; c--&gt;d'));
    expect(loader).toHaveBeenCalledTimes(1);
    expect(mermaid.initialize).toHaveBeenCalledTimes(1);
  });

  it('keeps the source and adds a note when a diagram cannot be parsed', async () => {
    mermaid.parse.mockRejectedValueOnce(new Error('Parse error'));
    const element = host('graph LR; a--&gt;');
    await service.renderIn(element);

    expect(mermaid.render).not.toHaveBeenCalled();
    expect(element.querySelector('.mermaid-source code')?.textContent).toBe('graph LR; a-->');
    expect(element.querySelector('.md-mermaid-error')?.textContent).toBe(
      'Diagram could not be rendered.',
    );
  });

  it('pins the theme to the site tokens with strict security', () => {
    expect(MERMAID_CONFIG).toMatchObject({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'strict',
      themeVariables: {
        primaryColor: '#1a2329',
        primaryTextColor: '#f0f2f5',
        textColor: '#f0f2f5',
        lineColor: '#20b2a6',
      },
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MermaidService } from '../../core/services/mermaid.service';
import { MarkdownBody } from './markdown-body';

describe('MarkdownBody', () => {
  let renderIn: ReturnType<typeof vi.fn>;

  const render = async (html: string): Promise<ComponentFixture<MarkdownBody>> => {
    renderIn = vi.fn(() => Promise.resolve());
    await TestBed.configureTestingModule({
      imports: [MarkdownBody],
      providers: [{ provide: MermaidService, useValue: { renderIn } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(MarkdownBody);
    fixture.componentRef.setInput('html', html);
    await fixture.whenStable();
    return fixture;
  };

  it('renders the HTML from the API keeping ids, link targets and lazy images', async () => {
    const fixture = await render(
      '<h2 id="intro">Intro</h2>' +
        '<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">Out</a></p>' +
        '<p><img src="https://api.example.com/files/1" alt="Diagram" loading="lazy"></p>',
    );
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h2#intro')?.textContent).toBe('Intro');
    const link = element.querySelector('a');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    const image = element.querySelector('img');
    expect(image?.getAttribute('loading')).toBe('lazy');
    expect(image?.getAttribute('alt')).toBe('Diagram');
  });

  it('renders diagrams in the browser when the body has Mermaid blocks', async () => {
    const fixture = await render(
      '<figure class="md-mermaid"><pre class="mermaid-source"><code>graph LR; a--&gt;b</code></pre></figure>',
    );
    expect(renderIn).toHaveBeenCalledWith(fixture.nativeElement.querySelector('.markdown-body'));
  });

  it('does not load Mermaid without diagrams', async () => {
    await render('<p>Plain text.</p>');
    expect(renderIn).not.toHaveBeenCalled();
  });
});

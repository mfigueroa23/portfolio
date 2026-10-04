import { Injectable, InjectionToken, inject } from '@angular/core';
import type { MermaidConfig } from 'mermaid';

/** The part of the Mermaid API the site uses. */
export interface MermaidApi {
  initialize(config: MermaidConfig): void;
  parse(text: string): Promise<unknown>;
  render(id: string, text: string): Promise<{ svg: string }>;
}

/** Loads Mermaid on demand; a separate token so specs can replace the dynamic import. */
export const MERMAID_LOADER = new InjectionToken<() => Promise<MermaidApi>>('MERMAID_LOADER', {
  providedIn: 'root',
  // A dynamic import keeps Mermaid out of the initial bundle (RF-124).
  factory: () => () => import('mermaid').then((module) => module.default),
});

// Colours of the site tokens (styles.css): foreground text on the surface colour (≈ 13:1,
// RF-34) and primary lines. The same values are pinned in the panel.
export const MERMAID_CONFIG: MermaidConfig = {
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'strict',
  fontFamily: 'Inter, sans-serif',
  themeVariables: {
    darkMode: true,
    background: '#1a2329',
    primaryColor: '#1a2329',
    primaryTextColor: '#f0f2f5',
    primaryBorderColor: '#20b2a6',
    secondaryColor: '#1f2830',
    secondaryTextColor: '#f0f2f5',
    tertiaryColor: '#141a1f',
    tertiaryTextColor: '#f0f2f5',
    textColor: '#f0f2f5',
    lineColor: '#20b2a6',
    noteBkgColor: '#1f2830',
    noteTextColor: '#f0f2f5',
  },
};

const RENDER_ERROR = 'Diagram could not be rendered.';

/** Draws the Mermaid blocks of a rendered Markdown body in the browser. */
@Injectable({ providedIn: 'root' })
export class MermaidService {
  private readonly loader = inject(MERMAID_LOADER);
  private mermaid?: Promise<MermaidApi>;
  private nextId = 0;

  /**
   * Replaces each `.mermaid-source` block in `host` with its diagram. A block that cannot be
   * parsed keeps its source with a note (RF-32). Mermaid emits `accTitle`/`accDescr` as the
   * SVG's `<title>`/`<desc>` (RF-33).
   */
  public async renderIn(host: HTMLElement): Promise<void> {
    const blocks = Array.from(
      host.querySelectorAll<HTMLElement>('.mermaid-source:not([data-mermaid-failed])'),
    );
    if (!blocks.length) return;
    const mermaid = await this.load();

    for (const block of blocks) {
      const source = block.textContent ?? '';
      const id = `mermaid-diagram-${this.nextId++}`;
      try {
        await mermaid.parse(source);
        const { svg } = await mermaid.render(id, source);
        const diagram = host.ownerDocument.createElement('div');
        diagram.className = 'md-mermaid-diagram';
        diagram.innerHTML = svg;
        // Keep the diagram at its natural width so a wide one scrolls inside its block
        // instead of shrinking to unreadable text (RF-35).
        const element = diagram.querySelector('svg');
        if (element?.style.maxWidth) element.style.minWidth = element.style.maxWidth;
        block.replaceWith(diagram);
      } catch {
        // Mermaid may leave its temporary container behind on failure.
        host.ownerDocument.getElementById(`d${id}`)?.remove();
        // Kept as source, and skipped if the body is processed again.
        block.setAttribute('data-mermaid-failed', '');
        const note = host.ownerDocument.createElement('p');
        note.className = 'md-mermaid-error';
        note.textContent = RENDER_ERROR;
        block.after(note);
      }
    }
  }

  private load(): Promise<MermaidApi> {
    this.mermaid ??= this.loader().then((mermaid) => {
      mermaid.initialize(MERMAID_CONFIG);
      return mermaid;
    });
    return this.mermaid;
  }
}

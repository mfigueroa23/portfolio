import { PlatformLocation } from '@angular/common';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Certification } from '../../core/interfaces/content';
import { ContentService } from '../../core/services/content.service';
import { Certifications } from './certifications';

describe('Certifications', () => {
  const certification = (
    id: number,
    issueDate: string,
    position = id,
    name = `Certification ${id}`,
  ): Certification => ({
    id,
    position,
    name,
    issuer: 'Santo Tomas',
    issueDate,
    expiryDate: null,
    credentialId: null,
    verificationUrl: null,
    fileUrl: null,
  });
  let collection: ReturnType<typeof vi.fn>;
  let pathname = '/';

  const render = async (data: Certification[]): Promise<ComponentFixture<Certifications>> => {
    collection = vi.fn(() => signal(data));
    await TestBed.configureTestingModule({
      imports: [Certifications],
      providers: [
        { provide: ContentService, useValue: { collection } },
        { provide: PlatformLocation, useValue: { pathname } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Certifications);
    await fixture.whenStable();
    return fixture;
  };
  const names = (fixture: ComponentFixture<Certifications>) =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('h3'), (h3) =>
      h3.textContent?.trim(),
    );

  it('renders the section with its anchor and heading (U-SC-1)', async () => {
    const fixture = await render([certification(1, '2026-04-17')]);
    const section = (fixture.nativeElement as HTMLElement).querySelector('section#certifications');
    expect(section).not.toBeNull();
    expect(section?.querySelector('h2')?.textContent).toContain('Always');
    expect(section?.querySelector('h2')?.textContent).toContain('learning.');
  });

  it('shows the 3 certifications with the latest issue date, newest first (U-SC-2)', async () => {
    const fixture = await render([
      certification(1, '2023-01-10'),
      certification(2, '2026-04-17'),
      certification(3, '2024-06-01'),
      certification(4, '2025-12-31'),
      certification(5, '2022-02-02'),
    ]);
    expect(names(fixture)).toEqual(['Certification 2', 'Certification 4', 'Certification 3']);
  });

  it('breaks issue-date ties by the owner order (U-SC-3)', async () => {
    // The live data: four certifications share 2025-06-24 and one is from 2026.
    const fixture = await render([
      certification(5, '2025-06-24', 0, 'Basic Software Design'),
      certification(4, '2025-06-24', 1, 'Basic Programming'),
      certification(3, '2025-06-24', 2, 'IT Support'),
      certification(2, '2025-06-24', 3, 'Advanced Programming'),
      certification(1, '2026-04-17', 4, 'Data Analytics'),
    ]);
    expect(names(fixture)).toEqual([
      'Data Analytics',
      'Basic Software Design',
      'Basic Programming',
    ]);
  });

  it('links "See all certifications" to the certifications of /experience (U-SC-4)', async () => {
    const fixture = await render([certification(1, '2026-04-17')]);
    const more = (fixture.nativeElement as HTMLElement).querySelector(
      'a[href="/experience#certifications"]',
    );
    expect(more?.textContent).toContain('See all certifications');
  });

  it('shows the empty state and no "see all" link without certifications (U-SC-5)', async () => {
    const fixture = await render([]);
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('section#certifications')).not.toBeNull();
    expect(element.textContent).toContain('Certifications coming soon');
    expect(element.querySelector('a[href^="/experience"]')).toBeNull();
    expect(element.querySelector('h3')?.textContent).not.toContain('Certification 1');
  });

  it('asks the API once for every certification (U-SC-7)', async () => {
    await render([]);
    expect(collection).toHaveBeenCalledTimes(1);
    expect(collection).toHaveBeenCalledWith('certifications');
  });

  describe('in Spanish', () => {
    beforeEach(() => (pathname = '/es'));
    afterEach(() => (pathname = '/'));

    it('translates its texts and links to the Spanish /experience (U-SC-6)', async () => {
      const fixture = await render([certification(1, '2026-04-17')]);
      const element: HTMLElement = fixture.nativeElement;
      expect(element.textContent).toContain('Credenciales');
      expect(element.textContent).toContain('aprendiendo.');
      expect(
        element.querySelector('a[href="/es/experience#certifications"]')?.textContent,
      ).toContain('Ver todas las certificaciones');
    });

    it('shows the Spanish empty state (U-SC-6)', async () => {
      const fixture = await render([]);
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Certificaciones próximamente',
      );
    });
  });
});

import { PlatformLocation } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Navigation } from './navigation';

describe('Navigation', () => {
  let component: Navigation;
  let fixture: ComponentFixture<Navigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navigation],
    }).compileComponents();

    fixture = TestBed.createComponent(Navigation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('links to the blog', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('a[href="/blog"]')?.textContent?.trim()).toBe('Blog');
  });

  it('keeps the section links pointing at the home, so they work from any page', () => {
    const sections = component.navLinks.filter((link) => link.label !== 'Blog');
    expect(sections.length).toBeGreaterThan(0);
    sections.forEach((link) => expect(link.href).toMatch(/^\/#[a-z]+$/));
  });
});

describe('Navigation in Spanish', () => {
  let element: HTMLElement;
  let fixture: ComponentFixture<Navigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navigation],
      providers: [{ provide: PlatformLocation, useValue: { pathname: '/es/blog' } }],
    }).compileComponents();
    fixture = TestBed.createComponent(Navigation);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('translates the links and keeps them on the Spanish pages (RF-131)', () => {
    expect(element.querySelector('a[href="/es#about"]')?.textContent?.trim()).toBe('Sobre mí');
    expect(element.querySelector('a[href="/es/blog"]')?.textContent?.trim()).toBe('Blog');
    expect(element.querySelector('a[href="/es#contact"]')?.textContent).toContain('Contáctame');
    expect(element.querySelector('a[href="/es#"]')?.textContent).toContain('MF');
  });

  it('shows the language switch in the desktop bar and in the phone menu (RF-121)', async () => {
    expect(element.querySelectorAll('app-language-switch').length).toBe(1);
    element.querySelector<HTMLButtonElement>('nav > button')!.click();
    await fixture.whenStable();
    expect(element.querySelectorAll('app-language-switch').length).toBe(2);
  });
});

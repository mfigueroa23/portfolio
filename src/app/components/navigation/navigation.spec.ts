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

  const element = (): HTMLElement => fixture.nativeElement;
  const mobileMenu = () => element().querySelector<HTMLElement>('header > section nav');
  const openMenu = async () => {
    element().querySelector<HTMLButtonElement>('nav > button')!.click();
    await fixture.whenStable();
    expect(mobileMenu()).not.toBeNull();
  };
  // jsdom does not navigate; the click still reaches the menu.
  const press = async (link: HTMLAnchorElement) => {
    link.addEventListener('click', (event) => event.preventDefault());
    link.click();
    await fixture.whenStable();
  };
  const labels = (links: NodeListOf<HTMLAnchorElement>) =>
    Array.from(links, (link) => link.textContent?.trim());
  const order = ['About', 'Projects', 'Experience', 'Certifications', 'Blog', 'Testimonials'];

  it('lists the sections in the home order, on desktop and on phones (U-NV-1, Spec 007 RF-22)', async () => {
    expect(labels(element().querySelectorAll('header > nav article a'))).toEqual(order);
    await openMenu();
    expect(labels(mobileMenu()!.querySelectorAll(':scope > a'))).toEqual(order);
  });

  it('takes Certifications and Blog to their home sections (U-NV-2, RF-23, RF-24)', () => {
    expect(element().querySelector('a[href="/#certifications"]')?.textContent?.trim()).toBe(
      'Certifications',
    );
    expect(element().querySelector('a[href="/#blog"]')?.textContent?.trim()).toBe('Blog');
    expect(element().querySelector('a[href="/blog"]')).toBeNull();
  });

  it('keeps the section links pointing at the home, so they work from any page', () => {
    expect(component.navLinks.length).toBe(6);
    component.navLinks.forEach((link) => expect(link.href).toMatch(/^\/#[a-z]+$/));
  });

  it('closes the phone menu when a section is chosen (U-NV-4, RF-25)', async () => {
    await openMenu();
    await press(mobileMenu()!.querySelector<HTMLAnchorElement>('a[href="/#certifications"]')!);
    expect(mobileMenu()).toBeNull();
    expect(element().querySelector('nav > button i')?.className).toContain('fa-bars');
  });

  it('closes the phone menu when the contact button or a language is chosen (U-NV-5, RF-25)', async () => {
    await openMenu();
    await press(mobileMenu()!.querySelector<HTMLAnchorElement>('app-button a')!);
    expect(mobileMenu()).toBeNull();

    await openMenu();
    await press(mobileMenu()!.querySelector<HTMLAnchorElement>('app-language-switch a')!);
    expect(mobileMenu()).toBeNull();
  });

  it('keeps the phone menu open when the click is not on an option (U-NV-6)', async () => {
    await openMenu();
    mobileMenu()!.click();
    await fixture.whenStable();
    expect(mobileMenu()).not.toBeNull();
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

  it('translates the links and keeps them on the Spanish pages (RF-131, U-NV-3)', () => {
    expect(element.querySelector('a[href="/es#about"]')?.textContent?.trim()).toBe('Sobre mí');
    expect(element.querySelector('a[href="/es#blog"]')?.textContent?.trim()).toBe('Blog');
    expect(element.querySelector('a[href="/es#certifications"]')?.textContent?.trim()).toBe(
      'Certificaciones',
    );
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

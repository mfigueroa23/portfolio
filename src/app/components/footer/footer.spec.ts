import { PlatformLocation } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Footer } from './footer';

describe('Footer', () => {
  let component: Footer;
  let fixture: ComponentFixture<Footer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
    }).compileComponents();

    fixture = TestBed.createComponent(Footer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('Footer in Spanish', () => {
  it('translates its texts and links to the Spanish home', async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [{ provide: PlatformLocation, useValue: { pathname: '/es' } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(Footer);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Todos los derechos reservados.');
    expect(element.querySelector('a[href="/es#about"]')?.textContent?.trim()).toBe('Sobre mí');
  });
});

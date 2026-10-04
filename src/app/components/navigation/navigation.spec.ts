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

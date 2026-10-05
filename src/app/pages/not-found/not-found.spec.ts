import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotFound } from './not-found';

describe('NotFound', () => {
  it('shows the not-found page and answers 404', async () => {
    const init: ResponseInit = { status: 200 };
    await TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [provideRouter([]), { provide: RESPONSE_INIT, useValue: init }],
    }).compileComponents();
    const fixture = TestBed.createComponent(NotFound);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(init.status).toBe(404);
    expect(element.querySelector('h1')?.textContent).toContain('Page not found');
    expect(element.querySelector('a[href="/"]')).not.toBeNull();
  });
});

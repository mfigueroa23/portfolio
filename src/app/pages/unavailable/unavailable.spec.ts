import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Unavailable } from './unavailable';

describe('Unavailable', () => {
  it('shows the error page and answers 503', async () => {
    const init: ResponseInit = { status: 200 };
    await TestBed.configureTestingModule({
      imports: [Unavailable],
      providers: [provideRouter([]), { provide: RESPONSE_INIT, useValue: init }],
    }).compileComponents();
    const fixture = TestBed.createComponent(Unavailable);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(init.status).toBe(503);
    expect(element.querySelector('h1')?.textContent).toContain('Temporarily unavailable');
    expect(element.querySelector('a[href="/"]')).not.toBeNull();
  });
});

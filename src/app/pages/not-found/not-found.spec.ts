import { PlatformLocation } from '@angular/common';
import { MOCK_PLATFORM_LOCATION_CONFIG, MockPlatformLocation } from '@angular/common/testing';
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

  it('shows the page in Spanish under /es and keeps the path for the switch (RF-125)', async () => {
    const init: ResponseInit = { status: 200 };
    await TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [
        provideRouter([]),
        { provide: RESPONSE_INIT, useValue: init },
        {
          provide: MOCK_PLATFORM_LOCATION_CONFIG,
          useValue: { startUrl: 'http://localhost/es/no-such-page' },
        },
        { provide: PlatformLocation, useClass: MockPlatformLocation },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(NotFound);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(init.status).toBe(404);
    expect(element.querySelector('h1')?.textContent).toContain('Página no encontrada');
    expect(element.querySelector('a[href="/es"]')?.textContent).toContain('Volver al inicio');
  });
});

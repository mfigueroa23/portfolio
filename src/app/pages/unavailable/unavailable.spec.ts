import { PlatformLocation } from '@angular/common';
import { MOCK_PLATFORM_LOCATION_CONFIG, MockPlatformLocation } from '@angular/common/testing';
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

  it('shows the page in Spanish under /es and keeps the path for the switch (RF-125)', async () => {
    const init: ResponseInit = { status: 200 };
    await TestBed.configureTestingModule({
      imports: [Unavailable],
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
    const fixture = TestBed.createComponent(Unavailable);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(init.status).toBe(503);
    expect(element.querySelector('h1')?.textContent).toContain('No disponible por ahora');
    expect(element.querySelector('a[href="/es"]')?.textContent).toContain('Volver al inicio');
  });
});

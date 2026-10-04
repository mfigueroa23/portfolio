import { ComponentFixture, TestBed } from '@angular/core/testing';
import { formatInstant } from '../../core/utils/dates';
import { LocalDate } from './local-date';

describe('LocalDate', () => {
  const iso = '2026-10-03T23:30:00.000Z';

  const render = async (): Promise<ComponentFixture<LocalDate>> => {
    await TestBed.configureTestingModule({ imports: [LocalDate] }).compileComponents();
    const fixture = TestBed.createComponent(LocalDate);
    fixture.componentRef.setInput('iso', iso);
    return fixture;
  };

  it('keeps the instant in machine-readable form', async () => {
    const fixture = await render();
    await fixture.whenStable();
    const time: HTMLTimeElement = fixture.nativeElement.querySelector('time');
    expect(time.getAttribute('datetime')).toBe(iso);
  });

  it('renders the UTC date first, as the server does', async () => {
    const fixture = await render();
    fixture.detectChanges();
    const time: HTMLTimeElement = fixture.nativeElement.querySelector('time');
    expect(time.textContent?.trim()).toBe(formatInstant(iso, 'UTC'));
  });

  it("switches to the browser's time zone after rendering", async () => {
    const fixture = await render();
    await fixture.whenStable();
    fixture.detectChanges();
    const time: HTMLTimeElement = fixture.nativeElement.querySelector('time');
    expect(time.textContent?.trim()).toBe(formatInstant(iso));
  });
});

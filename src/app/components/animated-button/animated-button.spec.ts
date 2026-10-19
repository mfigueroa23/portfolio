import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnimatedButton } from './animated-button';

describe('AnimatedButton', () => {
  let component: AnimatedButton;
  let fixture: ComponentFixture<AnimatedButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimatedButton],
    }).compileComponents();

    fixture = TestBed.createComponent(AnimatedButton);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits pressed with its button when it has no href (Spec 006 plan D13)', () => {
    const pressed = vi.fn();
    component.pressed.subscribe(pressed);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    button.click();

    expect(pressed).toHaveBeenCalledExactlyOnceWith(button);
  });

  it('opens its href in a new tab instead of emitting pressed', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const pressed = vi.fn();
    component.pressed.subscribe(pressed);
    fixture.componentRef.setInput('href', 'https://example.com/file.pdf');
    await fixture.whenStable();

    fixture.nativeElement.querySelector('button').click();

    expect(open).toHaveBeenCalledWith('https://example.com/file.pdf', '_blank', 'noopener');
    expect(pressed).not.toHaveBeenCalled();
    open.mockRestore();
  });
});

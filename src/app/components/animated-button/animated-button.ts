import { Component, ElementRef, inject, input, output } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-animated-button',
  styleUrl: './animated-button.css',
  templateUrl: './animated-button.html',
})
export class AnimatedButton {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  public readonly href = input<string>('');
  public readonly download = input<string>('');
  /** Without `href`, a click emits the button so the caller can return focus to it (plan D13). */
  public readonly pressed = output<HTMLButtonElement>();
  protected onClick(): void {
    if (!this.href()) {
      const button = this.host.nativeElement.querySelector('button');
      if (button) this.pressed.emit(button);
      return;
    }
    window.open(this.href(), '_blank', 'noopener');
  }
}

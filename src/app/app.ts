import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Assistant } from './components/assistant/assistant';
import { Navigation } from './components/navigation/navigation';
import { Footer } from './components/footer/footer';
import { LanguageService } from './core/i18n/language.service';

@Component({
  imports: [RouterOutlet, Navigation, Footer, Assistant],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  constructor() {
    // Declares the page language on every page, including the not-found one (RF-136).
    inject(LanguageService);
  }
}

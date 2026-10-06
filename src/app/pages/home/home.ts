import { Component, inject } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { SeoService } from '../../core/services/seo.service';
import { About } from '../../sections/about/about';
import { Projects } from '../../sections/projects/projects';
import { Experience } from '../../sections/experience/experience';
import { Contact } from '../../sections/contact/contact';
import { Hero } from '../../sections/hero/hero';
import { Testimonials } from '../../sections/testimonials/testimonials';

@Component({
  imports: [Hero, About, Projects, Experience, Testimonials, Contact],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
  constructor() {
    // The prerendered home of each language declares its own title, canonical URL and
    // language versions (RF-136 to RF-142); in English they match `index.html`.
    const { homeTitle, homeDescription } = inject(LanguageService).m().seo;
    inject(SeoService).set({
      title: homeTitle,
      description: homeDescription,
      path: '/',
      fullTitle: true,
    });
  }
}

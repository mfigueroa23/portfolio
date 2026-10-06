import { Component, computed, inject } from '@angular/core';
import { Button } from '../../components/button/button';
import { AnimatedButton } from '../../components/animated-button/animated-button';
import { SocialLink, Technology } from '../../core/interfaces/content';
import { LanguageService } from '../../core/i18n/language.service';
import { ContentService } from '../../core/services/content.service';

@Component({
  imports: [Button, AnimatedButton],
  selector: 'app-hero',
  styleUrl: './hero.css',
  templateUrl: './hero.html',
})
export class Hero {
  public greenDots = Array.from({ length: 30 }, () => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animation: `slow-drift ${15 + Math.random() * 30}s ease-in-out infinite`,
    animationDelay: `${Math.random() * 2}s`,
  }));
  protected readonly language = inject(LanguageService);
  protected readonly m = this.language.m;
  private readonly content = inject(ContentService);
  public readonly socialLinks = this.content.collection<SocialLink>('social-links');
  public readonly technologies = this.content.collection<Technology>('technologies');
  // Rendered twice so the marquee animation loops without a visible gap.
  public readonly techStack = computed(() => [...this.technologies(), ...this.technologies()]);
}

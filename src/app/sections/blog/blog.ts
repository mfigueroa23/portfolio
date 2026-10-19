import { Component, computed, inject } from '@angular/core';
import { PostCard } from '../../components/post-card/post-card';
import { LanguageService } from '../../core/i18n/language.service';
import { ContentService } from '../../core/services/content.service';

/** How many of the latest posts the home shows (Spec 007 RF-11). */
const HOME_POSTS = 2;

@Component({
  imports: [PostCard],
  selector: 'app-blog',
  styleUrl: './blog.css',
  templateUrl: './blog.html',
})
export class Blog {
  protected readonly language = inject(LanguageService);
  protected readonly m = this.language.m;
  // The API returns the newest posts first (plan D1).
  private readonly latest = inject(ContentService).latestPosts();
  public readonly posts = computed(() => this.latest().slice(0, HOME_POSTS));
}

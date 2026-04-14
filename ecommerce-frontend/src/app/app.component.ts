import { Component, signal, AfterViewInit, ElementRef, viewChild, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { ProductCategoryMenu } from './components/product-category-menu/product-category-menu.component';
import { SearchComponent } from './components/search/search.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CartStatusComponent } from './components/cart-status/cart-status.component';
import { LoginStatusComponent } from './components/login-status/login-status.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, ProductCategoryMenu, SearchComponent, NgbModule, CartStatusComponent, LoginStatusComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class App implements AfterViewInit {
  protected readonly title = signal('angular-ecommerce');
  mobileMenuOpen = signal(false);
  showVideoIntro = signal(true);
  videoPaused = signal(false);

  private platformId = inject(PLATFORM_ID);
  private isMobile = signal(this.detectMobile());
  videoSrc = computed(() => this.isMobile() ? 'grok-video.mp4' : 'desktop_intro_video.mp4');

  private detectMobile(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return window.innerWidth < 992;
  }

  private introVideo = viewChild<ElementRef<HTMLVideoElement>>('introVideo');

  ngAfterViewInit(): void {
    this.tryAutoplay();
  }

  private tryAutoplay(): void {
    const videoEl = this.introVideo()?.nativeElement;
    if (!videoEl) return;

    // Explicitly set muted via JS — some browsers ignore the HTML attribute
    videoEl.muted = true;
    videoEl.playsInline = true;

    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay blocked — show play button
        this.videoPaused.set(true);
      });
    }
  }

  togglePlayback(video: HTMLVideoElement): void {
    if (video.paused) {
      video.play().then(() => this.videoPaused.set(false));
    } else {
      video.pause();
      this.videoPaused.set(true);
    }
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  dismissVideo() {
    this.showVideoIntro.set(false);
  }

  onVideoEnded() {
    this.showVideoIntro.set(false);
  }
}



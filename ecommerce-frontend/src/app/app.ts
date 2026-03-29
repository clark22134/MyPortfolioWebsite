import { Component, signal, AfterViewInit, ElementRef, viewChild } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { ProductCategoryMenu } from './components/product-category-menu/product-category-menu';
import { SearchComponent } from './components/search/search';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CartStatusComponent } from './components/cart-status/cart-status';
import { LoginStatusComponent } from './components/login-status/login-status';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, ProductCategoryMenu, SearchComponent, NgbModule, CartStatusComponent, LoginStatusComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements AfterViewInit {
  protected readonly title = signal('angular-ecommerce');
  mobileMenuOpen = signal(false);
  showVideoIntro = signal(true);
  videoPaused = signal(false);

  private introVideo = viewChild<ElementRef<HTMLVideoElement>>('introVideo');

  ngAfterViewInit(): void {
    this.tryAutoplay();
  }

  private tryAutoplay(): void {
    const videoEl = this.introVideo()?.nativeElement;
    if (!videoEl) return;

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



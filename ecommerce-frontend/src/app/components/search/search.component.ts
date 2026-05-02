import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search',
  imports: [],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css',
})
export class SearchComponent {
  constructor(private router: Router) {}

  doSearch(value: string) {
    const keyword = (value ?? '').trim();
    if (!keyword) {
      // Empty input: stay on the catalog instead of navigating to /search/
      this.router.navigateByUrl('/products');
      return;
    }
    // encodeURIComponent so spaces and special characters survive the URL.
    this.router.navigateByUrl(`/search/${encodeURIComponent(keyword)}`);
  }
}

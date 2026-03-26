import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search',
  imports: [],
  templateUrl: './search.html',
  styleUrls: ['./search.css'],
})
export class SearchComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    // Component initialization
  }

  doSearch(value: string) {
    console.log(`value=${value}`);
    this.router.navigateByUrl(`/search/${value}`);
  }


}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';
import { Product } from '../common/product.model';
import { ProductCategory } from '../common/product-category.model';

@Injectable({
  providedIn: 'root',
})
export class ProductService {

  private readonly baseUrl = '/api/products';
  private readonly httpClient = inject(HttpClient);
  private readonly categoryUrl = '/api/product-category';

  getProduct(theProductId: number): Observable<Product> {
    const productUrl = `${this.baseUrl}/${theProductId}`;
    return this.httpClient.get<Product>(productUrl);
  }

  getProductsByIds(ids: number[]): Observable<Product[]> {
    if (ids.length === 0) {
      return of([]);
    }
    return forkJoin(ids.map(id => this.getProduct(id)));
  }

  getProducts(searchUrl: string): Observable<Product[]> {
    // Spring Data REST omits `_embedded` entirely when a page has zero results.
    return this.httpClient.get<GetResponseProducts>(searchUrl).pipe(
      map(response => response._embedded?.products ?? [])
    );
  }

  getProductListPaginate(thePage: number,
                        thePageSize: number,
                        theCategoryId: number): Observable<GetResponseProducts> {
    // Spring Data REST pages are 0-based, ngb-pagination is 1-based
    const searchUrl = `${this.baseUrl}/search/findByCategoryId?id=${theCategoryId}`
                    + `&page=${thePage - 1}&size=${thePageSize}`;
    return this.httpClient.get<GetResponseProducts>(searchUrl);
  }

  getProductList(theCategoryId: number): Observable<Product[]> {
    return this.getProducts(`${this.baseUrl}/search/findByCategoryId?id=${theCategoryId}`);
  }

  searchProducts(theKeyword: string): Observable<Product[]> {
    return this.getProducts(`${this.baseUrl}/search/findByNameContainingIgnoreCase?name=${encodeURIComponent(theKeyword)}`);
  }

  searchProductsPaginate(thePage: number,
                        thePageSize: number,
                        theKeyword: string): Observable<GetResponseProducts> {
    const searchUrl = `${this.baseUrl}/search/findByNameContainingIgnoreCase?name=${encodeURIComponent(theKeyword)}`
                    + `&page=${thePage - 1}&size=${thePageSize}`;
    return this.httpClient.get<GetResponseProducts>(searchUrl);
  }

  getProductCategories(): Observable<ProductCategory[]> {
    return this.httpClient.get<GetResponseProductCategory>(this.categoryUrl).pipe(
      map(response => response._embedded.productCategory)
    );
  }
}

export interface GetResponseProducts {
  _embedded?: {
    products: Product[];
  },
  page: {
    size: number,
    totalElements: number,
    totalPages: number,
    number: number
  }
}

interface GetResponseProductCategory {
  _embedded: {
    productCategory: ProductCategory[];
  };
}

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrderHistoryItem } from '../common/order-history';

@Injectable({ providedIn: 'root' })
export class OrderHistoryService {

  private apiUrl = '/api/orders';
  private http = inject(HttpClient);

  getOrderHistory(): Observable<OrderHistoryItem[]> {
    return this.http.get<OrderHistoryItem[]>(this.apiUrl);
  }
}

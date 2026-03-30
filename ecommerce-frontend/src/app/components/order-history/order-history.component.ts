import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderHistoryService } from '../../services/order-history.service';
import { OrderHistoryItem } from '../../common/order-history.model';

type SortField = 'date-desc' | 'date-asc' | 'price-desc' | 'price-asc' | 'qty-desc' | 'qty-asc';

@Component({
  selector: 'app-order-history',
  imports: [CurrencyPipe, DatePipe, RouterLink, FormsModule],
  templateUrl: './order-history.component.html',
  styleUrl: './order-history.component.css',
})
export class OrderHistoryComponent implements OnInit {

  private orderHistoryService = inject(OrderHistoryService);

  allOrders = signal<OrderHistoryItem[]>([]);
  searchTerm = signal('');
  sortField = signal<SortField>('date-desc');
  expandedOrderId = signal<number | null>(null);
  loading = signal(true);

  filteredOrders = computed(() => {
    let orders = this.allOrders();
    const term = this.searchTerm().toLowerCase().trim();

    // Filter
    if (term) {
      orders = orders.filter(o =>
        o.orderTrackingNumber.toLowerCase().includes(term) ||
        (o.status && o.status.toLowerCase().includes(term)) ||
        o.totalPrice.toString().includes(term) ||
        new Date(o.dateCreated).toLocaleDateString().includes(term)
      );
    }

    // Sort
    const sort = this.sortField();
    orders = [...orders].sort((a, b) => {
      switch (sort) {
        case 'date-desc': return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
        case 'date-asc': return new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime();
        case 'price-desc': return b.totalPrice - a.totalPrice;
        case 'price-asc': return a.totalPrice - b.totalPrice;
        case 'qty-desc': return b.totalQuantity - a.totalQuantity;
        case 'qty-asc': return a.totalQuantity - b.totalQuantity;
        default: return 0;
      }
    });

    return orders;
  });

  ngOnInit(): void {
    this.orderHistoryService.getOrderHistory().subscribe({
      next: (orders) => {
        this.allOrders.set(orders);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  toggleExpand(orderId: number): void {
    this.expandedOrderId.set(this.expandedOrderId() === orderId ? null : orderId);
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  onSortChange(value: string): void {
    this.sortField.set(value as SortField);
  }
}

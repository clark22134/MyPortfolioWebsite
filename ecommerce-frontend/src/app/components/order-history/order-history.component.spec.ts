import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { OrderHistoryComponent } from './order-history.component';
import { OrderHistoryItem } from '../../common/order-history.model';

const mockOrders: OrderHistoryItem[] = [
  {
    id: 1,
    orderTrackingNumber: 'TRACK-001',
    totalPrice: 49.99,
    totalQuantity: 3,
    dateCreated: '2024-06-01T10:00:00',
    status: 'SHIPPED',
    orderItems: []
  } as any,
  {
    id: 2,
    orderTrackingNumber: 'TRACK-002',
    totalPrice: 129.99,
    totalQuantity: 1,
    dateCreated: '2024-07-15T14:30:00',
    status: 'DELIVERED',
    orderItems: []
  } as any,
  {
    id: 3,
    orderTrackingNumber: 'TRACK-003',
    totalPrice: 19.99,
    totalQuantity: 5,
    dateCreated: '2024-05-10T08:00:00',
    status: 'PENDING',
    orderItems: []
  } as any
];

describe('OrderHistoryComponent', () => {
  let component: OrderHistoryComponent;
  let fixture: ComponentFixture<OrderHistoryComponent>;

  beforeEach(async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('test@example.com');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [OrderHistoryComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(OrderHistoryComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start in loading state', () => {
    expect(component.loading()).toBe(true);
  });

  it('should start with empty orders', () => {
    expect(component.allOrders()).toEqual([]);
  });

  it('should default sort to date-desc', () => {
    expect(component.sortField()).toBe('date-desc');
  });

  it('should have no expanded order initially', () => {
    expect(component.expandedOrderId()).toBeNull();
  });

  it('should filter orders by tracking number', () => {
    component.allOrders.set(mockOrders);
    component.searchTerm.set('TRACK-001');
    const filtered = component.filteredOrders();
    expect(filtered.length).toBe(1);
    expect(filtered[0].orderTrackingNumber).toBe('TRACK-001');
  });

  it('should filter orders by status', () => {
    component.allOrders.set(mockOrders);
    component.searchTerm.set('DELIVERED');
    const filtered = component.filteredOrders();
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe(2);
  });

  it('should sort orders by date descending by default', () => {
    component.allOrders.set(mockOrders);
    const filtered = component.filteredOrders();
    expect(filtered[0].id).toBe(2);
    expect(filtered[2].id).toBe(3);
  });

  it('should sort orders by date ascending', () => {
    component.allOrders.set(mockOrders);
    component.sortField.set('date-asc');
    const filtered = component.filteredOrders();
    expect(filtered[0].id).toBe(3);
    expect(filtered[2].id).toBe(2);
  });

  it('should sort orders by price descending', () => {
    component.allOrders.set(mockOrders);
    component.sortField.set('price-desc');
    const filtered = component.filteredOrders();
    expect(filtered[0].totalPrice).toBe(129.99);
    expect(filtered[2].totalPrice).toBe(19.99);
  });

  it('should sort orders by quantity ascending', () => {
    component.allOrders.set(mockOrders);
    component.sortField.set('qty-asc');
    const filtered = component.filteredOrders();
    expect(filtered[0].totalQuantity).toBe(1);
    expect(filtered[2].totalQuantity).toBe(5);
  });

  it('should toggle expand for an order', () => {
    component.toggleExpand(1);
    expect(component.expandedOrderId()).toBe(1);
    component.toggleExpand(1);
    expect(component.expandedOrderId()).toBeNull();
  });

  it('should switch expanded order when toggling a different one', () => {
    component.toggleExpand(1);
    expect(component.expandedOrderId()).toBe(1);
    component.toggleExpand(2);
    expect(component.expandedOrderId()).toBe(2);
  });

  it('should update search term', () => {
    component.onSearchChange('test query');
    expect(component.searchTerm()).toBe('test query');
  });

  it('should update sort field', () => {
    component.onSortChange('price-asc');
    expect(component.sortField()).toBe('price-asc');
  });

  it('should return all orders when search is empty', () => {
    component.allOrders.set(mockOrders);
    component.searchTerm.set('');
    expect(component.filteredOrders().length).toBe(3);
  });
});

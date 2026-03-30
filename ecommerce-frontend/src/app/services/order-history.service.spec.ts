import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrderHistoryService } from './order-history.service';

describe('OrderHistoryService', () => {
  let service: OrderHistoryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(OrderHistoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get order history', () => {
    const mockOrders = [
      {
        id: 1,
        orderTrackingNumber: 'track-001',
        totalPrice: 29.99,
        totalQuantity: 2,
        status: 'COMPLETED',
        dateCreated: '2024-01-01',
        orderItems: [],
        shippingAddress: { id: 1, street: '123 Main', city: 'NYC', state: 'NY', country: 'US', zipCode: '10001' },
        billingAddress: { id: 2, street: '123 Main', city: 'NYC', state: 'NY', country: 'US', zipCode: '10001' }
      }
    ];

    service.getOrderHistory().subscribe((orders: any[]) => {
      expect(orders.length).toBe(1);
      expect(orders[0].orderTrackingNumber).toBe('track-001');
      expect(orders[0].totalPrice).toBe(29.99);
    });

    const req = httpMock.expectOne('/api/orders');
    expect(req.request.method).toBe('GET');
    req.flush(mockOrders);
  });

  it('should handle empty order list', () => {
    service.getOrderHistory().subscribe((orders: any[]) => {
      expect(orders.length).toBe(0);
    });

    const req = httpMock.expectOne('/api/orders');
    req.flush([]);
  });
});

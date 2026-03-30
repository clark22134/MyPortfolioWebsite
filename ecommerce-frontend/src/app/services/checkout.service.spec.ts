import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CheckoutService } from './checkout';
import { Purchase } from '../common/purchase.model';
import { Customer } from '../common/customer.model';
import { Order } from '../common/order.model';
import { Address } from '../common/address.model';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CheckoutService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should place an order via POST', () => {
    const purchase = new Purchase();
    purchase.customer = new Customer();
    purchase.order = new Order();
    purchase.shippingAddress = new Address();
    purchase.billingAddress = new Address();
    purchase.orderItems = [];

    service.placeOrder(purchase).subscribe(response => {
      expect(response.orderTrackingNumber).toBe('track-123');
    });

    const req = httpMock.expectOne('/api/checkout/purchase');
    expect(req.request.method).toBe('POST');
    req.flush({ orderTrackingNumber: 'track-123' });
  });
});

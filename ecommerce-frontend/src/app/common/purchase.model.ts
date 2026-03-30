import { Address } from "./address.model";
import { Customer } from "./customer.model";
import { Order } from "./order.model";
import { OrderItem } from "./order-item.model";

export class Purchase {
  customer!: Customer;
  shippingAddress!: Address;
  billingAddress!: Address;
  order!: Order;
  orderItems!: OrderItem[];
}

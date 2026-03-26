export interface OrderHistoryItem {
  id: number;
  orderTrackingNumber: string;
  totalPrice: number;
  totalQuantity: number;
  status: string;
  dateCreated: string;
  orderItems: OrderHistoryLineItem[];
  shippingAddress: HistoryAddress;
  billingAddress: HistoryAddress;
}

export interface OrderHistoryLineItem {
  id: number;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  productId: number;
  productName: string;
}

export interface HistoryAddress {
  id: number;
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

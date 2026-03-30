import { Product } from "./product";

export class CartItem {
  id: number;
  name: string;
  unitPrice: number;
  originalPrice: number;
  quantity: number;
  imageUrl: string;

  constructor(product: Product) {
    this.id = product.id;
    this.name = product.name;
    this.unitPrice = product.unitPrice;
    this.originalPrice = product.unitPrice;
    this.quantity = 1;
    this.imageUrl = product.imageUrl;
  }
}

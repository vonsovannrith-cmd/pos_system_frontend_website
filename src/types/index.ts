export type Me = { id: number; fullName: string; email: string; role: string };

export type Category = { id: number; name: string; description: string | null };

export type Product = {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  costPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  lowStock: boolean;
  active: boolean;
  categoryId: number | null;
  categoryName: string | null;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type OrderItem = {
  productId: number;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type Order = {
  id: number;
  orderNumber: string;
  cashierEmail: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  changeAmount: number;
  status: string;
  createdAt: string;
};
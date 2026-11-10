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
  cancelReason: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
};

export type OrderSummary = {
  id: number;
  orderNumber: string;
  cashierEmail: string;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
};

export type Settings = {
  storeName: string;
  address: string | null;
  phone: string | null;
  taxRate: number;
  usdToKhr: number;
  defaultLowStockThreshold: number;
};

export type SalesSummary = { orderCount: number; revenue: number; discount: number; tax: number };
export type CashierSales = { cashierEmail: string; orderCount: number; revenue: number };
export type ProductSales = {
  productId: number;
  productName: string;
  sku: string;
  quantity: number;
  revenue: number;
};
export type DailyPoint = { date: string; orders: number; revenue: number };
export type ChartPoint = { label: string; orders: number; revenue: number };

export type SalesReport = {
  from: string;
  to: string;
  summary: SalesSummary;
  byCashier: CashierSales[];
  byProduct: ProductSales[];
  daily: DailyPoint[];
};

export type Dashboard = {
  today: SalesSummary;
  month: SalesSummary;
  lowStockCount: number;
  topProducts: ProductSales[];
};

export type AppUser = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
};
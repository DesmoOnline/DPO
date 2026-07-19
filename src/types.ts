export interface QuantityBreak {
  minQty: number;
  discountPercent: number; // e.g., 5 for 5%
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  imageUrl: string;
  baseWholesalePrice: number; // The default price for wholesale customers
  isRestricted: boolean; // If true, only visible to approved customers in their allowed list
  quantityBreaks?: QuantityBreak[];
  category?: string;
  stock?: number;
}

export interface CustomerProfile {
  id: string;
  email: string;
  companyName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  approvedAt?: string;
  customPricing?: { [productId: string]: number }; // Custom pricing overrides for specific products
  allowedProducts?: string[]; // If a product is restricted, customer must have it here to see/order
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  originalPrice: number; // baseWholesalePrice or customPricing
  appliedDiscountPercent: number; // from quantity break
  finalPricePerUnit: number; // originalPrice * (1 - discountPercent / 100)
  totalLineAmount: number;
}

export interface Order {
  id: string; // "INV-1001" etc
  customerId: string;
  customerEmail: string;
  companyName: string;
  items: OrderItem[];
  subtotal: number;
  gstAmount: number; // 10% in Australia
  totalAmount: number;
  status: "pending_payment" | "paid" | "shipped" | "cancelled";
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  notes?: string;
}

export interface GSTReportData {
  totalRevenue: number;
  totalGST: number;
  totalSubtotal: number;
  orderCount: number;
  paidOrderCount: number;
  pendingOrderCount: number;
  byCustomer: { [companyName: string]: { subtotal: number; gst: number; total: number; count: number } };
  byMonth: { [month: string]: { subtotal: number; gst: number; total: number } };
}

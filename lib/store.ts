// Core type definitions — SKU-centric system

export interface SKU {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  supplierId: string;
  supplierCode: string;
  unitOfMeasure: string;
  costPrice: number | null;
  salePrice: number | null;
  weight: number | null;       // kg
  dimensions: string;          // e.g. "40×30×20 cm"
  barcode: string;
  minStockLevel: number | null;
  reorderPoint: number | null;
  leadTimeDays: number | null;
  status: "active" | "inactive" | "discontinued";
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  leadTimeDays: number;
  paymentTerms: string;
  currency: string;
  status: "active" | "inactive";
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockEntry {
  id: string;
  skuId: string;
  location: string;
  quantity: number;
  reservedQty: number;
  lastCountDate: string;
  updatedAt: string;
}

export interface ProjectItem {
  skuId: string;
  qtyRequired: number;
  qtyAllocated: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled";
  startDate: string | null;
  endDate: string | null;
  items: ProjectItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransportItem {
  skuId: string;
  qty: number;
}

export interface TransportJob {
  id: string;
  ref: string;
  items: TransportItem[];
  origin: string;
  destination: string;
  driver: string;
  trackingRef: string;
  status: "pending" | "in_transit" | "delivered" | "cancelled";
  scheduledDate: string | null;
  deliveredDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

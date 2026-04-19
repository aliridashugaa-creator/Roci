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

export type LocationType = "hq" | "depot" | "warehouse" | "store" | "port" | "other";

export interface SupplierLocation {
  id: string;
  type: LocationType;
  label: string;      // e.g. "London Warehouse"
  address: string;
  city: string;
  country: string;
  postcode: string;
  phone: string;
  isPrimary: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;    // kept for legacy / primary address
  country: string;
  locations: SupplierLocation[];
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
  clientName: string;
  supplierId: string;
  warehouseLocation: string;
  targetAddress: string;
  paymentTerms: string;
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
  projectId?: string;
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

// Notification type for the UI
export interface AppNotification {
  id: string;
  type: "low_stock" | "out_of_stock" | "reorder";
  skuId: string;
  skuCode: string;
  skuName: string;
  currentQty: number;
  threshold: number;
  locationLabel: string;
}

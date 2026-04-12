// Type definitions only — runtime data is stored in Upstash Redis via lib/db.ts

export interface InventoryItem {
  sku: string;
  quantity: number;
  lastUpdated: string;
}

export interface PalletRecord {
  palletId: string;
  location: string;
  sku: string;
  lastMoved: string;
}

export interface Transaction {
  id: number;
  timestamp: string;
  event: string;
  details: Record<string, unknown>;
}

export interface TransferRequest {
  id: number;
  sku: string;
  quantity: number;
  from: string;
  to: string;
  status: "pending" | "in_transit" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface Discrepancy {
  id: number;
  sku: string;
  expectedQty: number;
  actualQty: number;
  location: string;
  status: "open" | "investigating" | "resolved";
  notes: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface GoodsInDoc {
  docId: string;
  sku: string;
  quantity: number;
  supplier: string;
  receivedAt: string;
  palletId: string;
}

export type LoadStatus =
  | "booked"
  | "collected"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "pod_received"
  | "failed"
  | "rebooked"
  | "cancelled";

export type PodStatus = "pending" | "chased" | "received";
export type LoadSource = "email" | "whatsapp" | "phone" | "manual";

export interface EtaUpdate {
  timestamp: string;
  eta: string;
  note: string;
}

export interface Load {
  id: number;
  reference: string;
  source: LoadSource;
  customer: string;
  origin: string;
  destination: string;
  collectionDate: string;
  eta: string;
  status: LoadStatus;
  subcontractor: string;
  subcontractorRef: string;
  subcontractorReconciled: boolean;
  podStatus: PodStatus;
  podReceivedAt?: string;
  etaUpdates: EtaUpdate[];
  notes: string;
  rebookedFromId?: number;
  createdAt: string;
  updatedAt: string;
}

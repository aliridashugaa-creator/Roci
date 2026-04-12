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

// ----------------------------
// Load Admin
// ----------------------------

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

interface Store {
  inventory: Map<string, InventoryItem>;
  palletLocations: Map<string, PalletRecord>;
  transactions: Transaction[];
  transferRequests: TransferRequest[];
  discrepancies: Discrepancy[];
  goodsInDocs: GoodsInDoc[];
  loads: Load[];
  nextTxId: number;
  seeded: boolean;
}

const store: Store = {
  inventory: new Map(),
  palletLocations: new Map(),
  transactions: [],
  transferRequests: [],
  discrepancies: [],
  goodsInDocs: [],
  loads: [],
  nextTxId: 1,
  seeded: false,
};

export function logEvent(event: string, details: Record<string, unknown>) {
  store.transactions.unshift({
    id: store.nextTxId++,
    timestamp: new Date().toISOString(),
    event,
    details,
  });
  if (store.transactions.length > 200) store.transactions.pop();
}

export function seedStore() {
  if (store.seeded) return;
  store.seeded = true;

  const now = new Date().toISOString();
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();

  [
    { sku: "SKU-001", quantity: 150 },
    { sku: "SKU-002", quantity: 320 },
    { sku: "SKU-003", quantity: 75 },
    { sku: "SKU-004", quantity: 200 },
    { sku: "SKU-005", quantity: 50 },
  ].forEach(({ sku, quantity }) =>
    store.inventory.set(sku, { sku, quantity, lastUpdated: now })
  );

  [
    { palletId: "PLT-001", location: "A-01", sku: "SKU-001" },
    { palletId: "PLT-002", location: "A-02", sku: "SKU-002" },
    { palletId: "PLT-003", location: "B-01", sku: "SKU-003" },
    { palletId: "PLT-004", location: "RECEIVING", sku: "SKU-004" },
    { palletId: "PLT-005", location: "DISPATCH", sku: "SKU-005" },
  ].forEach((p) =>
    store.palletLocations.set(p.palletId, { ...p, lastMoved: now })
  );

  store.goodsInDocs.push(
    { docId: "GIN-001", sku: "SKU-001", quantity: 150, supplier: "Acme Supplies", receivedAt: now, palletId: "PLT-001" },
    { docId: "GIN-002", sku: "SKU-002", quantity: 320, supplier: "Global Parts Ltd", receivedAt: now, palletId: "PLT-002" }
  );

  store.transferRequests.push(
    { id: 1, sku: "SKU-001", quantity: 50, from: "A-01", to: "DISPATCH", status: "pending", createdAt: now, updatedAt: now },
    { id: 2, sku: "SKU-002", quantity: 100, from: "A-02", to: "B-03", status: "in_transit", createdAt: now, updatedAt: now },
    { id: 3, sku: "SKU-004", quantity: 200, from: "RECEIVING", to: "C-01", status: "completed", createdAt: now, updatedAt: now }
  );

  store.discrepancies.push(
    { id: 1, sku: "SKU-003", expectedQty: 100, actualQty: 75, location: "B-01", status: "investigating", notes: "Short pick on last count — raised with warehouse team", createdAt: now },
    { id: 2, sku: "SKU-005", expectedQty: 60, actualQty: 50, location: "DISPATCH", status: "open", notes: "Possible mis-pick during last outbound", createdAt: now }
  );

  // Seed loads
  store.loads.push(
    {
      id: 1,
      reference: "LOAD-001",
      source: "email",
      customer: "Tesco Distribution",
      origin: "Manchester DC",
      destination: "London Gatehouse",
      collectionDate: yesterday,
      eta: now,
      status: "in_transit",
      subcontractor: "FastFreight Ltd",
      subcontractorRef: "FF-9821",
      subcontractorReconciled: false,
      podStatus: "pending",
      etaUpdates: [],
      notes: "Booking received via email from logistics@tesco.com",
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: 2,
      reference: "LOAD-002",
      source: "whatsapp",
      customer: "Asda Logistics",
      origin: "Birmingham RDC",
      destination: "Leeds Central",
      collectionDate: yesterday,
      eta: yesterday,
      status: "delivered",
      subcontractor: "",
      subcontractorRef: "",
      subcontractorReconciled: false,
      podStatus: "chased",
      etaUpdates: [],
      notes: "WhatsApp booking from ops team. POD chased this morning.",
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: 3,
      reference: "LOAD-003",
      source: "email",
      customer: "Sainsbury's Supply Chain",
      origin: "Bristol NDC",
      destination: "Cardiff Store",
      collectionDate: yesterday,
      eta: yesterday,
      status: "failed",
      subcontractor: "Arrow Haulage",
      subcontractorRef: "AH-4412",
      subcontractorReconciled: false,
      podStatus: "pending",
      etaUpdates: [],
      notes: "Failed delivery — customer refused. Needs rebooking.",
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: 4,
      reference: "LOAD-004",
      source: "manual",
      customer: "Marks & Spencer",
      origin: "Liverpool DC",
      destination: "Edinburgh Store",
      collectionDate: tomorrow,
      eta: tomorrow,
      status: "booked",
      subcontractor: "",
      subcontractorRef: "",
      subcontractorReconciled: false,
      podStatus: "pending",
      etaUpdates: [],
      notes: "Manually entered from phone call with M&S transport desk.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 5,
      reference: "LOAD-005",
      source: "whatsapp",
      customer: "Waitrose Distribution",
      origin: "Southampton DC",
      destination: "Bristol RDC",
      collectionDate: now,
      eta: tomorrow,
      status: "out_for_delivery",
      subcontractor: "SunExpress Freight",
      subcontractorRef: "SEF-771",
      subcontractorReconciled: false,
      podStatus: "pending",
      etaUpdates: [{ timestamp: now, eta: tomorrow, note: "Traffic delay on M4 — updated ETA by 2hrs" }],
      notes: "ETA updated due to M4 incident.",
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: 6,
      reference: "LOAD-006",
      source: "email",
      customer: "Co-op Logistics",
      origin: "Manchester DC",
      destination: "Sheffield Hub",
      collectionDate: yesterday,
      eta: yesterday,
      status: "pod_received",
      subcontractor: "NorthRoute Ltd",
      subcontractorRef: "NR-3302",
      subcontractorReconciled: true,
      podStatus: "received",
      podReceivedAt: now,
      etaUpdates: [],
      notes: "Completed and reconciled.",
      createdAt: yesterday,
      updatedAt: now,
    }
  );

  logEvent("SYSTEM", { message: "Store initialised with seed data" });
}

export default store;

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

interface Store {
  inventory: Map<string, InventoryItem>;
  palletLocations: Map<string, PalletRecord>;
  transactions: Transaction[];
  transferRequests: TransferRequest[];
  discrepancies: Discrepancy[];
  goodsInDocs: GoodsInDoc[];
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
    {
      docId: "GIN-001",
      sku: "SKU-001",
      quantity: 150,
      supplier: "Acme Supplies",
      receivedAt: now,
      palletId: "PLT-001",
    },
    {
      docId: "GIN-002",
      sku: "SKU-002",
      quantity: 320,
      supplier: "Global Parts Ltd",
      receivedAt: now,
      palletId: "PLT-002",
    }
  );

  store.transferRequests.push(
    {
      id: 1,
      sku: "SKU-001",
      quantity: 50,
      from: "A-01",
      to: "DISPATCH",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      sku: "SKU-002",
      quantity: 100,
      from: "A-02",
      to: "B-03",
      status: "in_transit",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 3,
      sku: "SKU-004",
      quantity: 200,
      from: "RECEIVING",
      to: "C-01",
      status: "completed",
      createdAt: now,
      updatedAt: now,
    }
  );

  store.discrepancies.push(
    {
      id: 1,
      sku: "SKU-003",
      expectedQty: 100,
      actualQty: 75,
      location: "B-01",
      status: "investigating",
      notes: "Short pick on last count — raised with warehouse team",
      createdAt: now,
    },
    {
      id: 2,
      sku: "SKU-005",
      expectedQty: 60,
      actualQty: 50,
      location: "DISPATCH",
      status: "open",
      notes: "Possible mis-pick during last outbound",
      createdAt: now,
    }
  );

  logEvent("SYSTEM", { message: "Store initialised with seed data" });
}

export default store;

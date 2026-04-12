import redis from "./redis";
import type {
  InventoryItem,
  PalletRecord,
  Transaction,
  TransferRequest,
  Discrepancy,
  GoodsInDoc,
  Load,
} from "./store";

// ── key registry ─────────────────────────────────────────────────────────────
const K = {
  inventory:    "roci:inventory",
  pallets:      "roci:pallets",
  transactions: "roci:transactions",
  transfers:    "roci:transfers",
  discrepancies:"roci:discrepancies",
  goodsInDocs:  "roci:goodsInDocs",
  loads:        "roci:loads",
  seeded:       "roci:seeded",
  nextTxId:     "roci:nextTxId",
} as const;

// ── generic helpers ──────────────────────────────────────────────────────────
async function getList<T>(key: string): Promise<T[]> {
  return (await redis.get<T[]>(key)) ?? [];
}

async function setList<T>(key: string, value: T[]): Promise<void> {
  await redis.set(key, value);
}

// ── db API ───────────────────────────────────────────────────────────────────
export const db = {
  // inventory
  getInventory:     () => getList<InventoryItem>(K.inventory),
  setInventory:     (v: InventoryItem[]) => setList(K.inventory, v),

  // pallets
  getPallets:       () => getList<PalletRecord>(K.pallets),
  setPallets:       (v: PalletRecord[]) => setList(K.pallets, v),

  // transactions
  getTransactions:  () => getList<Transaction>(K.transactions),
  setTransactions:  (v: Transaction[]) => setList(K.transactions, v),

  // transfers
  getTransfers:     () => getList<TransferRequest>(K.transfers),
  setTransfers:     (v: TransferRequest[]) => setList(K.transfers, v),

  // discrepancies
  getDiscrepancies: () => getList<Discrepancy>(K.discrepancies),
  setDiscrepancies: (v: Discrepancy[]) => setList(K.discrepancies, v),

  // goods-in
  getGoodsInDocs:   () => getList<GoodsInDoc>(K.goodsInDocs),
  setGoodsInDocs:   (v: GoodsInDoc[]) => setList(K.goodsInDocs, v),

  // loads
  getLoads:         () => getList<Load>(K.loads),
  setLoads:         (v: Load[]) => setList(K.loads, v),
};

// ── event log ────────────────────────────────────────────────────────────────
export async function logEvent(
  event: string,
  details: Record<string, unknown>
): Promise<void> {
  const id = await redis.incr(K.nextTxId);
  const txn: Transaction = { id, timestamp: new Date().toISOString(), event, details };
  const txns = await db.getTransactions();
  txns.unshift(txn);
  if (txns.length > 200) txns.splice(200);
  await db.setTransactions(txns);
}

// ── seed (runs once via atomic setnx) ────────────────────────────────────────
export async function seedIfNeeded(): Promise<void> {
  // setnx returns "OK" when set for the first time, null if key already exists
  const claimed = await redis.set(K.seeded, "1", { nx: true });
  if (!claimed) return;

  const now = new Date().toISOString();
  const tomorrow  = new Date(Date.now() + 86_400_000).toISOString();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();

  await db.setInventory([
    { sku: "SKU-001", quantity: 150, lastUpdated: now },
    { sku: "SKU-002", quantity: 320, lastUpdated: now },
    { sku: "SKU-003", quantity: 75,  lastUpdated: now },
    { sku: "SKU-004", quantity: 200, lastUpdated: now },
    { sku: "SKU-005", quantity: 50,  lastUpdated: now },
  ]);

  await db.setPallets([
    { palletId: "PLT-001", location: "A-01",      sku: "SKU-001", lastMoved: now },
    { palletId: "PLT-002", location: "A-02",      sku: "SKU-002", lastMoved: now },
    { palletId: "PLT-003", location: "B-01",      sku: "SKU-003", lastMoved: now },
    { palletId: "PLT-004", location: "RECEIVING", sku: "SKU-004", lastMoved: now },
    { palletId: "PLT-005", location: "DISPATCH",  sku: "SKU-005", lastMoved: now },
  ]);

  await db.setGoodsInDocs([
    { docId: "GIN-001", sku: "SKU-001", quantity: 150, supplier: "Acme Supplies",   receivedAt: now, palletId: "PLT-001" },
    { docId: "GIN-002", sku: "SKU-002", quantity: 320, supplier: "Global Parts Ltd", receivedAt: now, palletId: "PLT-002" },
  ]);

  await db.setTransfers([
    { id: 1, sku: "SKU-001", quantity: 50,  from: "A-01",      to: "DISPATCH", status: "pending",   createdAt: now, updatedAt: now },
    { id: 2, sku: "SKU-002", quantity: 100, from: "A-02",      to: "B-03",     status: "in_transit", createdAt: now, updatedAt: now },
    { id: 3, sku: "SKU-004", quantity: 200, from: "RECEIVING", to: "C-01",     status: "completed",  createdAt: now, updatedAt: now },
  ]);

  await db.setDiscrepancies([
    { id: 1, sku: "SKU-003", expectedQty: 100, actualQty: 75, location: "B-01",    status: "investigating", notes: "Short pick on last count — raised with warehouse team", createdAt: now },
    { id: 2, sku: "SKU-005", expectedQty: 60,  actualQty: 50, location: "DISPATCH", status: "open",          notes: "Possible mis-pick during last outbound",                createdAt: now },
  ]);

  await db.setLoads([
    { id: 1, reference: "LOAD-001", source: "email",    customer: "Tesco Distribution",     origin: "Manchester DC",  destination: "London Gatehouse", collectionDate: yesterday, eta: now,      status: "in_transit",       subcontractor: "FastFreight Ltd",    subcontractorRef: "FF-9821",  subcontractorReconciled: false, podStatus: "pending", etaUpdates: [], notes: "Booking received via email from logistics@tesco.com",          createdAt: yesterday, updatedAt: now },
    { id: 2, reference: "LOAD-002", source: "whatsapp", customer: "Asda Logistics",          origin: "Birmingham RDC", destination: "Leeds Central",    collectionDate: yesterday, eta: yesterday, status: "delivered",         subcontractor: "",                   subcontractorRef: "",         subcontractorReconciled: false, podStatus: "chased",  etaUpdates: [], notes: "WhatsApp booking from ops team. POD chased this morning.",      createdAt: yesterday, updatedAt: now },
    { id: 3, reference: "LOAD-003", source: "email",    customer: "Sainsbury's Supply Chain", origin: "Bristol NDC",    destination: "Cardiff Store",    collectionDate: yesterday, eta: yesterday, status: "failed",            subcontractor: "Arrow Haulage",      subcontractorRef: "AH-4412",  subcontractorReconciled: false, podStatus: "pending", etaUpdates: [], notes: "Failed delivery — customer refused. Needs rebooking.",           createdAt: yesterday, updatedAt: now },
    { id: 4, reference: "LOAD-004", source: "manual",   customer: "Marks & Spencer",          origin: "Liverpool DC",   destination: "Edinburgh Store",  collectionDate: tomorrow,  eta: tomorrow,  status: "booked",            subcontractor: "",                   subcontractorRef: "",         subcontractorReconciled: false, podStatus: "pending", etaUpdates: [], notes: "Manually entered from phone call with M&S transport desk.",      createdAt: now,      updatedAt: now },
    { id: 5, reference: "LOAD-005", source: "whatsapp", customer: "Waitrose Distribution",    origin: "Southampton DC", destination: "Bristol RDC",      collectionDate: now,       eta: tomorrow,  status: "out_for_delivery", subcontractor: "SunExpress Freight", subcontractorRef: "SEF-771",  subcontractorReconciled: false, podStatus: "pending", etaUpdates: [{ timestamp: now, eta: tomorrow, note: "Traffic delay on M4 — updated ETA by 2hrs" }], notes: "ETA updated due to M4 incident.", createdAt: yesterday, updatedAt: now },
    { id: 6, reference: "LOAD-006", source: "email",    customer: "Co-op Logistics",          origin: "Manchester DC",  destination: "Sheffield Hub",    collectionDate: yesterday, eta: yesterday, status: "pod_received",      subcontractor: "NorthRoute Ltd",     subcontractorRef: "NR-3302",  subcontractorReconciled: true,  podStatus: "received", podReceivedAt: now, etaUpdates: [], notes: "Completed and reconciled.", createdAt: yesterday, updatedAt: now },
  ]);

  await logEvent("SYSTEM", { message: "Store seeded into Redis" });
}

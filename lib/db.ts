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
export const K = {
  inventory:    "roci:inventory",
  pallets:      "roci:pallets",
  transactions: "roci:transactions",
  transfers:    "roci:transfers",
  discrepancies:"roci:discrepancies",
  goodsInDocs:  "roci:goodsInDocs",
  loads:        "roci:loads",
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
  getInventory:     () => getList<InventoryItem>(K.inventory),
  setInventory:     (v: InventoryItem[]) => setList(K.inventory, v),

  getPallets:       () => getList<PalletRecord>(K.pallets),
  setPallets:       (v: PalletRecord[]) => setList(K.pallets, v),

  getTransactions:  () => getList<Transaction>(K.transactions),
  setTransactions:  (v: Transaction[]) => setList(K.transactions, v),

  getTransfers:     () => getList<TransferRequest>(K.transfers),
  setTransfers:     (v: TransferRequest[]) => setList(K.transfers, v),

  getDiscrepancies: () => getList<Discrepancy>(K.discrepancies),
  setDiscrepancies: (v: Discrepancy[]) => setList(K.discrepancies, v),

  getGoodsInDocs:   () => getList<GoodsInDoc>(K.goodsInDocs),
  setGoodsInDocs:   (v: GoodsInDoc[]) => setList(K.goodsInDocs, v),

  getLoads:         () => getList<Load>(K.loads),
  setLoads:         (v: Load[]) => setList(K.loads, v),

  async clearAll() {
    await redis.del(...Object.values(K));
  },
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

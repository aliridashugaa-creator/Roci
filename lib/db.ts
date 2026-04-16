import redis from "./redis";
import type { SKU, Supplier, StockEntry, Project, TransportJob } from "./store";

const K = {
  skus:      "roci:skus",
  suppliers: "roci:suppliers",
  stock:     "roci:stock",
  projects:  "roci:projects",
  transport: "roci:transport",
};

async function getAll<T>(key: string): Promise<T[]> {
  return (await redis.get<T[]>(key)) ?? [];
}
async function setAll<T>(key: string, data: T[]): Promise<void> {
  await redis.set(key, data);
}

export const db = {
  getSKUs:      ()           => getAll<SKU>(K.skus),
  setSKUs:      (d: SKU[])   => setAll(K.skus, d),

  getSuppliers: ()               => getAll<Supplier>(K.suppliers),
  setSuppliers: (d: Supplier[])  => setAll(K.suppliers, d),

  getStock:     ()                 => getAll<StockEntry>(K.stock),
  setStock:     (d: StockEntry[])  => setAll(K.stock, d),

  getProjects:  ()               => getAll<Project>(K.projects),
  setProjects:  (d: Project[])   => setAll(K.projects, d),

  getTransport: ()                   => getAll<TransportJob>(K.transport),
  setTransport: (d: TransportJob[])  => setAll(K.transport, d),

  clearAll: () => redis.del(...Object.values(K)),
};

import { NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";
import type { LoadSource, LoadStatus, PodStatus } from "@/lib/store";

export const dynamic = "force-dynamic";

// ── deterministic pseudo-random (no external deps) ───────────────────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(42);
const rand = () => rng();
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
function randDate(daysAgo: number, daysAhead = 0): string {
  const now = Date.now();
  const offset = (-daysAgo + rand() * (daysAgo + daysAhead)) * 86400000;
  const d = new Date(now + offset);
  d.setSeconds(0, 0);
  return d.toISOString();
}

// ── reference data ────────────────────────────────────────────────────────────

const DEPOTS = ["Manchester DC", "Birmingham Hub", "London Gateway", "Leeds Warehouse",
  "Glasgow North", "Liverpool Port", "Bristol South", "Sheffield Dist", "Cardiff Depot", "Edinburgh Store"];

const CUSTOMERS = [
  "Tesco Distribution", "Next Retail Ltd", "Amazon Fulfilment", "Argos Supply Chain",
  "Marks & Spencer", "John Lewis Partnership", "Boots UK", "Halfords Group",
  "Currys PC World", "ASOS Logistics", "B&Q Wholesale", "Wickes Building",
  "DHL UK Ltd", "Screwfix Direct", "IKEA Distribution", "Sports Direct",
  "Dunelm Soft Furnishings", "TK Maxx UK", "Matalan Retail", "New Look Fashion",
];

const SUBCONTRACTORS = [
  "FastFreight UK", "Apex Haulage", "Northern Carriers", "Midlands Express",
  "Celtic Transport", "Pinnacle Logistics", "Atlas Freight", "Swift Deliveries",
  "Horizon Hauliers", "Summit Carriers",
];

const SUPPLIERS = [
  "Global Imports Ltd", "Euro Freight Co", "Pacific Supply Chain", "Nordic Goods AS",
  "Iberian Logistics", "Eastern Trade Co", "Americas Import LLC",
];

const PRODUCT_CATEGORIES: [string, string[]][] = [
  ["ELEC", ["TV-55IN-4K", "LAPTOP-PRO", "TABLET-10IN", "PHONE-CASE-SET", "HEADPHONES-BT",
    "SPEAKER-PORTABLE", "CHARGER-USB-C", "MOUSE-WIRELESS", "KEYBOARD-MEC", "MONITOR-27IN",
    "WEBCAM-HD", "HARD-DRIVE-2TB", "SSD-500GB", "ROUTER-AC", "SMART-BULB-4PK"]],
  ["FASH", ["TSHIRT-M-BLK", "TSHIRT-L-WHT", "JEANS-32-BLU", "DRESS-SUM-RED",
    "HOODIE-XL-GRY", "JACKET-PUFFER-M", "TRAINERS-42-WHT", "BOOTS-38-BRN",
    "SOCKS-6PK-WHT", "POLO-SHIRT-M-NVY", "SHORTS-M-KHK", "LEGGINGS-BLK",
    "CARDIGAN-L-BEI", "COAT-WOOL-M", "SCARF-STRIPE"]],
  ["HOME", ["BED-FRAME-DBL", "MATTRESS-KNG", "SOFA-3STR-GRY", "DESK-OAK-120",
    "BOOKCASE-5SHF", "WARDROBE-2DR", "COFFEE-TABLE-RND", "DINING-CHAIR-4PK",
    "CURTAIN-EYELET-PR", "RUG-PERSIAN-160", "LAMP-FLOOR-BLK", "MIRROR-OVAL-90",
    "SHELVING-UNIT-WH", "TV-UNIT-WHT", "STORAGE-BOXES-6PK"]],
  ["GROC", ["CEREAL-CORN-500G", "PASTA-PENNE-1KG", "RICE-BASMATI-5KG",
    "OIL-OLIVE-1L-6PK", "JUICE-OJ-1L-12PK", "COFFEE-GROUND-250G",
    "TEA-BAGS-80PK", "CHOCOLATE-DARK-100G", "BISCUITS-ASSORTED", "CRISPS-MXD-24PK",
    "SAUCE-TOMATO-500G", "STOCK-CUBES-24PK", "FLOUR-PLAIN-1.5KG", "SUGAR-WHITE-1KG"]],
  ["AUTO", ["TYRE-195-65-R15", "BRAKE-PAD-SET", "ENGINE-OIL-5W-30-5L",
    "AIR-FILTER-UNIV", "WIPER-BLADE-PAIR", "CAR-MAT-SET-4PK", "JUMP-LEADS-3M",
    "SCREEN-WASH-5L", "COOLANT-1L", "SPARK-PLUG-4PK", "HEADLIGHT-BULB-H7",
    "STEERING-LOCK", "DASH-CAM-HD", "SEAT-COVER-SET"]],
  ["HLTH", ["IBUPROFEN-200MG-24", "PLASTERS-ASST-40PK", "HAND-SANITISER-250ML",
    "VITAMIN-C-60TAB", "BANDAGE-ROLL-5M", "FACEMASK-SURG-50PK",
    "THERMOMETER-DGTL", "BLOOD-PRESS-MNTR", "FIRST-AID-KIT", "SUNSCREEN-SPF50"]],
  ["TOOL", ["DRILL-CORDLESS-18V", "SAW-CIRCULAR-165MM", "HAMMER-CLAW-16OZ",
    "SCREWDRIVER-SET-20PC", "TAPE-MEASURE-8M", "LEVEL-SPIRIT-60CM",
    "PLIERS-SET-3PC", "WRENCH-ADJUSTABLE", "SANDER-ORBITAL", "TOOLBOX-26IN"]],
];

const LOAD_STATUSES: LoadStatus[] = [
  "booked", "booked", "collected", "in_transit", "in_transit", "in_transit",
  "out_for_delivery", "delivered", "delivered", "pod_received",
  "failed", "rebooked", "cancelled",
];

const SOURCES: LoadSource[] = ["email", "whatsapp", "phone", "manual"];

// ── generators ────────────────────────────────────────────────────────────────

function makeInventory() {
  const items = [];
  for (const [prefix, skus] of PRODUCT_CATEGORIES) {
    for (const sku of skus) {
      const code = `${prefix}-${sku}`;
      for (const depot of DEPOTS.slice(0, randInt(1, 4))) {
        items.push({
          sku: code,
          location: depot,
          quantity: randInt(0, 2000),
          lastUpdated: randDate(30),
        });
      }
    }
  }
  // pad to 300+ with generated codes
  let extra = 1;
  while (items.length < 300) {
    items.push({
      sku: `GEN-PRODUCT-${String(extra).padStart(4, "0")}`,
      location: pick(DEPOTS),
      quantity: randInt(10, 500),
      lastUpdated: randDate(60),
    });
    extra++;
  }
  return items;
}

function makePallets() {
  return Array.from({ length: 80 }, (_, i) => ({
    palletId: `PLT-${String(i + 1).padStart(4, "0")}`,
    location: pick(DEPOTS),
    sku: `${pick(PRODUCT_CATEGORIES)[0]}-${pick(pick(PRODUCT_CATEGORIES)[1])}`,
    lastMoved: randDate(14),
  }));
}

function makeLoads() {
  return Array.from({ length: 120 }, (_, i) => {
    const status = pick(LOAD_STATUSES);
    const collectionDate = randDate(14, 7);
    const etaBase = new Date(collectionDate);
    etaBase.setDate(etaBase.getDate() + randInt(1, 3));
    const eta = etaBase.toISOString();
    const sub = rand() > 0.4 ? pick(SUBCONTRACTORS) : "";
    const podStatus: PodStatus =
      ["delivered", "pod_received"].includes(status)
        ? status === "pod_received" ? "received" : rand() > 0.5 ? "chased" : "pending"
        : "pending";
    const etaUpdates = rand() > 0.7
      ? Array.from({ length: randInt(1, 3) }, () => {
          const d = new Date(etaBase);
          d.setHours(d.getHours() + randInt(1, 12));
          return { timestamp: randDate(5), eta: d.toISOString(), note: pick(["Traffic delay", "Driver issue", "Weather", "Customer rescheduled", "Customs hold"]) };
        })
      : [];
    return {
      id: i + 1,
      reference: `LOAD-${String(i + 1).padStart(3, "0")}`,
      source: pick(SOURCES),
      customer: pick(CUSTOMERS),
      origin: pick(DEPOTS),
      destination: pick(DEPOTS),
      collectionDate,
      eta,
      status,
      subcontractor: sub,
      subcontractorRef: sub ? `${sub.split(" ")[0].toUpperCase().slice(0, 3)}-${randInt(1000, 9999)}` : "",
      subcontractorReconciled: ["delivered", "pod_received"].includes(status) && rand() > 0.5,
      podStatus,
      podReceivedAt: status === "pod_received" ? randDate(3) : undefined,
      etaUpdates,
      notes: rand() > 0.7 ? pick(["Tail-lift required", "AM delivery only", "Call before delivery", "Fragile goods", "Hazardous — ADR docs attached", "2-man delivery"]) : "",
      rebookedFromId: status === "rebooked" && i > 5 ? i - randInt(1, 5) : undefined,
      createdAt: randDate(30),
      updatedAt: randDate(5),
    };
  });
}

function makeTransfers() {
  return Array.from({ length: 80 }, (_, i) => {
    const from = pick(DEPOTS);
    const to = pick(DEPOTS.filter((d) => d !== from));
    return {
      id: i + 1,
      sku: `${pick(PRODUCT_CATEGORIES)[0]}-${pick(pick(PRODUCT_CATEGORIES)[1])}`,
      quantity: randInt(10, 500),
      from,
      to,
      status: pick(["pending", "pending", "in_transit", "in_transit", "completed", "completed", "completed", "cancelled"]),
      createdAt: randDate(20),
      updatedAt: randDate(5),
    };
  });
}

function makeDiscrepancies() {
  return Array.from({ length: 45 }, (_, i) => {
    const expected = randInt(50, 500);
    const actual = expected + randInt(-80, 20);
    return {
      id: i + 1,
      sku: `${pick(PRODUCT_CATEGORIES)[0]}-${pick(pick(PRODUCT_CATEGORIES)[1])}`,
      location: pick(DEPOTS),
      expectedQty: expected,
      actualQty: actual,
      status: pick(["open", "open", "open", "investigating", "resolved", "resolved"]),
      notes: pick([
        "Counted twice — awaiting recount",
        "Suspected pick error",
        "Supplier short-shipped",
        "Damage on arrival — QC hold",
        "Awaiting goods-in confirmation",
        "Previous cycle count mismatch",
        "Driver signature missing",
      ]),
      createdAt: randDate(60),
      resolvedAt: undefined as string | undefined,
    };
  }).map((d) => {
    if (d.status === "resolved") d.resolvedAt = randDate(10);
    return d;
  });
}

function makeGoodsInDocs() {
  return Array.from({ length: 70 }, (_, i) => ({
    docId: `GRN-${String(i + 1).padStart(4, "0")}`,
    sku: `${pick(PRODUCT_CATEGORIES)[0]}-${pick(pick(PRODUCT_CATEGORIES)[1])}`,
    quantity: randInt(20, 1000),
    supplier: pick(SUPPLIERS),
    receivedAt: randDate(60),
    palletId: `PLT-${String(randInt(1, 80)).padStart(4, "0")}`,
  }));
}

const EVENTS = [
  "LOAD_CREATED", "LOAD_STATUS", "LOAD_ETA_UPDATE", "POD_CHASED", "POD_RECEIVED",
  "LOAD_REBOOKED", "SUB_RECONCILED", "TRANSFER_CREATED", "TRANSFER_STATUS",
  "GOODS_IN_RECEIVED", "DISCREPANCY_RAISED", "DISCREPANCY_RESOLVED",
  "STOCK_ADJUSTED", "PALLET_MOVED",
];

function makeTransactions(loads: ReturnType<typeof makeLoads>) {
  const txns = [];
  let id = 1;

  // realistic load events
  for (const load of loads.slice(0, 80)) {
    txns.push({ id: id++, timestamp: load.createdAt, event: "LOAD_CREATED", details: { reference: load.reference, customer: load.customer, source: load.source } });
    if (load.status !== "booked") {
      txns.push({ id: id++, timestamp: randDate(10), event: "LOAD_STATUS", details: { reference: load.reference, from: "booked", to: "collected" } });
    }
    if (["in_transit", "out_for_delivery", "delivered", "pod_received", "failed"].includes(load.status)) {
      txns.push({ id: id++, timestamp: randDate(8), event: "LOAD_STATUS", details: { reference: load.reference, from: "collected", to: "in_transit" } });
    }
    for (const eta of load.etaUpdates) {
      txns.push({ id: id++, timestamp: eta.timestamp, event: "LOAD_ETA_UPDATE", details: { reference: load.reference, newEta: eta.eta, note: eta.note } });
    }
    if (load.podStatus === "received") {
      txns.push({ id: id++, timestamp: load.podReceivedAt ?? randDate(3), event: "POD_RECEIVED", details: { reference: load.reference, customer: load.customer } });
    } else if (load.podStatus === "chased") {
      txns.push({ id: id++, timestamp: randDate(5), event: "POD_CHASED", details: { reference: load.reference, customer: load.customer } });
    }
    if (load.subcontractorReconciled) {
      txns.push({ id: id++, timestamp: randDate(4), event: "SUB_RECONCILED", details: { reference: load.reference, subcontractor: load.subcontractor } });
    }
  }

  // misc events
  for (let i = 0; i < 80; i++) {
    const event = pick(EVENTS);
    const sku = `${pick(PRODUCT_CATEGORIES)[0]}-${pick(pick(PRODUCT_CATEGORIES)[1])}`;
    txns.push({
      id: id++,
      timestamp: randDate(30),
      event,
      details: event.includes("LOAD")
        ? { reference: `LOAD-${String(randInt(1, 120)).padStart(3, "0")}`, customer: pick(CUSTOMERS) }
        : event.includes("TRANSFER")
        ? { sku, from: pick(DEPOTS), to: pick(DEPOTS), qty: randInt(10, 200) }
        : event.includes("GOODS")
        ? { docId: `GRN-${String(randInt(1, 70)).padStart(4, "0")}`, sku, supplier: pick(SUPPLIERS) }
        : event.includes("DISCREPANCY")
        ? { sku, location: pick(DEPOTS), variance: randInt(-50, 50) }
        : { sku, location: pick(DEPOTS), qty: randInt(5, 100) },
    });
  }

  return txns
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 200)
    .map((t, i) => ({ ...t, id: i + 1 }));
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST() {
  // generate
  const inventory   = makeInventory();
  const pallets     = makePallets();
  const loads       = makeLoads();
  const transfers   = makeTransfers();
  const discrepancies = makeDiscrepancies();
  const goodsInDocs = makeGoodsInDocs();
  const transactions = makeTransactions(loads);

  // write
  await Promise.all([
    db.setInventory(inventory as Parameters<typeof db.setInventory>[0]),
    db.setPallets(pallets as Parameters<typeof db.setPallets>[0]),
    db.setLoads(loads as Parameters<typeof db.setLoads>[0]),
    db.setTransfers(transfers as Parameters<typeof db.setTransfers>[0]),
    db.setDiscrepancies(discrepancies as Parameters<typeof db.setDiscrepancies>[0]),
    db.setGoodsInDocs(goodsInDocs as Parameters<typeof db.setGoodsInDocs>[0]),
    db.setTransactions(transactions as Parameters<typeof db.setTransactions>[0]),
  ]);

  await logEvent("SEED_COMPLETE", {
    inventory: inventory.length, loads: loads.length, transfers: transfers.length,
    discrepancies: discrepancies.length, goodsInDocs: goodsInDocs.length,
    pallets: pallets.length, transactions: transactions.length,
  });

  return NextResponse.json({
    ok: true,
    counts: {
      inventory:     inventory.length,
      pallets:       pallets.length,
      loads:         loads.length,
      transfers:     transfers.length,
      discrepancies: discrepancies.length,
      goodsInDocs:   goodsInDocs.length,
      transactions:  transactions.length,
    },
  });
}

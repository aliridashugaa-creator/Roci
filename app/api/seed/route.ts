import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SKU, Supplier, StockEntry, Project, TransportJob } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const now = new Date().toISOString();
  const today = now.split("T")[0];

  const suppliers: Supplier[] = [
    {
      id: "sup_1", name: "Apex Electronics Ltd", contactName: "James Harrington",
      email: "j.harrington@apex-elec.co.uk", phone: "0161 234 5678",
      address: "14 Trafford Park Road, Manchester", country: "UK",
      leadTimeDays: 7, paymentTerms: "Net 30", currency: "GBP",
      status: "active", notes: "Preferred electronics supplier",
      createdAt: now, updatedAt: now,
    },
    {
      id: "sup_2", name: "Nordic Textiles AB", contactName: "Anna Lindqvist",
      email: "anna@nordic-tex.se", phone: "+46 8 123 4567",
      address: "Götgatan 22, Stockholm", country: "Sweden",
      leadTimeDays: 14, paymentTerms: "Net 45", currency: "EUR",
      status: "active", notes: "Seasonal ranges only",
      createdAt: now, updatedAt: now,
    },
  ];

  const skus: SKU[] = [
    {
      id: "sku_1", code: "ELEC-CAB-001", name: "USB-C Charging Cable 2m",
      description: "High-speed USB-C to USB-C braided cable, 100W rated",
      category: "Electronics", subcategory: "Cables",
      supplierId: "sup_1", supplierCode: "AE-USBC-2M",
      unitOfMeasure: "each", costPrice: 3.50, salePrice: 9.99,
      weight: 0.08, dimensions: "20×5×2 cm", barcode: "5060123456789",
      minStockLevel: 50, reorderPoint: 100, leadTimeDays: 7,
      status: "active", notes: "",
      createdAt: now, updatedAt: now,
    },
    {
      id: "sku_2", code: "ELEC-HUB-001", name: "7-Port USB 3.0 Hub",
      description: "Powered USB 3.0 hub with LED indicators and surge protection",
      category: "Electronics", subcategory: "Hubs",
      supplierId: "sup_1", supplierCode: "AE-HUB7",
      unitOfMeasure: "each", costPrice: 12.00, salePrice: 29.99,
      weight: 0.22, dimensions: "15×8×3 cm", barcode: "5060123456790",
      minStockLevel: 20, reorderPoint: 40, leadTimeDays: 7,
      status: "active", notes: "",
      createdAt: now, updatedAt: now,
    },
    {
      id: "sku_3", code: "TEXT-BASE-001", name: "Merino Wool Base Layer",
      description: "100% merino wool thermal top, odour-resistant",
      category: "Fashion", subcategory: "Base Layers",
      supplierId: "sup_2", supplierCode: "NT-MERL-M",
      unitOfMeasure: "each", costPrice: 18.00, salePrice: 54.99,
      weight: 0.25, dimensions: "30×20×4 cm", barcode: "7350123456789",
      minStockLevel: 15, reorderPoint: 30, leadTimeDays: 14,
      status: "active", notes: "Available S/M/L/XL",
      createdAt: now, updatedAt: now,
    },
    {
      id: "sku_4", code: "ELEC-PWR-001", name: "65W GaN Charger",
      description: "Compact 3-port GaN fast charger, folds flat",
      category: "Electronics", subcategory: "Chargers",
      supplierId: "sup_1", supplierCode: "AE-GAN65",
      unitOfMeasure: "each", costPrice: 15.00, salePrice: 44.99,
      weight: 0.18, dimensions: "8×8×4 cm", barcode: "5060123456791",
      minStockLevel: 25, reorderPoint: 50, leadTimeDays: 7,
      status: "active", notes: "",
      createdAt: now, updatedAt: now,
    },
    {
      id: "sku_5", code: "TEXT-JACK-001", name: "Softshell Jacket — Navy",
      description: "Water-resistant softshell with fleece lining",
      category: "Fashion", subcategory: "Outerwear",
      supplierId: "sup_2", supplierCode: "NT-SSH-NVY",
      unitOfMeasure: "each", costPrice: 32.00, salePrice: 89.99,
      weight: 0.68, dimensions: "40×30×8 cm", barcode: "7350123456790",
      minStockLevel: 10, reorderPoint: 20, leadTimeDays: 14,
      status: "active", notes: "",
      createdAt: now, updatedAt: now,
    },
  ];

  const stock: StockEntry[] = [
    { id: "stk_1", skuId: "sku_1", location: "Warehouse A — Shelf 3", quantity: 248, reservedQty: 20, lastCountDate: today, updatedAt: now },
    { id: "stk_2", skuId: "sku_2", location: "Warehouse A — Shelf 4", quantity: 35,  reservedQty: 5,  lastCountDate: today, updatedAt: now },
    { id: "stk_3", skuId: "sku_3", location: "Warehouse B — Rail 1",  quantity: 12,  reservedQty: 0,  lastCountDate: today, updatedAt: now },
    { id: "stk_4", skuId: "sku_4", location: "Warehouse A — Shelf 3", quantity: 60,  reservedQty: 10, lastCountDate: today, updatedAt: now },
    { id: "stk_5", skuId: "sku_5", location: "Warehouse B — Rail 2",  quantity: 8,   reservedQty: 2,  lastCountDate: today, updatedAt: now },
  ];

  const projects: Project[] = [
    {
      id: "prj_1",
      name: "Summer Tech Bundle Q3",
      description: "Bundled electronics range for Q3 retail push",
      status: "active",
      startDate: "2026-04-01",
      endDate: "2026-06-30",
      items: [
        { skuId: "sku_1", qtyRequired: 500, qtyAllocated: 248 },
        { skuId: "sku_4", qtyRequired: 300, qtyAllocated: 60 },
      ],
      notes: "Priority project — align with marketing campaign launch",
      createdAt: now, updatedAt: now,
    },
    {
      id: "prj_2",
      name: "Autumn/Winter Fashion Drop",
      description: "Nordic textile range for A/W season",
      status: "planning",
      startDate: "2026-07-01",
      endDate: "2026-09-15",
      items: [
        { skuId: "sku_3", qtyRequired: 200, qtyAllocated: 12 },
        { skuId: "sku_5", qtyRequired: 150, qtyAllocated: 8 },
      ],
      notes: "Awaiting final range confirmation from Nordic Textiles",
      createdAt: now, updatedAt: now,
    },
  ];

  const transport: TransportJob[] = [
    {
      id: "trn_1", ref: "TRN-0001",
      items: [{ skuId: "sku_1", qty: 200 }, { skuId: "sku_4", qty: 100 }],
      origin: "Manchester", destination: "London",
      driver: "DHL Express", trackingRef: "1234567890",
      status: "in_transit",
      scheduledDate: "2026-04-18", deliveredDate: null,
      notes: "Priority shipment for Q3 tech bundle",
      createdAt: now, updatedAt: now,
    },
    {
      id: "trn_2", ref: "TRN-0002",
      items: [{ skuId: "sku_3", qty: 50 }, { skuId: "sku_5", qty: 30 }],
      origin: "Edinburgh", destination: "Bristol",
      driver: "DPD", trackingRef: "DPD987654321",
      status: "pending",
      scheduledDate: "2026-04-22", deliveredDate: null,
      notes: "Fashion range — South West distribution",
      createdAt: now, updatedAt: now,
    },
    {
      id: "trn_3", ref: "TRN-0003",
      items: [{ skuId: "sku_2", qty: 30 }],
      origin: "Birmingham", destination: "Leeds",
      driver: "Evri", trackingRef: "EVR-112233",
      status: "delivered",
      scheduledDate: "2026-04-10", deliveredDate: "2026-04-12",
      notes: "",
      createdAt: now, updatedAt: now,
    },
  ];

  await Promise.all([
    db.setSuppliers(suppliers),
    db.setSKUs(skus),
    db.setStock(stock),
    db.setProjects(projects),
    db.setTransport(transport),
  ]);

  return NextResponse.json({
    ok: true,
    seeded: {
      suppliers: suppliers.length,
      skus: skus.length,
      stock: stock.length,
      projects: projects.length,
      transport: transport.length,
    },
  });
}

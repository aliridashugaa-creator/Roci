import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SKU, Supplier, StockEntry, Project, TransportJob } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const now   = new Date().toISOString();
  const today = now.split("T")[0];

  // ── 30 Suppliers ──────────────────────────────────────────────────────────────
  const suppliers: Supplier[] = [
    { id:"sup_1",  name:"Apex Electronics Ltd",      contactName:"James Harrington",  email:"j.harrington@apex-elec.co.uk",    phone:"0161 234 5678",  address:"14 Trafford Park Rd, Manchester M17 1SN", country:"UK",          locations:[], leadTimeDays:7,  paymentTerms:"Net 30", currency:"GBP", status:"active", notes:"Preferred electronics supplier", createdAt:now, updatedAt:now },
    { id:"sup_2",  name:"Nordic Textiles AB",         contactName:"Anna Lindqvist",    email:"anna@nordic-tex.se",              phone:"+46 8 123 4567", address:"Götgatan 22, 118 46 Stockholm",            country:"Sweden",       locations:[], leadTimeDays:14, paymentTerms:"Net 45", currency:"EUR", status:"active", notes:"Seasonal ranges", createdAt:now, updatedAt:now },
    { id:"sup_3",  name:"Guangzhou Tech Parts Co.",   contactName:"Wei Chen",          email:"w.chen@gztechparts.cn",           phone:"+86 20 8765 4321",address:"No. 88 Tianhe Rd, Guangzhou",             country:"China",        locations:[], leadTimeDays:28, paymentTerms:"30% upfront", currency:"USD", status:"active", notes:"", createdAt:now, updatedAt:now },
    { id:"sup_4",  name:"Müller Industriebedarf GmbH",contactName:"Klaus Müller",      email:"k.mueller@mibedarf.de",           phone:"+49 89 4567 890", address:"Industriestr. 42, 80339 München",         country:"Germany",      locations:[], leadTimeDays:10, paymentTerms:"Net 30", currency:"EUR", status:"active", notes:"Tools & industrial", createdAt:now, updatedAt:now },
    { id:"sup_5",  name:"Bianchi & Sons SpA",         contactName:"Marco Bianchi",     email:"m.bianchi@bianchisons.it",        phone:"+39 02 1234 567", address:"Via della Moda 15, 20121 Milano",         country:"Italy",        locations:[], leadTimeDays:21, paymentTerms:"Net 60", currency:"EUR", status:"active", notes:"Fashion & leather goods", createdAt:now, updatedAt:now },
    { id:"sup_6",  name:"Sharma Garments Pvt Ltd",    contactName:"Priya Sharma",      email:"priya@sharmagarments.in",         phone:"+91 22 4567 8901",address:"Plot 7, MIDC, Andheri, Mumbai 400093",    country:"India",        locations:[], leadTimeDays:21, paymentTerms:"Net 45", currency:"GBP", status:"active", notes:"Cotton & woven fabrics", createdAt:now, updatedAt:now },
    { id:"sup_7",  name:"FleurBio France SAS",        contactName:"Sophie Moreau",     email:"s.moreau@fleurbio.fr",            phone:"+33 1 4567 8901", address:"12 Rue du Commerce, 75015 Paris",        country:"France",       locations:[], leadTimeDays:14, paymentTerms:"Net 30", currency:"EUR", status:"active", notes:"Organic cosmetics & health", createdAt:now, updatedAt:now },
    { id:"sup_8",  name:"Hargreaves Tools Ltd",       contactName:"Tom Hargreaves",    email:"t.hargreaves@hgtools.co.uk",      phone:"0114 278 9012",  address:"Steel Works Rd, Sheffield S9 2GJ",        country:"UK",          locations:[], leadTimeDays:5,  paymentTerms:"Net 14", currency:"GBP", status:"active", notes:"Hand tools & power tools", createdAt:now, updatedAt:now },
    { id:"sup_9",  name:"SportPeak Distribution",     contactName:"Lisa Chan",         email:"l.chan@sportpeak.hk",             phone:"+852 2345 6789", address:"Tower B, 18 Science Park E, Hong Kong",  country:"Hong Kong",    locations:[], leadTimeDays:18, paymentTerms:"Net 30", currency:"USD", status:"active", notes:"Sports & outdoor equipment", createdAt:now, updatedAt:now },
    { id:"sup_10", name:"Deko Nederland BV",          contactName:"Pieter van den Berg",email:"p.vandenberg@deko.nl",           phone:"+31 20 456 7890","address":"Herengracht 420, 1017 BZ Amsterdam",   country:"Netherlands",  locations:[], leadTimeDays:10, paymentTerms:"Net 30", currency:"EUR", status:"active", notes:"Home & garden decor", createdAt:now, updatedAt:now },
    { id:"sup_11", name:"Sunshine Foods Ltd",         contactName:"Rachel Owen",       email:"r.owen@sunshinefoods.co.uk",      phone:"01604 345 678",  address:"Food Park, Northampton NN4 7HB",          country:"UK",          locations:[], leadTimeDays:3,  paymentTerms:"Net 7",  currency:"GBP", status:"active", notes:"Ambient grocery lines", createdAt:now, updatedAt:now },
    { id:"sup_12", name:"AutoParts Express Ltd",      contactName:"David Knight",      email:"d.knight@autopartsexpress.co.uk", phone:"0121 567 8901",  address:"Motor Mile, Birmingham B11 2RS",          country:"UK",          locations:[], leadTimeDays:5,  paymentTerms:"Net 30", currency:"GBP", status:"active", notes:"OEM & aftermarket parts", createdAt:now, updatedAt:now },
    { id:"sup_13", name:"Kinder & Spiel GmbH",        contactName:"Heike Braun",       email:"h.braun@kinderspiel.de",          phone:"+49 30 8765 4321","address":"Spielzeugweg 8, 10117 Berlin",         country:"Germany",      locations:[], leadTimeDays:14, paymentTerms:"Net 30", currency:"EUR", status:"active", notes:"Toys & educational", createdAt:now, updatedAt:now },
    { id:"sup_14", name:"ProOffice Solutions UK",     contactName:"Alan Price",        email:"a.price@prooffice.co.uk",         phone:"020 7123 4567",  address:"35 City Rd, London EC1V 1BH",             country:"UK",          locations:[], leadTimeDays:4,  paymentTerms:"Net 14", currency:"GBP", status:"active", notes:"Stationery & office equipment", createdAt:now, updatedAt:now },
    { id:"sup_15", name:"Tainan Electronics Co.",     contactName:"Jason Wu",          email:"j.wu@tainanelec.tw",             phone:"+886 6 234 5678", address:"No. 45 Science Park Blvd, Tainan",       country:"Taiwan",       locations:[], leadTimeDays:21, paymentTerms:"Net 45", currency:"USD", status:"active", notes:"Semiconductors & components", createdAt:now, updatedAt:now },
    { id:"sup_16", name:"Iberian Home SL",            contactName:"Carlos Ruiz",       email:"c.ruiz@iberianhome.es",           phone:"+34 93 456 7890", address:"Passeig de Gràcia 55, 08007 Barcelona",  country:"Spain",       locations:[], leadTimeDays:12, paymentTerms:"Net 45", currency:"EUR", status:"active", notes:"Ceramics & home accessories", createdAt:now, updatedAt:now },
    { id:"sup_17", name:"Poznan Furniture Sp. z o.o.", contactName:"Marek Wiśniewski", email:"m.wisniewski@poznanfurn.pl",      phone:"+48 61 234 5678", address:"ul. Poznańska 78, 60-001 Poznań",        country:"Poland",       locations:[], leadTimeDays:20, paymentTerms:"Net 30", currency:"EUR", status:"active", notes:"Flat-pack & solid wood", createdAt:now, updatedAt:now },
    { id:"sup_18", name:"Tokyo Wellness KK",          contactName:"Yuki Tanaka",       email:"y.tanaka@tokyowellness.jp",       phone:"+81 3 1234 5678", address:"3-1 Marunouchi, Chiyoda-ku, Tokyo",      country:"Japan",        locations:[], leadTimeDays:25, paymentTerms:"Net 60", currency:"JPY", status:"active", notes:"Wellness & supplement products", createdAt:now, updatedAt:now },
    { id:"sup_19", name:"Cape Town Crafts Pty Ltd",   contactName:"Naledi Dlamini",    email:"n.dlamini@ctcrafts.co.za",        phone:"+27 21 456 7890", address:"Victoria & Alfred Waterfront, Cape Town", country:"South Africa", locations:[], leadTimeDays:30, paymentTerms:"Net 45", currency:"USD", status:"active", notes:"Handmade crafts & gifts", createdAt:now, updatedAt:now },
    { id:"sup_20", name:"BioGreen Packaging BV",      contactName:"Ingrid Smit",       email:"i.smit@biogreen.nl",              phone:"+31 40 234 5678", address:"Eindhoven Tech Campus, 5612 AJ",          country:"Netherlands",  locations:[], leadTimeDays:8,  paymentTerms:"Net 30", currency:"EUR", status:"active", notes:"Eco packaging & materials", createdAt:now, updatedAt:now },
    { id:"sup_21", name:"MidWest Auto LLC",           contactName:"Brad Johnson",      email:"b.johnson@midwestauto.com",       phone:"+1 312 456 7890", address:"2233 S Michigan Ave, Chicago IL 60616",  country:"USA",          locations:[], leadTimeDays:12, paymentTerms:"Net 30", currency:"USD", status:"active", notes:"Auto accessories", createdAt:now, updatedAt:now },
    { id:"sup_22", name:"Toronto Sports Inc.",        contactName:"Emma Tremblay",     email:"e.tremblay@torontosports.ca",     phone:"+1 416 234 5678", address:"222 King St W, Toronto ON M5H 1J5",      country:"Canada",       locations:[], leadTimeDays:10, paymentTerms:"Net 30", currency:"CAD", status:"active", notes:"Sports equipment & apparel", createdAt:now, updatedAt:now },
    { id:"sup_23", name:"Eastland Kitchenware Ltd",   contactName:"Sarah Fleming",     email:"s.fleming@eastlandkitchen.co.uk", phone:"0151 345 6789",  address:"Dock Rd Industrial, Liverpool L20 8PQ",  country:"UK",          locations:[], leadTimeDays:7,  paymentTerms:"Net 14", currency:"GBP", status:"active", notes:"Kitchen tools & cookware", createdAt:now, updatedAt:now },
    { id:"sup_24", name:"Guangzhou Cosmetics Ltd",    contactName:"Mei Lin",           email:"m.lin@gzcosmetics.cn",            phone:"+86 20 3456 7890", address:"Baiyun District, Guangzhou 510000",   country:"China",        locations:[], leadTimeDays:25, paymentTerms:"Net 45", currency:"USD", status:"active", notes:"Beauty & personal care", createdAt:now, updatedAt:now },
    { id:"sup_25", name:"Ankara Textile AS",          contactName:"Mehmet Yildiz",     email:"m.yildiz@ankaratextile.tr",       phone:"+90 312 456 7890", address:"Organize Sanayi Bolgesi, 06378 Ankara",country:"Turkey",       locations:[], leadTimeDays:16, paymentTerms:"Net 30", currency:"EUR", status:"active", notes:"Woven & knitted fabrics", createdAt:now, updatedAt:now },
    { id:"sup_26", name:"Pacific Timber Co. Pty",     contactName:"Craig Mitchell",    email:"c.mitchell@pacifictimber.com.au", phone:"+61 2 9876 5432", address:"18 Harbour St, Sydney NSW 2000",         country:"Australia",    locations:[], leadTimeDays:35, paymentTerms:"Net 60", currency:"AUD", status:"active", notes:"Hardwood & engineered timber", createdAt:now, updatedAt:now },
    { id:"sup_27", name:"FreshPack Co. Ltd",          contactName:"Oluwaseun Adeyemi", email:"o.adeyemi@freshpack.ng",          phone:"+234 1 234 5678", address:"3 Broad St, Lagos Island, Lagos",        country:"Nigeria",       locations:[], leadTimeDays:20, paymentTerms:"Net 30", currency:"USD", status:"active", notes:"Fresh produce packaging", createdAt:now, updatedAt:now },
    { id:"sup_28", name:"Lyon Epicerie Fine SAS",     contactName:"Jean-Pierre Dubois",email:"jp.dubois@lyonepicerie.fr",       phone:"+33 4 7234 5678", address:"Place Bellecour 14, 69002 Lyon",          country:"France",       locations:[], leadTimeDays:7,  paymentTerms:"Net 30", currency:"EUR", status:"active", notes:"Premium French grocery", createdAt:now, updatedAt:now },
    { id:"sup_29", name:"BrightLED Technology Ltd",   contactName:"Amy Foster",        email:"a.foster@brightled.co.uk",        phone:"01865 234 567",  address:"Oxford Science Park, Oxford OX4 4GA",    country:"UK",          locations:[], leadTimeDays:10, paymentTerms:"Net 30", currency:"GBP", status:"active", notes:"LED lighting & smart home", createdAt:now, updatedAt:now },
    { id:"sup_30", name:"Himalayan Herbs Pvt Ltd",    contactName:"Rakesh Patel",      email:"r.patel@himalayanherbs.in",       phone:"+91 11 4567 8901","address":"Sector 18, Noida 201301, UP, India",   country:"India",        locations:[], leadTimeDays:18, paymentTerms:"Net 30", currency:"GBP", status:"active", notes:"Herbal & ayurvedic products", createdAt:now, updatedAt:now },
  ];

  // ── SKU templates by category ─────────────────────────────────────────────────
  type SKUTemplate = { name: string; sub: string; supplierId: string; cost: number; sale: number; weight: number; uom: string; min: number; reorder: number; lead: number };

  const electronics: SKUTemplate[] = [
    { name:"USB-C Cable 1m",             sub:"Cables",      supplierId:"sup_1",  cost:2.20,  sale:6.99,  weight:0.05, uom:"each", min:50,  reorder:100, lead:7  },
    { name:"USB-C Cable 2m",             sub:"Cables",      supplierId:"sup_1",  cost:3.50,  sale:9.99,  weight:0.08, uom:"each", min:50,  reorder:100, lead:7  },
    { name:"Micro-USB Cable 2m",         sub:"Cables",      supplierId:"sup_1",  cost:1.80,  sale:5.49,  weight:0.07, uom:"each", min:40,  reorder:80,  lead:7  },
    { name:"Lightning Cable 1m",         sub:"Cables",      supplierId:"sup_1",  cost:4.20,  sale:14.99, weight:0.06, uom:"each", min:30,  reorder:60,  lead:7  },
    { name:"HDMI Cable 2m",              sub:"Cables",      supplierId:"sup_1",  cost:3.00,  sale:8.99,  weight:0.12, uom:"each", min:30,  reorder:60,  lead:7  },
    { name:"DisplayPort Cable 2m",       sub:"Cables",      supplierId:"sup_1",  cost:4.50,  sale:12.99, weight:0.14, uom:"each", min:20,  reorder:40,  lead:7  },
    { name:"7-Port USB 3.0 Hub",         sub:"Hubs",        supplierId:"sup_1",  cost:12.00, sale:29.99, weight:0.22, uom:"each", min:20,  reorder:40,  lead:7  },
    { name:"4-Port USB-C Hub",           sub:"Hubs",        supplierId:"sup_1",  cost:15.00, sale:39.99, weight:0.18, uom:"each", min:15,  reorder:30,  lead:7  },
    { name:"65W GaN Charger 3-port",     sub:"Chargers",    supplierId:"sup_1",  cost:15.00, sale:44.99, weight:0.18, uom:"each", min:25,  reorder:50,  lead:7  },
    { name:"30W PD Wall Charger",        sub:"Chargers",    supplierId:"sup_1",  cost:8.00,  sale:22.99, weight:0.10, uom:"each", min:30,  reorder:60,  lead:7  },
    { name:"Wireless Charging Pad 15W",  sub:"Chargers",    supplierId:"sup_1",  cost:10.00, sale:27.99, weight:0.15, uom:"each", min:20,  reorder:40,  lead:7  },
    { name:"Laptop Stand Aluminium",     sub:"Accessories", supplierId:"sup_15", cost:14.00, sale:34.99, weight:0.55, uom:"each", min:15,  reorder:30,  lead:21 },
    { name:"Mechanical Keyboard TKL",    sub:"Peripherals", supplierId:"sup_15", cost:28.00, sale:69.99, weight:0.75, uom:"each", min:10,  reorder:20,  lead:21 },
    { name:"Wireless Mouse Ergonomic",   sub:"Peripherals", supplierId:"sup_15", cost:12.00, sale:34.99, weight:0.20, uom:"each", min:15,  reorder:30,  lead:21 },
    { name:"Monitor Privacy Screen 27\"",sub:"Accessories", supplierId:"sup_15", cost:22.00, sale:49.99, weight:0.45, uom:"each", min:10,  reorder:20,  lead:21 },
    { name:"Webcam 1080p HD",            sub:"Peripherals", supplierId:"sup_15", cost:18.00, sale:44.99, weight:0.22, uom:"each", min:10,  reorder:25,  lead:21 },
    { name:"Bluetooth Speaker Portable", sub:"Audio",       supplierId:"sup_1",  cost:16.00, sale:39.99, weight:0.35, uom:"each", min:15,  reorder:30,  lead:7  },
    { name:"Over-Ear Headphones NC",     sub:"Audio",       supplierId:"sup_15", cost:35.00, sale:89.99, weight:0.28, uom:"each", min:10,  reorder:20,  lead:21 },
    { name:"USB-C Multiport Adapter",    sub:"Adapters",    supplierId:"sup_1",  cost:18.00, sale:44.99, weight:0.12, uom:"each", min:20,  reorder:40,  lead:7  },
    { name:"HDMI to VGA Adapter",        sub:"Adapters",    supplierId:"sup_1",  cost:6.00,  sale:14.99, weight:0.06, uom:"each", min:20,  reorder:40,  lead:7  },
    { name:"Smart Plug WiFi 2-pack",     sub:"Smart Home",  supplierId:"sup_29", cost:9.00,  sale:24.99, weight:0.10, uom:"pack", min:20,  reorder:40,  lead:10 },
    { name:"LED Smart Bulb E27 10W",     sub:"Smart Home",  supplierId:"sup_29", cost:5.00,  sale:12.99, weight:0.08, uom:"each", min:50,  reorder:100, lead:10 },
    { name:"LED Strip 5m RGB",           sub:"Smart Home",  supplierId:"sup_29", cost:11.00, sale:27.99, weight:0.20, uom:"roll", min:20,  reorder:40,  lead:10 },
    { name:"Power Bank 20000mAh",        sub:"Chargers",    supplierId:"sup_15", cost:20.00, sale:49.99, weight:0.45, uom:"each", min:15,  reorder:30,  lead:21 },
    { name:"MicroSD Card 128GB",         sub:"Storage",     supplierId:"sup_15", cost:8.00,  sale:19.99, weight:0.01, uom:"each", min:50,  reorder:100, lead:21 },
    { name:"SSD External 1TB",           sub:"Storage",     supplierId:"sup_15", cost:45.00, sale:99.99, weight:0.11, uom:"each", min:10,  reorder:20,  lead:21 },
    { name:"USB-C Docking Station",      sub:"Hubs",        supplierId:"sup_15", cost:42.00, sale:109.99,weight:0.35, uom:"each", min:8,   reorder:15,  lead:21 },
    { name:"Screen Cleaning Kit",        sub:"Accessories", supplierId:"sup_1",  cost:3.00,  sale:8.99,  weight:0.12, uom:"set",  min:30,  reorder:60,  lead:7  },
    { name:"Laptop Sleeve 14\"",         sub:"Accessories", supplierId:"sup_1",  cost:7.00,  sale:17.99, weight:0.18, uom:"each", min:20,  reorder:40,  lead:7  },
    { name:"Cable Management Box",       sub:"Accessories", supplierId:"sup_1",  cost:9.00,  sale:21.99, weight:0.30, uom:"each", min:15,  reorder:30,  lead:7  },
  ];

  const fashion: SKUTemplate[] = [
    { name:"Merino Wool Base Layer",     sub:"Base Layers", supplierId:"sup_2",  cost:18.00, sale:54.99, weight:0.25, uom:"each", min:15,  reorder:30,  lead:14 },
    { name:"Softshell Jacket Navy",      sub:"Outerwear",   supplierId:"sup_2",  cost:32.00, sale:89.99, weight:0.68, uom:"each", min:10,  reorder:20,  lead:14 },
    { name:"Cotton Polo Shirt",          sub:"Tops",        supplierId:"sup_6",  cost:8.00,  sale:24.99, weight:0.22, uom:"each", min:30,  reorder:60,  lead:21 },
    { name:"Slim Chino Trouser Navy",    sub:"Bottoms",     supplierId:"sup_6",  cost:14.00, sale:39.99, weight:0.45, uom:"each", min:20,  reorder:40,  lead:21 },
    { name:"Slim Chino Trouser Khaki",   sub:"Bottoms",     supplierId:"sup_6",  cost:14.00, sale:39.99, weight:0.45, uom:"each", min:20,  reorder:40,  lead:21 },
    { name:"Denim Jeans Straight Fit",   sub:"Bottoms",     supplierId:"sup_6",  cost:16.00, sale:44.99, weight:0.55, uom:"each", min:20,  reorder:40,  lead:21 },
    { name:"Leather Belt Brown",         sub:"Accessories", supplierId:"sup_5",  cost:12.00, sale:34.99, weight:0.15, uom:"each", min:15,  reorder:30,  lead:21 },
    { name:"Leather Wallet Slim",        sub:"Accessories", supplierId:"sup_5",  cost:18.00, sale:49.99, weight:0.08, uom:"each", min:15,  reorder:30,  lead:21 },
    { name:"Wool Scarf Grey",            sub:"Accessories", supplierId:"sup_2",  cost:9.00,  sale:27.99, weight:0.12, uom:"each", min:20,  reorder:40,  lead:14 },
    { name:"Knitted Beanie Black",       sub:"Accessories", supplierId:"sup_2",  cost:6.00,  sale:18.99, weight:0.08, uom:"each", min:30,  reorder:60,  lead:14 },
    { name:"Oxford Shirt White",         sub:"Tops",        supplierId:"sup_6",  cost:11.00, sale:34.99, weight:0.28, uom:"each", min:20,  reorder:40,  lead:21 },
    { name:"Oxford Shirt Blue",          sub:"Tops",        supplierId:"sup_6",  cost:11.00, sale:34.99, weight:0.28, uom:"each", min:20,  reorder:40,  lead:21 },
    { name:"Fleece Zip-up Hoodie",       sub:"Outerwear",   supplierId:"sup_25", cost:15.00, sale:42.99, weight:0.50, uom:"each", min:15,  reorder:30,  lead:16 },
    { name:"Sports Leggings",            sub:"Activewear",  supplierId:"sup_25", cost:12.00, sale:34.99, weight:0.30, uom:"each", min:20,  reorder:40,  lead:16 },
    { name:"Running Shorts",             sub:"Activewear",  supplierId:"sup_25", cost:9.00,  sale:24.99, weight:0.20, uom:"each", min:25,  reorder:50,  lead:16 },
    { name:"Canvas Tote Bag Natural",    sub:"Bags",        supplierId:"sup_6",  cost:5.00,  sale:14.99, weight:0.25, uom:"each", min:30,  reorder:60,  lead:21 },
    { name:"Leather Holdall Weekend",    sub:"Bags",        supplierId:"sup_5",  cost:45.00, sale:129.99,weight:1.20, uom:"each", min:5,   reorder:10,  lead:21 },
    { name:"Linen Shirt Summer",         sub:"Tops",        supplierId:"sup_6",  cost:10.00, sale:29.99, weight:0.22, uom:"each", min:20,  reorder:40,  lead:21 },
    { name:"Puffer Gilet Black",         sub:"Outerwear",   supplierId:"sup_2",  cost:22.00, sale:59.99, weight:0.42, uom:"each", min:10,  reorder:20,  lead:14 },
    { name:"Thermal Socks 3-pack",       sub:"Socks",       supplierId:"sup_2",  cost:7.00,  sale:18.99, weight:0.15, uom:"pack", min:40,  reorder:80,  lead:14 },
  ];

  const homeGarden: SKUTemplate[] = [
    { name:"Ceramic Vase Medium",        sub:"Decor",       supplierId:"sup_16", cost:9.00,  sale:24.99, weight:0.55, uom:"each", min:15,  reorder:30,  lead:12 },
    { name:"Scented Candle Vanilla",     sub:"Decor",       supplierId:"sup_10", cost:5.00,  sale:14.99, weight:0.30, uom:"each", min:30,  reorder:60,  lead:10 },
    { name:"Plant Pot Terracotta 20cm",  sub:"Garden",      supplierId:"sup_16", cost:4.00,  sale:11.99, weight:0.60, uom:"each", min:30,  reorder:60,  lead:12 },
    { name:"Raised Planting Bed Cedar",  sub:"Garden",      supplierId:"sup_26", cost:35.00, sale:89.99, weight:8.50, uom:"each", min:5,   reorder:10,  lead:35 },
    { name:"Garden Fork",                sub:"Garden Tools",supplierId:"sup_8",  cost:12.00, sale:29.99, weight:0.85, uom:"each", min:15,  reorder:30,  lead:5  },
    { name:"Garden Trowel",              sub:"Garden Tools",supplierId:"sup_8",  cost:6.00,  sale:14.99, weight:0.32, uom:"each", min:20,  reorder:40,  lead:5  },
    { name:"Stainless Steel Salad Bowl", sub:"Kitchen",     supplierId:"sup_23", cost:8.00,  sale:22.99, weight:0.40, uom:"each", min:20,  reorder:40,  lead:7  },
    { name:"Cast Iron Frying Pan 28cm",  sub:"Cookware",    supplierId:"sup_23", cost:22.00, sale:54.99, weight:1.80, uom:"each", min:10,  reorder:20,  lead:7  },
    { name:"Bamboo Chopping Board",      sub:"Kitchen",     supplierId:"sup_10", cost:7.00,  sale:18.99, weight:0.55, uom:"each", min:20,  reorder:40,  lead:10 },
    { name:"Cushion Cover Linen Grey",   sub:"Textiles",    supplierId:"sup_10", cost:6.00,  sale:16.99, weight:0.22, uom:"each", min:25,  reorder:50,  lead:10 },
    { name:"Throw Blanket Chunky Knit",  sub:"Textiles",    supplierId:"sup_2",  cost:18.00, sale:49.99, weight:0.90, uom:"each", min:10,  reorder:20,  lead:14 },
    { name:"Picture Frame Solid Oak",    sub:"Decor",       supplierId:"sup_17", cost:12.00, sale:32.99, weight:0.65, uom:"each", min:15,  reorder:30,  lead:20 },
    { name:"Wall Clock Minimalist",      sub:"Decor",       supplierId:"sup_10", cost:14.00, sale:38.99, weight:0.45, uom:"each", min:10,  reorder:20,  lead:10 },
    { name:"Diffuser Reed Set",          sub:"Decor",       supplierId:"sup_7",  cost:8.00,  sale:22.99, weight:0.35, uom:"set",  min:20,  reorder:40,  lead:14 },
    { name:"Storage Basket Seagrass M",  sub:"Storage",     supplierId:"sup_10", cost:11.00, sale:28.99, weight:0.70, uom:"each", min:15,  reorder:30,  lead:10 },
  ];

  const automotive: SKUTemplate[] = [
    { name:"Car Phone Mount Magnetic",   sub:"Accessories", supplierId:"sup_12", cost:8.00,  sale:19.99, weight:0.15, uom:"each", min:25,  reorder:50,  lead:5  },
    { name:"Dash Cam 1080p",             sub:"Electronics", supplierId:"sup_12", cost:28.00, sale:69.99, weight:0.22, uom:"each", min:10,  reorder:20,  lead:5  },
    { name:"Tyre Pressure Gauge Digital",sub:"Tools",       supplierId:"sup_12", cost:9.00,  sale:22.99, weight:0.12, uom:"each", min:20,  reorder:40,  lead:5  },
    { name:"Car Air Freshener Cedar",    sub:"Accessories", supplierId:"sup_12", cost:3.00,  sale:7.99,  weight:0.05, uom:"each", min:50,  reorder:100, lead:5  },
    { name:"Microfibre Wash Mitt",       sub:"Cleaning",    supplierId:"sup_12", cost:4.00,  sale:9.99,  weight:0.08, uom:"each", min:40,  reorder:80,  lead:5  },
    { name:"Car Wax Polish 500ml",       sub:"Cleaning",    supplierId:"sup_21", cost:7.00,  sale:17.99, weight:0.55, uom:"each", min:20,  reorder:40,  lead:12 },
    { name:"Jump Starter Pack 600A",     sub:"Tools",       supplierId:"sup_21", cost:38.00, sale:89.99, weight:1.20, uom:"each", min:8,   reorder:15,  lead:12 },
    { name:"Windscreen De-icer 500ml",   sub:"Accessories", supplierId:"sup_12", cost:3.50,  sale:8.99,  weight:0.50, uom:"each", min:40,  reorder:80,  lead:5  },
    { name:"Sat Nav Suction Mount",      sub:"Accessories", supplierId:"sup_12", cost:6.00,  sale:14.99, weight:0.10, uom:"each", min:20,  reorder:40,  lead:5  },
    { name:"OBD2 Diagnostic Scanner",    sub:"Tools",       supplierId:"sup_21", cost:22.00, sale:54.99, weight:0.30, uom:"each", min:10,  reorder:20,  lead:12 },
  ];

  const healthBeauty: SKUTemplate[] = [
    { name:"Vitamin C Serum 30ml",       sub:"Skincare",    supplierId:"sup_7",  cost:9.00,  sale:26.99, weight:0.08, uom:"each", min:30,  reorder:60,  lead:14 },
    { name:"SPF 50 Sunscreen 100ml",     sub:"Skincare",    supplierId:"sup_7",  cost:7.00,  sale:19.99, weight:0.12, uom:"each", min:30,  reorder:60,  lead:14 },
    { name:"Hyaluronic Moisturiser",     sub:"Skincare",    supplierId:"sup_7",  cost:11.00, sale:32.99, weight:0.10, uom:"each", min:25,  reorder:50,  lead:14 },
    { name:"Ashwagandha Capsules 60",    sub:"Supplements", supplierId:"sup_30", cost:8.00,  sale:22.99, weight:0.12, uom:"each", min:30,  reorder:60,  lead:18 },
    { name:"Omega-3 Fish Oil 90 caps",   sub:"Supplements", supplierId:"sup_18", cost:10.00, sale:27.99, weight:0.18, uom:"each", min:25,  reorder:50,  lead:25 },
    { name:"Collagen Powder 300g",       sub:"Supplements", supplierId:"sup_18", cost:16.00, sale:44.99, weight:0.32, uom:"each", min:15,  reorder:30,  lead:25 },
    { name:"Bamboo Toothbrush 4-pack",   sub:"Personal Care",supplierId:"sup_20",cost:4.00,  sale:11.99, weight:0.10, uom:"pack", min:40,  reorder:80,  lead:8  },
    { name:"Natural Deodorant Stick",    sub:"Personal Care",supplierId:"sup_7", cost:5.00,  sale:13.99, weight:0.06, uom:"each", min:30,  reorder:60,  lead:14 },
    { name:"Rose Water Toner 150ml",     sub:"Skincare",    supplierId:"sup_24", cost:6.00,  sale:16.99, weight:0.18, uom:"each", min:30,  reorder:60,  lead:25 },
    { name:"Jade Gua Sha Tool",          sub:"Skincare",    supplierId:"sup_24", cost:7.00,  sale:18.99, weight:0.12, uom:"each", min:20,  reorder:40,  lead:25 },
    { name:"Lip Balm SPF 15 3-pack",     sub:"Personal Care",supplierId:"sup_7", cost:4.00,  sale:10.99, weight:0.05, uom:"pack", min:40,  reorder:80,  lead:14 },
    { name:"Activated Charcoal Mask",    sub:"Skincare",    supplierId:"sup_24", cost:5.50,  sale:14.99, weight:0.09, uom:"each", min:25,  reorder:50,  lead:25 },
  ];

  const grocery: SKUTemplate[] = [
    { name:"Extra Virgin Olive Oil 500ml",sub:"Oils & Dressings",supplierId:"sup_28",cost:4.50,sale:10.99,weight:0.55,uom:"each",min:40,reorder:80,lead:7 },
    { name:"Dijon Mustard 200g",          sub:"Condiments",     supplierId:"sup_28",cost:2.00,sale:4.99,weight:0.22,uom:"each",min:50,reorder:100,lead:7 },
    { name:"Red Wine Vinegar 500ml",      sub:"Oils & Dressings",supplierId:"sup_28",cost:2.50,sale:5.99,weight:0.55,uom:"each",min:40,reorder:80,lead:7 },
    { name:"Organic Honey 340g",          sub:"Sweet",          supplierId:"sup_11",cost:5.00,sale:11.99,weight:0.40,uom:"each",min:30,reorder:60,lead:3 },
    { name:"Basmati Rice 1kg",            sub:"Dry Goods",      supplierId:"sup_11",cost:1.80,sale:3.99,weight:1.05,uom:"each",min:80,reorder:160,lead:3 },
    { name:"Pasta Fusilli 500g",          sub:"Dry Goods",      supplierId:"sup_28",cost:1.20,sale:2.79,weight:0.52,uom:"each",min:100,reorder:200,lead:7 },
    { name:"Dark Chocolate 72% 100g",     sub:"Confectionery",  supplierId:"sup_28",cost:2.00,sale:4.49,weight:0.11,uom:"each",min:60,reorder:120,lead:7 },
    { name:"Ground Coffee Arabica 250g",  sub:"Beverages",      supplierId:"sup_11",cost:4.00,sale:9.99,weight:0.26,uom:"each",min:40,reorder:80,lead:3 },
    { name:"Green Tea 50 bags",           sub:"Beverages",      supplierId:"sup_18",cost:3.00,sale:7.49,weight:0.12,uom:"each",min:40,reorder:80,lead:25 },
    { name:"Quinoa 500g",                 sub:"Dry Goods",      supplierId:"sup_11",cost:3.00,sale:6.99,weight:0.52,uom:"each",min:40,reorder:80,lead:3 },
    { name:"Almond Butter 340g",          sub:"Spreads",        supplierId:"sup_11",cost:4.50,sale:10.49,weight:0.38,uom:"each",min:30,reorder:60,lead:3 },
    { name:"Coconut Milk 400ml",          sub:"Cooking",        supplierId:"sup_11",cost:1.50,sale:3.49,weight:0.43,uom:"each",min:60,reorder:120,lead:3 },
    { name:"Sea Salt Flakes 250g",        sub:"Condiments",     supplierId:"sup_28",cost:3.00,sale:6.99,weight:0.26,uom:"each",min:30,reorder:60,lead:7 },
    { name:"Mixed Spice Blend 50g",       sub:"Spices",         supplierId:"sup_30",cost:2.50,sale:5.99,weight:0.07,uom:"each",min:30,reorder:60,lead:18 },
    { name:"Turmeric Ground 100g",        sub:"Spices",         supplierId:"sup_30",cost:1.80,sale:4.49,weight:0.11,uom:"each",min:40,reorder:80,lead:18 },
  ];

  const tools: SKUTemplate[] = [
    { name:"Cordless Drill 18V",         sub:"Power Tools",  supplierId:"sup_4",  cost:55.00, sale:129.99,weight:1.80, uom:"each", min:5,   reorder:10,  lead:10 },
    { name:"Jigsaw 500W",                sub:"Power Tools",  supplierId:"sup_4",  cost:48.00, sale:109.99,weight:2.10, uom:"each", min:5,   reorder:10,  lead:10 },
    { name:"Circular Saw 165mm",         sub:"Power Tools",  supplierId:"sup_4",  cost:65.00, sale:149.99,weight:3.20, uom:"each", min:5,   reorder:10,  lead:10 },
    { name:"Combination Spanner Set 8pc",sub:"Hand Tools",   supplierId:"sup_8",  cost:18.00, sale:42.99, weight:0.65, uom:"set",  min:15,  reorder:30,  lead:5  },
    { name:"Screwdriver Set 10pc",       sub:"Hand Tools",   supplierId:"sup_8",  cost:12.00, sale:28.99, weight:0.45, uom:"set",  min:20,  reorder:40,  lead:5  },
    { name:"Allen Key Set Metric",       sub:"Hand Tools",   supplierId:"sup_8",  cost:7.00,  sale:16.99, weight:0.22, uom:"set",  min:25,  reorder:50,  lead:5  },
    { name:"Tape Measure 5m",            sub:"Measuring",    supplierId:"sup_8",  cost:5.00,  sale:12.99, weight:0.18, uom:"each", min:30,  reorder:60,  lead:5  },
    { name:"Spirit Level 600mm",         sub:"Measuring",    supplierId:"sup_4",  cost:9.00,  sale:22.99, weight:0.55, uom:"each", min:15,  reorder:30,  lead:10 },
    { name:"Safety Goggles CE",          sub:"Safety",       supplierId:"sup_4",  cost:4.00,  sale:9.99,  weight:0.10, uom:"each", min:30,  reorder:60,  lead:10 },
    { name:"Work Gloves L",              sub:"Safety",       supplierId:"sup_8",  cost:5.00,  sale:12.99, weight:0.12, uom:"pair", min:30,  reorder:60,  lead:5  },
  ];

  const sports: SKUTemplate[] = [
    { name:"Yoga Mat Non-slip 6mm",      sub:"Yoga",         supplierId:"sup_9",  cost:14.00, sale:34.99, weight:1.10, uom:"each", min:15,  reorder:30,  lead:18 },
    { name:"Resistance Bands Set 5",     sub:"Fitness",      supplierId:"sup_9",  cost:8.00,  sale:19.99, weight:0.25, uom:"set",  min:20,  reorder:40,  lead:18 },
    { name:"Foam Roller 45cm",           sub:"Recovery",     supplierId:"sup_9",  cost:10.00, sale:24.99, weight:0.55, uom:"each", min:15,  reorder:30,  lead:18 },
    { name:"Kettlebell 8kg",             sub:"Weights",      supplierId:"sup_9",  cost:22.00, sale:49.99, weight:8.20, uom:"each", min:8,   reorder:15,  lead:18 },
    { name:"Dumbbell Pair 5kg",          sub:"Weights",      supplierId:"sup_9",  cost:20.00, sale:44.99, weight:10.50,uom:"pair", min:8,   reorder:15,  lead:18 },
    { name:"Running Water Bottle 750ml", sub:"Accessories",  supplierId:"sup_22", cost:8.00,  sale:19.99, weight:0.18, uom:"each", min:25,  reorder:50,  lead:10 },
    { name:"Sports Headband 2-pack",     sub:"Accessories",  supplierId:"sup_22", cost:4.00,  sale:9.99,  weight:0.06, uom:"pack", min:30,  reorder:60,  lead:10 },
    { name:"Jump Rope Adjustable",       sub:"Fitness",      supplierId:"sup_9",  cost:6.00,  sale:14.99, weight:0.20, uom:"each", min:20,  reorder:40,  lead:18 },
    { name:"Gym Bag Medium",             sub:"Bags",         supplierId:"sup_22", cost:18.00, sale:44.99, weight:0.55, uom:"each", min:10,  reorder:20,  lead:10 },
    { name:"Compression Socks Sports",   sub:"Apparel",      supplierId:"sup_22", cost:7.00,  sale:17.99, weight:0.10, uom:"pair", min:30,  reorder:60,  lead:10 },
    { name:"Shaker Bottle 700ml",        sub:"Accessories",  supplierId:"sup_9",  cost:5.00,  sale:12.99, weight:0.19, uom:"each", min:30,  reorder:60,  lead:18 },
    { name:"Massage Ball Set 3pc",       sub:"Recovery",     supplierId:"sup_9",  cost:9.00,  sale:21.99, weight:0.35, uom:"set",  min:15,  reorder:30,  lead:18 },
  ];

  const toys: SKUTemplate[] = [
    { name:"Wooden Building Blocks 50pc",sub:"Construction", supplierId:"sup_13", cost:14.00, sale:34.99, weight:1.20, uom:"set",  min:15,  reorder:30,  lead:14 },
    { name:"Magnetic Tiles 32pc",        sub:"Construction", supplierId:"sup_13", cost:22.00, sale:54.99, weight:0.65, uom:"set",  min:10,  reorder:20,  lead:14 },
    { name:"Craft Kit Age 6+",           sub:"Arts & Crafts",supplierId:"sup_13", cost:10.00, sale:24.99, weight:0.55, uom:"set",  min:15,  reorder:30,  lead:14 },
    { name:"Jigsaw Puzzle 500pc",        sub:"Puzzles",      supplierId:"sup_13", cost:8.00,  sale:18.99, weight:0.60, uom:"each", min:20,  reorder:40,  lead:14 },
    { name:"Card Game Classic",          sub:"Board Games",  supplierId:"sup_13", cost:6.00,  sale:14.99, weight:0.35, uom:"each", min:25,  reorder:50,  lead:14 },
    { name:"Plush Toy Bear",             sub:"Soft Toys",    supplierId:"sup_19", cost:9.00,  sale:21.99, weight:0.28, uom:"each", min:20,  reorder:40,  lead:30 },
    { name:"Outdoor Kite Stunt",         sub:"Outdoor",      supplierId:"sup_9",  cost:11.00, sale:26.99, weight:0.22, uom:"each", min:15,  reorder:30,  lead:18 },
    { name:"Science Kit Volcano",        sub:"Educational",  supplierId:"sup_13", cost:12.00, sale:28.99, weight:0.75, uom:"each", min:10,  reorder:20,  lead:14 },
    { name:"Chalk Set Outdoor",          sub:"Arts & Crafts",supplierId:"sup_13", cost:3.50,  sale:8.99,  weight:0.45, uom:"set",  min:30,  reorder:60,  lead:14 },
    { name:"Play-Doh Set 12 Colours",    sub:"Arts & Crafts",supplierId:"sup_13", cost:8.00,  sale:19.99, weight:0.80, uom:"set",  min:15,  reorder:30,  lead:14 },
  ];

  const office: SKUTemplate[] = [
    { name:"A4 Printer Paper 500 sheets",sub:"Stationery",   supplierId:"sup_14", cost:4.50,  sale:8.99,  weight:2.40, uom:"pack", min:50,  reorder:100, lead:4  },
    { name:"Ballpoint Pens 10-pack Blue",sub:"Stationery",   supplierId:"sup_14", cost:2.00,  sale:4.99,  weight:0.08, uom:"pack", min:60,  reorder:120, lead:4  },
    { name:"Sticky Notes 4-pack",        sub:"Stationery",   supplierId:"sup_14", cost:2.50,  sale:5.99,  weight:0.12, uom:"pack", min:50,  reorder:100, lead:4  },
    { name:"Ring Binder A4",             sub:"Filing",       supplierId:"sup_14", cost:3.00,  sale:6.99,  weight:0.45, uom:"each", min:30,  reorder:60,  lead:4  },
    { name:"Desk Organiser Tray",        sub:"Accessories",  supplierId:"sup_14", cost:8.00,  sale:18.99, weight:0.55, uom:"each", min:20,  reorder:40,  lead:4  },
    { name:"Ergonomic Chair Lumbar",     sub:"Furniture",    supplierId:"sup_17", cost:85.00, sale:199.99,weight:12.50,uom:"each", min:3,   reorder:5,   lead:20 },
    { name:"Monitor Arm Single",         sub:"Accessories",  supplierId:"sup_4",  cost:28.00, sale:64.99, weight:3.20, uom:"each", min:8,   reorder:15,  lead:10 },
    { name:"Whiteboard 90x60cm",         sub:"Presentation", supplierId:"sup_14", cost:22.00, sale:49.99, weight:2.40, uom:"each", min:5,   reorder:10,  lead:4  },
    { name:"Document Shredder 5-sheet",  sub:"Equipment",    supplierId:"sup_14", cost:32.00, sale:69.99, weight:4.50, uom:"each", min:5,   reorder:10,  lead:4  },
    { name:"Label Maker Handheld",       sub:"Equipment",    supplierId:"sup_14", cost:18.00, sale:39.99, weight:0.38, uom:"each", min:10,  reorder:20,  lead:4  },
  ];

  // Combine all templates
  const allTemplates: Array<{ cat: string; t: SKUTemplate }> = [
    ...electronics.map(t => ({ cat:"Electronics",    t })),
    ...fashion.map(t     => ({ cat:"Fashion",         t })),
    ...homeGarden.map(t  => ({ cat:"Home & Garden",   t })),
    ...automotive.map(t  => ({ cat:"Automotive",      t })),
    ...healthBeauty.map(t=> ({ cat:"Health & Beauty", t })),
    ...grocery.map(t     => ({ cat:"Grocery",         t })),
    ...tools.map(t       => ({ cat:"Tools",            t })),
    ...sports.map(t      => ({ cat:"Sports",           t })),
    ...toys.map(t        => ({ cat:"Toys",             t })),
    ...office.map(t      => ({ cat:"Office",           t })),
  ];

  // Build SKUs — include multiple variants to reach ~500
  const skus: SKU[] = [];
  const catCounters: Record<string, number> = {};
  const catPrefix: Record<string, string> = {
    "Electronics":    "ELEC",
    "Fashion":        "FASH",
    "Home & Garden":  "HOME",
    "Automotive":     "AUTO",
    "Health & Beauty":"HLTH",
    "Grocery":        "GROC",
    "Tools":          "TOOL",
    "Sports":         "SPRT",
    "Toys":           "TOYS",
    "Office":         "OFFC",
  };

  // Base SKUs
  for (const { cat, t } of allTemplates) {
    catCounters[cat] = (catCounters[cat] ?? 0) + 1;
    const num = String(catCounters[cat]).padStart(3, "0");
    const id  = `sku_${skus.length + 1}`;
    skus.push({
      id, code:`${catPrefix[cat]}-${num}`,
      name:t.name, description:"",
      category:cat, subcategory:t.sub,
      supplierId:t.supplierId, supplierCode:"",
      unitOfMeasure:t.uom,
      costPrice:t.cost, salePrice:t.sale,
      weight:t.weight, dimensions:"",
      barcode:"", minStockLevel:t.min,
      reorderPoint:t.reorder, leadTimeDays:t.lead,
      status:"active", notes:"", createdAt:now, updatedAt:now,
    });
  }

  // Colour / size variants to bulk up to ~500
  const colourVariants = ["Black","White","Grey","Navy","Red","Green","Blue","Pink","Yellow","Burgundy"];
  const sizeVariants   = ["XS","S","M","L","XL","XXL"];
  const targetTotal    = 500;

  // Add colour variants for fashion and sports items
  const variantTemplates = [...fashion.slice(0,8), ...sports.slice(0,5)];
  for (const { cat, t } of variantTemplates.flatMap(t => [{ cat: fashion.includes(t) ? "Fashion" : "Sports", t }])) {
    if (skus.length >= targetTotal) break;
    for (const colour of colourVariants) {
      if (skus.length >= targetTotal) break;
      catCounters[cat] = (catCounters[cat] ?? 0) + 1;
      const num = String(catCounters[cat]).padStart(3, "0");
      const id  = `sku_${skus.length + 1}`;
      skus.push({
        id, code:`${catPrefix[cat]}-${num}`,
        name:`${t.name} — ${colour}`,
        description:"", category:cat, subcategory:t.sub,
        supplierId:t.supplierId, supplierCode:"",
        unitOfMeasure:t.uom,
        costPrice:t.cost, salePrice:t.sale,
        weight:t.weight, dimensions:"",
        barcode:"", minStockLevel:t.min,
        reorderPoint:t.reorder, leadTimeDays:t.lead,
        status:"active", notes:"", createdAt:now, updatedAt:now,
      });
    }
  }

  // Add size variants for remaining fashion items
  const fashionSizeTemplates = [fashion[0], fashion[3], fashion[4], fashion[5], fashion[10], fashion[11]].filter(Boolean);
  for (const t of fashionSizeTemplates) {
    if (skus.length >= targetTotal) break;
    for (const size of sizeVariants) {
      if (skus.length >= targetTotal) break;
      const cat = "Fashion";
      catCounters[cat] = (catCounters[cat] ?? 0) + 1;
      const num = String(catCounters[cat]).padStart(3, "0");
      const id  = `sku_${skus.length + 1}`;
      skus.push({
        id, code:`${catPrefix[cat]}-${num}`,
        name:`${t.name} Size ${size}`,
        description:"", category:cat, subcategory:t.sub,
        supplierId:t.supplierId, supplierCode:"",
        unitOfMeasure:t.uom,
        costPrice:t.cost, salePrice:t.sale,
        weight:t.weight, dimensions:"",
        barcode:"", minStockLevel:t.min,
        reorderPoint:t.reorder, leadTimeDays:t.lead,
        status:"active", notes:"", createdAt:now, updatedAt:now,
      });
    }
  }

  // Pad with electronics variants if still short
  const elecPadTemplates = [electronics[6], electronics[9], electronics[10], electronics[16], electronics[20], electronics[21]];
  const elecPadSuffixes  = ["Pro","Max","Mini","Plus","Ultra","Lite"];
  for (const t of elecPadTemplates) {
    if (!t) continue;
    if (skus.length >= targetTotal) break;
    for (const sfx of elecPadSuffixes) {
      if (skus.length >= targetTotal) break;
      const cat = "Electronics";
      catCounters[cat] = (catCounters[cat] ?? 0) + 1;
      const num = String(catCounters[cat]).padStart(3, "0");
      const id  = `sku_${skus.length + 1}`;
      skus.push({
        id, code:`${catPrefix[cat]}-${num}`,
        name:`${t.name} ${sfx}`,
        description:"", category:cat, subcategory:t.sub,
        supplierId:t.supplierId, supplierCode:"",
        unitOfMeasure:t.uom,
        costPrice: +(t.cost * 1.2).toFixed(2),
        salePrice: +(t.sale * 1.2).toFixed(2),
        weight:t.weight, dimensions:"",
        barcode:"", minStockLevel:t.min,
        reorderPoint:t.reorder, leadTimeDays:t.lead,
        status:"active", notes:"", createdAt:now, updatedAt:now,
      });
    }
  }

  // ── Stock entries — one or two locations per SKU (first 100 SKUs) ──────────────
  const WAREHOUSES = ["Warehouse A — London","Warehouse B — Manchester","Warehouse C — Birmingham","Depot — Bristol","Store — Edinburgh"];
  const stock: StockEntry[] = skus.slice(0, 100).flatMap((s, i) => {
    const baseQty = Math.max(0, Math.floor(Math.random() * 200));
    const entries: StockEntry[] = [{
      id: `stk_${i * 2 + 1}`,
      skuId: s.id,
      location: WAREHOUSES[i % WAREHOUSES.length],
      quantity: baseQty,
      reservedQty: Math.floor(baseQty * 0.1),
      lastCountDate: today,
      updatedAt: now,
    }];
    if (i % 3 === 0) {
      entries.push({
        id: `stk_${i * 2 + 2}`,
        skuId: s.id,
        location: WAREHOUSES[(i + 2) % WAREHOUSES.length],
        quantity: Math.floor(Math.random() * 80),
        reservedQty: 0,
        lastCountDate: today,
        updatedAt: now,
      });
    }
    return entries;
  });

  // ── Projects ───────────────────────────────────────────────────────────────────
  const projects: Project[] = [
    {
      id:"prj_1", name:"Summer Tech Bundle Q3",
      description:"Bundled electronics range for Q3 retail push",
      status:"active", clientName:"RetailCo UK Ltd",
      supplierId:"sup_1", warehouseLocation:"Warehouse A — London",
      targetAddress:"45 Oxford St, London W1D 2DZ",
      paymentTerms:"Net 30",
      startDate:"2026-04-01", endDate:"2026-06-30",
      items:[
        { skuId:"sku_1", qtyRequired:500, qtyAllocated:248 },
        { skuId:"sku_9", qtyRequired:300, qtyAllocated:60 },
      ],
      notes:"Priority project — align with marketing campaign",
      createdAt:now, updatedAt:now,
    },
    {
      id:"prj_2", name:"Autumn/Winter Fashion Drop",
      description:"Nordic textile range for A/W season",
      status:"planning", clientName:"StyleForward Ltd",
      supplierId:"sup_2", warehouseLocation:"Warehouse B — Manchester",
      targetAddress:"12 Exchange Sq, Manchester M2 7HA",
      paymentTerms:"Net 45",
      startDate:"2026-07-01", endDate:"2026-09-15",
      items:[
        { skuId:"sku_31", qtyRequired:200, qtyAllocated:0 },
        { skuId:"sku_32", qtyRequired:150, qtyAllocated:0 },
      ],
      notes:"Awaiting final range confirmation",
      createdAt:now, updatedAt:now,
    },
    {
      id:"prj_3", name:"Tools Distribution Q2",
      description:"Sheffield tools range for hardware retailers",
      status:"active", clientName:"BuildRight Supplies",
      supplierId:"sup_8", warehouseLocation:"Warehouse C — Birmingham",
      targetAddress:"33 New St, Birmingham B2 4RX",
      paymentTerms:"Net 14",
      startDate:"2026-03-15", endDate:"2026-05-31",
      items:[
        { skuId:"sku_100", qtyRequired:200, qtyAllocated:150 },
        { skuId:"sku_101", qtyRequired:300, qtyAllocated:200 },
      ],
      notes:"High priority for spring trade season",
      createdAt:now, updatedAt:now,
    },
  ];

  // ── Transport jobs ─────────────────────────────────────────────────────────────
  const transport: TransportJob[] = [
    {
      id:"trn_1", ref:"TRN-0001",
      items:[{ skuId:"sku_1", qty:200 },{ skuId:"sku_9", qty:100 }],
      origin:"Manchester Warehouse B", destination:"London Warehouse A",
      driver:"DHL Express", trackingRef:"DHL1234567890",
      status:"in_transit",
      scheduledDate:"2026-04-18", deliveredDate:null,
      notes:"Priority shipment for Q3 tech bundle",
      createdAt:now, updatedAt:now,
    },
    {
      id:"trn_2", ref:"TRN-0002",
      items:[{ skuId:"sku_31", qty:50 },{ skuId:"sku_32", qty:30 }],
      origin:"Edinburgh Depot", destination:"Bristol Store",
      driver:"DPD", trackingRef:"DPD987654321",
      status:"pending",
      scheduledDate:"2026-04-22", deliveredDate:null,
      notes:"Fashion range — South West distribution",
      createdAt:now, updatedAt:now,
    },
    {
      id:"trn_3", ref:"TRN-0003",
      items:[{ skuId:"sku_7", qty:30 }],
      origin:"Birmingham Warehouse C", destination:"Leeds",
      driver:"Evri", trackingRef:"EVR-112233",
      status:"delivered",
      scheduledDate:"2026-04-10", deliveredDate:"2026-04-12",
      notes:"",
      createdAt:now, updatedAt:now,
    },
    {
      id:"trn_4", ref:"TRN-0004",
      items:[{ skuId:"sku_100", qty:80 },{ skuId:"sku_101", qty:120 }],
      origin:"Sheffield", destination:"Birmingham Warehouse C",
      driver:"TNT", trackingRef:"TNT445566",
      status:"in_transit",
      scheduledDate:"2026-04-19", deliveredDate:null,
      notes:"Tools batch for BuildRight",
      createdAt:now, updatedAt:now,
    },
    {
      id:"trn_5", ref:"TRN-0005",
      items:[{ skuId:"sku_61", qty:200 },{ skuId:"sku_62", qty:150 }],
      origin:"London Warehouse A", destination:"Edinburgh Depot",
      driver:"Royal Mail Tracked", trackingRef:"RMT778899",
      status:"pending",
      scheduledDate:"2026-04-25", deliveredDate:null,
      notes:"Grocery restocking run",
      createdAt:now, updatedAt:now,
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

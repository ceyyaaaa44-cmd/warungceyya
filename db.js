'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const isVercel = !!process.env.VERCEL;
const DATA_DIR = isVercel ? '/tmp' : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'data.json');
const SOURCE_DB = path.join(__dirname, 'data', 'data.json');

let db = null;

/* ----------------------------- helpers ----------------------------- */

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function uid(prefix = '') {
  return prefix + crypto.randomBytes(6).toString('hex');
}

function now() {
  return new Date().toISOString();
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayKeyOf(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(n, w) {
  return String(n).padStart(w, '0');
}

/* ----------------------------- seed data ----------------------------- */

const SEED_CATEGORIES = [
  { name: 'Makanan', icon: '🍔', color: '#2563eb' },
  { name: 'Minuman', icon: '🥤', color: '#06b6d4' },
  { name: 'Snack', icon: '🍟', color: '#eab308' },
  { name: 'Dessert', icon: '🍰', color: '#8b5cf6' },
  { name: 'Lainnya', icon: '🧰', color: '#64748b' },
];

const SEED_PRODUCTS = [
  { name: 'Burger', emoji: '🍔', cat: 'Makanan', price: 30000, stock: 500, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop' },
  { name: 'Pizza', emoji: '🍕', cat: 'Makanan', price: 65000, stock: 700, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop' },
  { name: 'Nasi Goreng', emoji: '🍛', cat: 'Makanan', price: 25000, stock: 320, image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop' },
  { name: 'Mie Goreng', emoji: '🍜', cat: 'Makanan', price: 20000, stock: 280, image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&auto=format&fit=crop' },
  { name: 'Ayam Geprek', emoji: '🍗', cat: 'Makanan', price: 22000, stock: 260, image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&auto=format&fit=crop' },
  { name: 'Bakso', emoji: '🍲', cat: 'Makanan', price: 18000, stock: 300, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop' },
  { name: 'Somay', emoji: '🥟', cat: 'Makanan', price: 15000, stock: 210, image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&auto=format&fit=crop' },
  { name: 'Kentang Goreng', emoji: '🍟', cat: 'Snack', price: 17000, stock: 340, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&auto=format&fit=crop' },
  { name: 'Cireng', emoji: '🍥', cat: 'Snack', price: 13000, stock: 260, image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=400&auto=format&fit=crop' },
  { name: 'Keripik', emoji: '🥨', cat: 'Snack', price: 15000, stock: 380, image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop' },
  { name: 'Es Teh', emoji: '🧋', cat: 'Minuman', price: 10000, stock: 900, image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop' },
  { name: 'Es Jeruk', emoji: '🍊', cat: 'Minuman', price: 12000, stock: 480, image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&auto=format&fit=crop' },
  { name: 'Jus Mangga', emoji: '🥭', cat: 'Minuman', price: 15000, stock: 260, image: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&auto=format&fit=crop' },
  { name: 'Kopi Susu', emoji: '☕', cat: 'Minuman', price: 18000, stock: 300, image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&auto=format&fit=crop' },
  { name: 'Teh Hangat', emoji: '🍵', cat: 'Minuman', price: 8000, stock: 600, image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop' },
  { name: 'Air Mineral', emoji: '💧', cat: 'Minuman', price: 5000, stock: 1200, image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4e?w=400&auto=format&fit=crop' },
  { name: 'Es Cream', emoji: '🍨', cat: 'Dessert', price: 16000, stock: 200, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&auto=format&fit=crop' },
  { name: 'Donat', emoji: '🍩', cat: 'Dessert', price: 12000, stock: 240, image: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=400&auto=format&fit=crop' },
  { name: 'Brownies', emoji: '🍫', cat: 'Dessert', price: 20000, stock: 180, image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&auto=format&fit=crop' },
  { name: 'Roti Bakar', emoji: '🍞', cat: 'Dessert', price: 14000, stock: 220, image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&auto=format&fit=crop' },
];

const UNITS = ['Porsi', 'Pcs', 'Gelas', 'Botol', 'Pack', 'Kg', 'Lusin'];

function seedDatabase() {
  const rng = mulberry32(20260806);

  const categories = SEED_CATEGORIES.map((c) => ({
    id: uid('cat_'),
    name: c.name,
    icon: c.icon,
    color: c.color,
    createdAt: now(),
  }));
  const catIdByName = {};
  categories.forEach((c) => { catIdByName[c.name] = c.id; });

  const products = SEED_PRODUCTS.map((p) => ({
    id: uid('prd_'),
    name: p.name,
    emoji: p.emoji,
    image: p.image || '',
    categoryId: catIdByName[p.cat],
    price: p.price,
    modal: Math.round(p.price * (0.5 + rng() * 0.2)),
    stock: p.stock,
    unit: UNITS[Math.floor(rng() * UNITS.length)],
    barcode: '899' + String(Math.floor(100000000 + rng() * 899999999)),
    status: 'aktif',
    createdAt: now(),
    updatedAt: now(),
  }));

  const suppliers = [
    { id: uid('sup_'), name: 'CV Sumber Makmur', phone: '0812-3456-7890', address: 'Jl. Merdeka No. 12, Bandung', createdAt: now() },
    { id: uid('sup_'), name: 'PT Pangan Jaya', phone: '0821-9876-5432', address: 'Jl. Sudirman No. 45, Jakarta', createdAt: now() },
  ];

  const customers = [
    { id: uid('cus_'), name: 'Budi Santoso', phone: '0813-1111-2222', createdAt: now() },
    { id: uid('cus_'), name: 'Siti Rahma', phone: '0812-9999-8888', createdAt: now() },
  ];

  const users = [
    { id: uid('usr_'), name: 'Admin Warung', username: 'admin', role: 'admin', status: 'aktif', createdAt: now() },
    { id: uid('usr_'), name: 'Andi Kasir', username: 'kasir1', role: 'kasir', status: 'aktif', createdAt: now() },
  ];

  /* ---- riwayat penjualan (flat, untuk dashboard & laporan) ---- */
  const transactions = [];
  const daysBack = 90;
  for (let d = daysBack; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const countToday = Math.max(4, Math.floor(rng() * 8) + 2);
    for (let i = 0; i < countToday; i++) {
      const product = products[Math.floor(rng() * products.length)];
      const qty = Math.floor(rng() * 5) + 1;
      const base = new Date(date);
      base.setHours(Math.floor(rng() * 10) + 9, Math.floor(rng() * 60), 0, 0);
      const price = product.price;
      const qtyReal = Math.floor(rng() * 4) + 1;
      transactions.push({
        id: uid('trx_'),
        invoiceNo: 'INV' + pad(1000 + Math.floor(rng() * 500), 4),
        productId: product.id,
        productName: product.name,
        productEmoji: product.emoji,
        qty: qtyReal,
        price,
        modal: product.modal,
        total: price * qtyReal,
        status: 'Lunas',
        method: ['Tunai', 'QRIS', 'Transfer'][Math.floor(rng() * 3)],
        kasir: users[Math.floor(rng() * users.length)].name,
        createdAt: base.toISOString(),
      });
    }
  }

  // pastikan "penjualan hari ini" bermakna
  const today = todayKey();
  const todaySum = () =>
    transactions.filter((t) => dayKeyOf(t.createdAt) === today).reduce((a, t) => a + t.total, 0);
  while (todaySum() < 2400000) {
    const d = new Date();
    d.setHours(Math.floor(rng() * 10) + 9, Math.floor(rng() * 60), 0, 0);
    const product = products[Math.floor(rng() * products.length)];
    const qty = Math.floor(rng() * 4) + 1;
    transactions.push({
      id: uid('trx_'),
      invoiceNo: 'INV' + pad(1000 + Math.floor(rng() * 500), 4),
      productId: product.id,
      productName: product.name,
      productEmoji: product.emoji,
      qty,
      price: product.price,
      modal: product.modal,
      total: product.price * qty,
      status: 'Lunas',
      method: ['Tunai', 'QRIS', 'Transfer'][Math.floor(rng() * 3)],
      kasir: users[Math.floor(rng() * users.length)].name,
      createdAt: d.toISOString(),
    });
  }

  /* ---- beberapa pesanan (header multi-item) untuk Riwayat ---- */
  const orders = [];
  for (let i = 0; i < 12; i++) {
    const dt = new Date();
    dt.setDate(dt.getDate() - Math.floor(rng() * 6));
    dt.setHours(Math.floor(rng() * 10) + 9, Math.floor(rng() * 60), 0, 0);
    const itemCount = 1 + Math.floor(rng() * 3);
    const items = [];
    for (let j = 0; j < itemCount; j++) {
      const p = products[Math.floor(rng() * products.length)];
      const qty = 1 + Math.floor(rng() * 3);
      items.push({ productId: p.id, productName: p.name, productEmoji: p.emoji, qty, price: p.price, total: p.price * qty });
    }
    const subtotal = items.reduce((a, it) => a + it.total, 0);
    const taxRate = 10;
    const tax = Math.round(subtotal * taxRate / 100);
    const total = subtotal + tax;
    const method = ['Tunai', 'QRIS', 'Transfer'][Math.floor(rng() * 3)];
    const paid = method === 'Tunai' ? Math.ceil(total / 50000) * 50000 : total;
    orders.push({
      id: 'INV' + pad(1500 + i, 4),
      items,
      subtotal,
      discount: 0,
      taxRate,
      tax,
      total,
      paid,
      change: paid - total,
      method,
      status: 'Lunas',
      kasir: users[Math.floor(rng() * users.length)].name,
      createdAt: dt.toISOString(),
    });
  }

  /* ---- riwayat stok ---- */
  const stockHistory = [];
  for (let i = 0; i < 8; i++) {
    const p = products[Math.floor(rng() * products.length)];
    const type = rng() > 0.5 ? 'masuk' : 'keluar';
    const qty = 1 + Math.floor(rng() * 30);
    const dt = new Date();
    dt.setDate(dt.getDate() - Math.floor(rng() * 10));
    stockHistory.push({
      id: uid('stk_'),
      productId: p.id,
      productName: p.name,
      productEmoji: p.emoji,
      type,
      qty,
      reason: type === 'masuk' ? 'Pembelian dari supplier' : 'Penjualan',
      user: users[0].name,
      createdAt: dt.toISOString(),
    });
  }

  db = {
    users,
    categories,
    products,
    suppliers,
    customers,
    transactions,
    orders,
    stockHistory,
    sessions: {},
    settings: {
      storeName: 'Warung Cemilan',
      tagline: 'Aneka makanan & minuman segar',
      address: 'Jl. Contoh No. 88, Bandung',
      phone: '0812-3456-7890',
      logo: '🏪',
      taxRate: 10,
      discountDefault: 0,
      printer: 'thermal',
      invoiceSeq: 1600,
    },
  };
  save();
}

/* ------------------------------ I/O ------------------------------ */

function load() {
  ensureDir(DATA_DIR);
  if (!fs.existsSync(DB_FILE)) {
    if (isVercel && fs.existsSync(SOURCE_DB)) {
      try {
        fs.copyFileSync(SOURCE_DB, DB_FILE);
      } catch (e) {
        seedDatabase();
        return db;
      }
    } else {
      seedDatabase();
      return db;
    }
  }
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    ensureCollections();
  } catch (e) {
    db = null;
    seedDatabase();
  }
  return db;
}

function ensureCollections() {
  const defs = ['users', 'categories', 'products', 'suppliers', 'customers', 'transactions', 'orders', 'stockHistory', 'sessions'];
  let changed = false;
  defs.forEach((k) => {
    if (!Array.isArray(db[k])) { db[k] = []; changed = true; }
  });
  if (!db.settings) {
    db.settings = { storeName: 'Warung Cemilan', tagline: '', address: '', phone: '', logo: '🏪', taxRate: 10, discountDefault: 0, printer: 'thermal', invoiceSeq: 1600 };
    changed = true;
  }
  // Assign images to seed products if empty
  const DEFAULT_FOOD_IMAGES = [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&auto=format&fit=crop',
  ];
  if (Array.isArray(db.products)) {
    db.products.forEach((p, idx) => {
      if (!p.image) {
        const seedMatch = SEED_PRODUCTS.find((s) => s.name.toLowerCase() === p.name.toLowerCase());
        if (seedMatch && seedMatch.image) {
          p.image = seedMatch.image;
        } else {
          p.image = DEFAULT_FOOD_IMAGES[idx % DEFAULT_FOOD_IMAGES.length];
        }
        changed = true;
      }
    });
  }
  if (changed) save();
}

function save() {
  ensureDir(DATA_DIR);
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

function getDB() {
  if (!db) load();
  return db;
}

/* ----------------------------- misc api ----------------------------- */

function nextInvoiceNo() {
  const s = db.settings;
  s.invoiceSeq = (s.invoiceSeq || 1500) + 1;
  return 'INV' + pad(s.invoiceSeq, 4);
}

function publicProduct(p) {
  const cat = db.categories.find((c) => c.id === p.categoryId);
  return {
    id: p.id,
    name: p.name,
    emoji: p.emoji || '🛍️',
    image: p.image || '',
    categoryId: p.categoryId,
    category: cat ? cat.name : 'Lainnya',
    categoryIcon: cat ? cat.icon : '🧰',
    categoryColor: cat ? cat.color : '#64748b',
    price: p.price,
    modal: p.modal || 0,
    stock: p.stock,
    unit: p.unit || 'Pcs',
    barcode: p.barcode || '',
    status: p.status || 'aktif',
    sold: 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

module.exports = {
  getDB,
  save,
  load,
  uid,
  now,
  todayKey,
  dayKeyOf,
  nextInvoiceNo,
  publicProduct,
  DB_FILE,
};
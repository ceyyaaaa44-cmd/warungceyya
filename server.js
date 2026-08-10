'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const DEFAULT_USER = { id: 'usr_admin', name: 'Admin Warung', username: 'admin', role: 'admin' };

db.load();

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  req.user = DEFAULT_USER;
  next();
}

/* ------------------------------ settings ------------------------------ */

app.get('/api/settings', (req, res) => res.json(db.getDB().settings));

app.put('/api/settings', (req, res) => {
  const s = db.getDB().settings;
  const allowed = ['storeName', 'tagline', 'address', 'phone', 'logo', 'printer'];
  allowed.forEach((k) => { if (req.body[k] !== undefined) s[k] = req.body[k]; });
  if (req.body.taxRate !== undefined) s.taxRate = Number(req.body.taxRate) || 0;
  if (req.body.discountDefault !== undefined) s.discountDefault = Number(req.body.discountDefault) || 0;
  db.save();
  res.json(s);
});

app.get('/api/backup', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="warung-backup-' + Date.now() + '.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(db.getDB(), null, 2));
});

app.post('/api/restore', (req, res) => {
  const data = req.body && req.body.data;
  if (!data) return res.status(400).json({ error: 'Data backup kosong.' });
  try {
    const obj = typeof data === 'string' ? JSON.parse(data) : data;
    if (!Array.isArray(obj.products)) return res.status(400).json({ error: 'File backup tidak valid.' });
    fs.writeFileSync(db.DB_FILE, JSON.stringify(obj, null, 2), 'utf8');
    db.load();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'File backup tidak valid.' });
  }
});

/* ------------------------------ dashboard ------------------------------ */

app.get('/api/dashboard', requireAuth, (req, res) => {
  const { products, transactions } = db.getDB();
  const today = db.todayKey();

  const todayTx = transactions.filter((t) => db.dayKeyOf(t.createdAt) === today);
  const todaySales = todayTx.reduce((a, t) => a + t.total, 0);
  const revenue = transactions.reduce((a, t) => a + t.total, 0);
  const txCount = transactions.length;
  const stockCount = products.reduce((a, p) => a + p.stock, 0);

  const chartLabels = [];
  const chartValues = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = db.dayKeyOf(d);
    const sum = transactions.filter((t) => db.dayKeyOf(t.createdAt) === key).reduce((a, t) => a + t.total, 0);
    chartLabels.push(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
    chartValues.push(sum);
  }

  const soldMap = {};
  transactions.forEach((t) => {
    if (!soldMap[t.productId]) soldMap[t.productId] = { name: t.productName, emoji: t.productEmoji, qty: 0, revenue: 0 };
    soldMap[t.productId].qty += t.qty;
    soldMap[t.productId].revenue += t.total;
  });
  const bestSellers = Object.values(soldMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

  res.json({
    stats: {
      todaySales,
      todayOrders: todayTx.length,
      revenue,
      transactions: txCount,
      totalProducts: products.length,
      stockCount,
      avgOrder: txCount ? Math.round(revenue / txCount) : 0,
    },
    chartLabels,
    chartValues,
    bestSellers,
  });
});

/* ------------------------------ categories ------------------------------ */

function publicCategory(c) {
  const d = db.getDB();
  const count = d.products.filter((p) => p.categoryId === c.id).length;
  return { id: c.id, name: c.name, icon: c.icon || '🗂️', color: c.color || '#64748b', count, createdAt: c.createdAt };
}

app.get('/api/categories', (req, res) => {
  res.json({ categories: db.getDB().categories.map(publicCategory) });
});

app.post('/api/categories', (req, res) => {
  const { name, icon, color } = req.body || {};
  const clean = String(name || '').trim();
  if (!clean) return res.status(400).json({ error: 'Nama kategori wajib diisi.' });
  const cat = { id: db.uid('cat_'), name: clean, icon: icon || '🗂️', color: color || '#64748b', createdAt: db.now() };
  db.getDB().categories.push(cat);
  db.save();
  res.status(201).json({ category: publicCategory(cat) });
});

app.put('/api/categories/:id', (req, res) => {
  const cat = db.getDB().categories.find((c) => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
  const { name, icon, color } = req.body || {};
  if (name !== undefined) {
    const n = String(name).trim();
    if (!n) return res.status(400).json({ error: 'Nama tidak boleh kosong.' });
    cat.name = n;
  }
  if (icon !== undefined) cat.icon = icon;
  if (color !== undefined) cat.color = color;
  db.save();
  res.json({ category: publicCategory(cat) });
});

app.delete('/api/categories/:id', (req, res) => {
  const d = db.getDB();
  const idx = d.categories.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
  const using = d.products.filter((p) => p.categoryId === req.params.id).length;
  if (using) return res.status(400).json({ error: 'Kategori masih dipakai ' + using + ' produk.' });
  d.categories.splice(idx, 1);
  db.save();
  res.json({ ok: true });
});

/* ------------------------------ products ------------------------------ */

function enrichProduct(p) {
  const out = db.publicProduct(p);
  out.sold = db.getDB().transactions.filter((t) => t.productId === p.id).reduce((a, t) => a + t.qty, 0);
  out.stockValue = p.price * p.stock;
  return out;
}

app.get('/api/products', (req, res) => {
  const { q, catId, status } = req.query;
  let list = db.getDB().products.slice();
  const toys = (s) => String(s || '').toLowerCase();
  if (q) {
    const needle = toys(q);
    list = list.filter((p) => toys(p.name).includes(needle) || toys(p.barcode).includes(needle));
  }
  if (catId && catId !== 'Semua') list = list.filter((p) => p.categoryId === catId);
  if (status && status !== 'Semua') list = list.filter((p) => p.status === status);
  res.json({ products: list.map(enrichProduct), categories: db.getDB().categories.map((c) => c.name) });
});

app.get('/api/products-full', (req, res) => {
  res.json({ products: db.getDB().products.map(enrichProduct) });
});

const isValidCat = (id) => db.getDB().categories.some((c) => c.id === id);

function parseProductBody(body, existing) {
  const out = {};
  const { name, price, modal, stock, unit, barcode, categoryId, emoji, image, status } = body || {};
  if (name !== undefined) {
    const n = String(name).trim();
    if (!n) return { error: 'Nama produk wajib diisi.' };
    out.name = n;
  }
  const num = (v) => { const x = parseInt(v, 10); return isNaN(x) ? null : x; };
  const p = num(price);
  if (price !== undefined || existing) { if (p === null || p < 0) return { error: 'Harga tidak valid.' }; out.price = p; }
  const m = num(modal);
  if (modal !== undefined) { if (m === null || m < 0) return { error: 'Modal tidak valid.' }; out.modal = m; }
  const s = num(stock);
  if (stock !== undefined) { if (s === null || s < 0) return { error: 'Stok tidak valid.' }; out.stock = s; }
  if (categoryId !== undefined) { if (!isValidCat(categoryId)) return { error: 'Kategori tidak valid.' }; out.categoryId = categoryId; }
  if (unit !== undefined) out.unit = String(unit).trim() || 'Pcs';
  if (barcode !== undefined) out.barcode = String(barcode).trim();
  if (emoji !== undefined) out.emoji = String(emoji || '🛍️').trim();
  if (image !== undefined) out.image = String(image || '').trim();
  if (status !== undefined) out.status = status === 'nonaktif' ? 'nonaktif' : 'aktif';
  return out;
}

app.post('/api/products', (req, res) => {
  const first = db.getDB().categories[0];
  const parsed = parseProductBody({
    ...req.body,
    price: req.body.price || 0,
    stock: req.body.stock || 0,
    modal: req.body.modal || 0,
    categoryId: req.body.categoryId || (first ? first.id : ''),
  });
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const p = {
    id: db.uid('prd_'),
    name: parsed.name,
    emoji: parsed.emoji || '🛍️',
    image: parsed.image || '',
    categoryId: parsed.categoryId || '',
    price: parsed.price,
    modal: parsed.modal || 0,
    stock: parsed.stock || 0,
    unit: parsed.unit || 'Pcs',
    barcode: parsed.barcode || '',
    status: parsed.status || 'aktif',
    createdAt: db.now(),
    updatedAt: db.now(),
  };
  db.getDB().products.push(p);
  db.save();
  res.status(201).json({ product: enrichProduct(p) });
});

app.put('/api/products/:id', (req, res) => {
  const p = db.getDB().products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Produk tidak ditemukan.' });
  const parsed = parseProductBody(req.body, p);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  Object.assign(p, parsed);
  p.updatedAt = db.now();
  db.save();
  res.json({ product: enrichProduct(p) });
});

app.delete('/api/products/:id', (req, res) => {
  const d = db.getDB();
  const idx = d.products.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Produk tidak ditemukan.' });
  d.products.splice(idx, 1);
  db.save();
  res.json({ ok: true });
});

/* ------------------------------ stock ------------------------------ */

app.post('/api/products/:id/stock', requireAuth, (req, res) => {
  const d = db.getDB();
  const p = d.products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Produk tidak ditemukan.' });
  const { type, qty, reason } = req.body || {};
  const n = parseInt(qty, 10);
  if (!['masuk', 'keluar'].includes(type)) return res.status(400).json({ error: 'Tipe stok tidak valid.' });
  if (isNaN(n) || n <= 0) return res.status(400).json({ error: 'Jumlah stok tidak valid.' });
  if (type === 'keluar' && p.stock - n < 0) return res.status(400).json({ error: 'Stok tidak mencukupi.' });
  p.stock += type === 'masuk' ? n : -n;
  p.updatedAt = db.now();
  d.stockHistory.unshift({
    id: db.uid('stk_'),
    productId: p.id,
    productName: p.name,
    productEmoji: p.emoji,
    type,
    qty: n,
    reason: reason || (type === 'masuk' ? 'Pembelian' : 'Penyesuaian'),
    user: req.user.name,
    createdAt: db.now(),
  });
  db.save();
  res.json({ product: enrichProduct(p) });
});

app.get('/api/stock', (req, res) => {
  const { productId } = req.query;
  let list = db.getDB().stockHistory.slice();
  if (productId) list = list.filter((s) => s.productId === productId);
  res.json({ history: list.slice(0, 300) });
});
app.get('/api/stok', (req, res) => {
  const d = db.getDB();
  const list = d.products.map(enrichProduct);
  res.json({ stok: list, history: d.stockHistory.slice(0, 300) });
});

/* ------------------------------ orders (POS) ------------------------------ */

app.get('/api/orders', (req, res) => {
  let list = db.getDB().orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const { q } = req.query;
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter((o) => o.id.toLowerCase().includes(needle) || o.kasir.toLowerCase().includes(needle));
  }
  const { page = 1, limit = 15 } = req.query;
  const start = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  res.json({ orders: list.slice(start, start + parseInt(limit, 10)), total: list.length });
});

app.get('/api/orders/:id', (req, res) => {
  const o = db.getDB().orders.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
  res.json({ order: o, settings: db.getDB().settings });
});

app.post('/api/orders', requireAuth, (req, res) => {
  const d = db.getDB();
  const { items, discount, method, paid, kasir } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Pesanan kosong.' });
  const METHODS = ['Tunai', 'QRIS', 'Transfer'];
  if (!METHODS.includes(method)) return res.status(400).json({ error: 'Metode pembayaran tidak valid.' });

  const cleaned = [];
  let subtotal = 0;
  for (const it of items) {
    const prod = d.products.find((x) => x.id === it.productId);
    if (!prod) return res.status(400).json({ error: 'Produk tidak ditemukan.' });
    const qty = Math.max(1, parseInt(it.qty, 10) || 1);
    if (prod.stock < qty) return res.status(400).json({ error: 'Stok ' + prod.name + ' tidak cukup (' + prod.stock + ').' });
    cleaned.push({ productId: prod.id, productName: prod.name, productEmoji: prod.emoji, qty, price: prod.price, modal: prod.modal, total: prod.price * qty });
    subtotal += prod.price * qty;
  }

  const discountVal = Math.max(0, parseInt(discount, 10) || 0);
  const taxRate = Number(d.settings.taxRate) || 0;
  const afterDiscount = subtotal - discountVal;
  const tax = Math.round(afterDiscount * taxRate / 100);
  const total = afterDiscount + tax;
  const totalPaid = parseInt(paid, 10) || total;
  const change = totalPaid - total;

  const order = {
    id: db.nextInvoiceNo(),
    items: cleaned,
    subtotal,
    discount: discountVal,
    taxRate,
    tax,
    total,
    paid: totalPaid,
    change,
    method,
    status: 'Lunas',
    kasir: kasir || req.user.name || 'Kasir',
    createdAt: db.now(),
  };
  d.orders.unshift(order);

  cleaned.forEach((it) => {
    const prod = d.products.find((x) => x.id === it.productId);
    prod.stock -= it.qty;
    prod.updatedAt = db.now();
    d.stockHistory.unshift({
      id: db.uid('stk_'),
      productId: it.productId,
      productName: it.productName,
      productEmoji: it.productEmoji,
      type: 'keluar',
      qty: it.qty,
      reason: 'Penjualan ' + order.id,
      user: order.kasir,
      createdAt: order.createdAt,
    });
    d.transactions.push({
      id: db.uid('trx_'),
      invoiceNo: order.id,
      productId: it.productId,
      productName: it.productName,
      productEmoji: it.productEmoji,
      qty: it.qty,
      price: it.price,
      modal: it.modal || Math.round(it.price * 0.6),
      total: it.total,
      status: 'Lunas',
      method,
      kasir: order.kasir,
      createdAt: order.createdAt,
    });
  });

  db.save();
  res.status(201).json({ order });
});

app.delete('/api/orders/:id', (req, res) => {
  const d = db.getDB();
  const idx = d.orders.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
  d.orders.splice(idx, 1);
  db.save();
  res.json({ ok: true });
});

/* ------------------------------ transactions ------------------------------ */

app.get('/api/transactions', (req, res) => {
  let list = db.getDB().transactions.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const { start, end, q } = req.query;
  if (start) list = list.filter((t) => db.dayKeyOf(t.createdAt) >= start);
  if (end) list = list.filter((t) => db.dayKeyOf(t.createdAt) <= end);
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter((t) => t.productName.toLowerCase().includes(needle) || t.invoiceNo.toLowerCase().includes(needle));
  }
  const { page = 1, limit = 20 } = req.query;
  const startIdx = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  res.json({ transactions: list.slice(startIdx, startIdx + parseInt(limit, 10)), total: list.length });
});

/* ------------------------------ report ------------------------------ */

app.get('/api/report', (req, res) => {
  const { start, end, kasir, category } = req.query;
  let list = db.getDB().transactions.slice().filter((t) => t.status === 'Lunas');
  if (start) list = list.filter((t) => db.dayKeyOf(t.createdAt) >= start);
  if (end) list = list.filter((t) => db.dayKeyOf(t.createdAt) <= end);
  if (kasir && kasir !== 'Semua') list = list.filter((t) => t.kasir === kasir);
  if (category && category !== 'Semua') {
    const prodIds = db.getDB().products
      .filter((p) => (db.getDB().categories.find((c) => c.id === p.categoryId) || {}).name === category)
      .map((p) => p.id);
    list = list.filter((t) => prodIds.includes(t.productId));
  }

  const totalSales = list.reduce((a, t) => a + t.total, 0);
  const totalCost = list.reduce((a, t) => a + (t.modal || 0) * t.qty, 0);
  const soldMap = {};
  list.forEach((t) => {
    if (!soldMap[t.productId]) soldMap[t.productId] = { name: t.productName, emoji: t.productEmoji, qty: 0, revenue: 0 };
    soldMap[t.productId].qty += t.qty;
    soldMap[t.productId].revenue += t.total;
  });
  const bestSellers = Object.values(soldMap).sort((a, b) => b.qty - a.qty).slice(0, 10);

  const methodMap = {};
  list.forEach((t) => { methodMap[t.method || 'Tunai'] = (methodMap[t.method || 'Tunai'] || 0) + t.total; });

  const dayMap = {};
  list.forEach((t) => {
    const k = db.dayKeyOf(t.createdAt);
    dayMap[k] = (dayMap[k] || 0) + t.total;
  });
  const daily = Object.keys(dayMap).sort().map((k) => ({ date: k, total: dayMap[k] }));

  res.json({
    summary: {
      totalRevenue: totalSales,
      totalSales,
      totalCost,
      profit: totalSales - totalCost,
      totalTransactions: list.length,
      totalItems: list.reduce((a, t) => a + t.qty, 0),
      avgOrder: list.length ? Math.round(totalSales / list.length) : 0,
      topProduct: bestSellers[0] ? bestSellers[0].name : '-',
    },
    totalSales,
    totalCost,
    profit: totalSales - totalCost,
    totalTransactions: list.length,
    totalItems: list.reduce((a, t) => a + t.qty, 0),
    avgOrder: list.length ? Math.round(totalSales / list.length) : 0,
    bestSellers,
    methods: methodMap,
    daily,
  });
});

app.get('/api/laporan', (req, res) => {
  req.url = '/api/report' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
  return app._router.handle(req, res);
});

/* ------------------------------ users ------------------------------ */

app.get('/api/users', (req, res) => {
  res.json({ users: db.getDB().users.map((u) => ({ id: u.id, name: u.name, username: u.username, role: u.role, status: u.status, createdAt: u.createdAt })) });
});

app.post('/api/users', (req, res) => {
  const d = db.getDB();
  const o = { id: db.uid('usr_'), name: req.body.name || '', username: req.body.username || '', role: req.body.role || 'kasir', status: 'aktif', createdAt: db.now() };
  if (!String(o.name).trim() || !String(o.username).trim()) return res.status(400).json({ error: 'Nama dan username wajib diisi.' });
  d.users.push(o);
  db.save();
  res.status(201).json({ user: o });
});

app.put('/api/users/:id', (req, res) => {
  const o = db.getDB().users.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  if (req.body.name !== undefined) o.name = req.body.name;
  if (req.body.role !== undefined) o.role = req.body.role;
  if (req.body.status !== undefined) o.status = req.body.status;
  db.save();
  res.json({ user: o });
});

app.delete('/api/users/:id', (req, res) => {
  const arr = db.getDB().users;
  const idx = arr.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  arr.splice(idx, 1);
  db.save();
  res.json({ ok: true });
});

/* ------------------------------ suppliers ------------------------------ */

app.get('/api/suppliers', (req, res) => res.json({ suppliers: db.getDB().suppliers }));

app.post('/api/suppliers', (req, res) => {
  const d = db.getDB();
  const o = { id: db.uid('sup_'), name: req.body.name || '', phone: req.body.phone || '', address: req.body.address || '', createdAt: db.now() };
  if (!String(o.name).trim()) return res.status(400).json({ error: 'Nama supplier wajib diisi.' });
  d.suppliers.push(o);
  db.save();
  res.status(201).json({ supplier: o });
});

app.put('/api/suppliers/:id', (req, res) => {
  const o = db.getDB().suppliers.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Supplier tidak ditemukan.' });
  if (req.body.name !== undefined) o.name = req.body.name;
  if (req.body.phone !== undefined) o.phone = req.body.phone;
  if (req.body.address !== undefined) o.address = req.body.address;
  db.save();
  res.json({ supplier: o });
});

app.delete('/api/suppliers/:id', (req, res) => {
  const arr = db.getDB().suppliers;
  const idx = arr.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Supplier tidak ditemukan.' });
  arr.splice(idx, 1);
  db.save();
  res.json({ ok: true });
});

/* ------------------------------ customers ------------------------------ */

app.get('/api/customers', (req, res) => res.json({ customers: db.getDB().customers }));

app.post('/api/customers', (req, res) => {
  const d = db.getDB();
  const o = { id: db.uid('cus_'), name: req.body.name || '', phone: req.body.phone || '', createdAt: db.now() };
  if (!String(o.name).trim()) return res.status(400).json({ error: 'Nama pelanggan wajib diisi.' });
  d.customers.push(o);
  db.save();
  res.status(201).json({ customer: o });
});

app.put('/api/customers/:id', (req, res) => {
  const o = db.getDB().customers.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Pelanggan tidak ditemukan.' });
  if (req.body.name !== undefined) o.name = req.body.name;
  if (req.body.phone !== undefined) o.phone = req.body.phone;
  db.save();
  res.json({ customer: o });
});

app.delete('/api/customers/:id', (req, res) => {
  const arr = db.getDB().customers;
  const idx = arr.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Pelanggan tidak ditemukan.' });
  arr.splice(idx, 1);
  db.save();
  res.json({ ok: true });
});

/* ------------------------------- fallback ----------------------------- */

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
  next();
});

app.listen(PORT, () => {
  console.log('\n  Warung Cemilan app running at: http://localhost:' + PORT + '\n');
});
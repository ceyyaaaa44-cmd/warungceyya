(function () {
  'use strict';
  const app = window.Warung;
  app.formatT = app.formatRupiah;

  let products = [];
  let categories = [];
  let settings = { taxRate: 10, discountDefault: 0, storeName: 'Warung Cemilan' };
  let currentCat = 'Semua';
  let currentSearch = '';
  const cart = new Map(); // productId -> { p, qty }
  let payMethod = 'Tunai';

  function num(v) { return parseInt(String(v).replace(/[^\d]/g, ''), 10) || 0; }

  /* ------------------------------ kategori ------------------------------ */

  function renderCats() {
    const wrap = document.getElementById('cat-buttons');
    const all = [{ id: 'Semua', name: 'Semua', icon: '📦', active: currentCat === 'Semua' }, ...categories];
    wrap.innerHTML = all.map((c) => {
      const active = currentCat === c.id;
      return `
        <button data-cat="${c.id}"
          class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition text-left
          ${active ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-gray-600 hover:bg-gray-50'}">
          <span class="text-lg">${c.icon}</span>
          <span class="truncate">${c.name}</span>
        </button>`;
    }).join('');
    wrap.querySelectorAll('[data-cat]').forEach((b) =>
      b.addEventListener('click', () => { currentCat = b.dataset.cat; renderCats(); renderProducts(); })
    );
  }

  /* ------------------------------ produk ------------------------------ */

  function renderProducts() {
    const grid = document.getElementById('product-grid');
    let list = products;
    if (currentCat !== 'Semua') list = list.filter((p) => p.categoryId === currentCat);
    if (currentSearch) {
      const n = currentSearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(n) || String(p.barcode).includes(n));
    }
    list = list.filter((p) => p.status !== 'nonaktif');

    if (!list.length) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center">
          <div class="text-4xl mb-3">🔍</div>
          <p class="font-semibold text-gray-700">Produk tidak ditemukan</p>
        </div>`;
      return;
    }

    grid.innerHTML = list.map((p) => {
      const low = p.stock <= 20;
      const out = p.stock <= 0;
      const imgHtml = p.image
        ? `<div class="w-full h-24 sm:h-28 bg-gray-50/80 flex items-center justify-center p-1.5">
            <img src="${p.image}" alt="${p.name}" class="w-full h-full object-contain rounded-lg group-hover:scale-105 transition duration-300" onerror="this.onerror=null; this.outerHTML='<div class=\\'w-full h-full flex items-center justify-center text-3xl select-none\\'>${p.emoji || '🍔'}</div>';" />
          </div>`
        : `<div class="w-full h-24 sm:h-28 bg-gray-50 flex items-center justify-center text-3xl select-none">${p.emoji || '🍔'}</div>`;

      return `
        <button data-add="${p.id}" ${out ? 'disabled' : ''}
          class="group bg-white rounded-2xl border border-gray-100 shadow-sm text-left hover:shadow-xl hover:-translate-y-1 transition duration-200 overflow-hidden flex flex-col justify-between ${out ? 'opacity-50 cursor-not-allowed' : ''}">
          <div class="relative w-full overflow-hidden">
            ${imgHtml}
            <span class="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md shadow-sm ${out ? 'bg-red-500/90 text-white' : low ? 'bg-amber-500/90 text-white' : 'bg-emerald-500/90 text-white'}">
              ${out ? 'Habis' : 'Stok ' + p.stock}
            </span>
          </div>
          <div class="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
            <div>
              <p class="font-bold text-gray-800 text-xs sm:text-sm leading-tight line-clamp-1 group-hover:text-blue-600 transition">${p.name}</p>
              <p class="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">${p.unit || 'Pcs'}</p>
            </div>
            <div class="mt-1.5 flex items-center justify-between">
              <p class="text-blue-600 font-extrabold text-xs sm:text-sm">${app.formatT(p.price)}</p>
              <span class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              </span>
            </div>
          </div>
        </button>`;
    }).join('');
    lucide.createIcons();

    grid.querySelectorAll('[data-add]').forEach((b) =>
      b.addEventListener('click', () => addToCart(b.dataset.add))
    );
  }

  /* ------------------------------ keranjang ------------------------------ */

  function cartEntries() { return [...cart.values()].sort((a, b) => a.ts - b.ts); }

  function addToCart(id) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    if (cart.has(id)) {
      if (cart.get(id).qty + 1 > p.stock) { app.toast('Stok ' + p.name + ' tidak cukup.', 'error'); return; }
      cart.get(id).qty++;
    } else {
      if (p.stock < 1) return;
      cart.set(id, { p, qty: 1, ts: Date.now() });
    }
    renderCart();
  }

  function changeQty(id, d) {
    const item = cart.get(id);
    if (!item) return;
    item.qty += d;
    if (item.qty <= 0) { cart.delete(id); }
    else if (item.qty > item.p.stock) { item.qty = item.p.stock; app.toast('Stok ' + item.p.name + ' tidak cukup.', 'error'); }
    renderCart();
  }

  function renderCart() {
    const list = document.getElementById('cart-list');
    const entries = cartEntries();
    document.getElementById('cart-count').textContent = sumQty() + ' item';

    if (!entries.length) {
      list.innerHTML = '<p class="text-center text-gray-400 text-sm py-10">Belum ada produk.<br />Klik produk untuk menambah.</p>';
    } else {
      list.innerHTML = entries.map((it) => `
        <div class="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 bg-gray-50/60">
          ${app.renderProductImage(it.p, 'w-10 h-10 rounded-lg')}
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-800 truncate">${it.p.name}</p>
            <p class="text-xs text-gray-400">${app.formatT(it.p.price)}</p>
          </div>
          <div class="flex items-center gap-1.5">
            <button data-min="${it.p.id}" class="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center transition">
              <i data-lucide="minus" class="w-3.5 h-3.5"></i>
            </button>
            <span class="w-7 text-center font-semibold text-sm">${it.qty}</span>
            <button data-pl="true" data-id="${it.p.id}" class="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center transition">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            </button>
          </div>
          <span class="text-sm font-bold text-gray-800 w-14 text-right">${app.formatT(it.p.price * it.qty)}</span>
        </div>`).join('');
    }
    lucide.createIcons();

    list.querySelectorAll('[data-dec]').forEach((b) => b.addEventListener('click', () => changeQty(b.dataset.dec, -1)));
    list.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => changeQty(b.dataset.id, 1)));

    updateTotals();
  }

  function sumQty() {
    return cartEntries().reduce((a, it) => a + it.qty, 0);
  }

  function updateTotals() {
    const subtotal = cartEntries().reduce((a, it) => a + it.p.price * it.qty, 0);
    const discount = num(document.getElementById('c-discount').value || settings.discountDefault);
    document.getElementById('c-subtotal').textContent = app.formatT(subtotal);
    document.getElementById('c-taxrate').textContent = '(' + (settings.taxRate || 0) + '%)';
    const afterDiscount = Math.max(0, subtotal - discount);
    const tax = Math.round(afterDiscount * (settings.taxRate || 0) / 100);
    const total = afterDiscount + tax;
    document.getElementById('c-tax').textContent = app.formatT(tax);
    document.getElementById('c-total').textContent = app.formatT(total);
    return { subtotal, discount, tax, total };
  }

  /* ------------------------------ pembayaran ------------------------------ */

  function openPay() {
    if (!cart.size) { app.toast('Keranjang masih kosong.', 'error'); return; }
    const t = updateTotals();
    document.getElementById('pay-total').textContent = app.formatT(t.total);
    document.getElementById('pay-amount').value = '';
    document.getElementById('pay-change').textContent = 'Rp 0';
    setMethod('Tunai');
    const modal = document.getElementById('pay-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => document.getElementById('pay-amount').focus(), 80);
  }

  function closePay() {
    document.getElementById('pay-modal').classList.add('hidden');
    document.getElementById('pay-modal').classList.remove('flex');
  }

  function setMethod(m) {
    payMethod = m;
    document.querySelectorAll('#pay-modal [data-method]').forEach((b) => {
      const on = b.dataset.method === m;
      b.className = (on ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-500 hover:border-blue-300')
        + ' border-2 rounded-xl py-2.5 text-sm font-semibold flex flex-col items-center gap-1';
    });
    lucide.createIcons();
    const total = num(document.getElementById('pay-total').textContent.replace(/[^\d]/g, ''));
    const cashSec = document.getElementById('cash-payment-section');
    const qrisSec = document.getElementById('qris-payment-section');
    if (m === 'Tunai') {
      cashSec.classList.remove('hidden');
      qrisSec.classList.add('hidden');
      document.getElementById('pay-amount').readOnly = false;
      document.getElementById('pay-amount').value = '';
    } else if (m === 'QRIS') {
      cashSec.classList.add('hidden');
      qrisSec.classList.remove('hidden');
      document.getElementById('pay-amount').value = total.toLocaleString('id-ID');
      document.getElementById('pay-change').textContent = 'Rp 0';
    } else {
      cashSec.classList.remove('hidden');
      qrisSec.classList.add('hidden');
      document.getElementById('pay-amount').readOnly = true;
      document.getElementById('pay-amount').value = total.toLocaleString('id-ID');
      document.getElementById('pay-change').textContent = 'Rp 0';
    }
  }

  let html5QrCode = null;
  function openScanner() {
    const modal = document.getElementById('scanner-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("reader");
    }
    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        closeScanner();
        const found = products.find(p => p.barcode === decodedText || p.name.toLowerCase().includes(decodedText.toLowerCase()));
        if (found) {
          addToCart(found.id);
          app.toast('Produk ditambahkan: ' + found.name);
        } else {
          document.getElementById('pos-search').value = decodedText;
          currentSearch = decodedText;
          renderProducts();
          app.toast('Pencarian barcode: ' + decodedText, 'info');
        }
      },
      (error) => {}
    ).catch(err => {
      app.toast('Tidak dapat mengakses kamera.', 'error');
    });
  }

  function closeScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
      html5QrCode.stop().catch(() => {});
    }
    document.getElementById('scanner-modal').classList.add('hidden');
    document.getElementById('scanner-modal').classList.remove('flex');
  }

  function updateChange() {
    const total = num(document.getElementById('pay-total').textContent.replace(/[^\d]/g, ''));
    const paid = num(document.getElementById('pay-amount').value);
    const change = paid - total;
    document.getElementById('pay-change').textContent = 'Rp ' + Math.max(0, change).toLocaleString('id-ID');
    return { total, paid, change };
  }

  function confirmPay() {
    if (!cart.size) { app.toast('Keranjang kosong.', 'error'); return; }
    const t = updateTotals();
    const { total, paid } = updateChange();
    if (payMethod === 'Tunai' && paid < total) {
      const short = total - paid;
      document.getElementById('pay-amount').classList.add('shake');
      setTimeout(() => document.getElementById('pay-amount').classList.remove('shake'), 500);
      app.toast('Uang kurang Rp ' + short.toLocaleString('id-ID'), 'error');
      return;
    }
const payload = {
      method: payMethod,
      discount: num(document.getElementById('c-discount').value),
      paid: payMethod === 'Tunai' ? paid : total,
      items: cartEntries().map((e) => ({ productId: e.p.id, qty: e.qty })),
    };
    const btn = document.getElementById('btn-confirm-pay');
    btn.disabled = true;
    btn.textContent = 'Memproses...';
    app.post('api/orders', payload)
      .then((res) => {
        app.toast('Pembayaran berhasil! ' + res.order.id);
        cart.clear();
        renderCart();
        closePay();
        renderProducts();
      })
      .catch((e) => app.toast(e.message || 'Pembayaran gagal.', 'error'))
      .finally(() => { btn.disabled = false; btn.textContent = 'BAYAR SEKARANG'; });
  }

  /* ------------------------------ boot ------------------------------ */

  app.boot(() => {
    document.getElementById('pos-search').addEventListener('input', app.debounce(function () {
      currentSearch = this.value.trim();
      renderProducts();
    }, 250));
    document.getElementById('c-discount').addEventListener('input', () => updateTotals());
    document.getElementById('pay-amount').addEventListener('input', function () {
      this.value = app.escapeInput.toDisplay(this.value);
      updateChange();
    });
    document.querySelectorAll('#pay-modal [data-method]').forEach((b) => b.addEventListener('click', () => setMethod(b.dataset.method)));
    document.querySelectorAll('#pay-modal [data-close]').forEach((el) => el.addEventListener('click', closePay));
    document.getElementById('btn-pay').addEventListener('click', openPay);
    document.getElementById('btn-save-pos').addEventListener('click', () => app.toast('Gunakan tombol Bayar untuk menyimpan transaksi.', 'info'));
    document.getElementById('btn-confirm-pay').addEventListener('click', confirmPay);
    document.getElementById('btn-scan-barcode').addEventListener('click', openScanner);
    document.getElementById('btn-close-scanner').addEventListener('click', closeScanner);
    document.getElementById('close-scanner').addEventListener('click', closeScanner);

    Promise.all([app.get('api/products-full'), app.get('api/categories'), app.get('api/settings')])
      .then(([pd, cd, st]) => {
        products = pd.products;
        categories = cd.categories;
        settings = Object.assign(settings, st);
        const disc = document.getElementById('c-discount');
        if (settings.discountDefault) disc.value = settings.discountDefault.toLocaleString('id-ID');
        if (cart.size === 0) renderCart();
        renderCats();
        renderProducts();
        updateTotals();
      })
.catch((e) => app.toast(e.message || 'Gagal memuat kasir.', 'error'));
  });
})();
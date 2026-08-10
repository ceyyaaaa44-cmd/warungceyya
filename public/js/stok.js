(function () {
  'use strict';
  const app = window.Warung;
  app.formatT = app.formatRupiah;

  let products = [];
  let history = [];
  let search = '';
  let histProductId = null;

  function stockBar(stock) {
    const pct = Math.min(100, stock);
    const tone = stock <= 20 ? 'bg-red-500' : stock <= 60 ? 'bg-amber-500' : 'bg-emerald-500';
    const text = stock <= 20 ? 'text-red-500' : stock <= 60 ? 'text-amber-500' : 'text-emerald-600';
    return `
      <div class="flex items-center gap-3">
        <div class="w-16">
          <p class="text-sm font-bold ${text}">${stock}</p>
        </div>
        <div class="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden"><div class="h-full ${tone} rounded-full" style="width:${pct}%"></div></div>
      </div>`;
  }

  function renderRows() {
    const tbody = document.getElementById('stock-rows');
    let list = products;
    if (search) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-12 text-center text-sm text-gray-400">Tidak ada produk.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map((p) => `
      <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition group">
        <td class="px-6 py-3.5">
          <div class="flex items-center gap-3">
            <span class="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xl">${p.emoji}</span>
            <div>
              <p class="font-semibold text-gray-800">${p.name}</p>
              <p class="text-xs text-gray-400">${p.unit}</p>
            </div>
          </div>
        </td>
        <td class="px-6 py-3.5">${stockBar(p.stock)}</td>
        <td class="px-6 py-3.5">
          <div class="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition">
            <button data-in="${p.id}" class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> Tambah
            </button>
            <button data-out="${p.id}" class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition">
              <i data-lucide="minus" class="w-3.5 h-3.5"></i>
            </button>
            <button data-hist="${p.id}" class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition">
              <i data-lucide="clock" class="w-3.5 h-3.5"></i> Riwayat
            </button>
          </div>
        </td>
      </tr>`).join('');
    lucide.createIcons();
    tbody.querySelectorAll('[data-in]').forEach((b) => b.addEventListener('click', () => openModal(b.dataset.in, 'masuk')));
    tbody.querySelectorAll('[data-out]').forEach((b) => b.addEventListener('click', () => openModal(b.dataset.out, 'keluar')));
    tbody.querySelectorAll('[data-hist]').forEach((b) => b.addEventListener('click', () => { histProductId = b.dataset.hist; renderHistory(); }));
  }

  function renderHistory() {
    const wrap = document.getElementById('stock-history');
    let list = history;
    if (histProductId) list = list.filter((h) => h.productId === histProductId);
    const p = histProductId ? products.find((x) => x.id === histProductId) : null;
    document.getElementById('hist-sub').textContent = p ? 'Riwayat: ' + p.name : 'Semua aktivitas stok';
    if (!list.length) {
      wrap.innerHTML = '<p class="text-sm text-gray-400 text-center py-8">Belum ada riwayat stok.</p>';
      return;
    }
    wrap.innerHTML = list.map((h) => {
      const masuk = h.type === 'masuk';
      return `
        <div class="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 bg-gray-50/50">
          <span class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${masuk ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}">
            <i data-lucide="${masuk ? 'arrow-down-to-line' : 'arrow-up-from-line'}" class="w-4 h-4"></i>
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-800 truncate">${h.productEmoji} ${h.productName}</p>
            <p class="text-xs text-gray-400 truncate">${h.reason} · ${h.user} · ${new Date(h.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
          </div>
          <span class="text-sm font-bold ${masuk ? 'text-emerald-600' : 'text-red-500'}">${masuk ? '+' : '−'}${h.qty}</span>
        </div>`;
    }).join('');
    lucide.createIcons();
  }

  function openModal(id, type) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    document.getElementById('stock-modal-title').textContent = type === 'masuk' ? 'Tambah Stok' : 'Kurangi Stok';
    document.getElementById('stock-modal-product').textContent = p.emoji + ' ' + p.name + ' · Stok saat ini: ' + p.stock;
    document.getElementById('stock-id').value = id;
    document.getElementById('stock-type').value = type;
    document.getElementById('stock-qty').value = '';
    document.getElementById('stock-reason').value = type === 'masuk' ? 'Pembelian dari supplier' : 'Penyesuaian';
    const modal = document.getElementById('stock-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => document.getElementById('stock-qty').focus(), 60);
  }

  function closeModal() {
    document.getElementById('stock-modal').classList.add('hidden');
    document.getElementById('stock-modal').classList.remove('flex');
  }

  function save(e) {
    e.preventDefault();
    const id = document.getElementById('stock-id').value;
    const type = document.getElementById('stock-type').value;
    const qty = parseInt(document.getElementById('stock-qty').value, 10);
    const reason = document.getElementById('stock-reason').value.trim();
    if (isNaN(qty) || qty <= 0) { app.toast('Jumlah tidak valid.', 'error'); return; }
    app.post('api/products/' + id + '/stock', { type, qty, reason })
      .then(() => {
        app.toast(type === 'masuk' ? 'Stok ditambahkan.' : 'Stok dikurangi.');
        closeModal();
        load();
      })
      .catch((err) => app.toast(err.message || 'Gagal menyimpan.', 'error'));
  }

  function load() {
    return Promise.all([app.get('api/products-full'), app.get('api/stock')])
      .then(([p, h]) => { products = p.products; history = h.history; renderRows(); renderHistory(); })
      .catch((e) => app.toast(e.message || 'Gagal memuat stok.', 'error'));
  }

  app.boot(() => {
    document.getElementById('stk-search').addEventListener('input', app.debounce(function () {
      search = this.value.trim();
      renderRows();
    }, 250));
    document.getElementById('stock-form').addEventListener('submit', save);
    document.getElementById('btn-reset-hist').addEventListener('click', () => { histProductId = null; renderHistory(); });
    document.querySelectorAll('#stock-modal [data-close]').forEach((el) => el.addEventListener('click', closeModal));
    load();
  });
})();
(function () {
  'use strict';
  const app = window.Warung;
  app.formatT = app.formatRupiah;

  let orders = [];
  let currentOrder = null;
  let filters = { q: '', method: 'Semua' };

  function methodBadge(m) {
    const map = { Tunai: 'bg-emerald-50 text-emerald-700', QRIS: 'bg-blue-50 text-blue-700', Transfer: 'bg-violet-50 text-violet-700' };
    return `<span class="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${map[m] || 'bg-gray-100 text-gray-600'}">${m}</span>`;
  }

  function render() {
    const tbody = document.getElementById('ri-rows');
    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-16 text-center"><div class="text-4xl mb-3">🧾</div><p class="font-semibold text-gray-700">Belum ada pesanan</p></td></tr>';
      return;
    }
    tbody.innerHTML = orders.map((o) => `
      <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition group">
        <td class="px-6 py-3.5 font-semibold text-gray-800">${o.id}</td>
        <td class="px-6 py-3.5 text-gray-600">${new Date(o.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
        <td class="px-6 py-3.5 text-gray-600">${o.kasir}</td>
        <td class="px-6 py-3.5">${methodBadge(o.method)}</td>
        <td class="px-6 py-3.5"><span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-600"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>${o.status}</span></td>
        <td class="px-6 py-3.5 font-bold text-gray-800">${app.formatT(o.total)}</td>
        <td class="px-6 py-3.5">
          <div class="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition">
            <button data-detail="${o.id}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition">
              <i data-lucide="eye" class="w-3.5 h-3.5"></i> Detail
            </button>
            <button data-print="${o.id}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
              <i data-lucide="printer" class="w-3.5 h-3.5"></i> Cetak
            </button>
          </div>
        </td>
      </tr>`).join('');
    lucide.createIcons();
    tbody.querySelectorAll('[data-detail]').forEach((b) => b.addEventListener('click', () => openDetail(b.dataset.detail)));
    tbody.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => printOrder(b.dataset.print)));
  }

  function load() {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    return app.get('api/orders?' + params.toString())
      .then((d) => {
        orders = d.orders.filter((o) => filters.method === 'Semua' || o.method === filters.method);
        render();
      })
      .catch((e) => app.toast(e.message || 'Gagal memuat riwayat.', 'error'));
  }

  function openDetail(id) {
    app.get('api/orders/' + id).then(({ order, settings }) => {
      currentOrder = order;
      document.getElementById('det-id').textContent = order.id + ' · ' + order.kasir;
      document.getElementById('detail-date').textContent = new Date(order.createdAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      document.getElementById('detail-items').innerHTML = order.items.map((it) => `
        <div class="flex items-center gap-3 p-2 rounded-xl bg-gray-50/60">
          <span class="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-lg">${it.productEmoji}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-800 truncate">${it.productName}</p>
            <p class="text-xs text-gray-400">${it.qty} x ${app.formatT(it.price)}</p>
          </div>
          <span class="text-sm font-bold text-gray-800">${app.formatT(it.total)}</span>
        </div>`).join('');
      document.getElementById('d-sub').textContent = app.formatT(order.subtotal);
      document.getElementById('d-disc').textContent = order.discount ? '- ' + app.formatT(order.discount) : 'Rp 0';
      document.getElementById('d-taxrate').textContent = order.taxRate + '%';
      document.getElementById('d-tax').textContent = app.formatT(order.tax);
      document.getElementById('d-total').textContent = app.formatT(order.total);
      document.getElementById('d-paid').textContent = app.formatT(order.paid);
      document.getElementById('d-change').textContent = app.formatT(order.change);
      const m = document.getElementById('detail-modal');
      m.classList.remove('hidden'); m.classList.add('flex');
      lucide.createIcons();
    }).catch((e) => app.toast(e.message, 'error'));
  }

  function closeDetail() {
    document.getElementById('detail-modal').classList.add('hidden');
    document.getElementById('detail-modal').classList.remove('flex');
  }

  function printOrder(id) {
    app.get('api/orders/' + id).then(({ order, settings }) => {
      const w = window.open('', '_blank');
      if (!w) { app.toast('Izinkan popup untuk mencetak.', 'info'); return; }
      const items = order.items.map((it) => `
        <div class="line"><span>${it.qty}x ${it.productName}</span><span>Rp ${it.total.toLocaleString('id-ID')}</span></div>`).join('');
      w.document.write(`<!DOCTYPE html><html><head><title>${settings.storeName || 'Struk'}</title><style>
        *{font-family:Arial,sans-serif;margin:0;padding:0;box-sizing:border-box}
        body{width:300px;margin:0 auto;padding:16px;color:#000;font-size:13px}
        h1{font-size:16px;text-align:center}.meta{text-align:center;font-size:11px;margin:4px 0 10px;color:#333}
        .rule{border-top:1px dashed #000;margin:8px 0}
        .line{display:flex;justify-content:space-between;padding:2px 0}
        .total{display:flex;justify-content:space-between;font-weight:bold;font-size:14px;padding:4px 0}
        .small{font-size:11px;color:#333}
        </style></head><body>
        <h1>${settings.storeName || 'Warung Cemilan'}</h1>
        <div class="meta">${settings.address || ''}<br/>${settings.phone || ''}</div>
        <div class="rule"></div>
        <div class="line"><span>${order.id}</span><span>${new Date(order.createdAt).toLocaleString('id-ID')}</span></div>
        <div class="line"><span>Kasir: ${order.kasir}</span><span>${order.method}</span></div>
        <div class="rule"></div>
        ${items}
        <div class="total"><span>Subtotal</span><span>Rp ${order.subtotal.toLocaleString('id-ID')}</span></div>
        ${order.discount ? '<div class="line"><span>Diskon</span><span>-Rp ' + order.discount.toLocaleString('id-ID') + '</span></div>' : ''}
        <div class="line"><span>Pajak (${order.taxRate}%)</span><span>Rp ${order.tax.toLocaleString('id-ID')}</span></div>
        <div class="rule"></div>
        <div class="total"><span>TOTAL</span><span>Rp ${order.total.toLocaleString('id-ID')}</span></div>
        <div class="line"><span>Bayar</span><span>Rp ${order.paid.toLocaleString('id-ID')}</span></div>
        <div class="line"><span>Kembalian</span><span>Rp ${order.change.toLocaleString('id-ID')}</span></div>
        <div class="rule"></div>
        <div class="meta">Terima kasih atas kunjungan Anda!</div>
        <script>window.onload=function(){window.print()};<\/script>
        </body></html>`);
      w.document.close();
    }).catch((e) => app.toast(e.message, 'error'));
  }

  app.boot(() => {
    document.getElementById('ri-search').addEventListener('input', app.debounce(function () {
      filters.q = this.value.trim();
      load();
    }, 300));
    document.getElementById('btn-box').addEventListener('click', () => {
      filters.method = document.getElementById('ri-method').value;
      load();
    });
    document.querySelectorAll('#detail-modal [data-close]').forEach((el) => el.addEventListener('click', closeDetail));
    document.getElementById('btn-print-detail').addEventListener('click', () => { if (currentOrder) printOrder(currentOrder.id); });
    load();
  });
})();
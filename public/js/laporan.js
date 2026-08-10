(function () {
  'use strict';
  const app = window.Warung;
  app.formatT = app.formatRupiah;

  let report = null;
  let filters = { start: '', end: '', kasir: 'Semua', category: 'Semua' };
  let kasirList = [];
  let catList = [];

  function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  function initFilters() {
    document.getElementById('start-date').value = filters.start || daysAgo(30);
    document.getElementById('end-date').value = filters.end || new Date().toISOString().slice(0, 10);
  }

  function loadMeta() {
    const kasirSel = document.getElementById('f-kasir');
    const catSel = document.getElementById('f-cat');
    Promise.all([app.get('api/users'), app.get('api/categories')])
      .then(([u, c]) => {
        kasirSel.innerHTML = '<option value="Semua">Semua Kasir</option>' + u.users.map((k) => '<option>' + k.name + '</option>').join('');
        catList = c.categories;
        catSel.innerHTML = '<option value="Semua">Semua Kategori</option>' + catList.map((x) => '<option value="' + x.name + '">' + x.icon + ' ' + x.name + '</option>').join('');
      })
      .catch(() => {});
  }

  function load() {
    const params = new URLSearchParams();
    if (filters.start) params.set('start', filters.start);
    if (filters.end) params.set('end', filters.end);
    if (filters.kasir !== 'Semua') params.set('kasir', filters.kasir);
    if (filters.category !== 'Semua') params.set('category', filters.category);
    return app.get('api/report?' + params.toString())
      .then((d) => { report = d; render(); })
      .catch((e) => app.toast(e.message || 'Gagal memuat laporan.', 'error'));
  }

  function render() {
    const cards = [
      { label: 'Total Penjualan', value: app.formatT(report.totalSales), icon: 'trending-up', color: 'blue', sub: report.totalItems + ' item terjual' },
      { label: 'Total Transaksi', value: app.formatNumber(report.totalTransactions), icon: 'receipt', color: 'amber', sub: 'Rata-rata ' + app.formatT(report.avgOrder) },
      { label: 'Modal', value: app.formatT(report.totalCost), icon: 'package', color: 'violet', sub: 'Harga pokok' },
      { label: 'Laba', value: app.formatT(report.profit), icon: 'wallet', color: 'green', sub: 'Penjualan − Modal' },
    ];
    const colors = { blue: 'bg-blue-100 text-blue-600', amber: 'bg-amber-100 text-amber-600', violet: 'bg-violet-100 text-violet-600', green: 'bg-emerald-100 text-emerald-600' };
    document.getElementById('report-summary').innerHTML = cards.map((c) => `
      <div class="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover-pop">
        <div class="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${c.color === 'blue' ? 'from-blue-600 to-blue-400' : c.color === 'amber' ? 'from-amber-500 to-amber-400' : c.color === 'violet' ? 'from-violet-600 to-violet-400' : 'from-emerald-600 to-emerald-400'} opacity-10"></div>
        <span class="inline-flex items-center justify-center w-10 h-10 rounded-xl ${colors[c.color]} mb-3"><i data-lucide="${c.icon}" class="w-5 h-5"></i></span>
        <p class="text-sm text-gray-400 font-medium">${c.label}</p>
        <p class="text-xl font-extrabold text-gray-900 mt-1">${c.value}</p>
        <p class="text-xs text-gray-400 mt-1">${c.sub}</p>
      </div>`).join('');
    lucide.createIcons();

    document.getElementById('best-sellers').innerHTML = report.bestSellers.length
      ? report.bestSellers.map((b, i) => `
          <div class="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition">
            <span class="w-6 h-6 rounded-full ${i < 3 ? 'bg-blue-600' : 'bg-gray-200'} text-white text-[11px] font-bold flex items-center justify-center shrink-0 ${i >= 3 ? '!bg-gray-300 !text-gray-500' : ''}">${i + 1}</span>
            <span class="text-xl">${b.emoji}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-800 truncate">${b.name}</p>
              <p class="text-xs text-gray-400">${app.formatNumber(b.qty)} terjual</p>
            </div>
            <span class="text-sm font-bold text-gray-800">${app.formatT(b.revenue)}</span>
          </div>`).join('')
      : '<p class="text-sm text-gray-400 text-center py-6">Tidak ada data.</p>';

    const methods = Object.entries(report.methods).map(([k, v]) => ({ k, v }));
    const total = report.totalSales || 1;
    document.getElementById('method-summary').innerHTML = methods.map((m) => `
      <div>
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="text-gray-500 font-medium">${m.k}</span>
          <span class="text-gray-700 font-semibold">${app.formatT(m.v)} · ${Math.round(m.v / total * 100)}%</span>
        </div>
        <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full bg-blue-500 rounded-full" style="width:${Math.round(m.v / total * 100)}%"></div>
        </div>
      </div>`).join('');

    drawChart();
  }

  function drawChart() {
    const canvas = document.getElementById('report-chart');
    if (!window.Chart) return;
    document.getElementById('rpt-chart-skel').style.display = 'none';
    if (window.__reportChart) window.__reportChart.destroy();
    const labels = report.daily.map((d) => d.date.slice(5));
    const values = report.daily.map((d) => d.total);
    window.__reportChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: 'rgba(37,99,235,0.7)', borderRadius: 6, barPercentage: 0.6 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ' Pendapatan: ' + app.formatT(c.parsed.y) } } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(226,232,240,0.5)' }, border: { display: false }, ticks: { color: '#94a3b8', callback: (v) => app.formatT(v) } },
          x: { grid: { display: false }, border: { display: false }, ticks: { color: '#94a3b8', maxRotation: 0 } },
        },
      },
    });
  }

  /* ------------------------------ export ------------------------------ */

  function exportCSV() {
    const rows = [['Invoice', 'Tanggal', 'Produk', 'Qty', 'Harga', 'Modal', 'Total', 'Metode', 'Kasir']];
    app.get('api/transactions').then((all) => {
      const start = filters.start, end = filters.end;
      all.transactions.forEach((t) => {
        const dk = t.createdAt.slice(0, 10);
        if (start && dk < start) return;
        if (end && dk > end) return;
        rows.push([t.invoiceNo, new Date(t.createdAt).toLocaleDateString('id-ID'), t.productName, t.qty, t.price, t.modal || 0, t.total, t.method, t.kasir]);
      });
      const csv = '\uFEFF' + rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'laporan-warung-' + Date.now() + '.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    }).catch(() => app.toast('Gagal mengekspor.', 'error'));
  }

  function exportPDF() {
    const w = window.open('', '_blank');
    if (!w) { app.toast('Izinkan popup untuk mencetak PDF.', 'info'); return; }
    const rows = report.bestSellers.map((b, i) => `<tr><td>${i + 1}</td><td>${b.emoji} ${b.name}</td><td>${b.qty}</td><td>Rp ${b.revenue.toLocaleString('id-ID')}</td></tr>`).join('');
    const methods = Object.entries(report.methods).map(([k, v]) => `<tr><td>${k}</td><td>Rp ${v.toLocaleString('id-ID')}</td></tr>`).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>Laporan Penjualan</title><style>
      body{font-family:Inter,Arial,sans-serif;color:#111;padding:32px}
      h1{font-size:20px;margin:0 0 4px}.muted{color:#666;font-size:12px;margin-bottom:16px}
      .grid{display:flex;gap:16px;margin:20px 0}
      .card{flex:1;border:1px solid #e2e8f0;border-radius:12px;padding:14px}
      .card b{display:block;font-size:18px;margin-top:4px}
      table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
      th,td{border-bottom:1px solid #e2e8f0;padding:8px 10px;text-align:left}
      th{background:#f8fafc;text-transform:uppercase;font-size:11px;color:#64748b}
      h2{font-size:14px;margin:24px 0 0}
      </style></head><body>
      <h1>Laporan Penjualan</h1>
      <div class="muted">Periode: ${filters.start || '-'} s/d ${filters.end || '-'} · Kasir: ${filters.kasir} · Kategori: ${filters.category}</div>
      <div class="grid">
        <div class="card">Total Penjualan<b>Rp ${report.totalSales.toLocaleString('id-ID')}</b></div>
        <div class="card">Total Transaksi<b>${report.totalTransactions}</b></div>
        <div class="card">Laba<b>Rp ${report.profit.toLocaleString('id-ID')}</b></div>
      </div>
      <h2>Produk Terlaris</h2>
      <table><thead><tr><th>#</th><th>Produk</th><th>Terjual</th><th>Pendapatan</th></tr></thead><tbody>${rows}</tbody></table>
      <h2>Metode Pembayaran</h2>
      <table><thead><tr><th>Metode</th><th>Total</th></tr></thead><tbody>${methods}</tbody></table>
      <script>window.onload=function(){window.print()};<\/script>
      </body></html>`);
    w.document.close();
  }

  /* ------------------------------ boot ------------------------------ */

  app.boot(() => {
    initFilters();
    loadMeta();
    load();
    document.getElementById('btn-filter').addEventListener('click', () => {
      filters.start = document.getElementById('start-date').value;
      filters.end = document.getElementById('end-date').value;
      filters.kasir = document.getElementById('f-kasir').value;
      filters.category = document.getElementById('f-cat').value;
      load();
    });
    document.getElementById('btn-excel').addEventListener('click', exportCSV);
    document.getElementById('btn-pdf').addEventListener('click', exportPDF);
  });
})();
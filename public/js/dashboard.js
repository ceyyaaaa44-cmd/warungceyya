(function () {
  'use strict';
  const app = window.Warung;
  let chart = null;

  const COLORS = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', grad: 'from-blue-600 to-blue-400' },
    green: { bg: 'bg-emerald-100', text: 'text-emerald-600', grad: 'from-emerald-600 to-emerald-400' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', grad: 'from-amber-500 to-amber-400' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-600', grad: 'from-violet-600 to-violet-400' },
  };

  function buildStats(stats) {
    const defs = [
      { label: 'Penjualan Hari Ini', color: 'blue', icon: 'cash', value: app.formatT(stats.todaySales), sub: app.formatNumber(stats.todayOrders) + ' transaksi hari ini' },
      { label: 'Total Pendapatan', color: 'green', icon: 'trending-up', value: app.formatT(stats.revenue), sub: 'Rata-rata ' + app.formatT(stats.avgOrder) + ' / transaksi' },
      { label: 'Total Transaksi', color: 'amber', icon: 'receipt', value: app.formatNumber(stats.transactions), sub: 'Jumlah pesanan tercatat' },
      { label: 'Total Produk', color: 'violet', icon: 'package', value: app.formatNumber(stats.totalProducts), sub: app.formatNumber(stats.stockCount) + ' unit stok' },
    ];
    return defs.map((d) => {
      const c = COLORS[d.color];
      return `
        <div class="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover-pop">
          <div class="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-gradient-to-br ${c.grad} opacity-10"></div>
          <div class="flex items-center justify-between mb-4">
            <span class="inline-flex items-center justify-center w-11 h-11 rounded-xl ${c.bg} ${c.text}">
              <i data-lucide="${d.icon}" class="w-6 h-6"></i>
            </span>
            <span class="inline-flex items-center gap-1 text-[11px] font-semibold ${c.text} ${c.bg} px-2 py-1 rounded-full">
              <i data-lucide="arrow-up-right" class="w-3 h-3"></i> aktif
            </span>
          </div>
          <p class="text-sm text-gray-400 font-medium">${d.label}</p>
          <p class="text-xl sm:text-2xl font-extrabold text-gray-900 mt-1 tracking-tight">${d.value}</p>
          <p class="text-xs text-gray-400 mt-1.5">${d.sub}</p>
        </div>`;
    }).join('');
  }

  function buildBestSellers(list) {
    if (!list.length) return `<div class="text-sm text-gray-400 text-center py-6">Belum ada data penjualan.</div>`;
    const medals = ['bg-amber-500', 'bg-slate-400', 'bg-amber-700'];
    return list.map((item, i) => {
      const chip = i < 3
        ? `<span class="w-6 h-6 rounded-full ${medals[i]} text-white text-[11px] font-bold flex items-center justify-center shrink-0">${i + 1}</span>`
        : `<span class="w-6 h-6 rounded-full text-gray-400 text-[11px] font-bold flex items-center justify-center shrink-0 border border-gray-200">${i + 1}</span>`;
      return `
        <div class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition">
          ${chip}
          <span class="text-2xl shrink-0">${item.emoji || '🛍️'}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-800 truncate">${item.name}</p>
            <p class="text-xs text-gray-400">${app.formatNumber(item.qty)} terjual</p>
          </div>
          <p class="text-sm font-bold text-gray-900 whitespace-nowrap">${app.formatT(item.revenue)}</p>
        </div>`;
    }).join('');
  }

  function timeAgo(iso) {
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return 'Baru saja';
    if (min < 60) return min + ' mnt lalu';
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + ' jm lalu';
    const d = Math.floor(hr / 24);
    return d + ' hari lalu';
  }

  function buildRecent(rows) {
    if (!rows.length) return `<tr><td colspan="4" class="px-6 py-8 text-center text-sm text-gray-400">Belum ada transaksi.</td></tr>`;
    return rows.map((t) => `
      <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition">
        <td class="px-6 py-3.5">
          <div class="flex items-center gap-3">
            <span class="text-xl">${t.productEmoji || '🛍️'}</span>
            <div>
              <p class="font-medium text-gray-800">${t.productName}</p>
              <p class="text-xs text-gray-400">#${t.id.slice(-8)}</p>
            </div>
          </div>
        </td>
        <td class="px-6 py-3.5 text-gray-600">${t.qty}</td>
        <td class="px-6 py-3.5 font-semibold text-gray-800">${app.formatT(t.total)}</td>
        <td class="px-6 py-3.5 text-right text-xs text-gray-400">${timeAgo(t.createdAt)}</td>
      </tr>`).join('');
  }

  function buildLowStock(list) {
    const low = list.filter((p) => p.stock <= 60).slice(0, 5);
    document.getElementById('low-count').textContent = low.length + ' produk';
    if (!low.length) return `<div class="text-sm text-emerald-600 bg-emerald-50 rounded-xl p-4 text-center font-medium">Semua stok aman.</div>`;
    return low.map((p) => {
      const tone = p.stock <= 30 ? 'bg-red-500' : 'bg-amber-500';
      const textTone = p.stock <= 30 ? 'text-red-500' : 'text-amber-500';
      return `
        <div class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition">
          <span class="text-2xl">${p.emoji || '🛍️'}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1.5">
              <p class="text-sm font-semibold text-gray-800 truncate pr-2">${p.name}</p>
              <span class="text-xs font-bold ${textTone}">${p.stock}</span>
            </div>
            <div class="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full ${tone} rounded-full" style="width:${Math.min(100, p.stock)}%"></div>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function renderChart(labels, values) {
    if (!window.Chart) return;
    const canvas = document.getElementById('sales-chart');
    document.getElementById('chart-skeleton').style.display = 'none';
    const ctx = canvas.getContext('2d');
    if (window.__salesChart) window.__salesChart.destroy();

    const grad = ctx.createLinearGradient(0, 0, 0, 280);
    grad.addColorStop(0, 'rgba(37,99,235,0.35)');
    grad.addColorStop(1, 'rgba(37,99,235,0.02)');

    window.__salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: '#2563eb',
          backgroundColor: grad,
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 12,
            cornerRadius: 10,
            callbacks: { label: (c) => ' Pendapatan: ' + app.formatT(c.parsed.y) },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(226,232,240,0.6)' },
            border: { display: false },
            ticks: { color: '#94a3b8', maxTicksLimit: 5, callback: (v) => app.formatT(v) },
          },
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#94a3b8' },
          },
        },
      },
    });
  }

  async function load() {
    try {
      const data = await app.get('api/dashboard');
      document.getElementById('stat-grid').innerHTML = buildStats(data.stats);
      document.getElementById('best-sellers').innerHTML = buildBestSellers(data.bestSellers);
      const waitChart = (fn) => (window.Chart ? fn() : setTimeout(() => waitChart(fn), 50));
      waitChart(() => renderChart(data.chartLabels, data.chartValues));
      lucide.createIcons();
    } catch (e) {
      app.toast(e.message || 'Gagal memuat dashboard.', 'error');
    }

    app.get('api/transactions?limit=8')
      .then((t) => { document.getElementById('recent-tx').innerHTML = buildRecent(t.transactions); lucide.createIcons(); })
      .catch(() => {});

    app.get('api/products')
      .then((p) => { document.getElementById('low-stock').innerHTML = buildLowStock(p.products); lucide.createIcons(); })
      .catch(() => {});
  }

  // Run after shell is ready
  document.addEventListener('DOMContentLoaded', () => {
    if (window.Warung && typeof window.Warung.renderShell === 'function') {
      window.Warung.renderShell();
    }
    load();
  });
})();
(function () {
  'use strict';

  const app = window.Warung;

  const NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', href: 'dashboard.html' },
    { key: 'kasir', label: 'Kasir', icon: 'shopping-cart', href: 'kasir.html' },
    {
      group: 'Master',
      children: [
        { key: 'produk', label: 'Produk', icon: 'package', href: 'produk.html' },
        { key: 'kategori', label: 'Kategori', icon: 'tags', href: 'kategori.html' },
        { key: 'supplier', label: 'Supplier', icon: 'truck', href: 'supplier.html' },
        { key: 'pelanggan', label: 'Pelanggan', icon: 'users', href: 'pelanggan.html' },
      ],
    },
    { key: 'transaksi', label: 'Riwayat', icon: 'receipt', href: 'transaksi.html' },
    { key: 'laporan', label: 'Laporan', icon: 'bar-chart-3', href: 'laporan.html' },
    { key: 'stok', label: 'Stok', icon: 'boxes', href: 'stok.html' },
    { key: 'pengguna', label: 'Pengguna', icon: 'user-cog', href: 'pengguna.html' },
    { key: 'pengaturan', label: 'Pengaturan', icon: 'settings', href: 'pengaturan.html' },
  ];

  const TITLES = {
    dashboard: 'Dashboard', kasir: 'Kasir', produk: 'Produk', kategori: 'Kategori',
    supplier: 'Supplier', pelanggan: 'Pelanggan', transaksi: 'Riwayat',
    laporan: 'Laporan Penjualan', stok: 'Stok Produk', pengguna: 'Pengguna', pengaturan: 'Pengaturan',
  };

  function currentPage() {
    return document.body.dataset.page || 'dashboard';
  }

  function itemHTML(key, p) {
    const active = key === currentPage();
    const base = 'nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600';
    return `
      <a href="${p.href}" class="${base} ${active ? 'active' : ''}">
        <i data-lucide="${p.icon}" class="w-5 h-5 shrink-0"></i>
        <span class="flex-1">${p.label}</span>
        ${active ? '<span class="w-1.5 h-1.5 rounded-full bg-white"></span>' : ''}
      </a>`;
  }

  function navHTML() {
    return NAV.map((item) => {
      if (item.group) {
        return `
          <div class="pt-4">
            <p class="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">${item.group}</p>
            <div class="space-y-1">${item.children.map((c) => itemHTML(c.key, c)).join('')}</div>
          </div>`;
      }
      return itemHTML(item.key, item);
    }).join('');
  }

  function sidebarHTML() {
    return `
      <div class="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 bg-white border-r border-gray-100 z-40 transition-transform duration-300 lg:translate-x-0" id="sidebar-inner">
        ${sidebarBody()}
      </div>
      <div class="fixed inset-0 z-40 lg:hidden hidden" id="sidebar-overlay"></div>
      <aside class="fixed inset-y-0 left-0 z-50 w-72 -translate-x-full lg:hidden transition-transform duration-300 bg-white shadow-2xl flex flex-col" id="sidebar-mobile">
        ${sidebarBody()}
      </aside>`;
  }

  function sidebarBody() {
    return `
      <div class="flex items-center gap-3 px-5 pt-6 pb-5">
        <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
          <i data-lucide="store" class="w-6 h-6"></i>
        </div>
        <div class="min-w-0">
          <p class="font-bold text-gray-900 leading-tight truncate">Warung Cemilan</p>
          <p class="text-xs text-gray-400">Aplikasi Penjualan</p>
        </div>
      </div>
      <div class="mx-5 h-px bg-gray-100"></div>
      <nav class="flex-1 px-3 py-4 overflow-y-auto no-scrollbar">
        <p class="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Menu Utama</p>
        ${navHTML()}
      </nav>
      <div class="p-4 border-t border-gray-100">
        <div class="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
          <div class="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">WC</div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-gray-800 truncate">Admin Warung</p>
            <p class="text-xs text-gray-400 truncate">Administrator</p>
          </div>
        </div>
      </div>`;
  }

  function topbarHTML() {
    const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const pageLabel = TITLES[currentPage()] || 'Dashboard';
    return `
      <div class="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100">
        <div class="flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-16">
          <button id="btn-drawer" class="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 transition">
            <i data-lucide="menu" class="w-6 h-6"></i>
          </button>
          <div class="min-w-0">
            <h1 class="text-lg font-bold text-gray-900 leading-tight">${pageLabel}</h1>
            <p class="text-xs text-gray-400 hidden sm:block capitalize">${today}</p>
          </div>
          <div class="flex-1"></div>
          <a href="kasir.html" class="hidden md:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-md shadow-blue-600/25 transition">
            <i data-lucide="shopping-cart" class="w-4 h-4"></i> Kasir
          </a>
        </div>
      </div>`;
  }

  function footerHTML() {
    return `
      <footer class="px-4 sm:px-6 lg:px-8 py-5">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-gray-100 pt-5">
          <p class="text-xs text-gray-400">© ${new Date().getFullYear()} Warung Cemilan — Aplikasi Penjualan</p>
          <p class="text-xs text-gray-400 flex items-center gap-1.5">
            <i data-lucide="heart" class="w-3.5 h-3.5 text-red-400"></i>
            Dibuat dengan Tailwind & Lucide
          </p>
        </div>
      </footer>`;
  }

  function initShell() {
    document.getElementById('sidebar').innerHTML = sidebarHTML();
    document.getElementById('topbar').innerHTML = topbarHTML();
    document.getElementById('footer').innerHTML = footerHTML();

    const mobile = document.getElementById('sidebar-mobile');
    const overlay = document.getElementById('sidebar-overlay');
    function openDrawer() {
      mobile && mobile.classList.remove('-translate-x-full');
      overlay && overlay.classList.remove('hidden');
    }
    function closeDrawer() {
      mobile && mobile.classList.add('-translate-x-full');
      overlay && overlay.classList.add('hidden');
    }
    document.getElementById('btn-drawer')?.addEventListener('click', openDrawer);
    overlay?.addEventListener('click', closeDrawer);

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  app.renderShell = function () {
    initShell();
  };
})();
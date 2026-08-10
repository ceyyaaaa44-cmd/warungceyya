(function () {
  'use strict';

  const app = window.Warung = window.Warung || {};

  app.api = { root: '' };

  app.request = async function (method, url, body) {
    const headers = { 'Content-Type': 'application/json' };
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'Terjadi kesalahan.');
      err.error = data.error;
      throw err;
    }
    return data;
  };

  app.get = (url) => app.request('GET', url);
  app.post = (url, body) => app.request('POST', url, body);
  app.put = (url, body) => app.request('PUT', url, body);
  app.del = (url) => app.request('DELETE', url);

  /* ---------------- formatting helpers ---------------- */

  app.formatRupiah = function (n) {
    if (n == null || isNaN(n)) return 'Rp 0';
    return 'Rp ' + Math.round(n).toLocaleString('id-ID');
  };
  app.formatT = app.formatRupiah;

  app.formatNumber = function (n) {
    if (n == null || isNaN(n)) return '0';
    return n.toLocaleString('id-ID');
  };

  app.escapeInput = {
    toDisplay: (v) => {
      const n = parseInt(String(v).replace(/[^\d]/g, ''), 10);
      return isNaN(n) ? '' : n.toLocaleString('id-ID');
    },
    toNumber: (v) => {
      const n = parseInt(String(v).replace(/[^\d]/g, ''), 10);
      return isNaN(n) ? 0 : n;
    },
  };

  app.debounce = function (fn, ms) {
    let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
  };

  /* ---------------- image helper ---------------- */

  app.renderProductImage = function (p, classes = 'w-12 h-12 rounded-xl') {
    const emoji = (p && p.emoji) || '🛍️';
    const image = (p && p.image) || '';
    if (image) {
      return `<img src="${image}" alt="${(p && p.name) ? p.name.replace(/"/g, '&quot;') : ''}" class="${classes} object-cover" onerror="this.onerror=null; this.outerHTML='<div class=\\'${classes} bg-gray-100 flex items-center justify-center text-xl shrink-0\\'>${emoji}</div>';" />`;
    }
    return `<div class="${classes} bg-gray-100 flex items-center justify-center text-xl shrink-0">${emoji}</div>`;
  };

  /* ---------------- toast system ---------------- */
  let toastRoot = null;
  function ensureToastRoot() {
    if (!toastRoot) {
      toastRoot = document.createElement('div');
      toastRoot.id = 'toast-root';
      toastRoot.className = 'fixed bottom-5 right-5 z-[100] flex flex-col gap-3 items-end';
      document.body.appendChild(toastRoot);
    }
    return toastRoot;
  }

  const TOAST_SVG = {
    success: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    error: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  };

  app.toast = function (msg, type = 'success') {
    const root = ensureToastRoot();
    const el = document.createElement('div');
    const color = type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#2563eb';
    const icon = TOAST_SVG[type] || TOAST_SVG.info;
    el.innerHTML = `
      <div class="flex items-center gap-3 bg-white border rounded-xl pl-3 pr-4 py-3 shadow-xl shadow-black/5 border-gray-100 modal-card">
        <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg" style="color:#fff;background:${color}">
          <svg style="width:18px;height:18px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon}"/></svg>
        </span>
        <span class="text-sm font-medium text-gray-800">${msg}</span>
      </div>`;
    root.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s, transform .3s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-6px)';
      setTimeout(() => el.remove(), 300);
    }, 3200);
  };

  /* ---------------- confirm modal ---------------- */
  app.confirm = function (opts) {
    const { title = 'Konfirmasi', message = 'Anda yakin?', danger = true, confirmText = 'Hapus', onConfirm } = opts;
    const wrap = document.createElement('div');
    wrap.className = 'fixed inset-0 z-[90] flex items-center justify-center p-4';
    wrap.innerHTML = `
      <div class="absolute inset-0 bg-gray-900/50 backdrop-blur-sm overlay-in" data-close></div>
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 modal-card">
        <div class="flex items-start gap-4">
          <span class="inline-flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${danger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}">
            <svg style="width:22px;height:22px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z"/><path d="M10 11v6M14 11v6"/></svg>
          </span>
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-semibold text-gray-900">${title}</h3>
            <p class="mt-1 text-sm text-gray-500">${message}</p>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button data-close class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">Batal</button>
          <button data-ok class="px-4 py-2 text-sm font-semibold text-white rounded-lg transition shadow-md hover:shadow-lg ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}">${confirmText}</button>
        </div>
      </div>`;
    const close = () => wrap.remove();
    wrap.querySelectorAll('[data-close]').forEach((e) => e.addEventListener('click', close));
    wrap.querySelector('[data-ok]').addEventListener('click', () => { close(); onConfirm && onConfirm(); });
    document.body.appendChild(wrap);
  };

  // No auth needed
  app.authGuard = function () { /* no-op */ };
})();
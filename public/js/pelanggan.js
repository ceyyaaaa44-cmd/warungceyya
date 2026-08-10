(function () {
  'use strict';
  const app = window.Warung;

  let list = [];

  function initials(n) { return (n || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase(); }

  function render() {
    const tbody = document.getElementById('cus-rows');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-12 text-center text-sm text-gray-400">Belum ada pelanggan.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map((c) => `
      <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition group">
        <td class="px-6 py-3.5">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold flex items-center justify-center shrink-0">${initials(c.name)}</div>
            <p class="font-semibold text-gray-800">${c.name}</p>
          </div>
        </td>
        <td class="px-6 py-3.5 text-gray-600">${c.phone || '—'}</td>
        <td class="px-6 py-3.5">
          <div class="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition">
            <button data-edit="${c.id}" class="p-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
            <button data-del="${c.id}" class="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
          </div>
        </td>
      </tr>`).join('');
    lucide.createIcons();
    tbody.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openEdit(b.dataset.edit)));
    tbody.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => openDelete(b.dataset.del)));
  }

  function load() {
    return app.get('api/customers').then((d) => { list = d.customers; render(); }).catch((e) => app.toast(e.message, 'error'));
  }

  function openModal(c) {
    document.getElementById('cus-title').textContent = c ? 'Edit Pelanggan' : 'Tambah Pelanggan';
    document.getElementById('cus-id').value = c ? c.id : '';
    document.getElementById('c-name').value = c ? c.name : '';
    document.getElementById('c-phone').value = c ? c.phone : '';
    const m = document.getElementById('cus-modal');
    m.classList.remove('hidden'); m.classList.add('flex');
    setTimeout(() => document.getElementById('c-name').focus(), 60);
  }
  function closeModal() { document.getElementById('cus-modal').classList.add('hidden'); document.getElementById('cus-modal').classList.remove('flex'); }
  function openEdit(id) { const c = list.find((x) => x.id === id); if (c) openModal(c); }
  function openDelete(id) {
    const c = list.find((x) => x.id === id);
    if (!c) return;
    app.confirm({ title: 'Hapus Pelanggan', message: 'Hapus pelanggan <b>' + c.name + '</b>?',
      onConfirm: () => app.del('api/customers/' + id).then(() => { app.toast('Pelanggan dihapus.'); load(); }).catch((e) => app.toast(e.message, 'error')) });
  }

  function save(e) {
    e.preventDefault();
    const id = document.getElementById('cus-id').value;
    const payload = { name: document.getElementById('c-name').value.trim(), phone: document.getElementById('c-phone').value.trim() };
    if (!payload.name) { app.toast('Nama pelanggan wajib diisi.', 'error'); return; }
    (id ? app.put('api/customers/' + id, payload) : app.post('api/customers', payload))
      .then(() => { app.toast(id ? 'Pelanggan diperbarui.' : 'Pelanggan ditambahkan.'); closeModal(); load(); })
      .catch((err) => app.toast(err.message, 'error'));
  }

  app.boot(() => {
    document.getElementById('cus-form').addEventListener('submit', save);
    document.getElementById('btn-add').addEventListener('click', () => openModal(null));
    document.querySelectorAll('#cus-modal [data-close]').forEach((el) => el.addEventListener('click', closeModal));
    load();
  });
})();
(function () {
  'use strict';
  const app = window.Warung;

  let list = [];

  function render() {
    const tbody = document.getElementById('sup-rows');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-12 text-center text-sm text-gray-400">Belum ada supplier.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map((s) => `
      <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition group">
        <td class="px-6 py-3.5">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><i data-lucide="truck" class="w-4 h-4"></i></div>
            <p class="font-semibold text-gray-800">${s.name}</p>
          </div>
        </td>
        <td class="px-6 py-3.5 text-gray-600">${s.phone || '—'}</td>
        <td class="px-6 py-3.5 text-gray-500">${s.address || '—'}</td>
        <td class="px-6 py-3.5">
          <div class="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition">
            <button data-edit="${s.id}" class="p-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
            <button data-del="${s.id}" class="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
          </div>
        </td>
      </tr>`).join('');
    lucide.createIcons();
    tbody.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openEdit(b.dataset.edit)));
    tbody.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => openDelete(b.dataset.del)));
  }

  function load() {
    return app.get('api/suppliers').then((d) => { list = d.suppliers; render(); }).catch((e) => app.toast(e.message, 'error'));
  }

  function openModal(s) {
    document.getElementById('sup-title').textContent = s ? 'Edit Supplier' : 'Tambah Supplier';
    document.getElementById('sup-id').value = s ? s.id : '';
    document.getElementById('s-name').value = s ? s.name : '';
    document.getElementById('s-phone').value = s ? s.phone : '';
    document.getElementById('s-address').value = s ? s.address : '';
    const m = document.getElementById('sup-modal');
    m.classList.remove('hidden'); m.classList.add('flex');
    setTimeout(() => document.getElementById('s-name').focus(), 60);
  }
  function closeModal() {
    document.getElementById('sup-modal').classList.add('hidden');
    document.getElementById('sup-modal').classList.remove('flex');
  }
  function openEdit(id) { const s = list.find((x) => x.id === id); if (s) openModal(s); }
  function openDelete(id) {
    const s = list.find((x) => x.id === id);
    if (!s) return;
    app.confirm({ title: 'Hapus Supplier', message: 'Hapus supplier <b>' + s.name + '</b>?',
      onConfirm: () => app.del('api/suppliers/' + id).then(() => { app.toast('Supplier dihapus.'); load(); }).catch((e) => app.toast(e.message, 'error')) });
  }

  function save(e) {
    e.preventDefault();
    const id = document.getElementById('sup-id').value;
    const payload = {
      name: document.getElementById('s-name').value.trim(),
      phone: document.getElementById('s-phone').value.trim(),
      address: document.getElementById('s-address').value.trim(),
    };
    if (!payload.name) { app.toast('Nama supplier wajib diisi.', 'error'); return; }
    (id ? app.put('api/suppliers/' + id, payload) : app.post('api/suppliers', payload))
      .then(() => { app.toast(id ? 'Supplier diperbarui.' : 'Supplier ditambahkan.'); closeModal(); load(); })
      .catch((err) => app.toast(err.message, 'error'));
  }

  app.boot(() => {
    document.getElementById('sup-form').addEventListener('submit', save);
    document.getElementById('btn-add').addEventListener('click', () => openModal(null));
    document.querySelectorAll('#sup-modal [data-close]').forEach((el) => el.addEventListener('click', closeModal));
    load();
  });
})();
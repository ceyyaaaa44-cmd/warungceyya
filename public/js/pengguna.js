(function () {
  'use strict';
  const app = window.Warung;

  let users = [];

  function initials(n) {
    return (n || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  }

  function render() {
    const tbody = document.getElementById('user-rows');
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-12 text-center text-sm text-gray-400">Belum ada pengguna.</td></tr>';
      return;
    }
    tbody.innerHTML = users.map((u) => `
      <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition group">
        <td class="px-6 py-3.5">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full ${u.role === 'admin' ? 'bg-blue-600' : 'bg-gray-400'} text-white text-xs font-bold flex items-center justify-center shrink-0">${initials(u.name)}</div>
            <p class="font-semibold text-gray-800">${u.name}</p>
          </div>
        </td>
        <td class="px-6 py-3.5 text-gray-600">${u.username}</td>
        <td class="px-6 py-3.5">
          <span class="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${u.role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'}">${u.role === 'admin' ? 'Administrator' : 'Kasir'}</span>
        </td>
        <td class="px-6 py-3.5">
          <span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${u.status === 'aktif' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}">
            <span class="w-1.5 h-1.5 rounded-full ${u.status === 'aktif' ? 'bg-emerald-500' : 'bg-gray-400'}"></span>${u.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
          </span>
        </td>
        <td class="px-6 py-3.5">
          <div class="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition">
            <button data-edit="${u.id}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition">
              <i data-lucide="pencil" class="w-3.5 h-3.5"></i> Edit
            </button>
            <button data-del="${u.id}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      </tr>`).join('');
    lucide.createIcons();
    tbody.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openEdit(b.dataset.edit)));
    tbody.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => openDelete(b.dataset.del)));
  }

  function load() {
    return app.get('api/users').then((d) => { users = d.users; render(); }).catch((e) => app.toast(e.message, 'error'));
  }

  function openModal(user) {
    document.getElementById('user-modal-title').textContent = user ? 'Edit Pengguna' : 'Tambah Pengguna';
    document.getElementById('user-id').value = user ? user.id : '';
    document.getElementById('u-name').value = user ? user.name : '';
    document.getElementById('u-username').value = user ? user.username : '';
    document.getElementById('u-role').value = user ? user.role : 'kasir';
    document.getElementById('u-status').value = user ? user.status : 'aktif';
    const m = document.getElementById('user-modal');
    m.classList.remove('hidden'); m.classList.add('flex');
    setTimeout(() => document.getElementById('u-name').focus(), 60);
  }
  function closeModal() {
    document.getElementById('user-modal').classList.add('hidden');
    document.getElementById('user-modal').classList.remove('flex');
  }
  function openEdit(id) {
    const u = users.find((x) => x.id === id);
    if (u) openModal(u);
  }
  function openDelete(id) {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    app.confirm({
      title: 'Hapus Pengguna',
      message: 'Hapus pengguna <b>' + u.name + '</b>?',
      onConfirm: () => app.del('api/users/' + id)
        .then(() => { app.toast('Pengguna dihapus.'); load(); })
        .catch((e) => app.toast(e.message, 'error')),
    });
  }

  function save(e) {
    e.preventDefault();
    const id = document.getElementById('user-id').value;
    const payload = {
      name: document.getElementById('u-name').value.trim(),
      username: document.getElementById('u-username').value.trim(),
      role: document.getElementById('u-role').value,
      status: document.getElementById('u-status').value,
    };
    if (!payload.name || !payload.username) { app.toast('Nama dan username wajib diisi.', 'error'); return; }
    (id ? app.put('api/users/' + id, payload) : app.post('api/users', payload))
      .then(() => { app.toast(id ? 'Pengguna diperbarui.' : 'Pengguna ditambahkan.'); closeModal(); load(); })
      .catch((err) => app.toast(err.message, 'error'));
  }

  app.boot(() => {
    document.getElementById('user-form').addEventListener('submit', save);
    document.getElementById('btn-add').addEventListener('click', () => openModal(null));
    document.querySelectorAll('#user-modal [data-close]').forEach((el) => el.addEventListener('click', closeModal));
    load();
  });
})();
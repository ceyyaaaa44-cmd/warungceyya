(function () {
  'use strict';
  const app = window.Warung;

  const ICONS = ['🍔', '🍕', '🍟', '🍜', '🍲', '🥟', '🍗', '🍛', '🧋', '🥤', '🍊', '🥭', '☕', '🍵', '🍨', '🍩', '🍫', '🍞', '🥨', '🧰'];
  const COLORS = ['#2563eb', '#06b6d4', '#16a34a', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

  let selectedIcon = '🗂️';
  let selectedColor = '#2563eb';
  let cats = [];

  function buildIconPicker(sel) {
    selectedIcon = sel;
    document.getElementById('cat-icon-picker').innerHTML = ICONS.map((e) => `
      <button type="button" data-ic="${e}" class="w-9 h-9 rounded-lg text-lg flex items-center justify-center transition ${e === sel ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-white border border-gray-200 hover:bg-gray-100'}">${e}</button>`).join('');
    document.querySelectorAll('[data-ic]').forEach((b) => b.addEventListener('click', () => buildIconPicker(b.dataset.ic)));
  }

  function buildColorPicker(sel) {
    selectedColor = sel;
    document.getElementById('cat-color-picker').innerHTML = COLORS.map((c) => `
      <button type="button" data-c="${c}" class="w-8 h-8 rounded-full transition hover:scale-110 ${c === sel ? 'ring-4 ring-blue-200' : ''}" style="background:${c}"></button>`).join('');
    document.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => buildColorPicker(b.dataset.c)));
  }

  function render() {
    const grid = document.getElementById('cat-grid');
    document.getElementById('cat-count').textContent = cats.length + ' kategori';
    grid.innerHTML = cats.map((c) => `
      <div class="group relative bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-lg hover:-translate-y-0.5 transition">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center text-2xl mb-3" style="background:${c.color}1a">${c.icon}</div>
        <p class="font-semibold text-gray-800">${c.name}</p>
        <p class="text-xs text-gray-400 mt-0.5">${c.count} produk</p>
        <div class="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button data-edit="${c.id}" class="p-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
          <button data-del="${c.id}" class="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        </div>
      </div>`).join('');
    lucide.createIcons();
    grid.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openEdit(b.dataset.edit)));
    grid.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => openDelete(b.dataset.del)));
  }

  function load() {
    return app.get('api/categories').then((d) => { cats = d.categories; render(); }).catch((e) => app.toast(e.message, 'error'));
  }

  function resetForm() {
    document.getElementById('cat-id').value = '';
    document.getElementById('fcat-name').value = '';
    document.getElementById('form-title').textContent = 'Tambah Kategori';
    buildIconPicker('🗂️');
    buildColorPicker('#2563eb');
  }

  function openEdit(id) {
    const c = cats.find((x) => x.id === id);
    if (!c) return;
    document.getElementById('cat-id').value = c.id;
    document.getElementById('fcat-name').value = c.name;
    document.getElementById('form-title').textContent = 'Edit Kategori';
    buildIconPicker(c.icon || '🗂️');
    buildColorPicker(c.color || '#2563eb');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openDelete(id) {
    const c = cats.find((x) => x.id === id);
    if (!c) return;
    app.confirm({
      title: 'Hapus Kategori',
      message: 'Hapus kategori <b>' + c.name + '</b>?',
      onConfirm: () => app.del('api/categories/' + id)
        .then(() => { app.toast('Kategori dihapus.'); load(); })
        .catch((e) => app.toast(e.message || 'Gagal menghapus.', 'error')),
    });
  }

  function save(e) {
    e.preventDefault();
    const id = document.getElementById('cat-id').value;
    const name = document.getElementById('fcat-name').value.trim();
    if (!name) { app.toast('Nama kategori wajib diisi.', 'error'); return; }
    const payload = { name, icon: selectedIcon, color: selectedColor };
    (id ? app.put('api/categories/' + id, payload) : app.post('api/categories', payload))
      .then(() => {
        app.toast(id ? 'Kategori diperbarui.' : 'Kategori ditambahkan.');
        resetForm();
        load();
      })
      .catch((err) => app.toast(err.message || 'Gagal menyimpan.', 'error'));
  }

  app.boot(() => {
    document.getElementById('cat-form').addEventListener('submit', save);
    buildIconPicker('🗂️');
    buildColorPicker('#2563eb');
    load();
  });
})();